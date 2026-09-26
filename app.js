/* ═══════════════════════════════════════════════════
   NAYA NAZAM — App Logic & Navigation
   ═══════════════════════════════════════════════════ */

// ── Navigation History ──────────────────────────────
let history = [];
let currentScreen = 'screen-onboard1';

// Screens that should show bottom nav
const NAV_SCREENS = ['screen-home','screen-map','screen-report','screen-score','screen-profile'];

// Nav item mapping
const NAV_MAP = {
  'screen-home'   : 'nav-home',
  'screen-map'    : 'nav-map',
  'screen-report' : 'nav-report',
  'screen-score'  : 'nav-score',
  'screen-profile': 'nav-profile',
};

// ── Core Navigator ──────────────────────────────────
function goTo(screenId) {
  const prev = document.getElementById(currentScreen);
  const next = document.getElementById(screenId);
  if (!next || screenId === currentScreen) return;

  // Push history
  history.push(currentScreen);

  // Animate out
  prev.classList.remove('active');
  prev.style.animation = '';
  prev.style.display = 'none';

  // Animate in
  next.style.animation = 'slideIn .28s cubic-bezier(0.25,0.46,0.45,0.94) forwards';
  next.classList.add('active');
  next.style.display = 'flex';

  currentScreen = screenId;
  updateNav();
  updateBottomNav(screenId);
  refreshMapsForScreen(screenId);
}

function goBack() {
  if (history.length === 0) return;
  const prev = history.pop();

  const curr = document.getElementById(currentScreen);
  const next = document.getElementById(prev);
  if (!next) return;

  curr.style.animation = 'slideOut .25s ease forwards';
  setTimeout(() => {
    curr.classList.remove('active');
    curr.style.animation = '';
    curr.style.display = 'none';
  }, 250);

  next.style.animation = 'slideInReverse .28s ease forwards';
  next.classList.add('active');
  next.style.display = 'flex';

  currentScreen = prev;
  updateNav();
  updateBottomNav(prev);
  refreshMapsForScreen(prev);
}

function navTo(screenId, navId) {
  // Reset history when using bottom nav
  history = [];
  goTo(screenId);
}

function updateNav() {
  const bottomNav = document.getElementById('bottomNav');
  if (!bottomNav) return;
  bottomNav.style.display = NAV_SCREENS.includes(currentScreen) ? 'flex' : 'none';
}

function updateBottomNav(screenId) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const activeNav = NAV_MAP[screenId];
  if (activeNav) {
    const el = document.getElementById(activeNav);
    if (el) el.classList.add('active');
  }
}

// ── Kasur Map ───────────────────────────────────────
const MAP_CENTER = [31.1157, 74.4467];
const MAP_HOTSPOTS = [
  { id: 'KS-104', location: 'Kot Ghulam Muhammad', position: [31.1157, 74.4467], risk: 'red' },
  { id: 'KS-112', location: 'Ferozepur Road', position: [31.128, 74.463], risk: 'orange' },
  { id: 'KS-098', location: 'Near Bus Stand', position: [31.108, 74.441], risk: 'orange' },
  { id: 'KS-076', location: 'Model Town', position: [31.126, 74.426], risk: 'green' },
  { id: 'KS-083', location: 'Railway Colony', position: [31.102, 74.432], risk: 'green' },
  { id: 'KS-091', location: 'Kasur', position: [31.119, 74.462], risk: 'green' },
];
const mapInstances = {};

function initializeMap(mapId, zoom) {
  const container = document.getElementById(mapId);
  if (!container || mapInstances[mapId]) return;

  if (typeof L === 'undefined') {
    container.classList.add('map-load-error');
    container.setAttribute('role', 'alert');
    container.textContent = 'The map could not be loaded. Check your connection and refresh.';
    return;
  }

  const map = L.map(container, { zoomControl: true, scrollWheelZoom: false }).setView(MAP_CENTER, zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  }).addTo(map);

  MAP_HOTSPOTS.forEach(hotspot => {
    const isEasternMarker = hotspot.position[1] > MAP_CENTER[1];
    const icon = L.divIcon({
      className: [
        'prototype-marker-icon',
        mapId === 'homeMap' ? 'preview-marker-icon' : '',
        isEasternMarker ? 'marker-label-left' : '',
      ].filter(Boolean).join(' '),
      html: `<div class="prototype-marker" aria-label="Prototype Hotspot ${hotspot.id}"><span class="prototype-marker-dot ${hotspot.risk}"></span><span class="prototype-marker-label"><strong>${hotspot.id}</strong><small>Prototype Hotspot</small></span></div>`,
      iconSize: mapId === 'homeMap' ? [120, 40] : [150, 40],
      iconAnchor: [isEasternMarker ? (mapId === 'homeMap' ? 112 : 142) : 8, 15],
    });
    const marker = L.marker(hotspot.position, {
      icon,
      title: `Prototype Hotspot ${hotspot.id}`,
    }).addTo(map);

    if (hotspot.id === 'KS-104') {
      marker.on('click', () => goTo('screen-hotspot'));
    } else {
      marker.bindPopup(
        `<strong>Prototype Hotspot · ${hotspot.id}</strong><br>${hotspot.location}<br><small>Illustrative only; not officially verified.</small>`,
      );
    }
  });

  mapInstances[mapId] = map;
}

