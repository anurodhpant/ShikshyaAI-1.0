// Super Admin dashboard logic

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('logoutBtn')?.addEventListener('click', doLogout);

  let me;
  try { me = await window.API.getMyProfile(); }
  catch (_) { window.location.href = '/auth?role=superadmin'; return; }
  if (me.role !== 'superadmin') { window.location.href = '/auth?role=superadmin'; return; }

  const nameEl = document.getElementById('userName');
  if (nameEl) nameEl.textContent = me.name || 'Super Admin';
  const av = document.getElementById('userAvatar');
  if (av) av.textContent = (me.name || 'SA').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  document.querySelectorAll('.nav-link[data-tab]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = a.dataset.tab;
      location.hash = tab;
      activateTab(tab);
    });
  });
  const initial = (location.hash || '#dashboard').slice(1);
  activateTab(initial);
  window.addEventListener('hashchange', () => {
    activateTab((location.hash || '#dashboard').slice(1));
  });

  document.getElementById('addSchoolBtn')?.addEventListener('click', openSchoolModal);
  document.getElementById('addUserBtn')?.addEventListener('click', () => openUserModal('schooladmin'));
  document.getElementById('addTeacherBtn')?.addEventListener('click', () => openUserModal('teacher'));
  document.getElementById('addStudentBtn')?.addEventListener('click', () => openUserModal('student'));
});

async function doLogout() {
  try { await window.API.logout(); } catch (_) {}
  try { localStorage.removeItem('shikshya_last_role'); } catch (_) {}
  window.location.href = '/auth?role=superadmin';
}

function activateTab(tab) {
  document.querySelectorAll('.nav-link').forEach(a => {
    if (!a.dataset.tab) return;
    const on = a.dataset.tab === tab;
    a.className = 'nav-link flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ' +
      (on ? 'bg-[#1d4ed8] text-white' : 'text-[#45464d] hover:bg-[#eff4ff]');
  });
  const content = document.getElementById('superAdminContent');
  content.innerHTML = `<p class="text-sm text-[#45464d]">Loading ${tab}…</p>`;
  switch (tab) {
    case 'dashboard':   renderDashboard(content); break;
    case 'schools':     renderSchools(content); break;
    case 'users':       renderUsers(content); break;
    case 'base':        renderBaseCurriculum(content); break;
    case 'schoolcurr':  renderSchoolCurricula(content); break;
    case 'content':     renderContent(content); break;
    case 'approvals':   renderApprovals(content); break;
    case 'analytics':   renderAnalytics(content); break;
    case 'audit':       renderAudit(content); break;
    case 'settings':    renderSettings(content); break;
    default: renderDashboard(content);
  }
}

