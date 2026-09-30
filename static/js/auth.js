const DEMO = {
  superadmin:  { email: "superadmin.cdc@moest.gov.np", pw: "admin123",   icon: "shield_person",  label: "Super Admin",  color: "bg-[#fee2e2] text-[#dc2626]" },
  schooladmin: { email: "principal@kmhss.edu.np",      pw: "admin123",   icon: "corporate_fare", label: "School Admin", color: "bg-[#dbeafe] text-[#1d4ed8]" },
  teacher:     { email: "t.subedi@kmhss.edu.np",       pw: "teacher123", icon: "school",         label: "Teacher",      color: "bg-[#dcfce7] text-[#16a34a]" },
  student:     { email: "student.aarav@kmhss.edu.np",  pw: "student123", icon: "face",           label: "Student",      color: "bg-[#fef3c7] text-[#d97706]" }
};

let CURRENT_ROLE = null;
let CURRENT_TAB = 'login';

// ---------- Redirect helper ----------
function goTo(target) {
  console.log('[Auth] Navigating to:', target);
  try { window.location.replace(target); }
  catch (e) { window.location.href = target; }
}

// ---------- Role picker ----------
async function chooseRole(role) {
  const cfg = DEMO[role];
  if (!cfg) return;
  CURRENT_ROLE = role;

  document.getElementById('stepRoles').classList.add('hidden');
  document.getElementById('stepForm').classList.remove('hidden');

  // Header
  document.getElementById('roleIcon').textContent = cfg.icon;
  document.getElementById('roleIconWrap').className =
    `w-11 h-11 rounded-xl flex items-center justify-center ${cfg.color}`;

  // Prefill demo creds
  document.getElementById('email').value = cfg.email;
  document.getElementById('password').value = cfg.pw;
  document.getElementById('phone').value = '';
  document.getElementById('address').value = '';
  document.getElementById('demoRole').textContent = role;
  document.getElementById('demoCreds').textContent = `${cfg.email} / ${cfg.pw}`;

  // Show/hide school + class fields
  const isSuper = role === 'superadmin';
  document.getElementById('schoolField')?.classList.toggle('hidden', isSuper);
  document.getElementById('su_schoolField')?.classList.toggle('hidden', isSuper);
  document.getElementById('su_classField')?.classList.toggle('hidden', role !== 'student');

  if (!isSuper) {
    await populateSchools('school');
    await populateSchools('su_school');
  }

  // Clear previous errors
  document.getElementById('loginError')?.classList.add('hidden');
  document.getElementById('signupError')?.classList.add('hidden');

  // Update form title based on current tab
  updateFormTitle();
  switchTab('login');
}

function goBack() {
  CURRENT_ROLE = null;
  document.getElementById('stepForm').classList.add('hidden');
  document.getElementById('stepRoles').classList.remove('hidden');
}

// ---------- Tab switcher ----------
function switchTab(tab) {
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
  const kicker = document.getElementById('formKicker');
  const title = document.getElementById('formTitle');
  if (CURRENT_TAB === 'login') {
    kicker.textContent = 'Welcome back';
    title.textContent = `Sign in as ${label}`;
  } else {
    kicker.textContent = 'Create your account';
    title.textContent = `Sign up as ${label}`;
  }
}

// ---------- Schools list ----------
async function populateSchools(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel || sel.dataset.loaded) return;
  try {
    const { schools } = await window.API.getSchools();
    sel.innerHTML = `<option value="">— Select school —</option>` +
      schools.map(s => `<option value="${s.id}">${s.name} (${s.id})</option>`).join('');
    sel.dataset.loaded = '1';
  } catch (e) {
    console.warn('Could not load schools', e);
  }
}

// ---------- Show/hide password ----------
function togglePassword(inputId, iconId) {
  const pw = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!pw || !icon) return;
  if (pw.type === 'password') { pw.type = 'text'; icon.innerText = 'visibility_off'; }
  else { pw.type = 'password'; icon.innerText = 'visibility'; }
}

// ---------- LOGIN ----------
async function handleLogin(e) {
  e.preventDefault();
  if (!CURRENT_ROLE) { alert('Please choose a role first'); return; }

  const btn = document.getElementById('submitBtn');
  const txt = document.getElementById('submitText');
  const errBox = document.getElementById('loginError');
  errBox.classList.add('hidden');

  const payload = {
    role: CURRENT_ROLE,
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    address: document.getElementById('address').value.trim(),
    password: document.getElementById('password').value
  };

  txt.innerText = 'Signing in...';
  btn.disabled = true;
  btn.classList.add('opacity-80');

  try {
    const data = await window.API.login(payload);
    console.log('[Login] server response:', data);
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

// ---------- SIGNUP ----------
async function handleSignup(e) {
  e.preventDefault();
  if (!CURRENT_ROLE) { alert('Please choose a role first'); return; }

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
    console.log('[Signup] server response:', data);
    const target = (data && data.redirect) ? data.redirect : '/auth';
    txt.innerText = 'Redirecting…';
    setTimeout(() => goTo(target), 150);
  } catch (err) {
    console.error('[Signup] failed:', err);
    errBox.innerText = err.message || 'Signup failed';
    errBox.classList.remove('hidden');
    txt.innerText = 'Create Account';
    btn.disabled = false;
    btn.classList.remove('opacity-80');
  }
}

// ---------- Auto-redirect if already logged in ----------
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const me = await window.API.me();
    if (me?.user?.role) {
      const map = {
        superadmin: '/super-admin', schooladmin: '/school-admin',
        teacher: '/teacher', student: '/student'
      };
      goTo(map[me.user.role] || '/auth');
    }
  } catch (_) {}
});