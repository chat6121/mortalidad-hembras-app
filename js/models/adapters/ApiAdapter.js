/**
 * ApiAdapter: Implementación del adaptador para consumo de Backend REST API
 * Conecta el frontend directamente con servidores backend que operen sobre
 * MySQL, PostgreSQL, SQLite o MariaDB.
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};
window.App.Models.Adapters = window.App.Models.Adapters || {};

window.App.Models.Adapters.Api = {
  get config() {
    return window.App.Config.API;
  },

  get token() {
    return localStorage.getItem(window.App.Config.SECURITY.TOKEN_STORAGE_KEY) || null;
  },

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  },

  async request(endpoint, options = {}) {
    const url = `${this.config.BASE_URL}${endpoint}`;
    const fetchOptions = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, fetchOptions);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.message || `Error HTTP ${response.status}`);
        error.status = response.status;
        error.code = data.code || 'API_ERROR';
        error.data = data;
        throw error;
      }

      return data.data !== undefined ? data.data : data;
    } catch (err) {
      console.error(`Error en API Request [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  },

  async getAll(resource) {
    return await this.request(`/${resource}`, { method: 'GET' });
  },

  async getById(resource, id) {
    return await this.request(`/${resource}/${id}`, { method: 'GET' });
  },

  async create(resource, data) {
    return await this.request(`/${resource}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async update(resource, id, data) {
    return await this.request(`/${resource}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(resource, id) {
    return await this.request(`/${resource}/${id}`, { method: 'DELETE' });
  },

  async bulkCreate(resource, items) {
    return await this.request(`/${resource}/bulk`, {
      method: 'POST',
      body: JSON.stringify(items)
    });
  },

  async clear(resource) {
    return await this.request(`/${resource}/clear`, { method: 'POST' });
  },

  async query(resource, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/${resource}?${queryString}` : `/${resource}`;
    return await this.request(endpoint, { method: 'GET' });
  }
};

