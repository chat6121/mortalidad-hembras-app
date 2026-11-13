/**
 * RoleController: Controlador para la administración de roles, permisos y base de datos
 */
window.App = window.App || {};
window.App.Controllers = window.App.Controllers || {};

window.App.Controllers.Role = {
  roleModel: window.App.Models.Role,
  userModel: window.App.Models.User,
  authModel: window.App.Models.Auth,
  dbModel: window.App.Models.Database,
  roleView: window.App.Views.Role,
  layoutView: window.App.Views.Layout,
  notification: window.App.Utils.Notification,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Submit del formulario de roles
    const roleForm = document.getElementById('role-form');
    if (roleForm) {
      roleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSaveRole();
      });
    }

    // Eventos delegados en vista de roles
    const rolesContainer = document.getElementById('view-roles');
    if (rolesContainer) {
      rolesContainer.addEventListener('click', async (e) => {
        // Abrir modal de nuevo rol
        const createBtn = e.target.closest('#btn-create-role-modal');
        if (createBtn) {
          this.roleView.openCreateModal(this.roleModel.AVAILABLE_PERMISSIONS);
          return;
        }

        // Editar rol
        const editBtn = e.target.closest('.edit-role-btn');
        if (editBtn) {
          const id = editBtn.dataset.id;
          const role = await this.roleModel.getById(id);
          if (role) {
            this.roleView.openEditModal(role, this.roleModel.AVAILABLE_PERMISSIONS);
          }
          return;
        }

        // Eliminar rol
        const deleteBtn = e.target.closest('.delete-role-btn');
        if (deleteBtn) {
          const id = deleteBtn.dataset.id;
          const name = deleteBtn.dataset.name;
          this.handleDeleteRole(id, name);
          return;
        }
      });
    }

    // Eventos de la vista de Base de Datos
    const dbContainer = document.getElementById('view-database');
    if (dbContainer) {
      dbContainer.addEventListener('click', async (e) => {
        // Exportar backup
        const exportBtn = e.target.closest('#btn-export-db');
        if (exportBtn) {
          await this.exportBackup();
          return;
        }

        // Reset de base de datos
        const resetBtn = e.target.closest('#btn-reset-db');
        if (resetBtn) {
          this.handleResetDatabase();
          return;
        }
      });
    }
  },

  async loadView() {
    const roles = await this.roleModel.getAll();
    const permissions = {
      canManageRoles: this.authModel.hasPermission('roles:manage')
    };

    this.roleView.render(roles, this.roleModel.AVAILABLE_PERMISSIONS, permissions);
  },

  async handleSaveRole() {
    const data = this.roleView.getFormData();
    const isEdit = Boolean(data.id);

    try {
      if (!this.authModel.hasPermission('roles:manage')) {
        throw new Error('No tienes permisos suficientes para gestionar roles.');
      }

      if (isEdit) {
        await this.roleModel.update(data.id, data);
        this.notification.success(`Rol "${data.name}" actualizado.`);
      } else {
        await this.roleModel.create(data);
        this.notification.success(`Rol "${data.name}" creado exitosamente.`);
      }

      this.layoutView.closeModal('role-modal');
      await this.loadView();
    } catch (err) {
      this.notification.alert('Error en Roles', err.message || 'Error al guardar el rol.', 'danger');
    }
  },

  async handleDeleteRole(id, name) {
    if (!this.authModel.hasPermission('roles:manage')) {
      this.notification.error('No tienes permisos para eliminar roles.');
      return;
    }

    const confirmed = await this.notification.confirm(
      '¿Eliminar Rol?',
      `¿Deseas eliminar el rol <b>${name}</b>?<br><small style="color:#64748b;">Solo se completará si ningún usuario tiene este rol asignado.</small>`,
      'Sí, eliminar',
      true
    );

    if (confirmed) {
      try {
        await this.roleModel.delete(id);
        this.notification.success(`Rol "${name}" eliminado correctamente.`);
        await this.loadView();
      } catch (err) {
        this.notification.alert('No se pudo eliminar', err.message || 'Error al eliminar rol.', 'danger');
      }
    }
  },

  async exportBackup() {
    try {
      const users = await this.userModel.getAll();
      const roles = await this.roleModel.getAll();

      const backup = {
        exportedAt: new Date().toISOString(),
        system: 'CoreAdmin MVC IndexedDB',
        version: 1,
        roles: roles,
        users: users
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_coreadmin_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.notification.success('Backup exportado exitosamente en archivo JSON.');
    } catch (err) {
      this.notification.error('Error al exportar los datos: ' + err.message);
    }
  },

  async handleResetDatabase() {
    const confirmed = await this.notification.confirm(
      '¿Restablecer Base de Datos?',
      '¿Estás seguro de restablecer toda la base de datos a sus valores originales de fábrica? Se reiniciarán usuarios y roles.',
      'Sí, restablecer todo',
      true
    );

    if (confirmed) {
      try {
        await this.dbModel.resetDatabase();
        this.notification.success('Base de datos restablecida correctamente.');
        await window.App.Controllers.App.navigate('dashboard');
      } catch (err) {
        this.notification.alert('Error', 'Error al restablecer la base de datos: ' + err.message, 'danger');
      }
    }
  }
};

