/**
 * ModuleTemplate.js: Plantilla estándar para crear nuevos módulos en el sistema.
 * 
 * GUÍA DE 3 PASOS PARA AGREGAR CUALQUIER NUEVO MÓDULO (Ej: Productos, Clientes, etc.)
 * ==================================================================================
 * 
 * Paso 1: MODELO (M)
 * Define las operaciones de negocio y persistencia usando StorageAdapter.
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};
window.App.Views = window.App.Views || {};
window.App.Controllers = window.App.Controllers || {};

// 1. MODELO EJEMPLO: ItemModel
window.App.Models.Item = {
  resource: 'items',
  storage: window.App.Models.StorageAdapter,

  async getAll() {
    return await this.storage.getAll(this.resource);
  },

  async getById(id) {
    return await this.storage.getById(this.resource, id);
  },

  async create(data) {
    if (!data.name) throw new Error('El nombre es requerido.');
    const newItem = {
      id: 'item_' + Date.now().toString(36),
      name: data.name,
      createdAt: new Date().toISOString()
    };
    return await this.storage.create(this.resource, newItem);
  },

  async update(id, data) {
    return await this.storage.update(this.resource, id, data);
  },

  async delete(id) {
    return await this.storage.delete(this.resource, id);
  }
};

// 2. VISTA EJEMPLO: ItemView
window.App.Views.Item = {
  container: null, // Se asigna al elemento document.getElementById('view-items')

  render(items) {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Módulo de Items</h3>
          <button class="btn btn-primary" id="btn-create-item">Nuevo Item</button>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table">
              <thead><tr><th>ID</th><th>Nombre</th><th>Acciones</th></tr></thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td><code>${item.id}</code></td>
                    <td>${item.name}</td>
                    <td><button class="btn-action delete delete-item" data-id="${item.id}">X</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
};

// 3. CONTROLADOR EJEMPLO: ItemController
window.App.Controllers.Item = {
  model: window.App.Models.Item,
  view: window.App.Views.Item,
  notification: window.App.Utils.Notification,

  init() {
    this.view.container = document.getElementById('view-items');
    this.bindEvents();
  },

  bindEvents() {
    if (!this.view.container) return;
    this.view.container.addEventListener('click', async (e) => {
      if (e.target.closest('#btn-create-item')) {
        // Lógica para crear
      }
      if (e.target.closest('.delete-item')) {
        const id = e.target.closest('.delete-item').dataset.id;
        const confirm = await this.notification.confirm('¿Eliminar?', '¿Eliminar item?');
        if (confirm) {
          await this.model.delete(id);
          this.notification.success('Eliminado');
          await this.loadView();
        }
      }
    });
  },

  async loadView() {
    const items = await this.model.getAll();
    this.view.render(items);
  }
};

