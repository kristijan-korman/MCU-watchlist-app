# Marvel App — Project Spec

## Google Sheet
**Spreadsheet ID:** `1YE9_iqiI4E5TqPD-siPkteysBeptTncu2_MUxvXO7k4`
**URL:** https://docs.google.com/spreadsheets/d/1YE9_iqiI4E5TqPD-siPkteysBeptTncu2_MUxvXO7k4
**Visibility:** Must be set to "Anyone with the link can view"

---

## Sheets

### MCU (gid=0)
Main content sheet. Contains all movies, shows, short films etc.

| Column | Description |
|---|---|
| ID | Unique identifier e.g. `iron_man_1`, `aos_s01` |
| Title | Full title. For TV shows, title only — no season in the name |
| Universe | e.g. `MCU`, `Sony`, `Fox`, `Netflix` |
| Phase | e.g. `Phase 1`, `Phase 2` — MCU entries only |
| Type | `Movie`, `TV Show`, `Animated Series`, `Short film` |
| Season | Season number e.g. `Season 1` — TV shows and animated series only |
| Additional type | e.g. `One-Shot` |
| Release Date | e.g. `May 2, 2008` or just `2027` for year-only entries |

**Notes:**
- Empty rows between groups are ignored
- Year-only dates (e.g. `2027`) are supported — enter as plain text. These do NOT show a countdown.
- Fetched via CSV export to preserve raw text values
- For TV shows: Title has no season in it. Season column holds `Season 1` etc.
- All seasons of a TV show share the first season's poster image (e.g. `daredevil_s01_w300.jpg`)

### Collection Sheets
Each collection is its own sheet with up to 3 columns:

| Column | Description |
|---|---|
| A | Collection ID e.g. `collection_avengers` |
| B | Movie/show ID referencing the MCU sheet |
| C | Description (optional) — shown on card and modal when viewing that collection |

A movie can appear multiple times in a collection with different descriptions.

**Collections:**

| Collection Name | GID | Slug | Has Description |
|---|---|---|---|
| Avengers Collection | `617489229` | `avengers_collection` | No |
| X-Men Collection | `490125252` | `xmen_collection` | No |
| Tobey Maguire's Spider-Man | `557453725` | `tobey_spiderman` | No |
| Andrew Garfield's Spider-Man | `740598582` | `andrew_spiderman` | No |
| Tom Holland's Spider-Man | `1817764892` | `tom_spiderman` | No |
| S.H.I.E.L.D. Collection | `1376499614` | `shield_collection` | Yes |
| Daredevil Collection | `746275232` | `daredevil_collection` | No |
| Defenders Collection | `477090108` | `defenders_collection` | No |

---

## Poster Images

**Location:** `images/` folder in the project root

**Naming:** `{movie_id}_w300.jpg` (thumbnail) and `{movie_id}_w500.jpg` (large)

**TV shows:** All seasons share the first season's image file. No duplicate files per season.

**Fallback:** If a local image is missing, the app falls back to TMDB API search automatically.

**TMDB API Token:**
`eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkYzVkZGE2ZDkyZjczM2IwY2IxNzE4NjM0M2Q5ZWE1MSIsIm5iZiI6MTc3NzExNjk2MS45Miwic3ViIjoiNjllY2E3MjE0ZmI5ZGUyOWI5MjhkMzIyIiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.UWGtIFQ997au8SATcddf5NhUAB0p5a9XWhZmBcQfUs8`

---

## Firebase

**Project:** `mcu-app-project`
**Service:** Firestore (Standard, test mode)

**Config:**
```js
{
  apiKey: 'AIzaSyC8BewwCgkSgJ2oQyglDht11xQ18ywiPKA',
  authDomain: 'mcu-app-project.firebaseapp.com',
  projectId: 'mcu-app-project',
  storageBucket: 'mcu-app-project.firebasestorage.app',
  messagingSenderId: '307969707596',
  appId: '1:307969707596:web:53598ef8029ae83300aee9'
}
```

**Firestore structure:**
```
users/{username}/watched/{movieId}   ← per-user watched list
  watchedAt: timestamp

meta/recentRelease                   ← shared cache (all users)
  id: string                         ← movie ID of current recent release
  collections: array                 ← collections it belongs to
  updatedAt: timestamp
```

**SDK:** Firebase compat (v9.23.0) loaded via CDN — no ES modules needed.

---

## File Structure

