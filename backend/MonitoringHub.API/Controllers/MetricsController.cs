using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MonitoringHub.API.Data;
using MonitoringHub.API.DTOs;
using MonitoringHub.API.Models;
using MonitoringHub.API.Services;

namespace MonitoringHub.API.Controllers;

[ApiController]
[Route("api/metrics")]
public class MetricsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AlertService _alertService;
    private readonly ILogger<MetricsController> _logger;

    public MetricsController(AppDbContext db, AlertService alertService, ILogger<MetricsController> logger)
    {
        _db = db;
        _alertService = alertService;
        _logger = logger;
    }

    [HttpPost("disk")]
    public async Task<IActionResult> IngestDisk([FromBody] DiskPayloadDto payload)
    {
        if (string.IsNullOrWhiteSpace(payload.Hostname))
            return BadRequest(new { error = "Hostname is required" });

        var server = await _db.Servers.FirstOrDefaultAsync(s => s.Hostname == payload.Hostname);
        if (server == null)
        {
            server = new Server
            {
                Hostname = payload.Hostname,
                IpAddress = payload.IpAddress,
                CreatedAt = DateTime.UtcNow
            };
            _db.Servers.Add(server);
            await _db.SaveChangesAsync();
            _logger.LogInformation("New server registered: {Hostname}", payload.Hostname);
        }
        else
        {
            server.IpAddress = payload.IpAddress;
        }

        server.LastSeen = DateTime.UtcNow;

        var metrics = payload.Disks.Select(d => new DiskMetric
        {
            ServerId = server.Id,
            MountPoint = d.MountPoint,
            FileSystem = d.Filesystem,
            FileSystemType = d.FileSystemType,
            TotalSize = d.TotalSize,
            UsedSize = d.UsedSize,
            AvailableSize = d.AvailableSize,
            UsagePercent = d.UsagePercent,
            CollectedAt = payload.Timestamp == default ? DateTime.UtcNow : payload.Timestamp
        }).ToList();

        _db.DiskMetrics.AddRange(metrics);
        await _db.SaveChangesAsync();

        await _alertService.EvaluateAsync(server, metrics);

        return Ok(new { message = "Metrics received", serverId = server.Id });
    }
}
