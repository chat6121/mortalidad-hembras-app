/**
 * DashboardView: Vista principal con resumen de métricas en tarjetas gradientes modernas.
 */
window.App = window.App || {};
window.App.Views = window.App.Views || {};

window.App.Views.Dashboard = {
  container: document.getElementById('view-dashboard'),

  render(data) {
    if (!this.container) return;

    const { totalUsers, activeUsers, totalRoles } = data;
    const Format = window.App.Utils.Format;

    this.container.innerHTML = `
      <!-- GRID DE ESTADÍSTICAS MODERNAS CON GRADIENTES -->
      <div class="stats-grid">
        <div class="stat-card grad-indigo">
          <div class="stat-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <div class="stat-value">${Format ? Format.formatNumber(totalUsers, 0) : totalUsers}</div>
            <div class="stat-label">Usuarios Registrados</div>
          </div>
        </div>

        <div class="stat-card grad-emerald">
          <div class="stat-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div>
            <div class="stat-value">${Format ? Format.formatNumber(activeUsers, 0) : activeUsers}</div>
            <div class="stat-label">Usuarios Activos</div>
          </div>
        </div>

        <div class="stat-card grad-amber">
          <div class="stat-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div>
            <div class="stat-value">${totalRoles}</div>
            <div class="stat-label">Roles Configurados</div>
          </div>
        </div>

        <div class="stat-card grad-blue">
          <div class="stat-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
            </svg>
          </div>
          <div>
            <div class="stat-value" style="font-size: 1.25rem;">IndexedDB</div>
            <div class="stat-label">Base 100% Offline</div>
          </div>
        </div>
      </div>
    `;
  }
};
