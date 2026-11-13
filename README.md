# Sistema de Autenticación, Gestión de Usuarios y Roles (MVC)

Sistema web moderno, minimalista y completamente **offline** desarrollado con **HTML5, CSS3 y JavaScript puro**, organizado bajo el patrón arquitectónico **MVC (Modelo - Vista - Controlador)** y con persistencia directa en la base de datos **IndexedDB** del navegador.

---

## 🚀 Cómo Ejecutar el Sistema

No requiere Node.js, PHP, Python, Apache ni servidores web externos.
1. Ve a la carpeta del proyecto.
2. Haz **doble clic en `index.html`** para abrirlo en cualquier navegador moderno (Google Chrome, Microsoft Edge, Mozilla Firefox, Brave, Opera, etc.).
3. ¡Listo! El sistema levantará automáticamente y creará la base de datos local en tu equipo.

---

## 🔑 Credenciales de Acceso Predeterminadas

El sistema se inicializa automáticamente con los siguientes accesos:

| Usuario | Contraseña | Rol | Privilegios |
| :--- | :--- | :--- | :--- |
| **`admin`** | **`admin123`** | **Super Administrador** | Acceso total (Usuarios, Roles, Permisos, Sistema) |
| **`cmendoza`** | **`editor123`** | **Editor** | Crear y editar usuarios, consultar roles |

---

## 📂 Estructura del Proyecto (Patrón MVC)

```
Prototipo/
│
├── index.html                  # Punto de entrada y estructura base de la aplicación
├── README.md                   # Documentación técnica y guía de uso
│
├── css/
│   └── style.css               # Estilos modernos minimalistas (Header, Sidebar, Modales, Tablas)
│
└── js/
    ├── app.js                  # Inicialización y arranque general del sistema
    │
    ├── libs/                   # Librerías locales (100% offline)
    │   └── sweetalert2.all.min.js # SweetAlert2 local (sin CDNs externas)
    │
    ├── utils/                  # Utilidades transversales
    │   ├── CryptoUtil.js       # Hasheo criptográfico SHA-256 offline (Web Crypto API)
    │   └── Notification.js     # Notificaciones y avisos interactivos con SweetAlert2
    │
    ├── models/                 # MODELO (M): Datos y lógica de persistencia
    │   ├── Database.js         # Capa de IndexedDB nativa y sembrado de datos iniciales
    │   ├── RoleModel.js        # Reglas de negocio y operaciones de Roles y Permisos
    │   ├── UserModel.js        # Operaciones CRUD, control de bloqueos y validación
    │   └── AuthModel.js        # Control de sesiones, blindaje contra fuerza bruta (3 intentos)
    │
    ├── views/                  # VISTA (V): Renderizado de UI e interacción
    │   ├── LayoutView.js       # Control del Header, Sidebar móvil/escritorio y Modales
    │   ├── AuthView.js         # Formulario de inicio de sesión, cuenta regresiva y avisos
    │   ├── DashboardView.js    # Métricas clave (KPIs), accesos directos y actividad
    │   ├── UserView.js         # Listado con filtros, badges de bloqueo y botón de desbloqueo
    │   └── RoleView.js         # Matriz de permisos, tarjetas de roles y panel de base de datos
    │
    └── controllers/            # CONTROLADOR (C): Coordinador entre Modelos y Vistas
        ├── AuthController.js   # Manejo de login blindado, logout y validación de sesión
        ├── UserController.js   # Acciones de usuarios, desbloqueo y confirmaciones con SweetAlert2
        ├── RoleController.js   # Acciones de roles, exportación de backups JSON y reseteo
        └── AppController.js    # Enrutador principal del sistema (#dashboard, #users, #roles)
```

---

## 🛡️ Características Principales

1. **Notificaciones y Avisos con SweetAlert2 (100% Offline)**:
   - Integración completa con `sweetalert2.all.min.js` guardado de forma local (cero llamadas a internet o CDNs).
   - Diálogos modales animados para confirmación de eliminación, cierre de sesión y avisos de advertencia.
   - Toasts elegantes en la esquina superior derecha para confirmaciones de éxito y advertencias.
2. **Blindaje de Inicio de Sesión (Bloqueo al 3er Intento Fallido)**:
   - Sistema de protección contra ataques de fuerza bruta.
   - Si se ingresan credenciales erróneas, un aviso de SweetAlert2 notifica cuántos intentos restantes quedan.
   - Al **tercer intento fallido consecutivo**, la cuenta queda bloqueada automáticamente durante **60 segundos** (con cuenta regresiva en el botón) o hasta que un administrador la desbloquee.
   - Bloqueo persistente en **IndexedDB**, lo que impide que un atacante salte el bloqueo refrescando la página o cerrando el navegador.
   - El panel de usuarios muestra qué cuentas están bloqueadas con un botón para **"Desbloquear Cuenta"** con un solo clic.
