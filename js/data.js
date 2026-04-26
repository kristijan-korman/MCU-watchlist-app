// Shared data fetching — used by all pages

const posterCache = {};
let allMovies = [];
let canonicalImageId = {};
let movieCollectionMap = {};
let collectionMovieMap = {}; // gid → array of movieIds in that collection
let recentReleaseId = null; // ID of the most recent past release, set during initData

// ─── Sheet fetching ───

async function fetchSheet(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&tq=select+*&gid=${gid}`;
  const resp = await fetch(url);
  const text = await resp.text();
  const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/)[1];
  return JSON.parse(jsonStr);
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    values.push(current.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] || '');
    // Flag entries where date is year-only (e.g. "2027")
    obj.dateIsYearOnly = /^\d{4}$/.test((obj['Release Date'] || '').trim());
    return obj;
  }).filter(row => row.ID);
}

async function loadMovies() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${MCU_GID}`;
  const resp = await fetch(url);
  const text = await resp.text();
  return parseCSV(text);
}

// ─── Collections config ───
// Reads the COLLECTIONS index sheet. Each row: col A = GID, col B = Name, col C = Slug
async function loadCollectionsConfig() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${COLLECTIONS_GID}`;
    const resp = await fetch(url);
    const text = await resp.text();
    const lines = text.trim().split('\n').slice(1); // skip header row
    COLLECTIONS = lines
      .map(line => {
        const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
        const [gid, name, slug] = cols;
        if (!gid || !name) return null;
        // Auto-generate slug from name if not provided
        const autoSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        return { gid, name, slug: autoSlug };
      })
      .filter(Boolean);
  } catch(e) {
    console.warn('Could not load collections config:', e);
  }
}

async function loadCollection(gid) {
  const data = await fetchSheet(gid);
  return data.table.rows
    .filter(r => r && r.c && r.c[1] && r.c[1].v)
    .map((r, i) => ({
      id:   String(r.c[1].v).trim(),
      desc: (r.c[2] && r.c[2].v) ? String(r.c[2].v).trim() : '',
      key:  String(r.c[1].v).trim() + '_' + i
    }));
}

async function loadAllCollections() {
  movieCollectionMap = {};
  collectionMovieMap = {};
  for (const col of COLLECTIONS) {
    try {
      const entries = await loadCollection(col.gid);
      const ids = [];
      entries.forEach(entry => {
        if (!movieCollectionMap[entry.id]) movieCollectionMap[entry.id] = [];
        if (!movieCollectionMap[entry.id].find(c => c.gid === col.gid)) {
          movieCollectionMap[entry.id].push({ gid: col.gid, name: col.name, slug: col.slug });
          movieCollectionMap[entry.id].sort((a, b) => a.name.localeCompare(b.name));
        }
        if (!ids.includes(entry.id)) ids.push(entry.id);
      });
      collectionMovieMap[col.gid] = ids;
    } catch(e) { /* skip failed collections */ }
  }
}

// Finds collections for a single movie ID — much faster than loadAllCollections
async function loadCollectionsForMovie(movieId) {
  const results = [];
  await Promise.all(COLLECTIONS.map(async col => {
    try {
      const entries = await loadCollection(col.gid);
      if (entries.find(e => e.id === movieId)) {
        results.push({ gid: col.gid, name: col.name, slug: col.slug });
      }
    } catch(e) { /* skip */ }
  }));
  return results;
}

// ─── Posters ───

function isTV(m) {
  return m.Type && (m.Type.toLowerCase().includes('show') || m.Type.toLowerCase().includes('series'));
}

// Shows that intentionally reuse their S1 poster for later seasons
const REUSE_S1_POSTER = new Set(['marvel_zombies_s02', 'wonder_man_s02']);

function getImageId(m) {
  // If this entry has its own local image file (by ID), use it directly
  // Exception: entries explicitly set to reuse S1 poster
  if (REUSE_S1_POSTER.has(m.ID)) {
    // Point to S1 image by stripping the season suffix and replacing with s01
    return m.ID.replace(/_s\d+$/, '_s01');
  }
  // For TV entries with a season number, prefer their own ID over the canonical S1
  if (m.Season && isTV(m)) return m.ID;
  return canonicalImageId[m.Title] || m.ID;
}

async function localImageExists(imageId, size) {
  const key = `local_${imageId}_${size}`;
  if (posterCache[key] !== undefined) return posterCache[key];
  try {
    const resp = await fetch(`images/${imageId}_${size}.jpg`, { method: 'HEAD' });
    posterCache[key] = resp.ok;
  } catch(e) {
    posterCache[key] = false;
  }
  return posterCache[key];
}

async function getPosterUrl(m, size = 'w300') {
  const imageId = getImageId(m);
  if (await localImageExists(imageId, size)) return `images/${imageId}_${size}.jpg`;

  // If season-specific image is missing, fall back through previous seasons down to S1
  if (m.Season && isTV(m)) {
    const seasonNum = parseInt(m.Season.replace(/\D/g, ''), 10);
    for (let s = seasonNum - 1; s >= 1; s--) {
      const fallbackId = m.ID.replace(/_s\d+$/, `_s${String(s).padStart(2, '0')}`);
      if (await localImageExists(fallbackId, size)) return `images/${fallbackId}_${size}.jpg`;
    }
  }

  const cacheKey = `tmdb_${m.ID}_${size}`;
  if (posterCache[cacheKey] !== undefined) return posterCache[cacheKey];
  try {
    const endpoint = isTV(m) ? 'search/tv' : 'search/movie';
    const yearParam = (!isTV(m) && m['Release Date']) ? `&year=${m['Release Date'].split(',').pop().trim()}` : '';
    const url = `https://api.themoviedb.org/3/${endpoint}?query=${encodeURIComponent(m.Title)}${yearParam}&language=en-US&page=1`;
    const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${TMDB_TOKEN}`, 'accept': 'application/json' } });
    const data = await resp.json();
    const result = data.results && data.results[0];
    const path = result ? result.poster_path : null;
    posterCache[cacheKey] = path ? `${TMDB_IMG}${size}${path}` : null;
  } catch(e) {
    posterCache[cacheKey] = null;
  }
  return posterCache[cacheKey];
}

// ─── Countdown ───

function getCountdown(m) {
  if (!m['Release Date'] || m.dateIsYearOnly) return null;
  const target = new Date(m['Release Date']);
  if (isNaN(target)) return null;
  const diff = target - new Date();
  if (diff <= 0) return null;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 1) return '1 day to go';
  if (days < 30) return `${days} days to go`;
  const months = Math.ceil(days / 30);
  return `~${months} month${months > 1 ? 's' : ''} to go`;
}

// Returns true if the entry is in the future (including year-only dates)
function isUpcoming(m) {
  if (!m['Release Date']) return false;
  if (m.dateIsYearOnly) {
    const year = parseInt(m['Release Date'].trim(), 10);
    return !isNaN(year) && year >= new Date().getFullYear();
  }
  const d = new Date(m['Release Date']);
  if (isNaN(d)) return false;
  return d > new Date();
}

// ─── Type label ───
// If Type is "Short Film" and Additional type is set, display only the Additional type.
function getTypeLabel(m) {
  if (!m.Type) return '';
  if (m.Type.toLowerCase().includes('short') && m['Additional type']) return m['Additional type'];
  return m['Additional type'] ? `${m.Type} · ${m['Additional type']}` : m.Type;
}

// ─── Badges ───

function getBadgeClass(universe) {
  if (!universe) return 'other';
  const u = universe.toLowerCase();
  if (u.includes('mcu'))     return 'mcu';
  if (u.includes('sony'))    return 'sony';
  if (u.includes('fox'))     return 'fox';
  if (u.includes('netflix')) return 'netflix';
  return 'other';
}

// ─── Smart search fallback ───
// Returns up to `limit` movies from allMovies matching the query,
// excluding any IDs already shown in the current filtered result.
function globalSearch(query, excludeIds = []) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return allMovies
    .filter(m => !excludeIds.includes(m.ID) && m.Title.toLowerCase().includes(q));
}

// Renders a "Did you mean?" suggestion block into a container element.
// Call this when a page's filtered results are empty but the search query is non-empty.
function renderSmartSearchSuggestions(containerEl, query, excludeIds = []) {
  const matches = globalSearch(query, excludeIds);
  if (matches.length === 0) return false;
  containerEl.innerHTML = `
    <div class="smart-search-suggestions">
      <div class="smart-search-label">Not found here — did you mean:</div>
      <div class="smart-search-grid">
        ${matches.map(m => `
          <button class="smart-search-item" onclick="openModal('${m.ID}')" data-suggest-id="${m.ID}">
            <div class="smart-search-poster-placeholder" id="suggest-poster-${m.ID}">🎬</div>
            <span class="smart-search-title">${m.Title}${m.Season ? ' · ' + m.Season : ''}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  // Load posters async
  matches.forEach(async m => {
    const url = await getPosterUrl(m, 'w300');
    const el = document.getElementById(`suggest-poster-${m.ID}`);
    if (!el) return;
    if (url) {
      const img = document.createElement('img');
      img.className = 'smart-search-poster';
      img.src = url;
      img.alt = m.Title;
      el.replaceWith(img);
    }
  });
  return true;
}

// ─── Init shared data ───

async function initData() {
  await loadCollectionsConfig();
  allMovies = await loadMovies();
  const seenTitles = {};
  allMovies.forEach(m => {
    if (isTV(m) && !seenTitles[m.Title]) seenTitles[m.Title] = m.ID;
  });
  canonicalImageId = seenTitles;

  // Determine recent release — most recent past entry with a full date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const past = allMovies
    .filter(m => !m.dateIsYearOnly && m['Release Date'] && !isNaN(new Date(m['Release Date'])) && new Date(m['Release Date']) < today)
    .sort((a, b) => new Date(b['Release Date']) - new Date(a['Release Date']));
  recentReleaseId = past.length > 0 ? past[0].ID : null;

  // Load collection map in background
  loadAllCollections();
  return allMovies;
}
