/**
 * MpdView: Vista para el módulo MPD.
 * Integra submenú / pestañas internas ("Tabla MPD" y "Gráficos"),
 * buscador inteligente alineado, filtros avanzados (Pic, Sala, Nota),
 * tabla de alto rendimiento con 12 columnas exactas y gráficos analíticos interactivos con Chart.js.
 */
window.App = window.App || {};
window.App.Views = window.App.Views || {};

window.App.Views.Mpd = {
  container: document.getElementById('view-mpd'),
  _chartInstances: {},

  /**
   * Renderiza el cascarón estructural completo (Pestañas de submenú, Tabla y Gráficos)
   */
  renderSkeleton(filterOptions = { salas: [], pics: [], notas: [] }) {
    if (!this.container) {
      this.container = document.getElementById('view-mpd');
    }
    if (!this.container) return;

    const Format = window.App.Utils.Format;
    const currentInfo = Format ? Format.getPicInfo(new Date()) : { vuelta: 20, pic: 131 };
    const currentVuelta = currentInfo.vuelta;
    const currentPic = currentInfo.pic;
    const currentIsoDate = Format && Format.formatDateISO ? Format.formatDateISO(new Date()) : new Date().toISOString().slice(0, 10);
    const currentHumanDate = Format && Format.formatDateHuman ? Format.formatDateHuman(new Date()) : '';

    const salasHtml = filterOptions.salas
      .map(s => `<option value="${s}">${s}</option>`)
      .join('');

    this.container.innerHTML = `
      <!-- SUBMENÚ / PESTAÑAS DE NAVEGACIÓN INTERNA MPD -->
      <div class="mpd-tabs-nav" id="mpd-tabs-nav">
        <button type="button" class="mpd-tab-btn active" data-tab="table" id="tab-mpd-table">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          <span>Tabla MPD</span>
        </button>

        <button type="button" class="mpd-tab-btn" data-tab="charts" id="tab-mpd-charts">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span>Gráficos</span>
        </button>
      </div>

      <!-- ==============================================
           SUBVISTA 1: TABLA MPD
           ============================================== -->
      <div id="mpd-subview-table" class="mpd-subview-panel">
        <!-- CARDS KPI DE RESUMEN -->
        <div class="stats-grid" id="mpd-stats-grid">
          <div class="stat-card grad-indigo">
            <div class="stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <div>
              <div class="stat-value" id="mpd-kpi-total">0</div>
              <div class="stat-label">Registros Totales</div>
            </div>
          </div>

          <div class="stat-card grad-emerald">
            <div class="stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div>
              <div class="stat-value" id="mpd-kpi-cantidad">0</div>
              <div class="stat-label">Lechones Muertos</div>
            </div>
          </div>

          <div class="stat-card grad-amber">
            <div class="stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <div class="stat-value" id="mpd-kpi-salas">0</div>
              <div class="stat-label">Salas con Registros</div>
            </div>
          </div>

          <div class="stat-card grad-blue">
            <div class="stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            </div>
            <div>
              <div class="stat-value" id="mpd-kpi-maternidades">0</div>
              <div class="stat-label">Maternidades</div>
            </div>
          </div>
        </div>

        <!-- CONTENEDOR PRINCIPAL DE LA TABLA Y HERRAMIENTAS -->
        <div class="card">
          <div class="card-header" style="flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h3 class="card-title">Mortalidad Pre-Destete (MPD)</h3>
              <p class="card-subtitle" style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 2px;">
                Control zootécnico de mortalidad de lechones lactantes por 13 causas tipificadas en maternidad.
              </p>
            </div>

            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <input type="file" id="mpd-file-input" accept=".xlsm,.xlsx,.xls" style="display: none;" />
              <button type="button" class="btn btn-secondary btn-sm" id="btn-mpd-import" title="Importar archivo Excel .xlsm o .xlsx">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span>Importar Excel</span>
              </button>

              <button type="button" class="btn btn-secondary btn-sm" id="btn-mpd-reload-seed" title="Recargar datos originales del archivo INFORMACION SAP.xlsm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                <span>Restaurar Base</span>
              </button>

              <button type="button" class="btn btn-secondary btn-sm" id="btn-mpd-export-csv" title="Exportar registros filtrados a CSV">
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
            <!-- BARRA DE FILTROS Y BÚSQUEDA INTELIGENTE ALINEADA -->
            <div class="mpd-filter-bar">
              <div class="mpd-filter-search">
                <label class="filter-field-label">Búsqueda Rápida</label>
                <div class="mpd-search-box-wrapper">
                  <svg class="mpd-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input type="text" id="mpd-search-input" class="mpd-input mpd-input-search" placeholder="Buscador inteligente (cualquier campo)..." autocomplete="off" />
                </div>
              </div>

              <!-- CONTROL UNIFICADO: FECHA PIC CON CALENDARIO INTEGRADO Y FECHA HUMANA -->
              <div class="pic-date-control" title="Filtro de Fecha PIC (Vuelta-PIC) con selector de calendario">
                <label class="filter-field-label" title="Formato: Vuelta-PIC (Ej: 20-132 o 19-786)">FECHA PIC</label>
                <div class="pic-input-wrapper">
                  <input type="text" id="mpd-filter-vueltapic" class="form-control pic-input-field" placeholder="Ej: 20-132" value="${currentVuelta}-" autocomplete="off" />
                  <div class="btn-pic-calendar-wrapper" title="Seleccionar fecha en calendario">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input type="date" id="mpd-filter-date" class="pic-hidden-datepicker" tabindex="-1" />
                  </div>
                </div>
                <div class="pic-date-caption" id="mpd-filter-date-caption"></div>
              </div>

              <div class="mpd-filter-item mpd-filter-sala">
                <label class="filter-field-label">Sala</label>
                <select id="mpd-filter-sala" class="mpd-input mpd-select" title="Filtrar por Sala">
                  <option value="">Todas</option>
                  ${salasHtml}
                </select>
              </div>

              <div class="mpd-filter-item mpd-filter-nota">
                <label class="filter-field-label">Nota</label>
                <input type="text" id="mpd-filter-nota" class="mpd-input" placeholder="Filtrar por Nota" />
              </div>

              <button type="button" class="btn btn-secondary mpd-btn-clear" id="btn-mpd-clear-filters" title="Limpiar todos los filtros">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                <span>Limpiar</span>
              </button>

              <div class="mpd-filter-rows">
                <label class="filter-field-label" for="mpd-page-size">Filas</label>
                <select id="mpd-page-size" class="mpd-input mpd-select mpd-select-sm">
                  <option value="25">25</option>
                  <option value="50" selected>50</option>
                  <option value="100">100</option>
                  <option value="250">250</option>
                </select>
              </div>
            </div>

            <!-- TABLA Y PAGINACIÓN -->
            <div id="mpd-table-wrapper" style="margin-top: 1rem;"></div>
          </div>
        </div>
      </div>

      <!-- ==============================================
           SUBVISTA 2: GRÁFICOS MPD (MORTALIDAD POR CAUSAS Y POR SALAS)
           ============================================== -->
      <div id="mpd-subview-charts" class="mpd-subview-panel" style="display: none;">
        <!-- BARRA SUPERIOR: FECHA PIC INTEGRADA CON CALENDARIO Y FECHA HUMANA -->
        <div class="mpd-charts-header-bar">
          <div class="pic-date-control" title="Consultar gráficos por Fecha PIC (Vuelta-PIC)">
            <label class="filter-field-label" title="Formato: Vuelta-PIC (Ej: 20-132 o 19-786)">FECHA PIC</label>
            <div class="pic-input-wrapper">
              <input type="text" id="mpd-charts-vueltapic" class="form-control pic-input-field" placeholder="Ej: 20-132" value="${currentVuelta}-${currentPic}" autocomplete="off" />
              <div class="btn-pic-calendar-wrapper" title="Seleccionar fecha en calendario">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <input type="date" id="mpd-charts-date" class="pic-hidden-datepicker" value="${currentIsoDate}" tabindex="-1" />
              </div>
            </div>
            <div class="pic-date-caption" id="mpd-charts-date-caption">${currentHumanDate}</div>
          </div>
        </div>

        <div class="mortalidad-charts-stack">
          <!-- 1. GRÁFICO: MORTALIDAD POR CAUSAS -->
          <div class="card mortalidad-card">
            <div class="mortalidad-card-header">
              <h3 class="mortalidad-title">MORTALIDAD POR CAUSAS</h3>
              <span class="mortalidad-total-badge" id="badge-causas-total">0</span>
            </div>
            <div class="card-body" style="padding: 1.25rem;">
              <div class="mortalidad-chart-canvas-box" style="height: 250px;">
                <canvas id="chart-mortalidad-causas"></canvas>
              </div>
              <div class="mortalidad-data-table-wrapper" id="table-wrapper-causas"></div>
            </div>
          </div>

          <!-- 2. GRÁFICO: MORTALIDAD POR SALAS -->
          <div class="card mortalidad-card" style="margin-top: 1.5rem;">
            <div class="mortalidad-card-header">
              <h3 class="mortalidad-title">MORTALIDAD POR SALAS</h3>
              <span class="mortalidad-total-badge" id="badge-salas-total">0</span>
            </div>
            <div class="card-body" style="padding: 1.25rem;">
              <div class="mortalidad-chart-canvas-box" style="height: 250px;">
                <canvas id="chart-mortalidad-salas"></canvas>
              </div>
              <div class="mortalidad-data-table-wrapper" id="table-wrapper-salas"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Cambia visualmente entre las pestañas "table" y "charts"
   */
  switchTab(tabName = 'table') {
    const isTable = tabName === 'table';
    const tabTable = document.getElementById('tab-mpd-table');
    const tabCharts = document.getElementById('tab-mpd-charts');
    const panelTable = document.getElementById('mpd-subview-table');
    const panelCharts = document.getElementById('mpd-subview-charts');

    if (tabTable) tabTable.classList.toggle('active', isTable);
    if (tabCharts) tabCharts.classList.toggle('active', !isTable);

    if (panelTable) panelTable.style.display = isTable ? 'block' : 'none';
    if (panelCharts) panelCharts.style.display = !isTable ? 'block' : 'none';
  },

  /**
   * Renderiza los gráficos de Mortalidad por Causas y Mortalidad por Salas con estilos del sistema
   */
  renderCharts(chartData) {
    if (typeof Chart === 'undefined') {
      console.warn('Librería Chart.js no encontrada.');
      return;
    }

    const Format = window.App.Utils.Format;
    const { selectedPic, selectedVuelta, isoDate, totalMortalidad, causas, salas } = chartData;

    // 1. Sincronizar los campos de Fecha PIC y Fecha Calendario en la barra de gráficos
    const chartsVpInput = document.getElementById('mpd-charts-vueltapic');
    const chartsDateInput = document.getElementById('mpd-charts-date');

    if (chartsVpInput) {
      if (Format && Format.formatVueltaPic) {
        chartsVpInput.value = Format.formatVueltaPic(selectedVuelta, selectedPic !== 'all' ? selectedPic : '');
      } else {
        chartsVpInput.value = (selectedVuelta && selectedPic !== 'all') ? `${selectedVuelta}-${selectedPic}` : '';
      }
    }
    if (chartsDateInput) {
      chartsDateInput.value = isoDate || '';
    }
    if (Format && Format.updateDateCaption) {
      Format.updateDateCaption('mpd-charts-date-caption', isoDate || chartsVpInput?.value);
    }

    // 2. Actualizar el total de mortalidad en los badges de cada gráfico
    const badgeCausas = document.getElementById('badge-causas-total');
    const badgeSalas = document.getElementById('badge-salas-total');

    const fmtTotal = Format ? Format.formatNumber(totalMortalidad, 0) : totalMortalidad;
    if (badgeCausas) badgeCausas.textContent = fmtTotal;
    if (badgeSalas) badgeSalas.textContent = fmtTotal;

    // Destruir instancias previas de gráficos para evitar superposiciones
    Object.keys(this._chartInstances).forEach(key => {
      if (this._chartInstances[key]) {
        this._chartInstances[key].destroy();
      }
    });
    this._chartInstances = {};

    // 3. GRÁFICO 1: MORTALIDAD POR CAUSAS (Barras Verticales Descendentes)
    const ctxCausas = document.getElementById('chart-mortalidad-causas');
    if (ctxCausas) {
      this._chartInstances.causas = new Chart(ctxCausas, {
        type: 'bar',
        data: {
          labels: causas.labels,
          datasets: [{
            label: 'Total',
            data: causas.values,
            backgroundColor: '#3b82f6',
            hoverBackgroundColor: '#2563eb',
            borderRadius: 4,
            barPercentage: 0.65
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: items => `Causa ${items[0].label}`,
                label: ctx => ` Lechones: ${Format ? Format.formatNumber(ctx.raw, 0) : ctx.raw}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'CANTIDAD',
                font: { weight: 'bold', size: 11 },
                color: '#64748b'
              },
              grid: { color: 'rgba(0,0,0,0.06)' }
            },
            x: {
              title: {
                display: true,
                text: 'CAUSAS',
                font: { weight: 'bold', size: 11 },
                color: '#64748b'
              },
              grid: { display: false }
            }
          }
        }
      });
    }

    // Tabla de Datos integrada al pie del gráfico de Causas
    const tableWrapperCausas = document.getElementById('table-wrapper-causas');
    if (tableWrapperCausas) {
      if (!causas.labels || causas.labels.length === 0) {
        tableWrapperCausas.innerHTML = `
          <div style="margin-top: 0.75rem; padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.82rem; background: #f8fafc; border: 1px dashed var(--border-color); border-radius: 4px;">
            No se registraron mortalidades por causas en la fecha seleccionada.
          </div>
        `;
      } else {
        tableWrapperCausas.innerHTML = `
          <div class="table-responsive" style="margin-top: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px;">
            <table class="table table-bordered table-sm mortalidad-grid-table" style="margin-bottom: 0; text-align: center; font-size: 0.8rem; width: 100%;">
              <thead>
                <tr style="background-color: #f1f5f9; color: var(--text-main);">
                  <th style="width: 90px; text-align: left; padding: 5px 8px; font-weight: 700; background: #e2e8f0;">CAUSAS</th>
                  ${causas.labels.map(l => `<th style="padding: 5px 8px; font-weight: 700;">${l}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: left; padding: 5px 8px; font-weight: 700; background: #f8fafc; color: #1e40af; white-space: nowrap;">
                    <span style="display: inline-block; width: 10px; height: 10px; background: #3b82f6; margin-right: 5px; border-radius: 2px;"></span>
                    Total
                  </td>
                  ${causas.values.map(v => `<td style="padding: 5px 8px; font-weight: 600;">${v}</td>`).join('')}
                </tr>
              </tbody>
            </table>
          </div>
        `;
      }
    }

    // 4. GRÁFICO 2: MORTALIDAD POR SALAS (Barras Verticales Descendentes)
    const ctxSalas = document.getElementById('chart-mortalidad-salas');
    if (ctxSalas) {
      this._chartInstances.salas = new Chart(ctxSalas, {
        type: 'bar',
        data: {
          labels: salas.labels,
          datasets: [{
            label: 'Total',
            data: salas.values,
            backgroundColor: '#3b82f6',
            hoverBackgroundColor: '#2563eb',
            borderRadius: 4,
            barPercentage: 0.65
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: items => `Sala ${items[0].label}`,
                label: ctx => ` Lechones: ${Format ? Format.formatNumber(ctx.raw, 0) : ctx.raw}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'CANTIDAD',
                font: { weight: 'bold', size: 11 },
                color: '#64748b'
              },
              grid: { color: 'rgba(0,0,0,0.06)' }
            },
            x: {
              title: {
                display: true,
                text: 'SALAS',
                font: { weight: 'bold', size: 11 },
                color: '#64748b'
              },
              grid: { display: false }
            }
          }
        }
      });
    }

    // Tabla de Datos integrada al pie del gráfico de Salas
    const tableWrapperSalas = document.getElementById('table-wrapper-salas');
    if (tableWrapperSalas) {
      if (!salas.labels || salas.labels.length === 0) {
        tableWrapperSalas.innerHTML = `
          <div style="margin-top: 0.75rem; padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.82rem; background: #f8fafc; border: 1px dashed var(--border-color); border-radius: 4px;">
            No se registraron mortalidades por salas en la fecha seleccionada.
          </div>
        `;
      } else {
        tableWrapperSalas.innerHTML = `
          <div class="table-responsive" style="margin-top: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px;">
            <table class="table table-bordered table-sm mortalidad-grid-table" style="margin-bottom: 0; text-align: center; font-size: 0.8rem; width: 100%;">
              <thead>
                <tr style="background-color: #f1f5f9; color: var(--text-main);">
                  <th style="width: 90px; text-align: left; padding: 5px 8px; font-weight: 700; background: #e2e8f0;">SALAS</th>
                  ${salas.labels.map(l => `<th style="padding: 5px 8px; font-weight: 700;">${l}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: left; padding: 5px 8px; font-weight: 700; background: #f8fafc; color: #1e40af; white-space: nowrap;">
                    <span style="display: inline-block; width: 10px; height: 10px; background: #3b82f6; margin-right: 5px; border-radius: 2px;"></span>
                    Total
                  </td>
                  ${salas.values.map(v => `<td style="padding: 5px 8px; font-weight: 600;">${v}</td>`).join('')}
                </tr>
              </tbody>
            </table>
          </div>
        `;
      }
    }
  },

  /**
   * Renderiza los datos en la tabla y los controles de paginación
   */
  renderTable(queryResult) {
    const wrapper = document.getElementById('mpd-table-wrapper');
    if (!wrapper) return;

    const { items, total, filteredTotal, page, pageSize, totalPages, startIndex, endIndex, summary } = queryResult;
    const Format = window.App.Utils.Format;

    // Actualizar KPIs superiores
    const kpiTotal = document.getElementById('mpd-kpi-total');
    const kpiCantidad = document.getElementById('mpd-kpi-cantidad');
    const kpiSalas = document.getElementById('mpd-kpi-salas');
    const kpiMaternidades = document.getElementById('mpd-kpi-maternidades');

    if (kpiTotal) kpiTotal.textContent = Format ? Format.formatNumber(total, 0) : total;
    if (kpiCantidad) kpiCantidad.textContent = Format ? Format.formatNumber(summary.totalCantidad, 0) : summary.totalCantidad;
    if (kpiSalas) kpiSalas.textContent = Format ? Format.formatNumber(summary.distinctSalas, 0) : summary.distinctSalas;
    if (kpiMaternidades) kpiMaternidades.textContent = Format ? Format.formatNumber(summary.distinctMaternidades, 0) : summary.distinctMaternidades;

    if (!items || items.length === 0) {
      wrapper.innerHTML = `
        <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-secondary); margin-bottom: 0.75rem;">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <h4 style="font-size: 1.05rem; margin-bottom: 0.25rem;">No se encontraron registros</h4>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary);">
            Prueba ajustando los filtros o el término de búsqueda inteligente.
          </p>
        </div>
      `;
      return;
    }

    // Filas de la tabla con orden y formato limpio
    const rowsHtml = items.map((r, i) => {
      const formattedPeso = r.peso !== null && r.peso !== undefined && r.peso !== ''
        ? (Format ? Format.formatNumber(r.peso, 2) : r.peso)
        : '<span style="color: var(--color-text-secondary);">-</span>';

      const turnoFormatted = r.turno ? (String(r.turno).startsWith('T') ? r.turno : `T${r.turno}`) : '-';

      const granjaBadge = r.granja === 'EXP'
        ? '<span class="badge" style="background: #fef3c7; color: #d97706; font-weight: 600;">EXP</span>'
        : '<span class="badge" style="background: #e0f2fe; color: #0284c7; font-weight: 600;">EST</span>';

      const zonaBadge = r.zona === 'X'
        ? '<span class="badge" style="background: #faf5ff; color: #7c3aed; font-weight: 700; width: 26px; display: inline-block; text-align: center;">X</span>'
        : '<span class="badge" style="background: #eff6ff; color: #2563eb; font-weight: 700; width: 26px; display: inline-block; text-align: center;">E</span>';

      const matBadge = `<span class="badge" style="background: #f0fdf4; color: #166534; font-weight: 600;">${r.maternidad || '-'}</span>`;

      return `
        <tr>
          <td title="Vuelta ${r.vuelta} - PIC ${r.pic}"><strong>${r.pic}</strong></td>
          <td style="font-weight: 600; color: #047857;">${r.cantidad}</td>
          <td>${r.causa}</td>
          <td>${formattedPeso}</td>
          <td style="font-weight: 600; color: #4338ca;">${turnoFormatted}</td>
          <td style="font-weight: 600; text-align: center;">${r.sala}</td>
          <td>${r.semana}</td>
          <td><code style="font-size: 0.85rem; font-weight: 600;">${r.nota}</code></td>
          <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${r.observacion || ''}">
            ${r.observacion || '<span style="color: var(--color-text-secondary);">-</span>'}
          </td>
          <td>${granjaBadge}</td>
          <td style="text-align: center;">${zonaBadge}</td>
          <td>${matBadge}</td>
        </tr>
      `;
    }).join('');

    // Paginación visual inteligente
    const paginationHtml = this.generatePaginationHtml(page, totalPages, startIndex, endIndex, filteredTotal, total);

    wrapper.innerHTML = `
      <div class="table-responsive" style="max-height: 580px; overflow-y: auto; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
        <table class="table" style="margin-bottom: 0;">
          <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 2; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            <tr>
              <th style="width: 70px;" title="Fecha PIC (Vuelta usada internamente para fecha calendario)">Pic</th>
              <th style="width: 85px;">Cantidad</th>
              <th style="width: 75px;">Causa</th>
              <th style="width: 85px;">Peso</th>
              <th style="width: 75px;">Turno</th>
              <th style="width: 75px; text-align: center;">Sala</th>
              <th style="width: 80px;">Semana</th>
              <th style="width: 85px;">Nota</th>
              <th>Observación</th>
              <th style="width: 85px;">Granja</th>
              <th style="width: 75px; text-align: center;">Zona</th>
              <th style="width: 95px;">Maternidad</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <!-- BARRA DE PAGINACIÓN -->
      ${paginationHtml}
    `;
  },

  /**
   * Genera el HTML de la barra de paginación con elipsis
   */
  generatePaginationHtml(currentPage, totalPages, startIndex, endIndex, filteredTotal, total) {
    const Format = window.App.Utils.Format;
    const fmtStartIndex = Format ? Format.formatNumber(startIndex, 0) : startIndex;
    const fmtEndIndex = Format ? Format.formatNumber(endIndex, 0) : endIndex;
    const fmtFiltered = Format ? Format.formatNumber(filteredTotal, 0) : filteredTotal;
    const fmtTotal = Format ? Format.formatNumber(total, 0) : total;

    let pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    const pageButtons = pages.map(p => {
      if (p === '...') {
        return `<span class="pagination-ellipsis" style="padding: 0 6px; color: var(--color-text-secondary); font-size: 0.85rem;">...</span>`;
      }
      const isActive = p === currentPage ? 'active' : '';
      return `
        <button type="button" class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'} mpd-page-btn" data-page="${p}" style="min-width: 32px; height: 32px; padding: 0 8px; font-size: 0.82rem;">
          ${p}
        </button>
      `;
    }).join('');

    return `
      <div class="mpd-pagination-container" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--color-border);">
        <div style="font-size: 0.83rem; color: var(--color-text-secondary);">
          Mostrando del <strong style="color: var(--color-text);">${fmtStartIndex}</strong> al <strong style="color: var(--color-text);">${fmtEndIndex}</strong> de <strong style="color: var(--color-text);">${fmtFiltered}</strong> registros
          ${filteredTotal !== total ? ` <span style="color: var(--color-primary); font-size: 0.78rem;">(filtrados de ${fmtTotal} totales)</span>` : ''}
        </div>

        <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary btn-sm mpd-page-btn" data-page="1" ${currentPage === 1 ? 'disabled' : ''} title="Primera página" style="height: 32px; padding: 0 8px;">
            «
          </button>
          <button type="button" class="btn btn-secondary btn-sm mpd-page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} title="Página anterior" style="height: 32px; padding: 0 8px;">
            ‹
          </button>

          ${pageButtons}

          <button type="button" class="btn btn-secondary btn-sm mpd-page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} title="Página siguiente" style="height: 32px; padding: 0 8px;">
            ›
          </button>
          <button type="button" class="btn btn-secondary btn-sm mpd-page-btn" data-page="${totalPages}" ${currentPage === totalPages ? 'disabled' : ''} title="Última página" style="height: 32px; padding: 0 8px;">
            »
          </button>

          <div style="display: flex; align-items: center; gap: 4px; margin-left: 8px;">
            <span style="font-size: 0.78rem; color: var(--color-text-secondary);">Ir:</span>
            <input type="number" id="mpd-jump-page" min="1" max="${totalPages}" value="${currentPage}" style="width: 55px; height: 32px; padding: 2px 6px; font-size: 0.8rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); text-align: center;" />
            <button type="button" class="btn btn-secondary btn-sm" id="btn-mpd-jump-page" style="height: 32px; padding: 0 8px; font-size: 0.78rem;">Ir</button>
          </div>
        </div>
      </div>
    `;
  }
};
