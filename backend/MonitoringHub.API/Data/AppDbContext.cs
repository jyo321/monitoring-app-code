using Microsoft.EntityFrameworkCore;
using MonitoringHub.API.Models;

namespace MonitoringHub.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Server> Servers => Set<Server>();
    public DbSet<DiskMetric> DiskMetrics => Set<DiskMetric>();
    public DbSet<Alert> Alerts => Set<Alert>();
    public DbSet<ApiToken> ApiTokens => Set<ApiToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Server>(e =>
        {
            e.HasIndex(s => s.Hostname).IsUnique();
            e.Property(s => s.Environment).HasDefaultValue("production");
        });

        modelBuilder.Entity<DiskMetric>(e =>
        {
            e.HasOne(d => d.Server).WithMany(s => s.DiskMetrics).HasForeignKey(d => d.ServerId);
            e.HasIndex(d => new { d.ServerId, d.CollectedAt });
        });

        modelBuilder.Entity<Alert>(e =>
        {
            e.HasOne(a => a.Server).WithMany(s => s.Alerts).HasForeignKey(a => a.ServerId);
            e.HasIndex(a => new { a.ServerId, a.MountPoint, a.CreatedAt });
        });

        modelBuilder.Entity<ApiToken>(e =>
        {
            e.HasIndex(t => t.Token).IsUnique();
        });

        // Seed a default API token for local dev
        modelBuilder.Entity<ApiToken>().HasData(new ApiToken
        {
            Id = 1,
            Token = "dev-token-12345",
            Description = "Default local dev token",
            CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            IsActive = true
        });
    }
}
