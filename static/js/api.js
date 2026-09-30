const API_BASE = '/api';

async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include',
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

window.API = {
  // Auth
  login:    (p) => apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify(p) }),
  register: (p) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(p) }),
  logout:   () => apiFetch('/auth/logout',    { method: 'POST' }),
  me:       () => apiFetch('/auth/me'),

  // Schools
  getSchools: () => apiFetch('/schools'),
  getSchool: (id) => apiFetch(`/schools/${id}`),
  createSchool: (p) => apiFetch('/schools', { method: 'POST', body: JSON.stringify(p) }),
  updateSchoolStatus: (id, status) => apiFetch(`/schools/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Users
  getUsers: () => apiFetch('/users'),
  getMyProfile: () => apiFetch('/users/me'),

  // Curriculum
  getCurriculum: (classLevel) => apiFetch('/curriculum' + (classLevel ? `?class=${classLevel}` : '')),
  approveCurriculum: (id) => apiFetch(`/curriculum/${id}/approve`, { method: 'POST' }),

  // Uploads
  getUploads: () => apiFetch('/uploads'),
  deleteUpload: (id) => apiFetch(`/uploads/${id}`, { method: 'DELETE' }),

  // Audit + health
  getAuditLogs: () => apiFetch('/audit'),
  health: () => apiFetch('/health')
};