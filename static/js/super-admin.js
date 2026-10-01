document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('logoutBtn')?.addEventListener('click', doLogout);
  document.getElementById('mobileLogout')?.addEventListener('click', doLogout);

  try {
    const me = await window.API.getMyProfile();
    if (me.role !== 'superadmin') {
      window.location.href = '/auth';
      return;
    }
    console.log('[SuperAdmin] Logged in as:', me.name);
  } catch (err) {
    console.warn('[SuperAdmin]', err.message);
    window.location.href = '/auth';
    return;
  }

  // (existing dynamic loads for schools / audit are still inline in the template)
});

async function doLogout() {
  try { await window.API.logout(); } catch (_) {}
  try { localStorage.removeItem('shikshya_last_role'); } catch (_) {}
  window.location.href = '/auth';
}