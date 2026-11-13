-- ============================================================================
-- ESQUEMA DE BASE DE DATOS PARA MYSQL 8.0+ / MARIADB 10.5+
-- Proyecto: CoreAdmin MVC - Sistema de Usuarios, Roles y Seguridad
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `coreadmin_db` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `coreadmin_db`;

-- ----------------------------------------------------------------------------
-- 1. TABLA: roles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `permissions` JSON NOT NULL COMMENT 'Array JSON con claves de permisos ej: ["users:read", "users:create"]',
  `is_system` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Protege los roles base contra eliminación',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. TABLA: users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role_id` VARCHAR(50) NOT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `failed_attempts` INT NOT NULL DEFAULT 0,
  `locked_until` DATETIME NULL COMMENT 'Fecha y hora hasta la que se encuentra bloqueada la cuenta',
  `last_login` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_users_role` (`role_id`),
  INDEX `idx_users_status` (`status`),
  CONSTRAINT `fk_users_role` 
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) 
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. TABLA: sessions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` VARCHAR(100) NOT NULL,
  `user_id` VARCHAR(50) NOT NULL,
  `token` VARCHAR(500) NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_sessions_user` (`user_id`),
  CONSTRAINT `fk_sessions_user` 
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. TABLA: audit_logs (Preparada para auditoría y trazabilidad enterprise)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `user_id` VARCHAR(50) NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_audit_user` (`user_id`),
  INDEX `idx_audit_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLA: mpd (Módulo de Producción / Registros SAP)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mpd` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `vuelta` INT NOT NULL DEFAULT 0,
  `pic` INT NOT NULL DEFAULT 0,
  `cantidad` INT NOT NULL DEFAULT 0,
  `causa` INT NOT NULL DEFAULT 0,
  `peso` DECIMAL(10,2) NULL,
  `turno` INT NOT NULL DEFAULT 1,
  `sala` INT NOT NULL DEFAULT 0,
  `semana` INT NOT NULL DEFAULT 0,
  `nota` INT NOT NULL DEFAULT 0,
  `observacion` VARCHAR(255) NULL,
  `granja` VARCHAR(50) NOT NULL DEFAULT '',
  `zona` VARCHAR(10) NOT NULL DEFAULT '',
  `maternidad` VARCHAR(50) NOT NULL DEFAULT '',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_mpd_pic` (`pic`),
  INDEX `idx_mpd_sala` (`sala`),
  INDEX `idx_mpd_nota` (`nota`),
  INDEX `idx_mpd_vuelta` (`vuelta`),
  INDEX `idx_mpd_semana` (`semana`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLA: cierres_sala (Módulo Cierre de Salas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cierres_sala` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `vini` INT NOT NULL DEFAULT 0,
  `pic_inicio` INT NOT NULL DEFAULT 0,
  `vcie` INT NOT NULL DEFAULT 0,
  `pic_cierre` INT NOT NULL DEFAULT 0,
  `sala` INT NOT NULL DEFAULT 0,
  `vlote` INT NOT NULL DEFAULT 0,
  `lote_pic` VARCHAR(20) NOT NULL DEFAULT '0',
  `partos` INT NOT NULL DEFAULT 0,
  `lnv` INT NOT NULL DEFAULT 0,
  `lnm` INT NOT NULL DEFAULT 0,
  `ln_mom` INT NOT NULL DEFAULT 0,
  `mpd` INT NOT NULL DEFAULT 0,
  `peso_x` DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  `maternidad` VARCHAR(50) NOT NULL DEFAULT '',
  `estado` VARCHAR(20) NOT NULL DEFAULT 'Cerrada',
  `estatus` VARCHAR(20) NOT NULL DEFAULT 'Activa',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_cierres_vcie` (`vcie`),
  INDEX `idx_cierres_pic_cierre` (`pic_cierre`),
  INDEX `idx_cierres_sala` (`sala`),
  INDEX `idx_cierres_maternidad` (`maternidad`),
  INDEX `idx_cierres_lote_pic` (`lote_pic`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. TABLA: resumen_partos (Resumen de Partos de Maternidad)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `resumen_partos` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `vuelta` INT NOT NULL DEFAULT 0,
  `pic` INT NOT NULL DEFAULT 0,
  `semana` INT NOT NULL DEFAULT 0,
  `area` VARCHAR(50) NOT NULL DEFAULT '',
  `turno` INT NOT NULL DEFAULT 1,
  `partos` INT NOT NULL DEFAULT 0,
  `lnv` INT NOT NULL DEFAULT 0 COMMENT 'Lechones Nacidos Vivos',
  `lnm` INT NOT NULL DEFAULT 0 COMMENT 'Lechones Nacidos Muertos / Mortinatos',
  `ln_mom` INT NOT NULL DEFAULT 0 COMMENT 'Lechones Momificados',
  `lnt` INT NOT NULL DEFAULT 0 COMMENT 'Lechones Nacidos Totales (LNV + LNM + LNMom)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_partos_vuelta` (`vuelta`),
  INDEX `idx_partos_pic` (`pic`),
  INDEX `idx_partos_semana` (`semana`),
  INDEX `idx_partos_area` (`area`),
  INDEX `idx_partos_turno` (`turno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. TABLA: pesos_edad (Curva estándar de peso de lechones de 1 a 40 días)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pesos_edad` (
  `id` INT NOT NULL,
  `edad` INT NOT NULL COMMENT 'Edad en días de vida del lechón (1 a 40)',
  `peso` DECIMAL(6,3) NOT NULL COMMENT 'Peso estándar en kilogramos (kg)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pesos_edad` (`edad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `pesos_edad` (`id`, `edad`, `peso`) VALUES
(1, 1, 1.500), (2, 2, 1.800), (3, 3, 2.000), (4, 4, 2.300), (5, 5, 2.500),
(6, 6, 2.800), (7, 7, 3.000), (8, 8, 3.100), (9, 9, 3.200), (10, 10, 3.400),
(11, 11, 3.600), (12, 12, 3.900), (13, 13, 4.100), (14, 14, 4.300), (15, 15, 4.540),
(16, 16, 4.850), (17, 17, 5.040), (18, 18, 5.320), (19, 19, 5.520), (20, 20, 5.820),
(21, 21, 6.120), (22, 22, 6.420), (23, 23, 6.740), (24, 24, 7.040), (25, 25, 7.440),
(26, 26, 7.740), (27, 27, 8.140), (28, 28, 8.440), (29, 29, 8.800), (30, 30, 9.200),
(31, 31, 9.500), (32, 32, 9.900), (33, 33, 10.300), (34, 34, 10.700), (35, 35, 11.100),
(36, 36, 11.500), (37, 37, 11.900), (38, 38, 12.300), (39, 39, 12.700), (40, 40, 13.100)
ON DUPLICATE KEY UPDATE `peso`=VALUES(`peso`);

-- ----------------------------------------------------------------------------
-- 8. TABLA: salas_maternidades (Catálogo de Salas, Maternidades, Áreas y Siglas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `salas_maternidades` (
  `id` INT NOT NULL,
  `sala` INT NULL COMMENT 'Número de sala (1 a 41) o NULL para gestaciones',
  `mat` VARCHAR(20) NOT NULL COMMENT 'Pabellón de Maternidad (M1-M5) o Gestación (G1-G11)',
  `area` VARCHAR(20) NOT NULL COMMENT 'Área operativa (EST o EXP)',
  `sigla` VARCHAR(10) NOT NULL COMMENT 'Sigla de Granja (E o X)',
  PRIMARY KEY (`id`),
  INDEX `idx_sm_sala` (`sala`),
  INDEX `idx_sm_mat` (`mat`),
  INDEX `idx_sm_area` (`area`),
  INDEX `idx_sm_sigla` (`sigla`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `salas_maternidades` (`id`, `sala`, `mat`, `area`, `sigla`) VALUES
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
ON DUPLICATE KEY UPDATE `mat`=VALUES(`mat`), `area`=VALUES(`area`), `sigla`=VALUES(`sigla`);

-- ----------------------------------------------------------------------------
-- 9. TABLA: destetes (Eventos de Destete en Producción Porcina)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `destetes` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `fecha` VARCHAR(20) NOT NULL COMMENT 'Fecha en formato dd-mm-yyyy',
  `vfin` INT NOT NULL COMMENT 'Vuelta de fin',
  `fin` INT NOT NULL COMMENT 'PIC de fin',
  `vlote` INT NOT NULL COMMENT 'Vuelta de lote',
  `lote_pic` INT NOT NULL COMMENT 'PIC del lote',
  `sala` INT NOT NULL COMMENT 'Número de sala',
  `granja` VARCHAR(20) NOT NULL COMMENT 'Granja o área operativa (EST / EXP)',
  `zona` VARCHAR(10) NOT NULL COMMENT 'Zona (E / X)',
  `maternidad` VARCHAR(20) NOT NULL COMMENT 'Pabellón de Maternidad (M1-M5)',
  `dias` INT NOT NULL DEFAULT 0 COMMENT 'Días de lactancia / edad al destete',
  `sitio2` INT NOT NULL DEFAULT 0 COMMENT 'Lechones enviados a Sitio 2 (Bruto)',
  `recria` INT NOT NULL DEFAULT 0 COMMENT 'Lechones recría',
  `muertos` INT NOT NULL DEFAULT 0 COMMENT 'Lechones muertos',
  `eliminados` INT NOT NULL DEFAULT 0 COMMENT 'Lechones eliminados/descartes',
  `cant_s2` INT NOT NULL DEFAULT 0 COMMENT 'Cantidad neta Sitio 2 (Sitio 2 - Eliminados)',
  `peso_x_s2` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Peso promedio Sitio 2 (kg)',
  `efic_s2` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Eficiencia Sitio 2 contra curva estándar (%)',
  `peso_n_s2` INT NOT NULL DEFAULT 0 COMMENT 'Peso neto total Sitio 2 (kg)',
  `peso_x_r` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Peso promedio Recría (kg)',
  `efic_r` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Eficiencia Recría (%)',
  `peso_n_r` INT NOT NULL DEFAULT 0 COMMENT 'Peso neto total Recría (kg)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_destetes_fin` (`fin`),
  INDEX `idx_destetes_vfin` (`vfin`),
  INDEX `idx_destetes_sala` (`sala`),
  INDEX `idx_destetes_maternidad` (`maternidad`),
  INDEX `idx_destetes_granja` (`granja`),
  INDEX `idx_destetes_lote_pic` (`lote_pic`),
  INDEX `idx_destetes_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. TABLA: cierres_mes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cierres_mes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `ano` INT NOT NULL,
  `mes` VARCHAR(20) NOT NULL,
  `mes_num` INT NOT NULL,
  `fecha_ini` VARCHAR(20) NOT NULL,
  `fecha_fin` VARCHAR(20) NOT NULL,
  `dias` INT NOT NULL DEFAULT 30,
  `pic_inicio` INT NOT NULL,
  `pic_fin` INT NOT NULL,
  `estado` ENUM('Abierto', 'Cerrado') NOT NULL DEFAULT 'Abierto',
  `fecha_cierre` DATETIME NULL,
  `cerrado_por` VARCHAR(50) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_cierres_mes_ano` (`ano`),
  INDEX `idx_cierres_mes_mes` (`mes`),
  INDEX `idx_cierres_mes_pic_inicio` (`pic_inicio`),
  INDEX `idx_cierres_mes_pic_fin` (`pic_fin`),
  INDEX `idx_cierres_mes_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. TABLA: maternidad
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `maternidad` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `area` VARCHAR(10) NOT NULL COMMENT 'EST (Establecida) o EXP (Expansión)',
  `orden` INT NOT NULL DEFAULT 0,
  `nro` VARCHAR(10) NOT NULL COMMENT 'N° de orden operativo o -',
  `pic_inicio` INT NOT NULL COMMENT 'PIC de inicio',
  `pic_cierre` VARCHAR(10) NULL COMMENT 'PIC de cierre numérico, PRE o vacío',
  `sala` INT NOT NULL COMMENT 'Número de sala (1-41)',
  `vlote` INT NULL COMMENT 'Vuelta de lote',
  `lote_pic` VARCHAR(10) NOT NULL COMMENT 'Lote PIC numérico o PRE',
  `partos` INT NOT NULL DEFAULT 0,
  `lnv` INT NOT NULL DEFAULT 0 COMMENT 'Lechones Nacidos Vivos',
  `lnm` INT NOT NULL DEFAULT 0 COMMENT 'Lechones Nacidos Muertos',
  `ln_mo` INT NOT NULL DEFAULT 0 COMMENT 'Lechones Nacidos Momias',
  `mpd_al_cierre` INT NOT NULL DEFAULT 0 COMMENT 'Mortalidad Pre-Destete al Cierre',
  `peso_x` DECIMAL(10,2) NULL COMMENT 'Peso promedio al nacimiento (kg)',
  `estado` VARCHAR(20) NOT NULL DEFAULT 'Cerrada' COMMENT 'Cerrada o Pre-Parto',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_maternidad_area` (`area`),
  INDEX `idx_maternidad_sala` (`sala`),
  INDEX `idx_maternidad_lote_pic` (`lote_pic`),
  INDEX `idx_maternidad_pic_inicio` (`pic_inicio`),
  INDEX `idx_maternidad_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. TABLA: partos_salas (Seguimiento diario acumulado por sala abierta)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `partos_salas` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `vuelta` INT NULL COMMENT 'Vuelta PIC deducida o declarada',
  `pic_inicio` INT NOT NULL COMMENT 'PIC diario de seguimiento acumulado',
  `sala` INT NOT NULL COMMENT 'Número de sala (1-41)',
  `partos` INT NOT NULL DEFAULT 0,
  `lnv` INT NOT NULL DEFAULT 0 COMMENT 'Lechones Nacidos Vivos acumulados',
  `lnm` INT NOT NULL DEFAULT 0 COMMENT 'Lechones Nacidos Muertos acumulados',
  `ln_mo` INT NOT NULL DEFAULT 0 COMMENT 'Lechones Momias acumulados',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_partos_salas_sala` (`sala`),
  INDEX `idx_partos_salas_pic` (`pic_inicio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- SEMBRADO DE DATOS INICIALES (SEED DATA)
-- ----------------------------------------------------------------------------
INSERT INTO `roles` (`id`, `name`, `description`, `permissions`, `is_system`, `created_at`) VALUES
('role_superadmin', 'Super Administrador', 'Acceso total y sin restricciones a todos los módulos y acciones del sistema', '["users:create", "users:read", "users:update", "users:delete", "roles:manage", "system:manage"]', 1, NOW()),
('role_admin', 'Administrador', 'Gestión completa de usuarios y visualización de roles y auditorías', '["users:create", "users:read", "users:update", "users:delete", "roles:read"]', 0, NOW()),
('role_editor', 'Editor', 'Puede crear y editar información de usuarios pero no puede eliminarlos', '["users:create", "users:read", "users:update", "roles:read"]', 0, NOW()),
('role_viewer', 'Visualizador', 'Solo lectura. Consulta la lista de usuarios y roles sin permisos de modificación', '["users:read", "roles:read"]', 0, NOW())
ON DUPLICATE KEY UPDATE `name`=`name`;

-- Contraseña hasheada SHA-256 para 'admin123': 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
-- Contraseña hasheada SHA-256 para 'editor123': a881b23ae440eaae2d78772a5a513511eb44d7fc55ddfe927ec10f0f4e3c9d72
INSERT INTO `users` (`id`, `full_name`, `username`, `email`, `password_hash`, `role_id`, `status`, `failed_attempts`, `locked_until`, `created_at`) VALUES
('user_admin', 'Administrador Principal', 'admin', 'admin@sistema.local', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'role_superadmin', 'active', 0, NULL, NOW()),
('user_editor', 'Carlos Mendoza', 'cmendoza', 'carlos.mendoza@sistema.local', 'a881b23ae440eaae2d78772a5a513511eb44d7fc55ddfe927ec10f0f4e3c9d72', 'role_editor', 'active', 0, NULL, NOW())
ON DUPLICATE KEY UPDATE `username`=`username`;

