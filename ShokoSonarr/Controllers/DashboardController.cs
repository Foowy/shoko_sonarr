using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using IoFile = System.IO.File;

namespace ShokoSonarr.Controllers;

/// <summary>Serves the embedded dashboard page and its static assets.</summary>
[ApiController]
[ApiVersion(ShokoSonarrConstants.ApiVersion)]
[Route(ShokoSonarrConstants.BasePath)]
public class DashboardController : ControllerBase
{
    private static readonly FileExtensionContentTypeProvider s_contentTypeProvider = new();
    private static readonly string s_dashboardDir = Path.Combine(AppContext.BaseDirectory, "dashboard");

    /// <summary>Serves the main dashboard page.</summary>
    /// <returns>The dashboard HTML content.</returns>
    [HttpGet("dashboard")]
    public IActionResult GetDashboardPage()
    {
        var indexPath = Path.Combine(s_dashboardDir, "dashboard.html");
        return IoFile.Exists(indexPath) ? Content(IoFile.ReadAllText(indexPath), "text/html") : NotFound();
    }

    /// <summary>Serves static assets (CSS, JS) from the dashboard folder.</summary>
    /// <param name="path">The relative asset path.</param>
    /// <returns>The physical asset file.</returns>
    [HttpGet("dashboard/{*path}")]
    public IActionResult GetAssetFile([FromRoute] string path)
    {
        var safePath = path.Replace('/', Path.DirectorySeparatorChar);
        var requested = Path.GetFullPath(Path.Combine(s_dashboardDir, safePath));
        var dashboardDirWithSeparator = Path.GetFullPath(s_dashboardDir) + Path.DirectorySeparatorChar;
        if (!requested.StartsWith(dashboardDirWithSeparator, StringComparison.OrdinalIgnoreCase) || !IoFile.Exists(requested))
            return NotFound();

        if (!s_contentTypeProvider.TryGetContentType(requested, out var contentType))
            contentType = "application/octet-stream";
        return PhysicalFile(requested, contentType);
    }
}
