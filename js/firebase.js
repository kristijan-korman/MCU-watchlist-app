// Firebase — watched tracking
// Uses Firebase compat SDK (loaded via CDN script tags in HTML)
// Firestore path: users/{username}/watched/{movieId} = { watchedAt: timestamp }

const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyC8BewwCgkSgJ2oQyglDht11xQ18ywiPKA',
  authDomain:        'mcu-app-project.firebaseapp.com',
  projectId:         'mcu-app-project',
  storageBucket:     'mcu-app-project.firebasestorage.app',
  messagingSenderId: '307969707596',
  appId:             '1:307969707596:web:53598ef8029ae83300aee9',
};

firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();

// In-memory cache of watched IDs for the current session
let watchedSet = new Set();
let watchedLoaded = false;

// ─── Local cache helpers ───

function _watchedCacheKey(user) {
  return `mcu_watched_${user}`;
}

function _saveWatchedToCache(user, set) {
  try {
    localStorage.setItem(_watchedCacheKey(user), JSON.stringify([...set]));
  } catch(e) {}
}

function _loadWatchedFromCache(user) {
  try {
    const raw = localStorage.getItem(_watchedCacheKey(user));
    if (raw) return new Set(JSON.parse(raw));
  } catch(e) {}
  return null;
}

// ─── Load ───

async function loadWatched() {
  const user = getCurrentUser();
  if (!user) { watchedSet = new Set(); watchedLoaded = true; return; }

  // Show cached count immediately to avoid flicker
  const cached = _loadWatchedFromCache(user);
  if (cached) {
    watchedSet = cached;
    updateWatchedCounter();
  }

  try {
    const snap = await db.collection('users').doc(user).collection('watched').get();
    watchedSet = new Set(snap.docs.map(d => d.id));
    _saveWatchedToCache(user, watchedSet);
  } catch(e) {
    console.warn('Could not load watched list:', e);
    if (!cached) watchedSet = new Set();
  }
  watchedLoaded = true;
}

// ─── Query ───

function isWatched(movieId) {
  return watchedSet.has(movieId);
}

function watchedCount() {
  return watchedSet.size;
}

// ─── Toggle ───

async function toggleWatched(movieId) {
  const user = getCurrentUser();
  if (!user) { showLoginModal(); return; }

  const wasWatched = isWatched(movieId);
  const ref = db.collection('users').doc(user).collection('watched').doc(movieId);
  if (wasWatched) {
    watchedSet.delete(movieId);
    await ref.delete();
  } else {
    watchedSet.add(movieId);
    await ref.set({ watchedAt: firebase.firestore.FieldValue.serverTimestamp() });
  }

  _saveWatchedToCache(user, watchedSet);
  refreshWatchedUI();

  // When marking as watched: close modal after delay, then show toast
  if (!wasWatched) {
    const m = (typeof allMovies !== 'undefined') && allMovies.find(x => x.ID === movieId);
    const title = m ? m.Title : movieId;
    setTimeout(() => {
      _animatedModalClose(() => _showWatchedToast(`"${title}" marked as watched`));
    }, 600);
  }
}

function _showWatchedToast(message) {
  let toast = document.getElementById('watchedToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'watchedToast';
    toast.className = 'watched-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  // Reset animation if already showing
  toast.classList.remove('show');
  clearTimeout(toast._hideTimer);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('show');
      toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 3000);
    });
  });
}

// ─── UI refresh ───

function refreshWatchedUI() {
  const user = getCurrentUser();

  // If logged out, remove all watched buttons from the DOM
  if (!user) {
    document.querySelectorAll('[data-watched-id]').forEach(btn => btn.remove());
    updateWatchedCounter();
    return;
  }

  // Update all watched buttons on the page
  document.querySelectorAll('[data-watched-id]').forEach(btn => {
    const id = btn.dataset.watchedId;
    const watched = isWatched(id);
    btn.classList.toggle('watched', watched);
    btn.title = watched ? 'Mark as unwatched' : 'Mark as watched';
    btn.setAttribute('aria-pressed', watched);
    const icon = btn.querySelector('.material-icons');
    if (icon) icon.textContent = 'check';
    const label = btn.querySelector('.watched-label, .watched-modal-label');
    if (label) label.textContent = watched ? 'Watched' : 'Mark as watched';
  });

  // Sync desktop modal footer
  const footer = document.getElementById('modalWatchedFooter');
  if (footer && footer.innerHTML) {
    const btn = footer.querySelector('[data-watched-id]');
    if (btn) renderModalWatchedFooter(btn.dataset.watchedId);
  }

  // Sync mobile bottom bar
  const bar = document.getElementById('modalBottomBar');
  if (bar && bar.dataset.watchedId) {
    const id = bar.dataset.watchedId;
    const watched = isWatched(id);
    bar.className = `modal-bottom-bar${watched ? ' watched' : ''}`;
    bar.innerHTML = `<span class="material-icons">check</span><span class="watched-modal-label">${watched ? 'Watched' : 'Mark as watched'}</span>`;
  }

  // Update progress counter
  updateWatchedCounter();
}

