/**
 * HembrasView: Vista idéntica en tema oscuro (Slate-950/Slate-900),
 * tabla tipo Excel interactiva/editable celda por celda y gráficas analíticas.
 */
window.App = window.App || {};
window.App.Views = window.App.Views || {};

window.App.Views.Hembras = {
  currentTab: 'table', // 'table' | 'dia' | 'semana' | 'paridad'
  currentChartType: 'dia',
  chartInstance: null,
  celdaActual: { fila: 0, col: 0 },
  paginaActual: 1,
  filasPorPagina: 50,
  filtrosPlegados: false,

  CAMPOS: ['fecha', 'idAnimal', 'genetica', 'estatus', 'causa', 'lugar', 'paridad', 'semana', 'dia'],
  LETRAS: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
  DIAS_CANONICOS: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],

  COLS_SELECT: {
    2: ['Yorkshire', 'F1', 'Landrace', 'Pietrain', 'Duroc'],
    3: ['GESTANTE', 'LACTANTE', 'DESTETADA', 'LECHONA', 'DESCARTE'],
    8: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  },

  getStatusColor(status) {
    const s = String(status || '').toUpperCase();
    if (s.includes('DESTETADA')) return '#fbbf24';
    if (s.includes('LACTANTE')) return '#9ca3af';
    if (s.includes('GESTANTE')) return '#dc2626';
    if (s.includes('LECHONA')) return '#10b981';
    if (s.includes('DESCARTE')) return '#c084fc';
    return '#3b82f6';
  },

  normalizarDia(diaRaw, fechaRaw) {
    const s = String(diaRaw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (s.includes('lun')) return 'Lunes';
    if (s.includes('mar')) return 'Martes';
    if (s.includes('mie')) return 'Miércoles';
    if (s.includes('jue')) return 'Jueves';
    if (s.includes('vie')) return 'Viernes';
    if (s.includes('sab')) return 'Sábado';
    if (s.includes('dom')) return 'Domingo';

    if (fechaRaw) {
      const p = String(fechaRaw).split('-');
      if (p.length === 3) {
        const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
        if (!isNaN(d.getTime())) {
          const mapJS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          return mapJS[d.getDay()];
        }
      }
    }
    return String(diaRaw || '').trim();
  },

  renderLayout() {
    return `
      <div class="hembras-dark-theme" style="background: #020617; color: #f8fafc; border-radius: 14px; padding: 16px; margin-bottom: 24px; font-family: inherit;">
        
        <!-- ESTILOS OSCUROS ESPECÍFICOS DE LA GRILLA TIPO EXCEL -->
        <style>
          .hembras-dark-theme * { box-sizing: border-box; }
          .h-grid-wrapper {
            overflow: auto;
            max-height: calc(100vh - 280px);
            border-radius: 10px;
            background: #090d16;
            border: 1px solid #1e293b;
          }
          .h-data-table {
            border-collapse: collapse;
            width: 100%;
            font-size: 12px;
          }
          .h-data-table thead th {
            position: sticky;
            top: 0;
            z-index: 10;
            background: #020617;
            color: #94a3b8;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 10px 8px;
            border-bottom: 2px solid #1e293b;
            border-right: 1px solid #1e293b;
            white-space: nowrap;
            user-select: none;
          }
          .h-data-table thead th:first-child,
          .h-data-table tbody td:first-child {
            position: sticky;
            left: 0;
            z-index: 11;
            background: #020617;
            width: 44px;
            min-width: 44px;
            text-align: center;
            color: #475569;
            font-weight: 700;
            border-right: 2px solid #1e293b;
          }
          .h-data-table thead th:first-child { z-index: 12; }
          .h-data-table tbody td {
            border-bottom: 1px solid #1e293b;
            border-right: 1px solid #1e293b;
            padding: 0;
            background: #0f172a;
            height: 32px;
            vertical-align: middle;
          }
          .h-data-table tbody tr:nth-child(odd) td { background: #0d1829; }
          .h-data-table tbody tr:nth-child(odd) td:first-child { background: #020617; }
          .h-data-table tbody td input,
          .h-data-table tbody td select {
            width: 100%;
            height: 100%;
            background: transparent;
            border: none;
            outline: none;
            color: #e2e8f0;
            padding: 4px 8px;
            font-size: 12px;
            cursor: cell;
          }
          .h-data-table tbody td select { cursor: pointer; }
          .h-data-table tbody td select option { background: #0f172a; color: #e2e8f0; }
          .h-data-table tbody td.cell-active {
            box-shadow: inset 0 0 0 2px #3b82f6;
            background: #1e3a5f !important;
            z-index: 2;
          }
          .h-data-table tbody td.cell-active input,
          .h-data-table tbody td.cell-active select { color: #ffffff; }
        </style>

        <!-- HEADER OSCURO DEL MÓDULO -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
          <div>
            <h1 style="font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 0; color: #f8fafc; letter-spacing: 0.5px;">
              Mortalidad de Hembras
            </h1>
            <p style="font-size: 12px; color: #94a3b8; margin: 2px 0 0 0;">
              Sistema de Registro Editable tipo Excel, Importación y Gráficas
            </p>
          </div>

          <!-- BOTONES DE ACCIÓN SUPERIOR -->
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <!-- Badge Nube -->
            <button type="button" id="btn-h-cloud-status" style="display: flex; align-items: center; gap: 6px; font-size: 11px; padding: 6px 12px; border-radius: 9999px; background: rgba(15, 23, 42, 0.8); border: 1px solid #1e293b; color: #cbd5e1; cursor: pointer;">
              <span id="h-cloud-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #64748b; display: inline-block;"></span>
              <span id="h-cloud-label">Conectando...</span>
            </button>

            <!-- Actualizar de Sheets -->
            <button type="button" id="btn-h-sync-pull" style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; background: #1e293b; border: 1px solid #334155; color: #f1f5f9; cursor: pointer;" title="Actualizar desde Google Sheets">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
              Actualizar
            </button>

            <!-- Configurar Sheets -->
            <button type="button" id="btn-h-config-sheets" style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; background: #1e293b; border: 1px solid #334155; color: #cbd5e1; cursor: pointer;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Nube
            </button>

            <!-- IMPORTAR EXCEL -->
            <input type="file" id="input-h-import-excel" accept=".xlsx, .xls" style="display: none;">
            <label for="input-h-import-excel" style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; background: rgba(30, 58, 138, 0.4); border: 1px solid rgba(59, 130, 246, 0.4); color: #93c5fd; cursor: pointer;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              Importar Excel
            </label>

            <!-- EXPORTAR EXCEL -->
            <button type="button" id="btn-h-export-excel" style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; background: rgba(6, 78, 59, 0.4); border: 1px solid rgba(16, 185, 129, 0.4); color: #6ee7b7; cursor: pointer;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Exportar
            </button>

            <!-- GUARDAR TODO -->
            <button type="button" id="btn-h-save-all" style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 8px; background: #2563eb; color: #ffffff; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Guardar
            </button>
          </div>
        </div>

        <!-- BARRA RÁPIDA DE PESTAÑAS (TABLA / GRÁFICA DÍA / GRÁFICA SEMANA / GRÁFICA PARIDAD) -->
        <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 10px; margin-bottom: 14px; border-bottom: 1px solid #1e293b;">
          <button type="button" class="h-nav-tab active" data-tab="table" style="display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; background: #2563eb; color: #fff;">
            Tabla de Datos
          </button>
          <button type="button" class="h-nav-tab" data-tab="dia" style="display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid #1e293b; background: #0f172a; color: #94a3b8;">
            Gráfica Día
          </button>
          <button type="button" class="h-nav-tab" data-tab="semana" style="display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid #1e293b; background: #0f172a; color: #94a3b8;">
            Gráfica Semana
          </button>
          <button type="button" class="h-nav-tab" data-tab="paridad" style="display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid #1e293b; background: #0f172a; color: #94a3b8;">
            Gráfica Paridad
          </button>
        </div>

        <!-- ==============================================
             SECCIÓN 1: TABLA TIPO EXCEL (EDITABLE DIRECTAMENTE)
             ============================================== -->
        <div id="h-sec-table" style="display: block;">
          <!-- INGRESO RÁPIDO OSCURO -->
          <div style="background: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 14px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #34d399; letter-spacing: 0.5px;">
                + Agregar Registro Manual
              </span>
              <span id="h-unsaved-badge" style="display: none; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4);">
                ● Cambios sin guardar
              </span>
            </div>

            <form id="form-h-quick-entry" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)) 90px; gap: 8px; align-items: end;">
              <div>
                <label style="font-size: 10px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 3px;">Fecha</label>
                <input type="date" id="hqe-fecha" required style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #f8fafc; font-size: 12px; border-radius: 6px; padding: 5px 8px; outline: none;">
              </div>
              <div>
                <label style="font-size: 10px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 3px;">ID Animal</label>
                <input type="text" id="hqe-id" placeholder="Ej: ZY00407" required style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #f8fafc; font-size: 12px; border-radius: 6px; padding: 5px 8px; outline: none; text-transform: uppercase;">
              </div>
              <div>
                <label style="font-size: 10px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 3px;">Genética</label>
                <select id="hqe-genetica" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #f8fafc; font-size: 12px; border-radius: 6px; padding: 5px 8px; outline: none;">
                  <option value="Yorkshire">Yorkshire</option>
                  <option value="F1">F1</option>
                  <option value="Landrace">Landrace</option>
                  <option value="Pietrain">Pietrain</option>
                  <option value="Duroc">Duroc</option>
                </select>
              </div>
              <div>
                <label style="font-size: 10px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 3px;">Estatus</label>
                <select id="hqe-estatus" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #f8fafc; font-size: 12px; border-radius: 6px; padding: 5px 8px; outline: none;">
                  <option value="GESTANTE">GESTANTE</option>
                  <option value="LACTANTE">LACTANTE</option>
                  <option value="DESTETADA">DESTETADA</option>
                  <option value="LECHONA">LECHONA</option>
                  <option value="DESCARTE">DESCARTE</option>
                </select>
              </div>
              <div>
                <label style="font-size: 10px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 3px;">Causa</label>
                <input type="text" id="hqe-causa" placeholder="Causa..." required style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #f8fafc; font-size: 12px; border-radius: 6px; padding: 5px 8px; outline: none;">
              </div>
              <div>
                <label style="font-size: 10px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 3px;">Lugar</label>
                <input type="text" id="hqe-lugar" placeholder="Ej: EXP" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #f8fafc; font-size: 12px; border-radius: 6px; padding: 5px 8px; outline: none; text-transform: uppercase;">
              </div>
              <div>
                <label style="font-size: 10px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 3px;">Paridad</label>
                <input type="number" id="hqe-paridad" min="0" placeholder="Ej: 2" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #f8fafc; font-size: 12px; border-radius: 6px; padding: 5px 8px; outline: none;">
              </div>
              <div>
                <label style="font-size: 10px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 3px;">Semana</label>
                <input type="number" id="hqe-semana" min="1" max="53" required placeholder="Ej: 2" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #f8fafc; font-size: 12px; border-radius: 6px; padding: 5px 8px; outline: none;">
              </div>
              <div>
                <label style="font-size: 10px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 3px;">Día</label>
                <select id="hqe-dia" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #f8fafc; font-size: 12px; border-radius: 6px; padding: 5px 8px; outline: none;">
                  <option value="Lunes">Lunes</option>
                  <option value="Martes">Martes</option>
                  <option value="Miércoles">Miércoles</option>
                  <option value="Jueves">Jueves</option>
                  <option value="Viernes">Viernes</option>
                  <option value="Sábado">Sábado</option>
                  <option value="Domingo">Domingo</option>
                </select>
              </div>
              <button type="submit" style="height: 31px; background: #059669; hover:bg-emerald-500; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                + Añadir
              </button>
            </form>
          </div>

          <!-- BARRA DE INFORMACIÓN DE CELDA, BUSCADOR Y PAGINACIÓN -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; background: #090d16; border: 1px solid #1e293b; padding: 8px 12px; border-radius: 10px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="h-cell-ref" style="font-family: monospace; font-size: 11px; color: #38bdf8; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.2); padding: 2px 6px; border-radius: 4px;">A1</span>
              <span id="h-cell-value" style="font-family: monospace; font-size: 12px; color: #cbd5e1; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">—</span>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <input type="text" id="h-table-search" placeholder="Buscar ID, sem, causa..." style="background: #0f172a; border: 1px solid #334155; color: #f8fafc; font-size: 11px; border-radius: 6px; padding: 4px 8px; width: 170px; outline: none;">

              <div style="display: flex; align-items: center; gap: 4px; background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 2px 4px;">
                <button type="button" id="btn-h-prev-page" style="background: none; border: none; color: #cbd5e1; cursor: pointer; padding: 2px 6px; font-size: 11px;">◀</button>
                <span id="h-page-info" style="font-family: monospace; font-size: 10px; color: #cbd5e1;">Pág 1/1</span>
                <button type="button" id="btn-h-next-page" style="background: none; border: none; color: #cbd5e1; cursor: pointer; padding: 2px 6px; font-size: 11px;">▶</button>
              </div>

              <button type="button" id="btn-h-add-5-rows" style="font-size: 11px; background: #1e293b; color: #f1f5f9; border: 1px solid #334155; padding: 4px 8px; border-radius: 6px; cursor: pointer;">
                + 5 Filas
              </button>
              <button type="button" id="btn-h-clean-empty" style="font-size: 11px; background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 4px 8px; border-radius: 6px; cursor: pointer;">
                Limpiar Vacías
              </button>
            </div>
          </div>

          <!-- TABLA INTERACTIVA TIPO EXCEL -->
          <div class="h-grid-wrapper">
            <table class="h-data-table" id="h-data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>FECHA</th>
                  <th>ID</th>
                  <th>GENÉTICA</th>
                  <th>ESTATUS</th>
                  <th>CAUSA</th>
                  <th>LUGAR</th>
                  <th>PARIDAD</th>
                  <th>SEMANA</th>
                  <th>DÍA</th>
                  <th style="text-align: center;">ACCIONES</th>
                </tr>
              </thead>
              <tbody id="h-data-tbody">
                <!-- Generado dinámicamente -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- ==============================================
             SECCIÓN 2: GRÁFICAS Y FILTROS CRUZADOS ESTILO POWER BI
             ============================================== -->
        <div id="h-sec-charts" style="display: none;">
          <!-- TARJETA PRINCIPAL DE LA GRÁFICA -->
          <div style="background: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">
              <div>
                <h3 id="h-chart-title" style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #ffffff; margin: 0;">
                  REPORTE: MORTALIDAD POR DÍA
                </h3>
                <p id="h-chart-subtitle" style="font-size: 11px; color: #34d399; font-weight: 600; margin: 2px 0 0 0;">
                  Total: 0 hembras
                </p>
              </div>
              <button type="button" id="btn-h-download-chart-img" style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; padding: 6px 12px; background: #2563eb; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                Descargar Imagen
              </button>
            </div>

            <div style="position: relative; width: 100%; height: 380px;">
              <canvas id="h-main-chart"></canvas>
            </div>

            <!-- Mini Tabla Resumen debajo de la gráfica -->
            <div id="h-chart-summary-table" style="overflow-x: auto; margin-top: 14px; padding-top: 10px; border-top: 1px solid #1e293b;"></div>
          </div>

          <!-- PANEL DE FILTROS CRUZADOS ESTILO POWER BI -->
          <div style="background: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #e2e8f0; letter-spacing: 0.5px;">
                Segmentación de Datos (Filtros Interactivos)
              </span>
              <button type="button" id="btn-h-clear-all-filters" style="font-size: 10px; background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 3px 8px; border-radius: 6px; cursor: pointer;">
                Limpiar Filtros
              </button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
              <div>
                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 6px;">SEMANA</label>
                <div id="hpill-semana" style="display: flex; flex-wrap: wrap; gap: 4px; max-height: 90px; overflow-y: auto;"></div>
              </div>
              <div>
                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 6px;">ESTATUS</label>
                <div id="hpill-estatus" style="display: flex; flex-wrap: wrap; gap: 4px;"></div>
              </div>
              <div>
                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 6px;">GENÉTICA</label>
                <div id="hpill-genetica" style="display: flex; flex-wrap: wrap; gap: 4px;"></div>
              </div>
              <div>
                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 6px;">CAUSA DE MUERTE</label>
                <div id="hpill-causa" style="display: flex; flex-wrap: wrap; gap: 4px; max-height: 90px; overflow-y: auto;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- MODAL DE GOOGLE SHEETS -->
        <div id="modal-h-sheets" style="display: none; position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); align-items: center; justify-content: center; padding: 16px;">
          <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; max-width: 520px; width: 100%; padding: 20px; color: #f8fafc;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="font-size: 15px; font-weight: 700; margin: 0;">Conexión a Google Sheets (Apps Script)</h3>
              <button type="button" id="btn-close-h-modal-sheets" style="background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer;">&times;</button>
            </div>
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin-bottom: 14px;">
              Sincroniza tus registros con la hoja <strong>"CHAT MUERTES"</strong> de Google Sheets. El sistema guardará los datos tanto en tu equipo como en la nube.
            </p>
            <div style="margin-bottom: 14px;">
              <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #cbd5e1; display: block; margin-bottom: 4px;">URL WebApp de Apps Script</label>
              <input type="url" id="input-h-gas-url" placeholder="https://script.google.com/macros/s/.../exec" style="width: 100%; background: #020617; border: 1px solid #334155; color: #f8fafc; font-size: 12px; border-radius: 6px; padding: 8px; outline: none;">
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px;">
              <button type="button" id="btn-cancel-h-sheets" style="padding: 6px 12px; border-radius: 6px; background: #1e293b; color: #cbd5e1; border: 1px solid #334155; font-size: 12px; cursor: pointer;">Cancelar</button>
              <button type="button" id="btn-save-h-sheets" style="padding: 6px 14px; border-radius: 6px; background: #2563eb; color: #fff; border: none; font-size: 12px; font-weight: 700; cursor: pointer;">Guardar y Conectar</button>
            </div>
          </div>
        </div>

      </div>
    `;
  }
};
