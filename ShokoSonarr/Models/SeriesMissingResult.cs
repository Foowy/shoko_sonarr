namespace ShokoSonarr.Models;

/// <summary>Missing-episode results for a single Shoko series.</summary>
public class SeriesMissingResult
{
    /// <summary>The Shoko series ID.</summary>
    public int ShokoSeriesId { get; set; }

    /// <summary>The series' preferred display title.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Relative path to the series' poster image, if available.</summary>
    public string? PosterPath { get; set; }

    /// <summary>The resolved Sonarr TVDB ID, if a match was found (via TMDB link or confirmed title search). Null if no Sonarr match exists yet.</summary>
    public int? TvdbId { get; set; }

    /// <summary>The list of missing episodes for this series.</summary>
    public List<MissingEpisodeInfo> MissingEpisodes { get; set; } = [];
}
