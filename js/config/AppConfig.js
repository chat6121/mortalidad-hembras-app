/**
 * AppConfig: Configuración global del sistema.
 * Permite cambiar entre persistencia local (IndexedDB) y Backend API (MySQL/PostgreSQL/SQLite)
 * con una sola variable.
 */
window.App = window.App || {};

window.App.Config = {
  // Entorno: 'offline' (IndexedDB) o 'api' (Backend REST)
  STORAGE_DRIVER: 'indexeddb', // Cambiar a 'api' cuando se conecte a un backend

  // Configuración del servidor Backend (para cuando STORAGE_DRIVER = 'api')
  API: {
    BASE_URL: 'http://localhost:3000/api',
    TIMEOUT_MS: 10000,
    ENDPOINTS: {
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      ME: '/auth/me',
      USERS: '/users',
      USER_UNLOCK: (id) => `/users/${id}/unlock`,
      ROLES: '/roles',
      STATS: '/dashboard/stats'
    }
  },

  // Políticas de Seguridad
  SECURITY: {
    MAX_FAILED_ATTEMPTS: 3,
    LOCKOUT_DURATION_SECONDS: 60,
    TOKEN_STORAGE_KEY: 'app_auth_bearer_token',
    SESSION_USER_KEY: 'app_active_session_user_id'
  },

  // Base de datos de destino recomendada
  SUPPORTED_DATABASES: ['MySQL 8.0+', 'PostgreSQL 14+', 'SQLite 3']
};

