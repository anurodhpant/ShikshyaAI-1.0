// SHIKSHYA AI — Auth portal logic (login, signup, school dropdown)

const DEMO = {
  superadmin:  { email: "superadmin.cdc@moest.gov.np", pw: "admin123",   icon: "shield_person",  label: "Super Admin",  color: "bg-[#fee2e2] text-[#dc2626]", name: "Anurodh Pant" },
  schooladmin: { email: "principal@kmhss.edu.np",      pw: "admin123",   icon: "corporate_fare", label: "School Admin", color: "bg-[#dbeafe] text-[#1d4ed8]", name: "Anita Sharma" },
  teacher:     { email: "t.subedi@kmhss.edu.np",       pw: "teacher123", icon: "school",         label: "Teacher",      color: "bg-[#dcfce7] text-[#16a34a]", name: "Sunita Rai" },
  student:     { email: "student.aarav@kmhss.edu.np",  pw: "student123", icon: "face",           label: "Student",      color: "bg-[#fef3c7] text-[#d97706]", name: "Aarav Shrestha" }
};

let CURRENT_ROLE = null;
let CURRENT_TAB = 'login';
let SCHOOLS = [];

// Show demo creds only during development. Change this to false before deploying.
const SHOW_DEMO_CREDS = false;

function goTo(target) {
  console.log('[Auth] Navigating to:', target);
  window.location.assign(target);
}

function hideAllDemoUI() {
  document.querySelectorAll('#demoCredsBlock').forEach(el => {
    el.style.display = SHOW_DEMO_CREDS ? 'block' : 'none';
  });
}

function updateSignupTabVisibility(role) {
  const tabSignup = document.getElementById('tabSignup');
  if (!tabSignup) return;
  // Super Admin can never sign up publicly.
  tabSignup.style.display = (role === 'superadmin') ? 'none' : 'block';
}

async function chooseRole(role) {
  const cfg = DEMO[role];
  if (!cfg) return;
  CURRENT_ROLE = role;

  document.getElementById('stepRoles').classList.add('hidden');
  document.getElementById('stepForm').classList.remove('hidden');

  const roleIconEl = document.getElementById('roleIcon');
  if (roleIconEl) roleIconEl.textContent = cfg.icon;

  const wrapEl = document.getElementById('roleIconWrap');
  if (wrapEl) wrapEl.className =
    `w-11 h-11 rounded-xl flex items-center justify-center ${cfg.color}`;

  const setVal = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  setVal('email', cfg.email);
  setVal('password', cfg.pw);
  setVal('phone', '');
  setVal('address', '');
  setVal('fullName', cfg.name);

  const dr = document.getElementById('demoRole');
  if (dr) dr.textContent = role;
  const dc = document.getElementById('demoCreds');
  if (dc) dc.textContent = `${cfg.email} / ${cfg.pw}`;

  const nameField = document.getElementById('nameField');
  if (nameField) nameField.style.display = (role === 'schooladmin') ? 'none' : 'block';

  // Switch to login tab, hide signup if superadmin
  updateSignupTabVisibility(role);
  switchTab('login');

  // Load schools
  await populateSchools('school');
  await populateSchools('su_school');

  // Sync school code with dropdown
  const schoolSel = document.getElementById('school');
  const codeInput = document.getElementById('schoolCode');
  if (schoolSel && codeInput) {
    codeInput.value = schoolSel.value || '';
    schoolSel.onchange = () => {
      codeInput.value = schoolSel.value || '';
    };
  }

  document.getElementById('loginError')?.classList.add('hidden');
  document.getElementById('signupError')?.classList.add('hidden');

  updateFormTitle();
  hideAllDemoUI();
}

function goBack() {
  CURRENT_ROLE = null;
  document.getElementById('stepForm').classList.add('hidden');
  document.getElementById('stepRoles').classList.remove('hidden');
}

function switchTab(tab) {
  // Never allow signup for superadmin
  if (tab === 'signup' && CURRENT_ROLE === 'superadmin') tab = 'login';
  CURRENT_TAB = tab;

  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    tabLogin.className = 'tab-active flex-1 py-2 rounded-md text-sm font-semibold transition-all';
    tabSignup.className = 'tab-inactive flex-1 py-2 rounded-md text-sm font-semibold transition-all hover:text-[#0b1c30]';
  } else {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    tabLogin.className = 'tab-inactive flex-1 py-2 rounded-md text-sm font-semibold transition-all hover:text-[#0b1c30]';
    tabSignup.className = 'tab-active flex-1 py-2 rounded-md text-sm font-semibold transition-all';
  }
  updateFormTitle();
}

function updateFormTitle() {
  if (!CURRENT_ROLE) return;
  const label = DEMO[CURRENT_ROLE].label;
  const kickerEl = document.getElementById('formKicker');
  const titleEl = document.getElementById('formTitle');
  if (kickerEl) kickerEl.textContent = CURRENT_TAB === 'login' ? 'Welcome back' : 'Create your account';
  if (titleEl) titleEl.textContent =
    (CURRENT_TAB === 'login' ? 'Sign in as ' : 'Sign up as ') + label;
}

