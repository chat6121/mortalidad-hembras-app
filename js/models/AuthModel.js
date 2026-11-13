/**
 * AuthModel: Gestión de sesión de usuario, control de acceso RBAC
 * y blindaje de seguridad contra ataques de fuerza bruta (bloqueo al 3er intento)
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};

window.App.Models.Auth = {
  db: window.App.Models.Database,
  userModel: window.App.Models.User,
  crypto: window.App.Utils.Crypto,
  currentUser: null,
  SESSION_STORAGE_KEY: 'app_active_session_user_id',
  CLIENT_LOCK_KEY: 'app_auth_client_lock',

  /**
   * Obtiene el estado del bloqueo general de cliente
   */
  getClientLockStatus() {
    try {
      const dataStr = localStorage.getItem(this.CLIENT_LOCK_KEY);
      if (!dataStr) return { isLocked: false, attempts: 0 };
      const data = JSON.parse(dataStr);
      if (data.lockedUntil && new Date(data.lockedUntil).getTime() > Date.now()) {
        const remainingSeconds = Math.ceil((new Date(data.lockedUntil).getTime() - Date.now()) / 1000);
        return { isLocked: true, remainingSeconds, attempts: data.attempts || 3 };
      }
      return { isLocked: false, attempts: data.attempts || 0 };
    } catch {
      return { isLocked: false, attempts: 0 };
    }
  },

  recordClientFailedAttempt() {
    try {
      const current = this.getClientLockStatus();
      const attempts = (current.attempts || 0) + 1;
      if (attempts >= 3) {
        const lockedUntil = new Date(Date.now() + 60 * 1000).toISOString();
        localStorage.setItem(this.CLIENT_LOCK_KEY, JSON.stringify({ attempts, lockedUntil }));
        return { isLocked: true, remainingSeconds: 60, attempts };
      } else {
        localStorage.setItem(this.CLIENT_LOCK_KEY, JSON.stringify({ attempts }));
        return { isLocked: false, remainingAttempts: 3 - attempts, attempts };
      }
    } catch {
      return { isLocked: false, remainingAttempts: 2, attempts: 1 };
    }
  },

  resetClientLock() {
    try {
      localStorage.removeItem(this.CLIENT_LOCK_KEY);
    } catch {}
  },

  /**
   * Intenta autenticar un usuario blindado contra fuerza bruta
   */
  async login(identifier, password) {
    if (!identifier || !password) {
      const err = new Error('Por favor completa todos los campos requeridos.');
      err.code = 'EMPTY_FIELDS';
      throw err;
    }

    // 1. Verificar si el cliente está bloqueado globalmente
    const clientLock = this.getClientLockStatus();
    if (clientLock.isLocked) {
      const err = new Error(`El acceso al sistema está bloqueado temporalmente por superar los 3 intentos fallidos. Intenta nuevamente en ${clientLock.remainingSeconds} segundo(s).`);
      err.code = 'CLIENT_LOCKED';
      err.remainingSeconds = clientLock.remainingSeconds;
      throw err;
    }

    const trimmed = identifier.trim().toLowerCase();
    let user = await this.userModel.findByUsername(trimmed);
    if (!user) {
      user = await this.userModel.findByEmail(trimmed);
    }

    // 2. Si el usuario existe, verificar su estado de bloqueo individual
    if (user) {
      const userLock = await this.userModel.checkLockStatus(user);
      if (userLock.isLocked) {
        const err = new Error(`La cuenta <b>@${user.username}</b> se encuentra bloqueada por superar el límite de 3 intentos fallidos consecutivos.<br><br>Tiempo de espera restante: <b>${userLock.remainingSeconds} segundos</b> o solicita el desbloqueo a un administrador.`);
        err.code = 'ACCOUNT_LOCKED';
        err.remainingSeconds = userLock.remainingSeconds;
        err.username = user.username;
        throw err;
      }

      if (user.status !== 'active') {
        const err = new Error('Esta cuenta ha sido desactivada. Consulta con el administrador.');
        err.code = 'ACCOUNT_INACTIVE';
        throw err;
      }

      // Validar contraseña
      const inputHash = await this.crypto.hashPassword(password);
      if (user.passwordHash !== inputHash) {
        // Registrar intento fallido
        const attemptResult = await this.userModel.recordFailedAttempt(user.id);
        if (attemptResult.isLocked) {
          const err = new Error(`¡Has alcanzado el <b>3er intento fallido</b>!<br><br>Por seguridad, la cuenta <b>@${user.username}</b> ha sido <b>bloqueada temporalmente durante 60 segundos</b>.`);
          err.code = 'ACCOUNT_JUST_LOCKED';
          err.remainingSeconds = 60;
          err.username = user.username;
          throw err;
        } else {
          const err = new Error(`Contraseña incorrecta.<br><br>Te quedan <strong style="color: #ef4444; font-size: 1.05em;">${attemptResult.remainingAttempts} intento(s)</strong> antes de que la cuenta sea bloqueada.`);
          err.code = 'WRONG_PASSWORD';
          err.remainingAttempts = attemptResult.remainingAttempts;
          err.attempts = attemptResult.attempts;
          throw err;
        }
      }

      // LOGIN EXITOSO
      // Restablecer contadores
      await this.userModel.resetFailedAttempts(user.id);
      this.resetClientLock();
      await this.userModel.updateLastLogin(user.id);

      // Cargar usuario completo
      this.currentUser = await this.userModel.getById(user.id);

      // Persistir sesión
      sessionStorage.setItem(this.SESSION_STORAGE_KEY, user.id);
      await this.db.update('sessions', {
        id: 'current_session',
        userId: user.id,
        loginAt: new Date().toISOString()
      });

      return this.currentUser;
    }

    // 3. Si el usuario no existe en la base de datos, proteger el formulario contra barrido
    const clientAttempt = this.recordClientFailedAttempt();
    if (clientAttempt.isLocked) {
      const err = new Error(`Has alcanzado el <b>3er intento fallido</b> de acceso.<br><br>El sistema ha bloqueado los intentos de acceso durante <b>60 segundos</b>.`);
      err.code = 'CLIENT_LOCKED';
      err.remainingSeconds = 60;
      throw err;
    } else {
      const err = new Error(`Credenciales incorrectas.<br><br>Te quedan <strong style="color: #ef4444; font-size: 1.05em;">${clientAttempt.remainingAttempts} intento(s)</strong> antes del bloqueo del sistema.`);
      err.code = 'USER_NOT_FOUND';
      err.remainingAttempts = clientAttempt.remainingAttempts;
      throw err;
    }
  },

  /**
   * Cierra la sesión activa
   */
  async logout() {
    this.currentUser = null;
    sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
    try {
      await this.db.delete('sessions', 'current_session');
    } catch (e) {
      console.warn('Error al limpiar sesión en DB:', e);
    }
  },

  /**
   * Restaura la sesión activa al recargar la página dentro de la misma pestaña/navegador.
   * Por seguridad estricta, si el navegador o pestaña fue cerrado, sessionStorage estará vacío
   * y la sesión no se restaurará automáticamente, requiriendo iniciar sesión de nuevo.
   */
  async restoreSession() {
    const userId = sessionStorage.getItem(this.SESSION_STORAGE_KEY);

    if (!userId) {
      // El navegador o pestaña fue cerrado: limpiar cualquier rastro persistido
      try {
        await this.db.delete('sessions', 'current_session');
      } catch (e) {}
      this.currentUser = null;
      return null;
    }

    if (userId) {
      const user = await this.userModel.getById(userId);
      if (user && user.status === 'active') {
        this.currentUser = user;
        return this.currentUser;
      }
    }

    // Si el usuario no existe o está inactivo, limpiar sesión
    sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
    try {
      await this.db.delete('sessions', 'current_session');
    } catch (e) {}
    this.currentUser = null;
    return null;
  },

  getCurrentUser() {
    return this.currentUser;
  },

  hasPermission(permissionKey) {
    if (!this.currentUser || !this.currentUser.role) return false;
    if (this.currentUser.role.id === 'role_superadmin') return true;

    const permissions = this.currentUser.role.permissions || [];
    return permissions.includes(permissionKey);
  }
};