3. **Base de Datos en el Navegador (IndexedDB)**:
   - Persistencia real mediante la API estándar de IndexedDB (almacena usuarios, roles con permisos y sesiones).
   - Resiste recargas del navegador, cierres de pestaña y apagado del computador.
   - Incluye herramienta de **Exportar Backup en JSON** y **Restablecer a valores de fábrica**.
4. **Seguridad RBAC (Control de Acceso Basado en Roles)**:
   - Matriz de permisos granulares (`users:create`, `users:read`, `users:update`, `users:delete`, `roles:manage`, etc.).
   - Hasheo de contraseñas con **SHA-256** mediante la API nativa `crypto.subtle`.
   - Protección contra eliminación de la cuenta de administrador principal o del usuario activo en sesión.
5. **Diseño Moderno Minimalista (Estilo Laravel Breeze / Jetstream)**:
   - **Header:** Perfil de usuario con avatar, nombre, rol y flecha desplegable (`dropdown`). Al hacer clic despliega un menú flotante con los datos del usuario, acceso a **"Mi Perfil"** (para consultar datos y cambiar contraseña) y botón de **"Cerrar Sesión"** con confirmación.
   - **Sidebar:** Limpio y despejado (sin pie de usuario redundante), con botón de colapso a solo iconos y tooltips emergentes en hover.
   - Adaptable (Responsive) para pantallas móviles, tabletas y computadores de escritorio.
6. **Módulo MPD (Producción SAP)**:
   - Sincronización directa con `INFORMACION SAP.xlsm` (Hoja MPD con 11.217 registros).
   - Tabla con 12 columnas exactas: **Vuelta, Pic, Cantidad, Causa, Peso, Turno, Sala, Semana, Nota, Observación, Granja y Maternidad**.
   - Paginación de alto rendimiento (25, 50, 100, 250 filas) para evitar colapsos de memoria.
   - Filtros por **Pic**, **Sala** y **Nota de Salida**, junto a un **Buscador Inteligente multicampo debounced**.
   - Importador offline mediante **SheetJS** (`xlsx.full.min.js`) y exportación instantánea a CSV.
7. **Submenús y Gráficos de Mortalidad (MPD)**:
   - Submenú en el Sidebar (con acordeón) y pestañas superiores internas (`Tabla MPD` y `Gráficos`).
   - **MORTALIDAD POR CAUSAS**: Gráfico de barras ordenado descendentemente con tabla de datos integrada al pie (`CAUSAS` y `Total`).
   - **MORTALIDAD POR SALAS**: Gráfico de barras ordenado descendentemente con tabla de datos integrada al pie (`SALAS` y `Total`).
   - Indicador de total en la esquina superior derecha (ej: **95** para PIC 78) y selector para alternar entre cualquier PIC o el acumulado general.
8. **Selector Sincronizado de Vuelta, Fecha PIC y Fecha Calendario**:
   - Selector sincronizado bidireccional presente en la **Tabla MPD** y en **Gráficos**:
     * **Vuelta**: Ciclo productivo de 1.000 días (base `27/09/1971`), inicializado dinámicamente con la vuelta del año o ciclo en curso (ej: `20`).
     * **Fecha PIC**: Día específico del ciclo (`0` a `999`).
     * **Control Calendario**: Selector nativo de fecha tipo datepicker.
   - **Cálculo bidireccional instantáneo**: Al seleccionar una fecha en el calendario, se calculan automáticamente la Vuelta y la Fecha PIC. Al escribir o modificar la Vuelta o la Fecha PIC, se recalcula automáticamente la Fecha Calendario (`FCalendario`).
9. **Botón Global de Refrescar Data en el Header**:
   - Permite recargar y sincronizar con un solo clic los datos de `INFORMACION SAP.xlsm` directamente hacia IndexedDB.
   - Detecta discrepancias de filas e incorpora de inmediato nuevos registros agregados al archivo Excel.
10. **Módulo Cierre de Salas**:
    - Sincronizado con la hoja `CIERRES DE SALA` de `INFORMACION SAP.xlsm` (1.257 registros iniciales).
    - Submenú dual en Sidebar y pestañas internas: **Tabla Cierres** y **Gráficos**.
    - Estructura oficial de 14 columnas: **VIni, Pic Inicio, Vcie, Pic Cierre, Sala, Vlote, LotePic, Partos, LNV, LNM, LNMom, MPD, Peso X y Maternidad**.
    - Control sincronizado bidireccional de **Vuelta Cierre**, **PIC Cierre** y **Fecha Calendario**.
    - Filtros por Sala, Maternidad, buscador inteligente, paginación configurable y exportación a CSV.
    - Gráficos zootécnicos interactivos con Chart.js: Ranking de Mortalidad MPD por Salas, Distribución de Nacimientos (LNV, LNM, LNMom, MPD) y balance de eficiencia por Maternidad.

