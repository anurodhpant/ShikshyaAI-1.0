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
  document.getElementById('logoutBtn')?.addEventListener('click', doLogout);
  document.getElementById('mobileLogout')?.addEventListener('click', doLogout);

  try {
    const me = await window.API.getMyProfile();
    if (me.role !== 'student' && me.role !== 'superadmin') {
      window.location.href = '/auth';
      return;
    }
    IS_SUPERADMIN = me.role === 'superadmin';

    if (me.classLevel && GRADES.find(g => g.level === String(me.classLevel))) {
      CURRENT_CLASS = String(me.classLevel);
    }
  } catch (err) {
    window.location.href = '/auth';
    return;
  }

  renderGradePills();
  await loadClass(CURRENT_CLASS);
});

async function doLogout() {
  try { await window.API.logout(); } catch (_) {}
  try { localStorage.removeItem('shikshya_last_role'); } catch (_) {}
  window.location.href = '/auth';
}

function renderGradePills() {
  const container = document.getElementById('gradePills');
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
  document.getElementById('bannerTitle').textContent = `${grade.name} (${grade.sub})`;
  document.getElementById('bannerSub').textContent =
    CURRENT_CLASS === "10"
      ? "Includes comprehensive chapter materials, past 10 years of SEE question banks, model sets with marking schemes, and AI tutor assistance."
      : `Complete CDC-aligned curriculum for Class ${CURRENT_CLASS}. Chapter-wise notes, exercises, and AI tutor support.`;

  const grid = document.getElementById('subjectGrid');
  const empty = document.getElementById('emptyState');
  grid.innerHTML = `<div class="col-span-full text-center py-8 text-sm text-[#45464d]">Loading subjects…</div>`;

  try {
    const { curriculum, total } = await window.API.getCurriculum(CURRENT_CLASS);
    document.getElementById('subjectCount').textContent =
      total === 0 ? 'No subjects available' :
      total === 1 ? '1 Subject Available' : `${total} Subjects Available`;

    if (!curriculum.length) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    grid.innerHTML = curriculum.map(renderSubjectCard).join('');
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full text-center py-8 text-sm text-[#ba1a1a]">Could not load: ${err.message}</div>`;
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

      <div class="mt-3">
        <div class="flex items-center justify-between text-[11px] mb-1">
          <span class="text-[#45464d] flex items-center gap-1">
            <span class="material-symbols-outlined text-[13px]">science</span>
            Topic Mastery
          </span>
          <span class="font-mono font-bold text-[#0b1c30]">${item.prepared}% Prepared</span>
        </div>
        <div class="w-full bg-[#e5eeff] rounded-full h-1.5 overflow-hidden">
          <div class="h-1.5 rounded-full bg-[#1d4ed8]" style="width:${item.prepared}%"></div>
        </div>
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