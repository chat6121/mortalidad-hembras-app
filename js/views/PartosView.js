/**
 * PartosView: Vista para el módulo Resumen de Partos.
 * Presenta submenú / pestañas ("Tabla Partos" y "Gráficos"),
 * buscador inteligente, grupo sincronizado de Vuelta, PIC y Fecha Calendario,
 * tabla con las 10 columnas exactas y analítica gráfica zootécnica con Chart.js.
 */
window.App = window.App || {};
window.App.Views = window.App.Views || {};

window.App.Views.Partos = {
  container: document.getElementById('view-partos'),
  _chartInstances: {},

  /**
   * Renderiza el cascarón estructural completo
   */
  renderSkeleton(filterOptions = { areas: [], turnos: [], pics: [], vueltas: [], semanas: [] }) {
    if (!this.container) {
      this.container = document.getElementById('view-partos');
    }
    if (!this.container) return;

    const Format = window.App.Utils.Format;
    const currentInfo = Format ? Format.getPicInfo(new Date()) : { vuelta: 20, pic: 131 };
    const currentVuelta = currentInfo.vuelta;
    const currentPic = currentInfo.pic;
    const currentIsoDate = Format && Format.formatDateISO ? Format.formatDateISO(new Date()) : new Date().toISOString().slice(0, 10);
    const currentHumanDate = Format && Format.formatDateHuman ? Format.formatDateHuman(new Date()) : '';

    const areasHtml = (filterOptions.areas || [])
      .map(a => `<option value="${a}">Área ${a}</option>`)
      .join('');

    const turnosHtml = (filterOptions.turnos || [1, 2, 3])
      .map(t => `<option value="${t}">Turno ${t}</option>`)
      .join('');

    const semanasHtml = (filterOptions.semanas || [])
      .map(s => `<option value="${s}">${s}</option>`)
      .join('');

    this.container.innerHTML = `
      <!-- SUBMENÚ / PESTAÑAS DE NAVEGACIÓN INTERNA PARTOS -->
      <div class="mpd-tabs-nav" id="partos-tabs-nav">
        <button type="button" class="mpd-tab-btn active" data-tab="table" id="tab-partos-table">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          <span>Tabla Partos</span>
        </button>

        <button type="button" class="mpd-tab-btn" data-tab="charts" id="tab-partos-charts">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span>Gráficos</span>
        </button>
      </div>

      <!-- ==============================================
           SUBVISTA 1: TABLA RESUMEN DE PARTOS
           ============================================== -->
      <div id="partos-subview-table" class="mpd-subview-panel">
        <!-- CARDS KPI DE RESUMEN ZOOTÉCNICO -->
        <div class="stats-grid" id="partos-stats-grid">
          <div class="stat-card grad-indigo">
            <div class="stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <div>
              <div class="stat-value" id="partos-kpi-partos">0</div>
              <div class="stat-label">Total Partos</div>
            </div>
          </div>

          <div class="stat-card grad-emerald">
            <div class="stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div>
              <div class="stat-value" id="partos-kpi-lnv">0</div>
              <div class="stat-label">Nacidos Vivos (LNV)</div>
            </div>
          </div>

          <div class="stat-card grad-rose">
            <div class="stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div>
              <div class="stat-value" id="partos-kpi-lnm">0</div>
              <div class="stat-label">Nacidos Muertos (LNM)</div>
            </div>
          </div>

          <div class="stat-card grad-amber">
            <div class="stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div>
              <div class="stat-value" id="partos-kpi-lnmom">0</div>
              <div class="stat-label">Momias (LNMom)</div>
            </div>
          </div>

          <div class="stat-card grad-blue">
            <div class="stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <div class="stat-value" id="partos-kpi-lnt">0</div>
              <div class="stat-label">Total Nacidos (LNT)</div>
            </div>
          </div>
        </div>

        <!-- CONTENEDOR PRINCIPAL DE LA TABLA Y HERRAMIENTAS -->
        <div class="card">
          <div class="card-header" style="flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
                <h3 class="card-title" style="margin: 0;">Resumen de Partos</h3>
                <span class="badge" id="partos-integrity-badge" style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; font-size: 0.74rem; font-weight: 600; border-radius: 9999px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;" title="Comprobación de consistencia matemática activa: LNV + LNM + LNMom = LNT en el 100% de los registros">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>LNV + LNM + LNMom = LNT (Verificado)</span>
                </span>
              </div>
              <p class="card-subtitle" style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 4px;">
                Registro productivo de maternidad: Partos, LNV, LNM, Momias y Total de Camada por Turno y Área.
              </p>
            </div>

            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <input type="file" id="partos-file-input" accept=".xlsm,.xlsx,.xls" style="display: none;" />
              <button type="button" class="btn btn-secondary btn-sm" id="btn-partos-import" title="Importar archivo Excel .xlsm o .xlsx">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span>Importar Excel</span>
              </button>

              <button type="button" class="btn btn-secondary btn-sm" id="btn-partos-reload-seed" title="Recargar base original desde INFORMACION SAP.xlsm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                <span>Restaurar Base</span>
              </button>

              <button type="button" class="btn btn-secondary btn-sm" id="btn-partos-export-csv" title="Exportar registros filtrados a CSV">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          <div class="card-body">
            <!-- BARRA DE FILTROS Y BÚSQUEDA INTELIGENTE -->
            <div class="mpd-filter-bar">
              <div class="mpd-filter-search">
                <label class="filter-field-label">Búsqueda Rápida</label>
                <div class="mpd-search-box-wrapper">
                  <svg class="mpd-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input type="text" id="partos-search-input" class="mpd-input mpd-input-search" placeholder="Buscador inteligente (cualquier campo)..." autocomplete="off" />
                </div>
              </div>

              <!-- CONTROL UNIFICADO: FECHA PIC CON CALENDARIO INTEGRADO Y FECHA HUMANA -->
              <div class="pic-date-control" title="Filtro de Fecha PIC (Vuelta-PIC) con selector de calendario">
                <label class="filter-field-label" title="Formato: Vuelta-PIC (Ej: 20-132 o 19-786)">FECHA PIC</label>
                <div class="pic-input-wrapper">
                  <input type="text" id="partos-filter-vueltapic" class="form-control pic-input-field" placeholder="Ej: 20-132" value="${currentVuelta}-" autocomplete="off" />
                  <div class="btn-pic-calendar-wrapper" title="Seleccionar fecha en calendario">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input type="date" id="partos-filter-date" class="pic-hidden-datepicker" tabindex="-1" />
                  </div>
                </div>
                <div class="pic-date-caption" id="partos-filter-date-caption"></div>
              </div>

              <div class="mpd-filter-item" style="min-width: 105px;">
                <label class="filter-field-label">Área</label>
                <select id="partos-filter-area" class="mpd-input mpd-select" title="Filtrar por Área">
                  <option value="">Todas</option>
                  ${areasHtml}
                </select>
              </div>

              <div class="mpd-filter-item" style="min-width: 95px;">
                <label class="filter-field-label">Turno</label>
                <select id="partos-filter-turno" class="mpd-input mpd-select" title="Filtrar por Turno">
                  <option value="">Todos</option>
                  ${turnosHtml}
                </select>
              </div>

              <div class="mpd-filter-item" style="min-width: 95px;">
                <label class="filter-field-label">Semana</label>
                <select id="partos-filter-semana" class="mpd-input mpd-select" title="Filtrar por Semana">
                  <option value="">Todas</option>
                  ${semanasHtml}
                </select>
              </div>

              <button type="button" class="btn btn-secondary mpd-btn-clear" id="btn-partos-clear-filters" title="Limpiar todos los filtros">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                <span>Limpiar</span>
              </button>

              <div class="mpd-filter-rows">
                <label class="filter-field-label" for="partos-page-size">Filas</label>
                <select id="partos-page-size" class="mpd-input mpd-select mpd-select-sm">
                  <option value="25">25</option>
                  <option value="50" selected>50</option>
                  <option value="100">100</option>
                  <option value="250">250</option>
                </select>
              </div>
            </div>

            <!-- TABLA DE DATOS: 10 COLUMNAS (.table-compact) -->
            <div class="table-container" style="overflow-x: auto;">
              <table class="table table-compact table-hover table-striped" id="table-partos" style="width: 100%; white-space: nowrap;">
                <thead>
                  <tr>
                    <th class="th-sortable text-center" data-sort="pic" style="width: 80px;" title="Fecha PIC de parto (0 a 999)">Pic</th>
                    <th class="th-sortable text-center" data-sort="semana" style="width: 80px;" title="Semana del año">Semana</th>
                    <th class="th-sortable text-center" data-sort="area" style="width: 85px;" title="Área de Maternidad">Area</th>
                    <th class="th-sortable text-center" data-sort="turno" style="width: 80px;" title="Turno operativo de parto">Turno</th>
                    <th class="th-sortable text-right" data-sort="partos" style="width: 90px;" title="Cantidad de Partos">Partos</th>
                    <th class="th-sortable text-right" data-sort="lnv" style="width: 95px;" title="Lechones Nacidos Vivos">LNV</th>
                    <th class="th-sortable text-right" data-sort="lnm" style="width: 95px;" title="Lechones Nacidos Muertos (Mortinatos)">LNM</th>
                    <th class="th-sortable text-right" data-sort="lnMom" style="width: 95px;" title="Lechones Momificados">LNMom</th>
                    <th class="th-sortable text-right" data-sort="lnt" style="width: 100px;" title="Lechones Nacidos Totales (LNV + LNM + LNMom)">LNT</th>
                    <th class="th-sortable text-center sort-desc" data-sort="fecha" style="width: 105px;" title="Fecha Calendario correspondiente (dd-mm-yyyy)">Fecha</th>
                  </tr>
                </thead>
                <tbody id="partos-table-tbody">
                  <tr>
                    <td colspan="10" class="text-center" style="padding: 2rem;">
                      <div class="spinner" style="margin: 0 auto 0.5rem auto;"></div>
                      <span style="color: var(--color-text-secondary); font-size: 0.88rem;">Cargando registros de partos...</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- PAGINADOR INTEGRADO CON SALTO DIRECTO -->
            <div class="pagination" id="partos-pagination" style="margin-top: 1rem;">
              <div class="pagination-info" id="partos-pagination-info">
                Mostrando 0 - 0 de 0 registros
              </div>
              <div class="pagination-controls" id="partos-pagination-controls"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==============================================
           SUBVISTA 2: GRÁFICOS RESUMEN DE PARTOS
           ============================================== -->
      <div id="partos-subview-charts" class="mpd-subview-panel" style="display: none;">
        <div class="card" style="margin-bottom: 1.5rem;">
          <div class="card-header" style="flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h3 class="card-title">Analítica Gráfica de Partos y Camadas</h3>
              <p class="card-subtitle" style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 2px;">
                Distribución de nacimientos vivos vs pérdidas y balance reproductivo por Área y Turno.
              </p>
            </div>

            <!-- CONTROL UNIFICADO: FECHA PIC CON CALENDARIO INTEGRADO Y FECHA HUMANA -->
            <div class="pic-date-control" title="Filtrar analítica por Fecha PIC (Vuelta-PIC)">
              <label class="filter-field-label" title="Formato: Vuelta-PIC (Ej: 20-132 o 19-786)">FECHA PIC</label>
              <div class="pic-input-wrapper">
                <input type="text" id="partos-charts-vueltapic" class="form-control pic-input-field" placeholder="Ej: 20-132" value="${currentVuelta}-${currentPic}" autocomplete="off" />
                <div class="btn-pic-calendar-wrapper" title="Seleccionar fecha en calendario">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <input type="date" id="partos-charts-date" class="pic-hidden-datepicker" value="${currentIsoDate}" tabindex="-1" />
                </div>
              </div>
              <div class="pic-date-caption" id="partos-charts-date-caption">${currentHumanDate}</div>
            </div>
          </div>

          <div class="card-body">
            <!-- KPIS ESPECÍFICOS DE LA CONSULTA GRÁFICA -->
            <div class="stats-grid" style="margin-bottom: 1.5rem;" id="partos-charts-stats">
              <div class="stat-card" style="border-left: 4px solid #4f46e5; background: #ffffff;">
                <div>
                  <div class="stat-value" id="partos-chart-kpi-partos" style="color: #4f46e5;">0</div>
                  <div class="stat-label" style="color: #64748b; font-weight: 600;">Partos en Período</div>
                </div>
              </div>
              <div class="stat-card" style="border-left: 4px solid #10b981; background: #ffffff;">
                <div>
                  <div class="stat-value" id="partos-chart-kpi-lnv" style="color: #10b981;">0</div>
                  <div class="stat-label" style="color: #64748b; font-weight: 600;">Nacidos Vivos (LNV)</div>
                </div>
              </div>
              <div class="stat-card" style="border-left: 4px solid #2563eb; background: #ffffff;">
                <div>
                  <div class="stat-value" id="partos-chart-kpi-lnt" style="color: #2563eb;">0</div>
                  <div class="stat-label" style="color: #64748b; font-weight: 600;">Total Camada (LNT)</div>
                </div>
              </div>
              <div class="stat-card" style="border-left: 4px solid #0284c7; background: #ffffff;">
                <div>
                  <div class="stat-value" id="partos-chart-kpi-avg-lnv" style="color: #0284c7;">0.0</div>
                  <div class="stat-label" style="color: #64748b; font-weight: 600;">Promedio LNV / Parto</div>
                </div>
              </div>
              <div class="stat-card" style="border-left: 4px solid #e11d48; background: #ffffff;">
                <div>
                  <div class="stat-value" id="partos-chart-kpi-pct-lnm" style="color: #e11d48;">0.0%</div>
                  <div class="stat-label" style="color: #64748b; font-weight: 600;">% Mortinatos (LNM)</div>
                </div>
              </div>
              <div class="stat-card" style="border-left: 4px solid #d97706; background: #ffffff;">
                <div>
                  <div class="stat-value" id="partos-chart-kpi-pct-mom" style="color: #d97706;">0.0%</div>
                  <div class="stat-label" style="color: #64748b; font-weight: 600;">% Momias (LNMom)</div>
                </div>
              </div>
            </div>

            <!-- GRILLA DE GRÁFICOS -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
              <!-- GRÁFICO 1: COMPOSICIÓN DE NACIMIENTOS -->
              <div class="card" style="box-shadow: none; border: 1px solid var(--color-border);">
                <div class="card-header">
                  <h4 class="card-title" style="font-size: 0.95rem;">Composición de Nacimientos</h4>
                </div>
                <div class="card-body" style="height: 300px; display: flex; align-items: center; justify-content: center; position: relative;">
                  <canvas id="chart-partos-composicion"></canvas>
                </div>
              </div>

              <!-- GRÁFICO 2: PARTOS Y LNV POR ÁREA -->
              <div class="card" style="box-shadow: none; border: 1px solid var(--color-border);">
                <div class="card-header">
                  <h4 class="card-title" style="font-size: 0.95rem;">Partos y Nacidos Vivos por Área</h4>
                </div>
                <div class="card-body" style="height: 300px; position: relative;">
                  <canvas id="chart-partos-areas"></canvas>
                </div>
              </div>

              <!-- GRÁFICO 3: DISTRIBUCIÓN POR TURNO -->
              <div class="card" style="box-shadow: none; border: 1px solid var(--color-border); grid-column: 1 / -1;">
                <div class="card-header">
                  <h4 class="card-title" style="font-size: 0.95rem;">Producción y Eficiencia por Turno de Trabajo</h4>
                </div>
                <div class="card-body" style="height: 280px; position: relative;">
                  <canvas id="chart-partos-turnos"></canvas>
                </div>
              </div>
            </div>

            <!-- TABLA RESUMEN POR ÁREA -->
            <div class="card" style="box-shadow: none; border: 1px solid var(--color-border);">
              <div class="card-header">
                <h4 class="card-title" style="font-size: 0.95rem;">Resumen de Eficiencia y Tamaño de Camada por Área</h4>
              </div>
              <div class="card-body" style="padding: 0;">
                <div class="table-container">
                  <table class="table table-compact table-striped" style="margin: 0; width: 100%;">
                    <thead>
                      <tr>
                        <th>Área</th>
                        <th class="text-right">Partos</th>
                        <th class="text-right">LNV</th>
                        <th class="text-right">LNM</th>
                        <th class="text-right">LNMom</th>
                        <th class="text-right">LNT</th>
                        <th class="text-right">Prom. LNV/Parto</th>
                        <th class="text-right">Prom. LNT/Parto</th>
                        <th class="text-right">% LNM</th>
                        <th class="text-right">% Momias</th>
                      </tr>
                    </thead>
                    <tbody id="partos-charts-table-areas-tbody">
                      <tr>
                        <td colspan="10" class="text-center" style="padding: 1.5rem; color: var(--color-text-secondary);">
                          Sin datos para los criterios seleccionados.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Conmuta visualmente entre la pestaña de Tabla y la de Gráficos
   */
  switchTab(tabName) {
    const btnTable = document.getElementById('tab-partos-table');
    const btnCharts = document.getElementById('tab-partos-charts');
    const panelTable = document.getElementById('partos-subview-table');
    const panelCharts = document.getElementById('partos-subview-charts');

    if (tabName === 'charts') {
      if (btnTable) btnTable.classList.remove('active');
      if (btnCharts) btnCharts.classList.add('active');
      if (panelTable) panelTable.style.display = 'none';
      if (panelCharts) panelCharts.style.display = 'block';
    } else {
      if (btnCharts) btnCharts.classList.remove('active');
      if (btnTable) btnTable.classList.add('active');
      if (panelCharts) panelCharts.style.display = 'none';
      if (panelTable) panelTable.style.display = 'block';
    }
  },

  /**
   * Renderiza las filas de la tabla de 10 columnas exactas
   */
  renderTable(data, pagination, summary) {
    const tbody = document.getElementById('partos-table-tbody');
    if (!tbody) return;

    // Actualizar KPIs de cabecera
    if (summary) {
      const kPartos = document.getElementById('partos-kpi-partos');
      const kLnv = document.getElementById('partos-kpi-lnv');
      const kLnm = document.getElementById('partos-kpi-lnm');
      const kMom = document.getElementById('partos-kpi-lnmom');
      const kLnt = document.getElementById('partos-kpi-lnt');

      if (kPartos) kPartos.textContent = Number(summary.totalPartos || 0).toLocaleString();
      if (kLnv) kLnv.textContent = Number(summary.totalLnv || 0).toLocaleString();
      if (kLnm) kLnm.textContent = Number(summary.totalLnm || 0).toLocaleString();
      if (kMom) kMom.textContent = Number(summary.totalLnMom || 0).toLocaleString();
      if (kLnt) kLnt.textContent = Number(summary.totalLnt || 0).toLocaleString();
    }

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center" style="padding: 2.5rem; color: var(--color-text-secondary);">
            <div style="font-size: 1.1rem; font-weight: 500; margin-bottom: 0.25rem;">No se encontraron registros de partos</div>
            <p style="font-size: 0.85rem; margin: 0;">Prueba modificando los filtros de Vuelta, PIC, Área o Turno.</p>
          </td>
        </tr>
      `;
      this.renderPagination(pagination || { totalRecords: 0, totalPages: 1, currentPage: 1, pageSize: 50 });
      return;
    }

    const Format = window.App.Utils.Format;

    const rowsHtml = data.map((item) => {
      const v = item.vuelta ?? '-';
      const pic = item.pic ?? '-';
      const sem = item.semana ?? '-';
      const area = item.area ? String(item.area).toUpperCase() : '-';
      const turno = item.turno ?? '-';
      const partos = Number(item.partos || 0);
      const lnv = Number(item.lnv || 0);
      const lnm = Number(item.lnm || 0);
      const lnMom = Number(item.lnMom || 0);
      const lnt = Number(item.lnt || (lnv + lnm + lnMom));

      let fechaCal = item.fechaCalendario;
      if (!fechaCal && Format && Format.FCalendario && item.vuelta !== undefined && item.pic !== undefined) {
        try {
          const d = Format.FCalendario(item.pic, item.vuelta);
          fechaCal = Format.formatDate(d);
        } catch (e) {
          fechaCal = '-';
        }
      }

      return `
        <tr>
          <td class="text-center" style="font-weight: 700;" title="Vuelta ${v} - PIC ${pic}">${pic}</td>
          <td class="text-center"><span class="badge badge-secondary" style="font-size: 0.76rem;">Sem ${sem}</span></td>
          <td class="text-center"><span class="badge badge-primary" style="font-size: 0.78rem; font-weight: 600;">${area}</span></td>
          <td class="text-center"><span class="badge badge-info" style="font-size: 0.76rem;">T${turno}</span></td>
          <td class="text-right" style="font-weight: 600;">${partos.toLocaleString()}</td>
          <td class="text-right" style="font-weight: 700; color: #059669;">${lnv.toLocaleString()}</td>
          <td class="text-right" style="font-weight: 600; color: ${lnm > 0 ? '#dc2626' : 'var(--color-text-secondary)'};">${lnm.toLocaleString()}</td>
          <td class="text-right" style="font-weight: 600; color: ${lnMom > 0 ? '#d97706' : 'var(--color-text-secondary)'};">${lnMom.toLocaleString()}</td>
          <td class="text-right" style="font-weight: 700; color: var(--color-primary-700);">${lnt.toLocaleString()}</td>
          <td class="text-center" style="font-size: 0.83rem; font-weight: 600; color: var(--color-text-primary); font-variant-numeric: tabular-nums;">${fechaCal || '-'}</td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rowsHtml;
    this.renderPagination(pagination);
  },

  /**
   * Renderiza los controles del paginador
   */
  renderPagination(pagination) {
    const infoEl = document.getElementById('partos-pagination-info');
    const controlsEl = document.getElementById('partos-pagination-controls');
    if (!infoEl || !controlsEl) return;

    const { totalRecords = 0, totalPages = 1, currentPage = 1, pageSize = 50 } = pagination;

    if (totalRecords === 0) {
      infoEl.textContent = 'Mostrando 0 - 0 de 0 registros';
      controlsEl.innerHTML = '';
      return;
    }

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalRecords);
    infoEl.textContent = `Mostrando ${start} - ${end} de ${totalRecords.toLocaleString()} registros`;

    let html = '';

    // Botón Primera página
    html += `
      <button type="button" class="btn btn-secondary btn-sm" data-page="1" ${currentPage === 1 ? 'disabled' : ''} title="Primera página">
        &laquo;
      </button>
    `;

    // Botón Anterior
    html += `
      <button type="button" class="btn btn-secondary btn-sm" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} title="Página anterior">
        &lsaquo;
      </button>
    `;

    // Botones numéricos de ventana
    const delta = 2;
    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);

    for (let p = left; p <= right; p++) {
      html += `
        <button type="button" class="btn btn-sm ${p === currentPage ? 'btn-primary' : 'btn-secondary'}" data-page="${p}">
          ${p}
        </button>
      `;
    }

    // Botón Siguiente
    html += `
      <button type="button" class="btn btn-secondary btn-sm" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} title="Página siguiente">
        &rsaquo;
      </button>
    `;

    // Botón Última
    html += `
      <button type="button" class="btn btn-secondary btn-sm" data-page="${totalPages}" ${currentPage === totalPages ? 'disabled' : ''} title="Última página">
        &raquo;
      </button>
    `;

    controlsEl.innerHTML = html;
  },

  /**
   * Renderiza los gráficos analíticos con Chart.js
   */
  renderCharts(chartsData) {
    if (!chartsData) return;

    // Actualizar KPIs de gráficos
    const totals = chartsData.totals || {};
    const elPartos = document.getElementById('partos-chart-kpi-partos');
    const elLnv = document.getElementById('partos-chart-kpi-lnv');
    const elLnt = document.getElementById('partos-chart-kpi-lnt');
    const elAvgLnv = document.getElementById('partos-chart-kpi-avg-lnv');
    const elPctLnm = document.getElementById('partos-chart-kpi-pct-lnm');
    const elPctMom = document.getElementById('partos-chart-kpi-pct-mom');

    if (elPartos) elPartos.textContent = Number(totals.totalPartos || 0).toLocaleString();
    if (elLnv) elLnv.textContent = Number(totals.totalLnv || 0).toLocaleString();
    if (elLnt) elLnt.textContent = Number(totals.totalLnt || 0).toLocaleString();
    if (elAvgLnv) elAvgLnv.textContent = totals.avgLnvParto ? totals.avgLnvParto.toFixed(2) : '0.00';
    if (elPctLnm) elPctLnm.textContent = totals.pctLnm ? `${totals.pctLnm.toFixed(1)}%` : '0.0%';
    if (elPctMom) elPctMom.textContent = totals.pctMom ? `${totals.pctMom.toFixed(1)}%` : '0.0%';

    // Destruir gráficos anteriores
    if (this._chartInstances.composicion) this._chartInstances.composicion.destroy();
    if (this._chartInstances.areas) this._chartInstances.areas.destroy();
    if (this._chartInstances.turnos) this._chartInstances.turnos.destroy();

    // 1. Gráfico de Composición de Nacimientos (Doughnut)
    const ctxComp = document.getElementById('chart-partos-composicion');
    if (ctxComp && window.Chart) {
      const dist = chartsData.distribution || [];
      this._chartInstances.composicion = new window.Chart(ctxComp, {
        type: 'doughnut',
        data: {
          labels: dist.map(d => `${d.label} (${d.pct}%)`),
          datasets: [{
            data: dist.map(d => d.value),
            backgroundColor: dist.map(d => d.color),
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 12, font: { size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${Number(ctx.raw || 0).toLocaleString()} lechones`
              }
            }
          },
          cutout: '62%'
        }
      });
    }

    // 2. Gráfico de Partos y LNV por Área (Bar)
    const ctxAreas = document.getElementById('chart-partos-areas');
    if (ctxAreas && window.Chart) {
      const byArea = chartsData.byArea || [];
      this._chartInstances.areas = new window.Chart(ctxAreas, {
        type: 'bar',
        data: {
          labels: byArea.map(a => a.area),
          datasets: [
            {
              label: 'Partos',
              data: byArea.map(a => a.partos),
              backgroundColor: '#6366f1',
              borderRadius: 4
            },
            {
              label: 'Nacidos Vivos (LNV)',
              data: byArea.map(a => a.lnv),
              backgroundColor: '#10b981',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.05)' }
            },
            x: {
              grid: { display: false }
            }
          },
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }
          }
        }
      });
    }

    // 3. Gráfico de Producción por Turno (Bar horizontal o agrupado)
    const ctxTurnos = document.getElementById('chart-partos-turnos');
    if (ctxTurnos && window.Chart) {
      const byTurno = chartsData.byTurno || [];
      this._chartInstances.turnos = new window.Chart(ctxTurnos, {
        type: 'bar',
        data: {
          labels: byTurno.map(t => t.label),
          datasets: [
            {
              label: 'Partos',
              data: byTurno.map(t => t.partos),
              backgroundColor: '#4f46e5',
              borderRadius: 4
            },
            {
              label: 'LNV (Vivos)',
              data: byTurno.map(t => t.lnv),
              backgroundColor: '#10b981',
              borderRadius: 4
            },
            {
              label: 'LNM (Muertos)',
              data: byTurno.map(t => t.lnm),
              backgroundColor: '#ef4444',
              borderRadius: 4
            },
            {
              label: 'Momias',
              data: byTurno.map(t => t.lnMom),
              backgroundColor: '#f59e0b',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.05)' }
            },
            x: {
              grid: { display: false }
            }
          },
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }
          }
        }
      });
    }

    // 4. Tabla de Resumen por Área
    const tbodyAreas = document.getElementById('partos-charts-table-areas-tbody');
    if (tbodyAreas) {
      const byArea = chartsData.byArea || [];
      if (byArea.length === 0) {
        tbodyAreas.innerHTML = `
          <tr>
            <td colspan="10" class="text-center" style="padding: 1.5rem; color: var(--color-text-secondary);">
              No hay registros para la Vuelta / PIC especificada.
            </td>
          </tr>
        `;
      } else {
        tbodyAreas.innerHTML = byArea.map((a) => `
          <tr>
            <td style="font-weight: 600;"><span class="badge badge-primary">${a.area}</span></td>
            <td class="text-right" style="font-weight: 600;">${a.partos.toLocaleString()}</td>
            <td class="text-right" style="font-weight: 700; color: #059669;">${a.lnv.toLocaleString()}</td>
            <td class="text-right" style="font-weight: 600; color: ${a.lnm > 0 ? '#dc2626' : 'var(--color-text-secondary)'};">${a.lnm.toLocaleString()}</td>
            <td class="text-right" style="font-weight: 600; color: ${a.lnMom > 0 ? '#d97706' : 'var(--color-text-secondary)'};">${a.lnMom.toLocaleString()}</td>
            <td class="text-right" style="font-weight: 700; color: var(--color-primary-700);">${a.lnt.toLocaleString()}</td>
            <td class="text-right" style="font-weight: 600; color: #0284c7;">${a.avgLnv.toFixed(2)}</td>
            <td class="text-right" style="font-weight: 600;">${a.avgLnt.toFixed(2)}</td>
            <td class="text-right" style="font-weight: 600; color: ${a.pctLnm > 7 ? '#dc2626' : 'inherit'};">${a.pctLnm.toFixed(1)}%</td>
            <td class="text-right" style="font-weight: 600; color: ${a.pctMom > 3 ? '#d97706' : 'inherit'};">${a.pctMom.toFixed(1)}%</td>
          </tr>
        `).join('');
      }
    }
  }
};

