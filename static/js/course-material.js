function getQuery() {
  const p = new URLSearchParams(window.location.search);
  return {
    classLevel: p.get('class') || '',
    subject: p.get('subject') || ''
  };
}

const { classLevel: Q_CLASS, subject: Q_SUBJECT } = getQuery();

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('logoutBtn')?.addEventListener('click', doLogout);
  document.getElementById('mobileLogout')?.addEventListener('click', doLogout);

  let me;
  try {
    me = await window.API.getMyProfile();
    // Everyone with a session can view course material (incl. Super Admin)
    if (!['student', 'teacher', 'schooladmin', 'superadmin'].includes(me.role)) {
      window.location.href = '/auth';
      return;
    }
  } catch (_) {
    window.location.href = '/auth';
    return;
  }

  // Set back link based on role
  const backMap = {
    student: '/student',
    teacher: '/teacher',
    schooladmin: '/school-admin',
    superadmin: '/super-admin'
  };
  const backUrl = backMap[me.role] || '/student';
  document.getElementById('backHome').href = backUrl;
  document.getElementById('backLink').href = backUrl;

  // Render header
  const title = document.getElementById('pageTitle');
  const sub = document.getElementById('pageSubtitle');
  if (Q_SUBJECT && Q_CLASS) {
    title.textContent = Q_SUBJECT;
    sub.textContent = `Class ${Q_CLASS} · All uploaded material`;
  } else if (Q_SUBJECT) {
    title.textContent = Q_SUBJECT;
    sub.textContent = `All uploaded material`;
  } else if (Q_CLASS) {
    title.textContent = `Class ${Q_CLASS}`;
    sub.textContent = `All uploaded material`;
  } else {
    title.textContent = 'All Course Material';
    sub.textContent = 'Every file uploaded by teachers';
  }

  const color = colorForSubject(Q_SUBJECT);
  const wrap = document.getElementById('subjectIconWrap');
  const icon = document.getElementById('subjectIcon');
  wrap.className = `w-14 h-14 rounded-xl ${color.bg} flex items-center justify-center ${color.fg} shrink-0`;
  icon.textContent = color.icon;

  await loadFiles();
});

async function doLogout() {
  try { await window.API.logout(); } catch (_) {}
  window.location.href = '/auth';
}

async function loadFiles() {
  const grid = document.getElementById('filesGrid');
  const empty = document.getElementById('emptyState');

  grid.innerHTML = `<div class="col-span-full text-center py-8 text-sm text-[#45464d]">Loading material…</div>`;

  try {
    const { uploads } = await window.API.getUploads();

    const filtered = (uploads || []).filter(u => {
      const clsOk = !Q_CLASS || String(u.classLevel) === String(Q_CLASS);
      const subOk = !Q_SUBJECT || String(u.subject).toLowerCase() === Q_SUBJECT.toLowerCase();
      return clsOk && subOk;
    });

    if (!filtered.length) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    grid.innerHTML = filtered.map(renderFileCard).join('');
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full text-center py-8 text-sm text-[#ba1a1a]">Could not load: ${err.message}</div>`;
  }
}

function renderFileCard(u) {
  const isPdf = (u.ext || '').toLowerCase() === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg'].includes((u.ext || '').toLowerCase());
  const canOpenInline = isPdf || isImage;

  return `
    <div class="file-card bg-white border border-[#e2e8f0] rounded-xl p-4 flex flex-col">
      <div class="flex items-start gap-3">
        <div class="w-11 h-11 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#1d4ed8] shrink-0">
          <span class="material-symbols-outlined text-2xl">${iconForExt(u.ext)}</span>
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="font-bold text-sm truncate" title="${escapeHtml(u.title || u.originalName)}">
            ${escapeHtml(u.title || u.originalName)}
          </h3>
          <p class="text-xs text-[#45464d] font-mono truncate mt-0.5">
            Class ${escapeHtml(u.classLevel)} · ${escapeHtml(u.subject)}
          </p>
          <p class="text-[11px] text-[#76777d] mt-0.5">
            ${u.sizeKB} KB · ${escapeHtml(u.uploadedBy || '')}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 mt-4">
        ${canOpenInline ? `
          <a href="${u.url}" target="_blank" rel="noopener"
            class="flex-1 py-2 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all">
            <span class="material-symbols-outlined text-base">open_in_new</span>
            Open
          </a>
        ` : ''}
        <a href="${u.url}" download
          class="${canOpenInline ? 'flex-1' : 'w-full'} py-2 rounded-lg border border-[#c6c6cd] hover:bg-[#eff4ff] text-[#0b1c30] text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all">
          <span class="material-symbols-outlined text-base">download</span>
          Download
        </a>
      </div>
    </div>`;
}

function iconForExt(ext) {
  const map = {
    pdf: 'picture_as_pdf',
    doc: 'description', docx: 'description',
    ppt: 'slideshow', pptx: 'slideshow',
    png: 'image', jpg: 'image', jpeg: 'image'
  };
  return map[(ext || '').toLowerCase()] || 'insert_drive_file';
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