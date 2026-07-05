using Microsoft.EntityFrameworkCore;
using MonitoringHub.API.Data;

namespace MonitoringHub.API.Middleware;

public class ApiTokenMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string? _configToken;

    public ApiTokenMiddleware(RequestDelegate next, IConfiguration configuration)
    {
        _next = next;
        _configToken = configuration["ApiToken"];
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        if (context.Request.Path.StartsWithSegments("/api/metrics"))
        {
            var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
            if (authHeader == null || !authHeader.StartsWith("Bearer "))
            {
                context.Response.StatusCode = 401;
                await context.Response.WriteAsJsonAsync(new { error = "Missing or invalid Authorization header" });
                return;
            }

            var token = authHeader["Bearer ".Length..].Trim();

            // Check config token first (fast path)
            var valid = (!string.IsNullOrEmpty(_configToken) && token == _configToken)
                        || await db.ApiTokens.AnyAsync(t => t.Token == token && t.IsActive);

            if (!valid)
            {
                context.Response.StatusCode = 401;
                await context.Response.WriteAsJsonAsync(new { error = "Unauthorized" });
                return;
            }
        }

        await _next(context);
    }
}
