namespace MonitoringHub.API.Models;

public class ApiToken
{
    public int Id { get; set; }
    public string Token { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}
