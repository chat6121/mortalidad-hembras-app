/**
 * MpdController: Coordina la interacción, búsqueda inteligente, filtros,
 * paginación, importación desde archivo Excel (.xlsm) y exportación a CSV.
 */
window.App = window.App || {};
window.App.Controllers = window.App.Controllers || {};

window.App.Controllers.Mpd = {
  model: window.App.Models.Mpd,
  view: window.App.Views.Mpd,
  notification: window.App.Utils.Notification,

  state: {
    search: '',
    vuelta: '',
    pic: '',
    calendarDate: '',
    sala: '',
    nota: '',
    page: 1,
    pageSize: 50,
    activeTab: 'table',
    chartVuelta: 20,
    chartPic: null, // Calculado con la fecha actual en init
    chartDate: '',  // Calculado con la fecha actual en init
    isInitialized: false,
    searchDebounceTimer: null
  },

  /**
   * Inicializa el módulo MPD cuando se activa la vista
   */
  async init(subview = 'table') {
    this.view.container = document.getElementById('view-mpd');
    if (!this.view.container) return;

    // Establecer la fecha actual predeterminada del sistema
    const Format = window.App.Utils.Format;
    const currentInfo = Format ? Format.getPicInfo(new Date()) : { vuelta: 20, pic: 131 };
    const currentIso = Format && Format.formatDateISO ? Format.formatDateISO(new Date()) : new Date().toISOString().slice(0, 10);

    this.state.chartVuelta = currentInfo.vuelta;
    this.state.chartPic = currentInfo.pic;
    this.state.chartDate = currentIso;

    // Si la base de datos está vacía y existe el seed en memoria, sembrarlo primero
    await this.ensureSeedData();

    // Obtener opciones únicas de salas, pics y notas para los filtros
    const filterOptions = await this.model.getFilterOptions();
    this.view.renderSkeleton(filterOptions);
    this.bindEvents();
    this.state.isInitialized = true;

    // Conmutar a la subvista solicitada (por defecto 'table')
    await this.switchTab(subview, false);
  },

  /**
   * Cambia entre la subvista 'table' y 'charts'
   */
  async switchTab(tabName = 'table', updateHash = true) {
    this.state.activeTab = tabName;
    this.view.switchTab(tabName);

    // Sincronizar submenú del sidebar
    const subItems = document.querySelectorAll('#submenu-mpd .nav-sub-item');
    subItems.forEach(item => {
      const isTarget = (tabName === 'charts' && item.dataset.view === 'mpd-charts') ||
                       (tabName === 'table' && item.dataset.view === 'mpd-table');
      item.classList.toggle('active', isTarget);
    });

    if (updateHash) {
      window.location.hash = tabName === 'charts' ? '#mpd-charts' : '#mpd-table';
    }

    if (tabName === 'charts') {
      await this.loadCharts();
    } else {
      await this.loadData();
    }
  },

  /**
   * Carga los datos analíticos de Mortalidad por Causas y Salas
   */
  async loadCharts(pic = null, vuelta = null) {
    try {
      const Format = window.App.Utils.Format;
      const currentInfo = Format ? Format.getPicInfo(new Date()) : { vuelta: 20, pic: 131 };

      const selectedVuelta = (vuelta !== null && vuelta !== undefined && vuelta !== '')
        ? Number(vuelta)
        : (this.state.chartVuelta !== null && this.state.chartVuelta !== undefined ? this.state.chartVuelta : currentInfo.vuelta);

      const selectedPic = (pic !== null && pic !== undefined && pic !== '')
        ? (pic === 'all' ? 'all' : Number(pic))
        : (this.state.chartPic !== null && this.state.chartPic !== undefined ? this.state.chartPic : currentInfo.pic);

      this.state.chartPic = selectedPic;
      this.state.chartVuelta = selectedVuelta;

      const chartData = await this.model.getMortalidadCharts(selectedPic, selectedVuelta);
      this.view.renderCharts(chartData);
    } catch (err) {
      console.error('Error al generar gráficos MPD:', err);
      this.notification.error('No se pudieron calcular los gráficos: ' + err.message);
    }
  },

  /**
   * Asegura que los datos iniciales de INFORMACION SAP.xlsm se encuentren cargados
   * y sincronizados en IndexedDB si el seed en memoria tiene más o nuevos registros.
   */
  async ensureSeedData() {
    try {
      const all = await this.model.getAll();
      const seed = window.App.Data && Array.isArray(window.App.Data.mpdSeed) ? window.App.Data.mpdSeed : [];
      if (seed.length > 0 && (all.length === 0 || all.length !== seed.length)) {
        console.log(`Sincronizando ${seed.length} registros MPD en IndexedDB (previo en BD: ${all.length})...`);
        await this.model.clearAll();
        await this.model.bulkCreate(seed);
      }
    } catch (e) {
      console.warn('Error al verificar sembrado MPD:', e);
    }
  },

  /**
   * Ejecuta la consulta con los parámetros de estado y delega el renderizado a la vista
   */
  async loadData() {
    try {
      const result = await this.model.queryWithFilters({
        search: this.state.search,
        vuelta: this.state.vuelta,
        pic: this.state.pic,
        sala: this.state.sala,
        nota: this.state.nota,
        page: this.state.page,
        pageSize: this.state.pageSize
      });

      this.view.renderTable(result);
    } catch (err) {
      console.error('Error al cargar datos MPD:', err);
      this.notification.error('Error al consultar los registros de producción: ' + err.message);
    }
  },

  /**
   * Asocia los eventos del DOM a los controles de filtro, búsqueda, paginación y acciones
   */
  bindEvents() {
    if (!this.view.container) return;

    // 0. Conmutador de Pestañas (Tabla vs Gráficos)
    const tabsNav = document.getElementById('mpd-tabs-nav');
    if (tabsNav) {
      tabsNav.addEventListener('click', async (e) => {
        const tabBtn = e.target.closest('.mpd-tab-btn');
        if (tabBtn && tabBtn.dataset.tab) {
          await this.switchTab(tabBtn.dataset.tab, true);
        }
      });
    }

    const Format = window.App.Utils.Format;
    const currentVuelta = Format && Format.getCurrentVuelta ? Format.getCurrentVuelta() : 20;

    // 0.1 Elementos de Gráficos de Mortalidad (Sincronización Fecha PIC [Vuelta-PIC] ↔ Fecha Calendario)
    const chartsVp = document.getElementById('mpd-charts-vueltapic');
    const chartsDate = document.getElementById('mpd-charts-date');

    const currentInfo = Format ? Format.getPicInfo(new Date()) : { vuelta: 20, pic: 131 };
    const currentIso = Format && Format.formatDateISO ? Format.formatDateISO(new Date()) : new Date().toISOString().slice(0, 10);

    if (chartsVp && !chartsVp.value) {
      chartsVp.value = Format ? Format.formatVueltaPic(currentInfo.vuelta, currentInfo.pic) : (currentInfo.vuelta + '-' + currentInfo.pic);
    }
    if (chartsDate && !chartsDate.value) {
      chartsDate.value = currentIso;
    }
    if (Format && chartsVp) {
      Format.setupVueltaPicInput(chartsVp);
    }
    if (Format && chartsDate) {
      Format.attachCalendarPicker(chartsDate);
      Format.updateDateCaption('mpd-charts-date-caption', chartsDate.value || currentIso);
    }

    const syncChartsFromVueltaPic = async () => {
      const val = chartsVp ? chartsVp.value.trim() : '';
      if (Format) {
        const parsed = Format.parseVueltaPic(val);
        if (parsed.isValid) {
          if (parsed.date) {
            const isoStr = Format.formatDateISO(parsed.date);
            if (chartsDate) chartsDate.value = isoStr;
            this.state.chartDate = isoStr;
            Format.updateDateCaption('mpd-charts-date-caption', parsed.date);
          }
          this.state.chartVuelta = parsed.vuelta;
          this.state.chartPic = parsed.pic;
          await this.loadCharts(parsed.pic, parsed.vuelta);
        } else if (parsed.vuelta !== null && parsed.pic === null) {
          if (chartsDate) chartsDate.value = '';
          Format.updateDateCaption('mpd-charts-date-caption', '');
          this.state.chartVuelta = parsed.vuelta;
          this.state.chartPic = 'all';
          this.state.chartDate = '';
          await this.loadCharts('all', parsed.vuelta);
        } else {
          if (chartsDate) chartsDate.value = '';
          Format.updateDateCaption('mpd-charts-date-caption', '');
          this.state.chartPic = 'all';
          this.state.chartDate = '';
          await this.loadCharts('all', currentVuelta);
        }
      }
    };

    if (chartsVp) {
      chartsVp.addEventListener('input', () => {
        clearTimeout(this.state.searchDebounceTimer);
        this.state.searchDebounceTimer = setTimeout(syncChartsFromVueltaPic, 300);
      });
      chartsVp.addEventListener('change', syncChartsFromVueltaPic);
    }

    const handleChartsDateSync = async (e) => {
      const val = e.target.value;
      if (val) {
        try {
          const info = Format.getPicInfo(val);
          if (chartsVp) chartsVp.value = Format.formatVueltaPic(info.vuelta, info.pic);
          this.state.chartVuelta = info.vuelta;
          this.state.chartPic = info.pic;
          this.state.chartDate = val;
          Format.updateDateCaption('mpd-charts-date-caption', val);
          await this.loadCharts(info.pic, info.vuelta);
        } catch (err) {
          console.warn('Error calculando PIC desde fecha en gráficos:', err);
        }
      } else {
        if (chartsVp) chartsVp.value = Format ? Format.getDefaultVueltaPicPrefix() : '20-';
        Format.updateDateCaption('mpd-charts-date-caption', '');
        this.state.chartPic = 'all';
        this.state.chartDate = '';
        await this.loadCharts('all', currentVuelta);
      }
    };

    if (chartsDate) {
      chartsDate.addEventListener('change', handleChartsDateSync);
      chartsDate.addEventListener('input', handleChartsDateSync);
    }

    // 1. Buscador inteligente con debounce de 250ms
    const searchInput = document.getElementById('mpd-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this.state.searchDebounceTimer);
        this.state.searchDebounceTimer = setTimeout(() => {
          this.state.search = e.target.value;
          this.state.page = 1; // Reiniciar a la primera página
          this.loadData();
        }, 250);
      });
    }

    // 2. Control sincronizado Fecha PIC (Vuelta-PIC) ↔ Fecha Calendario en Tabla MPD
    const filterVp = document.getElementById('mpd-filter-vueltapic');
    const filterDate = document.getElementById('mpd-filter-date');

    if (filterVp && !filterVp.value) {
      filterVp.value = Format ? Format.getDefaultVueltaPicPrefix() : '20-';
    }
    if (Format && filterVp) {
      Format.setupVueltaPicInput(filterVp);
    }
    if (Format && filterDate) {
      Format.attachCalendarPicker(filterDate);
      Format.updateDateCaption('mpd-filter-date-caption', filterVp ? filterVp.value : '');
    }

    const syncTableFromVueltaPic = () => {
      const val = filterVp ? filterVp.value.trim() : '';
      if (Format) {
        const parsed = Format.parseVueltaPic(val);
        if (parsed.isValid) {
          if (parsed.date && filterDate) {
            filterDate.value = Format.formatDateISO ? Format.formatDateISO(parsed.date) : parsed.date.toISOString().slice(0, 10);
          }
          this.state.vuelta = String(parsed.vuelta);
          this.state.pic = String(parsed.pic);
          Format.updateDateCaption('mpd-filter-date-caption', parsed.date);
        } else if (parsed.vuelta !== null && parsed.pic === null) {
          if (filterDate) filterDate.value = '';
          Format.updateDateCaption('mpd-filter-date-caption', '');
          this.state.vuelta = String(parsed.vuelta);
          this.state.pic = '';
        } else {
          if (filterDate) filterDate.value = '';
          Format.updateDateCaption('mpd-filter-date-caption', '');
          this.state.vuelta = '';
          this.state.pic = '';
        }
      }

      this.state.page = 1;
      this.loadData();
    };

    if (filterVp) {
      filterVp.addEventListener('input', () => {
        clearTimeout(this.state.searchDebounceTimer);
        this.state.searchDebounceTimer = setTimeout(syncTableFromVueltaPic, 300);
      });
      filterVp.addEventListener('change', syncTableFromVueltaPic);
    }

    const handleTableDateSync = (e) => {
      const val = e.target.value;
      if (val) {
        try {
          const info = Format.getPicInfo(val);
          if (filterVp) filterVp.value = Format.formatVueltaPic(info.vuelta, info.pic);
          this.state.vuelta = String(info.vuelta);
          this.state.pic = String(info.pic);
          Format.updateDateCaption('mpd-filter-date-caption', val);
        } catch (err) {
          console.warn('Error calculando PIC desde fecha en tabla:', err);
        }
      } else {
        if (filterVp) filterVp.value = Format ? Format.getDefaultVueltaPicPrefix() : '20-';
        Format.updateDateCaption('mpd-filter-date-caption', '');
        this.state.vuelta = '';
        this.state.pic = '';
      }
      this.state.page = 1;
      this.loadData();
    };

    if (filterDate) {
      filterDate.addEventListener('change', handleTableDateSync);
      filterDate.addEventListener('input', handleTableDateSync);
    }

    // 3. Filtro por Sala
    const filterSala = document.getElementById('mpd-filter-sala');
    if (filterSala) {
      filterSala.addEventListener('change', (e) => {
        this.state.sala = e.target.value;
        this.state.page = 1;
        this.loadData();
      });
    }

    // 4. Filtro por Nota de Salida
    const filterNota = document.getElementById('mpd-filter-nota');
    if (filterNota) {
      filterNota.addEventListener('input', (e) => {
        clearTimeout(this.state.searchDebounceTimer);
        this.state.searchDebounceTimer = setTimeout(() => {
          this.state.nota = e.target.value.trim();
          this.state.page = 1;
          this.loadData();
        }, 250);
      });
    }

    // 5. Botón Limpiar Filtros
    const btnClear = document.getElementById('btn-mpd-clear-filters');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        this.state.search = '';
        this.state.vuelta = '';
        this.state.pic = '';
        this.state.sala = '';
        this.state.nota = '';
        this.state.page = 1;

        if (searchInput) searchInput.value = '';
        if (filterVp) filterVp.value = Format ? Format.getDefaultVueltaPicPrefix() : '20-';
        if (filterDate) filterDate.value = '';
        if (Format) Format.updateDateCaption('mpd-filter-date-caption', '');
        if (filterSala) filterSala.value = '';
        if (filterNota) filterNota.value = '';

        this.loadData();
        this.notification.toast('Filtros restablecidos', 'info');
      });
    }

    // 6. Cambio de cantidad por página
    const pageSizeSelect = document.getElementById('mpd-page-size');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', (e) => {
        this.state.pageSize = Number(e.target.value) || 50;
        this.state.page = 1;
        this.loadData();
      });
    }

    // 7. Eventos delegados de Paginación en el wrapper de la tabla
    const tableWrapper = document.getElementById('mpd-table-wrapper');
    if (tableWrapper) {
      tableWrapper.addEventListener('click', (e) => {
        const pageBtn = e.target.closest('.mpd-page-btn');
        if (pageBtn && !pageBtn.disabled) {
          const targetPage = Number(pageBtn.dataset.page);
          if (targetPage && targetPage !== this.state.page) {
            this.state.page = targetPage;
            this.loadData();
            // Scroll suave hacia la tabla
            tableWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }

        // Botón de salto de página
        if (e.target.closest('#btn-mpd-jump-page')) {
          this.handleJumpPage();
        }
      });

      tableWrapper.addEventListener('keydown', (e) => {
        if (e.target.id === 'mpd-jump-page' && e.key === 'Enter') {
          this.handleJumpPage();
        }
      });
    }

    // 8. Botón Importar Excel
    const btnImport = document.getElementById('btn-mpd-import');
    const fileInput = document.getElementById('mpd-file-input');
    if (btnImport && fileInput) {
      btnImport.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => this.handleFileImport(e));
    }

    // 9. Botón Restaurar Base desde Seed
    const btnReloadSeed = document.getElementById('btn-mpd-reload-seed');
    if (btnReloadSeed) {
      btnReloadSeed.addEventListener('click', async () => {
        const confirm = await this.notification.confirm(
          '¿Restaurar Base de Datos MPD?',
          'Se recargarán los 11.217 registros originales de INFORMACION SAP.xlsm, sobrescribiendo los cambios actuales.'
        );
        if (confirm) {
          if (window.App.Data && Array.isArray(window.App.Data.mpdSeed) && window.App.Data.mpdSeed.length > 0) {
            await this.model.clearAll();
            await this.model.bulkCreate(window.App.Data.mpdSeed);
            this.state.page = 1;
            await this.init(); // Recargar filtros y tabla
            this.notification.toast('Base de datos MPD restaurada correctamente', 'success');
          } else {
            this.notification.error('El sembrado inicial no está disponible en memoria.');
          }
        }
      });
    }

    // 10. Botón Exportar CSV
    const btnExport = document.getElementById('btn-mpd-export-csv');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.handleExportCsv());
    }
  },

  /**
   * Procesa el salto directo a un número de página
   */
  handleJumpPage() {
    const jumpInput = document.getElementById('mpd-jump-page');
    if (!jumpInput) return;
    const targetPage = Number(jumpInput.value);
    if (targetPage && targetPage >= 1) {
      this.state.page = targetPage;
      this.loadData();
    }
  },

  /**
   * Importa y parsea un archivo Excel (.xlsm o .xlsx) seleccionado por el usuario usando SheetJS
   */
  async handleFileImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    // Verificar si SheetJS está cargado
    if (typeof XLSX === 'undefined') {
      this.notification.error('La librería SheetJS (XLSX) no está disponible en este momento.');
      return;
    }

    try {
      this.notification.toast('Leyendo archivo Excel...', 'info');

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          // Buscar la hoja MPD o usar la primera
          const sheetName = workbook.SheetNames.includes('MPD') ? 'MPD' : workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Convertir a matriz de filas
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          if (!rows || rows.length < 2) {
            this.notification.warning('El archivo Excel o la hoja MPD no contiene filas de datos.');
            return;
          }

          const confirm = await this.notification.confirm(
            `Importar Hoja "${sheetName}"`,
            `Se encontraron ${rows.length - 1} filas en el archivo. ¿Deseas reemplazar los registros actuales de la base de datos?`
          );

          if (!confirm) {
            event.target.value = '';
            return;
          }

          // Mapear columnas según el orden estándar mediante parseExcelRows
          const records = this.parseExcelRows(rows);
          if (records.length === 0) {
            this.notification.warning('No se encontraron registros de producción válidos en la hoja.');
            event.target.value = '';
            return;
          }

          // Reemplazar almacén en IndexedDB
          await this.model.clearAll();
          await this.model.bulkCreate(records);
          window.App.Data.mpdSeed = records;

          await this.refreshCurrentView();
          this.notification.toast(`¡Éxito! Se importaron ${records.length.toLocaleString('es-ES')} registros desde "${file.name}".`, 'success');
        } catch (readErr) {
          console.error('Error al procesar el archivo Excel:', readErr);
          this.notification.error('Error al procesar el archivo: ' + readErr.message);
        } finally {
          event.target.value = '';
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('Error en carga de archivo:', err);
      this.notification.error('No se pudo leer el archivo seleccionado.');
      event.target.value = '';
    }
  },

  /**
   * Mapea filas crudas de SheetJS al esquema estándar de registros MPD.
   * Si las columnas ZONA (o Granja) y MATERNIDAD son removidas del Excel,
   * el sistema las deduce y llena automáticamente a partir del número de sala.
   */
  parseExcelRows(rows) {
    if (!Array.isArray(rows) || rows.length < 2) return [];

    const headers = rows[0].map(h => String(h || '').trim().toUpperCase());

    const findCol = (...names) => {
      for (const name of names) {
        const idx = headers.findIndex(h => h === name.toUpperCase() || h.includes(name.toUpperCase()));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const colVuelta = findCol('VUELTA', 'V.');
    const colPic = findCol('PIC');
    const colCantidad = findCol('CANTIDAD', 'CANT');
    const colCausa = findCol('CAUSA');
    const colPeso = findCol('PESO');
    const colTurno = findCol('TURNO');
    const colSala = findCol('SALA');
    const colSemana = findCol('SEMANA', 'SEM');
    const colNota = findCol('NOTA DE SALIDA', 'NOTA SALIDA', 'NOTA');
    const colObs = findCol('OBSERVACIONES', 'OBSERVACION', 'OBS');
    const colGranja = findCol('GRANJA', 'AREA');
    const colZona = findCol('ZONA', 'SIGLA');
    const colMat = findCol('MATERNIDAD', 'MAT');

    const salasModel = window.App.Models.SalasMaternidad;
    const records = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0 || r.every(c => c === '' || c === null || c === undefined)) continue;

      const numSala = colSala !== -1 ? Number(r[colSala]) || 0 : (Number(r[6]) || 0);

      // Maternidad: si no viene en el Excel o fue eliminada, se deduce de la sala (M1 a M5)
      let mat = colMat !== -1 && r[colMat] !== undefined ? String(r[colMat] || '').trim() : '';
      if (!mat && numSala > 0 && salasModel) {
        mat = salasModel.getMatBySalaSync(numSala);
      }

      // Granja (Área): EST o EXP
      let rawGranja = colGranja !== -1 && r[colGranja] !== undefined ? String(r[colGranja] || '').trim().toUpperCase() : '';
      let granja = '';
      if (rawGranja === 'EST' || rawGranja === 'EXP') {
        granja = rawGranja;
      } else if (numSala > 0 && salasModel) {
        granja = salasModel.getAreaBySalaSync(numSala);
      } else {
        granja = (numSala >= 25 && numSala <= 41) ? 'EXP' : 'EST';
      }

      // Zona (Sigla): E o X
      let rawZona = colZona !== -1 && r[colZona] !== undefined ? String(r[colZona] || '').trim().toUpperCase() : '';
      let zona = '';
      if (rawZona === 'E' || rawZona === 'X') {
        zona = rawZona;
      } else if (rawGranja === 'E' || rawGranja === 'X') {
        zona = rawGranja;
      } else if (numSala > 0 && salasModel) {
        zona = salasModel.getSiglaBySalaSync(numSala);
      } else {
        zona = (numSala >= 25 && numSala <= 41) ? 'X' : 'E';
      }

      const rawPeso = colPeso !== -1 ? r[colPeso] : r[4];
      const pesoVal = rawPeso !== undefined && rawPeso !== null && rawPeso !== '' ? Number(rawPeso) : null;

      records.push({
        id: i,
        vuelta: colVuelta !== -1 ? Number(r[colVuelta]) || 0 : (Number(r[0]) || 0),
        pic: colPic !== -1 ? Number(r[colPic]) || 0 : (Number(r[1]) || 0),
        cantidad: colCantidad !== -1 ? Number(r[colCantidad]) || 0 : (Number(r[2]) || 0),
        causa: colCausa !== -1 ? Number(r[colCausa]) || 0 : (Number(r[3]) || 0),
        peso: pesoVal,
        turno: colTurno !== -1 ? Number(r[colTurno]) || 1 : (Number(r[5]) || 1),
        sala: numSala,
        semana: colSemana !== -1 ? Number(r[colSemana]) || 0 : (Number(r[7]) || 0),
        nota: colNota !== -1 ? Number(r[colNota]) || 0 : (Number(r[8]) || 0),
        observacion: colObs !== -1 ? String(r[colObs] || '').trim() : (String(r[9] || '').trim()),
        granja: granja,
        zona: zona,
        maternidad: mat,
        createdAt: new Date().toISOString()
      });
    }
    return records;
  },

  /**
   * Procesa un archivo Excel File/Blob directamente desde el navegador
   */
  async handleProcessExcelFile(file) {
    if (!file) return;
    if (typeof XLSX === 'undefined') {
      this.notification.error('La librería SheetJS (XLSX) no está cargada.');
      return;
    }

    const btn = document.getElementById('btn-header-refresh-data');
    if (btn) btn.classList.add('loading');

    try {
      this.notification.toast('Leyendo archivo Excel...', 'info');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
      const sheetName = workbook.SheetNames.includes('MPD') ? 'MPD' : workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const records = this.parseExcelRows(rows);

      if (records.length === 0) {
        throw new Error('No se encontraron registros válidos en la hoja MPD.');
      }

      await this.model.clearAll();
      await this.model.bulkCreate(records);
      window.App.Data.mpdSeed = records;

      await this.refreshCurrentView();
      this.notification.toast(`¡Éxito! Se actualizaron ${records.length.toLocaleString('es-ES')} registros desde "${file.name}".`, 'success');
    } catch (err) {
      console.error('Error al procesar archivo Excel:', err);
      this.notification.error('Error al procesar: ' + err.message);
    } finally {
      if (btn) btn.classList.remove('loading');
    }
  },

  /**
   * Procesa un libro Excel maestro (INFORMACION SAP.xlsm) sincronizando todas sus hojas
   * hacia sus respectivos módulos (MPD, Cierre de Salas, Resumen de Partos)
   */
  async processMasterWorkbook(wb, sourceName = 'INFORMACION SAP.xlsm') {
    if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) {
      throw new Error('El libro Excel no contiene hojas de cálculo legibles.');
    }

    const syncedSheets = [];

    // 1. Sincronizar Hoja MPD
    const mpdSheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === 'MPD') || wb.SheetNames[0];
    if (mpdSheetName && wb.Sheets[mpdSheetName]) {
      const mpdWs = wb.Sheets[mpdSheetName];
      const mpdRows = XLSX.utils.sheet_to_json(mpdWs, { header: 1 });
      const mpdRecords = this.parseExcelRows(mpdRows);
      if (mpdRecords.length > 0) {
        await this.model.clearAll();
        await this.model.bulkCreate(mpdRecords);
        syncedSheets.push(`MPD (${mpdRecords.length.toLocaleString('es-ES')} filas)`);
      }
    }

    // 1b. Sincronizar Hoja PARTOS SALAS (seguimiento diario acumulado para salas abiertas)
    const partosSalasSheetName = wb.SheetNames.find(n => {
      const u = n.trim().toUpperCase();
      return u === 'PARTOS SALAS' || u === 'PARTOS_SALAS' || u.includes('PARTOS SALA');
    });
    if (partosSalasSheetName && wb.Sheets[partosSalasSheetName] && window.App.Models.PartosSalas) {
      const psWs = wb.Sheets[partosSalasSheetName];
      const psRows = XLSX.utils.sheet_to_json(psWs, { header: 1, defval: '' });
      const psRecords = window.App.Models.PartosSalas.parseExcelRows(psRows);
      await window.App.Models.PartosSalas.bulkReplace(psRecords);
      syncedSheets.push(`Partos Salas (${psRecords.length.toLocaleString('es-ES')} filas)`);
    }

    // 2. Sincronizar Hoja CIERRES DE SALA (excluye cortes PRE ya cerrados, reteniendo preRows para Opción A)
    let excelPreRows = [];
    const cierresSheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === 'CIERRES DE SALA') ||
                             wb.SheetNames.find(n => n.toUpperCase().includes('CIERRES'));
    if (cierresSheetName && wb.Sheets[cierresSheetName] && window.App.Controllers.Cierres) {
      const cierresWs = wb.Sheets[cierresSheetName];
      const cierresRows = XLSX.utils.sheet_to_json(cierresWs, { header: 1, defval: '' });
      const detailed = typeof window.App.Controllers.Cierres.parseExcelRowsDetailed === 'function'
        ? window.App.Controllers.Cierres.parseExcelRowsDetailed(cierresRows)
        : { records: window.App.Controllers.Cierres.parseExcelRows(cierresRows), preRows: [], excludedPreCount: 0 };
      excelPreRows = detailed.preRows || [];
      if (detailed.records.length > 0) {
        await window.App.Models.Cierres.clearAll();
        await window.App.Models.Cierres.bulkCreate(detailed.records);
        const exclTxt = detailed.excludedPreCount > 0 ? `, -${detailed.excludedPreCount} PRE cerrados` : '';
        syncedSheets.push(`Cierres (${detailed.records.length.toLocaleString('es-ES')} filas${exclTxt})`);
      }
    }

    // 3. Sincronizar Hoja RESUMEN DE PARTOS (con verificación LNV + LNM + LNMom = LNT)
    const partosSheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === 'RESUMEN DE PARTOS') ||
                            wb.SheetNames.find(n => n.toUpperCase().includes('PARTO'));
    if (partosSheetName && wb.Sheets[partosSheetName] && window.App.Controllers.Partos) {
      const partosWs = wb.Sheets[partosSheetName];
      const partosRows = XLSX.utils.sheet_to_json(partosWs, { header: 1 });
      const parseResult = window.App.Controllers.Partos.parseExcelRows(partosRows);
      const partosRecords = Array.isArray(parseResult) ? parseResult : (parseResult.records || []);
      if (partosRecords.length > 0) {
        await window.App.Models.Partos.clearAll();
        await window.App.Models.Partos.bulkCreate(partosRecords);
        // Comprobar y asegurar integridad matemática
        await window.App.Models.Partos.verifyIntegrity({ autoFix: true });
        syncedSheets.push(`Partos (${partosRecords.length.toLocaleString('es-ES')} filas)`);
      }
    }

    // 4. Sincronizar Hoja DESTETES
    const destetesSheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === 'DESTETES') ||
                              wb.SheetNames.find(n => n.toUpperCase().includes('DESTETE'));
    if (destetesSheetName && wb.Sheets[destetesSheetName] && window.App.Controllers.Destetes) {
      const destetesWs = wb.Sheets[destetesSheetName];
      const destetesRows = XLSX.utils.sheet_to_json(destetesWs, { header: 1 });
      const destetesRecords = window.App.Controllers.Destetes.parseExcelRows(destetesRows);
      if (destetesRecords.length > 0) {
        await window.App.Models.Destetes.clearAll();
        await window.App.Models.Destetes.bulkCreate(destetesRecords);
        syncedSheets.push(`Destetes (${destetesRecords.length.toLocaleString('es-ES')} filas)`);
      }
    }

    // 4b. Reconstruir Maternidad automáticamente desde módulos del sistema (sin depender de hoja MATERNIDAD)
    if (window.App.Models.Maternidad && typeof window.App.Models.Maternidad.syncFromSystem === 'function') {
      const matRes = await window.App.Models.Maternidad.syncFromSystem({ excelPreRows });
      syncedSheets.push(`Maternidad auto (${matRes.total} lotes)`);
    }

    this.recordExcelSyncTimestamp(sourceName);

    // 5. Refrescar la vista activa en pantalla
    const currentHash = window.location.hash || '';
    if (currentHash.startsWith('#cierres') && window.App.Controllers.Cierres) {
      const opts = await window.App.Models.Cierres.getFilterOptions();
      if (window.App.Views.Cierres.container) {
        window.App.Views.Cierres.renderSkeleton(opts);
        window.App.Controllers.Cierres.bindEvents();
      }
      await window.App.Controllers.Cierres.loadData();
    } else if (currentHash.startsWith('#partos') && window.App.Controllers.Partos) {
      const opts = await window.App.Models.Partos.getFilterOptions();
      if (window.App.Views.Partos.container) {
        window.App.Views.Partos.renderSkeleton(opts);
        window.App.Controllers.Partos.bindEvents();
      }
      await window.App.Controllers.Partos.loadData();
    } else if (currentHash.startsWith('#destetes') && window.App.Controllers.Destetes) {
      const opts = await window.App.Models.Destetes.getFilterOptions();
      if (window.App.Views.Destetes.container) {
        window.App.Views.Destetes.renderSkeleton(opts);
        window.App.Controllers.Destetes.bindEvents();
      }
      await window.App.Controllers.Destetes.loadTableData();
    } else if (currentHash.startsWith('#maternidad') && window.App.Controllers.Maternidad) {
      const opts = await window.App.Models.Maternidad.getFilterOptions();
      if (window.App.Views.Maternidad.container) {
        window.App.Views.Maternidad.renderSkeleton(opts);
        window.App.Controllers.Maternidad.bindEvents();
      }
      await window.App.Controllers.Maternidad.loadData();
    } else {
      await this.refreshCurrentView();
    }

    const summaryText = syncedSheets.length > 0 ? syncedSheets.join(' • ') : 'Datos actualizados';
    this.notification.success(`¡Sincronización Exitosa!\n${summaryText} desde ${sourceName}.`);
  },

  /**
   * Guarda la marca de tiempo de la última sincronización Excel en localStorage y actualiza el header
   */
  recordExcelSyncTimestamp(sourceName = 'Excel') {
    try {
      const now = new Date();
      localStorage.setItem('app_last_excel_sync', now.toISOString());
      localStorage.setItem('app_last_excel_name', String(sourceName || 'Excel'));
      this.renderExcelSyncBadge();
    } catch (e) {
      // Silencioso si localStorage no está disponible
    }
  },

  renderExcelSyncBadge() {
    try {
      const badge = document.getElementById('header-last-excel-sync');
      if (!badge) return;
      const iso = localStorage.getItem('app_last_excel_sync');
      if (!iso) {
        badge.style.display = 'none';
        return;
      }
      const d = new Date(iso);
      const name = localStorage.getItem('app_last_excel_name') || 'Excel';
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      badge.textContent = `Excel: ${dd}/${mo} ${hh}:${mm}`;
      badge.title = `Última carga: ${name} (${d.toLocaleString('es-ES')}). También puedes arrastrar otro .xlsm/.xlsx a la ventana.`;
      badge.style.display = 'inline-flex';
    } catch (e) {
      // Silencioso
    }
  },

  /**
   * Refresca los datos del sistema desde INFORMACION SAP.xlsm
   * Si está en servidor web intenta fetch directo; si está en protocolo local file:// abre el selector de archivo.
   */
  async handleHeaderRefresh() {
    const btn = document.getElementById('btn-header-refresh-data');
    if (btn) btn.classList.add('loading');

    try {
      // 1. Si no es protocolo file://, intentar fetch directo
      if (window.location.protocol !== 'file:') {
        try {
          const response = await fetch('./INFORMACION SAP.xlsm?_t=' + Date.now());
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            if (typeof XLSX !== 'undefined') {
              const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
              await this.processMasterWorkbook(wb, 'INFORMACION SAP.xlsm');
              return;
            }
          }
        } catch (fetchErr) {
          console.info('Fetch directo no disponible, abriendo selector de archivo.');
        }
      }

      // 2. En entorno local file:// (o si fetch no respondió):
      // Abrir el selector nativo para que el usuario elija su archivo Excel actualizado sin restricciones CORS
      const fileInput = document.getElementById('header-file-excel');
      if (fileInput) {
        fileInput.value = '';
        fileInput.click();
      } else {
        // Fallback: sincronizar con los seeds en memoria si no hay input
        if (window.App.Data && Array.isArray(window.App.Data.mpdSeed) && window.App.Data.mpdSeed.length > 0) {
          await this.model.clearAll();
          await this.model.bulkCreate(window.App.Data.mpdSeed);
        }
        if (window.App.Data && Array.isArray(window.App.Data.cierresSeed) && window.App.Models.Cierres) {
          await window.App.Models.Cierres.clearAll();
          await window.App.Models.Cierres.bulkCreate(window.App.Data.cierresSeed);
        }
        if (window.App.Data && Array.isArray(window.App.Data.partosSeed) && window.App.Models.Partos) {
          await window.App.Models.Partos.clearAll();
          await window.App.Models.Partos.bulkCreate(window.App.Data.partosSeed);
        }
        await this.refreshCurrentView();
        this.notification.success('Datos locales sincronizados.');
      }
    } catch (err) {
      console.error('Error al refrescar datos:', err);
      this.notification.error('Error al refrescar datos: ' + err.message);
    } finally {
      if (btn) btn.classList.remove('loading');
    }
  },

  /**
   * Refresca la vista activa para mostrar inmediatamente los datos actualizados
   */
  async refreshCurrentView() {
    // 1. Actualizar opciones de filtros (salas, pics, notas)
    const filterOptions = await this.model.getFilterOptions();
    if (this.view.container) {
      this.view.renderSkeleton(filterOptions);
      this.bindEvents();
    }

    // 2. Refrescar según la pestaña activa
    if (this.state.activeTab === 'charts') {
      await this.loadCharts(this.state.chartPic, this.state.chartVuelta);
    } else {
      this.state.page = 1;
      await this.loadData();
    }
  },

  /**
   * Exporta a formato CSV respetando los filtros actuales
   */
  async handleExportCsv() {
    try {
      const data = await this.model.queryWithFilters({
        search: this.state.search,
        pic: this.state.pic,
        sala: this.state.sala,
        nota: this.state.nota,
        page: 1,
        pageSize: 100000 // todos los filtrados
      });

      if (!data.items || data.items.length === 0) {
        this.notification.warning('No hay registros filtrados para exportar.');
        return;
      }

      const headers = ['Vuelta', 'Pic', 'Cantidad', 'Causa', 'Peso', 'Turno', 'Sala', 'Semana', 'Nota', 'Observacion', 'Granja', 'Zona', 'Maternidad'];
      const rows = data.items.map(r => [
        r.vuelta,
        r.pic,
        r.cantidad,
        r.causa,
        r.peso !== null && r.peso !== undefined ? String(r.peso).replace('.', ',') : '',
        r.turno ? (String(r.turno).startsWith('T') ? r.turno : `T${r.turno}`) : '',
        r.sala,
        r.semana,
        r.nota,
        `"${String(r.observacion || '').replace(/"/g, '""')}"`,
        `"${String(r.granja || '').replace(/"/g, '""')}"`,
        `"${String(r.zona || '').replace(/"/g, '""')}"`,
        `"${String(r.maternidad || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `MPD_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.notification.toast(`Exportados ${data.items.length} registros a CSV`, 'success');
    } catch (err) {
      console.error('Error al exportar CSV:', err);
      this.notification.error('Error al exportar los datos: ' + err.message);
    }
  }
};

