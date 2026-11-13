/**
 * UserController: Controlador para la administración de usuarios
 * Con soporte para desbloqueo de cuentas e integración con SweetAlert2
 */
window.App = window.App || {};
window.App.Controllers = window.App.Controllers || {};

window.App.Controllers.User = {
  userModel: window.App.Models.User,
  roleModel: window.App.Models.Role,
  authModel: window.App.Models.Auth,
  userView: window.App.Views.User,
  layoutView: window.App.Views.Layout,
  notification: window.App.Utils.Notification,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Submit del formulario de creación/edición de usuario
    const userForm = document.getElementById('user-form');
    if (userForm) {
      userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSaveUser();
      });
    }

    // Delegación de eventos para la vista de usuarios (crear, editar, eliminar, desbloquear)
    const userContainer = document.getElementById('view-users');
    if (userContainer) {
      userContainer.addEventListener('click', async (e) => {
        // Abrir modal de nuevo usuario
        const createBtn = e.target.closest('#btn-create-user-modal');
        if (createBtn) {
          this.userView.openCreateModal();
          return;
        }

        // Botón editar
        const editBtn = e.target.closest('.edit-user-btn');
        if (editBtn) {
          const id = editBtn.dataset.id;
          const user = await this.userModel.getById(id);
          if (user) {
            this.userView.openEditModal(user);
          }
          return;
        }

        // Botón desbloquear cuenta
        const unlockBtn = e.target.closest('.unlock-user-btn');
        if (unlockBtn) {
          const id = unlockBtn.dataset.id;
          const name = unlockBtn.dataset.name;
          await this.handleUnlockUser(id, name);
          return;
        }

        // Botón eliminar
        const deleteBtn = e.target.closest('.delete-user-btn');
        if (deleteBtn) {
          const id = deleteBtn.dataset.id;
          const name = deleteBtn.dataset.name;
          await this.handleDeleteUser(id, name);
          return;
        }
      });
    }
  },

  async loadView() {
    const users = await this.userModel.getAll();
    const roles = await this.roleModel.getAll();

    const permissions = {
      canCreateUser: this.authModel.hasPermission('users:create'),
      canUpdateUser: this.authModel.hasPermission('users:update'),
      canDeleteUser: this.authModel.hasPermission('users:delete')
    };

    this.userView.render(users, roles, permissions);
  },

  async handleSaveUser() {
    const data = this.userView.getFormData();
    const isEdit = Boolean(data.id);

    try {
      if (isEdit) {
        if (!this.authModel.hasPermission('users:update')) {
          throw new Error('No tienes permisos para modificar usuarios.');
        }
        await this.userModel.update(data.id, data);
        this.notification.success(`Usuario "${data.username}" actualizado correctamente.`);
      } else {
        if (!this.authModel.hasPermission('users:create')) {
          throw new Error('No tienes permisos para crear nuevos usuarios.');
        }
        await this.userModel.create(data);
        this.notification.success(`Usuario "${data.username}" creado exitosamente.`);
      }

      this.layoutView.closeModal('user-modal');
      await this.loadView();

      // Si el usuario editado es el usuario actualmente logueado, actualizar header/sidebar
      const currentUser = this.authModel.getCurrentUser();
      if (currentUser && currentUser.id === data.id) {
        const refreshed = await this.userModel.getById(data.id);
        this.layoutView.updateUserDisplay(refreshed);
      }
    } catch (err) {
      this.notification.alert('Error al Guardar', err.message || 'No se pudo guardar el usuario.', 'danger');
    }
  },

  async handleUnlockUser(id, name) {
    if (!this.authModel.hasPermission('users:update')) {
      this.notification.warning('No tienes permisos para desbloquear usuarios.');
      return;
    }

    const confirmed = await this.notification.confirm(
      '¿Desbloquear Cuenta?',
      `Se restablecerán los intentos fallidos y se restaurará el acceso inmediato para <b>${name}</b>.`,
      'Sí, desbloquear'
    );

    if (confirmed) {
      try {
        await this.userModel.unlockUser(id);
        this.notification.success(`La cuenta de "${name}" ha sido desbloqueada.`);
        await this.loadView();
      } catch (err) {
        this.notification.alert('Error', err.message || 'No se pudo desbloquear la cuenta.', 'danger');
      }
    }
  },

  async handleDeleteUser(id, name) {
    const currentUser = this.authModel.getCurrentUser();
    if (currentUser && currentUser.id === id) {
      this.notification.warning('No puedes eliminar tu propia cuenta en sesión.');
      return;
    }

    if (!this.authModel.hasPermission('users:delete')) {
      this.notification.error('No tienes permisos para eliminar usuarios.');
      return;
    }

    const confirmed = await this.notification.confirm(
      '¿Eliminar Usuario?',
      `¿Confirmas la eliminación definitiva de <b>${name}</b>? Esta acción no se puede deshacer.`,
      'Sí, eliminar',
      true
    );

    if (confirmed) {
      try {
        await this.userModel.delete(id);
        this.notification.success(`Usuario "${name}" eliminado correctamente.`);
        await this.loadView();
      } catch (err) {
        this.notification.alert('Error', err.message || 'Error al eliminar usuario.', 'danger');
      }
    }
  }
};
