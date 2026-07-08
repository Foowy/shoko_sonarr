const API_BASE = window.location.pathname.replace(/\/dashboard.*$/, '').replace('/api/plugin/ShokoSonarr', '/api/v1.0/ShokoSonarr');

async function fetchJson(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.status === 204 ? null : res.json();
}

function renderSeries(snapshot) {
  const container = document.getElementById('series-list');
  container.innerHTML = '';
  if (!snapshot || !snapshot.Data || snapshot.Data.Series.length === 0) {
    container.textContent = 'No missing episodes found.';
    return;
  }

  for (const series of snapshot.Data.Series) {
    const card = document.createElement('div');
    card.className = 'series-card' + (series.TvdbId ? '' : ' no-match');

    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `<span>${series.Title}</span><span class="badge">${series.MissingEpisodes.length} missing</span>`;
    header.onclick = () => card.classList.toggle('expanded');
    card.appendChild(header);

    const episodesDiv = document.createElement('div');
    episodesDiv.className = 'episodes';
    for (const ep of series.MissingEpisodes) {
      const row = document.createElement('div');
      row.className = 'episode-row';
      row.innerHTML = `<span>${ep.IsSpecial ? 'S' : 'E'}${ep.EpisodeNumber} — ${ep.Title || '(untitled)'}</span><span>${ep.ActionStatus}</span>`;
      episodesDiv.appendChild(row);
    }
    card.appendChild(episodesDiv);

    const actions = document.createElement('div');
    actions.className = 'actions';
    if (series.TvdbId) {
      const searchBtn = document.createElement('button');
      searchBtn.textContent = 'Add to Sonarr / Search';
      searchBtn.onclick = () => addAndSearch(series);
      actions.appendChild(searchBtn);
    } else {
      const label = document.createElement('span');
      label.textContent = 'No Sonarr match available';
      actions.appendChild(label);
    }
    card.appendChild(actions);

    container.appendChild(card);
  }
}

async function addAndSearch(series) {
  const anidbEpisodeIds = series.MissingEpisodes.map(e => e.AnidbEpisodeId);
  const result = await fetchJson('/Sonarr/add-and-search', {
    method: 'POST',
    body: JSON.stringify({ shokoSeriesId: series.ShokoSeriesId, tvdbId: series.TvdbId, anidbEpisodeIds }),
  });
  alert(result.Success ? 'Search triggered.' : `Failed: ${result.Message}`);
  await loadScanResults();
}

async function loadScanResults() {
  const result = await fetchJson('/Scan/results');
  renderSeries(result);
}

let savedQualityProfileId = null;
let savedRootFolderPath = null;

function currentSettingsForm() {
  return {
    baseUrl: document.getElementById('settings-url').value,
    apiKey: document.getElementById('settings-key').value,
    scanIntervalHours: Number(document.getElementById('settings-interval').value),
  };
}

function populateSelect(id, items, valueKey, labelKey, selectedValue) {
  const select = document.getElementById(id);
  select.innerHTML = '';
  for (const item of items || []) {
    const option = document.createElement('option');
    option.value = item[valueKey];
    option.textContent = item[labelKey];
    if (String(item[valueKey]) === String(selectedValue))
      option.selected = true;
    select.appendChild(option);
  }
}

async function loadSonarrOptions(settings) {
  const result = await fetchJson('/Settings/sonarr-options', { method: 'POST', body: JSON.stringify(settings) });
  if (!result.Success) {
    document.getElementById('settings-status').textContent = `Failed to load Sonarr options: ${result.Message}`;
    return;
  }
  populateSelect('settings-quality-profile', result.Data.qualityProfiles, 'Id', 'Name', savedQualityProfileId);
  populateSelect('settings-root-folder', result.Data.rootFolders, 'Path', 'Path', savedRootFolderPath);
}

async function loadSettings() {
  const result = await fetchJson('/Settings');
  document.getElementById('settings-url').value = result.Data.BaseUrl || '';
  document.getElementById('settings-interval').value = result.Data.ScanIntervalHours;
  savedQualityProfileId = result.Data.QualityProfileId;
  savedRootFolderPath = result.Data.RootFolderPath;
  populateSelect('settings-quality-profile', savedQualityProfileId ? [{ Id: savedQualityProfileId, Name: `#${savedQualityProfileId}` }] : [], 'Id', 'Name', savedQualityProfileId);
  populateSelect('settings-root-folder', savedRootFolderPath ? [{ Path: savedRootFolderPath }] : [], 'Path', 'Path', savedRootFolderPath);
  // The stored API key is masked here, not usable to call Sonarr — dropdowns above show the saved
  // value as a single placeholder option; Test Connection (re-entering the real key) repopulates
  // them with the live list from Sonarr.
}

document.getElementById('scan-now').onclick = async () => {
  const result = await fetchJson('/Scan', { method: 'POST' });
  renderSeries(result);
};

document.getElementById('open-settings').onclick = () => {
  document.getElementById('settings-panel').classList.toggle('hidden');
};

document.getElementById('test-connection').onclick = async () => {
  const settings = currentSettingsForm();
  const result = await fetchJson('/Settings/test-connection', { method: 'POST', body: JSON.stringify(settings) });
  document.getElementById('settings-status').textContent = result.Success ? 'Connected!' : `Failed: ${result.Message}`;
  if (result.Success)
    await loadSonarrOptions(settings);
};

document.getElementById('save-settings').onclick = async () => {
  const settings = {
    ...currentSettingsForm(),
    qualityProfileId: Number(document.getElementById('settings-quality-profile').value) || null,
    rootFolderPath: document.getElementById('settings-root-folder').value || null,
  };
  await fetchJson('/Settings', { method: 'PUT', body: JSON.stringify(settings) });
  document.getElementById('settings-status').textContent = 'Saved.';
};

loadSettings();
loadScanResults();
