/**
 * RoleModel: Modelo para la gestión de roles y permisos
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};

window.App.Models.Role = {
  db: window.App.Models.Database,

  AVAILABLE_PERMISSIONS: [
    { key: 'users:read', label: 'Ver Usuarios', desc: 'Permite listar y consultar el detalle de usuarios' },
    { key: 'users:create', label: 'Crear Usuarios', desc: 'Permite registrar nuevas cuentas' },
    { key: 'users:update', label: 'Editar Usuarios', desc: 'Permite modificar datos de usuarios existentes' },
    { key: 'users:delete', label: 'Eliminar Usuarios', desc: 'Permite dar de baja usuarios del sistema' },
    { key: 'roles:read', label: 'Ver Roles', desc: 'Permite ver los roles y permisos del sistema' },
    { key: 'roles:manage', label: 'Gestionar Roles', desc: 'Permite crear, editar y suprimir roles' },
    { key: 'system:manage', label: 'Gestión del Sistema', desc: 'Administración de la base de datos y respaldos' }
  ],

  async getAll() {
    return await this.db.getAll('roles');
  },

  async getById(id) {
    return await this.db.getById('roles', id);
  },

  async create(data) {
    if (!data.name || !data.name.trim()) {
      throw new Error('El nombre del rol es obligatorio.');
    }

    const all = await this.getAll();
    const exists = all.some(r => r.name.toLowerCase() === data.name.trim().toLowerCase());
    if (exists) {
      throw new Error(`Ya existe un rol con el nombre "${data.name}".`);
    }

    const newRole = {
      id: 'role_' + Date.now().toString(36),
      name: data.name.trim(),
      description: data.description ? data.description.trim() : '',
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      isSystem: false,
      createdAt: new Date().toISOString()
    };

    return await this.db.add('roles', newRole);
  },

  async update(id, data) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('El rol no existe.');
    }

    if (existing.isSystem && data.isSystem === false) {
      throw new Error('No se pueden modificar los roles del sistema base.');
    }

    const all = await this.getAll();
    const nameTaken = all.some(r => r.id !== id && r.name.toLowerCase() === data.name.trim().toLowerCase());
    if (nameTaken) {
      throw new Error(`Ya existe otro rol con el nombre "${data.name}".`);
    }

    const updatedRole = {
      ...existing,
      name: data.name.trim(),
      description: data.description ? data.description.trim() : '',
      permissions: Array.isArray(data.permissions) ? data.permissions : existing.permissions,
      updatedAt: new Date().toISOString()
    };

    return await this.db.update('roles', updatedRole);
  },

  async delete(id) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('El rol no existe.');
    }

    if (existing.isSystem) {
      throw new Error('No se puede eliminar un rol protegido del sistema.');
    }

    // Verificar si hay usuarios asociados a este rol
    const users = await this.db.getAll('users');
    const inUse = users.some(u => u.roleId === id);
    if (inUse) {
      throw new Error('No se puede eliminar el rol porque está asignado a uno o más usuarios.');
    }

    return await this.db.delete('roles', id);
  }
};

