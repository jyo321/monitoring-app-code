using Microsoft.EntityFrameworkCore;
using MonitoringHub.API.Data;
using MonitoringHub.API.Models;

namespace MonitoringHub.API.Services;

public class AlertService
{
    private readonly AppDbContext _db;
    private readonly EmailService _email;
    private readonly ILogger<AlertService> _logger;

    public AlertService(AppDbContext db, EmailService email, ILogger<AlertService> logger)
    {
        _db = db;
        _email = email;
        _logger = logger;
    }

    public async Task EvaluateAsync(Server server, IEnumerable<DiskMetric> metrics)
    {
        foreach (var disk in metrics)
        {
            string? severity = null;
            string? alertType = null;

            if (disk.UsagePercent >= 90)
            {
                severity = "Critical";
                alertType = "DiskCritical";
            }
            else if (disk.UsagePercent >= 80)
            {
                severity = "Warning";
                alertType = "DiskWarning";
            }

            if (severity == null) continue;

            // Suppress duplicate within 24 hours
            var cutoff = DateTime.UtcNow.AddHours(-24);
            var exists = await _db.Alerts.AnyAsync(a =>
                a.ServerId == server.Id &&
                a.MountPoint == disk.MountPoint &&
                a.Severity == severity &&
                !a.IsResolved &&
                a.CreatedAt >= cutoff);

            if (exists) continue;

            var message = $"{server.Hostname} ({server.IpAddress}): {disk.MountPoint} is at {disk.UsagePercent:F1}%";
            var alert = new Alert
            {
                ServerId = server.Id,
                Severity = severity,
                AlertType = alertType!,
                Message = message,
                MountPoint = disk.MountPoint,
                UsagePercent = disk.UsagePercent,
                CreatedAt = DateTime.UtcNow
            };

            _db.Alerts.Add(alert);
            await _db.SaveChangesAsync();

            _logger.LogWarning("Alert created: {Message}", message);

            await _email.SendAlertAsync(server, metrics, severity);
        }

        // Auto-resolve alerts whose mount points are now below threshold
        var activeAlerts = await _db.Alerts
            .Where(a => a.ServerId == server.Id && !a.IsResolved)
            .ToListAsync();

        foreach (var alert in activeAlerts)
        {
            var current = metrics.FirstOrDefault(m => m.MountPoint == alert.MountPoint);
            if (current != null && current.UsagePercent < 80)
            {
                alert.IsResolved = true;
                alert.ResolvedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();
    }
}
