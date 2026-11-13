/**
 * SalasMaternidadModel: Capa de datos para la tabla de Salas, Maternidades, Áreas y Siglas de Granja.
 * Proporciona métodos de consulta y resolución relacional entre salas de maternidad (1 a 41),
 * pabellones de maternidad (M1 a M5), gestaciones (G1 a G11), áreas operativas (EST/EXP) y siglas (E/X).
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};

window.App.Models.SalasMaternidad = {
  resource: 'salas_maternidades',
  storage: window.App.Models.StorageAdapter,
  _cachedData: null,

  /**
   * Invalida la caché interna en memoria
   */
  invalidateCache() {
    this._cachedData = null;
  },

  /**
   * Obtiene todos los registros de la tabla maestra
   */
  async getAll(forceRefresh = false) {
    if (this._cachedData && !forceRefresh) {
      return this._cachedData;
    }
    const data = await this.storage.getAll(this.resource);
    const sorted = Array.isArray(data) ? [...data].sort((a, b) => Number(a.id) - Number(b.id)) : [];
    this._cachedData = sorted;
    return this._cachedData;
  },

  /**
   * Obtiene la información de una sala específica (1 a 41)
   */
  async getBySala(sala) {
    const numSala = Number(sala);
    if (isNaN(numSala) || numSala < 1) return null;
    const all = await this.getAll();
    return all.find(r => Number(r.sala) === numSala) || null;
  },

  /**
   * Obtiene los registros pertenecientes a una maternidad o gestación (ej: 'M1', 'G6')
   */
  async getByMat(mat) {
    if (!mat) return [];
    const cleanMat = String(mat).trim().toUpperCase();
    const all = await this.getAll();
    return all.filter(r => String(r.mat || '').trim().toUpperCase() === cleanMat);
  },

  /**
   * Obtiene todos los registros pertenecientes a un área ('EST' o 'EXP')
   */
  async getByArea(area) {
    if (!area) return [];
    const cleanArea = String(area).trim().toUpperCase();
    const all = await this.getAll();
    return all.filter(r => String(r.area || '').trim().toUpperCase() === cleanArea);
  },

  /**
   * Resuelve el Área ('EST' o 'EXP') a partir del número de sala
   */
  async getAreaBySala(sala) {
    const record = await this.getBySala(sala);
    return record ? record.area : this.getAreaBySalaSync(sala);
  },

  /**
   * Resuelve la Sigla de Granja ('E' o 'X') a partir del número de sala
   */
  async getSiglaBySala(sala) {
    const record = await this.getBySala(sala);
    return record ? record.sigla : this.getSiglaBySalaSync(sala);
  },

  /**
   * Resuelve la Maternidad ('M1'..'M5') a partir del número de sala
   */
  async getMatBySala(sala) {
    const record = await this.getBySala(sala);
    return record ? record.mat : this.getMatBySalaSync(sala);
  },

  /**
   * Métodos sincrónicos de resolución ultra-rápida (para importaciones y parseo masivo de Excel)
   */
  resolveSalaSync(sala) {
    const num = Number(sala);
    if (isNaN(num) || num < 1) return null;
    const source = (this._cachedData && this._cachedData.length > 0)
      ? this._cachedData
      : (window.App.Data && window.App.Data.salasMaternidadesSeed ? window.App.Data.salasMaternidadesSeed : []);
    return source.find(r => Number(r.sala) === num) || null;
  },

  getAreaBySalaSync(sala) {
    const loc = this.resolveSalaSync(sala);
    if (loc && loc.area) return loc.area;
    const num = Number(sala);
    return (num >= 25 && num <= 41) ? 'EXP' : 'EST';
  },

  getSiglaBySalaSync(sala) {
    const loc = this.resolveSalaSync(sala);
    if (loc && loc.sigla) return loc.sigla;
    const num = Number(sala);
    return (num >= 25 && num <= 41) ? 'X' : 'E';
  },

  getMatBySalaSync(sala) {
    const loc = this.resolveSalaSync(sala);
    if (loc && loc.mat) return loc.mat;
    const num = Number(sala);
    if (num >= 1 && num <= 8) return 'M1';
    if (num >= 9 && num <= 17) return 'M2';
    if (num >= 18 && num <= 24) return 'M3';
    if (num >= 25 && num <= 33) return 'M4';
    if (num >= 34 && num <= 41) return 'M5';
    return '';
  },

  /**
   * Inserta un nuevo registro individual
   */
  async create(item) {
    const record = {
      id: item.id || Date.now(),
      sala: item.sala !== null && item.sala !== undefined && item.sala !== '' ? Number(item.sala) : null,
      mat: String(item.mat || '').trim(),
      area: String(item.area || '').trim().toUpperCase(),
      sigla: String(item.sigla || '').trim().toUpperCase()
    };
    const res = await this.storage.create(this.resource, record);
    this.invalidateCache();
    return res;
  },

  /**
   * Actualiza un registro por ID
   */
  async update(id, item) {
    const record = {
      id: Number(id),
      sala: item.sala !== null && item.sala !== undefined && item.sala !== '' ? Number(item.sala) : null,
      mat: String(item.mat || '').trim(),
      area: String(item.area || '').trim().toUpperCase(),
      sigla: String(item.sigla || '').trim().toUpperCase()
    };
    const res = await this.storage.update(this.resource, Number(id), record);
    this.invalidateCache();
    return res;
  },

  /**
   * Inserta o actualiza un lote masivo
   */
  async bulkCreate(items) {
    if (!Array.isArray(items) || items.length === 0) return 0;
    const res = await this.storage.bulkCreate(this.resource, items);
    this.invalidateCache();
    return res;
  },

  /**
   * Elimina un registro por ID
   */
  async delete(id) {
    const res = await this.storage.delete(this.resource, Number(id));
    this.invalidateCache();
    return res;
  },

  /**
   * Limpia toda la tabla
   */
  async clearAll() {
    const res = await this.storage.clear(this.resource);
    this.invalidateCache();
    return res;
  }
};

