document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await window.API.logout();
    window.location.href = '/auth';
  });
  document.getElementById('mobileLogout')?.addEventListener('click', async () => {
    await window.API.logout();
    window.location.href = '/auth';
  });

  try {
    const me = await window.API.getMyProfile();
    if (me.role !== 'schooladmin') {
      window.location.href = '/auth';
      return;
    }
    const nameEl = document.getElementById('adminName');
    if (nameEl && me.name) nameEl.textContent = me.name;
    console.log('[SchoolAdmin] Logged in as:', me.name);
  } catch (err) {
    console.warn('[SchoolAdmin]', err.message);
    window.location.href = '/auth';
  }
});