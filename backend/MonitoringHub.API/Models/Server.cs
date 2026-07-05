namespace MonitoringHub.API.Models;

public class Server
{
    public int Id { get; set; }
    public string Hostname { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string Environment { get; set; } = "production";
    public DateTime LastSeen { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<DiskMetric> DiskMetrics { get; set; } = new List<DiskMetric>();
    public ICollection<Alert> Alerts { get; set; } = new List<Alert>();
}
