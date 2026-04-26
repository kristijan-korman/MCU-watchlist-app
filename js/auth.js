// Auth — simple login using users.js credentials
// Stores logged-in username in sessionStorage

function getCurrentUser() {
  return sessionStorage.getItem('mcu_user');
}

function login(username, password) {
  const user = username.toLowerCase().trim();
  if (USERS[user] && USERS[user] === password) {
    sessionStorage.setItem('mcu_user', user);
    return true;
  }
  return false;
}

function showLogoutModal() {
  const existing = document.getElementById('logoutModal');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'logoutModal';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
  el.innerHTML = `
    <div style="background:#1e1e1e;border:1px solid #444;border-radius:8px;padding:32px;max-width:320px;width:90%;text-align:center;">
      <div style="font-size:1rem;color:#fff;margin-bottom:8px;font-weight:bold;">Log out</div>
      <div style="font-size:0.85rem;color:#aaa;margin-bottom:24px;">Are you sure you want to log out?</div>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button id="logoutConfirmNo" style="background:none;border:1px solid #444;color:#eee;padding:8px 24px;border-radius:4px;cursor:pointer;font-size:0.9rem;">No</button>
        <button id="logoutConfirmYes" style="background:#e50914;border:none;color:#fff;padding:8px 24px;border-radius:4px;cursor:pointer;font-size:0.9rem;font-weight:bold;">Yes</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  document.getElementById('logoutConfirmNo').addEventListener('click', () => el.remove());
  document.getElementById('logoutConfirmYes').addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = 'index.html?loggedout=1';
  });
}

function logout() {
  showLogoutModal();
}

function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) dropdown.classList.toggle('open');
}

// Close dropdown when clicking outside
document.addEventListener('mousedown', e => {
  const menu = document.getElementById('userMenu');
  if (menu && !menu.contains(e.target)) {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('open');
  }
});

function setUsernameDisplay() {
  const el = document.getElementById('headerUsername');
  const user = getCurrentUser();
  if (el && user) el.textContent = user.slice(0, 2);
}

// Updates header to show avatar (logged in) or Sign in button (logged out)
function updateHeaderAuth() {
  const menu = document.getElementById('userMenu');
  const user = getCurrentUser();
  if (!menu) return;

  if (user) {
    menu.innerHTML = `
      <span class="header-username" id="headerUsername" onclick="toggleUserMenu()">${user.slice(0, 2)}</span>
      <div class="user-dropdown" id="userDropdown">
        <button onclick="event.stopPropagation();window.location='profile.html'">Profile</button>
        <button onclick="event.stopPropagation();showLogoutModal()">Log out</button>
      </div>
    `;
  } else {
    menu.innerHTML = `
      <button class="signin-btn" onclick="showLoginModal()">Sign in</button>
    `;
  }
}

function requireAuth() {
  updateHeaderAuth();
}

function showLoginModal() {
  document.getElementById('loginOverlay').classList.add('open');
}

function hideLoginModal() {
  document.getElementById('loginOverlay').classList.remove('open');
}

function handleLogin() {
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const error    = document.getElementById('loginError');

  if (login(username, password)) {
    hideLoginModal();
    error.style.display = 'none';
    updateHeaderAuth();
    if (typeof onLoginSuccess === 'function') onLoginSuccess();
  } else {
    error.style.display = 'block';
  }
}

// ─── Mobile nav ───
function toggleMobileNav() {
  const nav = document.getElementById('mobileNav');
  const backdrop = document.getElementById('mobileNavBackdrop');
  const hamburger = document.getElementById('hamburger');
  const isOpen = nav.classList.contains('open');
  if (isOpen) {
    nav.classList.remove('open');
    backdrop.classList.remove('open');
    hamburger.classList.remove('open');
  } else {
    nav.classList.add('open');
    backdrop.classList.add('open');
    hamburger.classList.add('open');
  }
}

function closeMobileNav() {
  document.getElementById('mobileNav')?.classList.remove('open');
  document.getElementById('mobileNavBackdrop')?.classList.remove('open');
  document.getElementById('hamburger')?.classList.remove('open');
}

// Allow pressing Enter to submit
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginPassword')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('loginUsername')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
});