const _TOTAL_CACHE_KEY = 'mcu_total_count';

function _saveTotalToCache(total) {
  try { localStorage.setItem(_TOTAL_CACHE_KEY, total); } catch(e) {}
}

function _loadTotalFromCache() {
  try {
    const raw = localStorage.getItem(_TOTAL_CACHE_KEY);
    if (raw) return parseInt(raw, 10);
  } catch(e) {}
  return null;
}

function updateWatchedCounter() {
  const el = document.getElementById('watchedCounter');
  if (!el) return;
  const user = getCurrentUser();
  if (!user) { el.style.display = 'none'; return; }

  const count = watchedCount();
  const total = (typeof allMovies !== 'undefined')
    ? allMovies.length
    : _loadTotalFromCache();

  if (!total) { el.style.display = 'none'; return; }

  // Save the latest total for next page load
  if (typeof allMovies !== 'undefined') _saveTotalToCache(allMovies.length);

  const pct = Math.round((count / total) * 100);
  el.innerHTML = `
    <span class="watched-counter-text">${count} / ${total}</span>
    <div class="watched-counter-bar"><div class="watched-counter-bar-fill" style="width:${pct}%"></div></div>
  `;
  el.style.display = 'inline-flex';
}

// ─── Completed collections cache ───
// Firestore path: users/{username}/cache/completedCollections { slugs: [...], updatedAt }
// Also mirrored to localStorage for instant reads.

function _completedColCacheKey(user) {
  return `mcu_completed_collections_${user}`;
}

function loadCompletedCollectionsFromCache(user) {
  try {
    const raw = localStorage.getItem(_completedColCacheKey(user));
    if (raw) return JSON.parse(raw); // array of { slug, name }
  } catch(e) {}
  return null;
}

