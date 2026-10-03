document.addEventListener('DOMContentLoaded', async () => {
  let me;
  try { me = await window.API.getMyProfile(); }
  catch (_) { window.location.href = '/auth?role=teacher'; return; }
  if (me.role !== 'teacher' && me.role !== 'superadmin') {
    window.location.href = '/auth?role=teacher';
    return;
  }

  const role = me.role === 'superadmin' ? 'superadmin' : 'teacher';
  const subMap = { schooladmin:'School Admin', teacher:'Teacher', student:'Student', superadmin:'Super Admin' };
  const avatar = (me.name||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  let schoolName = '', schoolAddr = '';
  if (me.schoolId) {
    try { const s = await window.API.getSchool(me.schoolId); schoolName = s.name; schoolAddr = s.province; } catch(_){}
  }

  window.renderLayout({
    role, active:'dashboard',
    userName: me.name, userSub: subMap[role] || 'Teacher', userAvatar: avatar,
    schoolName, schoolAddr
  });

  const content = window.getPageContent();
  content.innerHTML = `
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight">Welcome, ${escapeHtml(me.name || 'Teacher')}</h1>
        <p class="text-sm text-[#45464d] mt-0.5">${escapeHtml(schoolName || 'Your School')}</p>
      </div>
      <button id="addStudentBtn" class="flex items-center justify-center gap-1.5 bg-black text-white font-semibold text-sm h-10 px-4 rounded-lg">
        <span class="material-symbols-outlined text-base">person_add</span> Add Student
      </button>
    </div>

    <section class="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm">
      <div class="flex items-center gap-2 mb-4">
        <span class="material-symbols-outlined text-[#0051d5]">cloud_upload</span>
        <h2 class="text-xl font-bold">Upload Study Material</h2>
      </div>

      <form id="uploadForm" class="space-y-4" onsubmit="handleUpload(event)">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-semibold mb-1.5" for="subject">Subject <span class="text-[#ba1a1a]">*</span></label>
            <select id="subject" required class="w-full px-3.5 py-2.5 border border-[#c6c6cd] rounded-lg text-sm bg-white">
              <option value="">— Select subject —</option>
              <option>Mathematics</option><option>Science</option><option>English</option>
              <option>Nepali</option><option>Social Studies</option><option>Computer Science</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1.5" for="classLevel">Class <span class="text-[#ba1a1a]">*</span></label>
            <select id="classLevel" required class="w-full px-3.5 py-2.5 border border-[#c6c6cd] rounded-lg text-sm bg-white">
              <option value="">— Select class —</option>
              <option>6</option><option>7</option><option>8</option><option>9</option>
              <option>10</option><option>11</option><option>12</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1.5" for="title">Title (optional)</label>
          <input id="title" type="text" class="w-full px-3.5 py-2.5 border border-[#c6c6cd] rounded-lg text-sm bg-white"/>
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1.5" for="file">File <span class="text-[#ba1a1a]">*</span></label>
          <input id="file" type="file" required accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
            class="w-full text-sm file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-[#1d4ed8] file:text-white file:font-semibold border border-[#c6c6cd] rounded-lg bg-white"/>
        </div>
        <div class="flex items-center justify-between flex-wrap gap-2">
          <p id="uploadMsg" class="text-sm"></p>
          <button type="submit" class="px-5 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-lg text-sm font-semibold flex items-center gap-2">
            <span class="material-symbols-outlined text-base">upload</span><span id="uploadBtnText">Upload</span>
          </button>
        </div>
      </form>
    </section>

    <section class="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#0051d5]">folder_open</span>
          <h2 class="text-xl font-bold">Uploaded Materials</h2>
        </div>
        <span id="uploadCount" class="text-xs bg-[#e5eeff] px-2 py-0.5 rounded font-mono">0 files</span>
      </div>
      <div id="uploadList" class="space-y-2"><p class="text-sm text-[#45464d]">Loading…</p></div>
    </section>
  `;

  document.getElementById('addStudentBtn')?.addEventListener('click', openUserModal);
  await refreshUploads();
});

async function openUserModal() {
  const me = await window.API.getMyProfile();
  document.getElementById('addUserForm').reset();
  document.getElementById('u_schoolId').value = me.schoolId || '';
  document.getElementById('u_password').value = 'password123';
  document.getElementById('u_section').value = 'A';
  document.getElementById('u_error').classList.add('hidden');
  document.getElementById('addUserModal').classList.remove('hidden');
}

function closeUserModal() {
  document.getElementById('addUserModal').classList.add('hidden');
}

async function submitUserForm(e) {
  e.preventDefault();
  try {
    await window.API.createUser({
      role: 'student',
      name: document.getElementById('u_name').value.trim(),
      email: document.getElementById('u_email').value.trim(),
      phone: document.getElementById('u_phone').value.trim(),
      address: document.getElementById('u_address').value.trim(),
      schoolId: document.getElementById('u_schoolId').value,
      password: document.getElementById('u_password').value,
      classLevel: document.getElementById('u_classLevel').value,
      section: document.getElementById('u_section').value.trim(),
    });
    closeUserModal();
    alert('Student added.');
  } catch (err) {
    const errBox = document.getElementById('u_error');
    errBox.textContent = err.message;
    errBox.classList.remove('hidden');
  }
}

async function handleUpload(e) {
  e.preventDefault();
  const fileInput = document.getElementById('file');
  const subject = document.getElementById('subject').value;
  const classLevel = document.getElementById('classLevel').value;
  const title = document.getElementById('title').value;
  const msg = document.getElementById('uploadMsg');

  if (!fileInput.files.length) { msg.textContent = 'Please choose a file.'; msg.className='text-sm text-[#ba1a1a]'; return; }
  if (!subject || !classLevel) { msg.textContent = 'Subject and Class are required.'; msg.className='text-sm text-[#ba1a1a]'; return; }

  const fd = new FormData();
  fd.append('file', fileInput.files[0]);
  fd.append('subject', subject);
  fd.append('classLevel', classLevel);
  fd.append('title', title);

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;

  try {
    const res = await fetch('/api/uploads', { method:'POST', body:fd, credentials:'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    msg.textContent = `✔ Uploaded "${data.upload.originalName}"`;
    msg.className = 'text-sm text-[#009668]';
    e.target.reset();
    await refreshUploads();
  } catch (err) {
    msg.textContent = '✖ ' + err.message;
    msg.className = 'text-sm text-[#ba1a1a]';
  } finally {
    btn.disabled = false;
  }
}

async function refreshUploads() {
  const list = document.getElementById('uploadList');
  const countEl = document.getElementById('uploadCount');
  try {
    const { uploads, total } = await window.API.getUploads();
    countEl.textContent = `${total} file${total === 1 ? '' : 's'}`;
    if (!uploads.length) {
      list.innerHTML = `<p class="text-sm text-[#45464d]">No uploads yet.</p>`;
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
            <p class="text-xs text-[#45464d] font-mono truncate">Class ${escapeHtml(u.classLevel)} · ${escapeHtml(u.subject)} · ${u.sizeKB} KB</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <a href="${u.url}" target="_blank" rel="noopener" class="px-3 py-1.5 text-xs font-semibold border border-[#c6c6cd] hover:bg-[#eff4ff] rounded-md flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">open_in_new</span> Open
          </a>
          <a href="${u.url}" download class="px-3 py-1.5 text-xs font-semibold bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-md flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">download</span> Download
          </a>
        </div>
      </div>`).join('');
  } catch (err) {
    list.innerHTML = `<p class="text-sm text-[#ba1a1a]">Error: ${err.message}</p>`;
  }
}

function iconForExt(ext) {
  const map = { pdf:'picture_as_pdf', doc:'description', docx:'description',
                ppt:'slideshow', pptx:'slideshow', png:'image', jpg:'image', jpeg:'image' };
  return map[(ext||'').toLowerCase()] || 'insert_drive_file';
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}