async function populateSchools(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  if (sel.dataset.loaded === '1' && sel.options.length > 1) return;

  sel.innerHTML = `<option value="">📍 Getting your location…</option>`;

  let lat = null, lng = null;
  try {
    if (navigator.geolocation) {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 6000,
          maximumAge: 5 * 60 * 1000,
        });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      console.log(`[Auth] Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  } catch (err) {
    console.warn('[Auth] Geolocation denied or unavailable:', err.message);
  }

  try {
    let schools = [];
    let usingLocation = false;
    if (lat !== null && lng !== null) {
      const data = await window.API.getNearbySchools(lat, lng, 50);
      schools = data.schools || [];
      usingLocation = true;
    } else {
      const data = await window.API.getSchools();
      schools = data.schools || [];
    }
    SCHOOLS = schools;

    if (!schools.length) {
      sel.innerHTML = `<option value="">No schools found</option>`;
      return;
    }
    const header = usingLocation
      ? `— Nearby schools (within 50 km) —`
      : `— Select your school —`;
    sel.innerHTML = `<option value="">${header}</option>` +
      schools.map(s => {
        const dist = usingLocation && s.distanceKm != null ? ` · ${s.distanceKm} km` : '';
        return `<option value="${s.id}">${s.name} (${s.id})${dist}</option>`;
      }).join('');
    sel.dataset.loaded = '1';
    console.log(`[Auth] Loaded ${schools.length} schools`);
  } catch (err) {
    console.error('[Auth] Could not load schools:', err);
    sel.innerHTML = `<option value="">⚠ Could not load schools</option>`;
  }
}

function togglePassword(inputId, iconId) {
  const pw = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!pw || !icon) return;
  if (pw.type === 'password') { pw.type = 'text'; icon.innerText = 'visibility_off'; }
  else { pw.type = 'password'; icon.innerText = 'visibility'; }
}

async function handleLogin(e) {
  e.preventDefault();
  if (!CURRENT_ROLE) { alert('Please choose a role first'); return; }

  const btn = document.getElementById('submitBtn');
  const txt = document.getElementById('submitText');
  const errBox = document.getElementById('loginError');
  errBox.classList.add('hidden');

  const schoolSel = document.getElementById('school');
  const codeInput = document.getElementById('schoolCode');
  const schoolId = (schoolSel && schoolSel.value) ||
                   (codeInput && codeInput.value.trim()) || '';

  if (CURRENT_ROLE !== 'superadmin' && !schoolId) {
    errBox.innerText = 'Please select your school before signing in.';
    errBox.classList.remove('hidden');
    return;
  }

  const payload = {
    role: CURRENT_ROLE,
    name: document.getElementById('fullName').value.trim() || undefined,
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    address: document.getElementById('address').value.trim(),
    password: document.getElementById('password').value,
  };
  if (schoolId) payload.schoolId = schoolId;

  txt.innerText = 'Signing in...';
  btn.disabled = true;
  btn.classList.add('opacity-80');

  try {
    const data = await window.API.login(payload);
    console.log('[Login] server response:', data);
    try { localStorage.setItem('shikshya_last_role', data.user.role); } catch (_) {}
    try {
      if (data.user.schoolId) localStorage.setItem('shikshya_scope_school', data.user.schoolId);
      else localStorage.removeItem('shikshya_scope_school');
    } catch (_) {}
    const target = (data && data.redirect) ? data.redirect : '/auth';
    txt.innerText = 'Redirecting…';
    setTimeout(() => goTo(target), 150);
  } catch (err) {
    console.error('[Login] failed:', err);
    errBox.innerText = err.message || 'Login failed';
    errBox.classList.remove('hidden');
    txt.innerText = 'Sign In';
    btn.disabled = false;
    btn.classList.remove('opacity-80');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  if (!CURRENT_ROLE) { alert('Please choose a role first'); return; }
  if (CURRENT_ROLE === 'superadmin') {
    alert('Super Admin accounts are created by MoEST. Please sign in.');
    return;
  }

  const btn = document.getElementById('signupBtn');
  const txt = document.getElementById('signupText');
  const errBox = document.getElementById('signupError');
  errBox.classList.add('hidden');

  const payload = {
    role: CURRENT_ROLE,
    name: document.getElementById('su_name').value.trim(),
    email: document.getElementById('su_email').value.trim(),
    phone: document.getElementById('su_phone').value.trim(),
    address: document.getElementById('su_address').value.trim(),
    password: document.getElementById('su_password').value,
    schoolId: document.getElementById('su_school')?.value || '',
    classLevel: document.getElementById('su_class')?.value || ''
  };

  txt.innerText = 'Creating account...';
  btn.disabled = true;
  btn.classList.add('opacity-80');

  try {
    const data = await window.API.register(payload);
    try { localStorage.setItem('shikshya_last_role', data.user.role); } catch (_) {}
    const target = (data && data.redirect) ? data.redirect : '/auth';
    txt.innerText = 'Redirecting…';
    setTimeout(() => goTo(target), 150);
  } catch (err) {
    errBox.innerText = err.message || 'Signup failed';
    errBox.classList.remove('hidden');
    txt.innerText = 'Create Account';
    btn.disabled = false;
    btn.classList.remove('opacity-80');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Role from URL (?role=superadmin) takes priority — this is how /super-admin
  // and other role URLs send logged-out users to the correct login mode.
  const params = new URLSearchParams(window.location.search);
  const qRole = params.get('role');
  if (qRole && DEMO[qRole]) {
    await chooseRole(qRole);
  }

  // Hide demo creds block if SHOW_DEMO_CREDS is false
  hideAllDemoUI();

  // Auto-redirect if already logged in
  let navType = 'navigate';
  try {
    const entry = performance.getEntriesByType('navigation')[0];
    if (entry) navType = entry.type;
  } catch (_) {}
  if (navType === 'back_forward') return;

  try {
    const me = await window.API.me();
    if (me?.user?.role) {
      const map = {
        superadmin: '/super-admin', schooladmin: '/school-admin',
        teacher: '/teacher', student: '/student'
      };
      const target = map[me.user.role] || '/auth';
      try { localStorage.setItem('shikshya_last_role', me.user.role); } catch (_) {}
      window.location.replace(target);
    }
  } catch (_) {}
});