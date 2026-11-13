/**
 * CierresController: Coordina la interacción, búsqueda inteligente, filtros,
 * paginación, importación desde archivo Excel (.xlsm) y exportación a CSV para Cierre de Salas.
 */
window.App = window.App || {};
window.App.Controllers = window.App.Controllers || {};

window.App.Controllers.Cierres = {
  model: window.App.Models.Cierres,
  view: window.App.Views.Cierres,
  notification: window.App.Utils.Notification,

  state: {
    search: '',
    vcie: '',
    picCierre: '',
    calendarDate: '',
    sala: '',
    estado: '',
    maternidad: '',
    page: 1,
    pageSize: 50,
    sortBy: 'lote',
    sortDir: 'desc',
    activeTab: 'table',
    chartVuelta: 20,
    chartPic: null,
    chartDate: '',
    isInitialized: false,
    searchDebounceTimer: null
  },

  /**
   * Inicializa el módulo Cierre de Salas
   */
  async init(subview = 'table') {
    this.view.container = document.getElementById('view-cierres');
    if (!this.view.container) return;

    const Format = window.App.Utils.Format;
    const currentInfo = Format ? Format.getPicInfo(new Date()) : { vuelta: 20, pic: 131 };
    const currentIso = Format && Format.formatDateISO ? Format.formatDateISO(new Date()) : new Date().toISOString().slice(0, 10);

    this.state.chartVuelta = currentInfo.vuelta;
    this.state.chartPic = currentInfo.pic;
    this.state.chartDate = currentIso;

    // Asegurar datos semilla si la base está vacía
    await this.ensureSeedData();

    // Obtener opciones únicas de salas, maternidades, etc.
    const filterOptions = await this.model.getFilterOptions();
    this.view.renderSkeleton(filterOptions);
    this.bindEvents();
    this.state.isInitialized = true;

    // Conmutar a la subvista solicitada
    await this.switchTab(subview, false);
  },

  /**
   * Cambia entre la subvista 'table' y 'charts'
   */
  async switchTab(tabName = 'table', updateHash = true) {
    this.state.activeTab = tabName;
    this.view.switchTab(tabName);

    // Sincronizar submenú del sidebar
    const subItems = document.querySelectorAll('#submenu-cierres .nav-sub-item');
    subItems.forEach(item => {
      const isTarget = (tabName === 'charts' && item.dataset.view === 'cierres-charts') ||
                       (tabName === 'table' && item.dataset.view === 'cierres-table');
      item.classList.toggle('active', isTarget);
    });

    if (updateHash) {
      window.location.hash = tabName === 'charts' ? '#cierres-charts' : '#cierres-table';
    }

    if (tabName === 'charts') {
      await this.loadCharts();
    } else {
      await this.loadData();
    }
  },

  /**
   * Carga los datos analíticos para los gráficos
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

      const chartData = await this.model.getChartsData(selectedPic, selectedVuelta);

      let isoDate = this.state.chartDate;
      if (!isoDate && selectedPic !== 'all' && selectedPic !== null && selectedPic !== undefined && !isNaN(selectedPic) && !isNaN(selectedVuelta)) {
        try {
          const dateObj = Format.FCalendario(Number(selectedPic), Number(selectedVuelta));
          isoDate = Format.formatDateISO ? Format.formatDateISO(dateObj) : dateObj.toISOString().slice(0, 10);
        } catch (e) {}
      }

      this.view.renderCharts({
        ...chartData,
        isoDate
      });
    } catch (err) {
      console.error('Error cargando gráficos de Cierres:', err);
      this.notification.error('Error al generar los gráficos de Cierres de Sala.');
    }
  },

  /**
   * Asegura que existan datos iniciales en la base de datos
   */
  async ensureSeedData() {
    try {
      const all = await this.model.getAll();
      const seed = window.App.Data && Array.isArray(window.App.Data.cierresSeed) ? window.App.Data.cierresSeed : [];
      const currentPrePartos = all.filter(r => r.estado === 'Pre-Parto').length;
      const hasLegacyPP = all.some(r => String(r.lotePic || '').trim().toUpperCase() === 'PP');
      if (seed.length > 0 && (all.length === 0 || all.length !== seed.length || (all.length > 0 && (!all[0].estado || !all[0].estatus)) || currentPrePartos !== 2 || hasLegacyPP)) {
        console.log(`Sembrando/actualizando ${seed.length} registros en cierres...`);
        await this.model.clearAll();
        await this.model.bulkCreate(seed);
        console.log('Sembrado cierres completado.');
      }
    } catch (err) {
      console.warn('Error al verificar sembrado de cierres:', err);
    }
  },

  /**
   * Vincula todos los escuchadores de eventos
   */
  bindEvents() {
    const Format = window.App.Utils.Format;
    const currentVuelta = Format ? Format.getCurrentVuelta() : 20;

    // Conmutación interna de pestañas
    const tabsNav = document.getElementById('cierres-tabs-nav');
    if (tabsNav) {
      tabsNav.addEventListener('click', async (e) => {
        const btn = e.target.closest('.mpd-tab-btn');
        if (!btn) return;
        const tab = btn.dataset.tab;
        if (tab && tab !== this.state.activeTab) {
          await this.switchTab(tab, true);
        }
      });
    }

    // Sincronización en Gráficos (Vuelta-PIC con selector de fecha integrado)
    const chartsVp = document.getElementById('cierres-charts-vueltapic');
    const chartsDate = document.getElementById('cierres-charts-date');

    if (Format && chartsVp) {
      Format.setupVueltaPicInput(chartsVp);
    }
    if (Format && chartsDate) {
      Format.attachCalendarPicker(chartsDate);
      Format.updateDateCaption('cierres-charts-date-caption', chartsDate.value || new Date());
    }

    const syncChartsFromVueltaPic = async () => {
      const val = chartsVp ? chartsVp.value.trim() : '';
      if (Format) {
        const parsed = Format.parseVueltaPic(val);
        if (parsed.isValid) {
          if (parsed.date) {
            const isoStr = Format.formatDateISO ? Format.formatDateISO(parsed.date) : parsed.date.toISOString().slice(0, 10);
            if (chartsDate) chartsDate.value = isoStr;
            this.state.chartDate = isoStr;
            Format.updateDateCaption('cierres-charts-date-caption', parsed.date);
          }
          this.state.chartVuelta = parsed.vuelta;
          this.state.chartPic = parsed.pic;
          await this.loadCharts(parsed.pic, parsed.vuelta);
        } else if (parsed.vuelta !== null && parsed.pic === null) {
          if (chartsDate) chartsDate.value = '';
          Format.updateDateCaption('cierres-charts-date-caption', '');
          this.state.chartVuelta = parsed.vuelta;
          this.state.chartPic = 'all';
          this.state.chartDate = '';
          await this.loadCharts('all', parsed.vuelta);
        } else {
          if (chartsDate) chartsDate.value = '';
          Format.updateDateCaption('cierres-charts-date-caption', '');
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
          Format.updateDateCaption('cierres-charts-date-caption', val);
          await this.loadCharts(info.pic, info.vuelta);
        } catch (err) {
          console.warn('Error calculando PIC desde fecha en gráficos de Cierres:', err);
        }
      } else {
        if (chartsVp) chartsVp.value = Format ? Format.getDefaultVueltaPicPrefix() : '20-';
        Format.updateDateCaption('cierres-charts-date-caption', '');
        this.state.chartPic = 'all';
        this.state.chartDate = '';
        await this.loadCharts('all', currentVuelta);
      }
    };

    if (chartsDate) {
      chartsDate.addEventListener('change', handleChartsDateSync);
      chartsDate.addEventListener('input', handleChartsDateSync);
    }

    // Buscador inteligente con debounce de 250ms
    const searchInput = document.getElementById('cierres-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this.state.searchDebounceTimer);
        this.state.searchDebounceTimer = setTimeout(() => {
          this.state.search = e.target.value;
          this.state.page = 1;
          this.loadData();
        }, 250);
      });
    }

    // Control sincronizado Fecha PIC (Vuelta-PIC) ↔ Fecha Calendario en Tabla
    const filterVp = document.getElementById('cierres-filter-vueltapic');
    const filterDate = document.getElementById('cierres-filter-date');

    if (Format && filterVp) {
      Format.setupVueltaPicInput(filterVp);
    }
    if (Format && filterDate) {
      Format.attachCalendarPicker(filterDate);
      Format.updateDateCaption('cierres-filter-date-caption', filterVp ? filterVp.value : '');
    }

    const syncDateFromVueltaPic = () => {
      const val = filterVp ? filterVp.value.trim() : '';
      if (Format) {
        const parsed = Format.parseVueltaPic(val);
        if (parsed.isValid) {
          if (parsed.date && filterDate) {
            filterDate.value = Format.formatDateISO ? Format.formatDateISO(parsed.date) : parsed.date.toISOString().slice(0, 10);
          }
          this.state.vcie = parsed.vuelta;
          this.state.picCierre = parsed.pic;
          Format.updateDateCaption('cierres-filter-date-caption', parsed.date);
        } else if (parsed.vuelta !== null && parsed.pic === null) {
          if (filterDate) filterDate.value = '';
          Format.updateDateCaption('cierres-filter-date-caption', '');
          this.state.vcie = parsed.vuelta;
          this.state.picCierre = '';
        } else {
          if (filterDate) filterDate.value = '';
          Format.updateDateCaption('cierres-filter-date-caption', '');
          this.state.vcie = '';
          this.state.picCierre = '';
        }
      }

      this.state.page = 1;
      this.loadData();
    };

    if (filterVp) {
      filterVp.addEventListener('input', () => {
        clearTimeout(this.state.searchDebounceTimer);
        this.state.searchDebounceTimer = setTimeout(syncDateFromVueltaPic, 300);
      });
      filterVp.addEventListener('change', syncDateFromVueltaPic);
    }

    const handleDateInputSync = (e) => {
      const val = e.target.value;
      if (val) {
        try {
          const info = Format.getPicInfo(val);
          if (filterVp) filterVp.value = Format.formatVueltaPic(info.vuelta, info.pic);
          this.state.vcie = info.vuelta;
          this.state.picCierre = info.pic;
          this.state.calendarDate = val;
          Format.updateDateCaption('cierres-filter-date-caption', val);
        } catch (err) {
          console.warn('Error calculando PIC desde fecha:', err);
        }
      } else {
        if (filterVp) filterVp.value = Format ? Format.getDefaultVueltaPicPrefix() : '20-';
        Format.updateDateCaption('cierres-filter-date-caption', '');
        this.state.vcie = '';
        this.state.picCierre = '';
        this.state.calendarDate = '';
      }
      this.state.page = 1;
      this.loadData();
    };

    if (filterDate) {
      filterDate.addEventListener('change', handleDateInputSync);
      filterDate.addEventListener('input', handleDateInputSync);
    }

    // Filtro por Sala
    const filterSala = document.getElementById('cierres-filter-sala');
    if (filterSala) {
      filterSala.addEventListener('change', (e) => {
        this.state.sala = e.target.value;
        this.state.page = 1;
        this.loadData();
      });
    }

    // Filtro por Estado (Pre-Parto o Cerrada)
    const filterEstado = document.getElementById('cierres-filter-estado');
    if (filterEstado) {
      filterEstado.addEventListener('change', (e) => {
        this.state.estado = e.target.value;
        this.state.page = 1;
        this.loadData();
      });
    }

    // Filtro por Maternidad
    const filterMat = document.getElementById('cierres-filter-maternidad');
    if (filterMat) {
      filterMat.addEventListener('change', (e) => {
        this.state.maternidad = e.target.value;
        this.state.page = 1;
        this.loadData();
      });
    }

    // Selector de tamaño de página
    const pageSizeSelect = document.getElementById('cierres-page-size');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', (e) => {
        this.state.pageSize = parseInt(e.target.value, 10) || 50;
        this.state.page = 1;
        this.loadData();
      });
    }

    // Botón Limpiar Filtros
    const btnClear = document.getElementById('btn-cierres-clear-filters');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        this.state.search = '';
        this.state.vcie = '';
        this.state.picCierre = '';
        this.state.calendarDate = '';
        this.state.sala = '';
        this.state.estado = '';
        this.state.maternidad = '';
        this.state.page = 1;

        if (searchInput) searchInput.value = '';
        if (filterVp) filterVp.value = Format ? Format.getDefaultVueltaPicPrefix() : '20-';
        if (filterDate) filterDate.value = '';
        if (Format) Format.updateDateCaption('cierres-filter-date-caption', '');
        if (filterSala) filterSala.value = '';
        if (filterEstado) filterEstado.value = '';
        if (filterMat) filterMat.value = '';

        this.loadData();
        this.notification.toast('Filtros reiniciados correctamente', 'info');
      });
    }

    // Delegación para botones de paginación y ordenamiento por columnas
    const wrapper = document.getElementById('cierres-table-wrapper');
    if (wrapper) {
      wrapper.addEventListener('click', (e) => {
        // Ordenamiento por cabecera
        const th = e.target.closest('.th-sortable');
        if (th) {
          const sortCol = th.dataset.sort;
          if (!sortCol) return;

          if (this.state.sortBy === sortCol) {
            this.state.sortDir = this.state.sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            this.state.sortBy = sortCol;
            this.state.sortDir = 'desc';
          }

          this.state.page = 1;
          this.loadData();
          return;
        }

        const pageBtn = e.target.closest('.cierres-page-btn');
        if (pageBtn && !pageBtn.disabled) {
          const targetPage = parseInt(pageBtn.dataset.page, 10);
          if (targetPage && targetPage !== this.state.page) {
            this.state.page = targetPage;
            this.loadData();
            wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return;
        }

        if (e.target.closest('#btn-cierres-jump-page')) {
          const jumpInput = document.getElementById('cierres-jump-page');
          if (jumpInput) {
            const pageVal = parseInt(jumpInput.value, 10);
            if (pageVal && pageVal >= 1) {
              this.state.page = pageVal;
              this.loadData();
              wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        }
      });
    }

    // Botón Importar Excel
    const fileInput = document.getElementById('cierres-file-input');
    const btnImport = document.getElementById('btn-cierres-import');
    if (btnImport && fileInput) {
      btnImport.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await this.handleProcessExcelFile(file);
        fileInput.value = '';
      });
    }

    // Botón Restaurar Base
    const btnReloadSeed = document.getElementById('btn-cierres-reload-seed');
    if (btnReloadSeed) {
      btnReloadSeed.addEventListener('click', async () => {
        if (!window.App.Data || !window.App.Data.cierresSeed) {
          this.notification.alert('Información', 'No se encontró la data original de Cierres de Sala en memoria.', 'warning');
          return;
        }

        const confirm = await this.notification.confirm(
          'Restaurar Base de Datos',
          '¿Deseas restaurar la tabla con los registros originales del archivo INFORMACION SAP.xlsm?',
          'Sí, restaurar',
          'Cancelar'
        );

        if (confirm) {
          await this.model.clearAll();
          await this.model.bulkCreate(window.App.Data.cierresSeed);
          this.notification.success('Base de datos de Cierre de Salas restaurada exitosamente.');
          const filterOptions = await this.model.getFilterOptions();
          this.view.renderSkeleton(filterOptions);
          this.bindEvents();
          await this.loadData();
        }
      });
    }

    // Botón Exportar CSV
    const btnExport = document.getElementById('btn-cierres-export-csv');
    if (btnExport) {
      btnExport.addEventListener('click', async () => {
        await this.exportFilteredDataToCSV();
      });
    }
  },

  /**
   * Carga los datos filtrados y renderiza la tabla
   */
  async loadData() {
    try {
      const result = await this.model.queryWithFilters({
        search: this.state.search,
        vcie: this.state.vcie,
        picCierre: this.state.picCierre,
        sala: this.state.sala,
        estado: this.state.estado,
        maternidad: this.state.maternidad,
        page: this.state.page,
        pageSize: this.state.pageSize,
        sortBy: this.state.sortBy || 'lote',
        sortDir: this.state.sortDir || 'desc'
      });

      this.view.renderTable(result, this.state.sortBy || 'lote', this.state.sortDir || 'desc');
    } catch (err) {
      console.error('Error al consultar datos de Cierre de Salas:', err);
      this.notification.error('Ocurrió un error al cargar la información de cierres.');
    }
  },

  /**
   * Procesa la importación de un archivo Excel
   */
  async handleProcessExcelFile(file) {
    if (typeof XLSX === 'undefined') {
      this.notification.alert('Error', 'La librería de lectura de Excel no está disponible en modo offline.', 'danger');
      return;
    }

    try {
      this.notification.toast('Procesando archivo Excel...', 'info');

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      // Buscar hoja de Cierres: estrictamente 'CIERRES DE SALA'
      let targetSheetName = workbook.SheetNames.find(n => n.trim().toUpperCase() === 'CIERRES DE SALA');
      if (!targetSheetName) {
        targetSheetName = workbook.SheetNames.find(n => n.trim().toUpperCase().includes('CIERRES DE SALA'));
      }
      if (!targetSheetName) {
        targetSheetName = workbook.SheetNames.find(n => n.toUpperCase().includes('CIERRES') || n.toUpperCase().includes('CIERRE'));
      }
      if (!targetSheetName) {
        throw new Error('No se encontró la hoja "CIERRES DE SALA" en el archivo Excel seleccionado.');
      }

      const worksheet = workbook.Sheets[targetSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (!rows || rows.length <= 1) {
        throw new Error(`La hoja "${targetSheetName}" no contiene registros válidos.`);
      }

      const { records: parsedRecords, preRows, excludedPreCount } = this.parseExcelRowsDetailed(rows);
      if (parsedRecords.length === 0) {
        throw new Error('No se encontraron filas con el formato de Cierre de Salas esperado.');
      }

      const excludedNote = excludedPreCount > 0
        ? ` (se excluyeron ${excludedPreCount} registro(s) PRE ya cerrados para evitar duplicación)`
        : '';
      const confirm = await this.notification.confirm(
        'Importar Datos de Cierres',
        `Se encontraron ${parsedRecords.length} registros válidos en la hoja "${targetSheetName}"${excludedNote}. ¿Deseas reemplazar la base actual?`,
        'Reemplazar todo',
        'Cancelar'
      );

      if (confirm) {
        await this.model.clearAll();
        await this.model.bulkCreate(parsedRecords);
        if (window.App.Models.Maternidad && typeof window.App.Models.Maternidad.syncFromSystem === 'function') {
          await window.App.Models.Maternidad.syncFromSystem({ excelPreRows: preRows });
        }
        this.notification.success(`Se importaron exitosamente ${parsedRecords.length} registros de Cierre de Salas.`);
        const filterOptions = await this.model.getFilterOptions();
        this.view.renderSkeleton(filterOptions);
        this.bindEvents();
        await this.loadData();
      }
    } catch (err) {
      console.error('Error procesando Excel de Cierres:', err);
      this.notification.alert('Error de Importación', err.message || 'No se pudo leer el archivo Excel.', 'danger');
    }
  },

  /**
   * Parsea las filas de una hoja de cálculo y separa cortes PRE que ya tienen Cierre Completo.
   * Devuelve { records, preRows, excludedPreCount }.
   */
  parseExcelRowsDetailed(rows) {
    const allParsed = [];
    const headers = rows[0].map(h => String(h).trim().toUpperCase());

    const findCol = (...names) => {
      for (const name of names) {
        const idx = headers.findIndex(h => h === name.toUpperCase() || h.includes(name.toUpperCase()));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const colVIni = findCol('VINI', 'V. INI', 'VUELTA INI');
    const colPicIni = findCol('PIC INICIO', 'PIC INI', 'PICINI');
    const colVcie = findCol('VCIE', 'V. CIE', 'VUELTA CIE', 'VUELTA CIERRE');
    const colPicCie = findCol('PIC CIERRE', 'PIC CIE', 'PICCIERRE');
    const colSala = findCol('SALA');
    const colEstado = findCol('ESTADO');
    const colEstatus = findCol('ESTATUS', 'STATUS');
    const colVLote = findCol('VLOTE', 'V. LOTE', 'VUELTA LOTE');
    const colLotePic = findCol('LOTEPIC', 'LOTE PIC', 'LOTE');
    const colPartos = findCol('PARTOS', 'PARTO');
    const colLnv = findCol('LNV', 'LECHONES VIVOS');
    const colLnm = findCol('LNM', 'LECHONES MUERTOS', 'MORTINATOS');
    const colLnMom = findCol('LNMOM', 'LN MOM', 'MOMIAS');
    const colMpd = findCol('MPD');
    const colPesoX = findCol('PESO X', 'PESOX', 'PESO');
    const colMat = findCol('MATERNIDAD', 'MAT');

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || row.every(c => c === '' || c === null || c === undefined)) continue;

      const rawLotePic = colLotePic !== -1 ? row[colLotePic] : '';
      const rawPicCie = colPicCie !== -1 ? row[colPicCie] : '';
      const rawEstado = colEstado !== -1 ? String(row[colEstado] || '').trim() : '';
      const numSala = colSala !== -1 ? Number(row[colSala]) || 0 : 0;

      const strLote = rawLotePic !== null && rawLotePic !== undefined ? String(rawLotePic).trim().toUpperCase() : '';
      const strPicCie = rawPicCie !== null && rawPicCie !== undefined ? String(rawPicCie).trim().toUpperCase() : '';
      const strEstado = rawEstado.toUpperCase();

      // Regla de salas pre-parto: PRE (o legado PP) en lotePic, picCierre o estado
      const isPreParto = strLote === 'PRE' || strLote === 'PP' ||
                         strPicCie === 'PRE' || strPicCie === 'PP' ||
                         strEstado === 'PRE-PARTO' || strEstado === 'PREPARTO' || strEstado === 'PRE-CIERRE' || strEstado === 'PRE';

      const estado = isPreParto ? 'Pre-Parto' : 'Cerrada';
      const lotePic = isPreParto ? 'PRE' : (Number(rawLotePic) || 0);
      const picCierre = (strPicCie === 'PRE' || strPicCie === 'PP') ? 0 : (Number(rawPicCie) || 0);

      // Si la columna Maternidad fue removida del Excel o está vacía, se resuelve automáticamente desde la sala
      let mat = colMat !== -1 ? String(row[colMat] || '').trim() : '';
      if (!mat && numSala > 0 && window.App.Models.SalasMaternidad) {
        mat = window.App.Models.SalasMaternidad.getMatBySalaSync(numSala);
      }

      allParsed.push({
        vini: colVIni !== -1 ? Number(row[colVIni]) || 0 : 0,
        picInicio: colPicIni !== -1 ? Number(row[colPicIni]) || 0 : 0,
        vcie: colVcie !== -1 ? Number(row[colVcie]) || 0 : 0,
        picCierre: picCierre,
        sala: numSala,
        vlote: colVLote !== -1 ? Number(row[colVLote]) || 0 : 0,
        lotePic: lotePic,
        partos: colPartos !== -1 ? Number(row[colPartos]) || 0 : 0,
        lnv: colLnv !== -1 ? Number(row[colLnv]) || 0 : 0,
        lnm: colLnm !== -1 ? Number(row[colLnm]) || 0 : 0,
        lnMom: colLnMom !== -1 ? Number(row[colLnMom]) || 0 : 0,
        mpd: colMpd !== -1 ? Number(row[colMpd]) || 0 : 0,
        pesoX: isPreParto ? 0 : (colPesoX !== -1 && row[colPesoX] !== '' ? Number(row[colPesoX]) || 0 : 0),
        maternidad: mat,
        estado: estado,
        estatus: colEstatus !== -1 && row[colEstatus] ? String(row[colEstatus]).trim() : 'Activa',
        createdAt: new Date().toISOString()
      });
    }

    const closedRecords = allParsed.filter(r => r.estado === 'Cerrada');
    const preRows = allParsed.filter(r => r.estado === 'Pre-Parto');

    // Excluir de Cierres cualquier corte PRE que ya cuente con su Cierre Completo en la misma hoja
    const isSupersededPre = (pre) => {
      if (pre.estado !== 'Pre-Parto') return false;
      const preIniAbs = ((Number(pre.vini) || 0) * 1000) + (Number(pre.picInicio) || 0);
      return closedRecords.some(closed => {
        if (Number(closed.sala) !== Number(pre.sala)) return false;
        if (Number(pre.picInicio) > 0 && Number(closed.picInicio) === Number(pre.picInicio)) {
          if (Number(pre.vini) > 0 && Number(closed.vini) > 0) {
            return Number(closed.vini) === Number(pre.vini);
          }
          return true;
        }
        if (preIniAbs > 0 && Number(closed.vini) > 0 && Number(closed.vcie) > 0) {
          const closedIniAbs = (Number(closed.vini) * 1000) + Number(closed.picInicio);
          const closedCieAbs = (Number(closed.vcie) * 1000) + Number(closed.picCierre);
          return preIniAbs >= closedIniAbs && preIniAbs <= closedCieAbs;
        }
        return false;
      });
    };

    const records = [];
    let excludedPreCount = 0;
    for (let i = 0; i < allParsed.length; i++) {
      const item = allParsed[i];
      if (isSupersededPre(item)) {
        excludedPreCount++;
        continue;
      }
      records.push({ id: records.length + 1, ...item });
    }

    return { records, preRows, excludedPreCount };
  },

  /**
   * Parsea las filas de una hoja de cálculo (compatibilidad directa)
   */
  parseExcelRows(rows) {
    return this.parseExcelRowsDetailed(rows).records;
  },

  /**
   * Exporta a formato CSV respetando los filtros actuales
   */
  async exportFilteredDataToCSV() {
    try {
      const result = await this.model.queryWithFilters({
        search: this.state.search,
        vcie: this.state.vcie,
        picCierre: this.state.picCierre,
        sala: this.state.sala,
        estado: this.state.estado,
        maternidad: this.state.maternidad,
        page: 1,
        pageSize: 100000,
        sortBy: this.state.sortBy || 'lote',
        sortDir: this.state.sortDir || 'desc'
      });

      if (!result.items || result.items.length === 0) {
        this.notification.alert('Exportar CSV', 'No hay registros para exportar con los filtros actuales.', 'warning');
        return;
      }

      const headers = ['VIni', 'Pic Inicio', 'Vcie', 'Pic Cierre', 'Sala', 'Vlote', 'LotePic', 'Partos', 'LNV', 'LNM', 'LNMom', 'MPD', 'Peso X', 'Maternidad', 'Estado', 'Estatus'];

      const csvRows = [headers.join(';')];

      result.items.forEach(r => {
        const pesoFmt = r.pesoX !== null && r.pesoX !== undefined ? String(r.pesoX).replace('.', ',') : '';
        const rowData = [
          r.vini || '',
          r.picInicio || '',
          r.vcie || '',
          r.picCierre || '',
          r.sala,
          r.vlote || '',
          r.lotePic || '',
          r.partos,
          r.lnv,
          r.lnm,
          r.lnMom,
          r.mpd,
          `"${pesoFmt}"`,
          `"${r.maternidad || ''}"`,
          `"${r.estado || 'Cerrada'}"`,
          `"${r.estatus || 'Activa'}"`
        ];
        csvRows.push(rowData.join(';'));
      });

      const csvContent = '\uFEFF' + csvRows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Cierre_de_Salas_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.notification.toast(`Exportados ${result.items.length} registros a CSV.`, 'success');
    } catch (err) {
      console.error('Error exportando CSV:', err);
      this.notification.error('No se pudo generar el archivo CSV.');
    }
  }
};

