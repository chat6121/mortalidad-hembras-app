/**
 * MaternidadView: Vista para el módulo Maternidad.
 * Renderiza dos tablas distintas y separadas según su área operativa:
 *  1) ÁREA ESTABLECIDA (EST - Salas 1 a 24)
 *  2) ÁREA EXPANSIÓN (EXP - Salas 25 a 41)
 * Con sus 12 columnas exactas de la hoja MATERNIDAD:
 * N°, Pic Inicio, Pic Cierre, Sala, Vlote, LotePic, Partos, LNV, LNM, LNMo, MPD al Cierre, Peso X
 * Además incluye subvista de Gráficos Analíticos comparativos (EST vs EXP) con Chart.js.
 */
window.App = window.App || {};
window.App.Views = window.App.Views || {};

window.App.Views.Maternidad = {
  container: document.getElementById('view-maternidad'),
  _chartInstances: {},

  /**
   * Construye la barra de filtros y acciones independiente para cada área ('est' o 'exp')
   */
  _buildToolbarHtml(areaKey, { currentVuelta, salas, mpdDays, autoDayLabel, areaLabel }) {
    const p = `maternidad-${areaKey}`;
    const b = `btn-maternidad-${areaKey}`;
    const salasHtml = (salas || []).map(s => `<option value="${s}">${s}</option>`).join('');
    const mpdDaysHtml = (mpdDays || []).map(d => `<option value="${d.label}">${d.label}</option>`).join('');

    return `
      <div style="padding: 1rem 1.25rem; background: #f8fafc; border-bottom: 1px solid var(--border-color);">
        <div class="filter-toolbar-grid">
          <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-end; flex: 1;">
            <!-- CONTROL UNIFICADO: FECHA PIC CON CALENDARIO -->
            <div class="pic-date-control" title="Filtrar ${areaLabel} por Fecha PIC (Pic Inicio, Pic Cierre o LotePic)">
              <label class="filter-field-label" title="Formato: Vuelta-PIC (Ej: 20-128)">FECHA PIC</label>
              <div class="pic-input-wrapper">
                <input type="text" id="${p}-filter-vueltapic" class="form-control pic-input-field" placeholder="Ej: 20-128" value="${currentVuelta}-" autocomplete="off" />
                <div class="btn-pic-calendar-wrapper" title="Seleccionar fecha en calendario">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <input type="date" id="${p}-filter-date" class="pic-hidden-datepicker" tabindex="-1" />
                </div>
              </div>
              <div class="pic-date-caption" id="${p}-filter-date-caption"></div>
            </div>

            <!-- Filtro Sala -->
            <div class="filter-field" style="width: 100px;">
              <label class="filter-field-label">Sala</label>
              <select id="${p}-filter-sala" class="form-control">
                <option value="">Todas</option>
                ${salasHtml}
              </select>
            </div>

            <!-- Filtro Estado -->
            <div class="filter-field" style="width: 140px;">
              <label class="filter-field-label">Estado</label>
              <select id="${p}-filter-estado" class="form-control">
                <option value="">Todos</option>
                <option value="Cerrada">Cerrada</option>
                <option value="Pre-Parto">Pre-Parto (PRE)</option>
              </select>
            </div>

            <!-- Filtro Estatus (Destete) -->
            <div class="filter-field" style="width: 118px;" title="Estatus según Módulo Destetes (Dttada / Activas)">
              <label class="filter-field-label">Estatus</label>
              <select id="${p}-filter-estatus" class="form-control">
                <option value="">Todos</option>
                <option value="Activas">Activas</option>
                <option value="Dttada">Dttada</option>
              </select>
            </div>

            <!-- Selector Día de Mortalidad MPD -->
            <div class="filter-field" style="width: 150px;" title="Selecciona el día Vuelta-PIC del módulo MPD para ${areaLabel}">
              <label class="filter-field-label">Día MPD</label>
              <select id="${p}-filter-mpd-day" class="form-control">
                <option value="">${autoDayLabel}</option>
                ${mpdDaysHtml}
              </select>
            </div>

            <!-- Buscador Inteligente -->
            <div class="filter-field" style="flex: 1; min-width: 200px;">
              <label class="filter-field-label">Búsqueda Rápida</label>
              <div class="search-input-wrapper">
                <input type="text" id="${p}-search-input" class="form-control" placeholder="Buscar N°, Sala, LotePic, Partos..." autocomplete="off" />
                <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
            </div>
          </div>

          <!-- Acciones Derecha -->
          <div class="filter-actions-group">
            <button type="button" id="${p}-btn-clear-filters" class="btn btn-secondary" title="Limpiar filtros de ${areaLabel}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              <span>Limpiar</span>
            </button>

            <button type="button" id="${b}-sync" class="btn btn-outline" title="Sincronizar automáticamente desde Cierres, Destetes, MPD y Partos Salas">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span>Sincronizar</span>
            </button>

            <button type="button" id="${b}-import" class="btn btn-outline" title="Importar hoja MATERNIDAD desde archivo Excel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span>Excel</span>
            </button>

            <button type="button" id="${b}-export-csv" class="btn btn-outline" title="Exportar tabla ${areaLabel} a CSV">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>CSV</span>
            </button>

            <button type="button" id="${b}-new" class="btn btn-primary" title="Registrar nuevo lote en ${areaLabel}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Nuevo Registro</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Renderiza el cascarón estructural completo del módulo Maternidad
   */
  renderSkeleton(filterOptions = { salas: [], estSalas: [], expSalas: [], mpdDays: [], latestMpdLabel: '' }) {
    if (!this.container) {
      this.container = document.getElementById('view-maternidad');
    }
    if (!this.container) return;

    const Format = window.App.Utils.Format;
    const currentInfo = Format ? Format.getPicInfo(new Date()) : { vuelta: 20, pic: 131 };
    const currentVuelta = currentInfo.vuelta;

    const autoDayLabel = filterOptions.latestMpdLabel ? `Último (${filterOptions.latestMpdLabel})` : 'Último en MPD';
    const estSalas = filterOptions.estSalas && filterOptions.estSalas.length ? filterOptions.estSalas : (filterOptions.salas || []).filter(s => s <= 24);
    const expSalas = filterOptions.expSalas && filterOptions.expSalas.length ? filterOptions.expSalas : (filterOptions.salas || []).filter(s => s >= 25);

    const estToolbarHtml = this._buildToolbarHtml('est', {
      currentVuelta,
      salas: estSalas,
      mpdDays: filterOptions.mpdDays || [],
      autoDayLabel,
      areaLabel: 'Área Establecida'
    });

    const expToolbarHtml = this._buildToolbarHtml('exp', {
      currentVuelta,
      salas: expSalas,
      mpdDays: filterOptions.mpdDays || [],
      autoDayLabel,
      areaLabel: 'Área Expansión'
    });

    this.container.innerHTML = `
      <!-- SUBMENÚ / PESTAÑAS DE NAVEGACIÓN INTERNA MATERNIDAD -->
      <div class="mpd-tabs-nav" id="maternidad-tabs-nav">
        <button type="button" class="mpd-tab-btn active" data-tab="table" id="tab-maternidad-table">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
          <span>Tablas por Área (EST / EXP)</span>
        </button>

        <button type="button" class="mpd-tab-btn" data-tab="charts" id="tab-maternidad-charts">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span>Gráficos Comparativos</span>
        </button>
      </div>

      <!-- ==============================================
           SUBVISTA 1: DOS TABLAS INDEPENDIENTES POR ÁREA (ESTABLECIDA Y EXPANSIÓN)
           ============================================== -->
      <div id="maternidad-subview-table" class="mpd-subview-panel active">
        <input type="file" id="maternidad-file-input" accept=".xlsm,.xlsx,.xls" style="display: none;" />

        <!-- TARJETAS DE RESUMEN KPI GENERAL -->
        <div class="kpi-grid" id="maternidad-stats-grid">
          <!-- Renderizado dinámico en renderKpis -->
        </div>

        <!-- TABLA 1: ÁREA ESTABLECIDA (EST) CON BARRA INDEPENDIENTE -->
        <div class="card" style="margin-bottom: 1.5rem; padding: 0; overflow: hidden; border-top: 3px solid #10b981;">
          <div class="card-header" style="padding: 1rem 1.25rem; background: linear-gradient(to right, rgba(16, 185, 129, 0.06), transparent); border-bottom: 1px solid var(--border-color); flex-wrap: wrap; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="badge" style="background: #d1fae5; color: #047857; font-weight: 800; padding: 0.35rem 0.75rem; font-size: 0.82rem; border: 1px solid #a7f3d0;">EST</span>
              <div>
                <h4 class="card-title" style="margin: 0; font-size: 1.05rem;">Área Establecida (Salas 1 a 24)</h4>
                <p class="card-subtitle" style="margin: 0; font-size: 0.78rem; color: var(--text-muted);">Primer bloque de la hoja MATERNIDAD · M1, M2 y M3</p>
              </div>
            </div>
            <div id="maternidad-est-header-badges" style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;"></div>
          </div>
          ${estToolbarHtml}
          <div id="maternidad-table-est-wrapper"></div>
        </div>

        <!-- TABLA 2: ÁREA EXPANSIÓN (EXP) CON BARRA INDEPENDIENTE -->
        <div class="card" style="padding: 0; overflow: hidden; border-top: 3px solid #6366f1;">
          <div class="card-header" style="padding: 1rem 1.25rem; background: linear-gradient(to right, rgba(99, 102, 241, 0.06), transparent); border-bottom: 1px solid var(--border-color); flex-wrap: wrap; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="badge" style="background: #e0e7ff; color: #4338ca; font-weight: 800; padding: 0.35rem 0.75rem; font-size: 0.82rem; border: 1px solid #c7d2fe;">EXP</span>
              <div>
                <h4 class="card-title" style="margin: 0; font-size: 1.05rem;">Área Expansión (Salas 25 a 41)</h4>
                <p class="card-subtitle" style="margin: 0; font-size: 0.78rem; color: var(--text-muted);">Segundo bloque de la hoja MATERNIDAD · M4 y M5</p>
              </div>
            </div>
            <div id="maternidad-exp-header-badges" style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;"></div>
          </div>
          ${expToolbarHtml}
          <div id="maternidad-table-exp-wrapper"></div>
        </div>

      </div>

      <!-- ==============================================
           SUBVISTA 2: GRÁFICOS COMPARATIVOS (EST VS EXP)
           ============================================== -->
      <div id="maternidad-subview-charts" class="mpd-subview-panel" style="display: none;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(460px, 1fr)); gap: 1.25rem;">
          <!-- Gráfico 1: Comparativa Nacimientos Establecida vs Expansión -->
          <div class="card">
            <div class="card-header">
              <div>
                <h4 class="card-title">Comparativa de Nacimientos y MPD (EST vs EXP)</h4>
                <p class="card-subtitle">Volumen total por indicador entre Área Establecida y Área Expansión</p>
              </div>
            </div>
            <div class="card-body" style="height: 320px; position: relative;">
              <canvas id="chart-maternidad-comparativa"></canvas>
            </div>
          </div>

          <!-- Gráfico 2: Curva de Peso Promedio al Nacimiento (Peso X) -->
          <div class="card">
            <div class="card-header">
              <div>
                <h4 class="card-title">Peso Promedio al Nacimiento (Peso X en kg)</h4>
                <p class="card-subtitle">Evolución del peso promedio por lote cerrado entre áreas</p>
              </div>
            </div>
            <div class="card-body" style="height: 320px; position: relative;">
              <canvas id="chart-maternidad-peso"></canvas>
            </div>
          </div>

          <!-- Gráfico 3: LNV y MPD por Sala - Área Establecida -->
          <div class="card">
            <div class="card-header">
              <div>
                <h4 class="card-title">Área Establecida (EST) · LNV y MPD por Sala</h4>
                <p class="card-subtitle">Desempeño por lote en Salas 1 a 24</p>
              </div>
            </div>
            <div class="card-body" style="height: 320px; position: relative;">
              <canvas id="chart-maternidad-est-salas"></canvas>
            </div>
          </div>

          <!-- Gráfico 4: LNV y MPD por Sala - Área Expansión -->
          <div class="card">
            <div class="card-header">
              <div>
                <h4 class="card-title">Área Expansión (EXP) · LNV y MPD por Sala</h4>
                <p class="card-subtitle">Desempeño por lote en Salas 25 a 41</p>
              </div>
            </div>
            <div class="card-body" style="height: 320px; position: relative;">
              <canvas id="chart-maternidad-exp-salas"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Conmuta visualmente entre la subvista 'table' y 'charts'
   */
  switchTab(tabName = 'table') {
    const isTable = tabName !== 'charts';
    const tabTable = document.getElementById('tab-maternidad-table');
    const tabCharts = document.getElementById('tab-maternidad-charts');
    const panelTable = document.getElementById('maternidad-subview-table');
    const panelCharts = document.getElementById('maternidad-subview-charts');

    if (tabTable) tabTable.classList.toggle('active', isTable);
    if (tabCharts) tabCharts.classList.toggle('active', !isTable);

    if (panelTable) panelTable.style.display = isTable ? 'block' : 'none';
    if (panelCharts) panelCharts.style.display = !isTable ? 'block' : 'none';
  },

  /**
   * Renderiza las 5 tarjetas KPI superiores
   */
  renderKpis(estSummary, expSummary, totalSummary, mpdRefLabel = '') {
    const grid = document.getElementById('maternidad-stats-grid');
    if (!grid) return;

    const Format = window.App.Utils.Format;
    const fmtInt = (n) => Format ? Format.formatNumber(n, 0) : Number(n).toLocaleString('es-ES');
    const fmtDec = (n) => Format ? Format.formatNumber(n, 2) : Number(n).toFixed(2).replace('.', ',');

    grid.innerHTML = `
      <div class="kpi-card" style="--kpi-accent: #4f46e5;">
        <div class="kpi-header">
          <span class="kpi-label">Partos Totales</span>
          <span class="kpi-icon" style="background: #eef2ff; color: #4f46e5;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
            </svg>
          </span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">${fmtInt(totalSummary.partos)}</span>
          <span class="kpi-unit">partos</span>
        </div>
        <div class="kpi-subtext">EST: <b>${fmtInt(estSummary.partos)}</b> · EXP: <b>${fmtInt(expSummary.partos)}</b></div>
      </div>

      <div class="kpi-card" style="--kpi-accent: #10b981;">
        <div class="kpi-header">
          <span class="kpi-label">Nacidos Vivos (LNV)</span>
          <span class="kpi-icon" style="background: #ecfdf5; color: #059669;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value" style="color: #047857;">${fmtInt(totalSummary.lnv)}</span>
          <span class="kpi-unit">${fmtDec(totalSummary.promedioLnvParto)} / parto</span>
        </div>
        <div class="kpi-subtext">EST: <b>${fmtInt(estSummary.lnv)}</b> · EXP: <b>${fmtInt(expSummary.lnv)}</b></div>
      </div>

      <div class="kpi-card" style="--kpi-accent: #f59e0b;">
        <div class="kpi-header">
          <span class="kpi-label">Muertos (LNM) + Momias</span>
          <span class="kpi-icon" style="background: #fffbeb; color: #d97706;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value" style="color: #b45309;">${fmtInt(totalSummary.lnm)}</span>
          <span class="kpi-unit">+ ${fmtInt(totalSummary.lnMo)} momias</span>
        </div>
        <div class="kpi-subtext">EST: ${fmtInt(estSummary.lnm)}/${fmtInt(estSummary.lnMo)} · EXP: ${fmtInt(expSummary.lnm)}/${fmtInt(expSummary.lnMo)}</div>
      </div>

      <div class="kpi-card" style="--kpi-accent: #ef4444;">
        <div class="kpi-header">
          <span class="kpi-label">MPD al Cierre</span>
          <span class="kpi-icon" style="background: #fef2f2; color: #dc2626;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value" style="color: #dc2626;">${fmtInt(totalSummary.mpdAlCierre)}</span>
          <span class="kpi-unit">${fmtDec(totalSummary.pctMpd)}% s/LNV</span>
        </div>
        <div class="kpi-subtext">EST: <b>${fmtInt(estSummary.mpdAlCierre)}</b> (${fmtDec(estSummary.pctMpd)}%) · EXP: <b>${fmtInt(expSummary.mpdAlCierre)}</b> (${fmtDec(expSummary.pctMpd)}%)</div>
      </div>

      <div class="kpi-card" style="--kpi-accent: #e11d48;">
        <div class="kpi-header">
          <span class="kpi-label">Mort. Tot. / Día (${mpdRefLabel || 'MPD'})</span>
          <span class="kpi-icon" style="background: #fff1f2; color: #e11d48;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
              <polyline points="17 18 23 18 23 12"/>
            </svg>
          </span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value" style="color: #be123c;">${fmtInt(totalSummary.mortTotal)}</span>
          <span class="kpi-unit">${fmtDec(totalSummary.pctMortAcum)}% s/LNV · Hoy: <b>${fmtInt(totalSummary.mortDia)}</b></span>
        </div>
        <div class="kpi-subtext">Acum. Ant.: <b>${fmtInt(totalSummary.mortAcum)}</b> · Mes Act.: <b>${fmtInt(totalSummary.mortActual)}</b></div>
      </div>

      <div class="kpi-card" style="--kpi-accent: #0284c7;">
        <div class="kpi-header">
          <span class="kpi-label">Peso Promedio (Peso X)</span>
          <span class="kpi-icon" style="background: #f0f9ff; color: #0284c7;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          </span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value" style="color: #0369a1;">${fmtDec(totalSummary.avgPesoX)}</span>
          <span class="kpi-unit">kg promedio</span>
        </div>
        <div class="kpi-subtext">EST: <b>${fmtDec(estSummary.avgPesoX)} kg</b> · EXP: <b>${fmtDec(expSummary.avgPesoX)} kg</b></div>
      </div>
    `;
  },

  /**
   * Renderiza ambas tablas independientes (Establecida y Expansión)
   */
  renderDualTables(data, sortState = 'orden', legacySortDir = 'asc') {
    const {
      establecida,
      expansion,
      estSummary,
      expSummary,
      totalSummary,
      mpdRefLabel,
      estMpdRefLabel,
      expMpdRefLabel,
      monthBoundary
    } = data;

    const estRef = estMpdRefLabel || mpdRefLabel;
    const expRef = expMpdRefLabel || mpdRefLabel;

    const estSort = (typeof sortState === 'object' && sortState.est)
      ? sortState.est
      : { sortBy: typeof sortState === 'string' ? sortState : 'orden', sortDir: legacySortDir };
    const expSort = (typeof sortState === 'object' && sortState.exp)
      ? sortState.exp
      : { sortBy: typeof sortState === 'string' ? sortState : 'orden', sortDir: legacySortDir };

    const Format = window.App.Utils.Format;
    const fmtInt = (n) => Format ? Format.formatNumber(n, 0) : Number(n).toLocaleString('es-ES');
    const fmtDec = (n) => Format ? Format.formatNumber(n, 2) : Number(n).toFixed(2).replace('.', ',');
    const openMesTag = monthBoundary && monthBoundary.openMonthName ? monthBoundary.openMonthName.split(' ')[0] : 'Mes';

    // Actualizar KPIs globales
    this.renderKpis(estSummary, expSummary, totalSummary, mpdRefLabel);

    // Actualizar badges en cabeceras de cada tabla
    const estBadges = document.getElementById('maternidad-est-header-badges');
    if (estBadges) {
      estBadges.innerHTML = `
        <span class="badge" style="background: #f1f5f9; color: #334155; font-weight: 600;">${estSummary.count} registros</span>
        <span class="badge" style="background: #ecfdf5; color: #047857; font-weight: 700;">LNV: ${fmtInt(estSummary.lnv)}</span>
        <span class="badge" style="background: #fef2f2; color: #b91c1c; font-weight: 700;">MPD Cierre: ${fmtInt(estSummary.mpdAlCierre)}</span>
        <span class="badge" style="background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; font-weight: 700;">Mort. Acum.: ${fmtInt(estSummary.mortAcum)}</span>
        <span class="badge" style="background: #fff7ed; color: #c2410c; font-weight: 700;">Mort. Act. (${openMesTag}): ${fmtInt(estSummary.mortActual)}</span>
        <span class="badge" style="background: #fff1f2; color: #be123c; font-weight: 800;">Mort. Tot.: ${fmtInt(estSummary.mortTotal)}</span>
        <span class="badge" style="background: #fef3c7; color: #b45309; font-weight: 700;">Mort. Día (${estRef || 'MPD'}): ${fmtInt(estSummary.mortDia)}</span>
        <span class="badge" style="background: #eff6ff; color: #1d4ed8; font-weight: 700;">Peso X: ${fmtDec(estSummary.avgPesoX)} kg</span>
      `;
    }

    const expBadges = document.getElementById('maternidad-exp-header-badges');
    if (expBadges) {
      expBadges.innerHTML = `
        <span class="badge" style="background: #f1f5f9; color: #334155; font-weight: 600;">${expSummary.count} registros</span>
        <span class="badge" style="background: #ecfdf5; color: #047857; font-weight: 700;">LNV: ${fmtInt(expSummary.lnv)}</span>
        <span class="badge" style="background: #fef2f2; color: #b91c1c; font-weight: 700;">MPD Cierre: ${fmtInt(expSummary.mpdAlCierre)}</span>
        <span class="badge" style="background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; font-weight: 700;">Mort. Acum.: ${fmtInt(expSummary.mortAcum)}</span>
        <span class="badge" style="background: #fff7ed; color: #c2410c; font-weight: 700;">Mort. Act. (${openMesTag}): ${fmtInt(expSummary.mortActual)}</span>
        <span class="badge" style="background: #fff1f2; color: #be123c; font-weight: 800;">Mort. Tot.: ${fmtInt(expSummary.mortTotal)}</span>
        <span class="badge" style="background: #fef3c7; color: #b45309; font-weight: 700;">Mort. Día (${expRef || 'MPD'}): ${fmtInt(expSummary.mortDia)}</span>
        <span class="badge" style="background: #eff6ff; color: #1d4ed8; font-weight: 700;">Peso X: ${fmtDec(expSummary.avgPesoX)} kg</span>
      `;
    }

    // Renderizar Tabla 1 (Establecida)
    this._renderSingleAreaTable('maternidad-table-est-wrapper', establecida, estSummary, 'EST', estSort.sortBy, estSort.sortDir, estRef, monthBoundary);

    // Renderizar Tabla 2 (Expansión)
    this._renderSingleAreaTable('maternidad-table-exp-wrapper', expansion, expSummary, 'EXP', expSort.sortBy, expSort.sortDir, expRef, monthBoundary);
  },

  /**
   * Renderiza una tabla individual de Maternidad con desglose mensual de mortalidad (Acum., Act., Tot., Día, % MPD) y Estatus
   */
  _renderSingleAreaTable(wrapperId, rows, summary, areaCode, currentSortBy, currentSortDir, mpdRefLabel = '', monthBoundary = null) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    const Format = window.App.Utils.Format;
    const fmtInt = (n) => Format ? Format.formatNumber(n, 0) : Number(n).toLocaleString('es-ES');
    const fmtDec = (n) => Format ? Format.formatNumber(n, 2) : Number(n).toFixed(2).replace('.', ',');

    const getSortClass = (col) => {
      if (currentSortBy === col) {
        return currentSortDir === 'desc' ? 'sort-desc' : 'sort-asc';
      }
      return '';
    };

    if (!rows || rows.length === 0) {
      wrapper.innerHTML = `
        <div style="padding: 2.5rem; text-align: center; color: #64748b; font-size: 0.9rem;">
          No se encontraron registros para Área <strong>${areaCode === 'EST' ? 'Establecida' : 'Expansión'}</strong> con los filtros seleccionados.
        </div>
      `;
      return;
    }

    const rowsHtml = rows.map(r => {
      const isPre = r.estado === 'Pre-Parto' || String(r.lotePic).toUpperCase() === 'PRE' || String(r.picCierre).toUpperCase() === 'PRE' || r.picCierre === '';

      const nroDisplay = r.nro === '-'
        ? `<span class="badge" style="background: #fef3c7; color: #b45309; font-weight: 700;">-</span>`
        : `<span style="font-weight: 700; color: #334155;">${r.nro}</span>`;

      let picCierreDisplay = `<span style="color: #94a3b8; font-style: italic;">—</span>`;
      if (String(r.picCierre).toUpperCase() === 'PRE') {
        picCierreDisplay = `<span class="badge" style="background: #fef3c7; color: #b45309; font-weight: 700; font-size: 0.74rem;">PRE</span>`;
      } else if (r.picCierre !== '' && r.picCierre !== null && r.picCierre !== undefined) {
        picCierreDisplay = `<strong style="color: #0369a1;">${r.picCierre}</strong>`;
      }

      const vloteDisplay = (r.vlote !== null && r.vlote !== undefined && r.vlote !== '')
        ? `<span class="badge badge-compact" style="background: #f1f5f9; color: #475569; font-weight: 700;">${r.vlote}</span>`
        : `<span style="color: #94a3b8;">—</span>`;

      const lotePicDisplay = String(r.lotePic).toUpperCase() === 'PRE'
        ? `<span class="badge" style="background: rgba(245, 158, 11, 0.16); color: #b45309; font-weight: 700; font-size: 0.75rem;">PRE</span>`
        : `<code style="font-size: 0.82rem; font-weight: 700; color: var(--primary);">${r.lotePic}</code>`;

      const pesoXDisplay = (r.pesoX !== null && r.pesoX !== undefined && r.pesoX !== '')
        ? `<strong style="color: #0f172a;">${fmtDec(r.pesoX)}</strong>`
        : `<span style="color: #94a3b8;">—</span>`;

      const mortAcumVal = Number(r.mortAcum) || 0;
      const mortActualVal = Number(r.mortActual) || 0;
      const mortTotalVal = Number(r.mortTotal) || 0;
      const mortDiaVal = Number(r.mortDia) || 0;
      const pctMpdVal = Number(r.pctMpd) || 0;

      const mortDiaDisplay = mortDiaVal > 0
        ? `<span class="badge badge-compact" style="background: #fee2e2; color: #b91c1c; font-weight: 800; min-width: 28px; display: inline-block; text-align: center;" title="Mortalidad del día (${r.mpdRefLabel || mpdRefLabel})">${fmtInt(mortDiaVal)}</span>`
        : `<span style="color: #94a3b8; font-weight: 500;">0</span>`;

      const isDttada = r.estatus === 'Dttada';
      const estatusDisplay = isDttada
        ? `<span class="badge" style="background: #ede9fe; color: #5b21b6; border: 1px solid #ddd6fe; font-weight: 700; padding: 2px 8px; border-radius: 9999px; font-size: 0.74rem;" title="Sala ya registrada en Módulo Destetes">Dttada</span>`
        : `<span class="badge" style="background: rgba(16, 185, 129, 0.12); color: #047857; border: 1px solid rgba(16, 185, 129, 0.25); font-weight: 700; padding: 2px 8px; border-radius: 9999px; font-size: 0.74rem;" title="Sala aún activa en Maternidad">Activas</span>`;

      const mesActTitle = monthBoundary ? `Mortalidad de ${monthBoundary.openMonthName} (>= PIC ${monthBoundary.openMonthStartPic})` : 'Mortalidad del mes abierto';
      const mesAntTitle = monthBoundary ? `Mortalidad acumulada en meses cerrados (hasta PIC ${monthBoundary.prevClosedEndPic})` : 'Mortalidad de meses anteriores cerrados';

      return `
        <tr style="${isPre ? 'background: rgba(254, 243, 199, 0.22);' : ''}">
          <td style="text-align: center;">${nroDisplay}</td>
          <td style="text-align: center; font-weight: 600;">${r.picInicio}</td>
          <td style="text-align: center;">${picCierreDisplay}</td>
          <td style="text-align: center;"><span class="badge badge-compact" style="background: #e0f2fe; color: #0369a1; font-weight: 800;">${r.sala}</span></td>
          <td style="text-align: center;" title="Vlote: ${r.vlote || '-'}">${lotePicDisplay}</td>
          <td style="text-align: right; font-weight: 600;">${fmtInt(r.partos)}</td>
          <td style="text-align: right; font-weight: 700; color: #047857;">${fmtInt(r.lnv)}</td>
          <td style="text-align: right; color: #d97706;">${fmtInt(r.lnm)}</td>
          <td style="text-align: right; color: #7c3aed;">${fmtInt(r.lnMo)}</td>
          <td style="text-align: right; font-weight: 700; color: #dc2626;">${fmtInt(r.mpdAlCierre)}</td>
          <td style="text-align: right; font-weight: 700; color: #475569;" title="${mesAntTitle}">${fmtInt(mortAcumVal)}</td>
          <td style="text-align: right; font-weight: 700; color: #c2410c;" title="${mesActTitle}">${fmtInt(mortActualVal)}</td>
          <td style="text-align: right; font-weight: 800; color: #be123c;" title="Mortalidad Total de Sala ${r.sala} (${mortAcumVal} + ${mortActualVal})">${fmtInt(mortTotalVal)}</td>
          <td style="text-align: right;">${mortDiaDisplay}</td>
          <td style="text-align: right; font-weight: 600; color: ${pctMpdVal >= 15 ? '#be123c' : '#334155'};">${fmtDec(pctMpdVal)}%</td>
          <td style="text-align: right;">${pesoXDisplay}</td>
          <td style="text-align: center;">${estatusDisplay}</td>
          <td style="text-align: center;">
            <div style="display: inline-flex; gap: 0.25rem;">
              <button type="button" class="btn-icon-sm btn-edit-maternidad" data-id="${r.id}" title="Editar registro" style="color: #2563eb; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 5px; padding: 3px 6px; cursor: pointer;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </button>
              <button type="button" class="btn-icon-sm btn-delete-maternidad" data-id="${r.id}" data-sala="${r.sala}" title="Eliminar registro" style="color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 5px; padding: 3px 6px; cursor: pointer;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    wrapper.innerHTML = `
      <div class="table-responsive" style="overflow-x: auto;">
        <table class="table table-compact table-maternidad" data-area="${areaCode}" style="margin-bottom: 0;">
          <thead>
            <tr>
              <th class="th-sortable text-center ${getSortClass('nro')}" data-sort="nro" style="text-align: center; width: 52px;">N°</th>
              <th class="th-sortable text-center ${getSortClass('picInicio')}" data-sort="picInicio" style="text-align: center; width: 80px;">Pic Inicio</th>
              <th class="th-sortable text-center ${getSortClass('picCierre')}" data-sort="picCierre" style="text-align: center; width: 80px;">Pic Cierre</th>
              <th class="th-sortable text-center ${getSortClass('sala')}" data-sort="sala" style="text-align: center; width: 60px;">Sala</th>
              <th class="th-sortable text-center ${getSortClass('lotePic')}" data-sort="lotePic" style="text-align: center; width: 76px;" title="Lote PIC (Vlote usado internamente para cruces y fechas)">LotePic</th>
              <th class="th-sortable text-right ${getSortClass('partos')}" data-sort="partos" style="text-align: right; width: 66px;">Partos</th>
              <th class="th-sortable text-right ${getSortClass('lnv')}" data-sort="lnv" style="text-align: right; width: 72px;">LNV</th>
              <th class="th-sortable text-right ${getSortClass('lnm')}" data-sort="lnm" style="text-align: right; width: 64px;">LNM</th>
              <th class="th-sortable text-right ${getSortClass('lnMo')}" data-sort="lnMo" style="text-align: right; width: 66px;">LNMo</th>
              <th class="th-sortable text-right ${getSortClass('mpdAlCierre')}" data-sort="mpdAlCierre" style="text-align: right; width: 88px;" title="Mortalidad Pre-Destete registrada al cierre de la sala">MPD Cierre</th>
              <th class="th-sortable text-right ${getSortClass('mortAcum')}" data-sort="mortAcum" style="text-align: right; width: 82px;" title="Mortalidad Acumulada en meses anteriores cerrados">Mort. Acum.</th>
              <th class="th-sortable text-right ${getSortClass('mortActual')}" data-sort="mortActual" style="text-align: right; width: 80px;" title="Mortalidad Actual del mes abierto${monthBoundary ? ' (' + monthBoundary.openMonthName + ')' : ''}">Mort. Act.</th>
              <th class="th-sortable text-right ${getSortClass('mortTotal')}" data-sort="mortTotal" style="text-align: right; width: 82px;" title="Mortalidad Total de la sala (Mort. Acum. + Mort. Act.)">Mort. Tot.</th>
              <th class="th-sortable text-right ${getSortClass('mortDia')}" data-sort="mortDia" style="text-align: right; width: 74px;" title="Mortalidad del Día de la sala (Módulo MPD · ${mpdRefLabel || 'Último'})">Mort. Día</th>
              <th class="th-sortable text-right ${getSortClass('pctMpd')}" data-sort="pctMpd" style="text-align: right; width: 68px;" title="Porcentaje MPD Total sobre LNV">% MPD</th>
              <th class="th-sortable text-right ${getSortClass('pesoX')}" data-sort="pesoX" style="text-align: right; width: 68px;">Peso X</th>
              <th class="th-sortable text-center ${getSortClass('estatus')}" data-sort="estatus" style="text-align: center; width: 80px;" title="Estatus respecto a Destetes: Dttada o Activas">Estatus</th>
              <th style="text-align: center; width: 76px;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid #cbd5e1;">
              <td colspan="5" style="text-align: left; padding-left: 1rem; color: #334155;">
                TOTALES / PROMEDIOS (${areaCode === 'EST' ? 'ESTABLECIDA' : 'EXPANSIÓN'} · ${summary.count} lotes)
              </td>
              <td style="text-align: right; color: #0f172a;">${fmtInt(summary.partos)}</td>
              <td style="text-align: right; color: #047857;">${fmtInt(summary.lnv)}</td>
              <td style="text-align: right; color: #d97706;">${fmtInt(summary.lnm)}</td>
              <td style="text-align: right; color: #7c3aed;">${fmtInt(summary.lnMo)}</td>
              <td style="text-align: right; color: #dc2626;">${fmtInt(summary.mpdAlCierre)}</td>
              <td style="text-align: right; color: #475569;" title="Mortalidad acumulada meses cerrados">${fmtInt(summary.mortAcum)}</td>
              <td style="text-align: right; color: #c2410c;" title="Mortalidad mes abierto">${fmtInt(summary.mortActual)}</td>
              <td style="text-align: right; color: #be123c;" title="Mortalidad total acumulada">${fmtInt(summary.mortTotal)}</td>
              <td style="text-align: right; color: #b45309;" title="Mortalidad total del día (${mpdRefLabel || 'MPD'})">${fmtInt(summary.mortDia)}</td>
              <td style="text-align: right; color: #be123c;" title="% MPD Total sobre LNV">${fmtDec(summary.pctMortAcum)}%</td>
              <td style="text-align: right; color: #0369a1;">${fmtDec(summary.avgPesoX)}</td>
              <td style="text-align: center; font-size: 0.72rem; color: #475569; white-space: nowrap;">${summary.activasCount} Act. / ${summary.dttadasCount} Dtt.</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  },

  /**
   * Renderiza los gráficos comparativos entre Establecida y Expansión
   */
  renderCharts(chartData) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js no disponible.');
      return;
    }

    // Destruir instancias previas
    Object.keys(this._chartInstances).forEach(k => {
      if (this._chartInstances[k]) {
        this._chartInstances[k].destroy();
      }
    });
    this._chartInstances = {};

    const { estSummary, expSummary, establecidaSeries, expansionSeries } = chartData;

    // 1. Comparativa EST vs EXP
    const ctxComp = document.getElementById('chart-maternidad-comparativa');
    if (ctxComp) {
      this._chartInstances.comparativa = new Chart(ctxComp, {
        type: 'bar',
        data: {
          labels: ['Partos', 'LNV (÷10)', 'LNM', 'Momias (LNMo)', 'MPD Cierre', 'Mort. Total'],
          datasets: [
            {
              label: 'Establecida (EST)',
              data: [estSummary.partos, Math.round(estSummary.lnv / 10), estSummary.lnm, estSummary.lnMo, estSummary.mpdAlCierre, estSummary.mortTotal],
              backgroundColor: 'rgba(16, 185, 129, 0.78)',
              borderColor: '#059669',
              borderWidth: 1,
              borderRadius: 6
            },
            {
              label: 'Expansión (EXP)',
              data: [expSummary.partos, Math.round(expSummary.lnv / 10), expSummary.lnm, expSummary.lnMo, expSummary.mpdAlCierre, expSummary.mortTotal],
              backgroundColor: 'rgba(99, 102, 241, 0.78)',
              borderColor: '#4f46e5',
              borderWidth: 1,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    // 2. Peso Promedio (Peso X)
    const ctxPeso = document.getElementById('chart-maternidad-peso');
    if (ctxPeso) {
      const estPesos = establecidaSeries.pesoX.filter(v => v !== null);
      const expPesos = expansionSeries.pesoX.filter(v => v !== null);
      const maxLen = Math.max(estPesos.length, expPesos.length);
      const labels = Array.from({ length: maxLen }, (_, i) => `Lote ${i + 1}`);

      this._chartInstances.peso = new Chart(ctxPeso, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Establecida (Peso X kg)',
              data: estPesos,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              tension: 0.3,
              fill: true,
              pointRadius: 4
            },
            {
              label: 'Expansión (Peso X kg)',
              data: expPesos,
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              tension: 0.3,
              fill: true,
              pointRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              suggestedMin: 1.2,
              suggestedMax: 1.5
            }
          }
        }
      });
    }

    // 3. Salas Establecida (EST)
    const ctxEst = document.getElementById('chart-maternidad-est-salas');
    if (ctxEst) {
      this._chartInstances.estSalas = new Chart(ctxEst, {
        type: 'bar',
        data: {
          labels: establecidaSeries.labels,
          datasets: [
            {
              label: 'LNV',
              data: establecidaSeries.lnv,
              backgroundColor: 'rgba(16, 185, 129, 0.75)',
              borderRadius: 4
            },
            {
              label: 'MPD al Cierre',
              data: establecidaSeries.mpd,
              backgroundColor: 'rgba(245, 158, 11, 0.8)',
              borderRadius: 4
            },
            {
              label: 'Mort. Total (MPD)',
              data: establecidaSeries.mortTotal || establecidaSeries.mortAcum || [],
              backgroundColor: 'rgba(225, 29, 72, 0.82)',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // 4. Salas Expansión (EXP)
    const ctxExp = document.getElementById('chart-maternidad-exp-salas');
    if (ctxExp) {
      this._chartInstances.expSalas = new Chart(ctxExp, {
        type: 'bar',
        data: {
          labels: expansionSeries.labels,
          datasets: [
            {
              label: 'LNV',
              data: expansionSeries.lnv,
              backgroundColor: 'rgba(99, 102, 241, 0.75)',
              borderRadius: 4
            },
            {
              label: 'MPD al Cierre',
              data: expansionSeries.mpd,
              backgroundColor: 'rgba(245, 158, 11, 0.8)',
              borderRadius: 4
            },
            {
              label: 'Mort. Total (MPD)',
              data: expansionSeries.mortTotal || expansionSeries.mortAcum || [],
              backgroundColor: 'rgba(225, 29, 72, 0.82)',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  }
};

