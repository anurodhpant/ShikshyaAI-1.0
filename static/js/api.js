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

  // Profile
  getProfile:     () => apiFetch('/profile'),
  updateProfile:  (p) => apiFetch('/profile', { method: 'PUT', body: JSON.stringify(p) }),
  changePassword: (p) => apiFetch('/profile/password', { method: 'PUT', body: JSON.stringify(p) }),

  // Schools
  getSchools:        () => apiFetch('/schools'),
  getNearbySchools:  (lat, lng, radiusKm) => apiFetch(
    `/schools/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}${radiusKm ? `&radius_km=${radiusKm}` : ''}`
  ),
  getSchool:  (id) => apiFetch(`/schools/${id}`),
  createSchool: (p) => apiFetch('/schools', { method: 'POST', body: JSON.stringify(p) }),
  updateSchoolStatus: (id, status) => apiFetch(`/schools/${id}/status`, {
    method: 'PATCH', body: JSON.stringify({ status })
  }),

  // Users
  getUsers: () => apiFetch('/users'),
  getMyProfile: () => apiFetch('/users/me'),
  createUser: (p) => apiFetch('/users/create', { method: 'POST', body: JSON.stringify(p) }),
  deleteUser: (id) => apiFetch(`/users/${id}`, { method: 'DELETE' }),

  // Teachers
  getTeachers: () => apiFetch('/teachers'),
  getTeacher:  (id) => apiFetch(`/teachers/${id}`),

  // Students
  getStudents: (cls) => apiFetch('/students' + (cls ? `?class=${cls}` : '')),
  getStudent:  (id) => apiFetch(`/students/${id}`),
  studentReport: (id) => apiFetch(`/student-report/${id}`),

  // Class / subjects / assignments / activity / announcements
  getClasses:     () => apiFetch('/classes'),
  getSubjects:    () => apiFetch('/subjects'),
  getAssignments: () => apiFetch('/assignments'),
  getActivity:    () => apiFetch('/activity'),
  getAnnouncements: () => apiFetch('/announcements'),

  // Curriculum / course material
  getCurriculum: (cls) => apiFetch('/curriculum' + (cls ? `?class=${cls}` : '')),
  getCourseMaterials: (cls) => apiFetch('/course-materials' + (cls ? `?class=${cls}` : '')),
  approveCurriculum: (id) => apiFetch(`/curriculum/${id}/approve`, { method: 'POST' }),

  // Uploads
  getUploads:   () => apiFetch('/uploads'),
  deleteUpload: (id) => apiFetch(`/uploads/${id}`, { method: 'DELETE' }),

  // Audit + health
  getAuditLogs: () => apiFetch('/audit'),
  health:       () => apiFetch('/health'),

  // Super Admin dashboard
  superAdminOverview:        () => apiFetch('/super-admin/overview'),
  superAdminBaseCurriculum:  () => apiFetch('/super-admin/base-curriculum'),
  superAdminSchoolCurricula: () => apiFetch('/super-admin/school-curricula'),
  superAdminApprovals:       () => apiFetch('/super-admin/approvals'),
  superAdminAnalytics:       () => apiFetch('/super-admin/analytics'),
  superAdminSettings:        () => apiFetch('/super-admin/settings'),
  superAdminUpdateSettings:  (p) => apiFetch('/super-admin/settings', {
    method: 'PATCH', body: JSON.stringify(p)
  }),
};