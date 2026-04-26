// modal.js — shared modal for all pages
// Injects modal HTML into the page and provides openModal / closeModalBtn

// ─── Inject HTML ───

(function injectModal() {
  const html = `
    <!-- Movie modal -->
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal">
        <button class="close-btn" id="modalCloseBtn"><span class="close-x">✕</span><span class="close-label"> Close</span></button>
        <h2 id="modalTitle"></h2>
        <div class="modal-meta" id="modalMeta"></div>
        <div class="modal-watched-footer" id="modalWatchedFooter"></div>
      </div>
    </div>
    <button class="modal-bottom-bar" id="modalBottomBar" style="display:none;" onclick="toggleWatched(this.dataset.watchedId)"></button>
  `;
  document.body.insertAdjacentHTML('afterbegin', html);
})();

// ─── Collection button HTML ───
// Pages can override this by setting window.modalCollectionAction
// Default: navigate to collections.html
// collections.html sets it to: openCollection(gid, name); closeModalBtn();

function _collectionBtnHTML(col) {
  const action = (typeof modalCollectionAction === 'function')
    ? `modalCollectionAction('${col.gid}', '${col.name.replace(/'/g, "\\'")}')`
    : `window.location='collections.html#collection=${col.slug || col.gid}'`;
  return `<button class="modal-collection-btn" onclick="${action}">${col.name}</button>`;
}

// ─── Phase link ───
// On phases.html, clicking a phase link scrolls to that section instead of navigating
function _phaseHTML(m) {
  if (!m.Phase) return '';
  const anchor = m.Phase.toLowerCase().replace(/\s+/g, '-');
  const action = (typeof modalPhaseAction === 'function')
    ? `onclick="modalPhaseAction('${anchor}');return false;" href="#"`
    : `href="phases.html#${anchor}"`;
  return `<div><strong>Phase:</strong> <a ${action} style="color:#60a5fa;text-decoration:none;">${m.Phase}</a></div>`;
}

// ─── Open ───

async function openModal(id, desc = '') {
  const m = allMovies.find(x => x.ID === id);
  if (!m) return;

  const posterUrl = await getPosterUrl(m, 'w500');
  const countdown = getCountdown(m);
  const cols = movieCollectionMap[m.ID] || [];

  document.getElementById('modalMeta').innerHTML = `
    ${posterUrl ? `<img src="${posterUrl}" alt="${m.Title}">` : ''}
    <div class="modal-title-row"><span class="modal-title-inline">${m.Title}</span></div>
    ${m.Universe ? `<div><strong>Universe:</strong> ${m.Universe}</div>` : ''}
    ${_phaseHTML(m)}
    ${m.Type ? `<div><strong>Type:</strong> ${getTypeLabel(m)}</div>` : ''}
    ${m.Season ? `<div><strong>Season:</strong> ${m.Season}</div>` : ''}
    ${m['Release Date'] ? `<div><strong>Release Date:</strong> ${m['Release Date']}</div>` : ''}
    ${countdown ? `<div style="color:#e50914;font-weight:bold;">${countdown}</div>` : ''}
    ${desc ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #333;color:#ccc;line-height:1.5;">${desc}</div>` : ''}
    ${cols.length > 0 ? `
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid #333;">
        <div style="margin-bottom:8px;"><strong>Collections:</strong></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">${cols.map(col => _collectionBtnHTML(col)).join('')}</div>
      </div>` : ''}
  `;

  renderModalWatchedFooter(id);
  document.getElementById('modalOverlay').classList.add('open');
  setModalBottomBar(id);
}

// ─── Close ───

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModalBtn();
}

function closeModalBtn() {
  document.getElementById('modalOverlay').classList.remove('open');
  hideModalBottomBar();
}

// ─── Event listeners ───

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modalOverlay').addEventListener('click', closeModal);
  document.getElementById('modalCloseBtn').addEventListener('click', closeModalBtn);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModalBtn();
});
