/**
 * CierresMesModel: Capa de datos para la tabla de Cierres de Mes / Calendario de Producción PIC.
 * Administra los cortes y ciclos mensuales de la granja (Año, Mes, Fecha Inicio, Fecha Fin, PIC Inicio, PIC Fin, Estado).
 * Persistido 100% en IndexedDB (almacén: 'cierres_mes').
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};

window.App.Models.CierresMes = {
  resource: 'cierres_mes',
  storage: window.App.Models.StorageAdapter,
  _cachedData: null,

  /**
   * Invalida la caché interna en memoria
   */
  invalidateCache() {
    this._cachedData = null;
  },

  /**
   * Obtiene todos los períodos ordenados cronológicamente de mayor a menor en las fechas
   */
  async getAll(forceRefresh = false) {
    if (this._cachedData && !forceRefresh) {
      return this._cachedData;
    }
    const data = await this.storage.getAll(this.resource);

    const parseDMYTime = (str) => {
      if (!str) return 0;
      const parts = String(str).trim().replace(/-/g, '/').split('/');
      if (parts.length === 3) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
      }
      return 0;
    };

    const sorted = Array.isArray(data)
      ? [...data].sort((a, b) => {
          // 1. Orden primario por año (de mayor a menor: 2026 -> 2024)
          const anoA = Number(a.ano) || 0;
          const anoB = Number(b.ano) || 0;
          if (anoA !== anoB) return anoB - anoA;

          // 2. Orden secundario por mes numérico (de mayor a menor: Diciembre -> Enero)
          const mesA = Number(a.mesNum) || 0;
          const mesB = Number(b.mesNum) || 0;
          if (mesA !== mesB) return mesB - mesA;

          // 3. Orden por fecha de inicio (de mayor a menor)
          const timeA = parseDMYTime(a.fechaIni);
          const timeB = parseDMYTime(b.fechaIni);
          if (timeA !== timeB) return timeB - timeA;

          // 4. Orden por Fecha PIC de inicio (de mayor a menor)
          const picAbsA = ((Number(a.vInicio) || 0) * 1000) + (Number(a.picInicio) || 0);
          const picAbsB = ((Number(b.vInicio) || 0) * 1000) + (Number(b.picInicio) || 0);
          return picAbsB - picAbsA;
        })
      : [];
    this._cachedData = sorted;
    return this._cachedData;
  },

  /**
   * Obtiene un período por su ID
   */
  async getById(id) {
    return await this.storage.getById(this.resource, id);
  },

  /**
   * Obtiene los períodos filtrados por año
   */
  async getByAno(ano) {
    const numAno = Number(ano);
    const all = await this.getAll();
    return all.filter(r => Number(r.ano) === numAno);
  },

  /**
   * Obtiene el período que se encuentra actualmente Abierto
   */
  async getActivo() {
    const all = await this.getAll();
    return all.find(r => r.estado === 'Abierto') || null;
  },

  /**
   * Cierra formalmente un mes de producción
   */
  async cerrarMes(id, username = 'admin', fechaFin = null, picFin = null, dias = null, vFin = null) {
    const record = await this.getById(id);
    if (!record) throw new Error('El período de mes no existe.');

    const fFin = fechaFin !== null ? fechaFin : record.fechaFin;
    const pFin = picFin !== null ? picFin : record.picFin;
    const dCalculados = dias !== null ? dias : (this._calculateDias(record.fechaIni, fFin) || record.dias);
    const resolvedVFin = vFin !== null ? Number(vFin) : (fFin ? this._resolveVueltaFromDate(fFin, record.ano) : null);

    const updated = {
      ...record,
      fechaFin: fFin,
      vFin: resolvedVFin,
      picFin: pFin !== null && pFin !== undefined && pFin !== '' ? Number(pFin) : null,
      dias: dCalculados,
      estado: 'Cerrado',
      fechaCierre: new Date().toISOString(),
      cerradoPor: username
    };

    const res = await this.update(id, updated);
    this.invalidateCache();
    return res;
  },

  /**
   * Reabre un período mensual previamente cerrado
   */
  async reabrirMes(id) {
    const record = await this.getById(id);
    if (!record) throw new Error('El período de mes no existe.');

    const updated = {
      ...record,
      estado: 'Abierto',
      fechaCierre: null,
      reabiertoAt: new Date().toISOString()
    };

    const res = await this.update(id, updated);
    this.invalidateCache();
    return res;
  },

  /**
   * Crea un nuevo período mensual
   */
  async create(item) {
    const all = await this.getAll();
    const nextId = all.length > 0 ? Math.max(...all.map(r => Number(r.id) || 0)) + 1 : 1;

    const hasPicFin = item.picFin !== null && item.picFin !== undefined && item.picFin !== '';
    const hasFechaFin = item.fechaFin && String(item.fechaFin).trim() !== '';

    const vIni = (item.vInicio !== null && item.vInicio !== undefined)
      ? Number(item.vInicio)
      : this._resolveVueltaFromDate(item.fechaIni, item.ano);

    const vFin = (item.vFin !== null && item.vFin !== undefined)
      ? Number(item.vFin)
      : (hasFechaFin ? this._resolveVueltaFromDate(item.fechaFin, item.ano) : null);

    const record = {
      id: item.id || nextId,
      ano: Number(item.ano),
      mes: String(item.mes).toUpperCase().trim(),
      mesNum: Number(item.mesNum) || this._getMesNumFromName(item.mes),
      fechaIni: String(item.fechaIni).trim(),
      fechaFin: hasFechaFin ? String(item.fechaFin).trim() : '',
      vInicio: vIni,
      picInicio: Number(item.picInicio),
      vFin: vFin,
      picFin: hasPicFin ? Number(item.picFin) : null,
      dias: (item.dias !== null && item.dias !== undefined && item.dias !== '') ? Number(item.dias) : (hasFechaFin ? this._calculateDias(item.fechaIni, item.fechaFin) : null),
      estado: item.estado || 'Abierto',
      fechaCierre: item.fechaCierre || null,
      createdAt: new Date().toISOString()
    };

    const res = await this.storage.create(this.resource, record);
    this.invalidateCache();
    return res;
  },

  /**
   * Actualiza un período existente
   */
  async update(id, item) {
    const hasPicFin = item.picFin !== null && item.picFin !== undefined && item.picFin !== '';
    const hasFechaFin = item.fechaFin && String(item.fechaFin).trim() !== '';

    const vIni = (item.vInicio !== null && item.vInicio !== undefined)
      ? Number(item.vInicio)
      : this._resolveVueltaFromDate(item.fechaIni, item.ano);

    const vFin = (item.vFin !== null && item.vFin !== undefined)
      ? Number(item.vFin)
      : (hasFechaFin ? this._resolveVueltaFromDate(item.fechaFin, item.ano) : null);

    const record = {
      ...item,
      id: id || item.id,
      ano: Number(item.ano),
      mes: String(item.mes).toUpperCase().trim(),
      mesNum: Number(item.mesNum) || this._getMesNumFromName(item.mes),
      fechaIni: String(item.fechaIni).trim(),
      fechaFin: hasFechaFin ? String(item.fechaFin).trim() : '',
      vInicio: vIni,
      picInicio: Number(item.picInicio),
      vFin: vFin,
      picFin: hasPicFin ? Number(item.picFin) : null,
      dias: (item.dias !== null && item.dias !== undefined && item.dias !== '') ? Number(item.dias) : (hasFechaFin ? this._calculateDias(item.fechaIni, item.fechaFin) : null),
      updatedAt: new Date().toISOString()
    };

    const res = await this.storage.update(this.resource, id, record);
    this.invalidateCache();
    return res;
  },

  /**
   * Resuelve la Vuelta a partir de la Fecha Calendario (DD/MM/AAAA)
   */
  _resolveVueltaFromDate(dmyStr, fallbackYear = 2026) {
    if (!dmyStr) return null;
    try {
      const parts = dmyStr.trim().replace(/-/g, '/').split('/');
      if (parts.length === 3) {
        const dt = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        if (!isNaN(dt.getTime()) && window.App.Utils.Format && typeof window.App.Utils.Format.getPicInfo === 'function') {
          return window.App.Utils.Format.getPicInfo(dt).vuelta;
        }
      }
    } catch (e) {}
    return Math.floor((fallbackYear - 1971) * 365.25 / 1000);
  },

  /**
   * Elimina un período mensual
   */
  async delete(id) {
    const res = await this.storage.delete(this.resource, id);
    this.invalidateCache();
    return res;
  },

  /**
   * Inserta un conjunto masivo de registros
   */
  async bulkCreate(items) {
    if (!Array.isArray(items) || items.length === 0) return 0;
    const res = await this.storage.bulkCreate(this.resource, items);
    this.invalidateCache();
    return res;
  },

  /**
   * Restablece los datos a partir del seed predeterminado
   */
  async restoreDefaults() {
    if (window.App.Data && Array.isArray(window.App.Data.cierresMesSeed)) {
      await this.storage.clear(this.resource);
      await this.bulkCreate(window.App.Data.cierresMesSeed);
      this.invalidateCache();
      return true;
    }
    return false;
  },

  /**
   * Utilidad para obtener el número de mes (1..12) a partir de su nombre en español
   */
  _getMesNumFromName(mesName) {
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const idx = meses.indexOf(String(mesName).toUpperCase().trim());
    return idx >= 0 ? idx + 1 : 1;
  },

  /**
   * Calcula los días entre dos fechas en formato DD/MM/YYYY
   */
  _calculateDias(fIni, fFin) {
    if (!fIni || !fFin) return 0;
    try {
      const parseDMY = (str) => {
        const parts = str.split('/');
        if (parts.length === 3) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
        return new Date(str);
      };
      const d1 = parseDMY(fIni);
      const d2 = parseDMY(fFin);
      const diffTime = Math.abs(d2 - d1);
      return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } catch {
      return 30;
    }
  }
};

