using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MonitoringHub.API.Data;
using MonitoringHub.API.DTOs;

namespace MonitoringHub.API.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public DashboardController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<DashboardDto>> Get()
    {
        var servers = await _db.Servers.ToListAsync();
        var serverIds = servers.Select(s => s.Id).ToList();

        var latestMetrics = await _db.DiskMetrics
            .Where(d => serverIds.Contains(d.ServerId))
            .GroupBy(d => d.ServerId)
            .Select(g => new
            {
                ServerId = g.Key,
                MaxUsage = g.Max(d => d.UsagePercent)
            })
            .ToListAsync();

        var metricMap = latestMetrics.ToDictionary(m => m.ServerId, m => m.MaxUsage);

        int healthy = 0, warning = 0, critical = 0;
        foreach (var s in servers)
        {
            var u = metricMap.TryGetValue(s.Id, out var usage) ? usage : 0;
            if (u >= 90) critical++;
            else if (u >= 80) warning++;
            else healthy++;
        }

        var activeAlerts = await _db.Alerts.CountAsync(a => !a.IsResolved);

        var recentAlerts = await _db.Alerts
            .Include(a => a.Server)
            .Where(a => !a.IsResolved)
            .OrderByDescending(a => a.CreatedAt)
            .Take(10)
            .Select(a => new AlertDto
            {
                Id = a.Id,
                ServerId = a.ServerId,
                Hostname = a.Server.Hostname,
                IpAddress = a.Server.IpAddress,
                Severity = a.Severity,
                AlertType = a.AlertType,
                Message = a.Message,
                MountPoint = a.MountPoint,
                UsagePercent = a.UsagePercent,
                CreatedAt = a.CreatedAt,
                IsResolved = a.IsResolved
            }).ToListAsync();

        return Ok(new DashboardDto
        {
            TotalServers = servers.Count,
            HealthyServers = healthy,
            WarningServers = warning,
            CriticalServers = critical,
            ActiveAlerts = activeAlerts,
            RecentAlerts = recentAlerts
        });
    }
}
