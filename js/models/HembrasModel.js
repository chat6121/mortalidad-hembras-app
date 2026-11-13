/**
 * HembrasModel: Modelo para Mortalidad de Hembras con soporte Offline y Sincronización en la Nube
 * Almacena en IndexedDB localmente y sincroniza bidireccionalmente con Google Sheets (Apps Script).
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};

window.App.Models.Hembras = {
  db: window.App.Models.Database,
  storeName: 'hembras',
  configStoreName: 'app_config',
  
  DEFAULT_GAS_URL: 'https://script.google.com/macros/s/AKfycbwbXpFd74QBjew4zyjUXq39QfjzQYUnVtgp88EwWSnlj0Kdqe_3Mq-2HojunNucB5Y8KQ/exec',
  gasWebAppUrl: 'https://script.google.com/macros/s/AKfycbwbXpFd74QBjew4zyjUXq39QfjzQYUnVtgp88EwWSnlj0Kdqe_3Mq-2HojunNucB5Y8KQ/exec',
  isSyncing: false,
  pendingSync: false,

  async init() {
    const savedUrl = await this.getConfig('gas_webapp_url');
    if (savedUrl) {
      this.gasWebAppUrl = savedUrl;
    } else {
      this.gasWebAppUrl = this.DEFAULT_GAS_URL;
      await this.setConfig('gas_webapp_url', this.DEFAULT_GAS_URL);
    }
    
    // Escuchar eventos de red del navegador para auto-sincronizar al reconectarse
    window.addEventListener('online', () => {
      console.log('[HembrasModel] Conexión a Internet restablecida. Sincronizando...');
      this.syncFromSheets(false);
    });
  },

  async getConfig(key) {
    try {
      const item = await this.db.getById(this.configStoreName, key);
      return item ? item.value : null;
    } catch (e) {
      return null;
    }
  },

  async setConfig(key, value) {
    try {
      await this.db.put(this.configStoreName, { key, value });
      if (key === 'gas_webapp_url') {
        this.gasWebAppUrl = value;
      }
      return true;
    } catch (e) {
      console.error('[HembrasModel] Error guardando config:', e);
      return false;
    }
  },

  /**
   * Obtiene todos los registros locales de IndexedDB ordenados por fecha/fila
   */
  async getAll() {
    try {
      const registros = await this.db.getAll(this.storeName);
      return registros.sort((a, b) => (Number(a.fila) || 0) - (Number(b.fila) || 0));
    } catch (e) {
      console.error('[HembrasModel] Error obteniendo registros:', e);
      return [];
    }
  },

  /**
   * Agrega o actualiza un registro en local
   */
  async save(record) {
    try {
      if (!record.id) {
        record.id = 'hembra_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      }
      record.synced = false; // Marcado como pendiente de sincronizar a la nube
      record.updatedAt = new Date().toISOString();
      await this.db.put(this.storeName, record);

      // Intentar sincronizar si hay internet
      if (navigator.onLine && this.gasWebAppUrl) {
        this.syncAllToSheets();
      }
      return record;
    } catch (e) {
      console.error('[HembrasModel] Error al guardar registro:', e);
      throw e;
    }
  },

  /**
   * Reemplaza todos los datos locales con un nuevo lote (útil tras sync o importación)
   */
  async saveAllLocal(registros) {
    try {
      await this.db.clear(this.storeName);
      for (const r of registros) {
        if (!r.id) {
          r.id = 'hembra_' + (r.fila !== undefined ? r.fila : Date.now() + '_' + Math.random().toString(36).substr(2, 5));
        }
        await this.db.put(this.storeName, r);
      }
      return true;
    } catch (e) {
      console.error('[HembrasModel] Error en saveAllLocal:', e);
      return false;
    }
  },

  /**
   * Elimina un registro por ID
   */
  async delete(id) {
    try {
      await this.db.delete(this.storeName, id);
      if (navigator.onLine && this.gasWebAppUrl) {
        this.syncAllToSheets();
      }
      return true;
    } catch (e) {
      console.error('[HembrasModel] Error eliminando registro:', e);
      return false;
    }
  },

  /**
   * Sincronización descendente (Descargar de Google Sheets)
   */
  async syncFromSheets(notifyCallback = null) {
    if (this.isSyncing) return;
    if (!this.gasWebAppUrl) {
      if (notifyCallback) notifyCallback('local', 'Modo Local (Sin URL configurada)');
      return;
    }

    this.isSyncing = true;
    if (notifyCallback) notifyCallback('sincronizando', 'Descargando datos de Sheets...');

    try {
      const sep = this.gasWebAppUrl.includes('?') ? '&' : '?';
      const urlLectura = `${this.gasWebAppUrl}${sep}action=read&t=${Date.now()}`;
      let remoteRecords = null;

      try {
        const res = await fetch(urlLectura, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          redirect: 'follow'
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Error al leer Google Sheets');
        remoteRecords = json.registros || [];
      } catch (fetchErr) {
        // Fallback a JSONP si fetch fue bloqueado por CORS
        remoteRecords = await this._readSheetsJSONP(this.gasWebAppUrl);
      }

      if (Array.isArray(remoteRecords)) {
        const normalizados = remoteRecords.map((r, i) => ({
          id: 'hembra_' + (i + 1),
          fila: i,
          fecha: this.formatDate(r.fecha),
          idAnimal: String(r.idAnimal || '').toUpperCase(),
          genetica: r.genetica || '',
          estatus: String(r.estatus || '').toUpperCase(),
          causa: r.causa || '',
          lugar: String(r.lugar || '').toUpperCase(),
          paridad: r.paridad !== undefined ? String(r.paridad) : '',
          semana: r.semana !== undefined ? String(r.semana) : '',
          dia: r.dia || '',
          synced: true,
          updatedAt: new Date().toISOString()
        }));

        await this.saveAllLocal(normalizados);
        if (notifyCallback) notifyCallback('conectado', `Google Sheets (${normalizados.length} reg.)`, normalizados);
        return normalizados;
      }
    } catch (err) {
      console.warn('[HembrasModel] Fallo sincronización con Sheets (Offline activo):', err.message);
      if (notifyCallback) notifyCallback('error', 'Modo Offline (Sin conexión a Google Sheets)');
    } finally {
      this.isSyncing = false;
    }
  },

  /**
   * Sincronización ascendente (Subir todos los registros limpios a Google Sheets)
   */
  async syncAllToSheets(notifyCallback = null) {
    if (!this.gasWebAppUrl || !navigator.onLine) {
      if (notifyCallback) notifyCallback('error', 'Guardado Local (Pendiente Nube)');
      return false;
    }

    this.isSyncing = true;
    if (notifyCallback) notifyCallback('sincronizando', 'Guardando en Google Sheets...');

    try {
      const records = await this.getAll();
      const registrosLimpios = records
        .filter(r => r.idAnimal || r.semana || r.fecha)
        .map(r => ({
          fecha: r.fecha || '',
          idAnimal: r.idAnimal || '',
          genetica: r.genetica || '',
          estatus: r.estatus || '',
          causa: r.causa || '',
          lugar: r.lugar || '',
          paridad: r.paridad || '',
          semana: r.semana || '',
          dia: r.dia || ''
        }));

      const payloadStr = JSON.stringify({ action: 'saveAll', registros: registrosLimpios });
      try {
        const res = await fetch(this.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: payloadStr
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Error en servidor Apps Script');
      } catch (corsErr) {
        // En caso de opaco / no-cors
        await fetch(this.gasWebAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          credentials: 'omit',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: payloadStr
        });
      }

      if (notifyCallback) notifyCallback('conectado', `Google Sheets (${registrosLimpios.length} reg.)`);
      return true;
    } catch (err) {
      console.warn('[HembrasModel] Error guardando en Google Sheets:', err);
      if (notifyCallback) notifyCallback('error', 'Guardado Local (Error de red)');
      return false;
    } finally {
      this.isSyncing = false;
    }
  },

  _readSheetsJSONP(urlBase) {
    return new Promise((resolve, reject) => {
      const cbName = 'gasCallback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      const script = document.createElement('script');
      const sep = urlBase.includes('?') ? '&' : '?';
      let finished = false;

      const cleanup = () => {
        finished = true;
        try { delete window[cbName]; } catch (_) { window[cbName] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      };

      const timer = setTimeout(() => {
        if (!finished) {
          cleanup();
          reject(new Error('Timeout en JSONP Google Sheets'));
        }
      }, 8000);

      window[cbName] = (data) => {
        if (!finished) {
          clearTimeout(timer);
          cleanup();
          resolve(data && data.registros ? data.registros : []);
        }
      };

      script.onerror = () => {
        if (!finished) {
          clearTimeout(timer);
          cleanup();
          reject(new Error('Error conectando JSONP Google Sheets'));
        }
      };

      script.src = `${urlBase}${sep}action=read&callback=${cbName}&t=${Date.now()}`;
      document.body.appendChild(script);
    });
  },

  formatDate(val) {
    if (!val) return '';
    // Si viene como serial numérico de Excel
    if (typeof val === 'number') {
      const d = new Date((val - (25567 + 2)) * 86400 * 1000);
      return d.toISOString().split('T')[0];
    }
    const str = String(val).trim();
    if (str.includes('T')) return str.split('T')[0];
    const parts = str.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      let p2 = parts[2];
      if (p2.length === 2) p2 = '20' + p2;
      return `${p2}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return str;
  }
};

