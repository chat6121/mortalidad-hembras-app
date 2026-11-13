/**
 * StorageAdapter: Fachada y Fábrica del patrón Repositorio / Adaptador.
 * Desacopla la lógica de negocio de la fuente de datos.
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};
window.App.Models.Adapters = window.App.Models.Adapters || {};

window.App.Models.StorageAdapter = {
  /**
   * Obtiene el adaptador activo según la configuración
   */
  getDriver() {
    const driverName = (window.App.Config && window.App.Config.STORAGE_DRIVER) || 'indexeddb';
    if (driverName === 'api') {
      return window.App.Models.Adapters.Api;
    }
    return window.App.Models.Adapters.IndexedDB;
  },

  async getAll(resource) {
    return await this.getDriver().getAll(resource);
  },

  async getById(resource, id) {
    return await this.getDriver().getById(resource, id);
  },

  async create(resource, data) {
    return await this.getDriver().create(resource, data);
  },

  async update(resource, id, data) {
    return await this.getDriver().update(resource, id, data);
  },

  async delete(resource, id) {
    return await this.getDriver().delete(resource, id);
  },

  async bulkCreate(resource, items) {
    return await this.getDriver().bulkCreate(resource, items);
  },

  async clear(resource) {
    return await this.getDriver().clear(resource);
  },

  async query(resource, filterFn) {
    return await this.getDriver().query(resource, filterFn);
  }
};