async function saveCompletedCollections(collections) {
  const user = getCurrentUser();
  if (!user) return;
  const data = collections.map(c => ({ slug: c.slug, name: c.name }));
  try {
    localStorage.setItem(_completedColCacheKey(user), JSON.stringify(data));
  } catch(e) {}
  try {
    await db.collection('users').doc(user).collection('cache').doc('completedCollections').set({
      collections: data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch(e) {
    console.warn('Could not save completed collections cache:', e);
  }
}

async function loadCompletedCollectionsFromFirestore(user) {
  try {
    const doc = await db.collection('users').doc(user).collection('cache').doc('completedCollections').get();
    if (doc.exists) {
      const data = doc.data().collections || [];
      localStorage.setItem(_completedColCacheKey(user), JSON.stringify(data));
      return data;
    }
  } catch(e) {
    console.warn('Could not load completed collections cache:', e);
  }
  return null;
}

// ─── Recent release cache ───

async function getCachedRecentRelease() {
  try {
    const doc = await db.collection('meta').doc('recentRelease').get();
    if (doc.exists) return doc.data(); // { id, collections: [{gid, name, slug}] }
  } catch(e) {
    console.warn('Could not read recent release cache:', e);
  }
  return null;
}

async function setCachedRecentRelease(movieId, collections) {
  try {
    await db.collection('meta').doc('recentRelease').set({
      id: movieId,
      collections,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch(e) {
    console.warn('Could not write recent release cache:', e);
  }
}

// ─── Animated modal close ───
function _animatedModalClose(callback) {
  const overlay = document.getElementById('modalOverlay');
  if (!overlay) { if (callback) callback(); return; }
  overlay.classList.add('closing');
  setTimeout(() => {
    overlay.classList.remove('open', 'closing');
    hideModalBottomBar();
    if (callback) callback();
  }, 200);
}

// ─── Render helper ───
// Returns the HTML for a watched button for a given movie ID.
// Pages call this inside their card/modal render functions.

function isReleased(movieId) {
  if (typeof allMovies === 'undefined') return false;
  const m = allMovies.find(x => x.ID === movieId);
  if (!m) return false;
  if (m.dateIsYearOnly) return false;
  const d = new Date(m['Release Date']);
  if (isNaN(d)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d <= today;
}

// Round button overlaid on poster top-left — shown in grid view only
function watchedCardButtonHTML(movieId) {
  if (!getCurrentUser()) return '';
  if (!isReleased(movieId)) return '';
  const watched = isWatched(movieId);
  return `<button
    class="watched-card-btn${watched ? ' watched' : ''}"
    data-watched-id="${movieId}"
    onclick="event.stopPropagation(); toggleWatched('${movieId}')"
    title="${watched ? 'Mark as unwatched' : 'Mark as watched'}"
    aria-pressed="${watched}"
  ><span class="material-icons">check</span></button>`;
}

// Round button as a flex sibling on the right — shown in list/mobile view only
function watchedCardSideButtonHTML(movieId) {
  if (!getCurrentUser()) return '';
  if (!isReleased(movieId)) return '';
  const watched = isWatched(movieId);
  return `<button
    class="watched-card-side-btn${watched ? ' watched' : ''}"
    data-watched-id="${movieId}"
    onclick="event.stopPropagation(); toggleWatched('${movieId}')"
    title="${watched ? 'Mark as unwatched' : 'Mark as watched'}"
    aria-pressed="${watched}"
  ><span class="material-icons">check</span></button>`;
}

function renderModalWatchedFooter(movieId) {
  const footer = document.getElementById('modalWatchedFooter');
  if (!footer) return;
  if (!getCurrentUser() || !isReleased(movieId)) {
    footer.innerHTML = '';
    footer.style.display = 'none';
    return;
  }
  footer.style.display = '';
  const watched = isWatched(movieId);
  footer.innerHTML = `<button
    class="watched-modal-btn${watched ? ' watched' : ''}"
    data-watched-id="${movieId}"
    onclick="event.stopPropagation(); toggleWatched('${movieId}')"
    title="${watched ? 'Mark as unwatched' : 'Mark as watched'}"
    aria-pressed="${watched}"
  ><span class="material-icons">check</span><span class="watched-modal-label">${watched ? 'Watched' : 'Mark as watched'}</span></button>`;
}

// Called by openModal on each page to sync the mobile bottom bar
function setModalBottomBar(movieId) {
  const bar = document.getElementById('modalBottomBar');
  if (!bar) return;
  if (!getCurrentUser() || !isReleased(movieId) || window.innerWidth > 600) {
    bar.style.display = 'none';
    return;
  }
  const watched = isWatched(movieId);
  bar.className = `modal-bottom-bar${watched ? ' watched' : ''}`;
  bar.dataset.watchedId = movieId;
  bar.innerHTML = `<span class="material-icons">check</span><span class="watched-modal-label">${watched ? 'Watched' : 'Mark as watched'}</span>`;
  bar.style.display = 'flex';
}

function hideModalBottomBar() {
  const bar = document.getElementById('modalBottomBar');
  if (bar) bar.style.display = 'none';
}

// ─── User settings ───
// Firestore path: users/{username}/settings/prefs  { page: { key: value } }
// Also mirrored to localStorage for instant reads on page load.

let _settingsCache = {};

function _settingsCacheKey(user) {
  return `mcu_settings_${user}`;
}

function _loadSettingsFromLocalCache(user) {
  try {
    const raw = localStorage.getItem(_settingsCacheKey(user));
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return {};
}

function _saveSettingsToLocalCache(user, settings) {
  try {
    localStorage.setItem(_settingsCacheKey(user), JSON.stringify(settings));
  } catch(e) {}
}

// Load settings from Firestore (called once on page load alongside loadWatched)
async function loadSettings() {
  const user = getCurrentUser();
  if (!user) { _settingsCache = {}; return; }

  // Use local cache immediately
  _settingsCache = _loadSettingsFromLocalCache(user);

  try {
    const doc = await db.collection('users').doc(user).collection('settings').doc('prefs').get();
    if (doc.exists) {
      _settingsCache = doc.data();
      _saveSettingsToLocalCache(user, _settingsCache);
    }
  } catch(e) {
    console.warn('Could not load settings:', e);
  }
}

// Get a setting value: getSetting('database', 'sortOrder') => 'desc'
function getSetting(page, key, fallback = null) {
  return (_settingsCache[page] && _settingsCache[page][key] !== undefined)
    ? _settingsCache[page][key]
    : fallback;
}

// Save a setting — writes to in-memory cache, localStorage, and Firestore (debounced)
const _settingsDebounce = {};
function saveSetting(page, key, value) {
  const user = getCurrentUser();
  if (!user) return;

  if (!_settingsCache[page]) _settingsCache[page] = {};
  _settingsCache[page][key] = value;
  _saveSettingsToLocalCache(user, _settingsCache);

  // Debounce Firestore writes (wait 800ms after last change)
  clearTimeout(_settingsDebounce[page]);
  _settingsDebounce[page] = setTimeout(async () => {
    try {
      await db.collection('users').doc(user).collection('settings').doc('prefs').set(
        _settingsCache, { merge: true }
      );
    } catch(e) {
      console.warn('Could not save settings:', e);
    }
  }, 800);
}

// ─── Eager counter render ───
// Runs immediately when firebase.js is parsed — before any async work.
// If both caches are available, the counter appears instantly on every page load.
(function renderCounterFromCache() {
  const user = getCurrentUser();
  if (!user) return;
  const cached = _loadWatchedFromCache(user);
  const total  = _loadTotalFromCache();
  if (!cached || !total) return;
  watchedSet = cached;
  const el = document.getElementById('watchedCounter');
  if (!el) return;
  const count = cached.size;
  const pct   = Math.round((count / total) * 100);
  el.innerHTML = `
    <span class="watched-counter-text">${count} / ${total}</span>
    <div class="watched-counter-bar"><div class="watched-counter-bar-fill" style="width:${pct}%"></div></div>
  `;
  el.style.display = 'inline-flex';
})();
