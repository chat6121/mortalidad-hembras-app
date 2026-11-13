/**
 * ConfiguracionView: Vista para la administración de parámetros del sistema:
 * 1. Curva de Pesos Estándar por Edad (1 a 40 días).
 * 2. Estructura de Infraestructura: Salas, Maternidades (M1 a M5), Gestaciones (G1 a G11) y Áreas (EST/EXP).
 * 3. Cierres de Mes y Calendario de Producción PIC (Cortes de mes, Fechas y Rangos PIC en IndexedDB).
 */
window.App = window.App || {};
window.App.Views = window.App.Views || {};

window.App.Views.Configuracion = {
  container: document.getElementById('view-configuracion'),
  activeTab: 'pesos', // 'pesos' | 'salas' | 'cierres_mes'
  searchPesosTerm: '',
  searchSalasTerm: '',
  searchCierresMesTerm: '',
  cierresMesAnoFilter: 'all',
  cierresMesEstadoFilter: 'all',
  salasAreaFilter: 'all',
  salasTipoFilter: 'all',

  render(pesosData = [], salasData = [], cierresMesData = []) {
    if (!this.container) {
      this.container = document.getElementById('view-configuracion');
      if (!this.container) return;
    }

    const html = `
      <div class="config-view-wrapper">
        <!-- HEADER DE CONFIGURACIÓN CON PESTAÑAS -->
        <div class="card" style="margin-bottom: 1.5rem;">
          <div class="card-header" style="padding-bottom: 0.5rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h3 class="card-title" style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                Configuración y Tablas Maestras
              </h3>
              <p class="card-subtitle">Administra los parámetros de referencia de pesos, la asignación física de salas/áreas y el calendario oficial de cierres de mes en IndexedDB.</p>
            </div>

            <!-- RESPALDO / RESTAURACIÓN JSON INDEXEDDB -->
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <button type="button" id="btn-export-backup" class="btn btn-outline" title="Descargar copia de seguridad completa (.json) de toda IndexedDB">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Respaldar BD (.json)</span>
              </button>
              <button type="button" id="btn-import-backup" class="btn btn-outline" title="Restaurar copia de seguridad completa (.json) en IndexedDB">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span>Restaurar BD (.json)</span>
              </button>
              <input type="file" id="config-backup-file-input" accept=".json,application/json" style="display: none;" />
            </div>

            <!-- TABS SELECTOR -->
            <div class="config-tabs-nav" style="display: flex; gap: 0.5rem; background: var(--bg-body, #f1f5f9); padding: 0.35rem; border-radius: 8px; flex-wrap: wrap;">
              <button type="button" class="btn-config-tab ${this.activeTab === 'pesos' ? 'active' : ''}" data-tab="pesos" style="padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20v-6M6 20V10M18 20V4"/>
                </svg>
                Pesos por Edad (1-40 días)
                <span class="badge badge-primary" style="font-size: 0.75rem; padding: 0.15rem 0.45rem;">${pesosData.length}</span>
              </button>

              <button type="button" class="btn-config-tab ${this.activeTab === 'salas' ? 'active' : ''}" data-tab="salas" style="padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                Salas y Áreas de Granja
                <span class="badge badge-primary" style="font-size: 0.75rem; padding: 0.15rem 0.45rem;">${salasData.length}</span>
              </button>

              <button type="button" class="btn-config-tab ${this.activeTab === 'cierres_mes' ? 'active' : ''}" data-tab="cierres_mes" style="padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Cierres de Mes (Calendario PIC)
                <span class="badge badge-primary" style="font-size: 0.75rem; padding: 0.15rem 0.45rem;">${cierresMesData.length}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- CONTENIDO DE LA PESTAÑA: PESOS POR EDAD -->
        <div id="tab-content-pesos" style="display: ${this.activeTab === 'pesos' ? 'block' : 'none'};">
          ${this.renderPesosTab(pesosData)}
        </div>

        <!-- CONTENIDO DE LA PESTAÑA: SALAS Y ÁREAS -->
        <div id="tab-content-salas" style="display: ${this.activeTab === 'salas' ? 'block' : 'none'};">
          ${this.renderSalasTab(salasData)}
        </div>

        <!-- CONTENIDO DE LA PESTAÑA: CIERRES DE MES (CALENDARIO PIC) -->
        <div id="tab-content-cierres-mes" style="display: ${this.activeTab === 'cierres_mes' ? 'block' : 'none'};">
          ${this.renderCierresMesTab(cierresMesData)}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  },

  /**
   * Renderiza la pestaña de Curva de Pesos
   */
  renderPesosTab(pesosData) {
    const sorted = [...pesosData].sort((a, b) => Number(a.edad) - Number(b.edad));
    const minPeso = sorted.length > 0 ? sorted[0].peso : 0;
    const maxPeso = sorted.length > 0 ? sorted[sorted.length - 1].peso : 0;
    const maxVal = maxPeso > 0 ? maxPeso : 15;

    // Filtro de búsqueda
    const filtered = sorted.filter(item => {
      if (!this.searchPesosTerm) return true;
      const term = this.searchPesosTerm.trim();
      return String(item.edad).includes(term) || String(item.peso).includes(term);
    });

    return `
      <!-- TARJETAS DE RESUMEN PESOS -->
      <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 1.25rem;">
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(14, 165, 233, 0.1); color: #0284c7;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <div class="stat-label">Edades Registradas</div>
            <div class="stat-value" style="color: #0284c7;">${sorted.length} <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-muted);">días</span></div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(16, 185, 129, 0.1); color: #059669;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20v-6M6 20V10M18 20V4"/>
            </svg>
          </div>
          <div>
            <div class="stat-label">Peso Inicial (Día 1)</div>
            <div class="stat-value" style="color: #059669;">${minPeso.toFixed(2)} <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-muted);">kg</span></div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(99, 102, 241, 0.1); color: #4f46e5;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <div>
            <div class="stat-label">Peso Máximo (Día ${sorted.length > 0 ? sorted[sorted.length - 1].edad : 40})</div>
            <div class="stat-value" style="color: #4f46e5;">${maxPeso.toFixed(2)} <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-muted);">kg</span></div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: #d97706;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 14 14"/>
            </svg>
          </div>
          <div>
            <div class="stat-label">Incremento Promedio</div>
            <div class="stat-value" style="color: #d97706;">${sorted.length > 1 ? ((maxPeso - minPeso) / (sorted.length - 1)).toFixed(3) : '0.000'} <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-muted);">kg/día</span></div>
          </div>
        </div>
      </div>

      <!-- TABLA Y BARRA DE ACCIONES -->
      <div class="card">
        <div class="card-header" style="flex-wrap: wrap; gap: 1rem;">
          <div>
            <h4 class="card-title">Curva de Pesos Estándar (IndexedDB: pesos_edad)</h4>
            <p class="card-subtitle">Referencia utilizada para proyectar pesos esperados y calcular desviaciones de crecimiento.</p>
          </div>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-outline" id="btn-restore-pesos" title="Restablecer los valores originales del seed">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              <span>Restaurar Valores Originales</span>
            </button>
            <button type="button" class="btn btn-primary" id="btn-add-peso">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Agregar / Modificar Edad</span>
            </button>
          </div>
        </div>

        <div style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
          <div style="display: flex; gap: 0.75rem; flex: 1; max-width: 380px;">
            <div class="input-with-icon" style="flex: 1;">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" id="input-search-pesos" placeholder="Filtrar por edad o peso..." value="${this.searchPesosTerm}">
            </div>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Mostrando <strong>${filtered.length}</strong> de ${sorted.length} edades
          </div>
        </div>

        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 120px;">Edad (Días)</th>
                  <th style="width: 160px;">Peso Estándar</th>
                  <th>Progresión Visual de Crecimiento</th>
                  <th style="text-align: right; width: 140px;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="4" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                      No se encontraron registros de pesos coincidentes.
                    </td>
                  </tr>
                ` : filtered.map(row => {
                  const pct = Math.min(100, Math.max(5, (row.peso / maxVal) * 100));
                  return `
                    <tr>
                      <td>
                        <span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 0.85rem; padding: 0.35rem 0.65rem;">
                          Día ${row.edad}
                        </span>
                      </td>
                      <td>
                        <strong style="font-size: 1.05rem; color: var(--text-main);">${Number(row.peso).toFixed(2).replace('.', ',')}</strong>
                        <span style="color: var(--text-muted); font-size: 0.85rem; margin-left: 0.2rem;">kg</span>
                      </td>
                      <td style="vertical-align: middle;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                          <div style="flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; position: relative;">
                            <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #38bdf8, #2563eb); border-radius: 4px;"></div>
                          </div>
                          <span style="font-size: 0.75rem; color: var(--text-muted); width: 45px; text-align: right;">${pct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style="text-align: right;">
                        <button type="button" class="btn btn-sm btn-outline btn-edit-peso" data-edad="${row.edad}" data-peso="${row.peso}" title="Editar este peso" style="padding: 0.3rem 0.6rem;">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                          Editar
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Renderiza la pestaña de Salas y Áreas
   */
  renderSalasTab(salasData) {
    const total = salasData.length;
    const countSalas = salasData.filter(s => s.sala !== null && s.sala !== undefined).length;
    const countGestaciones = salasData.filter(s => s.sala === null || s.sala === undefined).length;
    const countEST = salasData.filter(s => s.area === 'EST').length;
    const countEXP = salasData.filter(s => s.area === 'EXP').length;

    // Filtros de búsqueda y área
    const filtered = salasData.filter(row => {
      // Búsqueda
      if (this.searchSalasTerm) {
        const term = this.searchSalasTerm.trim().toLowerCase();
        const matchSala = row.sala !== null ? String(row.sala).includes(term) : false;
        const matchMat = String(row.mat || '').toLowerCase().includes(term);
        const matchArea = String(row.area || '').toLowerCase().includes(term);
        if (!matchSala && !matchMat && !matchArea) return false;
      }
      // Filtro de Área
      if (this.salasAreaFilter !== 'all' && row.area !== this.salasAreaFilter) {
        return false;
      }
      // Filtro de Tipo (Maternidad vs Gestación)
      if (this.salasTipoFilter === 'maternidad' && (row.sala === null || row.sala === undefined)) {
        return false;
      }
      if (this.salasTipoFilter === 'gestacion' && (row.sala !== null && row.sala !== undefined)) {
        return false;
      }
      return true;
    });

    return `
      <!-- TARJETAS DE RESUMEN SALAS -->
      <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 1.25rem;">
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(99, 102, 241, 0.1); color: #4f46e5;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <div class="stat-label">Total Ubicaciones</div>
            <div class="stat-value" style="color: #4f46e5;">${total} <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-muted);">infraestructuras</span></div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(14, 165, 233, 0.1); color: #0284c7;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 3v18"/>
            </svg>
          </div>
          <div>
            <div class="stat-label">Salas de Maternidad</div>
            <div class="stat-value" style="color: #0284c7;">${countSalas} <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-muted);">(M1 a M5)</span></div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(16, 185, 129, 0.1); color: #059669;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <div class="stat-label">Naves de Gestación</div>
            <div class="stat-value" style="color: #059669;">${countGestaciones} <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-muted);">(G1 a G11)</span></div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: #d97706;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
          </div>
          <div>
            <div class="stat-label">Áreas Operativas</div>
            <div class="stat-value" style="color: #d97706; font-size: 1.15rem;">EST: ${countEST} | EXP: ${countEXP}</div>
          </div>
        </div>
      </div>

      <!-- TABLA Y BARRA DE ACCIONES -->
      <div class="card">
        <div class="card-header" style="flex-wrap: wrap; gap: 1rem;">
          <div>
            <h4 class="card-title">Estructura de Salas, Maternidades y Áreas (IndexedDB: salas_maternidades)</h4>
            <p class="card-subtitle">Relación oficial de salas físicas asociadas a sus pabellones, áreas (EST / EXP) y siglas (E / X).</p>
          </div>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-outline" id="btn-restore-salas" title="Restablecer los 52 registros originales del seed">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              <span>Restaurar Salas Originales</span>
            </button>
            <button type="button" class="btn btn-primary" id="btn-add-sala">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Nueva Sala / Ubicación</span>
            </button>
          </div>
        </div>

        <div style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; gap: 1rem; align-items: flex-end; justify-content: space-between; flex-wrap: wrap;">
          <div style="display: flex; gap: 0.75rem; flex: 1; max-width: 540px; flex-wrap: wrap; align-items: flex-end;">
            <div class="filter-field" style="flex: 1; min-width: 180px;">
              <label class="filter-field-label">Búsqueda Rápida</label>
              <div class="input-with-icon">
                <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" id="input-search-salas" placeholder="Buscar por sala o denominación..." value="${this.searchSalasTerm}">
              </div>
            </div>

            <div class="filter-field" style="width: 130px;">
              <label class="filter-field-label">Área</label>
              <select id="select-filter-area" class="form-control" title="Filtrar por Área">
                <option value="all" ${this.salasAreaFilter === 'all' ? 'selected' : ''}>Todas</option>
                <option value="EST" ${this.salasAreaFilter === 'EST' ? 'selected' : ''}>EST (Estándar)</option>
                <option value="EXP" ${this.salasAreaFilter === 'EXP' ? 'selected' : ''}>EXP (Expansión)</option>
              </select>
            </div>

            <div class="filter-field" style="width: 140px;">
              <label class="filter-field-label">Tipo</label>
              <select id="select-filter-tipo" class="form-control" title="Filtrar por Tipo">
                <option value="all" ${this.salasTipoFilter === 'all' ? 'selected' : ''}>Todos</option>
                <option value="maternidad" ${this.salasTipoFilter === 'maternidad' ? 'selected' : ''}>Maternidades</option>
                <option value="gestacion" ${this.salasTipoFilter === 'gestacion' ? 'selected' : ''}>Gestaciones</option>
              </select>
            </div>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Mostrando <strong>${filtered.length}</strong> de ${salasData.length} registros
          </div>
        </div>

        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 110px;">Sala</th>
                  <th>Maternidad / Gestación</th>
                  <th>Área Operativa</th>
                  <th style="text-align: center; width: 100px;">Sigla</th>
                  <th style="text-align: right; width: 140px;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                      No se encontraron registros de salas coincidentes con los filtros aplicados.
                    </td>
                  </tr>
                ` : filtered.map(row => {
                  const isSala = row.sala !== null && row.sala !== undefined && row.sala !== '';
                  const areaBadge = row.area === 'EST'
                    ? '<span class="badge" style="background: #e0f2fe; color: #0284c7; font-weight: 600;">EST - Estándar</span>'
                    : '<span class="badge" style="background: #fef3c7; color: #d97706; font-weight: 600;">EXP - Expansión</span>';
                  const siglaBadge = row.sigla === 'E'
                    ? '<span class="badge" style="background: #eff6ff; color: #2563eb; font-weight: 700; width: 28px; display: inline-block; text-align: center;">E</span>'
                    : '<span class="badge" style="background: #faf5ff; color: #7c3aed; font-weight: 700; width: 28px; display: inline-block; text-align: center;">X</span>';

                  return `
                    <tr>
                      <td>
                        ${isSala ? `
                          <strong style="font-size: 1.05rem; color: var(--text-main);">Sala ${row.sala}</strong>
                        ` : `
                          <span style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">(Sin Sala)</span>
                        `}
                      </td>
                      <td>
                        <strong style="color: ${row.mat.startsWith('M') ? '#0284c7' : '#059669'}; font-size: 1rem;">
                          ${row.mat}
                        </strong>
                        <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 0.35rem;">
                          ${row.mat.startsWith('M') ? 'Maternidad' : 'Gestación'}
                        </span>
                      </td>
                      <td>${areaBadge}</td>
                      <td style="text-align: center;">${siglaBadge}</td>
                      <td style="text-align: right;">
                        <button type="button" class="btn btn-sm btn-outline btn-edit-sala" data-id="${row.id}" data-sala="${row.sala || ''}" data-mat="${row.mat}" data-area="${row.area}" data-sigla="${row.sigla}" title="Editar esta ubicación" style="padding: 0.3rem 0.6rem;">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                          Editar
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Renderiza la pestaña de Cierres de Mes / Calendario PIC
   */
  renderCierresMesTab(cierresMesData = []) {
    const total = cierresMesData.length;
    const cerrados = cierresMesData.filter(r => r.estado === 'Cerrado').length;
    const abiertos = cierresMesData.filter(r => r.estado === 'Abierto').length;
    const activo = cierresMesData.find(r => r.estado === 'Abierto');

    // Años únicos para el combo de filtro (orden descendente de mayor a menor)
    const anosUnicos = Array.from(new Set(cierresMesData.map(r => Number(r.ano)))).filter(Boolean).sort((a, b) => b - a);

    const parseDMYTime = (str) => {
      if (!str) return 0;
      const parts = String(str).trim().replace(/-/g, '/').split('/');
      if (parts.length === 3) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
      }
      return 0;
    };

    // Filtrar registros
    const filtered = cierresMesData.filter(row => {
      // Filtro de texto
      if (this.searchCierresMesTerm) {
        const term = this.searchCierresMesTerm.toLowerCase().trim();
        const match = String(row.ano).includes(term) ||
                      String(row.mes).toLowerCase().includes(term) ||
                      String(row.fechaIni).includes(term) ||
                      String(row.fechaFin).includes(term) ||
                      String(row.picInicio).includes(term) ||
                      String(row.picFin).includes(term) ||
                      String(row.estado).toLowerCase().includes(term);
        if (!match) return false;
      }

      // Filtro de año
      if (this.cierresMesAnoFilter !== 'all') {
        if (Number(row.ano) !== Number(this.cierresMesAnoFilter)) return false;
      }

      // Filtro de estado
      if (this.cierresMesEstadoFilter !== 'all') {
        if (row.estado !== this.cierresMesEstadoFilter) return false;
      }

      return true;
    });

    // Ordenamiento estricto de mayor a menor en las fechas (más reciente primero)
    filtered.sort((a, b) => {
      // 1. Año (de mayor a menor)
      const anoA = Number(a.ano) || 0;
      const anoB = Number(b.ano) || 0;
      if (anoA !== anoB) return anoB - anoA;

      // 2. Mes numérico (de mayor a menor)
      const mesA = Number(a.mesNum) || 0;
      const mesB = Number(b.mesNum) || 0;
      if (mesA !== mesB) return mesB - mesA;

      // 3. Fecha de inicio (de mayor a menor)
      const timeA = parseDMYTime(a.fechaIni);
      const timeB = parseDMYTime(b.fechaIni);
      if (timeA !== timeB) return timeB - timeA;

      // 4. Fecha PIC de inicio (de mayor a menor)
      const picAbsA = ((Number(a.vInicio) || 0) * 1000) + (Number(a.picInicio) || 0);
      const picAbsB = ((Number(b.vInicio) || 0) * 1000) + (Number(b.picInicio) || 0);
      return picAbsB - picAbsA;
    });

    return `
      <!-- TARJETAS DE RESUMEN CIERRES DE MES -->
      <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 1.25rem;">
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(14, 165, 233, 0.1); color: #0284c7;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-label">Total Períodos Registrados</span>
            <span class="stat-value">${total}</span>
            <span class="stat-subtext" style="color: var(--text-muted); font-size: 0.75rem;">Cortes 2024, 2025 y 2026</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(16, 185, 129, 0.1); color: #059669;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-label">Meses Cerrados</span>
            <span class="stat-value" style="color: #059669;">${cerrados}</span>
            <span class="stat-subtext" style="color: var(--text-muted); font-size: 0.75rem;">Histórico consolidado</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(59, 130, 246, 0.1); color: #2563eb;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="10 8 16 12 10 16 10 8"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-label">Meses Abiertos</span>
            <span class="stat-value" style="color: #2563eb;">${abiertos}</span>
            <span class="stat-subtext" style="color: var(--text-muted); font-size: 0.75rem;">En producción activa</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: #d97706;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-label">Período Actual Activo</span>
            <span class="stat-value" style="font-size: 1.1rem; color: #d97706;">${activo ? `${activo.mes} ${activo.ano}` : 'Ninguno'}</span>
            <span class="stat-subtext" style="color: var(--text-muted); font-size: 0.75rem;">${activo ? `Iniciado ${activo.fechaIni} (${activo.vInicio ? `${activo.vInicio}-${activo.picInicio}` : `PIC ${activo.picInicio}`}) · En curso` : 'Todos cerrados'}</span>
          </div>
        </div>
      </div>

      <!-- TABLA Y FILTROS DE CIERRES DE MES -->
      <div class="card">
        <div class="card-header" style="flex-wrap: wrap; gap: 1rem;">
          <div>
            <h4 class="card-title">Cierres de Mes y Calendario de Producción PIC (IndexedDB: cierres_mes)</h4>
            <p class="card-subtitle">Administra los cortes de inicio y fin de mes de la granja (ej. un mes cierra el 28 y el siguiente inicia el 29) con sus rangos de fechas y correlativos PIC.</p>
          </div>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-outline" id="btn-restore-cierres-mes" title="Restablecer los 35 períodos originales en IndexedDB">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              <span>Restaurar Valores Originales</span>
            </button>
            <button type="button" class="btn btn-primary" id="btn-add-cierre-mes">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>+ Nuevo Período de Mes</span>
            </button>
          </div>
        </div>

        <!-- BARRA DE BÚSQUEDA Y FILTROS -->
        <div style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
          <div style="display: flex; gap: 0.75rem; flex: 1; max-width: 650px; flex-wrap: wrap;">
            <div class="input-with-icon" style="flex: 1; min-width: 200px;">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" id="input-search-cierres-mes" placeholder="Buscar por mes, año, fecha, PIC..." value="${this.searchCierresMesTerm}">
            </div>

            <!-- Filtro por Año -->
            <div class="filter-group" style="display: flex; align-items: center; gap: 0.35rem;">
              <label for="select-filter-ano-cierres-mes" class="filter-label" style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin: 0;">Año:</label>
              <select id="select-filter-ano-cierres-mes" class="filter-select">
                <option value="all" ${this.cierresMesAnoFilter === 'all' ? 'selected' : ''}>Todos los Años</option>
                ${anosUnicos.map(a => `<option value="${a}" ${Number(this.cierresMesAnoFilter) === a ? 'selected' : ''}>${a}</option>`).join('')}
              </select>
            </div>

            <!-- Filtro por Estado -->
            <div class="filter-group" style="display: flex; align-items: center; gap: 0.35rem;">
              <label for="select-filter-estado-cierres-mes" class="filter-label" style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin: 0;">Estado:</label>
              <select id="select-filter-estado-cierres-mes" class="filter-select">
                <option value="all" ${this.cierresMesEstadoFilter === 'all' ? 'selected' : ''}>Todos los Estados</option>
                <option value="Abierto" ${this.cierresMesEstadoFilter === 'Abierto' ? 'selected' : ''}>Abiertos</option>
                <option value="Cerrado" ${this.cierresMesEstadoFilter === 'Cerrado' ? 'selected' : ''}>Cerrados</option>
              </select>
            </div>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Mostrando <strong>${filtered.length}</strong> de ${total} períodos
          </div>
        </div>

        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 90px;">Año</th>
                  <th style="width: 140px;">Mes</th>
                  <th style="width: 130px;">Fecha Ini</th>
                  <th style="width: 130px;">Fecha Fin</th>
                  <th style="text-align: center; width: 100px;">Días</th>
                  <th style="text-align: center; width: 110px;">PIC Inicio</th>
                  <th style="text-align: center; width: 110px;">PIC Fin</th>
                  <th style="text-align: center; width: 130px;">Estado</th>
                  <th style="text-align: right; width: 220px;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="9" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                      No se encontraron registros de cierres de mes coincidentes con los filtros aplicados.
                    </td>
                  </tr>
                ` : filtered.map(row => {
                  const isCerrado = row.estado === 'Cerrado';
                  return `
                    <tr style="${!isCerrado ? 'background: rgba(59, 130, 246, 0.03);' : ''}">
                      <td>
                        <span class="badge" style="background: #f1f5f9; color: #334155; font-weight: 700; font-size: 0.85rem; padding: 0.35rem 0.65rem;">
                          ${row.ano}
                        </span>
                      </td>
                      <td>
                        <strong style="color: var(--text-main); font-size: 0.95rem; text-transform: uppercase;">
                          ${row.mes}
                        </strong>
                      </td>
                      <td>
                        <span style="font-family: monospace; font-size: 0.95rem; font-weight: 600; color: var(--text-main);">
                          ${row.fechaIni}
                        </span>
                      </td>
                      <td>
                        ${row.fechaFin ? `
                          <span style="font-family: monospace; font-size: 0.95rem; font-weight: 600; color: var(--text-main);">
                            ${row.fechaFin}
                          </span>
                        ` : `
                          <span class="badge" style="background: #fef3c7; color: #b45309; font-weight: 600; font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                            En curso
                          </span>
                        `}
                      </td>
                      <td style="text-align: center;">
                        ${row.dias ? `
                          <span class="badge badge-outline" style="font-size: 0.8rem; padding: 0.2rem 0.5rem;">
                            ${row.dias} d
                          </span>
                        ` : `
                          <span style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">—</span>
                        `}
                      </td>
                      <td style="text-align: center;">
                        <span class="badge" style="background: #e0f2fe; color: #0284c7; font-weight: 700; font-size: 0.9rem; padding: 0.3rem 0.6rem;" title="Vuelta ${row.vInicio || '-'}-${row.picInicio}">
                          ${row.picInicio}
                        </span>
                      </td>
                      <td style="text-align: center;">
                        ${(row.picFin !== null && row.picFin !== undefined && row.picFin !== '') ? `
                          <span class="badge" style="background: #e0f2fe; color: #0284c7; font-weight: 700; font-size: 0.9rem; padding: 0.3rem 0.6rem;" title="Vuelta ${row.vFin || '-'}-${row.picFin}">
                            ${row.picFin}
                          </span>
                        ` : `
                          <span class="badge" style="background: #fef3c7; color: #b45309; font-weight: 600; font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                            Pendiente
                          </span>
                        `}
                      </td>
                      <td style="text-align: center;">
                        ${isCerrado ? `
                          <span class="badge" style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-weight: 700; padding: 0.35rem 0.65rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            Cerrado
                          </span>
                        ` : `
                          <span class="badge" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-weight: 700; padding: 0.35rem 0.65rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                            <span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e; display: inline-block;"></span>
                            Abierto
                          </span>
                        `}
                      </td>
                      <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 0.35rem; align-items: center; justify-content: flex-end;">
                          ${!isCerrado ? `
                            <button type="button" class="btn btn-sm btn-cerrar-mes" data-id="${row.id}" data-mes="${row.mes}" data-ano="${row.ano}" title="Cerrar formalmente este mes" style="padding: 0.35rem 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem; background: #0f172a; color: #ffffff; border: 1px solid #0f172a; border-radius: 6px; cursor: pointer;">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                              Cerrar Mes
                            </button>
                          ` : `
                            <button type="button" class="btn btn-sm btn-outline btn-reabrir-mes" data-id="${row.id}" data-mes="${row.mes}" data-ano="${row.ano}" title="Reabrir este mes" style="padding: 0.35rem 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                              </svg>
                              Reabrir
                            </button>
                          `}

                          <button type="button" class="btn btn-sm btn-outline btn-edit-cierre-mes" data-id="${row.id}" title="Editar período" style="padding: 0.35rem 0.55rem;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M12 20h9"/>
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                            </svg>
                          </button>

                          <button type="button" class="btn btn-sm btn-outline btn-delete-cierre-mes" data-id="${row.id}" data-mes="${row.mes}" data-ano="${row.ano}" title="Eliminar período" style="padding: 0.35rem 0.55rem; color: #dc2626;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
};

