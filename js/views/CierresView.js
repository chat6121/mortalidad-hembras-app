/**
 * CierresView: Vista para el módulo Cierre de Salas.
 * Presenta submenú / pestañas ("Tabla Cierres" y "Gráficos"),
 * buscador inteligente, grupo sincronizado de Vuelta, PIC Cierre y Fecha Calendario,
 * tabla con las 14 columnas exactas y analítica gráfica zootécnica con Chart.js.
 */
window.App = window.App || {};
window.App.Views = window.App.Views || {};

window.App.Views.Cierres = {
  container: document.getElementById('view-cierres'),
  _chartInstances: {},

  /**
   * Renderiza el cascarón estructural completo
   */
  renderSkeleton(filterOptions = { salas: [], maternidades: [], picsCierre: [], vueltas: [] }) {
    if (!this.container) {
      this.container = document.getElementById('view-cierres');
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

    const maternidadesHtml = filterOptions.maternidades
      .map(m => `<option value="${m}">${m}</option>`)
      .join('');

    this.container.innerHTML = `
      <!-- SUBMENÚ / PESTAÑAS DE NAVEGACIÓN INTERNA CIERRES -->
      <div class="mpd-tabs-nav" id="cierres-tabs-nav">
        <button type="button" class="mpd-tab-btn active" data-tab="table" id="tab-cierres-table">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          <span>Tabla Cierres</span>
        </button>

        <button type="button" class="mpd-tab-btn" data-tab="charts" id="tab-cierres-charts">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span>Gráficos</span>
        </button>
      </div>

      <!-- ==============================================
           SUBVISTA 1: TABLA CIERRES DE SALA
           ============================================== -->
      <div id="cierres-subview-table" class="mpd-subview-panel">
        <!-- CARDS KPI DE RESUMEN ZOOTÉCNICO -->
        <div class="stats-grid" id="cierres-stats-grid">
          <div class="stat-card grad-indigo">
            <div class="stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <div>
              <div class="stat-value" id="cierres-kpi-partos">0</div>
              <div class="stat-label">Partos Totales</div>
            </div>
          </div>

          <div class="stat-card grad-emerald">
            <div class="stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div>
              <div class="stat-value" id="cierres-kpi-lnv">0</div>
              <div class="stat-label">Nacidos Vivos (LNV)</div>
            </div>
          </div>

          <div class="stat-card grad-amber">
            <div class="stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <div class="stat-value" id="cierres-kpi-mpd">0</div>
              <div class="stat-label">Lechones MPD</div>
            </div>
          </div>

          <div class="stat-card grad-blue">
            <div class="stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <div>
              <div class="stat-value" id="cierres-kpi-pct-mpd">0%</div>
              <div class="stat-label">% MPD Promedio</div>
            </div>
          </div>
        </div>

        <!-- CONTENEDOR PRINCIPAL DE LA TABLA Y HERRAMIENTAS -->
        <div class="card">
          <div class="card-header" style="flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h3 class="card-title">Cierre de Salas</h3>
              <p class="card-subtitle" style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 2px;">
                Balance zootécnico por lote y sala (Partos, LNV, LNM, Momias, Mortalidad MPD y Peso).
              </p>
            </div>

            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <input type="file" id="cierres-file-input" accept=".xlsm,.xlsx,.xls" style="display: none;" />
              <button type="button" class="btn btn-secondary btn-sm" id="btn-cierres-import" title="Importar archivo Excel .xlsm o .xlsx">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span>Importar Excel</span>
              </button>

              <button type="button" class="btn btn-secondary btn-sm" id="btn-cierres-reload-seed" title="Recargar datos originales del archivo INFORMACION SAP.xlsm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                <span>Restaurar Base</span>
              </button>

              <button type="button" class="btn btn-secondary btn-sm" id="btn-cierres-export-csv" title="Exportar registros filtrados a CSV">
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
                  <input type="text" id="cierres-search-input" class="mpd-input mpd-input-search" placeholder="Buscador inteligente (cualquier campo)..." autocomplete="off" />
                </div>
              </div>

              <!-- CONTROL UNIFICADO: FECHA PIC CON CALENDARIO INTEGRADO Y FECHA HUMANA -->
              <div class="pic-date-control" title="Filtro de Fecha PIC (Vuelta-PIC) con selector de calendario">
                <label class="filter-field-label" title="Formato: Vuelta-PIC (Ej: 20-132 o 19-786)">FECHA PIC</label>
                <div class="pic-input-wrapper">
                  <input type="text" id="cierres-filter-vueltapic" class="form-control pic-input-field" placeholder="Ej: 20-132" value="${currentVuelta}-" autocomplete="off" />
                  <div class="btn-pic-calendar-wrapper" title="Seleccionar fecha en calendario">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input type="date" id="cierres-filter-date" class="pic-hidden-datepicker" tabindex="-1" />
                  </div>
                </div>
                <div class="pic-date-caption" id="cierres-filter-date-caption"></div>
              </div>

              <div class="mpd-filter-item mpd-filter-sala">
                <label class="filter-field-label">Sala</label>
                <select id="cierres-filter-sala" class="mpd-input mpd-select" title="Filtrar por Sala">
                  <option value="">Todas</option>
                  ${salasHtml}
                </select>
              </div>

              <div class="mpd-filter-item" style="min-width: 125px;">
                <label class="filter-field-label">Estado</label>
                <select id="cierres-filter-estado" class="mpd-input mpd-select" title="Filtrar por Estado">
                  <option value="">Todos</option>
                  <option value="Pre-Parto">Pre-Parto</option>
                  <option value="Cerrada">Cerrada</option>
                </select>
              </div>

              <div class="mpd-filter-item" style="min-width: 120px;">
                <label class="filter-field-label">Maternidad</label>
                <select id="cierres-filter-maternidad" class="mpd-input mpd-select" title="Filtrar por Maternidad">
                  <option value="">Todas</option>
                  ${maternidadesHtml}
                </select>
              </div>

              <button type="button" class="btn btn-secondary mpd-btn-clear" id="btn-cierres-clear-filters" title="Limpiar todos los filtros">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                <span>Limpiar</span>
              </button>

              <div class="mpd-filter-rows">
                <label class="filter-field-label" for="cierres-page-size">Filas</label>
                <select id="cierres-page-size" class="mpd-input mpd-select mpd-select-sm">
                  <option value="25">25</option>
                  <option value="50" selected>50</option>
                  <option value="100">100</option>
                  <option value="250">250</option>
                </select>
              </div>
            </div>

            <!-- TABLA Y PAGINACIÓN -->
            <div id="cierres-table-wrapper" style="margin-top: 1rem;"></div>
          </div>
        </div>
      </div>

      <!-- ==============================================
           SUBVISTA 2: GRÁFICOS CIERRES DE SALA
           ============================================== -->
      <div id="cierres-subview-charts" class="mpd-subview-panel" style="display: none;">
        <!-- BARRA SUPERIOR: FECHA PIC INTEGRADA CON CALENDARIO Y FECHA HUMANA -->
        <div class="mpd-charts-header-bar">
          <div class="pic-date-control" title="Consultar gráficos por Fecha PIC (Vuelta-PIC)">
            <label class="filter-field-label" title="Formato: Vuelta-PIC (Ej: 20-132 o 19-786)">FECHA PIC</label>
            <div class="pic-input-wrapper">
              <input type="text" id="cierres-charts-vueltapic" class="form-control pic-input-field" placeholder="Ej: 20-132" value="${currentVuelta}-${currentPic}" autocomplete="off" />
              <div class="btn-pic-calendar-wrapper" title="Seleccionar fecha en calendario">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <input type="date" id="cierres-charts-date" class="pic-hidden-datepicker" value="${currentIsoDate}" tabindex="-1" />
              </div>
            </div>
            <div class="pic-date-caption" id="cierres-charts-date-caption">${currentHumanDate}</div>
          </div>
        </div>

        <div class="mortalidad-charts-stack">
          <!-- 1. GRÁFICO: PRODUCCIÓN POR SALAS (PARTOS Y LECHONES NACIDOS VIVOS LNV) -->
          <div class="card mortalidad-card">
            <div class="mortalidad-card-header">
              <h3 class="mortalidad-title">PRODUCCIÓN POR SALA (PARTOS Y LECHONES NACIDOS VIVOS)</h3>
            </div>
            <div class="card-body" style="padding: 1.25rem;">
              <div class="mortalidad-chart-canvas-box" style="height: 270px;">
                <canvas id="chart-cierres-produccion-salas"></canvas>
              </div>
            </div>
          </div>

          <!-- 2. GRÁFICO Y RESUMEN: DISTRIBUCIÓN DE NACIMIENTOS Y RENDIMIENTO POR MATERNIDAD -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
            <!-- DISTRIBUCIÓN DE NACIMIENTOS -->
            <div class="card mortalidad-card">
              <div class="mortalidad-card-header">
                <h3 class="mortalidad-title">DISTRIBUCIÓN DE NACIMIENTOS Y RENDIMIENTO</h3>
              </div>
              <div class="card-body" style="padding: 1.25rem;">
                <div class="mortalidad-chart-canvas-box" style="height: 260px;">
                  <canvas id="chart-cierres-distribution"></canvas>
                </div>
              </div>
            </div>

            <!-- TABLA POR MATERNIDAD -->
            <div class="card mortalidad-card">
              <div class="mortalidad-card-header">
                <h3 class="mortalidad-title">BALANCE Y EFICIENCIA POR MATERNIDAD</h3>
              </div>
              <div class="card-body" style="padding: 1rem;">
                <div id="table-wrapper-cierres-maternidades" class="table-responsive"></div>
              </div>
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
    const tabTable = document.getElementById('tab-cierres-table');
    const tabCharts = document.getElementById('tab-cierres-charts');
    const panelTable = document.getElementById('cierres-subview-table');
    const panelCharts = document.getElementById('cierres-subview-charts');

    if (tabTable) tabTable.classList.toggle('active', isTable);
    if (tabCharts) tabCharts.classList.toggle('active', !isTable);

    if (panelTable) panelTable.style.display = isTable ? 'block' : 'none';
    if (panelCharts) panelCharts.style.display = !isTable ? 'block' : 'none';
  },

  /**
   * Renderiza los gráficos analíticos de Cierre de Salas
   */
  renderCharts(chartData) {
    if (typeof Chart === 'undefined') {
      console.warn('Librería Chart.js no encontrada.');
      return;
    }

    const Format = window.App.Utils.Format;
    const { selectedPic, selectedVuelta, isoDate, kpis, produccionSalas, distributionChart, maternidades } = chartData;

    // Sincronizar inputs de la barra de gráficos
    const chartsVpInput = document.getElementById('cierres-charts-vueltapic');
    const chartsDateInput = document.getElementById('cierres-charts-date');

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
      Format.updateDateCaption('cierres-charts-date-caption', isoDate || chartsVpInput?.value);
    }

    // Destruir instancias previas
    Object.keys(this._chartInstances).forEach(key => {
      if (this._chartInstances[key]) {
        this._chartInstances[key].destroy();
      }
    });
    this._chartInstances = {};

    // 1. GRÁFICO: PRODUCCIÓN POR SALAS (Partos y LNV)
    const ctxSalas = document.getElementById('chart-cierres-produccion-salas');
    if (ctxSalas && produccionSalas && produccionSalas.labels && produccionSalas.labels.length > 0) {
      this._chartInstances.produccionSalas = new Chart(ctxSalas, {
        type: 'bar',
        data: {
          labels: produccionSalas.labels,
          datasets: [
            {
              label: 'Nacidos Vivos (LNV)',
              data: produccionSalas.lnv,
              backgroundColor: '#10b981',
              hoverBackgroundColor: '#059669',
              borderRadius: 4,
              barPercentage: 0.7
            },
            {
              label: 'Partos',
              data: produccionSalas.partos,
              backgroundColor: '#6366f1',
              hoverBackgroundColor: '#4f46e5',
              borderRadius: 4,
              barPercentage: 0.7
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } }
            },
            tooltip: {
              callbacks: {
                title: items => items[0].label,
                label: ctx => ` ${ctx.dataset.label}: ${Format ? Format.formatNumber(ctx.raw, 0) : ctx.raw}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.06)' }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    }

    // 2. GRÁFICO: DISTRIBUCIÓN DE NACIMIENTOS (Doughnut / Pie)
    const ctxDist = document.getElementById('chart-cierres-distribution');
    if (ctxDist) {
      this._chartInstances.distribution = new Chart(ctxDist, {
        type: 'doughnut',
        data: {
          labels: distributionChart.labels,
          datasets: [{
            data: distributionChart.data,
            backgroundColor: ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444'],
            hoverOffset: 6
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
                label: ctx => ` ${ctx.label}: ${Format ? Format.formatNumber(ctx.raw, 0) : ctx.raw} lechones`
              }
            }
          }
        }
      });
    }

    // 3. TABLA COMPARATIVA POR MATERNIDAD
    const tableWrapperMat = document.getElementById('table-wrapper-cierres-maternidades');
    if (tableWrapperMat) {
      if (!maternidades || maternidades.length === 0) {
        tableWrapperMat.innerHTML = `<p style="font-size: 0.85rem; color: var(--color-text-secondary); text-align: center;">Sin registros para esta consulta.</p>`;
      } else {
        const rowsHtml = maternidades.map(m => `
          <tr>
            <td style="font-weight: 700;"><span class="badge" style="background: #e0e7ff; color: #3730a3;">${m.maternidad}</span></td>
            <td style="text-align: right;">${Format ? Format.formatNumber(m.partos, 0) : m.partos}</td>
            <td style="text-align: right; font-weight: 600; color: #047857;">${Format ? Format.formatNumber(m.lnv, 0) : m.lnv}</td>
            <td style="text-align: right; color: #d97706;">${Format ? Format.formatNumber(m.lnm, 0) : m.lnm}</td>
            <td style="text-align: right; color: #7c3aed;">${Format ? Format.formatNumber(m.lnMom, 0) : m.lnMom}</td>
            <td style="text-align: right; font-weight: 600; color: #dc2626;">${Format ? Format.formatNumber(m.mpd, 0) : m.mpd}</td>
            <td style="text-align: right; font-weight: 700; color: #b91c1c;">${Format ? Format.formatNumber(m.pctMpd, 2) : m.pctMpd.toFixed(2)}%</td>
          </tr>
        `).join('');

        tableWrapperMat.innerHTML = `
          <table class="table table-sm" style="margin-bottom: 0; font-size: 0.82rem;">
            <thead>
              <tr style="background: #f8fafc;">
                <th>Maternidad</th>
                <th style="text-align: right;">Partos</th>
                <th style="text-align: right;">LNV</th>
                <th style="text-align: right;">LNM</th>
                <th style="text-align: right;">Momias</th>
                <th style="text-align: right;">MPD</th>
                <th style="text-align: right;">% MPD</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        `;
      }
    }
  },

  /**
   * Renderiza los datos en la tabla de Cierres de Sala
   * Estructura exacta con 14 columnas:
   * VIni, Pic Inicio, Vcie, Pic Cierre, Sala, Vlote, LotePic, Partos, LNV, LNM, LNMom, MPD, Peso X, Maternidad
   */
  renderTable(queryResult, currentSortBy = 'lote', currentSortDir = 'desc') {
    const wrapper = document.getElementById('cierres-table-wrapper');
    if (!wrapper) return;

    const { items, total, filteredTotal, page, pageSize, totalPages, startIndex, endIndex, summary } = queryResult;
    const Format = window.App.Utils.Format;

    const getSortClass = (col) => {
      if (col === 'lote' && (currentSortBy === 'lote' || currentSortBy === 'vlote' || currentSortBy === 'lotePic')) {
        return currentSortDir === 'desc' ? 'sort-desc' : 'sort-asc';
      }
      if (currentSortBy === col) {
        return currentSortDir === 'desc' ? 'sort-desc' : 'sort-asc';
      }
      return '';
    };

    // Actualizar KPIs superiores
    const kpiPartos = document.getElementById('cierres-kpi-partos');
    const kpiLnv = document.getElementById('cierres-kpi-lnv');
    const kpiMpd = document.getElementById('cierres-kpi-mpd');
    const kpiPctMpd = document.getElementById('cierres-kpi-pct-mpd');

    if (kpiPartos) kpiPartos.textContent = Format ? Format.formatNumber(summary.totalPartos, 0) : summary.totalPartos;
    if (kpiLnv) kpiLnv.textContent = Format ? Format.formatNumber(summary.totalLnv, 0) : summary.totalLnv;
    if (kpiMpd) kpiMpd.textContent = Format ? Format.formatNumber(summary.totalMpd, 0) : summary.totalMpd;
    if (kpiPctMpd) kpiPctMpd.textContent = `${Format ? Format.formatNumber(summary.pctMpd, 2) : summary.pctMpd.toFixed(2)}%`;

    if (!items || items.length === 0) {
      wrapper.innerHTML = `
        <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-secondary); margin-bottom: 0.75rem;">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <h4 style="font-size: 1.05rem; margin-bottom: 0.25rem;">No se encontraron registros de cierre</h4>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary);">
            Prueba ajustando los filtros de Vuelta, PIC Cierre, Sala o el término de búsqueda inteligente.
          </p>
        </div>
      `;
      return;
    }

    // Filas con los 16 campos exactos en formato compacto de alta visibilidad
    const rowsHtml = items.map((r, i) => {
      const rawLoteStr = r.lotePic !== null && r.lotePic !== undefined ? String(r.lotePic).trim().toUpperCase() : '';
      const isPreParto = r.estado === 'Pre-Parto' || rawLoteStr === 'PRE' || rawLoteStr === 'PP' || String(r.picCierre || '').trim().toUpperCase() === 'PRE';
      const estadoBadge = isPreParto
        ? '<span class="badge" style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-weight: 700; padding: 2px 7px; border-radius: 9999px; font-size: 0.74rem;">Pre-Parto</span>'
        : '<span class="badge" style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-weight: 700; padding: 2px 7px; border-radius: 9999px; font-size: 0.74rem;">Cerrada</span>';

      const viniDisplay = r.vini ? `<span class="badge badge-compact" style="background: rgba(99,102,241,0.08); color: #4f46e5; font-weight: 700;">${r.vini}</span>` : '<span style="color: var(--color-text-secondary);">-</span>';
      const picIniDisplay = (r.picInicio !== null && r.picInicio !== undefined && r.picInicio !== '' && r.picInicio > 0) ? r.picInicio : (r.picInicio === 0 ? '0' : '<span style="color: var(--color-text-secondary);">-</span>');
      const vcieDisplay = r.vcie ? `<span class="badge badge-compact" style="background: rgba(14,165,233,0.1); color: #0369a1; font-weight: 700;">${r.vcie}</span>` : '<span style="color: var(--color-text-secondary);">-</span>';
      const picCieDisplay = (r.picCierre !== null && r.picCierre !== undefined && r.picCierre !== '' && r.picCierre > 0) ? `<strong style="color: #0369a1;">${r.picCierre}</strong>` : (r.picCierre === 0 ? '<strong style="color: #0369a1;">0</strong>' : '<span style="color: var(--color-text-secondary);">-</span>');
      const vloteDisplay = r.vlote ? `<span class="badge badge-compact" style="background: #f1f5f9; color: #475569; font-weight: 700;">${r.vlote}</span>` : (isPreParto ? '<span style="color: var(--color-text-secondary);">-</span>' : '<span class="badge badge-compact" style="background: #f1f5f9; color: #475569; font-weight: 700;">0</span>');
      const lotePicDisplay = isPreParto
        ? '<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #b45309; font-weight: 700; font-size: 0.78rem;">PRE</span>'
        : `<code style="font-size: 0.78rem; font-weight: 700; color: var(--primary);">${r.lotePic !== null && r.lotePic !== undefined ? r.lotePic : '-'}</code>`;

      const formattedPeso = r.pesoX !== null && r.pesoX !== undefined && r.pesoX !== '' && Number(r.pesoX) > 0
        ? (Format ? Format.formatNumber(r.pesoX, 2) : r.pesoX)
        : '<span style="color: var(--color-text-secondary);">-</span>';

      return `
        <tr style="${isPreParto ? 'background: rgba(254, 243, 199, 0.18);' : ''}">
          <td style="text-align: center; font-weight: 600;" title="VIni: ${r.vini || '-'}">${picIniDisplay}</td>
          <td style="text-align: center;" title="Vcie: ${r.vcie || '-'}">${picCieDisplay}</td>
          <td style="font-weight: 700; text-align: center;">${r.sala}</td>
          <td style="text-align: center;" title="Vlote: ${r.vlote || '-'}">${lotePicDisplay}</td>
          <td style="font-weight: 600; text-align: right;">${r.partos}</td>
          <td style="font-weight: 700; color: #047857; text-align: right;">${Format ? Format.formatNumber(r.lnv, 0) : r.lnv}</td>
          <td style="color: #d97706; text-align: right;">${r.lnm}</td>
          <td style="color: #7c3aed; text-align: right;">${r.lnMom}</td>
          <td style="font-weight: 700; color: #dc2626; text-align: right;">${r.mpd}</td>
          <td style="text-align: right; font-weight: 600; color: #334155;" title="${r.pesoX || 0} kg">${formattedPeso}</td>
          <td style="text-align: center;"><span class="badge badge-compact" style="background: #fef3c7; color: #92400e; font-weight: 700;">${r.maternidad || '-'}</span></td>
          <td style="text-align: center;">${estadoBadge}</td>
          <td style="text-align: center;"><span class="badge" style="background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid rgba(16, 185, 129, 0.2); font-weight: 700; padding: 2px 7px; border-radius: 9999px; font-size: 0.74rem;">${r.estatus || 'Activa'}</span></td>
        </tr>
      `;
    }).join('');

    const paginationHtml = this.generatePaginationHtml(page, totalPages, startIndex, endIndex, filteredTotal, total);

    wrapper.innerHTML = `
      <div class="table-responsive" style="max-height: 580px; overflow-y: auto; overflow-x: auto; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
        <table class="table table-compact" id="table-cierres" style="margin-bottom: 0;">
          <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 2; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            <tr>
              <th class="th-sortable text-center ${getSortClass('picInicio')}" data-sort="picInicio" style="width: 68px; text-align: center;" title="PIC Inicio (VIni usado internamente para orden y fechas)">Pic Inicio</th>
              <th class="th-sortable text-center ${getSortClass('picCierre')}" data-sort="picCierre" style="width: 68px; text-align: center;" title="PIC Cierre (Vcie usado internamente para filtro y fechas)">Pic Cierre</th>
              <th class="th-sortable text-center ${getSortClass('sala')}" data-sort="sala" style="width: 52px; text-align: center;" title="Número de Sala">Sala</th>
              <th class="th-sortable text-center ${getSortClass('lote')}" data-sort="lote" style="width: 72px; text-align: center;" title="PIC de Lote (ordenar cronológicamente con Vlote interno)">LotePic</th>
              <th class="th-sortable text-right ${getSortClass('partos')}" data-sort="partos" style="width: 52px; text-align: right;" title="Partos">Partos</th>
              <th class="th-sortable text-right ${getSortClass('lnv')}" data-sort="lnv" style="width: 56px; text-align: right;" title="Lechones Nacidos Vivos">LNV</th>
              <th class="th-sortable text-right ${getSortClass('lnm')}" data-sort="lnm" style="width: 50px; text-align: right;" title="Lechones Nacidos Muertos">LNM</th>
              <th class="th-sortable text-right ${getSortClass('lnMom')}" data-sort="lnMom" style="width: 54px; text-align: right;" title="Momias">LNMom</th>
              <th class="th-sortable text-right ${getSortClass('mpd')}" data-sort="mpd" style="width: 50px; text-align: right;" title="Mortalidad Pre-Destete">MPD</th>
              <th class="th-sortable text-right ${getSortClass('pesoX')}" data-sort="pesoX" style="width: 62px; text-align: right;" title="Peso Promedio (kg)">Peso X</th>
              <th class="th-sortable text-center ${getSortClass('maternidad')}" data-sort="maternidad" style="width: 65px; text-align: center;" title="Maternidad">Maternidad</th>
              <th class="th-sortable text-center ${getSortClass('estado')}" data-sort="estado" style="width: 82px; text-align: center;" title="Estado de la Sala: Pre-Parto o Cerrada">Estado</th>
              <th class="th-sortable text-center ${getSortClass('estatus')}" data-sort="estatus" style="width: 75px; text-align: center;" title="Estatus del registro: Activa">Estatus</th>
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
   * Genera el HTML de la barra de paginación
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
        <button type="button" class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'} cierres-page-btn" data-page="${p}" style="min-width: 32px; height: 32px; padding: 0 8px; font-size: 0.82rem;">
          ${p}
        </button>
      `;
    }).join('');

    return `
      <div class="mpd-pagination-container" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--color-border);">
        <div style="font-size: 0.83rem; color: var(--color-text-secondary);">
          Mostrando del <strong style="color: var(--color-text);">${fmtStartIndex}</strong> al <strong style="color: var(--color-text);">${fmtEndIndex}</strong> de <strong style="color: var(--color-text);">${fmtFiltered}</strong> cierres
          ${filteredTotal !== total ? ` <span style="color: var(--color-primary); font-size: 0.78rem;">(filtrados de ${fmtTotal} totales)</span>` : ''}
        </div>

        <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary btn-sm cierres-page-btn" data-page="1" ${currentPage === 1 ? 'disabled' : ''} title="Primera página" style="height: 32px; padding: 0 8px;">
            «
          </button>
          <button type="button" class="btn btn-secondary btn-sm cierres-page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} title="Página anterior" style="height: 32px; padding: 0 8px;">
            ‹
          </button>

          ${pageButtons}

          <button type="button" class="btn btn-secondary btn-sm cierres-page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} title="Página siguiente" style="height: 32px; padding: 0 8px;">
            ›
          </button>
          <button type="button" class="btn btn-secondary btn-sm cierres-page-btn" data-page="${totalPages}" ${currentPage === totalPages ? 'disabled' : ''} title="Última página" style="height: 32px; padding: 0 8px;">
            »
          </button>

          <div style="display: flex; align-items: center; gap: 4px; margin-left: 8px;">
            <span style="font-size: 0.78rem; color: var(--color-text-secondary);">Ir:</span>
            <input type="number" id="cierres-jump-page" min="1" max="${totalPages}" value="${currentPage}" style="width: 55px; height: 32px; padding: 2px 6px; font-size: 0.8rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); text-align: center;" />
            <button type="button" class="btn btn-secondary btn-sm" id="btn-cierres-jump-page" style="height: 32px; padding: 0 8px; font-size: 0.78rem;">Ir</button>
          </div>
        </div>
      </div>
    `;
  }
};

