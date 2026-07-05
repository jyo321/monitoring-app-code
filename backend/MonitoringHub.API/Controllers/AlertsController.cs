using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MonitoringHub.API.Data;
using MonitoringHub.API.DTOs;

namespace MonitoringHub.API.Controllers;

[ApiController]
[Route("api/alerts")]
public class AlertsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AlertsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PagedResult<AlertDto>>> GetAlerts(
        [FromQuery] bool? resolved,
        [FromQuery] string? severity,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.Alerts.Include(a => a.Server).AsQueryable();

        if (resolved.HasValue)
            query = query.Where(a => a.IsResolved == resolved.Value);

        if (!string.IsNullOrWhiteSpace(severity))
            query = query.Where(a => a.Severity == severity);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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

        return Ok(new PagedResult<AlertDto> { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpPatch("{id:int}/resolve")]
    public async Task<IActionResult> ResolveAlert(int id)
    {
        var alert = await _db.Alerts.FindAsync(id);
        if (alert == null) return NotFound();

        alert.IsResolved = true;
        alert.ResolvedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Alert resolved" });
    }
}
