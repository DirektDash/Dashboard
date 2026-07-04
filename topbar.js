// =============================================================
// Persistent dashboard top bar + bottom tab bar.
// Drop this on any page with:
//     <script src="topbar.js" defer></script>
// It self-injects HTML + CSS, reads progress from localStorage,
// and renders the water +1 button in the top bar plus the
// Main/Health/Fitness/Work bottom tabs. Skips chrome on finance.html
// and inside iframes (so the water tracker can embed cleanly).
// =============================================================
(function () {
  'use strict';

  // -------- Supabase config (replace with your own project URL + publishable key) --------
  const TOPBAR_SUPABASE_URL = 'https://midyjdjkqorcxhdnjanh.supabase.co';
  const TOPBAR_SUPABASE_KEY = 'sb_publishable_wsfPg84TDDlqqQk-WO887Q_j0Sa5x4p';

  // -------- Inline SVG icons (Lucide glyphs, currentColor stroke) --------
  const SVG_ATTR = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const icon = {
    home: `<svg width="22" height="22" viewBox="0 0 24 24" ${SVG_ATTR}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>`,
    heartPulse: `<svg width="22" height="22" viewBox="0 0 24 24" ${SVG_ATTR}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>`,
    dumbbell: `<svg width="22" height="22" viewBox="0 0 24 24" ${SVG_ATTR}><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>`,
    briefcase: `<svg width="22" height="22" viewBox="0 0 24 24" ${SVG_ATTR}><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>`,
    wallet: `<svg width="21" height="21" viewBox="0 0 24 24" ${SVG_ATTR}><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>`
  };

  // -------- CSS --------
  const css = `
.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; justify-content: space-between; align-items: center;
  gap: 8px;
  padding: max(10px, env(safe-area-inset-top)) 14px 8px;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.topbar-home {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 14px 8px 11px; border-radius: 999px;
  background: var(--glass-bg, rgba(255,255,255,0.03));
  border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
  color: var(--text-secondary, rgba(244,246,248,0.62));
  text-decoration: none; font-size: 13px; font-weight: 600; letter-spacing: 0.01em;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.2s, border-color 0.2s, transform 0.2s cubic-bezier(0.34,1.2,0.64,1);
}
.topbar-home svg { width: 18px; height: 18px; }
.topbar-home:hover { color: var(--text-primary, #F4F6F8); border-color: var(--border-strong, rgba(255,255,255,0.16)); transform: translateY(-1px); }
.topbar-water-wrap { display: flex; align-items: stretch; }
.topbar-water-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 14px;
  background: var(--accent-soft, rgba(99, 102, 241, 0.10));
  border-radius: 12px 0 0 12px;
  text-decoration: none; color: var(--text-primary, #1A1A1E);
  -webkit-tap-highlight-color: transparent;
}
.topbar-water-pill .topbar-pill-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--accent, #6366F1); flex-shrink: 0;
}
.topbar-water-pill.warn .topbar-pill-dot { background: var(--warn, #F59E0B); }
.topbar-water-pill.miss .topbar-pill-dot {
  background: var(--bad, #EF4444);
  animation: topbar-miss-pulse 1.6s ease-in-out infinite;
}
@keyframes topbar-miss-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  50%      { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
}
.topbar-pill-count {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px; font-weight: 700; color: var(--text-primary, #1A1A1E);
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.topbar-water-add {
  width: 44px;
  border: none;
  background: var(--accent, #6366F1);
  color: #FFFFFF; font-family: inherit;
  font-size: 20px; font-weight: 700; line-height: 1;
  cursor: pointer; border-radius: 0 12px 12px 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, transform 0.10s;
}
.topbar-water-add:active { transform: scale(0.94); }
.topbar-water-add.flash { background: var(--accent-strong, #4F46E5); }
.topbar-right { display: flex; align-items: stretch; gap: 8px; }
.topbar-finance-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px;
  background: var(--glass-bg, rgba(255,255,255,0.028));
  border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
  color: var(--text-tertiary, rgba(244,246,248,0.40));
  border-radius: 12px; text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s, border-color 0.15s;
}
.topbar-finance-btn:hover { color: var(--text-primary, #F4F6F8); border-color: var(--border-strong, rgba(255,255,255,0.16)); }
.topbar-finance-icon { display: inline-flex; align-items: center; justify-content: center; }
/* ── Floating glass dock (self-contained dark palette so it renders
      identically on every page, incl. index.html's --c-* island) ── */
.bottombar {
  position: fixed; z-index: 60;
  bottom: calc(12px + env(safe-area-inset-bottom));
  left: 50%; transform: translateX(-50%);
  display: flex; align-items: stretch; gap: 4px;
  width: min(400px, calc(100% - 28px));
  padding: 7px;
  background: rgba(13, 17, 23, 0.78);
  -webkit-backdrop-filter: blur(20px) saturate(1.35);
  backdrop-filter: blur(20px) saturate(1.35);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 26px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.bottombar-tab {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; padding: 8px 0 6px; border-radius: 19px; text-decoration: none;
  color: rgba(244, 246, 248, 0.45);
  font-size: 10px; font-weight: 600; letter-spacing: 0.02em;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.2s, background 0.2s;
}
.bottombar-tab-icon {
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px;
  transition: transform 0.18s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.bottombar-tab-icon svg { width: 21px; height: 21px; display: block; }
.bottombar-tab.active { color: #46E0A8; background: rgba(70, 224, 168, 0.10); }
.bottombar-tab.active .bottombar-tab-icon { transform: translateY(-1px); }
.bottombar-tab:not(.active):hover { color: rgba(244, 246, 248, 0.75); }
.bottombar-tab:active .bottombar-tab-icon { transform: scale(0.9); }
body.has-bottombar {
  padding-bottom: calc(96px + env(safe-area-inset-bottom)) !important;
}
@media (max-width: 480px) {
  .topbar { padding-left: 10px; padding-right: 10px; gap: 6px; }
  .topbar-water-pill { padding: 8px 11px; gap: 6px; }
  .topbar-pill-count { font-size: 12px; }
  .topbar-water-add { width: 40px; font-size: 18px; }
  .topbar-finance-btn { width: 40px; height: 38px; }
  .bottombar-tab { font-size: 9.5px; }
}
html, body { -webkit-text-size-adjust: 100%; }
@media (max-width: 768px) {
  html { touch-action: pan-y; }
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
  html, body { scrollbar-width: none; -ms-overflow-style: none; }
}
.modal-bg, .modal, .po-modal-bg, .po-modal, .wt-overlay, .wt-viewer {
  overscroll-behavior: contain;
}
@media (max-width: 480px) {
  .modal-bg, .po-modal-bg {
    padding: 0 !important;
    align-items: stretch !important;
    justify-content: stretch !important;
  }
  .modal, .po-modal {
    width: 100% !important; max-width: 100% !important;
    max-height: 100vh !important; height: 100vh !important;
    border-radius: 0 !important;
    padding-top: max(20px, env(safe-area-inset-top)) !important;
    padding-bottom: max(28px, env(safe-area-inset-bottom)) !important;
    overflow-y: auto !important; overscroll-behavior: contain;
  }
}
`;

  const topbarHtml = `
<header class="topbar" id="topbar" role="navigation" aria-label="Navigation">
  <a href="index.html" class="topbar-home" id="topbarHome" aria-label="Home">${icon.home}<span>Home</span></a>
  <div class="topbar-right">
    <a href="finance.html" class="topbar-finance-btn" aria-label="Finance"><span class="topbar-finance-icon">${icon.wallet}</span></a>
    <div class="topbar-water-wrap">
      <a href="health.html#water" class="topbar-water-pill" id="topbarWater" aria-label="Water progress">
        <span class="topbar-pill-dot"></span>
        <span class="topbar-pill-count" id="topbarWaterCount">0/0</span>
      </a>
      <button class="topbar-water-add" id="topbarWaterAdd" aria-label="Log one drink" type="button">+</button>
    </div>
  </div>
</header>`;

  const bottombarHtml = `
<nav class="bottombar" id="bottombar" role="navigation" aria-label="Main tabs">
  <a href="index.html" class="bottombar-tab" data-page="main">
    <span class="bottombar-tab-icon">${icon.home}</span><span>Main</span>
  </a>
  <a href="health.html" class="bottombar-tab" data-page="health">
    <span class="bottombar-tab-icon">${icon.heartPulse}</span><span>Health</span>
  </a>
  <a href="gym.html" class="bottombar-tab" data-page="fitness">
    <span class="bottombar-tab-icon">${icon.dumbbell}</span><span>Fitness</span>
  </a>
  <a href="work.html" class="bottombar-tab" data-page="work">
    <span class="bottombar-tab-icon">${icon.briefcase}</span><span>Work</span>
  </a>
</nav>`;

  function isFinancePage() {
    const p = (window.location.pathname || '').toLowerCase();
    return p.endsWith('/finance.html') || p.endsWith('finance.html');
  }
  function isEmbedded() {
    try { return window.self !== window.top; } catch (e) { return true; }
  }
  function shouldShowChrome() { return !isFinancePage() && !isEmbedded(); }
  function isHomePage() {
    const p = (window.location.pathname || '').toLowerCase();
    return p === '' || p === '/' || p.endsWith('/index.html') || p === 'index.html';
  }
  function currentPageKey() {
    const p = (window.location.pathname || '').toLowerCase();
    if (p.endsWith('health.html')) return 'health';
    if (p.endsWith('gym.html')) return 'fitness';
    if (p.endsWith('work.html')) return 'work';
    return 'main';
  }

  function injectStyleAndHTML() {
    if (!shouldShowChrome()) return;
    if (!document.getElementById('topbar-style')) {
      const style = document.createElement('style');
      style.id = 'topbar-style';
      style.textContent = css;
      document.head.appendChild(style);
    }
    // Home page keeps its own cinematic topline — dock only.
    if (!isHomePage() && !document.getElementById('topbar')) {
      const topWrap = document.createElement('div');
      topWrap.innerHTML = topbarHtml.trim();
      document.body.insertBefore(topWrap.firstChild, document.body.firstChild);
    }
    if (!document.getElementById('bottombar')) {
      const botWrap = document.createElement('div');
      botWrap.innerHTML = bottombarHtml.trim();
      const bar = botWrap.firstChild;
      const active = bar.querySelector('[data-page="' + currentPageKey() + '"]');
      if (active) active.classList.add('active');
      document.body.appendChild(bar);
      document.body.classList.add('has-bottombar');
    }
  }

  function calendarDateKey() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function getWaterProgress() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state) return { done: 0, total: 0 };
    const todayKey = calendarDateKey();
    const done = (state.logs || {})[todayKey] || 0;
    const p = state.profile || { weightKg: 75 };
    const wKg = state.weightUnit === 'lb' ? (p.weightKg || 0) / 2.20462 : (p.weightKg || 0);
    const base = wKg * 35;
    const exercise = (p.activityHrsPerWeek || 0) / 7 * 500;
    const caffeine = Math.max(0, (state.caffeineMgPerDay || 0) - 200) * 1.5;
    const subs = (state.substances || []).reduce((s, x) => {
      const dose = (x && x.dose != null ? x.dose : (x && x.defaultDose)) || 0;
      return s + Math.max(0, dose * ((x && x.mlPerUnit) || 0));
    }, 0);
    let adjust = 0;
    if (p.sex === 'm') adjust += 200;
    if ((p.age || 0) >= 50) adjust += 100;
    const totalMl = base + exercise + caffeine + subs + adjust;
    let unitVol;
    if (state.unit === 'glass') unitVol = state.glassMl || 250;
    else if (state.unit === 'oz') unitVol = 30;
    else if (state.unit === 'ml') unitVol = 1;
    else unitVol = state.bottleMl || 500;
    const total = Math.max(1, Math.ceil(totalMl / unitVol));
    return { done, total };
  }
  function classifyStatus(done, total) {
    if (total === 0) return 'idle';
    if (done >= total) return 'good';
    if (done >= total * 0.5) return 'warn';
    const h = new Date().getHours();
    if (h >= 18 && done < total * 0.5) return 'miss';
    return 'warn';
  }
  function setPillStatus(pillEl, status) {
    pillEl.classList.remove('good', 'warn', 'miss');
    if (status === 'warn' || status === 'miss') pillEl.classList.add(status);
  }
  function render() {
    const waterEl = document.getElementById('topbarWater');
    if (!waterEl) return;
    const w = getWaterProgress();
    const countEl = document.getElementById('topbarWaterCount');
    if (countEl) countEl.textContent = w.total ? w.done + '/' + w.total : '0/0';
    setPillStatus(waterEl, classifyStatus(w.done, w.total));
  }

  function defaultWaterState() {
    return {
      unit: 'bottle', bottleMl: 500, glassMl: 250, weightUnit: 'kg',
      profile: { weightKg: 75, age: 25, sex: 'm', activityHrsPerWeek: 5 },
      caffeineMgPerDay: 200, substances: [], logs: {}
    };
  }
  async function pushWaterMergedToSupabase(localWater) {
    if (window.location.pathname.endsWith('/health.html') ||
        window.location.pathname.endsWith('health.html')) return;
    if (!window.supabase || !TOPBAR_SUPABASE_URL || !TOPBAR_SUPABASE_KEY) return;
    if (TOPBAR_SUPABASE_URL.indexOf('PASTE-') === 0) return;
    try {
      const supa = window.supabase.createClient(TOPBAR_SUPABASE_URL, TOPBAR_SUPABASE_KEY);
      const { data } = await supa
        .from('app_state').select('data').eq('key', 'health').maybeSingle();
      const current = (data && data.data) || {};
      const merged = Object.assign({}, current, { po_water_v1: localWater });
      await supa.from('app_state').upsert(
        { key: 'health', data: merged, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    } catch (e) {}
  }
  function addWater() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state || typeof state !== 'object') state = defaultWaterState();
    state.logs = state.logs || {};
    const k = calendarDateKey();
    state.logs[k] = (state.logs[k] || 0) + 1;
    try { localStorage.setItem('po_water_v1', JSON.stringify(state)); } catch (e) {}
    render();
    const btn = document.getElementById('topbarWaterAdd');
    if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 220); }
    pushWaterMergedToSupabase(state);
  }

  function lockGestures() {
    function blockGesture(e) { e.preventDefault(); }
    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });
  }

  // Expose helpers so pages can reuse the hydration math + water logging
  // without re-implementing it (health wellness ring, homepage quick action).
  window.dashWaterProgress = getWaterProgress;
  window.dashAddWater = addWater;

  function boot() {
    injectStyleAndHTML();
    const btn = document.getElementById('topbarWaterAdd');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); addWater(); });
    render();
    lockGestures();
    window.addEventListener('storage', render);
    window.addEventListener('focus', render);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
    setInterval(render, 30 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
