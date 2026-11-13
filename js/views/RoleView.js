/**
 * RoleView: Vista para la administración de roles, matriz de permisos y panel de base de datos
 */
window.App = window.App || {};
window.App.Views = window.App.Views || {};

window.App.Views.Role = {
  container: document.getElementById('view-roles'),
  dbContainer: document.getElementById('view-database'),
  roleModal: document.getElementById('role-modal'),
  roleForm: document.getElementById('role-form'),
  roleIdInput: document.getElementById('role-id'),
  roleNameInput: document.getElementById('role-name'),
  roleDescInput: document.getElementById('role-description'),
  permissionsContainer: document.getElementById('permissions-container'),
  modalTitle: document.getElementById('role-modal-title'),

  render(roles, availablePermissions, permissions) {
    if (!this.container) return;

    const canManageRoles = permissions.canManageRoles;

    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Roles y Permisos del Sistema</h3>
            <p class="card-subtitle">Define niveles de acceso y privilegios para los usuarios</p>
          </div>
          ${canManageRoles ? `
            <button class="btn btn-primary" id="btn-create-role-modal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Nuevo Rol</span>
            </button>
          ` : ''}
        </div>
        <div class="card-body">
          <div class="roles-grid">
            ${roles.map(role => `
              <div class="role-card">
                <div>
                  <div class="role-header">
                    <div>
                      <h4 class="role-title">${role.name}</h4>
                      ${role.isSystem ? '<span class="badge badge-neutral" style="margin-top: 4px;">Sistema</span>' : '<span class="badge badge-primary" style="margin-top: 4px;">Personalizado</span>'}
                    </div>
                    ${canManageRoles && !role.isSystem ? `
                      <div style="display: flex; gap: 0.35rem;">
                        <button class="btn-action edit-role-btn" data-id="${role.id}" title="Editar rol">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                        </button>
                        <button class="btn-action delete delete-role-btn" data-id="${role.id}" data-name="${role.name}" title="Eliminar rol">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    ` : ''}
                  </div>
                  <p class="role-desc">${role.description || 'Sin descripción asignada.'}</p>
                </div>

                <div>
                  <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 0.5rem;">
                    Permisos Activos (${role.permissions ? role.permissions.length : 0})
                  </div>
                  <div class="permissions-chips">
                    ${role.permissions && role.permissions.length > 0 ? role.permissions.map(p => {
                      const permInfo = availablePermissions.find(ap => ap.key === p);
                      return `<span class="badge badge-neutral">${permInfo ? permInfo.label : p}</span>`;
                    }).join('') : '<span style="color: var(--text-muted); font-size: 0.8rem;">Sin permisos</span>'}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Renderizar también la sección de base de datos
    this.renderDatabasePanel();
  },

  renderDatabasePanel() {
    if (!this.dbContainer) return;

    this.dbContainer.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Base de Datos Offline (IndexedDB)</h3>
            <p class="card-subtitle">Almacenamiento persistente local en el navegador del cliente</p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" id="btn-export-db">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar Backup JSON
            </button>
            <button class="btn btn-danger btn-sm" id="btn-reset-db">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
              Reiniciar a Valores de Fábrica
            </button>
          </div>
        </div>
        <div class="card-body">
          <div style="background-color: var(--bg-body); padding: 1.25rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
            <h4 style="font-weight: 600; margin-bottom: 0.5rem;">¿Cómo funciona la persistencia?</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">
              Este sistema utiliza la API estándar <strong>IndexedDB</strong> de tu navegador. 
              Todos los usuarios creados, modificaciones, contraseñas hasheadas y roles personalizados 
              se guardan de forma permanente en tu disco duro local a través del navegador.
              No se requiere conexión a internet ni servidores externos: funciona 100% offline simplemente haciendo doble clic en el archivo <code>index.html</code>.
            </p>
          </div>

          <div class="stats-grid" style="margin-bottom: 0;">
            <div class="stat-card">
              <div class="stat-icon emerald">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <div>
                <div class="stat-value" style="font-size: 1.25rem; color: var(--success);">Operativa</div>
                <div class="stat-label">Conexión IndexedDB</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon indigo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div>
                <div class="stat-value" style="font-size: 1.25rem;">SHA-256</div>
                <div class="stat-label">Criptografía Offline</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  populatePermissionsForm(availablePermissions, selectedKeys = []) {
    if (!this.permissionsContainer) return;

    this.permissionsContainer.innerHTML = availablePermissions.map(perm => {
      const isChecked = selectedKeys.includes(perm.key);
      return `
        <label class="permission-checkbox">
          <input type="checkbox" name="role_permission" value="${perm.key}" ${isChecked ? 'checked' : ''}>
          <div>
            <span style="font-weight: 600;">${perm.label}</span>
            <div style="font-size: 0.725rem; color: var(--text-muted);">${perm.desc}</div>
          </div>
        </label>
      `;
    }).join('');
  },

  openCreateModal(availablePermissions) {
    this.roleForm.reset();
    this.roleIdInput.value = '';
    this.modalTitle.textContent = 'Nuevo Rol';
    this.populatePermissionsForm(availablePermissions, []);
    window.App.Views.Layout.openModal('role-modal');
  },

  openEditModal(role, availablePermissions) {
    this.roleForm.reset();
    this.roleIdInput.value = role.id;
    this.roleNameInput.value = role.name;
    this.roleDescInput.value = role.description || '';
    this.modalTitle.textContent = `Editar Rol: ${role.name}`;
    this.populatePermissionsForm(availablePermissions, role.permissions || []);
    window.App.Views.Layout.openModal('role-modal');
  },

  getFormData() {
    const checkboxes = this.permissionsContainer.querySelectorAll('input[name="role_permission"]:checked');
    const permissions = Array.from(checkboxes).map(cb => cb.value);

    return {
      id: this.roleIdInput.value || null,
      name: this.roleNameInput.value.trim(),
      description: this.roleDescInput.value.trim(),
      permissions: permissions
    };
  }
};

