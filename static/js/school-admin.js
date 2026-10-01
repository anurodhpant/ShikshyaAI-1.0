// School Admin dashboard — renders sidebar, KPIs, charts, assignments, activity.

document.addEventListener('DOMContentLoaded', async () => {
  let me;
  try { me = await window.API.getMyProfile(); }
  catch (_) { window.location.href = '/auth'; return; }

  const role = me.role === 'superadmin' ? 'superadmin'
             : me.role === 'schooladmin' ? 'schooladmin'
             : me.role === 'teacher' ? 'teacher' : 'student';
  const subMap = { schooladmin:'School Admin', teacher:'Teacher', student:'Student', superadmin:'Super Admin' };
  const avatar = (me.name||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  let schoolName = '', schoolAddr = '';
  if (me.schoolId) {
    try { const s = await window.API.getSchool(me.schoolId); schoolName = s.name; schoolAddr = s.province; } catch(_){}
  }

  // Render the shared sidebar + topbar
  if (typeof window.renderLayout === 'function') {
    window.renderLayout({
      role, active: 'dashboard',
      userName: me.name, userSub: subMap[role] || 'User', userAvatar: avatar,
      schoolName, schoolAddr
    });
  }

  const content = window.getPageContent ? window.getPageContent() : document.getElementById('page-content');
  if (!content) return;

  // Today's date
  let todayStr = '';
  try {
    todayStr = new Date().toLocaleDateString('en-GB', {
      weekday:'long', day:'numeric', month:'long', year:'numeric'
    });
  } catch (_) { todayStr = new Date().toDateString(); }

  content.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight">Welcome back, ${escHtml(me.name || 'Admin')}!</h1>
        <p class="text-sm text-[#45464d] mt-0.5">Here's what's happening at your school today.</p>
      </div>
      <div class="text-right">
        <div class="flex items-center gap-1.5 justify-end text-sm text-[#45464d]">
          <span class="material-symbols-outlined text-base">calendar_today</span>
          <span>${escHtml(todayStr)}</span>
        </div>
        <p class="text-[10px] text-[#76777d] italic mt-0.5">Better Learning · Brighter Future</p>
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-6 gap-3">
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <span class="material-symbols-outlined text-[#1d4ed8] bg-[#eff4ff] p-1.5 rounded-lg">groups</span>
        <p class="text-xs text-[#45464d] font-semibold mt-2">Total Students</p>
        <p class="text-2xl font-extrabold font-mono" id="kpiStudents">—</p>
        <p class="text-[11px] text-[#16a34a] mt-0.5">↑ 12% <span class="text-[#76777d]">vs last month</span></p>
      </div>
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <span class="material-symbols-outlined text-[#7c3aed] bg-[#ede9fe] p-1.5 rounded-lg">badge</span>
        <p class="text-xs text-[#45464d] font-semibold mt-2">Total Teachers</p>
        <p class="text-2xl font-extrabold font-mono" id="kpiTeachers">—</p>
        <p class="text-[11px] text-[#16a34a] mt-0.5">↑ 5% <span class="text-[#76777d]">vs last month</span></p>
      </div>
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <span class="material-symbols-outlined text-[#16a34a] bg-[#dcfce7] p-1.5 rounded-lg">class</span>
        <p class="text-xs text-[#45464d] font-semibold mt-2">Total Classes</p>
        <p class="text-2xl font-extrabold font-mono" id="kpiClasses">—</p>
        <p class="text-[11px] text-[#76777d] mt-0.5">(6 – 12)</p>
      </div>
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <span class="material-symbols-outlined text-[#0891b2] bg-[#cffafe] p-1.5 rounded-lg">person</span>
        <p class="text-xs text-[#45464d] font-semibold mt-2">Active Students</p>
        <p class="text-2xl font-extrabold font-mono" id="kpiActive">—</p>
        <p class="text-[11px] text-[#76777d] mt-0.5">95% of total</p>
      </div>
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <span class="material-symbols-outlined text-[#ea580c] bg-[#ffedd5] p-1.5 rounded-lg">assignment_late</span>
        <p class="text-xs text-[#45464d] font-semibold mt-2">Pending Work</p>
        <p class="text-2xl font-extrabold font-mono text-[#ba1a1a]" id="kpiPending">—</p>
        <p class="text-[11px] text-[#ba1a1a] mt-0.5">↓ 22% <span class="text-[#76777d]">vs last week</span></p>
      </div>
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <span class="material-symbols-outlined text-[#d97706] bg-[#fef3c7] p-1.5 rounded-lg">trending_up</span>
        <p class="text-xs text-[#45464d] font-semibold mt-2">Avg Progress</p>
        <p class="text-2xl font-extrabold font-mono" id="kpiAvg">76%</p>
        <p class="text-[11px] text-[#16a34a] mt-0.5">↑ 8% <span class="text-[#76777d]">vs last month</span></p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#1d4ed8]">bar_chart</span>
            <h2 class="font-bold">Class-wise Student Count</h2>
          </div>
          <a href="/students-list" class="text-xs text-[#1d4ed8] hover:underline">View All</a>
        </div>
        <div id="classChart" class="flex items-end justify-between gap-2 h-48"></div>
      </div>
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          <span class="material-symbols-outlined text-[#1d4ed8]">donut_large</span>
          <h2 class="font-bold">Overall Progress</h2>
        </div>
        <div class="flex items-center justify-center gap-6">
          <div class="relative w-32 h-32">
            <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5eeff" stroke-width="3.8"/>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#16a34a" stroke-width="3.8" stroke-dasharray="32 68"/>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1d4ed8" stroke-width="3.8" stroke-dasharray="44 56" stroke-dashoffset="-32"/>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#d97706" stroke-width="3.8" stroke-dasharray="18 82" stroke-dashoffset="-76"/>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ba1a1a" stroke-width="3.8" stroke-dasharray="6 94" stroke-dashoffset="-94"/>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <p class="text-xl font-extrabold font-mono">76%</p>
              <p class="text-[10px] text-[#45464d]">Average</p>
            </div>
          </div>
          <div class="space-y-1.5 text-xs">
            <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-[#16a34a]"></span> Excellent <span class="ml-auto font-mono font-bold">32%</span></div>
            <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-[#1d4ed8]"></span> Good <span class="ml-auto font-mono font-bold">44%</span></div>
            <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-[#d97706]"></span> Average <span class="ml-auto font-mono font-bold">18%</span></div>
            <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]"></span> Needs Help <span class="ml-auto font-mono font-bold">6%</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          <span class="material-symbols-outlined text-[#1d4ed8]">insights</span>
          <h2 class="font-bold">Subject Performance</h2>
        </div>
        <div id="subjectPerf" class="space-y-2.5"></div>
      </div>

      <div class="bg-white border border-[#e2e8f0] rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          <span class="material-symbols-outlined text-[#1d4ed8]">assignment</span>
          <h2 class="font-bold">Recent Assignments</h2>
        </div>
        <table class="w-full text-xs">
          <thead class="text-[#45464d] border-b border-[#e2e8f0]">
            <tr>
              <th class="text-left font-semibold pb-1.5">Title</th>
              <th class="text-left font-semibold pb-1.5">Class</th>
              <th class="text-right font-semibold pb-1.5">Status</th>
            </tr>
          </thead>
          <tbody id="recentAssignments"></tbody>
        </table>
      </div>

      <div class="bg-white border border-[#e2e8f0] rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          <span class="material-symbols-outlined text-[#1d4ed8]">notifications_active</span>
          <h2 class="font-bold">Recent Activity</h2>
        </div>
        <div id="activityList" class="space-y-3"></div>
      </div>
    </div>

    <div class="bg-white border border-[#e2e8f0] rounded-xl p-5">
      <div class="flex items-center gap-2 mb-3">
        <span class="material-symbols-outlined text-[#1d4ed8]">bolt</span>
        <h2 class="font-bold">Quick Actions</h2>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
        <a href="/students-list" class="flex flex-col items-center gap-1 py-3 border border-[#e2e8f0] rounded-lg hover:bg-[#eff4ff]">
          <span class="material-symbols-outlined text-[#1d4ed8]">person_add</span><span class="text-xs font-semibold">Add Student</span></a>
        <a href="/teachers-list" class="flex flex-col items-center gap-1 py-3 border border-[#e2e8f0] rounded-lg hover:bg-[#eff4ff]">
          <span class="material-symbols-outlined text-[#7c3aed]">group_add</span><span class="text-xs font-semibold">Add Teacher</span></a>
        <a href="/school-admin/assignments" class="flex flex-col items-center gap-1 py-3 border border-[#e2e8f0] rounded-lg hover:bg-[#eff4ff]">
          <span class="material-symbols-outlined text-[#16a34a]">assignment_add</span><span class="text-xs font-semibold">Create Assignment</span></a>
        <a href="/school-admin/syllabus" class="flex flex-col items-center gap-1 py-3 border border-[#e2e8f0] rounded-lg hover:bg-[#eff4ff]">
          <span class="material-symbols-outlined text-[#ea580c]">menu_book</span><span class="text-xs font-semibold">Update Syllabus</span></a>
        <a href="/course-materials-list" class="flex flex-col items-center gap-1 py-3 border border-[#e2e8f0] rounded-lg hover:bg-[#eff4ff]">
          <span class="material-symbols-outlined text-[#0891b2]">auto_stories</span><span class="text-xs font-semibold">Course Material</span></a>
      </div>
    </div>
  `;

  await Promise.all([
    loadKpis(),
    loadClassChart(),
    loadSubjectPerf(),
    loadRecentAssignments(),
    loadActivity()
  ]);
});

async function loadKpis() {
  try {
    const [t, s, a, c] = await Promise.all([
      window.API.getTeachers().catch(() => ({ total: 0, teachers: [] })),
      window.API.getStudents().catch(() => ({ total: 0, students: [] })),
      window.API.getAssignments().catch(() => ({ assignments: [] })),
      window.API.getClasses().catch(() => ({ classes: [] }))
    ]);

    const studentCount = s.total || (s.students || []).length;
    const teacherCount = t.total || (t.teachers || []).length;
    const classCount = (c.classes || []).length;

    setText('kpiStudents', studentCount);
    setText('kpiTeachers', teacherCount);
    setText('kpiClasses', classCount);
    setText('kpiActive', Math.round(studentCount * 0.95));

    const pending = (a.assignments || []).filter(x => x.status === 'Pending').length;
    setText('kpiPending', pending);
  } catch (_) {}
}

async function loadClassChart() {
  const el = document.getElementById('classChart');
  if (!el) return;
  try {
    const { classes } = await window.API.getClasses();
    const data = (classes && classes.length) ? classes : [];
    if (!data.length) {
      el.innerHTML = `<p class="text-sm text-[#45464d]">No class data available.</p>`;
      return;
    }
    const max = Math.max(...data.map(c => c.students || 0), 1);
    el.innerHTML = data.map(c => {
      const h = Math.round(((c.students || 0) / max) * 160);
      return `
        <div class="flex flex-col items-center gap-2 flex-1">
          <span class="text-[11px] font-mono font-bold">${c.students || 0}</span>
          <div class="w-full max-w-[28px] bg-[#1d4ed8] rounded-t-md" style="height:${h}px"></div>
          <span class="text-[11px] text-[#45464d] font-semibold">Class ${escHtml(c.classLevel)}</span>
        </div>`;
    }).join('');
  } catch (_) {
    el.innerHTML = `<p class="text-sm text-[#45464d]">Chart unavailable.</p>`;
  }
}

async function loadSubjectPerf() {
  const el = document.getElementById('subjectPerf');
  if (!el) return;
  try {
    const { subjects } = await window.API.getSubjects();
    if (!subjects || !subjects.length) {
      el.innerHTML = `<p class="text-sm text-[#45464d]">No subject data.</p>`;
      return;
    }
    el.innerHTML = subjects.slice(0, 6).map(s => `
      <div class="flex items-center gap-2">
        <span class="w-32 text-xs text-[#45464d] truncate">${escHtml(s.name)}</span>
        <div class="flex-1 bg-[#e5eeff] rounded-full h-2">
          <div class="h-2 rounded-full bg-[#1d4ed8]" style="width:${s.performance}%"></div>
        </div>
        <span class="text-xs font-mono font-bold w-8 text-right">${s.performance}%</span>
      </div>`).join('');
  } catch (_) {}
}

async function loadRecentAssignments() {
  const el = document.getElementById('recentAssignments');
  if (!el) return;
  try {
    const { assignments } = await window.API.getAssignments();
    const list = (assignments || []).slice(0, 5);
    if (!list.length) {
      el.innerHTML = `<tr><td colspan="3" class="py-2 text-[#45464d]">No assignments yet.</td></tr>`;
      return;
    }
    el.innerHTML = list.map(a => `
      <tr class="border-b border-[#f1f5f9]">
        <td class="py-2 font-semibold truncate max-w-[120px]">${escHtml(a.title)}</td>
        <td class="py-2 text-[#45464d]">Class ${escHtml(a.classLevel)}</td>
        <td class="py-2 text-right">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${
            a.status === 'Completed'
              ? 'bg-[#ecfdf5] text-[#009668] border border-[#a7f3d0]'
              : 'bg-[#fef3c7] text-[#92400e] border border-[#fde68a]'
          }">${escHtml(a.status)}</span>
        </td>
      </tr>`).join('');
  } catch (_) {}
}

async function loadActivity() {
  const el = document.getElementById('activityList');
  if (!el) return;
  try {
    const { activity } = await window.API.getActivity();
    if (!activity || !activity.length) {
      el.innerHTML = `<p class="text-sm text-[#45464d]">No activity yet.</p>`;
      return;
    }
    el.innerHTML = activity.map(a => `
      <div class="flex items-start gap-2">
        <span class="material-symbols-outlined text-base ${a.color || 'text-[#1d4ed8]'} mt-0.5">${a.icon || 'info'}</span>
        <div class="flex-1 min-w-0">
          <p class="text-xs leading-snug">${escHtml(a.text)}</p>
          <p class="text-[10px] text-[#76777d] mt-0.5">${escHtml(a.time)}</p>
        </div>
      </div>`).join('');
  } catch (_) {}
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}