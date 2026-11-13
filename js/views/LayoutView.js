/**
 * LayoutView: Gestiona el cascarón principal, header, sidebar, navegación y modales
 */
window.App = window.App || {};
window.App.Views = window.App.Views || {};

window.App.Views.Layout = {
  authContainer: document.getElementById('auth-container'),
  appLayout: document.getElementById('app-layout'),
  sidebar: document.getElementById('sidebar'),
  sidebarBackdrop: document.getElementById('sidebar-backdrop'),
  currentTitle: document.getElementById('current-view-title'),
  currentBreadcrumb: document.getElementById('current-breadcrumb'),
  headerUserName: document.getElementById('header-user-name'),
  headerUserBadge: document.getElementById('header-user-badge'),
  headerUserAvatar: document.getElementById('header-user-avatar'),
  userDropdownBtn: document.getElementById('user-dropdown-btn'),
  userDropdownMenu: document.getElementById('user-dropdown-menu'),
  menuUserName: document.getElementById('menu-user-name'),
  menuUserEmail: document.getElementById('menu-user-email'),
  menuUserBadge: document.getElementById('menu-user-badge'),

  showAuth() {
    this.authContainer.style.display = 'flex';
    this.appLayout.style.display = 'none';
  },

  showApp(user) {
    this.authContainer.style.display = 'none';
    this.appLayout.style.display = 'flex';
    this.updateUserDisplay(user);
    this.initSidebarState();
  },

  initSidebarState() {
    const isCollapsed = localStorage.getItem('app_sidebar_collapsed') === 'true';
    if (isCollapsed && window.innerWidth > 900) {
      this.sidebar.classList.add('collapsed');
      document.body.classList.add('sidebar-collapsed');
    }
  },

  updateUserDisplay(user) {
    if (!user) return;
    const name = user.fullName || user.username;
    const roleName = user.role ? user.role.name : 'Usuario';
    const email = user.email || '';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

    // Header Trigger
    if (this.headerUserName) this.headerUserName.textContent = name;
    if (this.headerUserBadge) this.headerUserBadge.textContent = roleName;
    if (this.headerUserAvatar) this.headerUserAvatar.textContent = initials;

    // Dropdown Menu Header
    if (this.menuUserName) this.menuUserName.textContent = name;
    if (this.menuUserEmail) this.menuUserEmail.textContent = email;
    if (this.menuUserBadge) this.menuUserBadge.textContent = roleName;
  },

  toggleUserDropdown() {
    if (!this.userDropdownMenu) return;
    const isOpen = this.userDropdownMenu.classList.contains('show');
    if (isOpen) {
      this.closeUserDropdown();
    } else {
      this.openUserDropdown();
    }
  },

  openUserDropdown() {
    if (this.userDropdownMenu && this.userDropdownBtn) {
      this.userDropdownMenu.classList.add('show');
      this.userDropdownBtn.classList.add('active');
      this.userDropdownBtn.setAttribute('aria-expanded', 'true');
    }
  },

  closeUserDropdown() {
    if (this.userDropdownMenu && this.userDropdownBtn) {
      this.userDropdownMenu.classList.remove('show');
      this.userDropdownBtn.classList.remove('active');
      this.userDropdownBtn.setAttribute('aria-expanded', 'false');
    }
  },

  openProfileModal(user) {
    if (!user) return;
    const name = user.fullName || user.username;
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

    const avatar = document.getElementById('profile-modal-avatar');
    const nameEl = document.getElementById('profile-modal-name');
    const usernameEl = document.getElementById('profile-modal-username');
    const badgeEl = document.getElementById('profile-modal-badge');
    const fullNameInput = document.getElementById('profile-fullname');
    const emailInput = document.getElementById('profile-email');
    const passwordInput = document.getElementById('profile-password');

    if (avatar) avatar.textContent = initials;
    if (nameEl) nameEl.textContent = name;
    if (usernameEl) usernameEl.textContent = `@${user.username}`;
    if (badgeEl) badgeEl.textContent = user.role ? user.role.name : 'Usuario';
    if (fullNameInput) fullNameInput.value = user.fullName || '';
    if (emailInput) emailInput.value = user.email || '';
    if (passwordInput) passwordInput.value = '';

    this.openModal('profile-modal');
  },

  switchView(viewName) {
    // Normalizar si es subvista de MPD o Cierres
    let primaryView = viewName;
    if (viewName === 'mpd-table' || viewName === 'mpd-charts') {
      primaryView = 'mpd';
    } else if (viewName === 'cierres-table' || viewName === 'cierres-charts') {
      primaryView = 'cierres';
    } else if (viewName === 'partos-table' || viewName === 'partos-charts') {
      primaryView = 'partos';
    } else if (viewName === 'destetes-table' || viewName === 'destetes-charts') {
      primaryView = 'destetes';
    } else if (viewName === 'maternidad-table' || viewName === 'maternidad-charts') {
      primaryView = 'maternidad';
    } else if (viewName === 'hembras' || viewName === 'hembras-table' || viewName === 'hembras-charts') {
      primaryView = 'hembras';
    }

    // Actualizar enlaces de navegación principales
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      const isTarget = item.dataset.view === primaryView || 
                       (item.id === 'btn-toggle-mpd-sub' && primaryView === 'mpd') ||
                       (item.id === 'btn-toggle-cierres-sub' && primaryView === 'cierres') ||
                       (item.id === 'btn-toggle-partos-sub' && primaryView === 'partos') ||
                       (item.id === 'btn-toggle-destetes-sub' && primaryView === 'destetes') ||
                       (item.id === 'btn-toggle-maternidad-sub' && primaryView === 'maternidad') ||
                       (item.id === 'btn-toggle-hembras-sub' && primaryView === 'hembras');
      if (isTarget) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Actualizar subitems de navegación
    const subItems = document.querySelectorAll('.nav-sub-item');
    subItems.forEach(item => {
      const isSubTarget = item.dataset.view === viewName || 
                          (viewName === 'mpd' && item.dataset.view === 'mpd-table') ||
                          (viewName === 'cierres' && item.dataset.view === 'cierres-table') ||
                          (viewName === 'partos' && item.dataset.view === 'partos-table') ||
                          (viewName === 'destetes' && item.dataset.view === 'destetes-table') ||
                          (viewName === 'maternidad' && item.dataset.view === 'maternidad-table') ||
                          (viewName === 'hembras' && item.dataset.view === 'hembras-table');
      if (isSubTarget) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Actualizar paneles de contenido
    const panels = document.querySelectorAll('.view-panel');
    panels.forEach(panel => {
      if (panel.id === `view-${primaryView}`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Actualizar encabezados
    const titles = {
      dashboard: { title: 'Panel Principal', breadcrumb: 'Inicio / Dashboard' },
      mpd: { title: 'Módulo MPD', breadcrumb: 'Operaciones / Módulo MPD' },
      'mpd-table': { title: 'Módulo MPD - Tabla de Producción', breadcrumb: 'Operaciones / MPD / Tabla' },
      'mpd-charts': { title: 'Módulo MPD - Gráficos Analíticos', breadcrumb: 'Operaciones / MPD / Gráficos' },
      cierres: { title: 'Cierre de Salas', breadcrumb: 'Operaciones / Cierre de Salas' },
      'cierres-table': { title: 'Cierre de Salas - Tabla de Cierres', breadcrumb: 'Operaciones / Cierre de Salas / Tabla' },
      'cierres-charts': { title: 'Cierre de Salas - Gráficos Analíticos', breadcrumb: 'Operaciones / Cierre de Salas / Gráficos' },
      partos: { title: 'Resumen de Partos', breadcrumb: 'Operaciones / Resumen de Partos' },
      'partos-table': { title: 'Resumen de Partos - Tabla de Partos', breadcrumb: 'Operaciones / Resumen de Partos / Tabla' },
      'partos-charts': { title: 'Resumen de Partos - Gráficos Analíticos', breadcrumb: 'Operaciones / Resumen de Partos / Gráficos' },
      destetes: { title: 'Módulo de Destetes', breadcrumb: 'Operaciones / Módulo de Destetes' },
      'destetes-table': { title: 'Módulo de Destetes - Tabla de Destetes', breadcrumb: 'Operaciones / Destetes / Tabla' },
      'destetes-charts': { title: 'Módulo de Destetes - Gráficos Analíticos', breadcrumb: 'Operaciones / Destetes / Gráficos' },
      maternidad: { title: 'Módulo de Maternidad', breadcrumb: 'Operaciones / Maternidad' },
      'maternidad-table': { title: 'Módulo de Maternidad - Tablas por Área', breadcrumb: 'Operaciones / Maternidad / Tablas' },
      'maternidad-charts': { title: 'Módulo de Maternidad - Gráficos Analíticos', breadcrumb: 'Operaciones / Maternidad / Gráficos' },
      hembras: { title: 'Mortalidad de Hembras', breadcrumb: 'Operaciones / Mortalidad Hembras' },
      'hembras-table': { title: 'Mortalidad de Hembras - Registro y Tabla', breadcrumb: 'Operaciones / Mortalidad Hembras / Tabla' },
      'hembras-charts': { title: 'Mortalidad de Hembras - Gráficos y Filtros', breadcrumb: 'Operaciones / Mortalidad Hembras / Gráficos' },
      users: { title: 'Gestión de Usuarios', breadcrumb: 'Administración / Usuarios' },
      roles: { title: 'Roles y Permisos', breadcrumb: 'Administración / Roles' },
      configuracion: { title: 'Configuración y Parámetros', breadcrumb: 'Administración / Configuración' },
      database: { title: 'Almacenamiento Offline', breadcrumb: 'Sistema / Base de Datos' }
    };

    const info = titles[viewName] || titles[primaryView] || { title: 'Panel', breadcrumb: 'Inicio' };
    if (this.currentTitle) this.currentTitle.textContent = info.title;
    if (this.currentBreadcrumb) this.currentBreadcrumb.textContent = info.breadcrumb;

    // Cerrar sidebar en móvil si está abierta
    this.closeSidebar();
  },

  toggleSidebar() {
    if (window.innerWidth <= 900) {
      this.sidebar.classList.toggle('open');
      this.sidebarBackdrop.classList.toggle('active');
    } else {
      const isCollapsed = this.sidebar.classList.toggle('collapsed');
      document.body.classList.toggle('sidebar-collapsed', isCollapsed);
      localStorage.setItem('app_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    }
  },

  closeSidebar() {
    this.sidebar.classList.remove('open');
    this.sidebarBackdrop.classList.remove('active');
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
  },

  showConfirmModal(title, message, onConfirmCallback) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const acceptBtn = document.getElementById('btn-confirm-accept');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    // Clonar botón para remover event listeners anteriores
    const newAcceptBtn = acceptBtn.cloneNode(true);
    acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);

    newAcceptBtn.addEventListener('click', async () => {
      this.closeModal('confirm-modal');
      if (typeof onConfirmCallback === 'function') {
        await onConfirmCallback();
      }
    });

    this.openModal('confirm-modal');
  }
};

