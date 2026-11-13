/**
 * IndexedDBAdapter: Implementación de almacenamiento local offline con IndexedDB
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};
window.App.Models.Adapters = window.App.Models.Adapters || {};

window.App.Models.Adapters.IndexedDB = {
  get db() {
    return window.App.Models.Database;
  },

  async getAll(resource) {
    return await this.db.getAll(resource);
  },

  async getById(resource, id) {
    return await this.db.getById(resource, id);
  },

  async create(resource, item) {
    return await this.db.add(resource, item);
  },

  async update(resource, id, item) {
    // Asegurar que el id coincida
    const dataWithId = { ...item, id: id || item.id };
    return await this.db.update(resource, dataWithId);
  },

  async delete(resource, id) {
    return await this.db.delete(resource, id);
  },

  async bulkCreate(resource, items) {
    return await this.db.bulkPut(resource, items);
  },

  async clear(resource) {
    return await this.db.clearStore(resource);
  },

  async query(resource, filterFn) {
    const all = await this.getAll(resource);
    if (typeof filterFn === 'function') {
      return all.filter(filterFn);
    }
    return all;
  }
};