function refreshMapsForScreen(screenId) {
  const mapIds = screenId === 'screen-home'
    ? [['homeMap', 13]]
    : screenId === 'screen-map'
      ? [['kasurMap', 13]]
      : [];

  mapIds.forEach(([mapId, zoom]) => {
    initializeMap(mapId, zoom);
    window.requestAnimationFrame(() => {
      if (mapInstances[mapId]) mapInstances[mapId].invalidateSize({ pan: false });
    });
  });
}

// ── Form Interactions ───────────────────────────────
function selectProb(id) {
  document.querySelectorAll('.prob-option').forEach(el => el.classList.remove('selected'));
  document.getElementById(id).classList.add('selected');
}

function selectSev(id) {
  document.querySelectorAll('.sev-opt').forEach(el => el.classList.remove('selected'));
  document.getElementById(id).classList.add('selected');
}

function selectAmt(id) {
  document.querySelectorAll('.amount-opt').forEach(el => el.classList.remove('selected'));
  document.getElementById(id).classList.add('selected');
}

function selectPay(id) {
  document.querySelectorAll('.pay-opt').forEach(el => el.classList.remove('selected'));
  document.getElementById(id).classList.add('selected');
}

function selectPR(type) {
  document.querySelectorAll('.pr-opt').forEach(el => {
    el.style.transform = '';
    el.style.boxShadow = '';
  });
  const opts = { clear: 0, partial: 1, severe: 2 };
  const el = document.querySelectorAll('.pr-opt')[opts[type]];
  if (el) {
    el.style.transform = 'translateX(8px)';
    el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
  }
  setTimeout(() => goTo('screen-postrain-success'), 400);
}

// ── Photo Upload Feedback ───────────────────────────
function showPhotoFeedback() {
  const boxes = document.querySelectorAll('.photo-upload-inner');
  boxes.forEach(box => {
    const orig = box.innerHTML;
    box.innerHTML = `<div class="pu-icon">✅</div><div class="pu-text" style="color:var(--green)">Photo Added!</div>`;
    setTimeout(() => { box.innerHTML = orig; }, 2000);
  });
}

// ── Worker Flow ─────────────────────────────────────
function startJob() {
  const jobCard = document.getElementById('jobCard');
  const uploadFlow = document.getElementById('uploadFlow');
  const btn = jobCard.querySelector('.btn-primary');

  jobCard.querySelector('.job-status-pill').textContent = '🔵 In Progress';
  jobCard.querySelector('.job-status-pill').className = 'job-status-pill assigned';
  btn.textContent = 'Job Started ✓';
  btn.style.background = 'var(--teal)';
  btn.disabled = true;

  uploadFlow.style.display = 'block';
}

let workerStep = 'before';
function advanceWorker(step) {
  if (step === 'before') {
    const before = document.getElementById('uploadBefore');
    const after = document.getElementById('uploadAfter');
    before.querySelector('.photo-upload-inner').innerHTML = `<div class="pu-icon">✅</div><div class="pu-text" style="color:var(--green)">Before photo uploaded</div>`;
    after.classList.remove('hidden');
  } else if (step === 'after') {
    const after = document.getElementById('uploadAfter');
    const done = document.getElementById('markDone');
    after.querySelector('.photo-upload-inner').innerHTML = `<div class="pu-icon">✅</div><div class="pu-text" style="color:var(--green)">After photo uploaded</div>`;
    done.classList.remove('hidden');
  }
}

// ── Live Clock ───────────────────────────────────────
function updateClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const now = new Date();
  let h = now.getHours(), m = now.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  el.textContent = `${h}:${String(m).padStart(2,'0')}`;
}
setInterval(updateClock, 30000);
updateClock();

// ── CSS Animations ───────────────────────────────────
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0);    opacity: 1; }
    to   { transform: translateX(100%); opacity: 0; }
  }
  @keyframes slideInReverse {
    from { transform: translateX(-30%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
`;
document.head.appendChild(styleEl);

// ── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateNav();
  updateBottomNav('screen-onboard1');

  // Animate leaderboard bars when score screen opens
  const origGoTo = window.goTo;

  // Stagger leaderboard bars
  const observer = new MutationObserver(() => {
    if (currentScreen === 'screen-score') {
      document.querySelectorAll('.lb-bar, .bd-bar, .ys-bar-fill').forEach((bar, i) => {
        const w = bar.style.width;
        bar.style.width = '0';
        setTimeout(() => { bar.style.transition = 'width .6s ease'; bar.style.width = w; }, i * 80);
      });
    }
  });

  const scoreScreen = document.getElementById('screen-score');
  if (scoreScreen) {
    observer.observe(scoreScreen, { attributes: true, attributeFilter: ['class'] });
  }
});
