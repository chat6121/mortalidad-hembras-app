-- ============================================================================
-- ESQUEMA DE BASE DE DATOS PARA SQLITE 3
-- Proyecto: CoreAdmin MVC - Sistema de Usuarios, Roles y Seguridad
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- 1. TABLA: roles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT NOT NULL DEFAULT '[]', -- Formato JSON serializado
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

-- ----------------------------------------------------------------------------
-- 2. TABLA: users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_login TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users (role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);

-- ----------------------------------------------------------------------------
-- 3. TABLA: sessions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);

-- ----------------------------------------------------------------------------
-- 4. TABLA: audit_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  details TEXT, -- JSON serializado
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- 5. TABLA: mpd (Módulo de Producción / Registros SAP)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mpd (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vuelta INTEGER NOT NULL DEFAULT 0,
  pic INTEGER NOT NULL DEFAULT 0,
  cantidad INTEGER NOT NULL DEFAULT 0,
  causa INTEGER NOT NULL DEFAULT 0,
  peso REAL NULL,
  turno INTEGER NOT NULL DEFAULT 1,
  sala INTEGER NOT NULL DEFAULT 0,
  semana INTEGER NOT NULL DEFAULT 0,
  nota INTEGER NOT NULL DEFAULT 0,
  observacion TEXT NULL,
  granja TEXT NOT NULL DEFAULT '',
  zona TEXT NOT NULL DEFAULT '',
  maternidad TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mpd_pic ON mpd (pic);
CREATE INDEX IF NOT EXISTS idx_mpd_sala ON mpd (sala);
CREATE INDEX IF NOT EXISTS idx_mpd_nota ON mpd (nota);
CREATE INDEX IF NOT EXISTS idx_mpd_vuelta ON mpd (vuelta);

-- ----------------------------------------------------------------------------
-- TABLA: cierres_sala (Módulo Cierre de Salas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cierres_sala (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vini INTEGER NOT NULL DEFAULT 0,
  pic_inicio INTEGER NOT NULL DEFAULT 0,
  vcie INTEGER NOT NULL DEFAULT 0,
  pic_cierre INTEGER NOT NULL DEFAULT 0,
  sala INTEGER NOT NULL DEFAULT 0,
  vlote INTEGER NOT NULL DEFAULT 0,
  lote_pic TEXT NOT NULL DEFAULT '0',
  partos INTEGER NOT NULL DEFAULT 0,
  lnv INTEGER NOT NULL DEFAULT 0,
  lnm INTEGER NOT NULL DEFAULT 0,
  ln_mom INTEGER NOT NULL DEFAULT 0,
  mpd INTEGER NOT NULL DEFAULT 0,
  peso_x REAL NOT NULL DEFAULT 0.0,
  maternidad TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Cerrada',
  estatus TEXT NOT NULL DEFAULT 'Activa',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cierres_vcie ON cierres_sala (vcie);
CREATE INDEX IF NOT EXISTS idx_cierres_pic_cierre ON cierres_sala (pic_cierre);
CREATE INDEX IF NOT EXISTS idx_cierres_sala ON cierres_sala (sala);
CREATE INDEX IF NOT EXISTS idx_cierres_maternidad ON cierres_sala (maternidad);
CREATE INDEX IF NOT EXISTS idx_cierres_lote_pic ON cierres_sala (lote_pic);

-- ----------------------------------------------------------------------------
-- 6. TABLA: resumen_partos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resumen_partos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vuelta INTEGER NOT NULL DEFAULT 0,
  pic INTEGER NOT NULL DEFAULT 0,
  semana INTEGER NOT NULL DEFAULT 0,
  area TEXT NOT NULL DEFAULT '',
  turno INTEGER NOT NULL DEFAULT 1,
  partos INTEGER NOT NULL DEFAULT 0,
  lnv INTEGER NOT NULL DEFAULT 0,
  lnm INTEGER NOT NULL DEFAULT 0,
  ln_mom INTEGER NOT NULL DEFAULT 0,
  lnt INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_partos_vuelta ON resumen_partos (vuelta);
CREATE INDEX IF NOT EXISTS idx_partos_pic ON resumen_partos (pic);
CREATE INDEX IF NOT EXISTS idx_partos_semana ON resumen_partos (semana);
CREATE INDEX IF NOT EXISTS idx_partos_area ON resumen_partos (area);
CREATE INDEX IF NOT EXISTS idx_partos_turno ON resumen_partos (turno);

-- ----------------------------------------------------------------------------
-- 7. TABLA: pesos_edad (Curva estándar de peso de lechones de 1 a 40 días)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pesos_edad (
  id INTEGER PRIMARY KEY,
  edad INTEGER NOT NULL UNIQUE,
  peso REAL NOT NULL
);

INSERT OR REPLACE INTO pesos_edad (id, edad, peso) VALUES
(1, 1, 1.500), (2, 2, 1.800), (3, 3, 2.000), (4, 4, 2.300), (5, 5, 2.500),
(6, 6, 2.800), (7, 7, 3.000), (8, 8, 3.100), (9, 9, 3.200), (10, 10, 3.400),
(11, 11, 3.600), (12, 12, 3.900), (13, 13, 4.100), (14, 14, 4.300), (15, 15, 4.540),
(16, 16, 4.850), (17, 17, 5.040), (18, 18, 5.320), (19, 19, 5.520), (20, 20, 5.820),
(21, 21, 6.120), (22, 22, 6.420), (23, 23, 6.740), (24, 24, 7.040), (25, 25, 7.440),
(26, 26, 7.740), (27, 27, 8.140), (28, 28, 8.440), (29, 29, 8.800), (30, 30, 9.200),
(31, 31, 9.500), (32, 32, 9.900), (33, 33, 10.300), (34, 34, 10.700), (35, 35, 11.100),
(36, 36, 11.500), (37, 37, 11.900), (38, 38, 12.300), (39, 39, 12.700), (40, 40, 13.100);

-- ----------------------------------------------------------------------------
-- 8. TABLA: salas_maternidades (Catálogo de Salas, Maternidades, Áreas y Siglas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salas_maternidades (
  id INTEGER PRIMARY KEY,
  sala INTEGER NULL,
  mat TEXT NOT NULL,
  area TEXT NOT NULL,
  sigla TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sm_sala ON salas_maternidades (sala);
CREATE INDEX IF NOT EXISTS idx_sm_mat ON salas_maternidades (mat);
CREATE INDEX IF NOT EXISTS idx_sm_area ON salas_maternidades (area);
CREATE INDEX IF NOT EXISTS idx_sm_sigla ON salas_maternidades (sigla);

INSERT OR REPLACE INTO salas_maternidades (id, sala, mat, area, sigla) VALUES
(1, 1, 'M1', 'EST', 'E'), (2, 2, 'M1', 'EST', 'E'), (3, 3, 'M1', 'EST', 'E'), (4, 4, 'M1', 'EST', 'E'),
(5, 5, 'M1', 'EST', 'E'), (6, 6, 'M1', 'EST', 'E'), (7, 7, 'M1', 'EST', 'E'), (8, 8, 'M1', 'EST', 'E'),
(9, 9, 'M2', 'EST', 'E'), (10, 10, 'M2', 'EST', 'E'), (11, 11, 'M2', 'EST', 'E'), (12, 12, 'M2', 'EST', 'E'),
(13, 13, 'M2', 'EST', 'E'), (14, 14, 'M2', 'EST', 'E'), (15, 15, 'M2', 'EST', 'E'), (16, 16, 'M2', 'EST', 'E'), (17, 17, 'M2', 'EST', 'E'),
(18, 18, 'M3', 'EST', 'E'), (19, 19, 'M3', 'EST', 'E'), (20, 20, 'M3', 'EST', 'E'), (21, 21, 'M3', 'EST', 'E'),
(22, 22, 'M3', 'EST', 'E'), (23, 23, 'M3', 'EST', 'E'), (24, 24, 'M3', 'EST', 'E'),
(25, 25, 'M4', 'EXP', 'X'), (26, 26, 'M4', 'EXP', 'X'), (27, 27, 'M4', 'EXP', 'X'), (28, 28, 'M4', 'EXP', 'X'),
(29, 29, 'M4', 'EXP', 'X'), (30, 30, 'M4', 'EXP', 'X'), (31, 31, 'M4', 'EXP', 'X'), (32, 32, 'M4', 'EXP', 'X'), (33, 33, 'M4', 'EXP', 'X'),
(34, 34, 'M5', 'EXP', 'X'), (35, 35, 'M5', 'EXP', 'X'), (36, 36, 'M5', 'EXP', 'X'), (37, 37, 'M5', 'EXP', 'X'),
(38, 38, 'M5', 'EXP', 'X'), (39, 39, 'M5', 'EXP', 'X'), (40, 40, 'M5', 'EXP', 'X'), (41, 41, 'M5', 'EXP', 'X'),
(42, NULL, 'G1', 'EST', 'E'), (43, NULL, 'G2', 'EST', 'E'), (44, NULL, 'G3', 'EST', 'E'), (45, NULL, 'G4', 'EST', 'E'),
(46, NULL, 'G5', 'EST', 'E'), (47, NULL, 'G6', 'EXP', 'X'), (48, NULL, 'G7', 'EXP', 'X'), (49, NULL, 'G8', 'EXP', 'X'),
(50, NULL, 'G9', 'EXP', 'X'), (51, NULL, 'G10', 'EST', 'E'), (52, NULL, 'G11', 'EST', 'E');

-- ----------------------------------------------------------------------------
-- 9. TABLA: destetes (Eventos de Destete en Producción Porcina)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS destetes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  vfin INTEGER NOT NULL,
  fin INTEGER NOT NULL,
  vlote INTEGER NOT NULL,
  lote_pic INTEGER NOT NULL,
  sala INTEGER NOT NULL,
  granja TEXT NOT NULL,
  zona TEXT NOT NULL,
  maternidad TEXT NOT NULL,
  dias INTEGER NOT NULL DEFAULT 0,
  sitio2 INTEGER NOT NULL DEFAULT 0,
  recria INTEGER NOT NULL DEFAULT 0,
  muertos INTEGER NOT NULL DEFAULT 0,
  eliminados INTEGER NOT NULL DEFAULT 0,
  cant_s2 INTEGER NOT NULL DEFAULT 0,
  peso_x_s2 REAL NOT NULL DEFAULT 0.0,
  efic_s2 REAL NOT NULL DEFAULT 0.0,
  peso_n_s2 INTEGER NOT NULL DEFAULT 0,
  peso_x_r REAL NOT NULL DEFAULT 0.0,
  efic_r REAL NOT NULL DEFAULT 0.0,
  peso_n_r INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_destetes_fin ON destetes (fin);
CREATE INDEX IF NOT EXISTS idx_destetes_vfin ON destetes (vfin);
CREATE INDEX IF NOT EXISTS idx_destetes_sala ON destetes (sala);
CREATE INDEX IF NOT EXISTS idx_destetes_maternidad ON destetes (maternidad);
CREATE INDEX IF NOT EXISTS idx_destetes_granja ON destetes (granja);
CREATE INDEX IF NOT EXISTS idx_destetes_lote_pic ON destetes (lote_pic);
CREATE INDEX IF NOT EXISTS idx_destetes_fecha ON destetes (fecha);

-- ----------------------------------------------------------------------------
-- 9. TABLA: cierres_mes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cierres_mes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ano INTEGER NOT NULL,
  mes TEXT NOT NULL,
  mes_num INTEGER NOT NULL,
  fecha_ini TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  dias INTEGER NOT NULL DEFAULT 30,
  pic_inicio INTEGER NOT NULL,
  pic_fin INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Abierto',
  fecha_cierre TEXT NULL,
  cerrado_por TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_cierres_mes_ano ON cierres_mes (ano);
CREATE INDEX IF NOT EXISTS idx_cierres_mes_mes ON cierres_mes (mes);
CREATE INDEX IF NOT EXISTS idx_cierres_mes_pic_inicio ON cierres_mes (pic_inicio);
CREATE INDEX IF NOT EXISTS idx_cierres_mes_pic_fin ON cierres_mes (pic_fin);
CREATE INDEX IF NOT EXISTS idx_cierres_mes_estado ON cierres_mes (estado);

-- ----------------------------------------------------------------------------
-- 10. TABLA: maternidad
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maternidad (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  nro TEXT NOT NULL,
  pic_inicio INTEGER NOT NULL,
  pic_cierre TEXT NULL,
  sala INTEGER NOT NULL,
  vlote INTEGER NULL,
  lote_pic TEXT NOT NULL,
  partos INTEGER NOT NULL DEFAULT 0,
  lnv INTEGER NOT NULL DEFAULT 0,
  lnm INTEGER NOT NULL DEFAULT 0,
  ln_mo INTEGER NOT NULL DEFAULT 0,
  mpd_al_cierre INTEGER NOT NULL DEFAULT 0,
  peso_x REAL NULL,
  estado TEXT NOT NULL DEFAULT 'Cerrada',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_maternidad_area ON maternidad (area);
CREATE INDEX IF NOT EXISTS idx_maternidad_sala ON maternidad (sala);
CREATE INDEX IF NOT EXISTS idx_maternidad_lote_pic ON maternidad (lote_pic);
CREATE INDEX IF NOT EXISTS idx_maternidad_pic_inicio ON maternidad (pic_inicio);
CREATE INDEX IF NOT EXISTS idx_maternidad_estado ON maternidad (estado);

-- ----------------------------------------------------------------------------
-- 11. TABLA: partos_salas (Seguimiento diario acumulado por sala abierta)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partos_salas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vuelta INTEGER NULL,
  pic_inicio INTEGER NOT NULL,
  sala INTEGER NOT NULL,
  partos INTEGER NOT NULL DEFAULT 0,
  lnv INTEGER NOT NULL DEFAULT 0,
  lnm INTEGER NOT NULL DEFAULT 0,
  ln_mo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_partos_salas_sala ON partos_salas (sala);
CREATE INDEX IF NOT EXISTS idx_partos_salas_pic ON partos_salas (pic_inicio);

-- ----------------------------------------------------------------------------
-- SEMBRADO DE DATOS INICIALES (SEED DATA)
-- ----------------------------------------------------------------------------
INSERT OR IGNORE INTO roles (id, name, description, permissions, is_system, created_at) VALUES
('role_superadmin', 'Super Administrador', 'Acceso total y sin restricciones a todos los módulos y acciones del sistema', '["users:create", "users:read", "users:update", "users:delete", "roles:manage", "system:manage"]', 1, datetime('now')),
('role_admin', 'Administrador', 'Gestión completa de usuarios y visualización de roles y auditorías', '["users:create", "users:read", "users:update", "users:delete", "roles:read"]', 0, datetime('now')),
('role_editor', 'Editor', 'Puede crear y editar información de usuarios pero no puede eliminarlos', '["users:create", "users:read", "users:update", "roles:read"]', 0, datetime('now')),
('role_viewer', 'Visualizador', 'Solo lectura. Consulta la lista de usuarios y roles sin permisos de modificación', '["users:read", "roles:read"]', 0, datetime('now'));

INSERT OR IGNORE INTO users (id, full_name, username, email, password_hash, role_id, status, failed_attempts, locked_until, created_at) VALUES
('user_admin', 'Administrador Principal', 'admin', 'admin@sistema.local', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'role_superadmin', 'active', 0, NULL, datetime('now')),
('user_editor', 'Carlos Mendoza', 'cmendoza', 'carlos.mendoza@sistema.local', 'a881b23ae440eaae2d78772a5a513511eb44d7fc55ddfe927ec10f0f4e3c9d72', 'role_editor', 'active', 0, NULL, datetime('now'));

