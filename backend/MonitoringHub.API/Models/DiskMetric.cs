namespace MonitoringHub.API.Models;

public class DiskMetric
{
    public int Id { get; set; }
    public int ServerId { get; set; }
    public string MountPoint { get; set; } = string.Empty;
    public string FileSystem { get; set; } = string.Empty;
    public string FileSystemType { get; set; } = string.Empty;
    public string TotalSize { get; set; } = string.Empty;
    public string UsedSize { get; set; } = string.Empty;
    public string AvailableSize { get; set; } = string.Empty;
    public double UsagePercent { get; set; }
    public DateTime CollectedAt { get; set; }

    public Server Server { get; set; } = null!;
}
