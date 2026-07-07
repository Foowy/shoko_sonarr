using Shoko.Abstractions.Plugin;
using Shoko.Abstractions.Plugin.Models;

namespace ShokoSonarr;

/// <summary>Plugin entry point and descriptor for Shoko Server.</summary>
public class Plugin : IPlugin
{
    /// <inheritdoc/>
    public Guid ID => new(ShokoSonarrConstants.PluginId);

    /// <inheritdoc/>
    public string Name => ShokoSonarrConstants.Name;

    /// <inheritdoc/>
    public string? Description => ShokoSonarrConstants.Description;

    /// <inheritdoc/>
    public IReadOnlyList<PluginPage> GetPages() =>
        [new() { Name = "Missing Episodes", Url = $"{ShokoSonarrConstants.BasePath}/dashboard" }];
}