```
Marvel App/
├── index.html          ← Main page (Recent Release + Upcoming + Collections preview)
├── database.html       ← Full database with search/filter/sort
├── phases.html         ← MCU entries grouped by Phase
├── collections.html    ← Collections list + in-page collection viewer
├── profile.html        ← User profile with watched stats and progress
├── universe.html       ← Filtered view by Universe or Type (URL param driven)
├── css/
│   └── style.css       ← All shared styles
├── js/
│   ├── config.js       ← Sheet ID, TMDB token, COLLECTIONS array with slugs
│   ├── users.js        ← Login credentials { username: 'password' }
│   ├── auth.js         ← Login modal, user menu, hamburger nav, logout modal
│   ├── data.js         ← All data fetching, poster logic, getCountdown(), getBadgeClass()
│   └── firebase.js     ← Firebase init, watched tracking, modal bottom bar, counter
└── images/             ← Local poster images
```

---

## How to Run Locally

```
python3 -m http.server 8080 --directory "/Users/korman/Documents/Claude/Projects/Marvel App"
```
Then open `http://localhost:8080`

**Does NOT work from `file://`** — must be served via localhost or hosted URL.

To access from phone on same Wi-Fi: `http://192.168.x.x:8080`

---

## Auth System

- Credentials stored in `js/users.js` as `const USERS = { kristijan: '1234', ana: '1234', ... }`
- Current users: `kristijan`, `ana`, `iva`, `dominik`, `zrinka`, `jurica`
- Login stored in `sessionStorage` as `mcu_user`
- `requireAuth()` — shows Sign In button or avatar, does NOT block content
- Logout shows a confirmation modal, then reloads the page
- `auth.js` exports: `getCurrentUser()`, `login()`, `logout()`, `showLogoutModal()`, `requireAuth()`, `updateHeaderAuth()`, `toggleMobileNav()`, `closeMobileNav()`

---

## Data Layer (js/data.js)

Key globals: `allMovies`, `canonicalImageId`, `movieCollectionMap`, `recentReleaseId`

Key functions:
- `initData()` — loads movies, builds canonicalImageId map, sets recentReleaseId, starts loadAllCollections() in background
- `loadCollection(gid)` — returns array of `{ id, desc, key }`
- `loadAllCollections()` — populates `movieCollectionMap` (movieId → array of {gid, name, slug})
- `loadCollectionsForMovie(movieId)` — fetches collections for a single movie in parallel (used by index.html recent release cache)
- `getPosterUrl(m, size)` — local image first, TMDB fallback
- `getCountdown(m)` — returns countdown string, null for year-only dates
- `getBadgeClass(universe)` — returns CSS class for universe badge
- `isTV(m)` — true for TV Show or Animated Series

---

## Firebase Layer (js/firebase.js)

Key globals: `watchedSet`, `watchedLoaded`

Key functions:
- `loadWatched()` — fetches user's watched list from Firestore into `watchedSet`
- `toggleWatched(movieId)` — adds/removes from Firestore, refreshes all UI
- `isWatched(movieId)` — checks in-memory set
- `isReleased(movieId)` — true if entry has a past release date (watched button only shown for released entries)
- `watchedCount()` — number of watched entries
- `refreshWatchedUI()` — syncs all watched buttons and header counter
- `updateWatchedCounter()` — updates the header counter with count + progress bar
- `watchedCardButtonHTML(movieId)` — round overlay button for card posters (grid view)
- `watchedCardSideButtonHTML(movieId)` — round button on right side of card (list/mobile view)
- `watchedButtonHTML(movieId)` — returns empty string (button rendered via renderModalWatchedFooter)
- `renderModalWatchedFooter(movieId)` — renders watched button into modal footer div
- `setModalBottomBar(movieId)` — shows/updates the fixed bottom bar on mobile
- `hideModalBottomBar()` — hides the mobile bottom bar
- `getCachedRecentRelease()` — reads recent release cache from Firestore
- `setCachedRecentRelease(id, collections)` — writes recent release cache to Firestore

---

## Pages

### index.html (Main)
- Recent Release section — auto-detected as the most recent past entry. Shows featured card with collection panel on right. Collection loaded via Firestore cache for speed.
- Upcoming Releases section — future entries sorted by date with countdown
- Collections preview — 5 random collections shown with shuffled poster previews

### database.html (Database)
- Full grid of all entries
- Filters: Universe, Phase, Type, Search, Sort (Oldest/Newest)
- Card/List view toggle

### phases.html (Phases)
- MCU entries only, grouped by Phase with phase titles
- Search bar + sort toggle (Newest default) + Card/List view toggle
- Clicking phase tag scrolls smoothly to that section

### collections.html (Collections)
- List of all collections with 4 random poster previews each
- Click to open collection in-page (URL updates to `#collection=slug`)
- ← Back to Collections button
- Card/List view toggle inside collection view

