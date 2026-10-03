// My Profile — role-aware page with view + edit.

document.addEventListener('DOMContentLoaded', async () => {
  let me;
  try { me = await window.API.getMyProfile(); }
  catch (_) { window.location.href = '/auth'; return; }

  const role = me.role;
  const subMap = { schooladmin:'School Admin', teacher:'Teacher', student:'Student', superadmin:'Super Admin' };
  const avatar = (me.name||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  let schoolName = '', schoolAddr = '';
  if (me.schoolId) {
    try { const s = await window.API.getSchool(me.schoolId); schoolName = s.name; schoolAddr = s.province; } catch(_) {}
  }

  window.renderLayout({
    role, active: 'profile',
    userName: me.name, userSub: subMap[role] || 'User', userAvatar: avatar,
    schoolName, schoolAddr
  });

  const content = window.getPageContent();
  content.innerHTML = `
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight">My Profile</h1>
      <p class="text-sm text-[#45464d] mt-0.5">View and edit your account details</p>
    </div>
    <div id="profileBody"><p class="text-sm text-[#45464d]">Loading…</p></div>
  `;

  await renderProfile(role);
});

async function renderProfile(role) {
  let profile = {};
  try {
    const data = await window.API.getProfile();
    profile = data.user || data;
  } catch (err) {
    document.getElementById('profileBody').innerHTML =
      `<p class="text-sm text-[#ba1a1a]">Error: ${escapeHtml(err.message)}</p>`;
    return;
  }

  const initial = (profile.name||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  const commonFields = [
    { key:'name',    label:'Full Name',     type:'text' },
    { key:'email',   label:'Email',         type:'email', readonly:true },
    { key:'phone',   label:'Phone Number',  type:'tel' },
    { key:'address', label:'Address',       type:'text' },
    { key:'emergencyContact', label:'Emergency Contact', type:'tel' },
    { key:'about',   label:'About',         type:'textarea' },
  ];

  const roleFields = {
    superadmin: [
      { key:'ministry', label:'Ministry / Department', type:'text' },
      { key:'designation', label:'Designation', type:'text' },
    ],
    schooladmin: [
      { key:'designation', label:'Designation (Principal / Vice Principal)', type:'text' },
      { key:'qualification', label:'Qualification', type:'text' },
    ],
    teacher: [
      { key:'subject', label:'Subject Specialty', type:'text' },
      { key:'qualification', label:'Qualification', type:'text' },
      { key:'experience', label:'Years of Experience', type:'number' },
    ],
    student: [
      { key:'classLevel', label:'Class', type:'text', readonly:true },
      { key:'section', label:'Section', type:'text' },
      { key:'roll', label:'Roll No.', type:'number' },
      { key:'guardian', label:'Guardian Name', type:'text' },
    ],
  };

  const allFields = [...commonFields, ...(roleFields[role] || [])];

  const body = document.getElementById('profileBody');
  body.innerHTML = `
    <div class="bg-white border border-[#e2e8f0] rounded-xl p-5">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-20 h-20 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center text-2xl font-bold">${escapeHtml(initial)}</div>
        <div class="flex-1 min-w-0">
          <h2 class="text-xl font-bold">${escapeHtml(profile.name||'—')}</h2>
          <p class="text-sm text-[#45464d] capitalize">${escapeHtml(role)}</p>
          <div class="text-xs text-[#45464d] mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">mail</span>${escapeHtml(profile.email||'—')}</span>
            ${profile.phone ? `<span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">call</span>${escapeHtml(profile.phone)}</span>` : ''}
          </div>
        </div>
        <button id="editProfileBtn" class="flex items-center gap-1.5 bg-black text-white font-semibold text-sm h-10 px-4 rounded-lg hover:bg-[#1e293b]">
          <span class="material-symbols-outlined text-base">edit</span> Edit Profile
        </button>
      </div>
    </div>

    <div id="profileView" class="bg-white border border-[#e2e8f0] rounded-xl p-5">
      <h3 class="font-bold mb-4">Details</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${allFields.map(f => `
          <div class="${f.type === 'textarea' ? 'md:col-span-2' : ''}">
            <p class="text-xs font-semibold text-[#45464d] uppercase tracking-wide">${escapeHtml(f.label)}</p>
            <p class="text-sm mt-0.5">${escapeHtml(profile[f.key] ?? '—') || '—'}</p>
          </div>`).join('')}
      </div>
    </div>

    <div id="profileEdit" class="hidden bg-white border border-[#e2e8f0] rounded-xl p-5">
      <h3 class="font-bold mb-4">Edit Profile</h3>
      <form id="editProfileForm" class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${allFields.map(f => `
          <div class="${f.type === 'textarea' ? 'md:col-span-2' : ''}">
            <label class="block text-xs font-semibold text-[#45464d] mb-1.5" for="f_${f.key}">${escapeHtml(f.label)}</label>
            ${f.type === 'textarea'
              ? `<textarea id="f_${f.key}" rows="3" class="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm bg-white">${escapeHtml(profile[f.key] ?? '')}</textarea>`
              : `<input id="f_${f.key}" type="${f.type}" value="${escapeHtml(profile[f.key] ?? '')}" ${f.readonly ? 'readonly' : ''}
                  class="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm bg-white ${f.readonly ? 'opacity-60' : ''}"/>`
            }
          </div>`).join('')}
        <div class="md:col-span-2 flex items-center gap-2 pt-2">
          <button type="submit" class="px-5 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-lg text-sm font-semibold">Save Changes</button>
          <button type="button" id="cancelEditBtn" class="px-5 py-2.5 border border-[#c6c6cd] rounded-lg text-sm font-semibold">Cancel</button>
          <p id="profileMsg" class="text-sm ml-2"></p>
        </div>
      </form>
    </div>

    <div class="bg-white border border-[#e2e8f0] rounded-xl p-5">
      <h3 class="font-bold mb-4">Security</h3>
      <form id="passwordForm" class="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
        <div>
          <label class="block text-xs font-semibold text-[#45464d] mb-1.5" for="oldPassword">Current Password</label>
          <div class="relative">
            <input id="oldPassword" type="password" required
              class="w-full px-3 py-2 pr-11 border border-[#c6c6cd] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/30 focus:border-[#1d4ed8]"/>
            <button type="button" aria-label="Show or hide password"
              onclick="togglePassword('oldPassword','oldPwIcon')"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-[#45464d] hover:text-[#0b1c30]">
              <span id="oldPwIcon" class="material-symbols-outlined text-lg">visibility</span>
            </button>
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#45464d] mb-1.5" for="newPassword">New Password</label>
          <div class="relative">
            <input id="newPassword" type="password" required minlength="8"
              class="w-full px-3 py-2 pr-11 border border-[#c6c6cd] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/30 focus:border-[#1d4ed8]"/>
            <button type="button" aria-label="Show or hide password"
              onclick="togglePassword('newPassword','newPwIcon')"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-[#45464d] hover:text-[#0b1c30]">
              <span id="newPwIcon" class="material-symbols-outlined text-lg">visibility</span>
            </button>
          </div>
        </div>
        <div class="md:col-span-2">
          <button type="submit" class="px-5 py-2.5 bg-black text-white rounded-lg text-sm font-semibold">Update Password</button>
          <p id="passwordMsg" class="text-sm mt-2 inline-block ml-3"></p>
        </div>
      </form>
    </div>
  `;

  document.getElementById('editProfileBtn')?.addEventListener('click', () => {
    document.getElementById('profileView').classList.add('hidden');
    document.getElementById('profileEdit').classList.remove('hidden');
  });
  document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
    document.getElementById('profileEdit').classList.add('hidden');
    document.getElementById('profileView').classList.remove('hidden');
  });

  document.getElementById('editProfileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {};
    allFields.forEach(f => {
      if (f.readonly) return;
      const el = document.getElementById('f_' + f.key);
      if (el) payload[f.key] = el.value.trim();
    });
    try {
      await window.API.updateProfile(payload);
      document.getElementById('profileMsg').textContent = '✔ Saved';
      document.getElementById('profileMsg').className = 'text-sm text-[#009668] ml-2';
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      document.getElementById('profileMsg').textContent = '✖ ' + err.message;
      document.getElementById('profileMsg').className = 'text-sm text-[#ba1a1a] ml-2';
    }
  });

  document.getElementById('passwordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    try {
      await window.API.changePassword({ oldPassword, newPassword });
      document.getElementById('passwordMsg').textContent = '✔ Password updated';
      document.getElementById('passwordMsg').className = 'text-sm mt-2 inline-block ml-3 text-[#009668]';
      document.getElementById('passwordForm').reset();
    } catch (err) {
      document.getElementById('passwordMsg').textContent = '✖ ' + err.message;
      document.getElementById('passwordMsg').className = 'text-sm mt-2 inline-block ml-3 text-[#ba1a1a]';
    }
  });
}

// Password show/h