/**
 * UserModel: Modelo de datos para la entidad Usuario
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};

window.App.Models.User = {
  db: window.App.Models.Database,
  crypto: window.App.Utils.Crypto,

  async getAll() {
    const users = await this.db.getAll('users');
    const roles = await this.db.getAll('roles');
    const rolesMap = new Map(roles.map(r => [r.id, r]));

    // Añadir información completa del rol al usuario
    return users.map(user => ({
      ...user,
      role: rolesMap.get(user.roleId) || { id: user.roleId, name: 'Desconocido', permissions: [] }
    }));
  },

  async getById(id) {
    const user = await this.db.getById('users', id);
    if (!user) return null;
    const role = await this.db.getById('roles', user.roleId);
    return {
      ...user,
      role: role || { id: user.roleId, name: 'Desconocido', permissions: [] }
    };
  },

  async findByUsername(username) {
    const users = await this.db.getAll('users');
    return users.find(u => u.username.toLowerCase() === username.trim().toLowerCase()) || null;
  },

  async findByEmail(email) {
    const users = await this.db.getAll('users');
    return users.find(u => u.email.toLowerCase() === email.trim().toLowerCase()) || null;
  },

  async create(data) {
    // Validaciones
    if (!data.fullName || !data.fullName.trim()) throw new Error('El nombre completo es obligatorio.');
    if (!data.username || !data.username.trim()) throw new Error('El nombre de usuario es obligatorio.');
    if (!data.email || !data.email.trim()) throw new Error('El correo electrónico es obligatorio.');
    if (!data.password || data.password.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres.');
    if (!data.roleId) throw new Error('Debes seleccionar un rol para el usuario.');

    // Unicidad
    const existingUser = await this.findByUsername(data.username);
    if (existingUser) throw new Error(`El usuario "${data.username}" ya está registrado.`);

    const existingEmail = await this.findByEmail(data.email);
    if (existingEmail) throw new Error(`El correo "${data.email}" ya está en uso.`);

    const passwordHash = await this.crypto.hashPassword(data.password);

    const newUser = {
      id: 'user_' + Date.now().toString(36),
      fullName: data.fullName.trim(),
      username: data.username.trim().toLowerCase(),
      email: data.email.trim().toLowerCase(),
      passwordHash: passwordHash,
      roleId: data.roleId,
      status: data.status || 'active',
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    return await this.db.add('users', newUser);
  },

  async update(id, data) {
    const user = await this.db.getById('users', id);
    if (!user) throw new Error('El usuario no existe.');

    if (!data.fullName || !data.fullName.trim()) throw new Error('El nombre completo es obligatorio.');
    if (!data.username || !data.username.trim()) throw new Error('El nombre de usuario es obligatorio.');
    if (!data.email || !data.email.trim()) throw new Error('El correo electrónico es obligatorio.');

    // Verificar unicidad de username y email
    const users = await this.db.getAll('users');
    const userConflict = users.find(u => u.id !== id && u.username.toLowerCase() === data.username.trim().toLowerCase());
    if (userConflict) throw new Error(`El usuario "${data.username}" ya está registrado.`);

    const emailConflict = users.find(u => u.id !== id && u.email.toLowerCase() === data.email.trim().toLowerCase());
    if (emailConflict) throw new Error(`El correo "${data.email}" ya está en uso.`);

    // Si viene una contraseña nueva, la hasheamos
    let passwordHash = user.passwordHash;
    if (data.password && data.password.trim()) {
      if (data.password.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres.');
      passwordHash = await this.crypto.hashPassword(data.password.trim());
    }

    const updatedUser = {
      ...user,
      fullName: data.fullName.trim(),
      username: data.username.trim().toLowerCase(),
      email: data.email.trim().toLowerCase(),
      roleId: data.roleId || user.roleId,
      status: data.status || user.status,
      passwordHash: passwordHash,
      updatedAt: new Date().toISOString()
    };

    return await this.db.update('users', updatedUser);
  },

  async delete(id) {
    const user = await this.db.getById('users', id);
    if (!user) throw new Error('El usuario no existe.');

    // Evitar eliminar el admin original del sistema
    if (user.username === 'admin') {
      throw new Error('No es posible eliminar el usuario administrador principal.');
    }

    return await this.db.delete('users', id);
  },

  async updateLastLogin(id) {
    const user = await this.db.getById('users', id);
    if (user) {
      user.lastLogin = new Date().toISOString();
      await this.db.update('users', user);
    }
  },

  /**
   * Comprueba si el usuario está actualmente bloqueado por intentos fallidos
   */
  async checkLockStatus(user) {
    if (!user || !user.lockedUntil) return { isLocked: false };

    const lockTime = new Date(user.lockedUntil).getTime();
    const now = Date.now();

    if (lockTime > now) {
      const remainingSeconds = Math.ceil((lockTime - now) / 1000);
      return { isLocked: true, remainingSeconds };
    } else {
      // El bloqueo expiró: desbloquear automáticamente
      await this.resetFailedAttempts(user.id);
      return { isLocked: false };
    }
  },

  /**
   * Incrementa el contador de intentos fallidos.
   * Si llega a 3 intentos, bloquea la cuenta durante 60 segundos.
   */
  async recordFailedAttempt(userId) {
    const user = await this.db.getById('users', userId);
    if (!user) return { isLocked: false, attempts: 0 };

    const attempts = (user.failedAttempts || 0) + 1;
    user.failedAttempts = attempts;

    if (attempts >= 3) {
      const lockDurationMs = 60 * 1000; // 60 segundos de bloqueo
      user.lockedUntil = new Date(Date.now() + lockDurationMs).toISOString();
      await this.db.update('users', user);
      return { isLocked: true, remainingSeconds: 60, attempts: attempts };
    } else {
      await this.db.update('users', user);
      return { isLocked: false, remainingAttempts: 3 - attempts, attempts: attempts };
    }
  },

  /**
   * Restablece los intentos fallidos tras un login exitoso
   */
  async resetFailedAttempts(userId) {
    const user = await this.db.getById('users', userId);
    if (user && (user.failedAttempts > 0 || user.lockedUntil)) {
      user.failedAttempts = 0;
      user.lockedUntil = null;
      await this.db.update('users', user);
    }
  },

  /**
   * Desbloquea manualmente a un usuario (usado por administradores)
   */
  async unlockUser(userId) {
    const user = await this.db.getById('users', userId);
    if (!user) throw new Error('Usuario no encontrado.');

    user.failedAttempts = 0;
    user.lockedUntil = null;
    await this.db.update('users', user);
    return user;
  }
};