### profile.html (Profile)
- Accessible from user avatar dropdown → Profile
- Hero section: avatar + username + overall progress bar
- Stats: By Universe (clickable → universe.html), By Type (clickable → universe.html), MCU by Phase (clickable → phases.html#phase-X)
- Watched grid: all watched entries as poster thumbnails, clickable to open modal
- Redirects to index.html if not logged in

### universe.html (Universe / Type filter)
- Single page handling both universe and type filtering via URL params
- `universe.html?universe=MCU` — filter by universe
- `universe.html?type=Movie` — filter by type
- Search + sort + card/list toggle
- ← Back to Profile link

---

## Watched Tracking

- Watched button shown on every card and in every modal
- **Not shown** for upcoming entries (unreleased) or when logged out
- **Card (grid view):** round button overlaid on poster top-left
- **Card (list/mobile view):** round button on right side of card
- **Modal (desktop):** full-width green bar pinned to bottom of modal
- **Modal (mobile):** fixed bottom bar outside the modal sheet
- Header shows `count / total` with a thin progress bar, clicking opens profile
- All watched data stored per-user in Firestore

---

## Cross-page Consistency Rules

**IMPORTANT: Any change made to one page must be applied to ALL pages.**

### Script tags order (all pages):
```html
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
<script src="js/config.js"></script>
<script src="js/users.js"></script>
<script src="js/auth.js"></script>
<script src="js/data.js"></script>
<script src="js/firebase.js"></script>
```

### Auth init — always call both:
```js
requireAuth();
loadWatched().then(refreshWatchedUI);
init();
```

### Header pattern (all pages):
```html
<header>
  <div class="header-left">
    <button class="hamburger" id="hamburger" onclick="toggleMobileNav()">
      <span class="material-icons">menu</span>
    </button>
    <a class="brand" href="index.html">MCU App</a>
    <nav>...</nav>
  </div>
  <div class="header-right">
    <span class="watched-counter" id="watchedCounter" style="display:none;" onclick="window.location='profile.html'"></span>
    <div class="user-menu" id="userMenu">...</div>
  </div>
</header>
```

### Mobile nav pattern (all pages):
```html
<div class="mobile-nav-backdrop" id="mobileNavBackdrop" onclick="closeMobileNav()"></div>
<nav class="mobile-nav" id="mobileNav">
  <div class="mobile-nav-close"><button onclick="closeMobileNav()"><span class="material-icons">close</span></button></div>
  <a href="index.html">Main</a>
  ...
</nav>
```

### Modal pattern (all pages):
```html
<div class="modal-overlay" id="modalOverlay" onclick="closeModal(event)">
  <div class="modal">
    <button class="close-btn" onclick="closeModalBtn()"><span class="close-x">✕</span><span class="close-label"> Close</span></button>
    <h2 id="modalTitle"></h2>
    <div class="modal-meta" id="modalMeta"></div>
    <div class="modal-watched-footer" id="modalWatchedFooter"></div>
  </div>
</div>
<button class="modal-bottom-bar" id="modalBottomBar" style="display:none;" onclick="toggleWatched(this.dataset.watchedId)"></button>
```

### openModal pattern (all pages):
```js
async function openModal(id, desc = '') {
  // ... build modalMeta innerHTML ...
  renderModalWatchedFooter(id);
  document.getElementById('modalOverlay').classList.add('open');
  setModalBottomBar(id);
}

function closeModalBtn() {
  document.getElementById('modalOverlay').classList.remove('open');
  hideModalBottomBar();
}
```

### Collection buttons in modals:
```js
<button class="modal-collection-btn" onclick="window.location='collections.html#collection=${col.slug || col.gid}'">
  <span>${col.name}</span><span class="material-icons" style="font-size:18px;">arrow_forward</span>
</button>
```

### Card watched buttons:
```js
// Grid view — overlaid on poster
${watchedCardButtonHTML(m.ID)}   // inside .poster-wrap

// List/mobile view — right side of card
${watchedCardSideButtonHTML(m.ID)}  // direct child of .card
```

---

## Material Icons
Loaded via CDN on all pages:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
```

Used for: hamburger menu, close button, watched icons, collection arrows, back navigation.

---

## ID Naming Conventions

- Movies: `title_number` e.g. `iron_man_1`, `spider_man_3`
- TV seasons: `show_abbreviation_s01` e.g. `aos_s01`, `loki_s02`
- Collections: `collection_name` e.g. `collection_avengers`
- Use lowercase, underscores only, no special characters
