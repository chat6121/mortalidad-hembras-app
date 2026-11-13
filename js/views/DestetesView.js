/**
 * DestetesView: Vista completa para el Módulo de Destetes.
 * Proporciona submenú dual ("Tabla Destetes" y "Gráficos"), KPIs zootécnicos,
 * barra de filtros sincronizada tridimensional (Vuelta Fin, PIC Fin y Fecha Calendario),
 * filtros por Granja, Maternidad y Sala, buscador inteligente debounced,
 * tabla compacta de alta densidad de 20 columnas con badges estilizados,
 * modal interactivo de creación/edición con autocompletado y analítica gráfica con Chart.js.
 */
window.App = window.App || {};
window.App.Views = window.App.Views || {};

window.App.Views.Destetes = {
  container: document.getElementById('view-destetes'),
  _chartInstances: {},

  /**
   * Renderiza el cascarón estructural completo del módulo
   */
  renderSkeleton(filterOptions = { granjas: [], maternidades: [], salas: [], vueltas: [], pics: [] }) {
    if (!this.container) {
      this.container = document.getElementById('view-destetes');
    }
    if (!this.container) return;

    const Format = window.App.Utils.Format;
    const currentInfo = Format ? Format.getPicInfo(new Date()) : { vuelta: 20, pic: 131 };
    const currentVuelta = currentInfo.vuelta;
    const currentPic = currentInfo.pic;
    const currentIsoDate = Format && Format.formatDateISO ? Format.formatDateISO(new Date()) : new Date().toISOString().slice(0, 10);
    const currentHumanDate = Format && Format.formatDateHuman ? Format.formatDateHuman(new Date()) : '';

    const granjasHtml = (filterOptions.granjas || ['EST', 'EXP'])
      .map(g => `<option value="${g}">${g}</option>`)
      .join('');

    const maternidadesHtml = (filterOptions.maternidades || ['M1', 'M2', 'M3', 'M4', 'M5'])
      .map(m => `<option value="${m}">${m}</option>`)
      .join('');

    const salasHtml = (filterOptions.salas || [])
      .map(s => `<option value="${s}">${s}</option>`)
      .join('');

    this.container.innerHTML = `
      <!-- SUBMENÚ / PESTAÑAS DE NAVEGACIÓN INTERNA DESTETES -->
      <div class="mpd-tabs-nav" id="destetes-tabs-nav">
        <button type="button" class="mpd-tab-btn active" data-tab="table" id="tab-destetes-table">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          <span>Tabla Destetes</span>
        </button>

        <button type="button" class="mpd-tab-btn" data-tab="charts" id="tab-destetes-charts">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span>Gráficos Analíticos</span>
        </button>
      </div>

      <!-- SUBVISTA 1: TABLA DE DESTETES -->
      <div class="mpd-subview-panel active" id="destetes-table-subview">
        <!-- TARJETAS DE INDICADORES ZOOTÉCNICOS (KPIS) COMPACTAS & MODERNAS -->
        <div class="kpi-grid" id="destetes-stats-grid">
          <!-- Se llenan dinámicamente con renderKpis -->
        </div>

        <!-- BARRA INTEGRADA DE HERRAMIENTAS Y FILTROS -->
        <div class="card filter-toolbar-card">
          <div class="filter-toolbar-grid">
            
            <!-- Grupo de Filtros Izquierda -->
            <div style="display: flex; flex-wrap: wrap; gap: 0.65rem; align-items: flex-end; flex: 1;">
              
              <!-- CONTROL UNIFICADO: FECHA PIC CON CALENDARIO INTEGRADO Y FECHA HUMANA -->
              <div class="pic-date-control" title="Filtro de Fecha PIC (Vuelta-PIC) con selector de calendario">
                <label class="filter-field-label" title="Formato: Vuelta-PIC (Ej: 20-132 o 19-786)">FECHA PIC</label>
                <div class="pic-input-wrapper">
                  <input type="text" id="destetes-filter-vueltapic" class="form-control pic-input-field" placeholder="Ej: 20-132" value="${currentVuelta}-" autocomplete="off" />
                  <div class="btn-pic-calendar-wrapper" title="Seleccionar fecha en calendario">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input type="date" id="destetes-filter-date" class="pic-hidden-datepicker" tabindex="-1" />
                  </div>
                </div>
                <div class="pic-date-caption" id="destetes-filter-date-caption"></div>
              </div>

              <!-- Filtro Granja (EST / EXP) -->
              <div class="filter-field" style="width: 100px;">
                <label class="filter-field-label">Granja</label>
                <select id="destetes-filter-granja" class="form-control">
                  <option value="all">Todas</option>
                  ${granjasHtml}
                </select>
              </div>

              <!-- Filtro Maternidad (M1 - M5) -->
              <div class="filter-field" style="width: 100px;">
                <label class="filter-field-label">Maternidad</label>
                <select id="destetes-filter-maternidad" class="form-control">
                  <option value="all">Todas</option>
                  ${maternidadesHtml}
                </select>
              </div>

              <!-- Filtro Sala -->
              <div class="filter-field" style="width: 95px;">
                <label class="filter-field-label">Sala</label>
                <select id="destetes-filter-sala" class="form-control">
                  <option value="all">Todas</option>
                  ${salasHtml}
                </select>
              </div>

              <!-- Buscador con icono integrado -->
              <div class="filter-field" style="flex: 1; min-width: 180px;">
                <label class="filter-field-label">Búsqueda Rápida</label>
                <div class="search-input-wrapper">
                  <input type="text" id="destetes-search-input" class="form-control" placeholder="Buscar fecha, lote, sala..." />
                  <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
              </div>

            </div>

            <!-- Acciones Derecha (Siempre unidas) -->
            <div class="filter-actions-group">
              <button type="button" id="destetes-btn-reset-filters" class="btn btn-secondary" title="Restablecer todos los filtros">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                <span>Limpiar</span>
              </button>

              <button type="button" id="destetes-btn-export-csv" class="btn btn-outline" title="Exportar vista actual a CSV">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>CSV</span>
              </button>

              <button type="button" id="destetes-btn-new-record" class="btn btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span>Nuevo Destete</span>
              </button>
            </div>

          </div>
        </div>

        <!-- TABLA COMPACTA DE DATOS -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-responsive" style="max-height: 600px; overflow-y: auto;">
            <table class="table-compact" id="destetes-data-table">
              <thead>
                <tr>
                  <th class="th-sortable" data-sort="fecha" title="Ordenar por Fecha">Fecha</th>
                  <th class="th-sortable text-center" data-sort="fin" title="PIC Fin">Fin</th>
                  <th class="th-sortable text-center" data-sort="lotePic" title="Lote PIC">LotePic</th>
                  <th class="text-center">Granja</th>
                  <th class="text-center">Mat</th>
                  <th class="th-sortable text-center" data-sort="sala" title="Número de Sala">Sala</th>
                  <th class="th-sortable text-center" data-sort="dias" title="Días de Lactancia (Edad)">Días</th>
                  <th class="th-sortable text-right" data-sort="sitio2" title="Lechones Sitio 2 Bruto">Sitio 2</th>
                  <th class="th-sortable text-right" data-sort="recria" title="Lechones Recría">Recría</th>
                  <th class="th-sortable text-right" data-sort="eliminados" title="Eliminados / Descartes">Elim</th>
                  <th class="th-sortable text-right" data-sort="cantS2" title="Cantidad Neta Sitio 2">Cant. S2</th>
                  <th class="th-sortable text-right" data-sort="pesoXS2" title="Peso Promedio Sitio 2">Peso X S2</th>
                  <th class="th-sortable text-right" data-sort="eficS2" title="Eficiencia Sitio 2 contra curva estándar">Efic. S2</th>
                  <th class="th-sortable text-right" data-sort="pesoNS2" title="Peso Neto Total Sitio 2">Peso N S2</th>
                  <th class="th-sortable text-right" data-sort="pesoXR" title="Peso Promedio Recría">Peso X-R</th>
                  <th class="th-sortable text-right" data-sort="eficR" title="Eficiencia Recría">Efic. Rec</th>
                  <th class="th-sortable text-right" data-sort="pesoNR" title="Peso Neto Recría">Peso N-R</th>
                  <th class="text-center" style="width: 70px;">Acciones</th>
                </tr>
              </thead>
              <tbody id="destetes-table-body">
                <tr>
                  <td colspan="18" class="text-center" style="padding: 2.5rem; color: #94a3b8;">
                    Cargando registros del módulo de destetes...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- FOOTER DE PAGINACIÓN -->
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; padding: 0.75rem 1.25rem; border-top: 1px solid var(--border-color); background: #f8fafc; font-size: 0.82rem;">
            <div id="destetes-pagination-info" style="color: #64748b;">
              Mostrando 0 de 0 registros
            </div>
            
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <label style="color: #64748b; font-size: 0.78rem;">Filas:</label>
              <select id="destetes-page-size" class="form-control" style="height: 30px; font-size: 0.78rem; padding: 0.15rem 1.6rem 0.15rem 0.5rem; width: 75px;">
                <option value="25">25</option>
                <option value="50" selected>50</option>
                <option value="100">100</option>
                <option value="250">250</option>
              </select>

              <div id="destetes-pagination-buttons" style="display: flex; gap: 0.25rem; margin-left: 0.5rem;">
                <!-- Botones se generan dinámicamente -->
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SUBVISTA 2: GRÁFICOS ANALÍTICOS -->
      <div class="mpd-subview-panel" id="destetes-charts-subview">
        <!-- BARRA DE CONSULTA GRÁFICA -->
        <div class="card mb-4" style="padding: 1rem 1.25rem 1.65rem 1.25rem;">
          <div style="display: flex; flex-wrap: wrap; gap: 0.85rem; align-items: flex-end; justify-content: space-between;">
            
            <div style="display: flex; flex-wrap: wrap; gap: 0.65rem; align-items: flex-end;">
              <!-- CONTROL UNIFICADO: FECHA PIC CON CALENDARIO INTEGRADO Y FECHA HUMANA -->
              <div class="pic-date-control" title="Consultar gráficos por Fecha PIC (Vuelta-PIC)">
                <label class="filter-field-label" title="Formato: Vuelta-PIC (Ej: 20-132 o 19-786)">FECHA PIC</label>
                <div class="pic-input-wrapper">
                  <input type="text" id="destetes-chart-vueltapic" class="form-control pic-input-field" placeholder="Ej: 20-132" value="${currentVuelta}-" autocomplete="off" />
                  <div class="btn-pic-calendar-wrapper" title="Seleccionar fecha en calendario">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input type="date" id="destetes-chart-date" class="pic-hidden-datepicker" tabindex="-1" />
                  </div>
                </div>
                <div class="pic-date-caption" id="destetes-chart-date-caption"></div>
              </div>

              <button type="button" id="destetes-chart-btn-all" class="btn btn-secondary" style="height: 38px; font-size: 0.82rem; padding: 0 0.85rem;">
                Ver Acumulado Total
              </button>
            </div>

            <div style="font-size: 0.85rem; color: #64748b; font-weight: 600;" id="destetes-chart-badge-info">
              <!-- Información de contexto de consulta -->
            </div>

          </div>
        </div>

        <!-- CONTENEDOR DE GRÁFICOS (GRID 2 COLUMNAS) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem;">
          
          <!-- Gráfico 1: Destetados por Sala -->
          <div class="card" style="padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin: 0; display: flex; align-items: center; gap: 0.4rem;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;"></span>
                VOLUMEN DE LECHONES DESTETADOS POR SALA
              </h3>
              <span class="badge badge-compact" id="badge-chart-destetes-total" style="background: #e0f2fe; color: #0369a1; font-weight: 700;">0 Lechones</span>
            </div>
            <div style="height: 280px; position: relative;">
              <canvas id="chart-destetes-salas"></canvas>
            </div>
            <div id="table-destetes-salas-wrapper" style="margin-top: 1rem; max-height: 180px; overflow-y: auto;">
              <!-- Tabla de datos integrada al pie -->
            </div>
          </div>

          <!-- Gráfico 2: Eficiencia Zootécnica y Peso vs Curva Estándar -->
          <div class="card" style="padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin: 0; display: flex; align-items: center; gap: 0.4rem;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
                PESO PROMEDIO REAL VS CURVA ESTÁNDAR
              </h3>
              <span class="badge badge-compact" id="badge-chart-efic-total" style="background: #ecfdf5; color: #047857; font-weight: 700;">0% Efic</span>
            </div>
            <div style="height: 280px; position: relative;">
              <canvas id="chart-destetes-eficiencia"></canvas>
            </div>
            <div id="table-destetes-eficiencia-wrapper" style="margin-top: 1rem; max-height: 180px; overflow-y: auto;">
              <!-- Tabla de datos integrada al pie -->
            </div>
          </div>

        </div>

        <!-- Gráfico 3: Distribución por Granja y Maternidad -->
        <div class="card" style="padding: 1.25rem; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin: 0; display: flex; align-items: center; gap: 0.4rem;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #8b5cf6;"></span>
              DISTRIBUCIÓN Y BALANCE POR MATERNIDAD (M1 A M5)
            </h3>
            <span class="badge badge-compact" id="badge-chart-mat-total" style="background: #f3e8ff; color: #7e22ce; font-weight: 700;">Total Lotes</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; align-items: center;">
            <div style="height: 260px; position: relative;">
              <canvas id="chart-destetes-maternidad"></canvas>
            </div>
            <div id="table-destetes-maternidad-wrapper">
              <!-- Resumen tabular por maternidad -->
            </div>
          </div>
        </div>

      </div>

      <!-- MODAL DE NUEVO / EDICIÓN DE DESTETE -->
      <div class="modal" id="destetes-modal" style="display: none;">
        <div class="modal-dialog" style="max-width: 650px;">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title" id="destetes-modal-title">Registrar Nuevo Destete</h3>
              <button type="button" class="modal-close-btn" data-modal="destetes-modal">&times;</button>
            </div>
            <form id="destetes-modal-form">
              <input type="hidden" id="destete-form-id" />
              <div class="modal-body" style="padding: 1.25rem;">
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 0.75rem;">
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Fecha</label>
                    <input type="text" id="destete-form-fecha" class="form-control" placeholder="dd-mm-yyyy" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Vuelta Fin</label>
                    <input type="number" id="destete-form-vfin" class="form-control" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">PIC Fin</label>
                    <input type="number" id="destete-form-fin" class="form-control" required />
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 0.75rem;">
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Vuelta Lote</label>
                    <input type="number" id="destete-form-vlote" class="form-control" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Lote PIC</label>
                    <input type="number" id="destete-form-lotepic" class="form-control" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Sala</label>
                    <input type="number" id="destete-form-sala" class="form-control" min="1" max="41" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Días Lactancia</label>
                    <input type="number" id="destete-form-dias" class="form-control" min="1" max="40" required />
                  </div>
                </div>

                <!-- Autocompletado de Infraestructura -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1rem; background: #f8fafc; padding: 0.6rem 0.85rem; border-radius: 6px; border: 1px solid #e2e8f0;">
                  <div>
                    <span style="font-size: 0.7rem; color: #64748b; font-weight: 600;">GRANJA:</span>
                    <strong id="destete-preview-granja" style="margin-left: 0.35rem; color: #1e293b;">EST</strong>
                  </div>
                  <div>
                    <span style="font-size: 0.7rem; color: #64748b; font-weight: 600;">ZONA:</span>
                    <strong id="destete-preview-zona" style="margin-left: 0.35rem; color: #1e293b;">E</strong>
                  </div>
                  <div>
                    <span style="font-size: 0.7rem; color: #64748b; font-weight: 600;">MATERNIDAD:</span>
                    <strong id="destete-preview-mat" style="margin-left: 0.35rem; color: #1e293b;">M1</strong>
                  </div>
                </div>

                <div style="font-weight: 700; font-size: 0.82rem; color: #334155; margin-bottom: 0.5rem; text-transform: uppercase;">
                  Lechones y Conteos
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1rem;">
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Sitio 2 (Bruto)</label>
                    <input type="number" id="destete-form-sitio2" class="form-control" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Recría</label>
                    <input type="number" id="destete-form-recria" class="form-control" value="0" />
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Eliminados</label>
                    <input type="number" id="destete-form-eliminados" class="form-control" value="0" />
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700; color: #0284c7;">Cant. S2 (Neto)</label>
                    <input type="number" id="destete-form-cants2" class="form-control" readonly style="background: #f0f9ff; font-weight: 700; color: #0369a1;" />
                  </div>
                </div>

                <div style="font-weight: 700; font-size: 0.82rem; color: #334155; margin-bottom: 0.5rem; text-transform: uppercase;">
                  Pesos y Eficiencias
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 0.75rem;">
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Peso Neto S2 (kg)</label>
                    <input type="number" id="destete-form-pesons2" class="form-control" placeholder="Total kg" />
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Peso Prom S2 (kg)</label>
                    <input type="number" step="0.01" id="destete-form-pesoxs2" class="form-control" placeholder="kg/lechón" />
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700; color: #16a34a;">Efic. Sitio 2 (%)</label>
                    <input type="number" step="0.01" id="destete-form-efics2" class="form-control" readonly style="background: #f0fdf4; font-weight: 700; color: #15803d;" />
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Peso Neto Rec (kg)</label>
                    <input type="number" id="destete-form-pesonr" class="form-control" value="0" />
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Peso Prom Rec (kg)</label>
                    <input type="number" step="0.01" id="destete-form-pesoxr" class="form-control" value="0" />
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Efic. Recría (%)</label>
                    <input type="number" step="0.01" id="destete-form-eficr" class="form-control" readonly style="background: #f8fafc;" />
                  </div>
                </div>

              </div>
              <div class="modal-footer" style="padding: 0.75rem 1.25rem; background: #f8fafc; display: flex; justify-content: flex-end; gap: 0.5rem;">
                <button type="button" class="btn btn-secondary modal-close-btn" data-modal="destetes-modal">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="destete-form-submit-btn">Guardar Destete</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Renderiza las tarjetas de KPIs zootécnicos superiores
   */
  renderKpis(kpis) {
    const grid = document.getElementById('destetes-stats-grid');
    if (!grid || !kpis) return;

    const Format = window.App.Utils.Format;
    const fn = (val, dec = 0) => Format && Format.formatNumber ? Format.formatNumber(val, dec) : Number(val).toLocaleString('es-ES');

    // Color condicional de eficiencia
    let eficColor = '#10b981'; // verde
    let eficBg = '#ecfdf5';
    if (kpis.promedioEficS2 < 75) {
      eficColor = '#ef4444'; // rojo
      eficBg = '#fef2f2';
    } else if (kpis.promedioEficS2 < 82) {
      eficColor = '#f59e0b'; // amarillo/naranja
      eficBg = '#fffbeb';
    }

    grid.innerHTML = `
      <div class="kpi-card" style="--kpi-accent: #3b82f6; --kpi-icon-bg: #eff6ff;">
        <div class="kpi-card-header">
          <span class="kpi-card-label">Total Destetes</span>
          <div class="kpi-card-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
        </div>
        <div class="kpi-card-body">
          <span class="kpi-card-value">${fn(kpis.totalDestetes)}</span>
          <span class="kpi-card-unit">lotes</span>
        </div>
        <div class="kpi-card-sub">Salas procesadas</div>
      </div>

      <div class="kpi-card" style="--kpi-accent: #0284c7; --kpi-icon-bg: #f0f9ff;">
        <div class="kpi-card-header">
          <span class="kpi-card-label">Lechones Sitio 2</span>
          <div class="kpi-card-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            </svg>
          </div>
        </div>
        <div class="kpi-card-body">
          <span class="kpi-card-value" style="color: #0369a1;">${fn(kpis.totalCantS2)}</span>
          <span class="kpi-card-unit">netos</span>
        </div>
        <div class="kpi-card-sub">Enviados a Sitio 2</div>
      </div>

      <div class="kpi-card" style="--kpi-accent: #8b5cf6; --kpi-icon-bg: #f5f3ff;">
        <div class="kpi-card-header">
          <span class="kpi-card-label">Lechones Recría</span>
          <div class="kpi-card-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </div>
        </div>
        <div class="kpi-card-body">
          <span class="kpi-card-value" style="color: #7e22ce;">${fn(kpis.totalRecria)}</span>
          <span class="kpi-card-unit">lechones</span>
        </div>
        <div class="kpi-card-sub">Retenidos en recría</div>
      </div>

      <div class="kpi-card" style="--kpi-accent: #f43f5e; --kpi-icon-bg: #fff1f2;">
        <div class="kpi-card-header">
          <span class="kpi-card-label">Descarte / Elim</span>
          <div class="kpi-card-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
        </div>
        <div class="kpi-card-body">
          <span class="kpi-card-value" style="color: #e11d48;">${fn(kpis.totalEliminados)}</span>
          <span class="kpi-card-unit">bajas</span>
        </div>
        <div class="kpi-card-sub">Descarte de sala</div>
      </div>

      <div class="kpi-card" style="--kpi-accent: #059669; --kpi-icon-bg: #ecfdf5;">
        <div class="kpi-card-header">
          <span class="kpi-card-label">Peso X Sitio 2</span>
          <div class="kpi-card-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
        </div>
        <div class="kpi-card-body">
          <span class="kpi-card-value" style="color: #047857;">${fn(kpis.promedioPesoS2, 2)}</span>
          <span class="kpi-card-unit">kg</span>
        </div>
        <div class="kpi-card-sub">Promedio ponderado</div>
      </div>

      <div class="kpi-card" style="--kpi-accent: ${eficColor}; --kpi-icon-bg: ${eficBg};">
        <div class="kpi-card-header">
          <span class="kpi-card-label">Eficiencia S2</span>
          <div class="kpi-card-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
          </div>
        </div>
        <div class="kpi-card-body">
          <span class="kpi-card-value" style="color: ${eficColor};">${fn(kpis.promedioEficS2, 1)}%</span>
        </div>
        <div class="kpi-card-sub">vs Curva Estándar</div>
      </div>

      <div class="kpi-card" style="--kpi-accent: #6366f1; --kpi-icon-bg: #eef2ff;">
        <div class="kpi-card-header">
          <span class="kpi-card-label">Días Lactancia</span>
          <div class="kpi-card-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
        </div>
        <div class="kpi-card-body">
          <span class="kpi-card-value" style="color: #4338ca;">${fn(kpis.promedioDias, 1)}</span>
          <span class="kpi-card-unit">días</span>
        </div>
        <div class="kpi-card-sub">Edad media destete</div>
      </div>
    `;
  },

  /**
   * Renderiza el cuerpo de la tabla compacta con badges estilizados
   */
  renderTable(items = [], sortBy = 'fin', sortDir = 'desc') {
    const tbody = document.getElementById('destetes-table-body');
    if (!tbody) return;

    if (!items || items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="18" class="text-center" style="padding: 3rem 1rem; color: #94a3b8;">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" style="margin-bottom: 0.5rem; display: block; margin-left: auto; margin-right: auto;">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            No se encontraron registros de destete que coincidan con los filtros seleccionados.
          </td>
        </tr>
      `;
      this.updateSortHeaders(sortBy, sortDir);
      return;
    }

    const Format = window.App.Utils.Format;
    const fn = (val, dec = 0) => Format && Format.formatNumber ? Format.formatNumber(val, dec) : Number(val).toLocaleString('es-ES');

    const rowsHtml = items.map(r => {
      // Badge Efic S2
      let eficClass = 'background: #dcfce7; color: #15803d;'; // Verde >= 85%
      if (r.eficS2 < 75) {
        eficClass = 'background: #fee2e2; color: #b91c1c;'; // Rojo < 75%
      } else if (r.eficS2 < 82) {
        eficClass = 'background: #fef3c7; color: #b45309;'; // Amarillo 75-81%
      }

      // Badge Granja
      const granjaStyle = r.granja === 'EXP' 
        ? 'background: #ede9fe; color: #6d28d9;' 
        : 'background: #e0f2fe; color: #0369a1;';

      // Badge Maternidad
      const matStyle = 'background: #f1f5f9; color: #334155; font-weight: 700; border: 1px solid #cbd5e1;';

      return `
        <tr data-id="${r.id}">
          <td style="font-weight: 600; color: #334155;">${r.fecha || '-'}</td>
          <td class="text-center" style="font-weight: 700; color: #0284c7;" title="Vfin: ${r.vfin || '-'}">${r.fin || 0}</td>
          <td class="text-center" style="color: #475569;" title="Vlote: ${r.vlote || '-'}">${r.lotePic || 0}</td>
          <td class="text-center">
            <span class="badge badge-compact" style="${granjaStyle}">${r.granja || '-'}</span>
          </td>
          <td class="text-center">
            <span class="badge badge-compact" style="${matStyle}">${r.maternidad || '-'}</span>
          </td>
          <td class="text-center" style="font-weight: 800; color: #0f172a;">${r.sala || 0}</td>
          <td class="text-center" style="font-weight: 600; color: #475569;">${r.dias || 0}</td>
          <td class="text-right" style="color: #64748b;">${fn(r.sitio2)}</td>
          <td class="text-right" style="color: ${r.recria > 0 ? '#7e22ce; font-weight: 600;' : '#94a3b8;'}">${fn(r.recria)}</td>
          <td class="text-right" style="color: ${r.eliminados > 0 ? '#e11d48; font-weight: 600;' : '#94a3b8;'}">${fn(r.eliminados)}</td>
          <td class="text-right" style="font-weight: 800; color: #0284c7;">${fn(r.cantS2)}</td>
          <td class="text-right" style="font-weight: 700; color: #1e293b;">${fn(r.pesoXS2, 2)}</td>
          <td class="text-right">
            <span class="badge badge-compact" style="${eficClass} font-weight: 700;">${fn(r.eficS2, 1)}%</span>
          </td>
          <td class="text-right" style="color: #64748b;">${fn(r.pesoNS2)}</td>
          <td class="text-right" style="color: ${r.pesoXR > 0 ? '#334155;' : '#94a3b8;'}">${r.pesoXR > 0 ? fn(r.pesoXR, 2) : '-'}</td>
          <td class="text-right" style="color: ${r.eficR > 0 ? '#15803d;' : '#94a3b8;'}">${r.eficR > 0 ? fn(r.eficR, 1) + '%' : '-'}</td>
          <td class="text-right" style="color: ${r.pesoNR > 0 ? '#64748b;' : '#94a3b8;'}">${r.pesoNR > 0 ? fn(r.pesoNR) : '-'}</td>
          <td class="text-center" style="white-space: nowrap;">
            <button type="button" class="btn-icon btn-edit-destete" data-id="${r.id}" title="Editar destete" style="background: none; border: none; cursor: pointer; color: #64748b; padding: 2px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button type="button" class="btn-icon btn-delete-destete" data-id="${r.id}" title="Eliminar destete" style="background: none; border: none; cursor: pointer; color: #ef4444; padding: 2px; margin-left: 2px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rowsHtml;
    this.updateSortHeaders(sortBy, sortDir);
  },

  /**
   * Actualiza el indicador visual de ordenamiento en las cabeceras
   */
  updateSortHeaders(sortBy, sortDir) {
    const headers = document.querySelectorAll('#destetes-data-table th.th-sortable');
    headers.forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
      if (th.dataset.sort === sortBy) {
        th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      }
    });
  },

  /**
   * Renderiza los controles de paginación
   */
  renderPagination(totalRecords, currentPage, pageSize, totalPages) {
    const info = document.getElementById('destetes-pagination-info');
    const container = document.getElementById('destetes-pagination-buttons');
    if (!info || !container) return;

    const start = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalRecords);
    info.textContent = `Mostrando ${start} - ${end} de ${totalRecords.toLocaleString('es-ES')} registros`;

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let buttonsHtml = '';

    // Botón Anterior
    buttonsHtml += `
      <button type="button" class="btn-page ${currentPage === 1 ? 'disabled' : ''}" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} style="height: 28px; padding: 0 0.5rem; font-size: 0.75rem; border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; cursor: pointer;">
        &laquo;
      </button>
    `;

    // Rango de páginas visibles
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    if (endPage - startPage < 4) {
      if (startPage === 1) endPage = Math.min(totalPages, startPage + 4);
      else if (endPage === totalPages) startPage = Math.max(1, endPage - 4);
    }

    for (let p = startPage; p <= endPage; p++) {
      const activeStyle = p === currentPage 
        ? 'background: var(--primary, #2563eb); color: #fff; font-weight: 700; border-color: var(--primary, #2563eb);' 
        : 'background: #fff; color: #475569; border: 1px solid #cbd5e1;';
      buttonsHtml += `
        <button type="button" class="btn-page ${p === currentPage ? 'active' : ''}" data-page="${p}" style="height: 28px; min-width: 28px; padding: 0 0.4rem; font-size: 0.75rem; border-radius: 4px; cursor: pointer; ${activeStyle}">
          ${p}
        </button>
      `;
    }

    // Botón Siguiente
    buttonsHtml += `
      <button type="button" class="btn-page ${currentPage === totalPages ? 'disabled' : ''}" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} style="height: 28px; padding: 0 0.5rem; font-size: 0.75rem; border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; cursor: pointer;">
        &raquo;
      </button>
    `;

    container.innerHTML = buttonsHtml;
  },

  /**
   * Abre el modal de creación o edición de destete
   */
  openModal(item = null) {
    const modal = document.getElementById('destetes-modal');
    const title = document.getElementById('destetes-modal-title');
    const form = document.getElementById('destetes-modal-form');
    if (!modal || !form) return;

    form.reset();

    if (item) {
      if (title) title.textContent = `Editar Destete (ID: ${item.id})`;
      document.getElementById('destete-form-id').value = item.id;
      document.getElementById('destete-form-fecha').value = item.fecha || '';
      document.getElementById('destete-form-vfin').value = item.vfin || '';
      document.getElementById('destete-form-fin').value = item.fin || '';
      document.getElementById('destete-form-vlote').value = item.vlote || '';
      document.getElementById('destete-form-lotepic').value = item.lotePic || '';
      document.getElementById('destete-form-sala').value = item.sala || '';
      document.getElementById('destete-form-dias').value = item.dias || '';
      document.getElementById('destete-form-sitio2').value = item.sitio2 || '';
      document.getElementById('destete-form-recria').value = item.recria || 0;
      document.getElementById('destete-form-eliminados').value = item.eliminados || 0;
      document.getElementById('destete-form-cants2').value = item.cantS2 || 0;
      document.getElementById('destete-form-pesons2').value = item.pesoNS2 || '';
      document.getElementById('destete-form-pesoxs2').value = item.pesoXS2 || '';
      document.getElementById('destete-form-efics2').value = item.eficS2 || '';
      document.getElementById('destete-form-pesonr').value = item.pesoNR || 0;
      document.getElementById('destete-form-pesoxr').value = item.pesoXR || 0;
      document.getElementById('destete-form-eficr').value = item.eficR || 0;

      this.updateModalSalaPreview(item.sala);
    } else {
      if (title) title.textContent = 'Registrar Nuevo Destete';
      document.getElementById('destete-form-id').value = '';
      
      const Format = window.App.Utils.Format;
      const currentInfo = Format ? Format.getPicInfo(new Date()) : { vuelta: 20, pic: 131 };
      const currentIso = Format && Format.formatDate ? Format.formatDate(new Date()) : '';

      document.getElementById('destete-form-fecha').value = currentIso;
      document.getElementById('destete-form-vfin').value = currentInfo.vuelta;
      document.getElementById('destete-form-fin').value = currentInfo.pic;
      document.getElementById('destete-form-vlote').value = currentInfo.vuelta;
      document.getElementById('destete-form-lotepic').value = Math.max(1, currentInfo.pic - 24);
      document.getElementById('destete-form-dias').value = 24;
      document.getElementById('destete-form-sala').value = 1;
      this.updateModalSalaPreview(1);
    }

    modal.style.display = 'flex';
  },

  /**
   * Cierra el modal
   */
  closeModal() {
    const modal = document.getElementById('destetes-modal');
    if (modal) modal.style.display = 'none';
  },

  /**
   * Actualiza las insignias de Granja, Zona y Maternidad en el modal
   */
  updateModalSalaPreview(sala) {
    const info = window.App.Models.Destetes.resolveSalaInfo(sala);
    const gEl = document.getElementById('destete-preview-granja');
    const zEl = document.getElementById('destete-preview-zona');
    const mEl = document.getElementById('destete-preview-mat');
    if (gEl) gEl.textContent = info.granja;
    if (zEl) zEl.textContent = info.zona;
    if (mEl) mEl.textContent = info.maternidad;
  },

  /**
   * Alterna entre pestañas internas ("table" | "charts")
   */
  switchTab(tabName) {
    const tabs = document.querySelectorAll('#destetes-tabs-nav .mpd-tab-btn');
    tabs.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    const panelTable = document.getElementById('destetes-table-subview');
    const panelCharts = document.getElementById('destetes-charts-subview');
    if (panelTable) panelTable.classList.toggle('active', tabName === 'table');
    if (panelCharts) panelCharts.classList.toggle('active', tabName === 'charts');
  },

  /**
   * Renderiza los gráficos interactivos en la subvista de análisis con Chart.js
   */
  renderCharts(records, filterDesc = 'Acumulado Total') {
    const badgeInfo = document.getElementById('destetes-chart-badge-info');
    if (badgeInfo) badgeInfo.textContent = filterDesc;

    if (typeof Chart === 'undefined') {
      console.warn('Chart.js no está cargado en el entorno.');
      return;
    }

    this.destroyCharts();

    // 1. Gráfico de Destetes por Sala (Sitio 2 vs Recría vs Eliminados)
    this.renderChartSalas(records);

    // 2. Gráfico de Eficiencia y Peso vs Curva Estándar
    this.renderChartEficiencia(records);

    // 3. Gráfico de Distribución por Maternidad
    this.renderChartMaternidades(records);
  },

  /**
   * Destruye instancias previas de gráficos para evitar superposiciones
   */
  destroyCharts() {
    for (const key in this._chartInstances) {
      if (this._chartInstances[key]) {
        try {
          this._chartInstances[key].destroy();
        } catch (e) {
          console.warn('Error destruyendo chart:', e);
        }
      }
    }
    this._chartInstances = {};
  },

  /**
   * Gráfico 1: Destetados por Sala
   */
  renderChartSalas(records) {
    const canvas = document.getElementById('chart-destetes-salas');
    const tableWrapper = document.getElementById('table-destetes-salas-wrapper');
    const badgeTotal = document.getElementById('badge-chart-destetes-total');
    if (!canvas) return;

    // Agrupar por sala
    const salaMap = {};
    let totalLechones = 0;

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const s = Number(r.sala) || 0;
      if (!salaMap[s]) {
        salaMap[s] = { sala: s, cantS2: 0, recria: 0, eliminados: 0, mat: r.maternidad || '-' };
      }
      salaMap[s].cantS2 += Number(r.cantS2) || 0;
      salaMap[s].recria += Number(r.recria) || 0;
      salaMap[s].eliminados += Number(r.eliminados) || 0;
      totalLechones += (Number(r.cantS2) || 0) + (Number(r.recria) || 0);
    }

    if (badgeTotal) badgeTotal.textContent = `${totalLechones.toLocaleString('es-ES')} Lechones`;

    const sortedSalas = Object.values(salaMap).sort((a, b) => (b.cantS2 + b.recria) - (a.cantS2 + a.recria)).slice(0, 15);
    const labels = sortedSalas.map(s => `Sala ${s.sala}`);
    const dataS2 = sortedSalas.map(s => s.cantS2);
    const dataRec = sortedSalas.map(s => s.recria);
    const dataElim = sortedSalas.map(s => s.eliminados);

    const ctx = canvas.getContext('2d');
    this._chartInstances.salas = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Sitio 2 (Neto)',
            data: dataS2,
            backgroundColor: '#3b82f6',
            borderRadius: 4
          },
          {
            label: 'Recría',
            data: dataRec,
            backgroundColor: '#8b5cf6',
            borderRadius: 4
          },
          {
            label: 'Eliminados',
            data: dataElim,
            backgroundColor: '#f43f5e',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              footer: (items) => {
                const total = items.reduce((a, b) => a + b.parsed.y, 0);
                return `Total Sala: ${total.toLocaleString('es-ES')}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { beginAtZero: true, ticks: { font: { size: 10 } } }
        }
      }
    });

    // Tabla integrada al pie
    if (tableWrapper) {
      if (sortedSalas.length === 0) {
        tableWrapper.innerHTML = '<div style="font-size: 0.78rem; color: #94a3b8; text-align: center;">Sin datos en el período</div>';
        return;
      }
      tableWrapper.innerHTML = `
        <table class="table-compact" style="font-size: 0.74rem;">
          <thead>
            <tr>
              <th>Sala</th>
              <th>Mat</th>
              <th class="text-right">Sitio 2</th>
              <th class="text-right">Recría</th>
              <th class="text-right">Eliminados</th>
              <th class="text-right">Total Destete</th>
            </tr>
          </thead>
          <tbody>
            ${sortedSalas.map(s => `
              <tr>
                <td style="font-weight: 700;">Sala ${s.sala}</td>
                <td><span class="badge badge-compact" style="background: #f1f5f9;">${s.mat}</span></td>
                <td class="text-right" style="color: #0284c7; font-weight: 600;">${s.cantS2.toLocaleString('es-ES')}</td>
                <td class="text-right" style="color: #7e22ce;">${s.recria.toLocaleString('es-ES')}</td>
                <td class="text-right" style="color: #e11d48;">${s.eliminados.toLocaleString('es-ES')}</td>
                <td class="text-right" style="font-weight: 800;">${(s.cantS2 + s.recria).toLocaleString('es-ES')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  },

  /**
   * Gráfico 2: Peso Real vs Curva Estándar
   */
  renderChartEficiencia(records) {
    const canvas = document.getElementById('chart-destetes-eficiencia');
    const tableWrapper = document.getElementById('table-destetes-eficiencia-wrapper');
    const badgeEfic = document.getElementById('badge-chart-efic-total');
    if (!canvas) return;

    // Agrupar por días de lactancia
    const diasMap = {};
    let sumEfic = 0;
    let countEfic = 0;

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const d = Number(r.dias) || 0;
      if (d <= 0) continue;
      if (!diasMap[d]) {
        diasMap[d] = { dias: d, sumPeso: 0, count: 0, cantS2: 0, sumPesoN: 0 };
      }
      diasMap[d].count++;
      diasMap[d].cantS2 += Number(r.cantS2) || 0;
      diasMap[d].sumPesoN += Number(r.pesoNS2) || 0;
      if (r.eficS2 > 0) {
        sumEfic += Number(r.eficS2);
        countEfic++;
      }
    }

    const avgGlobalEfic = countEfic > 0 ? (sumEfic / countEfic).toFixed(1) : 0;
    if (badgeEfic) badgeEfic.textContent = `${avgGlobalEfic}% Efic. Media`;

    const sortedDias = Object.values(diasMap).sort((a, b) => a.dias - b.dias);
    const labels = sortedDias.map(d => `${d.dias} días`);
    const dataReal = sortedDias.map(d => d.cantS2 > 0 ? Number((d.sumPesoN / d.cantS2).toFixed(2)) : 0);
    const dataEstandar = sortedDias.map(d => window.App.Models.Destetes.getPesoEsperado(d.dias));

    const ctx = canvas.getContext('2d');
    this._chartInstances.eficiencia = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Peso Promedio Real (kg)',
            data: dataReal,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#10b981'
          },
          {
            label: 'Curva Estándar (kg)',
            data: dataEstandar,
            borderColor: '#f59e0b',
            borderDash: [5, 5],
            fill: false,
            tension: 0.2,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#f59e0b'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const idx = items[0].dataIndex;
                const real = dataReal[idx];
                const est = dataEstandar[idx];
                const ef = est > 0 ? ((real / est) * 100).toFixed(1) : 0;
                return `Eficiencia: ${ef}%`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { beginAtZero: false, ticks: { font: { size: 10 } } }
        }
      }
    });

    // Tabla al pie
    if (tableWrapper) {
      if (sortedDias.length === 0) {
        tableWrapper.innerHTML = '<div style="font-size: 0.78rem; color: #94a3b8; text-align: center;">Sin datos en el período</div>';
        return;
      }
      tableWrapper.innerHTML = `
        <table class="table-compact" style="font-size: 0.74rem;">
          <thead>
            <tr>
              <th>Edad (Días)</th>
              <th class="text-right">Lotes</th>
              <th class="text-right">Lechones S2</th>
              <th class="text-right">Peso Real (kg)</th>
              <th class="text-right">Peso Estándar (kg)</th>
              <th class="text-right">Eficiencia (%)</th>
            </tr>
          </thead>
          <tbody>
            ${sortedDias.map((d, i) => {
              const real = dataReal[i];
              const est = dataEstandar[i];
              const ef = est > 0 ? ((real / est) * 100).toFixed(1) : 0;
              return `
                <tr>
                  <td style="font-weight: 700;">${d.dias} días</td>
                  <td class="text-right">${d.count}</td>
                  <td class="text-right" style="color: #0284c7; font-weight: 600;">${d.cantS2.toLocaleString('es-ES')}</td>
                  <td class="text-right" style="font-weight: 700; color: #047857;">${real.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                  <td class="text-right" style="color: #b45309;">${est.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                  <td class="text-right"><span class="badge badge-compact" style="background: #ecfdf5; color: #047857; font-weight: 700;">${ef}%</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
  },

  /**
   * Gráfico 3: Distribución por Maternidad
   */
  renderChartMaternidades(records) {
    const canvas = document.getElementById('chart-destetes-maternidad');
    const tableWrapper = document.getElementById('table-destetes-maternidad-wrapper');
    const badgeMat = document.getElementById('badge-chart-mat-total');
    if (!canvas) return;

    const matMap = { M1: 0, M2: 0, M3: 0, M4: 0, M5: 0 };
    const granjaMap = { EST: 0, EXP: 0 };
    let totalLotes = 0;

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const m = r.maternidad || 'M1';
      const g = r.granja || 'EST';
      if (matMap[m] !== undefined) matMap[m] += Number(r.cantS2) || 0;
      if (granjaMap[g] !== undefined) granjaMap[g] += Number(r.cantS2) || 0;
      totalLotes++;
    }

    if (badgeMat) badgeMat.textContent = `${totalLotes} Lotes Procesados`;

    const labels = ['M1 (EST)', 'M2 (EST)', 'M3 (EST)', 'M4 (EXP)', 'M5 (EXP)'];
    const dataValues = [matMap.M1, matMap.M2, matMap.M3, matMap.M4, matMap.M5];
    const colors = ['#3b82f6', '#0284c7', '#06b6d4', '#8b5cf6', '#a855f7'];

    const ctx = canvas.getContext('2d');
    this._chartInstances.maternidad = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: dataValues,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } }
        },
        cutout: '62%'
      }
    });

    if (tableWrapper) {
      const totalS2 = Object.values(matMap).reduce((a, b) => a + b, 0);
      tableWrapper.innerHTML = `
        <div style="background: #f8fafc; border-radius: 6px; padding: 0.85rem; border: 1px solid #e2e8f0;">
          <h4 style="font-size: 0.8rem; font-weight: 700; color: #475569; margin: 0 0 0.6rem 0; text-transform: uppercase;">
            Balance por Área Operativa
          </h4>
          <div style="display: flex; gap: 1rem; margin-bottom: 0.85rem;">
            <div style="flex: 1; background: #e0f2fe; padding: 0.6rem; border-radius: 4px; text-align: center;">
              <span style="font-size: 0.72rem; color: #0369a1; font-weight: 700;">ÁREA EST (M1-M3)</span>
              <div style="font-size: 1.1rem; font-weight: 800; color: #075985;">${granjaMap.EST.toLocaleString('es-ES')}</div>
              <span style="font-size: 0.68rem; color: #0369a1;">${totalS2 > 0 ? ((granjaMap.EST / totalS2) * 100).toFixed(1) : 0}%</span>
            </div>
            <div style="flex: 1; background: #ede9fe; padding: 0.6rem; border-radius: 4px; text-align: center;">
              <span style="font-size: 0.72rem; color: #6d28d9; font-weight: 700;">ÁREA EXP (M4-M5)</span>
              <div style="font-size: 1.1rem; font-weight: 800; color: #5b21b6;">${granjaMap.EXP.toLocaleString('es-ES')}</div>
              <span style="font-size: 0.68rem; color: #6d28d9;">${totalS2 > 0 ? ((granjaMap.EXP / totalS2) * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
          <table class="table-compact" style="font-size: 0.72rem;">
            <thead>
              <tr>
                <th>Pabellón</th>
                <th>Área</th>
                <th class="text-right">Lechones Sitio 2</th>
                <th class="text-right">Part. %</th>
              </tr>
            </thead>
            <tbody>
              ${['M1', 'M2', 'M3', 'M4', 'M5'].map(m => {
                const count = matMap[m];
                const pct = totalS2 > 0 ? ((count / totalS2) * 100).toFixed(1) : 0;
                const area = (m === 'M4' || m === 'M5') ? 'EXP' : 'EST';
                return `
                  <tr>
                    <td style="font-weight: 700;">${m}</td>
                    <td><span class="badge badge-compact" style="${area === 'EXP' ? 'background: #ede9fe; color: #6d28d9;' : 'background: #e0f2fe; color: #0369a1;'}">${area}</span></td>
                    <td class="text-right" style="font-weight: 600;">${count.toLocaleString('es-ES')}</td>
                    <td class="text-right" style="font-weight: 700; color: #0284c7;">${pct}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }
};
