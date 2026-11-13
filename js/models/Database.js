/**
 * Database: Capa de persistencia en IndexedDB del navegador.
 * Proporciona una base de datos relacional/documental nativa, robusta y 100% offline.
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};

window.App.Models.Database = {
  dbName: 'AppMVC_OfflineDB',
  dbVersion: 11,
  dbInstance: null,

  /**
   * Inicializa la conexión con IndexedDB y crea las tablas/almacenes si no existen.
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Almacén de Usuarios
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('email', 'email', { unique: true });
          userStore.createIndex('roleId', 'roleId', { unique: false });
        }

        // Almacén de Roles
        if (!db.objectStoreNames.contains('roles')) {
          const roleStore = db.createObjectStore('roles', { keyPath: 'id' });
          roleStore.createIndex('name', 'name', { unique: true });
        }

        // Almacén de Sesiones
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }

        // Almacén de MPD (Módulo de Producción / Registros SAP)
        if (!db.objectStoreNames.contains('mpd')) {
          const mpdStore = db.createObjectStore('mpd', { keyPath: 'id' });
          mpdStore.createIndex('pic', 'pic', { unique: false });
          mpdStore.createIndex('sala', 'sala', { unique: false });
          mpdStore.createIndex('nota', 'nota', { unique: false });
          mpdStore.createIndex('vuelta', 'vuelta', { unique: false });
          mpdStore.createIndex('semana', 'semana', { unique: false });
        }

        // Almacén de Cierre de Salas
        if (!db.objectStoreNames.contains('cierres')) {
          const cierresStore = db.createObjectStore('cierres', { keyPath: 'id' });
          cierresStore.createIndex('picCierre', 'picCierre', { unique: false });
          cierresStore.createIndex('vcie', 'vcie', { unique: false });
          cierresStore.createIndex('sala', 'sala', { unique: false });
          cierresStore.createIndex('maternidad', 'maternidad', { unique: false });
          cierresStore.createIndex('lotePic', 'lotePic', { unique: false });
        }

        // Almacén de Resumen de Partos
        if (!db.objectStoreNames.contains('partos')) {
          const partosStore = db.createObjectStore('partos', { keyPath: 'id' });
          partosStore.createIndex('pic', 'pic', { unique: false });
          partosStore.createIndex('vuelta', 'vuelta', { unique: false });
          partosStore.createIndex('semana', 'semana', { unique: false });
          partosStore.createIndex('area', 'area', { unique: false });
          partosStore.createIndex('turno', 'turno', { unique: false });
        }

        // Almacén de Pesos por Edad (Curva estándar de crecimiento en lactancia/precebo)
        if (!db.objectStoreNames.contains('pesos_edad')) {
          const pesosStore = db.createObjectStore('pesos_edad', { keyPath: 'id' });
          pesosStore.createIndex('edad', 'edad', { unique: true });
          pesosStore.createIndex('peso', 'peso', { unique: false });
        }

        // Almacén de Salas y Maternidades (Estructura de Salas, Pabellones, Áreas y Siglas de Granja)
        if (!db.objectStoreNames.contains('salas_maternidades')) {
          const salasStore = db.createObjectStore('salas_maternidades', { keyPath: 'id' });
          salasStore.createIndex('sala', 'sala', { unique: false });
          salasStore.createIndex('mat', 'mat', { unique: false });
          salasStore.createIndex('area', 'area', { unique: false });
          salasStore.createIndex('sigla', 'sigla', { unique: false });
        }

        // Almacén de Destetes (Módulo de Destetes - Hoja DESTETES de INFORMACION SAP.xlsm)
        if (!db.objectStoreNames.contains('destetes')) {
          const destetesStore = db.createObjectStore('destetes', { keyPath: 'id' });
          destetesStore.createIndex('fin', 'fin', { unique: false });
          destetesStore.createIndex('vfin', 'vfin', { unique: false });
          destetesStore.createIndex('sala', 'sala', { unique: false });
          destetesStore.createIndex('maternidad', 'maternidad', { unique: false });
          destetesStore.createIndex('granja', 'granja', { unique: false });
          destetesStore.createIndex('lotePic', 'lotePic', { unique: false });
          destetesStore.createIndex('fecha', 'fecha', { unique: false });
        }

        // Almacén de Cierres de Mes (Calendario de Producción y Períodos PIC)
        if (!db.objectStoreNames.contains('cierres_mes')) {
          const cierresMesStore = db.createObjectStore('cierres_mes', { keyPath: 'id' });
          cierresMesStore.createIndex('ano', 'ano', { unique: false });
          cierresMesStore.createIndex('mes', 'mes', { unique: false });
          cierresMesStore.createIndex('picInicio', 'picInicio', { unique: false });
          cierresMesStore.createIndex('picFin', 'picFin', { unique: false });
          cierresMesStore.createIndex('estado', 'estado', { unique: false });
        }

        // Almacén de Maternidad (Control de Lotes por Área Establecida y Expansión)
        if (!db.objectStoreNames.contains('maternidad')) {
          const maternidadStore = db.createObjectStore('maternidad', { keyPath: 'id' });
          maternidadStore.createIndex('area', 'area', { unique: false });
          maternidadStore.createIndex('sala', 'sala', { unique: false });
          maternidadStore.createIndex('lotePic', 'lotePic', { unique: false });
          maternidadStore.createIndex('picInicio', 'picInicio', { unique: false });
          maternidadStore.createIndex('picCierre', 'picCierre', { unique: false });
          maternidadStore.createIndex('estado', 'estado', { unique: false });
        }

        // Almacén de Partos Salas (Seguimiento diario acumulado para salas abiertas antes del cierre)
        if (!db.objectStoreNames.contains('partos_salas')) {
          const partosSalasStore = db.createObjectStore('partos_salas', { keyPath: 'id' });
          partosSalasStore.createIndex('sala', 'sala', { unique: false });
          partosSalasStore.createIndex('picInicio', 'picInicio', { unique: false });
          partosSalasStore.createIndex('vuelta', 'vuelta', { unique: false });
        }

        // Almacén de Mortalidad de Hembras (Sincronizado con Sheets y 100% Offline)
        if (!db.objectStoreNames.contains('hembras')) {
          const hembrasStore = db.createObjectStore('hembras', { keyPath: 'id' });
          hembrasStore.createIndex('fecha', 'fecha', { unique: false });
          hembrasStore.createIndex('idAnimal', 'idAnimal', { unique: false });
          hembrasStore.createIndex('semana', 'semana', { unique: false });
          hembrasStore.createIndex('lugar', 'lugar', { unique: false });
          hembrasStore.createIndex('synced', 'synced', { unique: false });
        }

        // Almacén de Configuración del Sistema (Parámetros y Claves de sincronización)
        if (!db.objectStoreNames.contains('app_config')) {
          db.createObjectStore('app_config', { keyPath: 'key' });
        }
      };

      request.onsuccess = async (event) => {
        this.dbInstance = event.target.result;
        await this.requestPersistentStorage();
        // Sembrar datos predeterminados si es la primera ejecución
        await this.seedDefaults();
        resolve(this.dbInstance);
      };

      request.onerror = (event) => {
        console.error('Error al abrir IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  },

  /**
   * Si la base de datos está vacía, inserta roles y usuario admin predeterminado
   */
  async seedDefaults() {
    const rolesCount = await this.count('roles');
    if (rolesCount === 0) {
      const defaultRoles = [
        {
          id: 'role_superadmin',
          name: 'Super Administrador',
          description: 'Acceso total y sin restricciones a todos los módulos y acciones del sistema',
          permissions: ['users:create', 'users:read', 'users:update', 'users:delete', 'roles:manage', 'system:manage'],
          isSystem: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'role_admin',
          name: 'Administrador',
          description: 'Gestión completa de usuarios y visualización de roles y auditorías',
          permissions: ['users:create', 'users:read', 'users:update', 'users:delete', 'roles:read'],
          isSystem: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'role_editor',
          name: 'Editor',
          description: 'Puede crear y editar información de usuarios pero no puede eliminarlos',
          permissions: ['users:create', 'users:read', 'users:update', 'roles:read'],
          isSystem: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'role_viewer',
          name: 'Visualizador',
          description: 'Solo lectura. Consulta la lista de usuarios y roles sin permisos de modificación',
          permissions: ['users:read', 'roles:read'],
          isSystem: false,
          createdAt: new Date().toISOString()
        }
      ];

      for (const role of defaultRoles) {
        await this.add('roles', role);
      }
    }

    const usersCount = await this.count('users');
    if (usersCount === 0) {
      const adminPasswordHash = await window.App.Utils.Crypto.hashPassword('admin123');
      const editorPasswordHash = await window.App.Utils.Crypto.hashPassword('editor123');

      const defaultUsers = [
        {
          id: 'user_admin',
          fullName: 'Administrador Principal',
          username: 'admin',
          email: 'admin@sistema.local',
          passwordHash: adminPasswordHash,
          roleId: 'role_superadmin',
          status: 'active',
          failedAttempts: 0,
          lockedUntil: null,
          createdAt: new Date().toISOString(),
          lastLogin: null
        },
        {
          id: 'user_editor',
          fullName: 'Carlos Mendoza',
          username: 'cmendoza',
          email: 'carlos.mendoza@sistema.local',
          passwordHash: editorPasswordHash,
          roleId: 'role_editor',
          status: 'active',
          failedAttempts: 0,
          lockedUntil: null,
          createdAt: new Date().toISOString(),
          lastLogin: null
        }
      ];

      for (const user of defaultUsers) {
        await this.add('users', user);
      }
    }

    // Sembrado inicial de registros MPD si está vacío
    try {
      const mpdCount = await this.count('mpd');
      if (mpdCount === 0 && window.App.Data && Array.isArray(window.App.Data.mpdSeed) && window.App.Data.mpdSeed.length > 0) {
        console.log(`Sembrando ${window.App.Data.mpdSeed.length} registros iniciales en almacén MPD...`);
        await this.bulkPut('mpd', window.App.Data.mpdSeed);
        console.log('Sembrado MPD completado con éxito.');
      }
    } catch (err) {
      console.warn('Nota: almacén mpd no listo para sembrado o no disponible aún:', err);
    }

    // Sembrado inicial / actualización de registros Cierre de Salas si está vacío o desactualizado
    try {
      const cierresCount = await this.count('cierres');
      const cierresSeed = window.App.Data && Array.isArray(window.App.Data.cierresSeed) ? window.App.Data.cierresSeed : [];
      let needsReseed = cierresCount === 0 || cierresCount !== cierresSeed.length;
      if (!needsReseed && cierresCount > 0) {
        const sample = await this.getAll('cierres');
        const prePartos = sample.filter(r => r.estado === 'Pre-Parto').length;
        const hasLegacyPP = sample.some(r => String(r.lotePic || '').trim().toUpperCase() === 'PP');
        if (prePartos !== 2 || !sample[0].estatus || hasLegacyPP) needsReseed = true;
      }
      if (cierresSeed.length > 0 && needsReseed) {
        console.log(`Sincronizando ${cierresSeed.length} registros en almacén Cierres...`);
        await this.clearStore('cierres');
        await this.bulkPut('cierres', cierresSeed);
        console.log('Sembrado Cierres actualizado con éxito.');
      }
    } catch (err) {
      console.warn('Nota: almacén cierres no listo para sembrado o no disponible aún:', err);
    }

    // Sembrado inicial de registros Resumen de Partos si está vacío o desactualizado
    try {
      const partosCount = await this.count('partos');
      const seed = window.App.Data && Array.isArray(window.App.Data.partosSeed) ? window.App.Data.partosSeed : [];
      if (seed.length > 0 && (partosCount === 0 || partosCount !== seed.length)) {
        // Garantizar que la sumatoria LNV + LNM + LNMom = LNT en cada registro
        const sanitizedSeed = seed.map(r => {
          const lnv = Number(r.lnv) || 0;
          const lnm = Number(r.lnm) || 0;
          const lnMom = Number(r.lnMom) || 0;
          return {
            ...r,
            lnv,
            lnm,
            lnMom,
            lnt: lnv + lnm + lnMom
          };
        });
        console.log(`Sembrando ${sanitizedSeed.length} registros oficiales en almacén Partos desde RESUMEN DE PARTOS...`);
        await this.clearStore('partos');
        await this.bulkPut('partos', sanitizedSeed);
        console.log('Sembrado Partos completado con éxito (LNV + LNM + LNMom = LNT verificado).');
      }
    } catch (err) {
      console.warn('Nota: almacén partos no listo para sembrado o no disponible aún:', err);
    }

    // Sembrado inicial de registros Pesos por Edad (1 a 40 días)
    try {
      const pesosCount = await this.count('pesos_edad');
      const seed = window.App.Data && Array.isArray(window.App.Data.pesosEdadSeed) ? window.App.Data.pesosEdadSeed : [];
      if (seed.length > 0 && (pesosCount === 0 || pesosCount !== seed.length)) {
        console.log(`Sembrando ${seed.length} registros en almacén Pesos por Edad...`);
        await this.clearStore('pesos_edad');
        await this.bulkPut('pesos_edad', seed);
        console.log('Sembrado Pesos por Edad completado con éxito.');
      }
    } catch (err) {
      console.warn('Nota: almacén pesos_edad no disponible aún:', err);
    }

    // Sembrado inicial de registros Salas y Maternidades (52 registros)
    try {
      const salasCount = await this.count('salas_maternidades');
      const seed = window.App.Data && Array.isArray(window.App.Data.salasMaternidadesSeed) ? window.App.Data.salasMaternidadesSeed : [];
      if (seed.length > 0 && (salasCount === 0 || salasCount !== seed.length)) {
        console.log(`Sembrando ${seed.length} registros en almacén Salas y Maternidades...`);
        await this.clearStore('salas_maternidades');
        await this.bulkPut('salas_maternidades', seed);
        console.log('Sembrado Salas y Maternidades completado con éxito.');
      }
    } catch (err) {
      console.warn('Nota: almacén salas_maternidades no disponible aún:', err);
    }

    // Sembrado inicial de registros Destetes (318 registros desde hoja DESTETES)
    try {
      const destetesCount = await this.count('destetes');
      const seed = window.App.Data && Array.isArray(window.App.Data.destetesSeed) ? window.App.Data.destetesSeed : [];
      if (seed.length > 0 && (destetesCount === 0 || destetesCount !== seed.length)) {
        console.log(`Sembrando ${seed.length} registros oficiales en almacén Destetes...`);
        await this.clearStore('destetes');
        await this.bulkPut('destetes', seed);
        console.log('Sembrado Destetes completado con éxito.');
      }
    } catch (err) {
      console.warn('Nota: almacén destetes no disponible aún:', err);
    }

    // Sembrado inicial de registros Cierres de Mes (35 registros de Calendario PIC y Cortes de Producción)
    try {
      const cierresMesCount = await this.count('cierres_mes');
      const seed = window.App.Data && Array.isArray(window.App.Data.cierresMesSeed) ? window.App.Data.cierresMesSeed : [];
      let needsReseed = (cierresMesCount === 0 || cierresMesCount !== seed.length);
      if (!needsReseed && cierresMesCount > 0) {
        const sample = await this.getById('cierres_mes', 1);
        const active = await this.getById('cierres_mes', 35);
        if (!sample || !sample.vInicio || (active && active.estado === 'Abierto' && active.fechaFin)) {
          needsReseed = true;
        }
      }
      if (seed.length > 0 && needsReseed) {
        console.log(`Sembrando ${seed.length} registros oficiales en almacén Cierres de Mes (IndexedDB: cierres_mes)...`);
        await this.clearStore('cierres_mes');
        await this.bulkPut('cierres_mes', seed);
        console.log('Sembrado Cierres de Mes completado con éxito en IndexedDB.');
      }
    } catch (err) {
      console.warn('Nota: almacén cierres_mes no disponible aún:', err);
    }

    // Sembrado inicial de registros Maternidad (34 registros desde hoja MATERNIDAD: EST + EXP)
    try {
      const maternidadCount = await this.count('maternidad');
      const seed = window.App.Data && Array.isArray(window.App.Data.maternidadSeed) ? window.App.Data.maternidadSeed : [];
      if (seed.length > 0 && (maternidadCount === 0 || maternidadCount !== seed.length)) {
        console.log(`Sembrando ${seed.length} registros oficiales en almacén Maternidad...`);
        await this.clearStore('maternidad');
        await this.bulkPut('maternidad', seed);
        console.log('Sembrado Maternidad completado con éxito.');
      }
    } catch (err) {
      console.warn('Nota: almacén maternidad no disponible aún:', err);
    }
  },

  /**
   * Operaciones genéricas sobre IndexedDB
   */
  async getStore(storeName, mode = 'readonly') {
    const tx = this.dbInstance.transaction(storeName, mode);
    return tx.objectStore(storeName);
  },

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.dbInstance.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async getById(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.dbInstance.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  async add(storeName, item) {
    return new Promise((resolve, reject) => {
      const tx = this.dbInstance.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.add(item);

      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  },

  async update(storeName, item) {
    return new Promise((resolve, reject) => {
      const tx = this.dbInstance.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  },

  async bulkPut(storeName, items) {
    return new Promise((resolve, reject) => {
      if (!items || items.length === 0) return resolve(0);
      const tx = this.dbInstance.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      for (let i = 0; i < items.length; i++) {
        store.put(items[i]);
      }
      tx.oncomplete = () => resolve(items.length);
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.dbInstance.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  async count(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.dbInstance.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.dbInstance.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  async clear(storeName) {
    return this.clearStore(storeName);
  },

  /**
   * Solicita al navegador almacenamiento persistente para prevenir borrado automático de IndexedDB
   */
  async requestPersistentStorage() {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
        const already = typeof navigator.storage.persisted === 'function' ? await navigator.storage.persisted() : false;
        if (!already) {
          await navigator.storage.persist();
        }
      }
    } catch (e) {
      // Silencioso en entornos sin Storage API (ej. file:// restringido o Node)
    }
  },

  /**
   * Exporta una instantánea JSON completa de todos los almacenes de IndexedDB
   */
  async exportAllData() {
    const storeNames = [
      'users', 'roles', 'mpd', 'cierres', 'partos',
      'pesos_edad', 'salas_maternidades', 'destetes',
      'cierres_mes', 'maternidad', 'partos_salas'
    ];
    const stores = {};
    let totalRecords = 0;

    for (const name of storeNames) {
      if (this.dbInstance && this.dbInstance.objectStoreNames && !this.dbInstance.objectStoreNames.contains(name)) {
        stores[name] = [];
        continue;
      }
      const rows = await this.getAll(name);
      stores[name] = Array.isArray(rows) ? rows : [];
      totalRecords += stores[name].length;
    }

    return {
      schemaVersion: this.dbVersion,
      exportedAt: new Date().toISOString(),
      totalRecords,
      stores
    };
  },

  /**
   * Restaura una instantánea JSON exportada por exportAllData()
   */
  async importAllData(payload) {
    if (!payload || typeof payload !== 'object' || !payload.stores || typeof payload.stores !== 'object') {
      throw new Error('El archivo de respaldo JSON no tiene el formato válido esperado.');
    }

    const allowedStores = [
      'users', 'roles', 'mpd', 'cierres', 'partos',
      'pesos_edad', 'salas_maternidades', 'destetes',
      'cierres_mes', 'maternidad', 'partos_salas'
    ];

    const summary = {};
    for (const storeName of allowedStores) {
      if (!Array.isArray(payload.stores[storeName])) continue;
      if (this.dbInstance && this.dbInstance.objectStoreNames && !this.dbInstance.objectStoreNames.contains(storeName)) {
        continue;
      }
      await this.clearStore(storeName);
      if (payload.stores[storeName].length > 0) {
        await this.bulkPut(storeName, payload.stores[storeName]);
      }
      summary[storeName] = payload.stores[storeName].length;
    }

    return summary;
  },

  /**
   * Resetea la base de datos a sus valores iniciales de fábrica
   */
  async resetDatabase() {
    await this.clearStore('users');
    await this.clearStore('roles');
    await this.clearStore('sessions');
    await this.clearStore('mpd');
    await this.seedDefaults();
  }
};

