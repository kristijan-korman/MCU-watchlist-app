# Marvel App — Changelog

## Session 2 (April 2026)

### Firebase & Watched Tracking
- Integrated Firebase Firestore for per-user watched tracking
- Added `js/firebase.js` — handles all Firebase logic, watched state, and UI helpers
- Watched button appears on every card and modal for logged-in users
- Upcoming/unreleased entries do not show a watched button
- Watched state persists across sessions via Firestore
- Added 6 new users: `ana`, `iva`, `dominik`, `zrinka`, `jurica`, `kristijan` (all password `1234`)

### Watched UI
- **Grid view:** round green button overlaid on poster top-left
- **List/mobile view:** round green button on the right side of the card
- **Modal (desktop):** full-width green bar pinned to the bottom of the modal
- **Modal (mobile):** fixed green bar at the bottom of the screen
- Button hidden when logged out — removed instantly on logout
- Button hidden for unreleased entries

### Header Progress Counter
- Shows `count / total` with a thin green progress bar
- Clicking the counter opens the profile page
- Hidden when logged out
- Visible on both desktop and mobile

### Profile Page (`profile.html`)
- New page accessible from avatar dropdown → Profile
- Hero section combining avatar, username, overall progress bar and percentage
- **By Universe** — stat cards with progress bars, clickable to open universe filter page
- **By Type** — stat cards (Movie, TV Show, etc.), clickable to open type filter page
- **MCU by Phase** — stat cards per phase, clickable to scroll to that phase
- **Watched grid** — all watched entries as poster thumbnails, clickable to open modal
- Redirects to index.html if not logged in

### Universe / Type Page (`universe.html`)
- Single page handling both universe and type filtering via URL params
- `universe.html?universe=MCU` or `universe.html?type=Movie`
- Search, sort, card/list view toggle
- ← Back to Profile link

### Modal Redesign
- Modal title and watched button in same row on desktop
- Desktop: watched button is a full-width bar pinned to bottom of modal (inside)
- Mobile: modal slides up from bottom, leaving space at top
- Close button fixed to top-right of screen on mobile
- Watched footer (`modal-watched-footer`) is a flex sibling outside the scrollable area
- Mobile bottom bar (`modal-bottom-bar`) is a fixed element outside the modal
- Collection buttons redesigned: ghost style (transparent background, red border, white text, arrow icon)
- "Collections:" label added above collection buttons
- Modal open animation: slides up from below with fade

### UI Polish
- Universe/type/season badges redesigned: subtle tinted background with colored text and soft border
- Back navigation links use Material Icons `arrow_back`
- Collection buttons use `arrow_forward` icon on the right
- Mobile hamburger replaced with Material Icons `menu` / `close` icons in sidebar
- Mobile nav has close button inside the sidebar panel
- Footer centered on mobile
- Phase titles on phases.html
- Watched button hover animations removed

### Recent Release Cache (Firestore)
- `meta/recentRelease` document caches the current recent release ID and its collections
- On page load, Firestore is checked first — instant render if cache hits
- On cache miss or stale ID, collections are fetched fresh and cache is updated
- Handles the case where a movie belongs to no collection (empty array cached as valid)

### Bug Fixes
- Fixed horizontal overflow on phases.html mobile (caused by `min-width: 200px` on search input — changed to `min-width: 0`)
- Fixed `overflow-x: hidden` added to body globally
- Fixed modal watched button not appearing (moved from inline `modal-meta` to dedicated `modal-watched-footer` div)
- Fixed `loadAllCollectionsForMovie` parallel fetching for recent release panel

---

## Session 1 (Original Build)

### Core App
- Google Sheets as data source (CSV export for raw text values)
- TMDB API fallback for missing poster images
- Local poster images (`images/` folder) with `w300` and `w500` variants

### Pages
- `index.html` — Main page with recent release, upcoming entries, collections preview
- `database.html` — Full searchable/filterable database
- `phases.html` — MCU entries grouped by phase
- `collections.html` — Collections list and in-page viewer

### Auth System
- Simple credential-based login via `js/users.js`
- Session stored in `sessionStorage`
- Avatar + dropdown in header, Sign In button when logged out
- Mobile hamburger navigation

### Data Layer
- `js/data.js` — shared data fetching, poster logic, countdown, badge classes
- `js/config.js` — sheet ID, TMDB token, collections config
- `js/auth.js` — login/logout, header auth, mobile nav
