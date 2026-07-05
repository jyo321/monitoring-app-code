namespace MonitoringHub.API.Models;

public class Alert
{
    public int Id { get; set; }
    public int ServerId { get; set; }
    public string Severity { get; set; } = string.Empty;   // Warning | Critical
    public string AlertType { get; set; } = string.Empty;  // DiskWarning | DiskCritical
    public string Message { get; set; } = string.Empty;
    public string MountPoint { get; set; } = string.Empty;
    public double UsagePercent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsResolved { get; set; } = false;
    public DateTime? ResolvedAt { get; set; }

    public Server Server { get; set; } = null!;
}
