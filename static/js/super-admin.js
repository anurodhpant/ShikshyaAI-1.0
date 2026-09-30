document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [schools, curriculum, audit] = await Promise.all([
      window.API.getSchools(),
      window.API.getCurriculum(),
      window.API.getAuditLogs().catch(() => ({ logs: [], total: 0 }))
    ]);
    console.log('[SuperAdmin] Loaded:', {
      schools: schools.total,
      curriculum: curriculum.total,
      logs: audit.total
    });
  } catch (err) {
    console.warn('[SuperAdmin] Could not load live data:', err.message);
  }
});