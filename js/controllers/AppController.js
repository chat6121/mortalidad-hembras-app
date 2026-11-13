/**
 * AppController: Orquestador general del sistema y enrutamiento MVC
 */
window.App = window.App || {};
window.App.Controllers = window.App.Controllers || {};

window.App.Controllers.App = {
  db: window.App.Models.Database,
  authModel: window.App.Models.Auth,
  userModel: window.App.Models.User,
  roleModel: window.App.Models.Role,
  layoutView: window.App.Views.Layout,
  dashboardView: window.App.Views.Dashboard,
  roleView: window.App.Views.Role,
  mpdView: window.App.Views.Mpd,
  cierresView: window.App.Views.Cierres,
  partosView: window.App.Views.Partos,
  destetesView: window.App.Views.Destetes,
  maternidadView: window.App.Views.Maternidad,
  userController: window.App.Controllers.User,
  roleController: window.App.Controllers.Role,
  mpdController: window.App.Controllers.Mpd,
  cierresController: window.App.Controllers.Cierres,
  partosController: window.App.Controllers.Partos,
  destetesController: window.App.Controllers.Destetes,
  maternidadController: window.App.Controllers.Maternidad,
  hembrasController: window.App.Controllers.Hembras,
  configuracionController: window.App.Controllers.Configuracion,
  authController: window.App.Controllers.Auth,

  async init() {
    this.bindGlobalEvents();
  },

  bindGlobalEvents() {
    // Manejo de clicks en el sidebar / navegación
    document.addEventListener('click', async (e) => {
      // Toggle sidebar (móvil)
      if (e.target.closest('#sidebar-toggle')) {
        this.layoutView.toggleSidebar();
        return;
      }

      // Cerrar sidebar
      if (e.target.closest('#sidebar-close') || e.target.closest('#sidebar-backdrop')) {
        this.layoutView.closeSidebar();
        return;
      }

      // Toggle submenú acordeón de MPD en sidebar
      if (e.target.closest('#btn-toggle-mpd-sub')) {
        const group = document.getElementById('nav-group-mpd');
        if (group) {
          group.classList.toggle('open');
        }
        return;
      }

      // Toggle submenú acordeón de Cierre de Salas en sidebar
      if (e.target.closest('#btn-toggle-cierres-sub')) {
        const group = document.getElementById('nav-group-cierres');
        if (group) {
          group.classList.toggle('open');
        }
        return;
      }

      // Toggle submenú acordeón de Resumen de Partos en sidebar
      if (e.target.closest('#btn-toggle-partos-sub')) {
        const group = document.getElementById('nav-group-partos');
        if (group) {
          group.classList.toggle('open');
        }
        return;
      }

      // Toggle submenú acordeón de Destetes en sidebar
      if (e.target.closest('#btn-toggle-destetes-sub')) {
        const group = document.getElementById('nav-group-destetes');
        if (group) {
          group.classList.toggle('open');
        }
        return;
      }

      // Toggle submenú acordeón de Maternidad en sidebar
      if (e.target.closest('#btn-toggle-maternidad-sub')) {
        const group = document.getElementById('nav-group-maternidad');
        if (group) {
          group.classList.toggle('open');
        }
        return;
      }

      // Toggle submenú acordeón de Mortalidad de Hembras en sidebar
      if (e.target.closest('#btn-toggle-hembras-sub')) {
        const group = document.getElementById('nav-group-hembras');
        if (group) {
          group.classList.toggle('open');
        }
        return;
      }

      // Enlaces de submenú (ej: Tabla MPD, Gráficos MPD)
      const subNavLink = e.target.closest('.nav-sub-item');
      if (subNavLink) {
        e.preventDefault();
        const viewName = subNavLink.dataset.view;
        window.location.hash = `#${viewName}`;
        await this.navigate(viewName);
        return;
      }

      // Enlaces de navegación con atributo data-view
      const navLink = e.target.closest('.nav-item:not(.nav-item-parent)');
      if (navLink) {
        e.preventDefault();
        const viewName = navLink.dataset.view;
        window.location.hash = `#${viewName}`;
        await this.navigate(viewName);
        return;
      }

      // Botón Refrescar Data en Header
      if (e.target.closest('#btn-header-refresh-data')) {
        await this.mpdController.handleHeaderRefresh();
        return;
      }

      // Toggle dropdown de usuario estilo Laravel
      if (e.target.closest('#user-dropdown-btn')) {
        this.layoutView.toggleUserDropdown();
        return;
      }

      // Cerrar dropdown si se hace click fuera
      if (!e.target.closest('#user-dropdown-wrapper')) {
        this.layoutView.closeUserDropdown();
      }

      // Abrir modal de Mi Perfil
      if (e.target.closest('#btn-open-profile')) {
        this.layoutView.closeUserDropdown();
        const currentUser = this.authModel.getCurrentUser();
        if (currentUser) {
          this.layoutView.openProfileModal(currentUser);
        }
        return;
      }

      // Cerrar modales mediante botón cerrar
      const closeBtn = e.target.closest('.modal-close-btn');
      if (closeBtn) {
        const modalId = closeBtn.dataset.modal;
        if (modalId) {
          this.layoutView.closeModal(modalId);
        }
        return;
      }

      // Cerrar modal al hacer click en el backdrop gris
      if (e.target.classList.contains('modal')) {
        this.layoutView.closeModal(e.target.id);
        return;
      }
    });

    // Escuchar cambios de hash en la URL
    window.addEventListener('hashchange', async () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      if (this.authModel.getCurrentUser()) {
        await this.navigate(hash);
      }
    });

    // Input de archivo Excel en el header (sincronización multi-hoja de INFORMACION SAP.xlsm)
    const headerFileInput = document.getElementById('header-file-excel');
    if (headerFileInput) {
      headerFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          await this.loadMasterExcelFile(file);
          e.target.value = '';
        }
      });
    }

    // Mostrar última sincronización Excel si existe y habilitar Drag & Drop global de .xlsm/.xlsx
    if (this.mpdController && typeof this.mpdController.renderExcelSyncBadge === 'function') {
      this.mpdController.renderExcelSyncBadge();
    }
    this._initGlobalExcelDragAndDrop();
  },

  async loadMasterExcelFile(file) {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      if (typeof XLSX === 'undefined') {
        throw new Error('Librería SheetJS no encontrada.');
      }
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      await this.mpdController.processMasterWorkbook(wb, file.name);
    } catch (err) {
      console.error('Error procesando libro Excel maestro:', err);
      window.App.Utils.Notification.error('Error procesando archivo Excel: ' + err.message);
    }
  },

  _initGlobalExcelDragAndDrop() {
    if (this._dragDropBound) return;
    this._dragDropBound = true;

    document.addEventListener('dragover', (e) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
        e.preventDefault();
        document.body.classList.add('excel-drop-active');
      }
    });

    document.addEventListener('dragleave', (e) => {
      if (e.target === document.body || e.clientX <= 0 || e.clientY <= 0) {
        document.body.classList.remove('excel-drop-active');
      }
    });

    document.addEventListener('drop', async (e) => {
      document.body.classList.remove('excel-drop-active');
      const files = e.dataTransfer && e.dataTransfer.files;
      if (!files || files.length === 0) return;
      const excelFile = Array.from(files).find(f => /\.(xlsm|xlsx|xls)$/i.test(f.name || ''));
      if (!excelFile) return;
      e.preventDefault();
      await this.loadMasterExcelFile(excelFile);
    });

    // Formulario de Mi Perfil
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSaveProfile();
      });
    }
  },

  async handleSaveProfile() {
    const currentUser = this.authModel.getCurrentUser();
    if (!currentUser) return;

    const fullNameInput = document.getElementById('profile-fullname');
    const emailInput = document.getElementById('profile-email');
    const passwordInput = document.getElementById('profile-password');

    const fullName = fullNameInput ? fullNameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    try {
      if (!fullName) throw new Error('El nombre completo es obligatorio.');
      if (!email) throw new Error('El correo electrónico es obligatorio.');

      const updateData = {
        fullName: fullName,
        username: currentUser.username,
        email: email,
        roleId: currentUser.roleId,
        status: currentUser.status
      };

      if (password && password.trim()) {
        if (password.length < 4) throw new Error('La nueva contraseña debe tener al menos 4 caracteres.');
        updateData.password = password.trim();
      }

      await this.userModel.update(currentUser.id, updateData);

      // Refrescar usuario en sesión y vista
      const refreshed = await this.userModel.getById(currentUser.id);
      this.authModel.currentUser = refreshed;
      this.layoutView.updateUserDisplay(refreshed);
      this.layoutView.closeModal('profile-modal');

      window.App.Utils.Notification.success('Tu perfil ha sido actualizado exitosamente.');
    } catch (err) {
      window.App.Utils.Notification.alert('Error en Perfil', err.message || 'No se pudo actualizar el perfil.', 'danger');
    }
  },

  async navigate(viewName) {
    const validViews = [
      'dashboard',
      'mpd', 'mpd-table', 'mpd-charts',
      'cierres', 'cierres-table', 'cierres-charts',
      'partos', 'partos-table', 'partos-charts',
      'destetes', 'destetes-table', 'destetes-charts',
      'maternidad', 'maternidad-table', 'maternidad-charts',
      'hembras', 'hembras-table', 'hembras-charts',
      'users', 'roles', 'configuracion', 'database'
    ];
    const activeView = validViews.includes(viewName) ? viewName : 'dashboard';

    this.layoutView.switchView(activeView);

    switch (activeView) {
      case 'dashboard':
        await this.loadDashboard();
        break;
      case 'mpd':
      case 'mpd-table':
        await this.mpdController.init('table');
        break;
      case 'mpd-charts':
        await this.mpdController.init('charts');
        break;
      case 'cierres':
      case 'cierres-table':
        await this.cierresController.init('table');
        break;
      case 'cierres-charts':
        await this.cierresController.init('charts');
        break;
      case 'partos':
      case 'partos-table':
        await this.partosController.init('table');
        break;
      case 'partos-charts':
        await this.partosController.init('charts');
        break;
      case 'destetes':
      case 'destetes-table':
        await this.destetesController.init('table');
        break;
      case 'destetes-charts':
        await this.destetesController.init('charts');
        break;
      case 'maternidad':
      case 'maternidad-table':
        await this.maternidadController.init('table');
        break;
      case 'maternidad-charts':
        await this.maternidadController.init('charts');
        break;
      case 'hembras':
      case 'hembras-table':
        await this.hembrasController.init('table');
        break;
      case 'hembras-charts':
        await this.hembrasController.init('charts');
        break;
      case 'users':
        await this.userController.loadView();
        break;
      case 'roles':
        await this.roleController.loadView();
        break;
      case 'configuracion':
        await this.configuracionController.init();
        break;
      case 'database':
        await this.roleView.renderDatabasePanel();
        break;
    }
  },

  async loadDashboard() {
    const users = await this.userModel.getAll();
    const roles = await this.roleModel.getAll();
    const currentUser = this.authModel.getCurrentUser();

    const data = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'active').length,
      totalRoles: roles.length,
      currentUser: currentUser,
      recentUsers: users.slice(-5).reverse()
    };

    this.dashboardView.render(data);
  }
};
