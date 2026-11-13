/**
 * AuthController: Controlador de autenticación y sesiones
 * Integrado con SweetAlert2 y blindaje de bloqueo al 3er intento
 */
window.App = window.App || {};
window.App.Controllers = window.App.Controllers || {};

window.App.Controllers.Auth = {
  authModel: window.App.Models.Auth,
  authView: window.App.Views.Auth,
  layoutView: window.App.Views.Layout,
  notification: window.App.Utils.Notification,

  init() {
    this.authView.init();
    this.bindEvents();
  },

  bindEvents() {
    // Submit del formulario de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleLogin();
      });
    }

    // Botón de cerrar sesión
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await this.handleLogout();
      });
    }
  },

  async handleLogin() {
    const { username, password } = this.authView.getCredentials();
    this.authView.hideError();
    this.authView.setLoading(true);

    try {
      const user = await this.authModel.login(username, password);
      this.authView.clearForm();
      this.layoutView.showApp(user);
      
      // Notificación de bienvenida con SweetAlert2
      this.notification.success(`¡Bienvenido de vuelta, ${user.fullName}!`);
      
      // Cargar vista inicial
      await window.App.Controllers.App.navigate('dashboard');
    } catch (err) {
      this.authView.showError(err.message || 'Error al iniciar sesión');

      // Avisos con SweetAlert2 según el tipo de incidencia
      if (err.code === 'ACCOUNT_JUST_LOCKED' || err.code === 'ACCOUNT_LOCKED' || err.code === 'CLIENT_LOCKED') {
        const remaining = err.remainingSeconds || 60;
        this.authView.lockSubmitButton(remaining);
        await this.notification.alert(
          '⛔ Acceso Bloqueado',
          err.message,
          'error'
        );
      } else if (err.code === 'WRONG_PASSWORD' || err.code === 'USER_NOT_FOUND') {
        await this.notification.alert(
          '⚠️ Intento Fallido',
          err.message,
          'warning'
        );
      } else {
        await this.notification.alert(
          'Aviso de Inicio de Sesión',
          err.message,
          'warning'
        );
      }
    } finally {
      this.authView.setLoading(false);
    }
  },

  async handleLogout() {
    const confirmed = await this.notification.confirm(
      '¿Cerrar Sesión?',
      '¿Estás seguro de que deseas salir del sistema actual?',
      'Sí, salir',
      true
    );

    if (confirmed) {
      await this.authModel.logout();
      this.layoutView.showAuth();
      this.authView.clearForm();
      this.notification.info('Has cerrado sesión exitosamente.');
    }
  },

  async checkExistingSession() {
    const user = await this.authModel.restoreSession();
    if (user) {
      this.layoutView.showApp(user);
      await window.App.Controllers.App.navigate('dashboard');
      return true;
    } else {
      this.layoutView.showAuth();
      return false;
    }
  }
};
