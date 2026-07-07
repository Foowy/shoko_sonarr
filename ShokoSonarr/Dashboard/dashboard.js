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
  if (!snapshot || !snapshot.data || snapshot.data.series.length === 0) {
    container.textContent = 'No missing episodes found.';
    return;
  }

  for (const series of snapshot.data.series) {
    const card = document.createElement('div');
    card.className = 'series-card' + (series.tvdbId ? '' : ' no-match');

    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `<span>${series.title}</span><span class="badge">${series.missingEpisodes.length} missing</span>`;
    header.onclick = () => card.classList.toggle('expanded');
    card.appendChild(header);

    const episodesDiv = document.createElement('div');
    episodesDiv.className = 'episodes';
    for (const ep of series.missingEpisodes) {
      const row = document.createElement('div');
      row.className = 'episode-row';
      row.innerHTML = `<span>${ep.isSpecial ? 'S' : 'E'}${ep.episodeNumber} — ${ep.title || '(untitled)'}</span><span>${ep.actionStatus}</span>`;
      episodesDiv.appendChild(row);
    }
    card.appendChild(episodesDiv);

    const actions = document.createElement('div');
    actions.className = 'actions';
    if (series.tvdbId) {
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
  const anidbEpisodeIds = series.missingEpisodes.map(e => e.anidbEpisodeId);
  const result = await fetchJson('/Sonarr/add-and-search', {
    method: 'POST',
    body: JSON.stringify({ shokoSeriesId: series.shokoSeriesId, tvdbId: series.tvdbId, anidbEpisodeIds }),
  });
  alert(result.success ? 'Search triggered.' : `Failed: ${result.message}`);
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
  if (!result.success) {
    document.getElementById('settings-status').textContent = `Failed to load Sonarr options: ${result.message}`;
    return;
  }
  populateSelect('settings-quality-profile', result.data.qualityProfiles, 'id', 'name', savedQualityProfileId);
  populateSelect('settings-root-folder', result.data.rootFolders, 'id', 'path', savedRootFolderPath);
}

async function loadSettings() {
  const result = await fetchJson('/Settings');
  document.getElementById('settings-url').value = result.data.baseUrl || '';
  document.getElementById('settings-interval').value = result.data.scanIntervalHours;
  savedQualityProfileId = result.data.qualityProfileId;
  savedRootFolderPath = result.data.rootFolderPath;
  // The stored API key is masked here, not usable to call Sonarr — dropdowns populate after a successful
  // Test Connection (which requires the user to (re-)enter the real key) instead.
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
  document.getElementById('settings-status').textContent = result.success ? 'Connected!' : `Failed: ${result.message}`;
  if (result.success)
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
