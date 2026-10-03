// School Admin dashboard

document.addEventListener('DOMContentLoaded', async () => {
  let me;
  try { me = await window.API.getMyProfile(); }
  catch (_) { window.location.href = '/auth?role=schooladmin'; return; }
  if (me.role !== 'schooladmin' && me.role !== 'superadmin') {
    window.location.href = '/auth?role=schooladmin';
    return;
  }

  const role = me.role === 'superadmin' ? 'superadmin' : 'schooladmin';
  const subMap = { schooladmin:'School Admin', teacher:'Teacher', student:'Student', superadmin:'Super Admin' };
  const avatar = (me.name||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  let schoolName = '', schoolAddr = '';
  if (me.schoolId) {
    try { const s = await window.API.getSchool(me.schoolId); schoolName = s.name; schoolAddr = s.province; } catch(_){}
  }

  window.renderLayout({
    role, active: 'dashboard',
    userName: me.name, userSub: subMap[role], userAvatar: avatar,
    schoolName, schoolAddr
  });

  const content = window.getPageContent();
  if (!content) return;

  content.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight">Welcome, ${escapeHtml(me.name || 'Admin')}!</h1>
        <p class="text-sm text-[#45464d] mt-0.5">${escapeHtml(schoolName || 'Your School')}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button id="addTeacherBtn" class="flex items-center justify-center gap-1.5 bg-black text-white font-semibold text-sm h-10 px-4 rounded-lg">
          <span class="material-symbols-outlined text-base">person_add</span> Add Teacher
        </button>
        <button id="addStudentBtn" class="flex items-center justify-center gap-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold text-sm h-10 px-4 rounded-lg">
          <span class="material-symbols-outlined text-base">group_add</span> Add Student
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <p class="text-xs font-semibold text-[#45464d]">Students</p>
        <p class="text-3xl font-extrabold font-mono" id="kpiStudents">0</p>
      </div>
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <p class="text-xs font-semibold text-[#45464d]">Teachers</p>
        <p class="text-3xl font-extrabold font-mono" id="kpiTeachers">0</p>
      </div>
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <p class="text-xs font-semibold text-[#45464d]">Assignments</p>
        <p class="text-3xl font-extrabold font-mono" id="kpiAssignments">0</p>
      </div>
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <p class="text-xs font-semibold text-[#45464d]">Materials</p>
        <p class="text-3xl font-extrabold font-mono" id="kpiUploads">0</p>
      </div>
    </div>
  `;

  document.getElementById('addTeacherBtn')?.addEventListener('click', () => openUserModal('teacher'));
  document.getElementById('addStudentBtn')?.addEventListener('click', () => openUserModal('student'));

  // Load KPI counts
  try {
    const [t, s, a, u] = await Promise.all([
      window.API.getTeachers().catch(() => ({ teachers: [] })),
      window.API.getStudents().catch(() => ({ students: [] })),
      window.API.getAssignments().catch(() => ({ assignments: [] })),
      window.API.getUploads().catch(() => ({ uploads: [] })),
    ]);
    document.getElementById('kpiTeachers').textContent = (t.teachers || []).length;
    document.getElementById('kpiStudents').textContent = (s.students || []).length;
    document.getElementById('kpiAssignments').textContent = (a.assignments || []).length;
    document.getElementById('kpiUploads').textContent = (u.uploads || []).length;
  } catch (_) {}
});

async function doLogout() {
  try { await window.API.logout(); } catch (_) {}
  try { localStorage.removeItem('shikshya_last_role'); } catch (_) {}
  window.location.href = '/auth?role=schooladmin';
}

let ME = null;
async function loadMe() {
  if (ME) return ME;
  ME = await window.API.getMyProfile();
  return ME;
}

async function openUserModal(role) {
  const me = await loadMe();
  document.getElementById('u_role').value = role;
  document.getElementById('u_role').disabled = true;
  document.getElementById('addUserTitle').textContent =
    role === 'teacher' ? 'Add Teacher' : 'Add Student';
  document.getElementById('u_teacherFields').classList.toggle('hidden', role !== 'teacher');
  document.getElementById('u_studentFields').classList.toggle('hidden', role !== 'student');
  document.getElementById('u_error').classList.add('hidden');
  document.getElementById('addUserForm').reset();
  document.getElementById('u_password').value = 'password123';
  document.getElementById('u_section').value = 'A';
  document.getElementById('u_role').value = role;
  document.getElementById('u_schoolId').value = me.schoolId || '';
  document.getElementById('addUserModal').classList.remove('hidden');
}

function closeUserModal() {
  document.getElementById('addUserModal').classList.add('hidden');
  document.getElementById('u_role').disabled = false;
}

async function submitUserForm(e) {
  e.preventDefault();
  const me = await loadMe();
  const role = document.getElementById('u_role').value;
  const payload = {
    role,
    name:  document.getElementById('u_name').value.trim(),
    email: document.getElementById('u_email').value.trim(),
    phone: document.getElementById('u_phone').value.trim(),
    address: document.getElementById('u_address').value.trim(),
    schoolId: me.schoolId,
    password: document.getElementById('u_password').value,
  };
  if (role === 'teacher') payload.subject = document.getElementById('u_subject').value.trim();
  if (role === 'student') {
    payload.classLevel = document.getElementById('u_classLevel').value;
    payload.section = document.getElementById('u_section').value.trim();
  }
  try {
    await window.API.createUser(payload);
    closeUserModal();
    alert('Created successfully.');
    location.reload();
  } catch (err) {
    const errBox = document.getElementById('u_error');
    errBox.textContent = err.message;
    errBox.classList.remove('hidden');
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}