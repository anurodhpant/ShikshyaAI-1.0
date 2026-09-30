// ---------- Teacher dashboard logic ----------

document.addEventListener('DOMContentLoaded', async () => {
  // Logout handlers
  document.getElementById('logoutBtn')?.addEventListener('click', doLogout);
  document.getElementById('mobileLogout')?.addEventListener('click', doLogout);

  // Role check
  try {
    const me = await window.API.getMyProfile();
    if (me.role !== 'teacher') {
      window.location.href = '/auth';
      return;
    }
    const nameEl = document.getElementById('teacherName');
    if (nameEl && me.name) nameEl.textContent = me.name;
  } catch (err) {
    console.warn('[Teacher]', err.message);
    window.location.href = '/auth';
    return;
  }

  // Load uploads
  await refreshUploads();
});

async function doLogout() {
  try { await window.API.logout(); } catch (_) {}
  window.location.href = '/auth';
}

// ---------- Upload handling ----------
async function handleUpload(e) {
  e.preventDefault();

  const fileInput = document.getElementById('file');
  const subject = document.getElementById('subject').value;
  const classLevel = document.getElementById('classLevel').value;
  const title = document.getElementById('title').value;
  const msg = document.getElementById('uploadMsg');
  const btn = document.getElementById('uploadBtn');
  const btnText = document.getElementById('uploadBtnText');

  if (!fileInput.files.length) {
    showMsg('Please choose a file.', 'error'); return;
  }
  if (!subject || !classLevel) {
    showMsg('Subject and Class are required.', 'error'); return;
  }

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('subject', subject);
  formData.append('classLevel', classLevel);
  formData.append('title', title);

  btn.disabled = true;
  btnText.textContent = 'Uploading…';
  showMsg('', 'clear');

  try {
    const res = await fetch('/api/uploads', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');

    showMsg(`✔ Uploaded "${data.upload.originalName}" for Class ${classLevel} – ${subject}`, 'success');
    e.target.reset();
    await refreshUploads();
  } catch (err) {
    showMsg('✖ ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Upload';
  }
}

function showMsg(text, type) {
  const msg = document.getElementById('uploadMsg');
  msg.textContent = text;
  msg.className = 'text-sm ' + (
    type === 'error' ? 'text-[#ba1a1a]' :
    type === 'success' ? 'text-[#009668]' : 'text-[#45464d]'
  );
}

// ---------- Uploaded files list ----------
async function refreshUploads() {
  const list = document.getElementById('uploadList');
  const countEl = document.getElementById('uploadCount');
  if (!list) return;

  try {
    const { uploads, total } = await window.API.getUploads();
    countEl.textContent = `${total} file${total === 1 ? '' : 's'}`;

    if (!uploads.length) {
      list.innerHTML = `<p class="text-sm text-[#45464d]">No uploads yet. Use the form above to upload your first file.</p>`;
      return;
    }

    list.innerHTML = uploads.map(u => `
      <div class="flex items-center justify-between gap-3 p-3 rounded-lg border border-[#e2e8f0] hover:bg-[#f8fafc]">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#1d4ed8] shrink-0">
            <span class="material-symbols-outlined text-xl">${iconForExt(u.ext)}</span>
          </div>
          <div class="min-w-0">
            <p class="font-semibold text-sm truncate">${escapeHtml(u.title || u.originalName)}</p>
            <p class="text-xs text-[#45464d] font-mono truncate">
              Class ${escapeHtml(u.classLevel)} · ${escapeHtml(u.subject)} · ${u.sizeKB} KB · ${escapeHtml(u.uploadedBy)}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <a href="${u.url}" download
            class="px-3 py-1.5 text-xs font-semibold bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-md flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">download</span> Download
          </a>
        </div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<p class="text-sm text-[#ba1a1a]">Could not load uploads: ${err.message}</p>`;
  }
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

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}