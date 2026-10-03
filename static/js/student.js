// SHIKSHYA AI — Student dashboard
// Renders layout + page content, then loads curriculum subjects.

const GRADES = [
  { level: "6",  name: "Class 6",  sub: "Basic Foundation",   tag: "LOWER SEC" },
  { level: "7",  name: "Class 7",  sub: "Bridge Level",       tag: "LOWER SEC" },
  { level: "8",  name: "Class 8",  sub: "Basic Level",        tag: "DISTRICT BOARD" },
  { level: "9",  name: "Class 9",  sub: "Pre-SEC Course",     tag: "SECONDARY" },
  { level: "10", name: "Class 10", sub: "SEE Curriculum",     tag: "NATIONAL BOARD" },
  { level: "11", name: "Class 11", sub: "NEB Grade 11",       tag: "HIGHER SEC" },
  { level: "12", name: "Class 12", sub: "NEB Grade 12",       tag: "HIGHER SEC" }
];

let CURRENT_CLASS = "10";
let IS_SUPERADMIN = false;

document.addEventListener('DOMContentLoaded', async () => {
  // ---- 1. Fetch user ----
  let me;
  try {
    me = await window.API.getMyProfile();
  } catch (err) {
    window.location.href = '/auth?role=student';
    return;
  }
  if (me.role !== 'student' && me.role !== 'superadmin') {
    window.location.href = '/auth?role=student';
    return;
  }
  IS_SUPERADMIN = me.role === 'superadmin';
  if (me.classLevel && GRADES.find(g => g.level === String(me.classLevel))) {
    CURRENT_CLASS = String(me.classLevel);
  }

  // ---- 2. Fetch school info for topbar ----
  let schoolName = '', schoolAddr = '';
  if (me.schoolId) {
    try {
      const s = await window.API.getSchool(me.schoolId);
      schoolName = s.name;
      schoolAddr = s.province;
    } catch (_) {}
  }

  // ---- 3. Render shared sidebar + topbar into #layout-root ----
  const role = IS_SUPERADMIN ? 'superadmin' : 'student';
  const subMap = { schooladmin:'School Admin', teacher:'Teacher', student:'Student', superadmin:'Super Admin' };
  const avatar = (me.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (typeof window.renderLayout === 'function') {
    window.renderLayout({
      role,
      active: 'dashboard',
      userName: me.name,
      userSub: subMap[role] || 'Student',
      userAvatar: avatar,
      schoolName,
      schoolAddr
    });
  }

  // ---- 4. Inject page content into #page-content ----
  const content = window.getPageContent ? window.getPageContent() : document.getElementById('page-content');
  if (!content) {
    console.error('[Student] #page-content not found — layout.js did not run.');
    return;
  }

  content.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight">Select Your Class &amp; Curriculum</h1>
        <p class="text-sm text-[#45464d] mt-0.5">CDC-aligned textbooks, past questions and AI tutoring</p>
      </div>
      <div class="flex items-center gap-2 bg-[#ecfdf5] text-[#009668] text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#a7f3d0]">
        <span class="material-symbols-outlined text-sm">verified</span>
        <span>B.S. 2081 · 2082</span>
      </div>
    </div>

    <div class="bg-white border border-[#e2e8f0] rounded-xl p-4">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#1d4ed8]">school</span>
          <h2 class="font-bold">Choose Grade Level</h2>
        </div>
        <p class="text-xs text-[#45464d]">Select one to view available subjects</p>
      </div>
      <div class="overflow-x-auto no-scrollbar -mx-1 px-1">
        <div id="gradePills" class="flex items-center gap-2 min-w-max"></div>
      </div>
    </div>

    <div id="classBanner" class="bg-white border border-[#e2e8f0] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-lg bg-[#1d4ed8] flex items-center justify-center text-white shrink-0">
          <span class="material-symbols-outlined text-2xl">menu_book</span>
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-lg font-bold" id="bannerTitle">Class 10 (SEE Curriculum)</h2>
            <span class="px-2 py-0.5 rounded-md bg-[#16a34a] text-white text-[11px] font-bold">NEB CDC Pattern</span>
          </div>
          <p class="text-sm text-[#45464d] mt-1" id="bannerSub">Includes comprehensive chapter materials and AI tutor assistance.</p>
        </div>
      </div>
      <div class="flex items-center gap-2 text-xs font-semibold text-[#1d4ed8] whitespace-nowrap">
        <span class="material-symbols-outlined text-base">list_alt</span>
        <span id="subjectCount">—</span>
      </div>
    </div>

    <div id="subjectGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>

    <div id="emptyState" class="hidden text-center py-12 bg-white border border-dashed border-[#c6c6cd] rounded-xl">
      <span class="material-symbols-outlined text-4xl text-[#76777d]">inbox</span>
      <p class="text-sm text-[#45464d] mt-2">No subjects loaded for this class yet.</p>
    </div>
  `;

  // ---- 5. Wire logout buttons (if layout.js didn't) ----
  document.getElementById('logoutBtn')?.addEventListener('click', doLogout);
  document.getElementById('mobileLogout')?.addEventListener('click', doLogout);

  // ---- 6. Now that #gradePills exists, render pills and load subjects ----
  renderGradePills();
  await loadClass(CURRENT_CLASS);
});

async function doLogout() {
  try { await window.API.logout(); } catch (_) {}
  try { localStorage.removeItem('shikshya_last_role'); } catch (_) {}
  window.location.href = '/auth?role=student';
}

function renderGradePills() {
  const container = document.getElementById('gradePills');
  if (!container) return;
  container.innerHTML = GRADES.map(g => {
    const active = g.level === CURRENT_CLASS;
    return `
      <button onclick="loadClass('${g.level}')"
        class="grade-pill ${active ? 'active' : ''} shrink-0 px-3 py-2 rounded-lg border ${active ? 'border-[#1d4ed8] bg-[#1d4ed8] text-white' : 'border-[#e2e8f0] bg-white text-[#0b1c30]'} text-left min-w-[130px]">
        <div class="text-[10px] font-bold uppercase tracking-wider ${active ? 'text-white/80' : 'text-[#76777d]'}">${g.tag}</div>
        <div class="font-bold text-sm mt-0.5 ${active ? 'text-white' : 'text-[#0b1c30]'}">${g.name}</div>
        <div class="text-[11px] ${active ? 'text-white/80' : 'text-[#45464d]'}">${g.sub}</div>
      </button>`;
  }).join('');
}

async function loadClass(level) {
  CURRENT_CLASS = String(level);
  renderGradePills();

  const grade = GRADES.find(g => g.level === CURRENT_CLASS);
  const titleEl = document.getElementById('bannerTitle');
  const subEl = document.getElementById('bannerSub');
  const countEl = document.getElementById('subjectCount');
  const grid = document.getElementById('subjectGrid');
  const empty = document.getElementById('emptyState');
  if (!grade || !grid) return;

  if (titleEl) titleEl.textContent = `${grade.name} (${grade.sub})`;
  if (subEl) subEl.textContent = CURRENT_CLASS === "10"
    ? "Includes comprehensive chapter materials, past 10 years of SEE question banks, model sets with marking schemes, and AI tutor assistance."
    : `Complete CDC-aligned curriculum for Class ${CURRENT_CLASS}. Chapter-wise notes, exercises, and AI tutor support.`;

  grid.innerHTML = `<div class="col-span-full text-center py-8 text-sm text-[#45464d]">Loading subjects…</div>`;

  try {
    const { curriculum, total } = await window.API.getCurriculum(CURRENT_CLASS);
    if (countEl) countEl.textContent =
      total === 0 ? 'No subjects available' :
      total === 1 ? '1 Subject Available' : `${total} Subjects Available`;

    if (!curriculum || !curriculum.length) {
      grid.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    grid.innerHTML = curriculum.map(renderSubjectCard).join('');
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full text-center py-8 text-sm text-[#ba1a1a]">Error: ${escapeHtml(err.message)}</div>`;
  }
}

function renderSubjectCard(item) {
  const color = colorForSubject(item.subject);
  const chipLines = [];
  chipLines.push(`<span class="flex items-center gap-1 text-xs text-[#45464d]">
    <span class="material-symbols-outlined text-[14px]">menu_book</span>
    ${item.chapters} Chapters
  </span>`);
  if (item.problems) {
    chipLines.push(`<span class="flex items-center gap-1 text-xs text-[#45464d]">
      <span class="material-symbols-outlined text-[14px]">edit_note</span>
      ${item.problems}+ Solved Problems
    </span>`);
  }
  if (item.videos) {
    chipLines.push(`<span class="flex items-center gap-1 text-xs text-[#45464d]">
      <span class="material-symbols-outlined text-[14px]">play_circle</span>
      Practice + Video Notes
    </span>`);
  }

  const url = `/course-material?class=${encodeURIComponent(CURRENT_CLASS)}&subject=${encodeURIComponent(item.subject)}`;

  return `
    <div class="subject-card bg-white border border-[#e2e8f0] rounded-xl p-4 flex flex-col">
      <div class="flex items-start justify-between mb-3">
        <div class="w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center ${color.fg}">
          <span class="material-symbols-outlined text-xl">${color.icon}</span>
        </div>
        <span class="px-2 py-0.5 rounded-md bg-[#eff6ff] text-[#1d4ed8] text-[10px] font-bold whitespace-nowrap">
          ${escapeHtml(item.code || 'CDC 2081 Syllabus')}
        </span>
      </div>

      <h3 class="font-bold text-base leading-snug">${escapeHtml(item.subject)}</h3>
      <p class="text-xs text-[#45464d] mt-1">${escapeHtml(item.topic || 'CDC Syllabus')}</p>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3">
        ${chipLines.join('')}
      </div>

      <a href="${url}"
        class="mt-4 w-full py-2.5 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all">
        Enter Course Material
        <span class="material-symbols-outlined text-base">arrow_forward</span>
      </a>
    </div>`;
}

function colorForSubject(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('sci') || n.includes('phys') || n.includes('chem') || n.includes('bio')) return { bg: 'bg-[#dcfce7]', fg: 'text-[#16a34a]', icon: 'science' };
  if (n.includes('math')) return { bg: 'bg-[#dbeafe]', fg: 'text-[#1d4ed8]', icon: 'functions' };
  if (n.includes('eng') || n.includes('nep') || n.includes('social') || n.includes('history')) return { bg: 'bg-[#fee2e2]', fg: 'text-[#dc2626]', icon: 'menu_book' };
  if (n.includes('comp')) return { bg: 'bg-[#ede9fe]', fg: 'text-[#7c3aed]', icon: 'code' };
  if (n.includes('account') || n.includes('econ')) return { bg: 'bg-[#fef3c7]', fg: 'text-[#d97706]', icon: 'calculate' };
  return { bg: 'bg-[#e5eeff]', fg: 'text-[#1d4ed8]', icon: 'book_2' };
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}