async function renderDashboard(root) {
  let data = {};
  try { data = await window.API.superAdminOverview(); } catch (_) {}
  root.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight">National Command Center</h1>
        <p class="text-sm text-[#45464d] mt-1">Nepal MoEST &amp; CDC platform overview</p>
      </div>
      <div class="flex items-center gap-2">
        <button id="addSchoolBtn" class="flex items-center justify-center gap-1.5 bg-black text-white font-semibold text-sm h-10 px-4 rounded-lg">
          <span class="material-symbols-outlined text-base">add</span> Add School
        </button>
        <button id="addUserBtn" class="flex items-center justify-center gap-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold text-sm h-10 px-4 rounded-lg">
          <span class="material-symbols-outlined text-base">person_add</span> Add User
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <p class="text-xs font-semibold text-[#45464d]">Schools</p>
        <p class="text-3xl font-extrabold font-mono">${data.schools || 0}</p>
        <p class="text-xs text-[#009668] mt-1">${data.activeSchools || 0} active</p>
      </div>
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <p class="text-xs font-semibold text-[#45464d]">Users</p>
        <p class="text-3xl font-extrabold font-mono">${data.users || 0}</p>
        <p class="text-xs text-[#76777d] mt-1">${data.students || 0} Students · ${data.teachers || 0} Teachers</p>
      </div>
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <p class="text-xs font-semibold text-[#45464d]">Curriculum</p>
        <p class="text-3xl font-extrabold font-mono">${data.curriculumItems || 0}</p>
        <p class="text-xs text-[#76777d] mt-1">${data.subjects || 0} subjects</p>
      </div>
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <p class="text-xs font-semibold text-[#45464d]">Audit Logs</p>
        <p class="text-3xl font-extrabold font-mono">${data.auditLogs || 0}</p>
        <p class="text-xs text-[#76777d] mt-1">Recent actions</p>
      </div>
    </div>
  `;
  document.getElementById('addSchoolBtn')?.addEventListener('click', openSchoolModal);
  document.getElementById('addUserBtn')?.addEventListener('click', () => openUserModal('schooladmin'));
}

async function renderSchools(root) {
  let data = { schools: [] };
  try { data = await window.API.getSchools(); } catch (_) {}
  const schools = data.schools || [];
  root.innerHTML = `
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight">Schools</h1>
        <p class="text-sm text-[#45464d] mt-0.5">Manage schools and activation status</p>
      </div>
      <button id="addSchoolBtnInline" class="flex items-center gap-1.5 bg-black text-white font-semibold text-sm h-10 px-4 rounded-lg">
        <span class="material-symbols-outlined text-base">add</span> Add School
      </button>
    </div>
    <div class="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-[#f8fafc] text-[#45464d]">
          <tr>
            <th class="text-left p-3 font-semibold">School</th>
            <th class="text-left p-3 font-semibold">Code</th>
            <th class="text-left p-3 font-semibold">Province</th>
            <th class="text-right p-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          ${schools.map(s => `
            <tr class="border-t border-[#f1f5f9]">
              <td class="p-3 font-semibold">${escapeHtml(s.name)}</td>
              <td class="p-3 font-mono text-xs">${escapeHtml(s.id)}</td>
              <td class="p-3 text-[#45464d]">${escapeHtml(s.province || '—')}</td>
              <td class="p-3 text-right"><span class="px-2 py-0.5 rounded-md text-[11px] font-bold ${s.status === 'active' ? 'bg-[#ecfdf5] text-[#009668] border border-[#a7f3d0]' : 'bg-[#fffbeb] text-[#92400e] border border-[#fde68a]'}">${escapeHtml(s.status || 'active')}</span></td>
            </tr>`).join('') || '<tr><td colspan="4" class="p-6 text-center text-[#45464d]">No schools yet. Click Add School.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('addSchoolBtnInline')?.addEventListener('click', openSchoolModal);
}

async function renderUsers(root) {
  let users = [];
  try { users = (await window.API.getUsers()).users || []; } catch (_) {}
  root.innerHTML = `
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight">Users &amp; Roles</h1>
        <p class="text-sm text-[#45464d] mt-0.5">Add users by role</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button id="addSA" class="text-xs font-semibold border border-[#c6c6cd] px-3 py-1.5 rounded-lg">+ School Admin</button>
        <button id="addTeacher" class="text-xs font-semibold border border-[#c6c6cd] px-3 py-1.5 rounded-lg">+ Teacher</button>
        <button id="addStudent" class="text-xs font-semibold border border-[#c6c6cd] px-3 py-1.5 rounded-lg">+ Student</button>
      </div>
    </div>
    <div class="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-[#f8fafc] text-[#45464d]">
          <tr>
            <th class="text-left p-3 font-semibold">Name</th>
            <th class="text-left p-3 font-semibold">Email</th>
            <th class="text-left p-3 font-semibold">Role</th>
            <th class="text-left p-3 font-semibold">School</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr class="border-t border-[#f1f5f9]">
              <td class="p-3 font-semibold">${escapeHtml(u.name||'—')}</td>
              <td class="p-3 font-mono text-xs">${escapeHtml(u.email||'—')}</td>
              <td class="p-3"><span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#eff6ff] text-[#1d4ed8] border border-[#dbeafe]">${escapeHtml(u.role||'—')}</span></td>
              <td class="p-3 text-[#45464d] font-mono text-xs">${escapeHtml(u.schoolId||'—')}</td>
            </tr>`).join('') || '<tr><td colspan="4" class="p-6 text-center text-[#45464d]">No users yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('addSA')?.addEventListener('click', () => openUserModal('schooladmin'));
  document.getElementById('addTeacher')?.addEventListener('click', () => openUserModal('teacher'));
  document.getElementById('addStudent')?.addEventListener('click', () => openUserModal('student'));
}

async function renderBaseCurriculum(root) {
  let data = { curriculum: [], subjects: [], locked: true };
  try { data = await window.API.superAdminBaseCurriculum(); } catch (_) {}
  root.innerHTML = `
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight">Base Curriculum</h1>
        <p class="text-sm text-[#45464d] mt-0.5">CDC-owned national curriculum · Grades 6–12</p>
      </div>
      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#fee2e2] text-[#dc2626] text-xs font-bold border border-[#fecaca]">
        <span class="material-symbols-outlined text-sm">lock</span> System-owned
      </span>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <p class="text-xs font-semibold text-[#45464d]">Curriculum Items</p>
        <p class="text-3xl font-extrabold font-mono">${data.curriculum.length}</p>
      </div>
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <p class="text-xs font-semibold text-[#45464d]">Subjects</p>
        <p class="text-3xl font-extrabold font-mono">${data.subjects.length}</p>
      </div>
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <p class="text-xs font-semibold text-[#45464d]">Locked</p>
        <p class="text-xl font-extrabold font-mono ${data.locked ? 'text-[#dc2626]' : 'text-[#009668]'}">${data.locked ? 'Yes' : 'No'}</p>
      </div>
    </div>
  `;
}

async function renderSchoolCurricula(root) {
  let data = { schoolCurricula: [], total: 0 };
  try { data = await window.API.superAdminSchoolCurricula(); } catch (_) {}
  root.innerHTML = `
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight">School Curriculum</h1>
      <p class="text-sm text-[#45464d] mt-0.5">School-specific mapping (separate from Base Curriculum)</p>
    </div>
    <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 text-center">
      <p class="text-sm text-[#45464d]">${data.total === 0 ? 'No school curricula configured yet.' : data.total + ' entries.'}</p>
    </div>
  `;
}

async function renderContent(root) {
  let subjects = [], uploads = [];
  try { subjects = (await window.API.getSubjects()).subjects || []; } catch (_) {}
  try { uploads = (await window.API.getUploads()).uploads || []; } catch (_) {}
  root.innerHTML = `
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight">Subjects &amp; Content</h1>
      <p class="text-sm text-[#45464d] mt-0.5">Subjects and uploaded material</p>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4"><p class="text-xs font-semibold text-[#45464d]">Subjects</p><p class="text-3xl font-extrabold font-mono">${subjects.length}</p></div>
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4"><p class="text-xs font-semibold text-[#45464d]">Uploads</p><p class="text-3xl font-extrabold font-mono">${uploads.length}</p></div>
    </div>
  `;
}

async function renderApprovals(root) {
  let data = { approvals: [], total: 0 };
  try { data = await window.API.superAdminApprovals(); } catch (_) {}
  root.innerHTML = `
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight">Approvals</h1>
      <p class="text-sm text-[#45464d] mt-0.5">Content and school requests</p>
    </div>
    <div class="bg-white border border-[#e2e8f0] rounded-xl p-8 text-center">
      <span class="material-symbols-outlined text-4xl text-[#76777d]">task_alt</span>
      <p class="text-sm text-[#45464d] mt-2">${data.total === 0 ? 'No pending approvals.' : data.total + ' pending.'}</p>
    </div>
  `;
}

async function renderAnalytics(root) {
  let data = { totalUsers: 0, roleBreakdown: {}, bySchool: [] };
  try { data = await window.API.superAdminAnalytics(); } catch (_) {}
  root.innerHTML = `
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight">Analytics</h1>
      <p class="text-sm text-[#45464d] mt-0.5">Platform usage</p>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4"><p class="text-xs font-semibold text-[#45464d]">Total Users</p><p class="text-3xl font-extrabold font-mono">${data.totalUsers}</p></div>
      ${Object.entries(data.roleBreakdown || {}).map(([k,v]) => `<div class="bg-white border border-[#e2e8f0] rounded-xl p-4"><p class="text-xs font-semibold text-[#45464d] capitalize">${escapeHtml(k)}</p><p class="text-3xl font-extrabold font-mono">${v}</p></div>`).join('')}
    </div>
  `;
}

async function renderAudit(root) {
  let logs = [];
  try { logs = (await window.API.getAuditLogs()).logs || []; } catch (_) {}
  root.innerHTML = `
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight">Audit Logs</h1>
      <p class="text-sm text-[#45464d] mt-0.5">All admin actions</p>
    </div>
    <div class="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-[#f8fafc] text-[#45464d]"><tr><th class="text-left p-3 font-semibold">Action</th><th class="text-left p-3 font-semibold">User</th><th class="text-right p-3 font-semibold">Result</th></tr></thead>
        <tbody>
          ${logs.map(l => `<tr class="border-t border-[#f1f5f9]"><td class="p-3">${escapeHtml(l.action)}</td><td class="p-3">${escapeHtml(l.user||'—')}</td><td class="p-3 text-right text-[11px] font-bold ${l.result === 'SUCCESS' ? 'text-[#009668]' : 'text-[#ba1a1a]'}">${escapeHtml(l.result||'')}</td></tr>`).join('') || '<tr><td colspan="3" class="p-6 text-center text-[#45464d]">No logs.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

async function renderSettings(root) {
  let settings = {};
  try { settings = await window.API.superAdminSettings(); } catch (_) {}
  root.innerHTML = `
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight">Settings</h1>
      <p class="text-sm text-[#45464d] mt-0.5">Platform configuration</p>
    </div>
    <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4">
      <div><label class="block text-xs font-semibold text-[#45464d] mb-1.5">Academic Year</label>
        <input id="settingAcademicYear" type="text" value="${escapeHtml(settings.academicYear||'2082')}" class="w-full max-w-xs px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm bg-white"/></div>
      <label class="flex items-center gap-2 cursor-pointer">
        <input id="settingBaseLocked" type="checkbox" ${settings.baseCurriculumLocked ? 'checked' : ''} class="w-4 h-4 rounded border-[#c6c6cd] text-[#1d4ed8]"/>
        <span class="text-sm">Base Curriculum locked</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer">
        <input id="settingAllowSA" type="checkbox" ${settings.allowPublicSchoolAdminSignup ? 'checked' : ''} class="w-4 h-4 rounded border-[#c6c6cd] text-[#1d4ed8]"/>
        <span class="text-sm">Allow public School Admin signup</span>
      </label>
      <div><button id="saveSettingsBtn" class="px-5 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-lg text-sm font-semibold">Save Settings</button>
        <span id="settingsMsg" class="ml-3 text-sm"></span></div>
    </div>
  `;
  document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
    try {
      await window.API.superAdminUpdateSettings({
        academicYear: document.getElementById('settingAcademicYear').value,
        baseCurriculumLocked: document.getElementById('settingBaseLocked').checked,
        allowPublicSchoolAdminSignup: document.getElementById('settingAllowSA').checked,
      });
      document.getElementById('settingsMsg').textContent = '✔ Saved';
      document.getElementById('settingsMsg').className = 'ml-3 text-sm text-[#009668]';
    } catch (err) {
      document.getElementById('settingsMsg').textContent = '✖ ' + err.message;
      document.getElementById('settingsMsg').className = 'ml-3 text-sm text-[#ba1a1a]';
    }
  });
}

// ---------------- Modals ----------------
async function loadSchoolsIntoAddUser() {
  const sel = document.getElementById('u_schoolId');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select school —</option>';
  try {
    const { schools } = await window.API.getSchools();
    (schools || []).forEach(s => {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = `${s.name} (${s.id})`;
      sel.appendChild(o);
    });
  } catch (_) {}
}

function openUserModal(role) {
  document.getElementById('u_role').value = role;
  document.getElementById('u_role').disabled = true;
  document.getElementById('addUserTitle').textContent = 'Add ' + (role === 'schooladmin' ? 'School Admin' : role.charAt(0).toUpperCase() + role.slice(1));
  document.getElementById('u_teacherFields').classList.toggle('hidden', role !== 'teacher');
  document.getElementById('u_studentFields').classList.toggle('hidden', role !== 'student');
  document.getElementById('u_error').classList.add('hidden');
  document.getElementById('addUserForm').reset();
  document.getElementById('u_password').value = 'password123';
  document.getElementById('u_section').value = 'A';
  document.getElementById('u_role').value = role;
  loadSchoolsIntoAddUser();
  document.getElementById('addUserModal').classList.remove('hidden');
}

function closeUserModal() {
  document.getElementById('addUserModal').classList.add('hidden');
  document.getElementById('u_role').disabled = false;
}

async function submitUserForm(e) {
  e.preventDefault();
  const role = document.getElementById('u_role').value;
  const payload = {
    role,
    name:  document.getElementById('u_name').value.trim(),
    email: document.getElementById('u_email').value.trim(),
    phone: document.getElementById('u_phone').value.trim(),
    address: document.getElementById('u_address').value.trim(),
    schoolId: document.getElementById('u_schoolId').value,
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
    alert('User created successfully.');
    location.reload();
  } catch (err) {
    const errBox = document.getElementById('u_error');
    errBox.textContent = err.message;
    errBox.classList.remove('hidden');
  }
}

function openSchoolModal() {
  document.getElementById('s_error').classList.add('hidden');
  document.getElementById('addSchoolForm').reset();
  document.getElementById('s_classes').value = '6-12';
  document.getElementById('addSchoolModal').classList.remove('hidden');
}

function closeSchoolModal() {
  document.getElementById('addSchoolModal').classList.add('hidden');
}

async function submitSchoolForm(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('s_name').value.trim(),
    code: document.getElementById('s_code').value.trim(),
    province: document.getElementById('s_province').value.trim(),
    classes: document.getElementById('s_classes').value.trim(),
    address: document.getElementById('s_address').value.trim(),
  };
  try {
    await window.API.createSchool(payload);
    closeSchoolModal();
    alert('School created.');
    location.reload();
  } catch (err) {
    const errBox = document.getElementById('s_error');
    errBox.textContent = err.message;
    errBox.classList.remove('hidden');
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}