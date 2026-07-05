using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MonitoringHub.API.Data;
using MonitoringHub.API.DTOs;

namespace MonitoringHub.API.Controllers;

[ApiController]
[Route("api/servers")]
public class ServersController : ControllerBase
{
    private readonly AppDbContext _db;

    public ServersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PagedResult<ServerDto>>> GetServers(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.Servers.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.Hostname.Contains(search) || s.IpAddress.Contains(search));

        var servers = await query.OrderBy(s => s.Hostname).ToListAsync();

        // Compute health from the most recent metrics only (not all-time max)
        var serverIds = servers.Select(s => s.Id).ToList();

        var latestPerServer = await _db.DiskMetrics
            .Where(d => serverIds.Contains(d.ServerId))
            .GroupBy(d => d.ServerId)
            .Select(g => new { ServerId = g.Key, LatestAt = g.Max(d => d.CollectedAt) })
            .ToListAsync();

        var metricMap = new Dictionary<int, double>();
        foreach (var lps in latestPerServer)
        {
            var windowStart = lps.LatestAt.AddMinutes(-5);
            var maxUsage = await _db.DiskMetrics
                .Where(d => d.ServerId == lps.ServerId && d.CollectedAt >= windowStart)
                .MaxAsync(d => (double?)d.UsagePercent) ?? 0;
            metricMap[lps.ServerId] = maxUsage;
        }

        var dtos = servers.Select(s =>
        {
            var maxUsage = metricMap.TryGetValue(s.Id, out var u) ? u : 0;
            return new ServerDto
            {
                Id = s.Id,
                Hostname = s.Hostname,
                IpAddress = s.IpAddress,
                Environment = s.Environment,
                LastSeen = s.LastSeen,
                MaxUsagePercent = maxUsage,
                HealthStatus = maxUsage >= 90 ? "Critical" : maxUsage >= 80 ? "Warning" : "Healthy"
            };
        }).ToList();

        if (!string.IsNullOrWhiteSpace(status))
            dtos = dtos.Where(d => d.HealthStatus.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();

        var total = dtos.Count;
        var paged = dtos.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return Ok(new PagedResult<ServerDto> { Items = paged, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ServerDetailDto>> GetServer(int id)
    {
        var server = await _db.Servers.FindAsync(id);
        if (server == null) return NotFound();

        var mountPoints = await _db.DiskMetrics
            .Where(d => d.ServerId == id)
            .Select(d => d.MountPoint)
            .Distinct()
            .ToListAsync();

        var latestDisks = new List<MonitoringHub.API.Models.DiskMetric>();
        foreach (var mp in mountPoints)
        {
            var latest = await _db.DiskMetrics
                .Where(d => d.ServerId == id && d.MountPoint == mp)
                .OrderByDescending(d => d.CollectedAt)
                .FirstOrDefaultAsync();
            if (latest != null) latestDisks.Add(latest);
        }

        var maxUsage = latestDisks.Any() ? latestDisks.Max(d => d.UsagePercent) : 0;

        var recentAlerts = await _db.Alerts
            .Where(a => a.ServerId == id)
            .OrderByDescending(a => a.CreatedAt)
            .Take(20)
            .ToListAsync();

        return Ok(new ServerDetailDto
        {
            Id = server.Id,
            Hostname = server.Hostname,
            IpAddress = server.IpAddress,
            Environment = server.Environment,
            LastSeen = server.LastSeen,
            MaxUsagePercent = maxUsage,
            HealthStatus = maxUsage >= 90 ? "Critical" : maxUsage >= 80 ? "Warning" : "Healthy",
            LatestDisks = latestDisks.Select(d => new DiskMetricDto
            {
                Id = d.Id,
                MountPoint = d.MountPoint,
                FileSystem = d.FileSystem,
                FileSystemType = d.FileSystemType,
                TotalSize = d.TotalSize,
                UsedSize = d.UsedSize,
                AvailableSize = d.AvailableSize,
                UsagePercent = d.UsagePercent,
                CollectedAt = d.CollectedAt
            }).ToList(),
            RecentAlerts = recentAlerts.Select(a => new AlertDto
            {
                Id = a.Id,
                ServerId = a.ServerId,
                Hostname = server.Hostname,
                IpAddress = server.IpAddress,
                Severity = a.Severity,
                AlertType = a.AlertType,
                Message = a.Message,
                MountPoint = a.MountPoint,
                UsagePercent = a.UsagePercent,
                CreatedAt = a.CreatedAt,
                IsResolved = a.IsResolved
            }).ToList()
        });
    }

    [HttpGet("{id:int}/history")]
    public async Task<ActionResult<List<DiskMetricDto>>> GetHistory(
        int id,
        [FromQuery] string mountPoint = "/",
        [FromQuery] string range = "24h")
    {
        var cutoff = range switch
        {
            "7d" => DateTime.UtcNow.AddDays(-7),
            "30d" => DateTime.UtcNow.AddDays(-30),
            _ => DateTime.UtcNow.AddHours(-24)
        };

        var metrics = await _db.DiskMetrics
            .Where(d => d.ServerId == id && d.MountPoint == mountPoint && d.CollectedAt >= cutoff)
            .OrderBy(d => d.CollectedAt)
            .Select(d => new DiskMetricDto
            {
                Id = d.Id,
                MountPoint = d.MountPoint,
                FileSystem = d.FileSystem,
                FileSystemType = d.FileSystemType,
                TotalSize = d.TotalSize,
                UsedSize = d.UsedSize,
                AvailableSize = d.AvailableSize,
                UsagePercent = d.UsagePercent,
                CollectedAt = d.CollectedAt
            }).ToListAsync();

        return Ok(metrics);
    }
}
