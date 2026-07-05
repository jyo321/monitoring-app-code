namespace MonitoringHub.API.DTOs;

public class DiskPayloadDto
{
    public string Hostname { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public List<DiskEntryDto> Disks { get; set; } = new();
}

public class DiskEntryDto
{
    public string MountPoint { get; set; } = string.Empty;
    public string Filesystem { get; set; } = string.Empty;
    public string FileSystemType { get; set; } = string.Empty;
    public string TotalSize { get; set; } = string.Empty;
    public string UsedSize { get; set; } = string.Empty;
    public string AvailableSize { get; set; } = string.Empty;
    public double UsagePercent { get; set; }
}

public class ServerDto
{
    public int Id { get; set; }
    public string Hostname { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string Environment { get; set; } = string.Empty;
    public DateTime LastSeen { get; set; }
    public string HealthStatus { get; set; } = "Healthy";
    public double MaxUsagePercent { get; set; }
}

public class ServerDetailDto : ServerDto
{
    public List<DiskMetricDto> LatestDisks { get; set; } = new();
    public List<AlertDto> RecentAlerts { get; set; } = new();
}

public class DiskMetricDto
{
    public int Id { get; set; }
    public string MountPoint { get; set; } = string.Empty;
    public string FileSystem { get; set; } = string.Empty;
    public string FileSystemType { get; set; } = string.Empty;
    public string TotalSize { get; set; } = string.Empty;
    public string UsedSize { get; set; } = string.Empty;
    public string AvailableSize { get; set; } = string.Empty;
    public double UsagePercent { get; set; }
    public DateTime CollectedAt { get; set; }
}

public class AlertDto
{
    public int Id { get; set; }
    public int ServerId { get; set; }
    public string Hostname { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string AlertType { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string MountPoint { get; set; } = string.Empty;
    public double UsagePercent { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsResolved { get; set; }
}

public class DashboardDto
{
    public int TotalServers { get; set; }
    public int HealthyServers { get; set; }
    public int WarningServers { get; set; }
    public int CriticalServers { get; set; }
    public int ActiveAlerts { get; set; }
    public List<AlertDto> RecentAlerts { get; set; } = new();
}

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
