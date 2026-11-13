/**
 * HembrasController: Controlador del Módulo de Mortalidad de Hembras
 * Soporta edición celda a celda con teclado/focus, importación de Excel, exportación,
 * sincronización con Google Sheets y visualización con filtros cruzados estilo Power BI.
 */
window.App = window.App || {};
window.App.Controllers = window.App.Controllers || {};

window.App.Controllers.Hembras = {
  model: window.App.Models.Hembras,
  view: window.App.Views.Hembras,

  dataFilas: [],
  cambiosPendientes: false,
  textoBusquedaTabla: '',
  paginaActualTabla: 1,
  FILAS_POR_PAGINA: 50,
  celdaActual: { fila: 0, col: 0 },

  activeFilters: {
    semana: [],
    estatus: [],
    genetica: [],
    causa: []
  },

  currentChartType: 'dia', // 'dia' | 'semana' | 'paridad'
  currentChartInstance: null,
  autoSyncTimer: null,

  async init(subView = 'table') {
    await this.model.init();
    const container = document.getElementById('view-hembras');
    if (container) {
      container.innerHTML = this.view.renderLayout();
    }

    await this.loadData();
    this.bindEvents();
    this.switchView(subView === 'charts' ? 'dia' : subView);
    this.iniciarSincronizacionAutomatica();
  },

  iniciarSincronizacionAutomatica() {
    if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);

    // Sincronización en segundo plano cada 30 segundos
    this.autoSyncTimer = setInterval(async () => {
      // Solo sincronizar si no hay edición activa sin guardar y el usuario está online
      if (!this.cambiosPendientes && navigator.onLine && this.model.gasWebAppUrl) {
        await this.sincronizarDesdeSheets(false);
      }
    }, 30000);

    // Sincronizar automáticamente cuando el usuario regresa a la pestaña (visibilidad)
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && !this.cambiosPendientes && navigator.onLine && this.model.gasWebAppUrl) {
        await this.sincronizarDesdeSheets(false);
      }
    });
  },

  generarFilasVacias(n = 20) {
    return Array.from({ length: n }, () => ({
      fecha: '', idAnimal: '', genetica: '', estatus: '',
      causa: '', lugar: '', paridad: '', semana: '', dia: '', guardado: false
    }));
  },

  filaTieneDatos(f) {
    if (!f) return false;
    return !!(f.idAnimal || f.fecha || f.causa || f.lugar || (f.semana !== '' && f.semana !== undefined));
  },

  async loadData() {
    const raw = await this.model.getAll();
    if (raw && raw.length > 0) {
      this.dataFilas = raw.map((r, i) => ({ ...r, fila: i, guardado: true }));
      this.dataFilas.push(...this.generarFilasVacias(10));
    } else {
      this.dataFilas = this.generarFilasVacias(30);
    }

    this.actualizarIndicadorNube();
    this.renderizarGrilla();

    // Sincronizar inmediatamente al abrir la vista sin esperar que el usuario toque nada
    if (navigator.onLine && this.model.gasWebAppUrl) {
      this.sincronizarDesdeSheets(false);
    }
  },

  actualizarIndicadorNube(estado = null, texto = null) {
    const dot = document.getElementById('h-cloud-dot');
    const label = document.getElementById('h-cloud-label');
    if (!dot || !label) return;

    if (!estado) {
      if (!this.model.gasWebAppUrl) estado = 'local';
      else if (navigator.onLine) estado = 'conectado';
      else estado = 'error';
    }

    if (estado === 'conectado') {
      dot.style.background = '#34d399';
      label.textContent = texto || `Google Sheets (${this.dataFilas.filter(f => this.filaTieneDatos(f)).length} reg.)`;
    } else if (estado === 'sincronizando') {
      dot.style.background = '#fbbf24';
      label.textContent = texto || 'Sincronizando con Sheets...';
    } else if (estado === 'error') {
      dot.style.background = '#f43f5e';
      label.textContent = texto || 'Modo Offline (Sin red)';
    } else {
      dot.style.background = '#64748b';
      label.textContent = texto || 'Modo Local (Configurar Nube)';
    }
  },

  bindEvents() {
    // Cambio de pestañas
    document.querySelectorAll('.h-nav-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.switchView(tab);
      });
    });

    // Guardar Todo (Ctrl + S y botón)
    const btnSaveAll = document.getElementById('btn-h-save-all');
    if (btnSaveAll) btnSaveAll.addEventListener('click', () => this.guardarTodo());

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        const secTable = document.getElementById('h-sec-table');
        if (secTable && secTable.style.display !== 'none') {
          e.preventDefault();
          this.guardarTodo();
        }
      }
    });

    // Importar Excel
    const inputImport = document.getElementById('input-h-import-excel');
    if (inputImport) {
      inputImport.addEventListener('change', (e) => this.importarExcel(e));
    }

    // Exportar Excel
    const btnExport = document.getElementById('btn-h-export-excel');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportarExcel());
    }

    // Descargar Imagen Gráfica
    const btnDownloadImg = document.getElementById('btn-h-download-chart-img');
    if (btnDownloadImg) {
      btnDownloadImg.addEventListener('click', () => this.descargarGrafica());
    }

    // Paginación y filas
    const btnPrev = document.getElementById('btn-h-prev-page');
    const btnNext = document.getElementById('btn-h-next-page');
    if (btnPrev) btnPrev.addEventListener('click', () => this.cambiarPagina(-1));
    if (btnNext) btnNext.addEventListener('click', () => this.cambiarPagina(1));

    const btnAdd5 = document.getElementById('btn-h-add-5-rows');
    if (btnAdd5) btnAdd5.addEventListener('click', () => this.agregarFilas(5));

    const btnClean = document.getElementById('btn-h-clean-empty');
    if (btnClean) btnClean.addEventListener('click', () => this.limpiarVacias());

    // Buscador en tabla
    const searchInput = document.getElementById('h-table-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.textoBusquedaTabla = e.target.value.toLowerCase().trim();
        this.paginaActualTabla = 1;
        this.renderizarGrilla();
      });
    }

    // Formulario de ingreso rápido
    const formQuick = document.getElementById('form-h-quick-entry');
    if (formQuick) {
      formQuick.addEventListener('submit', (e) => this.agregarRegistroRapido(e));
    }

    // Actualizar de Sheets
    const btnPull = document.getElementById('btn-h-sync-pull');
    if (btnPull) {
      btnPull.addEventListener('click', () => this.sincronizarDesdeSheets(true));
    }

    // Modal Sheets
    const btnCloudStatus = document.getElementById('btn-h-cloud-status');
    const btnConfigSheets = document.getElementById('btn-h-config-sheets');
    const modalSheets = document.getElementById('modal-h-sheets');
    const btnCloseModal = document.getElementById('btn-close-h-modal-sheets');
    const btnCancelModal = document.getElementById('btn-cancel-h-sheets');
    const btnSaveSheetsUrl = document.getElementById('btn-save-h-sheets');
    const inputGasUrl = document.getElementById('input-h-gas-url');

    const openModal = () => {
      if (inputGasUrl) inputGasUrl.value = this.model.gasWebAppUrl || '';
      if (modalSheets) modalSheets.style.display = 'flex';
    };
    const closeModal = () => {
      if (modalSheets) modalSheets.style.display = 'none';
    };

    if (btnCloudStatus) btnCloudStatus.addEventListener('click', openModal);
    if (btnConfigSheets) btnConfigSheets.addEventListener('click', openModal);
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

    if (btnSaveSheetsUrl) {
      btnSaveSheetsUrl.addEventListener('click', async () => {
        const url = inputGasUrl ? inputGasUrl.value.trim() : '';
        await this.model.setConfig('gas_webapp_url', url);
        closeModal();
        if (url) {
          window.App.Utils.Notification.success('URL guardada. Conectando...');
          await this.sincronizarDesdeSheets(true);
        } else {
          this.actualizarIndicadorNube('local', 'Modo Local');
          window.App.Utils.Notification.info('Modo Local activado.');
        }
      });
    }

    // Limpiar todos los filtros de gráficas
    const btnClearFilters = document.getElementById('btn-h-clear-all-filters');
    if (btnClearFilters) {
      btnClearFilters.addEventListener('click', () => {
        this.activeFilters = { semana: [], estatus: [], genetica: [], causa: [] };
        this.updateFiltersUI();
        this.renderChart();
      });
    }
  },

  switchView(tabName) {
    document.querySelectorAll('.h-nav-tab').forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === tabName;
      if (isTarget) {
        btn.classList.add('active');
        btn.style.background = '#2563eb';
        btn.style.color = '#ffffff';
        btn.style.border = 'none';
      } else {
        btn.classList.remove('active');
        btn.style.background = '#0f172a';
        btn.style.color = '#94a3b8';
        btn.style.border = '1px solid #1e293b';
      }
    });

    const secTable = document.getElementById('h-sec-table');
    const secCharts = document.getElementById('h-sec-charts');

    if (tabName === 'table') {
      if (secTable) secTable.style.display = 'block';
      if (secCharts) secCharts.style.display = 'none';
      this.renderizarGrilla();
    } else {
      if (secTable) secTable.style.display = 'none';
      if (secCharts) secCharts.style.display = 'block';
      this.currentChartType = tabName; // 'dia', 'semana', 'paridad'

      const titles = {
        dia: 'REPORTE: MORTALIDAD POR DÍA',
        semana: 'REPORTE: MORTALIDAD POR SEMANA',
        paridad: 'REPORTE: MORTALIDAD POR PARIDAD'
      };
      const titleEl = document.getElementById('h-chart-title');
      if (titleEl) titleEl.textContent = titles[tabName] || 'REPORTE DE MORTALIDAD';

      this.updateFiltersUI();
      this.renderChart();
    }
  },

  renderizarGrilla() {
    const tbody = document.getElementById('h-data-tbody');
    if (!tbody) return;

    let filasAMostrar = [];
    if (!this.textoBusquedaTabla) {
      filasAMostrar = this.dataFilas.map((f, i) => i);
    } else {
      filasAMostrar = this.dataFilas
        .map((f, i) => ({ f, i }))
        .filter(({ f }) => {
          if (!this.filaTieneDatos(f)) return false;
          const txt = `${f.fecha} ${f.idAnimal} ${f.genetica} ${f.estatus} ${f.causa} ${f.lugar} ${f.paridad} ${f.semana} ${f.dia}`.toLowerCase();
          return txt.includes(this.textoBusquedaTabla);
        })
        .map(({ i }) => i);
    }

    const totalPaginas = Math.max(1, Math.ceil(filasAMostrar.length / this.FILAS_POR_PAGINA));
    if (this.paginaActualTabla > totalPaginas) this.paginaActualTabla = totalPaginas;

    const inicio = (this.paginaActualTabla - 1) * this.FILAS_POR_PAGINA;
    const indicesPagina = filasAMostrar.slice(inicio, inicio + this.FILAS_POR_PAGINA);

    const pageInfo = document.getElementById('h-page-info');
    if (pageInfo) pageInfo.textContent = `Pág ${this.paginaActualTabla}/${totalPaginas} (${filasAMostrar.length})`;

    const fragment = document.createDocumentFragment();

    indicesPagina.forEach((idx) => {
      const fila = this.dataFilas[idx];
      const tr = document.createElement('tr');
      tr.dataset.filaIdx = idx;
      if (this.filaTieneDatos(fila)) tr.classList.add('has-data');

      // #
      const tdNum = document.createElement('td');
      tdNum.textContent = idx + 1;
      tr.appendChild(tdNum);

      // Celdas de campos editables
      this.view.CAMPOS.forEach((campo, colIdx) => {
        const td = document.createElement('td');
        td.dataset.col = colIdx;
        td.dataset.fila = idx;

        let input;
        if (this.view.COLS_SELECT[colIdx]) {
          input = document.createElement('select');
          this.view.COLS_SELECT[colIdx].forEach(op => {
            const opt = document.createElement('option');
            opt.value = op;
            opt.textContent = op || '—';
            if (fila[campo] === op) opt.selected = true;
            input.appendChild(opt);
          });
        } else {
          input = document.createElement('input');
          input.type = (campo === 'fecha') ? 'date' : 'text';
          input.value = fila[campo] || '';
          input.autocomplete = 'off';
          input.spellcheck = false;
        }

        input.dataset.col = colIdx;
        input.dataset.fila = idx;

        // Eventos celda por celda
        input.addEventListener('focus', (e) => this.onCellFocus(e));
        input.addEventListener('input', (e) => this.onCellInput(e));
        input.addEventListener('change', (e) => this.onCellInput(e));
        input.addEventListener('keydown', (e) => this.onCellKeyDown(e));

        td.appendChild(input);
        tr.appendChild(td);
      });

      // Acciones (Eliminar)
      const tdAcciones = document.createElement('td');
      tdAcciones.style.textAlign = 'center';
      if (this.filaTieneDatos(fila)) {
        tdAcciones.innerHTML = `
          <button type="button" class="btn-del-h-row" data-idx="${idx}" style="background: none; border: none; color: #f43f5e; cursor: pointer; padding: 4px;" title="Eliminar Fila">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        `;
      }
      tr.appendChild(tdAcciones);

      fragment.appendChild(tr);
    });

    tbody.replaceChildren(fragment);

    // Delegación borrar
    tbody.querySelectorAll('.btn-del-h-row').forEach(b => {
      b.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
        this.eliminarRegistro(idx);
      });
    });

    this.resaltarCeldaActiva();
  },

  onCellFocus(e) {
    const target = e.target;
    const col = parseInt(target.dataset.col);
    const fila = parseInt(target.dataset.fila);
    this.celdaActual = { fila, col };
    this.resaltarCeldaActiva();

    const cellRef = document.getElementById('h-cell-ref');
    const cellVal = document.getElementById('h-cell-value');
    if (cellRef) cellRef.textContent = `${this.view.LETRAS[col]}${fila + 1}`;
    if (cellVal) cellVal.textContent = target.value || '—';
  },

  onCellInput(e) {
    const target = e.target;
    const col = parseInt(target.dataset.col);
    const fila = parseInt(target.dataset.fila);
    const reg = this.dataFilas[fila];
    if (!reg) return;

    reg[this.view.CAMPOS[col]] = target.value;
    this.marcarCambios();

    const cellVal = document.getElementById('h-cell-value');
    if (cellVal) cellVal.textContent = target.value || '—';

    const tr = target.closest('tr');
    if (tr && this.filaTieneDatos(reg)) tr.classList.add('has-data');
  },

  onCellKeyDown(e) {
    const target = e.target;
    const col = parseInt(target.dataset.col);
    const fila = parseInt(target.dataset.fila);
    let nF = fila, nC = col, capturar = false;
    const totalF = this.dataFilas.length;

    switch (e.key) {
      case 'Enter':
      case 'ArrowDown':
        nF = fila + 1;
        if (nF >= totalF) this.agregarFilas(5, true);
        capturar = true;
        break;
      case 'ArrowUp':
        nF = Math.max(0, fila - 1);
        capturar = true;
        break;
      case 'Tab':
        if (e.shiftKey) {
          if (col > 0) nC = col - 1;
          else if (fila > 0) { nF = fila - 1; nC = this.view.CAMPOS.length - 1; }
        } else {
          if (col < this.view.CAMPOS.length - 1) nC = col + 1;
          else { nF = fila + 1; nC = 0; }
        }
        capturar = true;
        break;
      case 'ArrowRight':
        if (target.tagName === 'INPUT' && target.type !== 'date' && target.selectionStart === target.value.length) {
          nC = Math.min(this.view.CAMPOS.length - 1, col + 1);
          capturar = true;
        }
        break;
      case 'ArrowLeft':
        if (target.tagName === 'INPUT' && target.type !== 'date' && target.selectionStart === 0) {
          nC = Math.max(0, col - 1);
          capturar = true;
        }
        break;
    }

    if (capturar) {
      e.preventDefault();
      this.activarCelda(nF, nC);
    }
  },

  activarCelda(fila, col) {
    fila = Math.max(0, Math.min(fila, this.dataFilas.length - 1));
    col = Math.max(0, Math.min(col, this.view.CAMPOS.length - 1));
    this.celdaActual = { fila, col };

    if (!this.textoBusquedaTabla) {
      const pag = Math.floor(fila / this.FILAS_POR_PAGINA) + 1;
      if (pag !== this.paginaActualTabla) {
        this.paginaActualTabla = pag;
        this.renderizarGrilla();
      }
    }

    this.resaltarCeldaActiva();
    const td = document.querySelector(`#h-data-tbody tr[data-fila-idx="${fila}"] td[data-col="${col}"]`);
    if (td && td.firstElementChild) {
      const input = td.firstElementChild;
      input.focus();
      if (input.tagName === 'INPUT' && input.type !== 'date') input.select();
      input.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  },

  resaltarCeldaActiva() {
    document.querySelectorAll('#h-data-tbody td.cell-active').forEach(td => td.classList.remove('cell-active'));
    const td = document.querySelector(`#h-data-tbody tr[data-fila-idx="${this.celdaActual.fila}"] td[data-col="${this.celdaActual.col}"]`);
    if (td) td.classList.add('cell-active');
  },

  marcarCambios() {
    this.cambiosPendientes = true;
    const badge = document.getElementById('h-unsaved-badge');
    if (badge) badge.style.display = 'inline-block';
  },

  agregarFilas(n = 5, render = true) {
    const base = this.dataFilas.length;
    const nuevas = this.generarFilasVacias(n).map((f, i) => ({ ...f, fila: base + i }));
    this.dataFilas.push(...nuevas);
    if (render) this.renderizarGrilla();
  },

  async limpiarVacias() {
    const llenas = this.dataFilas.filter(f => this.filaTieneDatos(f));
    this.dataFilas = [...llenas, ...this.generarFilasVacias(20)];
    this.dataFilas.forEach((f, i) => f.fila = i);
    this.renderizarGrilla();
    window.App.Utils.Notification.success('Filas vacías limpiadas.');
  },

  cambiarPagina(delta) {
    const totalPaginas = Math.max(1, Math.ceil(this.dataFilas.length / this.FILAS_POR_PAGINA));
    const nueva = this.paginaActualTabla + delta;
    if (nueva >= 1 && nueva <= totalPaginas) {
      this.paginaActualTabla = nueva;
      this.renderizarGrilla();
    }
  },

  async agregarRegistroRapido(e) {
    e.preventDefault();
    const obj = {
      fecha: document.getElementById('hqe-fecha').value,
      idAnimal: document.getElementById('hqe-id').value.trim().toUpperCase(),
      genetica: document.getElementById('hqe-genetica').value,
      estatus: document.getElementById('hqe-estatus').value,
      causa: document.getElementById('hqe-causa').value.trim(),
      lugar: document.getElementById('hqe-lugar').value.trim().toUpperCase(),
      paridad: document.getElementById('hqe-paridad').value,
      semana: document.getElementById('hqe-semana').value,
      dia: document.getElementById('hqe-dia').value,
      guardado: true
    };

    let idxVacia = this.dataFilas.findIndex(f => !this.filaTieneDatos(f));
    if (idxVacia === -1) {
      idxVacia = this.dataFilas.length;
      this.agregarFilas(1, false);
    }
    this.dataFilas[idxVacia] = { ...this.dataFilas[idxVacia], ...obj };

    await this.guardarTodo();

    document.getElementById('hqe-id').value = '';
    document.getElementById('hqe-causa').value = '';
    document.getElementById('hqe-lugar').value = '';
    document.getElementById('hqe-paridad').value = '';
    document.getElementById('hqe-id').focus();

    // Ir a la última página para ver el registro
    this.paginaActualTabla = Math.max(1, Math.ceil(this.dataFilas.length / this.FILAS_POR_PAGINA));
    this.renderizarGrilla();
  },

  async eliminarRegistro(idx) {
    const fila = this.dataFilas[idx];
    if (!this.filaTieneDatos(fila)) return;

    const confirm = await window.App.Utils.Notification.confirm(
      '¿Eliminar Registro?',
      `¿Deseas eliminar a la hembra ${fila.idAnimal || 'sin ID'} de la fila ${idx + 1}?`
    );
    if (!confirm) return;

    if (fila.id) {
      await this.model.delete(fila.id);
    }
    this.dataFilas.splice(idx, 1);
    this.dataFilas.forEach((f, i) => f.fila = i);
    if (this.dataFilas.length < 20) this.agregarFilas(10, false);

    await this.guardarTodo();
    this.renderizarGrilla();
  },

  async guardarTodo() {
    try {
      const aGuardar = this.dataFilas.filter(f => this.filaTieneDatos(f)).map((f, i) => ({
        id: f.id || 'hembra_' + (i + 1) + '_' + Date.now(),
        fila: i,
        fecha: f.fecha || '',
        idAnimal: String(f.idAnimal || '').toUpperCase(),
        genetica: f.genetica || '',
        estatus: String(f.estatus || '').toUpperCase(),
        causa: f.causa || '',
        lugar: String(f.lugar || '').toUpperCase(),
        paridad: f.paridad !== undefined ? String(f.paridad) : '',
        semana: f.semana !== undefined ? String(f.semana) : '',
        dia: f.dia || '',
        guardado: true
      }));

      await this.model.saveAllLocal(aGuardar);

      this.cambiosPendientes = false;
      const badge = document.getElementById('h-unsaved-badge');
      if (badge) badge.style.display = 'none';

      if (this.model.gasWebAppUrl && navigator.onLine) {
        this.actualizarIndicadorNube('sincronizando', 'Guardando en Sheets...');
        const okNube = await this.model.syncAllToSheets();
        if (okNube) {
          this.actualizarIndicadorNube('conectado', `Google Sheets (${aGuardar.length} reg.)`);
          window.App.Utils.Notification.success(`${aGuardar.length} registros guardados y sincronizados en Google Sheets.`);
        } else {
          this.actualizarIndicadorNube('error', 'Guardado Local (Pendiente Nube)');
          window.App.Utils.Notification.info(`Guardado localmente (${aGuardar.length}). Pendiente sincronizar.`);
        }
      } else {
        this.actualizarIndicadorNube('local', 'Guardado Local');
        window.App.Utils.Notification.success(`${aGuardar.length} registros guardados localmente.`);
      }

      this.renderizarGrilla();
    } catch (err) {
      window.App.Utils.Notification.error('Error al guardar: ' + err.message);
    }
  },

  async sincronizarDesdeSheets(mostrarAlerta = false) {
    if (this.cambiosPendientes) return;
    await this.model.syncFromSheets((estado, texto, data) => {
      this.actualizarIndicadorNube(estado, texto);
      if (data && Array.isArray(data)) {
        this.dataFilas = [...data, ...this.generarFilasVacias(10)];
        this.renderizarGrilla();
        if (this.currentChartType && this.currentChartType !== 'table') {
          this.updateFiltersUI();
          this.renderChart();
        }
      }
      if (mostrarAlerta) {
        if (estado === 'conectado') window.App.Utils.Notification.success(texto);
        else if (estado === 'error') window.App.Utils.Notification.error(texto);
      }
    });
  },

  formatearFechaExcel(fechaIn) {
    if (!fechaIn) return '';
    if (typeof fechaIn === 'number') {
      const date = new Date((fechaIn - (25567 + 2)) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    let str = String(fechaIn).trim();
    if (str.includes('T')) str = str.split('T')[0];
    let partes = str.split(/[-/]/);
    if (partes.length === 3) {
      if (partes[0].length === 4) {
        return `${partes[0]}-${partes[1].padStart(2, '0')}-${partes[2].padStart(2, '0')}`;
      }
      let p0 = partes[0].padStart(2, '0');
      let p1 = partes[1].padStart(2, '0');
      let p2 = partes[2];
      if (p2.length === 2) p2 = '20' + p2;
      return `${p2}-${p1}-${p0}`;
    }
    return str;
  },

  async importarExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        let sheetName = workbook.SheetNames.includes('CHAT MUERTES') ? 'CHAT MUERTES' : workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonDatos = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (jsonDatos.length === 0) {
          window.App.Utils.Notification.warning('El archivo Excel está vacío.');
          return;
        }

        const nuevosRegistros = jsonDatos.map(row => ({
          fecha: this.formatearFechaExcel(row['FECHA'] || row['Fecha'] || row['fecha']),
          idAnimal: String(row['ID'] || row['id'] || row['ID ANIMAL'] || '').toUpperCase(),
          genetica: row['GENETICA'] || row['Genetica'] || row['genetica'] || '',
          estatus: String(row['ESTATUS'] || row['Estatus'] || row['estatus'] || '').toUpperCase(),
          causa: row['CAUSA'] || row['Causa'] || row['causa'] || '',
          lugar: String(row['LUGAR'] || row['Lugar'] || row['lugar'] || '').toUpperCase(),
          paridad: row['PARIDAD'] || row['Paridad'] || row['paridad'] || '',
          semana: row['SEMANA'] || row['Semana'] || row['semana'] || '',
          dia: row['DIA'] || row['Dia'] || row['dia'] || '',
          guardado: true
        })).filter(r => r.idAnimal || r.semana);

        if (nuevosRegistros.length > 0) {
          const confirm = await window.App.Utils.Notification.confirm(
            'Importar Datos de Excel',
            `Se encontraron ${nuevosRegistros.length} registros en la hoja "${sheetName}". ¿Deseas añadirlos y guardarlos?`
          );
          if (confirm) {
            const existentes = this.dataFilas.filter(f => this.filaTieneDatos(f));
            this.dataFilas = [...existentes, ...nuevosRegistros, ...this.generarFilasVacias(10)];
            this.dataFilas.forEach((f, i) => f.fila = i);
            await this.guardarTodo();
            this.renderizarGrilla();
            window.App.Utils.Notification.success(`${nuevosRegistros.length} registros importados correctamente.`);
          }
        } else {
          window.App.Utils.Notification.warning('No se encontraron registros válidos de mortalidad en el archivo.');
        }
      } catch (err) {
        window.App.Utils.Notification.error('Error al procesar el archivo Excel: ' + err.message);
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  },

  exportarExcel() {
    if (typeof XLSX === 'undefined') {
      return window.App.Utils.Notification.error('Librería SheetJS no encontrada.');
    }
    const exportData = this.dataFilas.filter(f => this.filaTieneDatos(f)).map(f => ({
      'FECHA': f.fecha,
      'ID': f.idAnimal,
      'GENETICA': f.genetica,
      'ESTATUS': f.estatus,
      'CAUSA': f.causa,
      'LUGAR': f.lugar,
      'PARIDAD': f.paridad,
      'SEMANA': f.semana,
      'DIA': f.dia
    }));

    if (exportData.length === 0) {
      return window.App.Utils.Notification.info('No hay datos para exportar.');
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CHAT MUERTES');
    XLSX.writeFile(wb, `Mortalidad_${new Date().toISOString().split('T')[0]}.xlsx`);
    window.App.Utils.Notification.success('Excel descargado correctamente.');
  },

  // Lógica de Gráficas y Filtros Cruzados Estilo Power BI
  getFilteredData(excludeType = null) {
    return this.dataFilas.filter(r => {
      if (!this.filaTieneDatos(r)) return false;

      const matchSemana = excludeType === 'semana' || this.activeFilters.semana.length === 0 || this.activeFilters.semana.includes(String(r.semana));
      const matchEstatus = excludeType === 'estatus' || this.activeFilters.estatus.length === 0 || this.activeFilters.estatus.includes(String(r.estatus));
      const matchGenetica = excludeType === 'genetica' || this.activeFilters.genetica.length === 0 || this.activeFilters.genetica.includes(String(r.genetica));
      const matchCausa = excludeType === 'causa' || this.activeFilters.causa.length === 0 || this.activeFilters.causa.includes(String(r.causa || '').trim());

      return matchSemana && matchEstatus && matchGenetica && matchCausa;
    });
  },

  updateFiltersUI() {
    const contSemana = document.getElementById('hpill-semana');
    const contEstatus = document.getElementById('hpill-estatus');
    const contGenetica = document.getElementById('hpill-genetica');
    const contCausa = document.getElementById('hpill-causa');

    const dataForSemana = this.getFilteredData('semana');
    const dataForEstatus = this.getFilteredData('estatus');
    const dataForGenetica = this.getFilteredData('genetica');
    const dataForCausa = this.getFilteredData('causa');

    const semanas = [...new Set(dataForSemana.map(d => d.semana).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
    const estatuses = [...new Set(dataForEstatus.map(d => d.estatus).filter(Boolean))].sort();
    const geneticas = [...new Set(dataForGenetica.map(d => d.genetica).filter(Boolean))].sort();
    const causas = [...new Set(dataForCausa.map(d => d.causa && d.causa.trim()).filter(Boolean))].sort();

    const createPills = (container, type, options) => {
      if (!container) return;
      container.innerHTML = '';
      if (options.length === 0) {
        container.innerHTML = '<span style="font-size: 10px; color: #64748b; font-style: italic;">Sin datos</span>';
        return;
      }

      const isAll = this.activeFilters[type].length === 0;
      const btnAll = document.createElement('button');
      btnAll.type = 'button';
      btnAll.style.cssText = `padding: 3px 8px; font-size: 10px; border-radius: 9999px; font-weight: 700; cursor: pointer; border: 1px solid ${isAll ? '#3b82f6' : '#334155'}; background: ${isAll ? '#2563eb' : '#1e293b'}; color: ${isAll ? '#fff' : '#94a3b8'};`;
      btnAll.textContent = 'TODOS';
      btnAll.onclick = () => {
        this.activeFilters[type] = [];
        this.updateFiltersUI();
        this.renderChart();
      };
      container.appendChild(btnAll);

      options.forEach(opt => {
        const isActive = this.activeFilters[type].includes(String(opt));
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText = `padding: 3px 8px; font-size: 10px; border-radius: 9999px; font-weight: 700; cursor: pointer; border: 1px solid ${isActive ? '#3b82f6' : '#334155'}; background: ${isActive ? '#2563eb' : '#1e293b'}; color: ${isActive ? '#fff' : '#94a3b8'};`;
        btn.textContent = opt;
        btn.onclick = () => {
          const optStr = String(opt);
          if (isActive) {
            this.activeFilters[type] = this.activeFilters[type].filter(x => x !== optStr);
          } else {
            this.activeFilters[type].push(optStr);
          }
          this.updateFiltersUI();
          this.renderChart();
        };
        container.appendChild(btn);
      });
    };

    createPills(contSemana, 'semana', semanas);
    createPills(contEstatus, 'estatus', estatuses);
    createPills(contGenetica, 'genetica', geneticas);
    createPills(contCausa, 'causa', causas);
  },

  renderChart() {
    const canvas = document.getElementById('h-main-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (this.currentChartInstance) this.currentChartInstance.destroy();

    const data = this.getFilteredData();

    const semTxt = this.activeFilters.semana.length ? `Sem: ${this.activeFilters.semana.join(', ')}` : 'Todas las semanas';
    const estTxt = this.activeFilters.estatus.length ? `Estatus: ${this.activeFilters.estatus.join(', ')}` : 'Todos los estatus';
    const genTxt = this.activeFilters.genetica.length ? `Genética: ${this.activeFilters.genetica.join(', ')}` : 'Todas las genéticas';
    const cauTxt = this.activeFilters.causa.length ? `Causa: ${this.activeFilters.causa.join(', ')}` : 'Todas las causas';

    const subEl = document.getElementById('h-chart-subtitle');
    if (subEl) {
      subEl.textContent = `Total: ${data.length} muertas | ${semTxt} · ${estTxt} · ${genTxt} · ${cauTxt}`;
    }

    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 20, right: 10, bottom: 4, left: 4 } },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#e2e8f0', boxWidth: 12, padding: 12, font: { size: 11, weight: 'bold' } }
        }
      },
      scales: {
        x: {
          ticks: { color: '#f1f5f9', font: { size: 10, weight: 'bold' } },
          grid: { color: '#1e293b' }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#cbd5e1', precision: 0, font: { size: 10 } },
          grid: { color: '#1e293b' }
        }
      }
    };

    const estatusBase = ['GESTANTE', 'LACTANTE', 'DESTETADA', 'LECHONA', 'DESCARTE'];
    const estatusActivos = estatusBase.filter(est =>
      data.some(d => String(d.estatus || '').toUpperCase() === est) ||
      ['GESTANTE', 'LACTANTE', 'DESTETADA'].includes(est)
    );

    let config = {};

    if (this.currentChartType === 'dia') {
      const days = this.view.DIAS_CANONICOS;
      const datasets = estatusActivos.map(est => ({
        label: est,
        data: days.map(day => data.filter(d => this.view.normalizarDia(d.dia, d.fecha) === day && String(d.estatus).toUpperCase() === est).length),
        backgroundColor: this.view.getStatusColor(est),
        borderRadius: 2
      }));

      config = {
        type: 'bar',
        data: { labels: days, datasets },
        options: {
          ...baseOptions,
          scales: {
            x: { ...baseOptions.scales.x, stacked: true },
            y: { ...baseOptions.scales.y, stacked: true }
          }
        }
      };
      this.renderResumenTabla(days, datasets, true);

    } else if (this.currentChartType === 'semana') {
      const semanasPresentes = [...new Set(data.map(d => d.semana).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
      const labels = semanasPresentes.length > 0 ? semanasPresentes.map(s => `Sem ${s}`) : ['Sin datos'];

      const datasets = estatusActivos.map(est => ({
        label: est,
        data: semanasPresentes.map(sem => data.filter(d => String(d.semana) === String(sem) && String(d.estatus).toUpperCase() === est).length),
        backgroundColor: this.view.getStatusColor(est),
        borderRadius: 2
      }));

      config = {
        type: 'bar',
        data: { labels, datasets },
        options: {
          ...baseOptions,
          scales: {
            x: { ...baseOptions.scales.x, stacked: true },
            y: { ...baseOptions.scales.y, stacked: true }
          }
        }
      };
      this.renderResumenTabla(labels, datasets, true);

    } else if (this.currentChartType === 'paridad') {
      const paridades = ['0', '1', '2', '3', '4', '5', '6', '7', '8+'];
      const labels = paridades.map(p => `P-${p}`);

      const datasets = [{
        label: 'Muertes',
        data: paridades.map(p => {
          if (p === '8+') return data.filter(d => Number(d.paridad) >= 8).length;
          return data.filter(d => String(d.paridad) === p).length;
        }),
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316', '#dc2626'],
        borderRadius: 4
      }];

      config = {
        type: 'bar',
        data: { labels, datasets },
        options: {
          ...baseOptions,
          plugins: { ...baseOptions.plugins, legend: { display: false } }
        }
      };
      this.renderResumenTabla(labels, datasets, false);
    }

    this.currentChartInstance = new Chart(ctx, config);
  },

  renderResumenTabla(labels, datasets, esApilada) {
    const cont = document.getElementById('h-chart-summary-table');
    if (!cont) return;
    if (!labels || labels.length === 0) {
      cont.innerHTML = `<p style="font-size: 11px; color: #94a3b8; text-align: center; padding: 8px;">No hay datos para los filtros seleccionados.</p>`;
      return;
    }

    let html = `<table style="width: 100%; text-align: center; font-size: 11px; border-collapse: collapse;">
      <thead><tr style="background: #0f172a; color: #cbd5e1; border-bottom: 1px solid #1e293b;">
        <th style="padding: 6px 8px; text-align: left; font-weight: 700;">ESTATUS</th>`;
    labels.forEach(l => { html += `<th style="padding: 6px 8px; font-weight: 700;">${l}</th>`; });
    html += `<th style="padding: 6px 8px; font-weight: 800; color: #38bdf8;">TOTAL</th></tr></thead><tbody>`;

    datasets.forEach(ds => {
      const sumaFila = ds.data.reduce((a, b) => a + b, 0);
      if (esApilada && sumaFila === 0) return;
      html += `<tr style="border-bottom: 1px solid rgba(30, 41, 59, 0.6);"><td style="padding: 5px 8px; text-align: left; font-weight: 700; white-space: nowrap;"><span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background: ${ds.backgroundColor}; margin-right: 6px;"></span>${ds.label}</td>`;
      ds.data.forEach(v => { html += `<td style="padding: 5px 8px; color: #cbd5e1; font-family: monospace;">${v}</td>`; });
      html += `<td style="padding: 5px 8px; font-weight: 800; color: #ffffff; font-family: monospace;">${sumaFila}</td></tr>`;
    });

    if (esApilada && datasets.length > 1) {
      html += `<tr style="background: rgba(15, 23, 42, 0.9); font-weight: 800; color: #fbbf24;"><td style="padding: 6px 8px; text-align: left;">TOTAL</td>`;
      let granTotal = 0;
      labels.forEach((_, i) => {
        const colSum = datasets.reduce((acc, ds) => acc + (ds.data[i] || 0), 0);
        granTotal += colSum;
        html += `<td style="padding: 6px 8px; font-family: monospace;">${colSum}</td>`;
      });
      html += `<td style="padding: 6px 8px; font-family: monospace; color: #34d399;">${granTotal}</td></tr>`;
    }

    html += `</tbody></table>`;
    cont.innerHTML = html;
  },

  descargarGrafica() {
    const sourceCanvas = document.getElementById('h-main-chart');
    if (!sourceCanvas) return;

    const tempCanvas = document.createElement('canvas');
    const pad = 28;
    const headerH = 64;
    const footerH = 34;
    tempCanvas.width = sourceCanvas.width + pad * 2;
    tempCanvas.height = sourceCanvas.height + headerH + footerH + pad;

    const tCtx = tempCanvas.getContext('2d');
    tCtx.fillStyle = '#020617';
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    const titles = {
      dia: 'REPORTE: MORTALIDAD POR DÍA',
      semana: 'REPORTE: MORTALIDAD POR SEMANA',
      paridad: 'REPORTE: MORTALIDAD POR PARIDAD'
    };
    tCtx.fillStyle = '#f8fafc';
    tCtx.font = 'bold 16px sans-serif';
    tCtx.fillText(titles[this.currentChartType] || 'REPORTE DE MORTALIDAD', pad, 30);

    const sub = document.getElementById('h-chart-subtitle')?.textContent || '';
    tCtx.fillStyle = '#34d399';
    tCtx.font = 'bold 12px sans-serif';
    tCtx.fillText(sub, pad, 50);

    tCtx.drawImage(sourceCanvas, pad, headerH);

    tCtx.fillStyle = '#94a3b8';
    tCtx.font = 'bold 11px sans-serif';
    tCtx.fillText('CoreAdmin MVC - Sistema Porcino | Mortalidad de Hembras', pad, tempCanvas.height - 14);

    const url = tempCanvas.toDataURL('image/png', 1.0);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_${this.currentChartType}_${new Date().toISOString().split('T')[0]}.png`;
    a.click();
    window.App.Utils.Notification.success('Gráfica descargada en imagen.');
  }
};
