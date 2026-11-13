-- ============================================================================
-- ESQUEMA DE BASE DE DATOS PARA POSTGRESQL 14+
-- Proyecto: CoreAdmin MVC - Sistema de Usuarios, Roles y Seguridad
-- ============================================================================

-- Habilitar extensión para UUIDs si se desea utilizar v4
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. TABLA: roles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 2. TABLA: users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id VARCHAR(50) NOT NULL REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ----------------------------------------------------------------------------
-- 3. TABLA: sessions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  token VARCHAR(500),
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- ----------------------------------------------------------------------------
-- 4. TABLA: audit_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- ----------------------------------------------------------------------------
-- TABLA: mpd (Módulo de Producción / Registros SAP)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mpd (
  id BIGSERIAL PRIMARY KEY,
  vuelta INT NOT NULL DEFAULT 0,
  pic INT NOT NULL DEFAULT 0,
  cantidad INT NOT NULL DEFAULT 0,
  causa INT NOT NULL DEFAULT 0,
  peso NUMERIC(10,2) NULL,
  turno INT NOT NULL DEFAULT 1,
  sala INT NOT NULL DEFAULT 0,
  semana INT NOT NULL DEFAULT 0,
  nota INT NOT NULL DEFAULT 0,
  observacion VARCHAR(255) NULL,
  granja VARCHAR(50) NOT NULL DEFAULT '',
  zona VARCHAR(10) NOT NULL DEFAULT '',
  maternidad VARCHAR(50) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mpd_pic ON mpd(pic);
CREATE INDEX IF NOT EXISTS idx_mpd_sala ON mpd(sala);
CREATE INDEX IF NOT EXISTS idx_mpd_nota ON mpd(nota);
CREATE INDEX IF NOT EXISTS idx_mpd_vuelta ON mpd(vuelta);

-- ----------------------------------------------------------------------------
-- TABLA: cierres_sala (Módulo Cierre de Salas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cierres_sala (
  id BIGSERIAL PRIMARY KEY,
  vini INT NOT NULL DEFAULT 0,
  pic_inicio INT NOT NULL DEFAULT 0,
  vcie INT NOT NULL DEFAULT 0,
  pic_cierre INT NOT NULL DEFAULT 0,
  sala INT NOT NULL DEFAULT 0,
  vlote INT NOT NULL DEFAULT 0,
  lote_pic VARCHAR(20) NOT NULL DEFAULT '0',
  partos INT NOT NULL DEFAULT 0,
  lnv INT NOT NULL DEFAULT 0,
  lnm INT NOT NULL DEFAULT 0,
  ln_mom INT NOT NULL DEFAULT 0,
  mpd INT NOT NULL DEFAULT 0,
  peso_x NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
  maternidad VARCHAR(50) NOT NULL DEFAULT '',
  estado VARCHAR(20) NOT NULL DEFAULT 'Cerrada',
  estatus VARCHAR(20) NOT NULL DEFAULT 'Activa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cierres_vcie ON cierres_sala(vcie);
CREATE INDEX IF NOT EXISTS idx_cierres_pic_cierre ON cierres_sala(pic_cierre);
CREATE INDEX IF NOT EXISTS idx_cierres_sala ON cierres_sala(sala);
CREATE INDEX IF NOT EXISTS idx_cierres_maternidad ON cierres_sala(maternidad);
CREATE INDEX IF NOT EXISTS idx_cierres_lote_pic ON cierres_sala(lote_pic);

-- ----------------------------------------------------------------------------
-- 6. TABLA: resumen_partos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resumen_partos (
  id BIGSERIAL PRIMARY KEY,
  vuelta INT NOT NULL DEFAULT 0,
  pic INT NOT NULL DEFAULT 0,
  semana INT NOT NULL DEFAULT 0,
  area VARCHAR(50) NOT NULL DEFAULT '',
  turno INT NOT NULL DEFAULT 1,
  partos INT NOT NULL DEFAULT 0,
  lnv INT NOT NULL DEFAULT 0,
  lnm INT NOT NULL DEFAULT 0,
  ln_mom INT NOT NULL DEFAULT 0,
  lnt INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partos_vuelta ON resumen_partos(vuelta);
CREATE INDEX IF NOT EXISTS idx_partos_pic ON resumen_partos(pic);
CREATE INDEX IF NOT EXISTS idx_partos_semana ON resumen_partos(semana);
CREATE INDEX IF NOT EXISTS idx_partos_area ON resumen_partos(area);
CREATE INDEX IF NOT EXISTS idx_partos_turno ON resumen_partos(turno);

-- ----------------------------------------------------------------------------
-- 7. TABLA: pesos_edad (Curva estándar de peso de lechones de 1 a 40 días)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pesos_edad (
  id INT PRIMARY KEY,
  edad INT NOT NULL UNIQUE,
  peso NUMERIC(6,3) NOT NULL
);

INSERT INTO pesos_edad (id, edad, peso) VALUES
(1, 1, 1.500), (2, 2, 1.800), (3, 3, 2.000), (4, 4, 2.300), (5, 5, 2.500),
(6, 6, 2.800), (7, 7, 3.000), (8, 8, 3.100), (9, 9, 3.200), (10, 10, 3.400),
(11, 11, 3.600), (12, 12, 3.900), (13, 13, 4.100), (14, 14, 4.300), (15, 15, 4.540),
(16, 16, 4.850), (17, 17, 5.040), (18, 18, 5.320), (19, 19, 5.520), (20, 20, 5.820),
(21, 21, 6.120), (22, 22, 6.420), (23, 23, 6.740), (24, 24, 7.040), (25, 25, 7.440),
(26, 26, 7.740), (27, 27, 8.140), (28, 28, 8.440), (29, 29, 8.800), (30, 30, 9.200),
(31, 31, 9.500), (32, 32, 9.900), (33, 33, 10.300), (34, 34, 10.700), (35, 35, 11.100),
(36, 36, 11.500), (37, 37, 11.900), (38, 38, 12.300), (39, 39, 12.700), (40, 40, 13.100)
ON CONFLICT (id) DO UPDATE SET peso = EXCLUDED.peso;

-- ----------------------------------------------------------------------------
-- 8. TABLA: salas_maternidades (Catálogo de Salas, Maternidades, Áreas y Siglas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salas_maternidades (
  id INT PRIMARY KEY,
  sala INT NULL,
  mat VARCHAR(20) NOT NULL,
  area VARCHAR(20) NOT NULL,
  sigla VARCHAR(10) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sm_sala ON salas_maternidades(sala);
CREATE INDEX IF NOT EXISTS idx_sm_mat ON salas_maternidades(mat);
CREATE INDEX IF NOT EXISTS idx_sm_area ON salas_maternidades(area);
CREATE INDEX IF NOT EXISTS idx_sm_sigla ON salas_maternidades(sigla);

INSERT INTO salas_maternidades (id, sala, mat, area, sigla) VALUES
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
(50, NULL, 'G9', 'EXP', 'X'), (51, NULL, 'G10', 'EST', 'E'), (52, NULL, 'G11', 'EST', 'E')
ON CONFLICT (id) DO UPDATE SET mat = EXCLUDED.mat, area = EXCLUDED.area, sigla = EXCLUDED.sigla;

-- ----------------------------------------------------------------------------
-- 9. TABLA: destetes (Eventos de Destete en Producción Porcina)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS destetes (
  id BIGSERIAL PRIMARY KEY,
  fecha VARCHAR(20) NOT NULL,
  vfin INT NOT NULL,
  fin INT NOT NULL,
  vlote INT NOT NULL,
  lote_pic INT NOT NULL,
  sala INT NOT NULL,
  granja VARCHAR(20) NOT NULL,
  zona VARCHAR(10) NOT NULL,
  maternidad VARCHAR(20) NOT NULL,
  dias INT NOT NULL DEFAULT 0,
  sitio2 INT NOT NULL DEFAULT 0,
  recria INT NOT NULL DEFAULT 0,
  muertos INT NOT NULL DEFAULT 0,
  eliminados INT NOT NULL DEFAULT 0,
  cant_s2 INT NOT NULL DEFAULT 0,
  peso_x_s2 NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  efic_s2 NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  peso_n_s2 INT NOT NULL DEFAULT 0,
  peso_x_r NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  efic_r NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  peso_n_r INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_destetes_fin ON destetes(fin);
CREATE INDEX IF NOT EXISTS idx_destetes_vfin ON destetes(vfin);
CREATE INDEX IF NOT EXISTS idx_destetes_sala ON destetes(sala);
CREATE INDEX IF NOT EXISTS idx_destetes_maternidad ON destetes(maternidad);
CREATE INDEX IF NOT EXISTS idx_destetes_granja ON destetes(granja);
CREATE INDEX IF NOT EXISTS idx_destetes_lote_pic ON destetes(lote_pic);
CREATE INDEX IF NOT EXISTS idx_destetes_fecha ON destetes(fecha);

-- ----------------------------------------------------------------------------
-- 9. TABLA: cierres_mes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cierres_mes (
  id SERIAL PRIMARY KEY,
  ano INT NOT NULL,
  mes VARCHAR(20) NOT NULL,
  mes_num INT NOT NULL,
  fecha_ini VARCHAR(20) NOT NULL,
  fecha_fin VARCHAR(20) NOT NULL,
  dias INT NOT NULL DEFAULT 30,
  pic_inicio INT NOT NULL,
  pic_fin INT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'Abierto',
  fecha_cierre TIMESTAMP WITH TIME ZONE NULL,
  cerrado_por VARCHAR(50) NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX IF NOT EXISTS idx_cierres_mes_ano ON cierres_mes(ano);
CREATE INDEX IF NOT EXISTS idx_cierres_mes_mes ON cierres_mes(mes);
CREATE INDEX IF NOT EXISTS idx_cierres_mes_pic_inicio ON cierres_mes(pic_inicio);
CREATE INDEX IF NOT EXISTS idx_cierres_mes_pic_fin ON cierres_mes(pic_fin);
CREATE INDEX IF NOT EXISTS idx_cierres_mes_estado ON cierres_mes(estado);

-- ----------------------------------------------------------------------------
-- 10. TABLA: maternidad
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maternidad (
  id BIGSERIAL PRIMARY KEY,
  area VARCHAR(10) NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  nro VARCHAR(10) NOT NULL,
  pic_inicio INT NOT NULL,
  pic_cierre VARCHAR(10) NULL,
  sala INT NOT NULL,
  vlote INT NULL,
  lote_pic VARCHAR(10) NOT NULL,
  partos INT NOT NULL DEFAULT 0,
  lnv INT NOT NULL DEFAULT 0,
  lnm INT NOT NULL DEFAULT 0,
  ln_mo INT NOT NULL DEFAULT 0,
  mpd_al_cierre INT NOT NULL DEFAULT 0,
  peso_x NUMERIC(10,2) NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'Cerrada',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maternidad_area ON maternidad(area);
CREATE INDEX IF NOT EXISTS idx_maternidad_sala ON maternidad(sala);
CREATE INDEX IF NOT EXISTS idx_maternidad_lote_pic ON maternidad(lote_pic);
CREATE INDEX IF NOT EXISTS idx_maternidad_pic_inicio ON maternidad(pic_inicio);
CREATE INDEX IF NOT EXISTS idx_maternidad_estado ON maternidad(estado);

-- ----------------------------------------------------------------------------
-- 11. TABLA: partos_salas (Seguimiento diario acumulado por sala abierta)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partos_salas (
  id BIGSERIAL PRIMARY KEY,
  vuelta INT NULL,
  pic_inicio INT NOT NULL,
  sala INT NOT NULL,
  partos INT NOT NULL DEFAULT 0,
  lnv INT NOT NULL DEFAULT 0,
  lnm INT NOT NULL DEFAULT 0,
  ln_mo INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partos_salas_sala ON partos_salas(sala);
CREATE INDEX IF NOT EXISTS idx_partos_salas_pic ON partos_salas(pic_inicio);

-- ----------------------------------------------------------------------------
-- SEMBRADO DE DATOS INICIALES (SEED DATA)
-- ----------------------------------------------------------------------------
INSERT INTO roles (id, name, description, permissions, is_system, created_at) VALUES
('role_superadmin', 'Super Administrador', 'Acceso total y sin restricciones a todos los módulos y acciones del sistema', '["users:create", "users:read", "users:update", "users:delete", "roles:manage", "system:manage"]'::jsonb, true, CURRENT_TIMESTAMP),
('role_admin', 'Administrador', 'Gestión completa de usuarios y visualización de roles y auditorías', '["users:create", "users:read", "users:update", "users:delete", "roles:read"]'::jsonb, false, CURRENT_TIMESTAMP),
('role_editor', 'Editor', 'Puede crear y editar información de usuarios pero no puede eliminarlos', '["users:create", "users:read", "users:update", "roles:read"]'::jsonb, false, CURRENT_TIMESTAMP),
('role_viewer', 'Visualizador', 'Solo lectura. Consulta la lista de usuarios y roles sin permisos de modificación', '["users:read", "roles:read"]'::jsonb, false, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, full_name, username, email, password_hash, role_id, status, failed_attempts, locked_until, created_at) VALUES
('user_admin', 'Administrador Principal', 'admin', 'admin@sistema.local', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'role_superadmin', 'active', 0, NULL, CURRENT_TIMESTAMP),
('user_editor', 'Carlos Mendoza', 'cmendoza', 'carlos.mendoza@sistema.local', 'a881b23ae440eaae2d78772a5a513511eb44d7fc55ddfe927ec10f0f4e3c9d72', 'role_editor', 'active', 0, NULL, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

