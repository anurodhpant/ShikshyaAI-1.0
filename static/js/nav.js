// static/js/nav.js — Browser-style Back / Forward with dashboard-flash prevention
(function () {
  const DASHBOARDS = ['/student', '/teacher', '/school-admin', '/super-admin'];
  const AUTH_PAGE = '/auth';
  const MATERIAL_PAGE = '/course-material';
  const FWD_KEY = 'shikshya_forward_stack';

  function readStack() {
    try { const r = sessionStorage.getItem(FWD_KEY); const a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; }
    catch (_) { return []; }
  }
  function writeStack(arr) { try { sessionStorage.setItem(FWD_KEY, JSON.stringify(arr.slice(0,30))); } catch (_) {} }
  function pushForward(url) { const s = readStack(); if (s[0] === url) return; s.unshift(url); writeStack(s); }
  function popForward() { const s = readStack(); const u = s.shift() || null; writeStack(s); return u; }
  function clearForward() { writeStack([]); }

  function isDashboard(p) { return DASHBOARDS.some(d => p === d || p.startsWith(d + '?') || p.startsWith(d + '/')); }
  function isAuth(p) { return p === AUTH_PAGE || p.startsWith(AUTH_PAGE + '?'); }
  function isMaterial(p) { return p === MATERIAL_PAGE || p.startsWith(MATERIAL_PAGE + '?'); }
  function roleHome() {
    const role = document.body?.dataset?.role;
    return { student:'/student', teacher:'/teacher', schooladmin:'/school-admin', superadmin:'/super-admin' }[role] || '/auth';
  }

  function flashGuard(event) {
    const isBackFwd = (event && event.persisted) ||
      (window.performance && performance.getEntriesByType &&
        performance.getEntriesByType('navigation')[0] &&
        performance.getEntriesByType('navigation')[0].type === 'back_forward');
    if (!isBackFwd) return;
    const path = window.location.pathname;
    if (isDashboard(path)) window.location.replace(AUTH_PAGE);
  }
  flashGuard(null);

  function refreshButtons() {
    const backBtns = document.querySelectorAll('[data-nav-back]');
    const fwdBtns = document.querySelectorAll('[data-nav-forward]');
    const path = window.location.pathname;
    const onAuth = isAuth(path);
    const onDashboard = isDashboard(path);
    const onMaterial = isMaterial(path);
    const hasHistory = window.history.length > 1;
    const canBack = !onAuth && (hasHistory || onDashboard || onMaterial);
    const canFwd = readStack().length > 0;

    backBtns.forEach(b => {
      b.disabled = !canBack;
      b.classList.toggle('opacity-40', !canBack);
      b.classList.toggle('cursor-not-allowed', !canBack);
      b.classList.toggle('cursor-pointer', canBack);
    });
    fwdBtns.forEach(b => {
      b.disabled = !canFwd;
      b.classList.toggle('opacity-40', !canFwd);
      b.classList.toggle('cursor-not-allowed', !canFwd);
      b.classList.toggle('cursor-pointer', canFwd);
    });
  }

  function goBack() {
    const path = window.location.pathname;
    if (isDashboard(path)) { pushForward(window.location.href); window.location.assign(AUTH_PAGE); return; }
    if (isMaterial(path))  { pushForward(window.location.href); window.location.assign(roleHome()); return; }
    if (window.history.length > 1) {
      pushForward(window.location.href);
      window.history.back();
      const before = window.location.href;
      setTimeout(() => { if (window.location.href === before) window.location.assign(AUTH_PAGE); }, 200);
      return;
    }
    pushForward(window.location.href);
    window.location.assign(AUTH_PAGE);
  }

  function goForward() {
    const target = popForward();
    if (target) window.location.assign(target);
  }

  function bindButtons() {
    document.querySelectorAll('[data-nav-back]').forEach(b => {
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.addEventListener('click', (e) => { e.preventDefault(); goBack(); });
    });
    document.querySelectorAll('[data-nav-forward]').forEach(b => {
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.addEventListener('click', (e) => { e.preventDefault(); goForward(); });
    });
    refreshButtons();
  }

  function init() {
    bindButtons();
    const mo = new MutationObserver(() => bindButtons());
    mo.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href && !link.target && link.origin === window.location.origin) {
        clearForward();
      }
    });

    window.addEventListener('popstate', () => { flashGuard(null); refreshButtons(); });
    window.addEventListener('pageshow', (e) => { flashGuard(e); refreshButtons(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();