using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using MonitoringHub.API.Models;

namespace MonitoringHub.API.Services;

public class SmtpSettings
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "MonitoringHub";
    public string ToAddress { get; set; } = string.Empty;
    public bool EnableSsl { get; set; } = true;
}

public class EmailService
{
    private readonly SmtpSettings _smtp;
    private readonly ILogger<EmailService> _logger;

    private static readonly TimeZoneInfo Ist =
        TimeZoneInfo.FindSystemTimeZoneById(
            OperatingSystem.IsWindows() ? "India Standard Time" : "Asia/Kolkata");

    public EmailService(SmtpSettings smtp, ILogger<EmailService> logger)
    {
        _smtp = smtp;
        _logger = logger;
    }

    public async Task SendAlertAsync(Server server, IEnumerable<DiskMetric> allDisks, string triggerSeverity)
    {
        if (string.IsNullOrWhiteSpace(_smtp.Host) || string.IsNullOrWhiteSpace(_smtp.ToAddress))
        {
            _logger.LogWarning("Email not configured — skipping alert email");
            return;
        }

        try
        {
            bool hasCritical = triggerSeverity == "Critical";
            var subject = hasCritical
                ? "ACTION REQUIRED - PalTech internal Servers Disk Alert"
                : "PalTech internal Servers Disk Usage Report";

            var body = BuildEmailBody(server, allDisks, hasCritical);

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_smtp.FromName, _smtp.FromAddress));
            foreach (var addr in _smtp.ToAddress.Split(',', StringSplitOptions.RemoveEmptyEntries))
                message.To.Add(MailboxAddress.Parse(addr.Trim()));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = body };

            using var client = new SmtpClient();
            await client.ConnectAsync(_smtp.Host, _smtp.Port,
                _smtp.EnableSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None);

            if (!string.IsNullOrWhiteSpace(_smtp.Username))
                await client.AuthenticateAsync(_smtp.Username, _smtp.Password);

            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Alert email sent to {To} for {Host}", _smtp.ToAddress, server.Hostname);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send alert email");
        }
    }

    private string BuildEmailBody(Server server, IEnumerable<DiskMetric> disks, bool hasCritical)
    {
        var istNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Ist);
        var generatedAt = istNow.ToString("dd-MM-yyyy hh:mm:ss tt") + " IST";

        var rows = new System.Text.StringBuilder();
        foreach (var disk in disks)
        {
            string cssClass, status;
            if (disk.UsagePercent >= 90)      { cssClass = "critical"; status = "🔴 CRITICAL"; }
            else if (disk.UsagePercent >= 80)  { cssClass = "warning";  status = "🟡 WARNING";  }
            else                               { cssClass = "ok";       status = "🟢 OK";        }

            rows.AppendLine($"""
                <tr class="{cssClass}">
                  <td>{HtmlEncode(disk.MountPoint)}</td>
                  <td>{HtmlEncode(disk.FileSystem)}</td>
                  <td>{HtmlEncode(disk.FileSystemType)}</td>
                  <td>{HtmlEncode(disk.TotalSize)}</td>
                  <td>{HtmlEncode(disk.UsedSize)}</td>
                  <td>{HtmlEncode(disk.AvailableSize)}</td>
                  <td>{disk.UsagePercent:F0}%</td>
                  <td>{status}</td>
                </tr>
            """);
        }

        var actionBanner = hasCritical
            ? """<div class="action-required">🚨 ACTION REQUIRED : Disk Usage Above Critical Threshold 🚨</div>"""
            : string.Empty;

        return $$"""
            <html>
            <head><style>
            body { font-family: Arial, Helvetica, sans-serif; background-color: #f4f6f9; padding: 20px; }
            .container { background: white; padding: 20px; border-radius: 10px; }
            .server-box { margin-top: 35px; }
            h2 { color: #2c3e50; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #34495e; color: white; padding: 10px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #dddddd; }
            .ok       { background-color: #d4edda; color: #155724; font-weight: bold; }
            .warning  { background-color: #fff3cd; color: #856404; font-weight: bold; }
            .critical { background-color: #f8d7da; color: #721c24; font-weight: bold; }
            .action-required {
                background-color: red; color: white; padding: 15px;
                text-align: center; font-size: 22px; font-weight: bold;
                border-radius: 5px; margin-bottom: 20px;
            }
            .footer { margin-top: 20px; font-size: 12px; color: #777777; }
            </style></head>
            <body><div class="container">

            <h2>📊 PalTech Servers Disk Usage Monitoring Report</h2>
            {{actionBanner}}
            <p><b>Generated At:</b> {{generatedAt}}</p>

            <div class="server-box">
            <h3>🖥️ Server: {{HtmlEncode(server.Hostname)}} ({{HtmlEncode(server.IpAddress)}})</h3>
            <table>
            <tr>
              <th>Mount Point</th><th>Filesystem</th><th>Type</th>
              <th>Total Size</th><th>Used</th><th>Available</th>
              <th>Usage</th><th>Status</th>
            </tr>
            {{rows}}
            </table>
            </div>

            <div class="footer">Generated Automatically by MonitoringHub</div>
            </div></body></html>
            """;
    }

    private static string HtmlEncode(string s) =>
        s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;")
         .Replace("\"", "&quot;").Replace("'", "&#39;");
}
