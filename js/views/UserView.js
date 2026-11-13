/**
 * UserView: Vista para el listado, filtrado y modales de gestión de usuarios
 */
window.App = window.App || {};
window.App.Views = window.App.Views || {};

window.App.Views.User = {
  container: document.getElementById('view-users'),
  userModal: document.getElementById('user-modal'),
  userForm: document.getElementById('user-form'),
  userIdInput: document.getElementById('user-id'),
  nombreInput: document.getElementById('user-nombre'),
  usernameInput: document.getElementById('user-username'),
  emailInput: document.getElementById('user-email'),
  roleSelect: document.getElementById('user-role'),
  passwordInput: document.getElementById('user-password'),
  passwordLabel: document.getElementById('user-password-label'),
  passwordHint: document.getElementById('user-password-hint'),
  statusSelect: document.getElementById('user-status'),
  modalTitle: document.getElementById('user-modal-title'),

  searchTerm: '',
  statusFilter: 'all',

  render(users, roles, permissions) {
    if (!this.container) return;

    const canCreate = permissions.canCreateUser;
    const canEdit = permissions.canUpdateUser;
    const canDelete = permissions.canDeleteUser;

    // Poblar el select de roles del modal
    this.populateRoleSelect(roles);

    // Filtrar usuarios
    const filteredUsers = users.filter(user => {
      const matchSearch = (
        user.fullName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
      const matchStatus = this.statusFilter === 'all' || user.status === this.statusFilter;
      return matchSearch && matchStatus;
    });

    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Listado de Usuarios</h3>
            <p class="card-subtitle">Administra las cuentas de acceso y asignación de roles</p>
          </div>
          ${canCreate ? `
            <button class="btn btn-primary" id="btn-create-user-modal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Nuevo Usuario</span>
            </button>
          ` : ''}
        </div>

        <!-- FILTROS Y BÚSQUEDA -->
        <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end; justify-content: space-between;">
          <div style="display: flex; gap: 0.75rem; flex: 1; max-width: 520px; align-items: flex-end;">
            <div class="filter-field" style="flex: 1;">
              <label class="filter-field-label">Búsqueda Rápida</label>
              <div class="input-with-icon">
                <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" id="user-search-input" placeholder="Buscar por nombre, usuario o email..." value="${this.searchTerm}">
              </div>
            </div>

            <div class="filter-field" style="width: 140px;">
              <label class="filter-field-label">Estado</label>
              <select id="user-status-filter" class="form-control" title="Filtrar por Estado">
                <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>Todos</option>
                <option value="active" ${this.statusFilter === 'active' ? 'selected' : ''}>Activos</option>
                <option value="inactive" ${this.statusFilter === 'inactive' ? 'selected' : ''}>Inactivos</option>
              </select>
            </div>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Mostrando <strong>${filteredUsers.length}</strong> de ${users.length} usuarios
          </div>
        </div>

        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Registro</th>
                  <th style="text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${filteredUsers.length === 0 ? `
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                      No se encontraron usuarios coincidentes.
                    </td>
                  </tr>
                ` : filteredUsers.map(u => `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 34px; height: 34px; border-radius: 50%; background: #e0e7ff; color: #4338ca; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem;">
                          ${u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style="font-weight: 600; color: var(--text-main);">${u.fullName}</div>
                          <div style="font-size: 0.75rem; color: var(--text-muted);">@${u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>${u.email}</td>
                    <td>
                      <span class="badge badge-primary">
                        ${u.role ? u.role.name : 'Sin Rol'}
                      </span>
                    </td>
                    <td>
                      ${(u.lockedUntil && new Date(u.lockedUntil) > new Date()) || (u.failedAttempts >= 3) ? `
                        <span class="badge badge-danger" title="Bloqueado por 3 intentos fallidos">
                          🔒 Bloqueado (${u.failedAttempts || 3}/3)
                        </span>
                      ` : (u.failedAttempts > 0) ? `
                        <span class="badge badge-warning" title="${u.failedAttempts} intento(s) fallido(s)">
                          ⚠️ ${u.status === 'active' ? 'Activo' : 'Inactivo'} (${u.failedAttempts} fallos)
                        </span>
                      ` : `
                        <span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}">
                          ${u.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      `}
                    </td>
                    <td style="color: var(--text-muted); font-size: 0.8rem;">
                      ${window.App.Utils.Format ? window.App.Utils.Format.formatDate(u.createdAt) : new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style="text-align: right;">
                      <div style="display: inline-flex; gap: 0.35rem;">
                        ${((u.lockedUntil && new Date(u.lockedUntil) > new Date()) || (u.failedAttempts > 0)) && canEdit ? `
                          <button class="btn-action unlock-user-btn" data-id="${u.id}" data-name="${u.fullName}" title="Desbloquear intentos fallidos" style="color: #10b981; border-color: #a7f3d0; background: #ecfdf5;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                            </svg>
                          </button>
                        ` : ''}
                        ${canEdit ? `
                          <button class="btn-action edit-user-btn" data-id="${u.id}" title="Editar usuario">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M12 20h9"/>
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                            </svg>
                          </button>
                        ` : ''}
                        ${canDelete && u.username !== 'admin' ? `
                          <button class="btn-action delete delete-user-btn" data-id="${u.id}" data-name="${u.fullName}" title="Eliminar usuario">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Eventos internos de búsqueda y filtros
    const searchInput = document.getElementById('user-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.render(users, roles, permissions);
      });
    }

    const statusFilterEl = document.getElementById('user-status-filter');
    if (statusFilterEl) {
      statusFilterEl.addEventListener('change', (e) => {
        this.statusFilter = e.target.value;
        this.render(users, roles, permissions);
      });
    }
  },

  populateRoleSelect(roles) {
    if (!this.roleSelect) return;
    this.roleSelect.innerHTML = roles.map(role => `
      <option value="${role.id}">${role.name}</option>
    `).join('');
  },

  openCreateModal() {
    this.userForm.reset();
    this.userIdInput.value = '';
    this.modalTitle.textContent = 'Nuevo Usuario';
    this.passwordInput.required = true;
    this.passwordLabel.textContent = 'Contraseña *';
    this.passwordHint.style.display = 'none';
    window.App.Views.Layout.openModal('user-modal');
  },

  openEditModal(user) {
    this.userForm.reset();
    this.userIdInput.value = user.id;
    this.nombreInput.value = user.fullName;
    this.usernameInput.value = user.username;
    this.emailInput.value = user.email;
    this.roleSelect.value = user.roleId;
    this.statusSelect.value = user.status;

    this.modalTitle.textContent = `Editar Usuario: ${user.username}`;
    this.passwordInput.required = false;
    this.passwordInput.value = '';
    this.passwordLabel.textContent = 'Nueva Contraseña (Opcional)';
    this.passwordHint.style.display = 'block';

    window.App.Views.Layout.openModal('user-modal');
  },

  getFormData() {
    return {
      id: this.userIdInput.value || null,
      fullName: this.nombreInput.value.trim(),
      username: this.usernameInput.value.trim(),
      email: this.emailInput.value.trim(),
      roleId: this.roleSelect.value,
      password: this.passwordInput.value,
      status: this.statusSelect.value
    };
  }
};

