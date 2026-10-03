// Shared sidebar + top bar renderer for all logged-in roles.

(function () {
  const LOGO = '/static/img/logo.svg';

  const MENU = {
    schooladmin: [
      { key:'dashboard',     label:'Dashboard',           icon:'dashboard',      href:'/school-admin' },
      { key:'profile',       label:'My Profile',          icon:'person',         href:'/profile' },
      { key:'students',      label:'Students',            icon:'face',           href:'/students-list' },
      { key:'teachers',      label:'Teachers',            icon:'group',          href:'/teachers-list' },
      { key:'classes',       label:'Classes & Sections',  icon:'class',          href:'/school-admin/classes' },
      { key:'syllabus',      label:'School Syllabus',     icon:'menu_book',      href:'/school-admin/syllabus' },
      { key:'materials',     label:'Course Material',     icon:'library_books',  href:'/course-materials-list' },
      { key:'assignments',   label:'Assignments',         icon:'assignment',     href:'/school-admin/assignments' },
      { key:'progress',      label:'Student Progress',    icon:'trending_up',    href:'/school-admin/student-progress' },
      { key:'reports',       label:'Reports & Analytics', icon:'bar_chart',      href:'/school-admin/reports' },
      { key:'announcements', label:'Announcements',       icon:'campaign',       href:'/school-admin/announcements' }
    ],
    teacher: [
      { key:'dashboard',     label:'Dashboard',           icon:'dashboard',      href:'/teacher' },
      { key:'profile',       label:'My Profile',          icon:'person',         href:'/profile' },
      { key:'students',      label:'My Students',         icon:'face',           href:'/students-list' },
      { key:'teachers',      label:'Teachers',            icon:'group',          href:'/teachers-list' },
      { key:'materials',     label:'Course Material',     icon:'library_books',  href:'/course-materials-list' },
      { key:'assignments',   label:'Assignments',         icon:'assignment',     href:'/school-admin/assignments' },
      { key:'progress',      label:'Student Progress',    icon:'trending_up',    href:'/school-admin/student-progress' },
      { key:'announcements', label:'Announcements',       icon:'campaign',       href:'/school-admin/announcements' }
    ],
    student: [
      { key:'dashboard',     label:'Dashboard',           icon:'dashboard',      href:'/student' },
      { key:'profile',       label:'My Profile',          icon:'person',         href:'/profile' },
      { key:'teachers',      label:'My Teachers',         icon:'group',          href:'/teachers-list' },
      { key:'students',      label:'Classmates',          icon:'face',           href:'/students-list' },
      { key:'syllabus',      label:'Syllabus',            icon:'menu_book',      href:'/school-admin/syllabus' },
      { key:'materials',     label:'Course Material',     icon:'library_books',  href:'/course-materials-list' },
      { key:'announcements', label:'Announcements',       icon:'campaign',       href:'/school-admin/announcements' }
    ],
    superadmin: [
      { key:'dashboard',     label:'Dashboard',           icon:'dashboard',      href:'/super-admin' },
      { key:'profile',       label:'My Profile',          icon:'person',         href:'/profile' },
      { key:'teachers',      label:'Teachers',            icon:'group',          href:'/teachers-list' },
      { key:'students',      label:'Students',            icon:'face',           href:'/students-list' },
      { key:'materials',     label:'Course Material',     icon:'library_books',  href:'/course-materials-list' },
      { key:'assignments',   label:'Assignments',         icon:'assignment',     href:'/school-admin/assignments' },
      { key:'progress',      label:'Student Progress',    icon:'trending_up',    href:'/school-admin/student-progress' },
      { key:'reports',       label:'Reports & Analytics', icon:'bar_chart',      href:'/school-admin/reports' },
      { key:'announcements', label:'Announcements',       icon:'campaign',       href:'/school-admin/announcements' }
    ]
  };

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }

  function sidebar(role, active) {
    const items = MENU[role] || MENU.student;
    return `
      <aside class="hidden lg:flex w-60 bg-white border-r border-[#e2e8f0] flex-col fixed top-0 left-0 h-full z-30">
        <div class="flex items-center gap-2 px-4 h-16 border-b border-[#e2e8f0]">
          <img src="${LOGO}" alt="Shikshya AI" class="w-9 h-9 object-contain"/>
          <div>
            <p class="font-bold text-sm leading-tight">Shikshya AI</p>
            <p class="text-[10px] text-[#76777d] leading-tight">Learn. Practice. Improve.</p>
          </div>
        </div>
        <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          ${items.map(it => `
            <a href="${it.href}" class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              it.key === active
                ? 'bg-[#1d4ed8] text-white'
                : 'text-[#45464d] hover:bg-[#eff4ff] hover:text-[#1d4ed8]'
            }">
              <span class="material-symbols-outlined text-lg">${it.icon}</span> ${it.label}
            </a>`).join('')}
        </nav>
        <div class="p-4 border-t border-[#e2e8f0] text-center">
          <p class="text-xs font-bold text-[#1d4ed8]">Shikshya AI</p>
          <p class="text-[10px] text-[#76777d]">Nepal's AI-Powered<br/>Unified Education Platform</p>
        </div>
      </aside>`;
  }

  function topbar(o) {
    return `
      <header class="w-full bg-white border-b border-[#e2e8f0] px-4 md:px-6 flex justify-between items-center h-16 sticky top-0 z-20">
        <div class="flex items-center gap-3">
          <button data-nav-back class="w-8 h-8 rounded-lg hover:bg-[#eff4ff] flex items-center justify-center text-[#45464d] cursor-pointer">
            <span class="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <button data-nav-forward class="w-8 h-8 rounded-lg hover:bg-[#eff4ff] flex items-center justify-center text-[#45464d] cursor-pointer">
            <span class="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
          ${o.schoolName ? `
            <div class="flex items-center gap-2 pl-2 border-l border-[#e2e8f0]">
              <div class="w-9 h-9 rounded-full bg-[#eff4ff] flex items-center justify-center overflow-hidden">
                <img src="${LOGO}" alt="" class="w-6 h-6 object-contain"/>
              </div>
              <div class="hidden md:block">
                <p class="text-xs font-bold leading-tight">${esc(o.schoolName)}</p>
                <p class="text-[10px] text-[#76777d] leading-tight">${esc(o.schoolAddr || '')}</p>
              </div>
            </div>` : ''}
        </div>
        <div class="flex items-center gap-3">
          <button class="w-9 h-9 rounded-full flex items-center justify-center text-[#45464d] hover:bg-[#eff4ff] relative">
            <span class="material-symbols-outlined text-xl">notifications</span>
            <span class="absolute top-2 right-2 w-1.5 h-1.5 bg-[#ba1a1a] rounded-full"></span>
          </button>
          <div class="flex items-center gap-2 pl-2 border-l border-[#e2e8f0]">
            <a href="/profile" title="My Profile" class="w-9 h-9 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center text-xs font-bold hover:opacity-90 cursor-pointer">${esc(o.userAvatar || 'U')}</a>
            <div class="hidden md:block">
              <p class="text-xs font-bold leading-tight">${esc(o.userName || 'User')}</p>
              <p class="text-[10px] text-[#76777d] leading-tight">${esc(o.userSub || '')}</p>
            </div>
            <button id="logoutBtn" class="w-8 h-8 rounded-lg hover:bg-[#eff4ff] flex items-center justify-center text-[#45464d]" title="Logout">
              <span class="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </header>`;
  }

  window.renderLayout = function (opts) {
    const root = document.getElementById('layout-root');
    if (!root) return;
    root.innerHTML = `
      <div class="flex min-h-screen">
        ${sidebar(opts.role, opts.active)}
        <div class="flex-1 lg:ml-60 flex flex-col">
          ${topbar(opts)}
          <main id="page-content" class="flex-1 p-4 md:p-6 space-y-5"></main>
        </div>
      </div>`;
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      try { await window.API.logout(); } catch (_) {}
      try { localStorage.removeItem('shikshya_last_role'); } catch (_) {}
      window.location.href = '/auth';
    });
  };

  window.getPageContent = () => document.getElementById('page-content');
  window.escHtml = esc;
})();