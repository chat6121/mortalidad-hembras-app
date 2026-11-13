/**
 * PesosEdadModel: Capa de datos para la tabla estándar de Pesos por Edad (1 a 40 días).
 * Proporciona métodos para consultar la curva de peso estándar de lechones,
 * calcular pesos esperados y gestionar la persistencia en IndexedDB.
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};

window.App.Models.PesosEdad = {
  resource: 'pesos_edad',
  storage: window.App.Models.StorageAdapter,
  _cachedData: null,

  /**
   * Invalida la caché interna en memoria
   */
  invalidateCache() {
    this._cachedData = null;
  },

  /**
   * Obtiene todos los registros de la tabla de pesos ordenados por edad
   */
  async getAll(forceRefresh = false) {
    if (this._cachedData && !forceRefresh) {
      return this._cachedData;
    }
    const data = await this.storage.getAll(this.resource);
    const sorted = Array.isArray(data) ? [...data].sort((a, b) => Number(a.edad) - Number(b.edad)) : [];
    this._cachedData = sorted;
    return this._cachedData;
  },

  /**
   * Obtiene el registro de un día de edad específico
   */
  async getByEdad(edad) {
    const numEdad = Math.round(Number(edad));
    if (isNaN(numEdad) || numEdad < 1) return null;
    const all = await this.getAll();
    const found = all.find(r => Number(r.edad) === numEdad);
    return found || null;
  },

  /**
   * Obtiene el peso esperado (en kg) para un día de edad
   */
  async getPesoEsperado(edad) {
    const record = await this.getByEdad(edad);
    return record ? record.peso : null;
  },

  /**
   * Inserta un nuevo registro individual
   */
  async create(item) {
    const record = {
      id: Number(item.edad),
      edad: Number(item.edad),
      peso: Number(item.peso)
    };
    const res = await this.storage.create(this.resource, record);
    this.invalidateCache();
    return res;
  },

  /**
   * Actualiza el peso de una edad existente
   */
  async update(edad, item) {
    const record = {
      id: Number(edad),
      edad: Number(edad),
      peso: Number(item.peso)
    };
    const res = await this.storage.update(this.resource, Number(edad), record);
    this.invalidateCache();
    return res;
  },

  /**
   * Inserta o actualiza un lote masivo de registros
   */
  async bulkCreate(items) {
    if (!Array.isArray(items) || items.length === 0) return 0;
    const res = await this.storage.bulkCreate(this.resource, items);
    this.invalidateCache();
    return res;
  },

  /**
   * Elimina un registro por edad
   */
  async delete(edad) {
    const res = await this.storage.delete(this.resource, Number(edad));
    this.invalidateCache();
    return res;
  },

  /**
   * Limpia toda la tabla de pesos
   */
  async clearAll() {
    const res = await this.storage.clear(this.resource);
    this.invalidateCache();
    return res;
  }
};

