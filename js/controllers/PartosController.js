/**
 * PartosController: Controlador para el módulo Resumen de Partos.
 * Maneja estado, eventos de filtrado, sincronización bidireccional de fechas,
 * paginación, importación desde Excel, exportación a CSV y visualización analítica.
 */
window.App = window.App || {};
window.App.Controllers = window.App.Controllers || {};

window.App.Controllers.Partos = {
  model: window.App.Models.Partos,
  view: window.App.Views.Partos,
  notification: window.App.Utils.Notification,

  state: {
    activeTab: 'table', // 'table' | 'charts'
    page: 1,
    pageSize: 50,
    search: '',
    vuelta: '',
    pic: '',
    calendarDate: '',
    area: '',
    turno: '',
    semana: '',
    sortBy: 'fecha',
    sortDir: 'desc',
    searchDebounceTimer: null,
    // Estado para subvista gráficos
    chartVuelta: 20,
    chartPic: 'all',
    chartDate: ''
  },

  /**
   * Inicializa el módulo
   */
  async init(subview = 'table') {
    try {
      this.view.container = document.getElementById('view-partos');
      if (!this.view.container) return;

      await this.ensureSeedData();

      // Comprobar que la sumatoria LNV + LNM + LNMom sea = LNT
      const integrity = await this.model.verifyIntegrity({ autoFix: true });
      this.state.integrity = integrity;
      if (!integrity.isClean) {
        console.warn(`[Auditoría Partos] Se corrigieron ${integrity.errorCount} discrepancias en LNT al inicializar.`);
        this.notification.warning(`Atención: Se detectaron y corrigieron ${integrity.errorCount} registros donde LNV + LNM + LNMom ≠ LNT.`);
      }

      const filterOptions = await this.model.getFilterOptions();

      // Inicializar Vuelta y PIC por defecto
      const Format = window.App.Utils.Format;
      const currentInfo = Format ? Format.getPicInfo(new Date()) : { vuelta: 20, pic: 131 };
      const currentIso = Format && Format.formatDateISO ? Format.formatDateISO(new Date()) : new Date().toISOString().slice(0, 10);
      this.state.chartVuelta = currentInfo.vuelta;
      this.state.chartPic = currentInfo.pic;
      this.state.chartDate = currentIso;

      this.view.renderSkeleton(filterOptions);
      this.bindEvents();
      this.state.isInitialized = true;

      await this.switchTab(subview, false);
    } catch (err) {
      console.error('Error inicializando módulo Resumen de Partos:', err);
      this.notification.error('Error al inicializar el módulo Resumen de Partos.');
    }
  },

  /**
   * Carga los datos de la tabla con los filtros actuales
   */
  async loadData() {
    try {
      const result = await this.model.queryWithFilters({
        search: this.state.search,
        vuelta: this.state.vuelta,
        pic: this.state.pic,
        area: this.state.area,
        turno: this.state.turno,
        semana: this.state.semana,
        page: this.state.page,
        pageSize: this.state.pageSize,
        sortBy: this.state.sortBy,
        sortDir: this.state.sortDir
      });

      this.view.renderTable(
        result.items,
        {
          totalRecords: result.totalRecords,
          totalPages: result.totalPages,
          currentPage: result.currentPage,
          pageSize: result.pageSize
        },
        result.summary
      );
    } catch (err) {
      console.error('Error cargando datos de Partos:', err);
      this.notification.error('Error al cargar la tabla de Resumen de Partos.');
    }
  },

  /**
   * Carga y renderiza los gráficos analíticos
   */
  async loadCharts(pic = this.state.chartPic, vuelta = this.state.chartVuelta) {
    try {
      const targetPic = (pic === 'all' || pic === '' || pic === null) ? null : Number(pic);
      const targetVuelta = (vuelta === 'all' || vuelta === '' || vuelta === null) ? null : Number(vuelta);

      const chartsData = await this.model.getChartsData(targetPic, targetVuelta);
      this.view.renderCharts(chartsData);
    } catch (err) {
      console.error('Error cargando gráficos de Partos:', err);
      this.notification.error('Error al generar los gráficos de Resumen de Partos.');
    }
  },

  /**
   * Asegura que existan datos iniciales en la base de datos
   */
  async ensureSeedData() {
    try {
      const all = await this.model.getAll();
      const seed = window.App.Data && Array.isArray(window.App.Data.partosSeed) ? window.App.Data.partosSeed : [];
      // Si la base está vacía o difiere del conteo oficial de la hoja RESUMEN DE PARTOS (2.070 registros)
      if (seed.length > 0 && (all.length === 0 || all.length !== seed.length)) {
        console.log(`Sincronizando ${seed.length} registros oficiales desde la hoja RESUMEN DE PARTOS en IndexedDB...`);
        await this.model.clearAll();
        await this.model.bulkCreate(seed);
        console.log('Sincronización de Partos completada con éxito.');
      }
    } catch (err) {
      console.warn('Error al verificar sembrado de partos:', err);
    }
  },

  /**
   * Vincula todos los escuchadores de eventos
   */
  bindEvents() {
    const Format = window.App.Utils.Format;
    const currentVuelta = Format ? Format.getCurrentVuelta() : 20;

    // Conmutación interna de pestañas (Tabla Partos / Gráficos)
    const tabsNav = document.getElementById('partos-tabs-nav');
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

    // Sincronización en Gráficos (Fecha PIC [Vuelta-PIC] ↔ Fecha Calendario)
    const chartsVp = document.getElementById('partos-charts-vueltapic');
    const chartsDate = document.getElementById('partos-charts-date');

    if (Format && chartsVp) {
      Format.setupVueltaPicInput(chartsVp);
    }
    if (Format && chartsDate) {
      Format.attachCalendarPicker(chartsDate);
      Format.updateDateCaption('partos-charts-date-caption', chartsDate.value || new Date());
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
            Format.updateDateCaption('partos-charts-date-caption', parsed.date);
          }
          this.state.chartVuelta = parsed.vuelta;
          this.state.chartPic = parsed.pic;
          await this.loadCharts(parsed.pic, parsed.vuelta);
        } else if (parsed.vuelta !== null && parsed.pic === null) {
          if (chartsDate) chartsDate.value = '';
          Format.updateDateCaption('partos-charts-date-caption', '');
          this.state.chartVuelta = parsed.vuelta;
          this.state.chartPic = 'all';
          this.state.chartDate = '';
          await this.loadCharts('all', parsed.vuelta);
        } else {
          if (chartsDate) chartsDate.value = '';
          Format.updateDateCaption('partos-charts-date-caption', '');
          this.state.chartVuelta = currentVuelta;
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
          Format.updateDateCaption('partos-charts-date-caption', val);
          await this.loadCharts(info.pic, info.vuelta);
        } catch (err) {
          console.warn('Error calculando PIC desde fecha en gráficos de Partos:', err);
        }
      } else {
        if (chartsVp) chartsVp.value = Format ? Format.getDefaultVueltaPicPrefix() : '20-';
        Format.updateDateCaption('partos-charts-date-caption', '');
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
    const searchInput = document.getElementById('partos-search-input');
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
    const filterVp = document.getElementById('partos-filter-vueltapic');
    const filterDate = document.getElementById('partos-filter-date');

    if (Format && filterVp) {
      Format.setupVueltaPicInput(filterVp);
    }
    if (Format && filterDate) {
      Format.attachCalendarPicker(filterDate);
      Format.updateDateCaption('partos-filter-date-caption', filterVp ? filterVp.value : '');
    }

    const syncDateFromVueltaPic = () => {
      const val = filterVp ? filterVp.value.trim() : '';
      if (Format) {
        const parsed = Format.parseVueltaPic(val);
        if (parsed.isValid) {
          if (parsed.date && filterDate) {
            filterDate.value = Format.formatDateISO(parsed.date);
          }
          this.state.vuelta = parsed.vuelta;
          this.state.pic = parsed.pic;
          Format.updateDateCaption('partos-filter-date-caption', parsed.date);
        } else if (parsed.vuelta !== null && parsed.pic === null) {
          if (filterDate) filterDate.value = '';
          Format.updateDateCaption('partos-filter-date-caption', '');
          this.state.vuelta = parsed.vuelta;
          this.state.pic = '';
        } else {
          if (filterDate) filterDate.value = '';
          Format.updateDateCaption('partos-filter-date-caption', '');
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
          this.state.vuelta = info.vuelta;
          this.state.pic = info.pic;
          this.state.calendarDate = val;
          Format.updateDateCaption('partos-filter-date-caption', val);
        } catch (err) {
          console.warn('Error calculando PIC desde fecha:', err);
        }
      } else {
        if (filterVp) filterVp.value = Format ? Format.getDefaultVueltaPicPrefix() : '20-';
        Format.updateDateCaption('partos-filter-date-caption', '');
        this.state.vuelta = '';
        this.state.pic = '';
        this.state.calendarDate = '';
      }
      this.state.page = 1;
      this.loadData();
    };

    if (filterDate) {
      filterDate.addEventListener('change', handleDateInputSync);
      filterDate.addEventListener('input', handleDateInputSync);
    }

    // Filtro por Área
    const filterArea = document.getElementById('partos-filter-area');
    if (filterArea) {
      filterArea.addEventListener('change', (e) => {
        this.state.area = e.target.value;
        this.state.page = 1;
        this.loadData();
      });
    }

    // Filtro por Turno
    const filterTurno = document.getElementById('partos-filter-turno');
    if (filterTurno) {
      filterTurno.addEventListener('change', (e) => {
        this.state.turno = e.target.value;
        this.state.page = 1;
        this.loadData();
      });
    }

    // Filtro por Semana
    const filterSemana = document.getElementById('partos-filter-semana');
    if (filterSemana) {
      filterSemana.addEventListener('change', (e) => {
        this.state.semana = e.target.value;
        this.state.page = 1;
        this.loadData();
      });
    }

    // Selector de Filas por página
    const pageSizeSelect = document.getElementById('partos-page-size');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', (e) => {
        this.state.pageSize = parseInt(e.target.value, 10) || 50;
        this.state.page = 1;
        this.loadData();
      });
    }

    // Botón Limpiar filtros
    const btnClear = document.getElementById('btn-partos-clear-filters');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        this.resetFilters();
      });
    }

    // Paginación: clics en botones
    const paginationControls = document.getElementById('partos-pagination-controls');
    if (paginationControls) {
      paginationControls.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-page]');
        if (!btn || btn.disabled) return;
        const page = parseInt(btn.dataset.page, 10);
        if (page && page !== this.state.page) {
          this.state.page = page;
          this.loadData();
        }
      });
    }

    // Ordenamiento por columnas
    const tableHeader = document.querySelector('#table-partos thead');
    if (tableHeader) {
      tableHeader.addEventListener('click', (e) => {
        const th = e.target.closest('.th-sortable');
        if (!th) return;
        const sortCol = th.dataset.sort;
        if (!sortCol) return;

        if (this.state.sortBy === sortCol) {
          this.state.sortDir = this.state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.state.sortBy = sortCol;
          this.state.sortDir = 'desc';
        }

        // Actualizar indicadores visuales
        tableHeader.querySelectorAll('.th-sortable').forEach(el => {
          el.classList.remove('sort-asc', 'sort-desc');
        });
        th.classList.add(this.state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');

        this.state.page = 1;
        this.loadData();
      });
    }

    // Botón Exportar CSV
    const btnExport = document.getElementById('btn-partos-export-csv');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        this.exportToCsv();
      });
    }

    // Botón Restaurar Base de Datos original
    const btnReloadSeed = document.getElementById('btn-partos-reload-seed');
    if (btnReloadSeed) {
      btnReloadSeed.addEventListener('click', async () => {
        const confirm = await this.notification.confirm(
          'Restaurar Base de Datos',
          '¿Deseas restaurar la base de datos de Resumen de Partos con los registros originales? Se sobrescribirán los datos actuales.'
        );
        if (confirm) {
          try {
            await this.model.clearAll();
            if (window.App.Data && Array.isArray(window.App.Data.partosSeed)) {
              await this.model.bulkCreate(window.App.Data.partosSeed);
            }
            this.notification.success('Base de datos de Resumen de Partos restaurada con éxito.');
            const filterOptions = await this.model.getFilterOptions();
            this.view.renderSkeleton(filterOptions);
            this.bindEvents();
            await this.loadData();
          } catch (err) {
            console.error('Error restaurando base de datos:', err);
            this.notification.error('No se pudo restaurar la base de datos.');
          }
        }
      });
    }

    // Importar Excel
    const fileInput = document.getElementById('partos-file-input');
    const btnImport = document.getElementById('btn-partos-import');

    if (btnImport && fileInput) {
      btnImport.addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          this.handleProcessExcelFile(file);
        }
      });
    }
  },

  /**
   * Conmuta la subvista activa entre Tabla y Gráficos
   */
  async switchTab(tabName, updateSidebarNav = true) {
    this.state.activeTab = tabName;
    this.view.switchTab(tabName);

    // Sincronizar estilo en la barra lateral
    if (updateSidebarNav) {
      const navItemTable = document.getElementById('nav-partos-table');
      const navItemCharts = document.getElementById('nav-partos-charts');
      if (tabName === 'charts') {
        if (navItemTable) navItemTable.classList.remove('active');
        if (navItemCharts) navItemCharts.classList.add('active');
      } else {
        if (navItemCharts) navItemCharts.classList.remove('active');
        if (navItemTable) navItemTable.classList.add('active');
      }
    }

    if (tabName === 'charts') {
      await this.loadCharts();
    } else {
      await this.loadData();
    }
  },

  /**
   * Restablece los filtros de búsqueda a su estado inicial
   */
  resetFilters() {
    this.state.search = '';
    this.state.vuelta = '';
    this.state.pic = '';
    this.state.calendarDate = '';
    this.state.area = '';
    this.state.turno = '';
    this.state.semana = '';
    this.state.page = 1;

    const s = document.getElementById('partos-search-input');
    const fVp = document.getElementById('partos-filter-vueltapic');
    const fD = document.getElementById('partos-filter-date');
    const fA = document.getElementById('partos-filter-area');
    const fT = document.getElementById('partos-filter-turno');
    const fSem = document.getElementById('partos-filter-semana');

    if (s) s.value = '';
    if (fVp) fVp.value = Format ? Format.getDefaultVueltaPicPrefix() : '20-';
    if (fD) fD.value = '';
    if (Format) Format.updateDateCaption('partos-filter-date-caption', '');
    if (fA) fA.value = '';
    if (fT) fT.value = '';
    if (fSem) fSem.value = '';

    this.loadData();
  },

  /**
   * Procesa un archivo Excel (.xlsm o .xlsx) cargado por el usuario
   */
  async handleProcessExcelFile(file) {
    if (!window.XLSX) {
      this.notification.error('La librería SheetJS no está disponible para leer el archivo Excel.');
      return;
    }

    this.notification.info(`Leyendo archivo "${file.name}"...`);

    try {
      const data = await file.arrayBuffer();
      const workbook = window.XLSX.read(data, { type: 'array' });

      // Buscar hoja de Resumen de Partos específicamente
      let targetSheetName = workbook.SheetNames.find(name => name.trim().toUpperCase() === 'RESUMEN DE PARTOS');
      if (!targetSheetName) {
        targetSheetName = workbook.SheetNames.find(name => {
          const norm = name.trim().toUpperCase();
          return norm.includes('PARTO') || norm.includes('RESUMEN');
        });
      }

      if (!targetSheetName) {
        throw new Error('No se encontró la hoja "RESUMEN DE PARTOS" en el archivo Excel.');
      }

      const worksheet = workbook.Sheets[targetSheetName];
      if (!worksheet) {
        throw new Error(`No se encontró la hoja de datos en el archivo Excel.`);
      }

      const jsonRows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!jsonRows || jsonRows.length < 2) {
        throw new Error('La hoja seleccionada está vacía o no tiene registros válidos.');
      }

      const { records: parsedRecords, discrepancies: excelDiscrepancies } = this.parseExcelRows(jsonRows);
      if (parsedRecords.length === 0) {
        throw new Error('No se detectaron registros con las columnas esperadas en la hoja.');
      }

      const confirmMsg = excelDiscrepancies > 0
        ? `Se encontraron ${parsedRecords.length} registros en la hoja "${targetSheetName}". Se detectaron ${excelDiscrepancies} filas donde LNV + LNM + LNMom ≠ LNT que se ajustarán automáticamente. ¿Deseas reemplazar la base actual de Resumen de Partos?`
        : `Se encontraron ${parsedRecords.length} registros en la hoja "${targetSheetName}". Se verificó que LNV + LNM + LNMom = LNT al 100%. ¿Deseas reemplazar la base actual de Resumen de Partos?`;

      const confirm = await this.notification.confirm('Confirmar Importación', confirmMsg);

      if (confirm) {
        await this.model.clearAll();
        await this.model.bulkCreate(parsedRecords);
        this.notification.success(`Se importaron exitosamente ${parsedRecords.length} registros de Resumen de Partos (LNV + LNM + LNMom = LNT verificado).`);
        const filterOptions = await this.model.getFilterOptions();
        this.view.renderSkeleton(filterOptions);
        this.bindEvents();
        await this.loadData();
      }
    } catch (err) {
      console.error('Error procesando Excel de Partos:', err);
      this.notification.alert('Error de Importación', err.message || 'No se pudo leer el archivo Excel.', 'danger');
    }
  },

  /**
   * Parsea filas de la hoja Excel con tolerancia de nombres y comprueba LNV + LNM + LNMom = LNT
   */
  parseExcelRows(rows) {
    const records = [];
    const headers = rows[0].map(h => String(h).trim().toUpperCase());
    let discrepancies = 0;

    const findCol = (...names) => {
      for (const name of names) {
        const idx = headers.findIndex(h => h === name.toUpperCase() || h.includes(name.toUpperCase()));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const colVuelta = findCol('VUELTA', 'V.');
    const colPic = findCol('PIC', 'FECHA PIC');
    const colSemana = findCol('SEMANA', 'SEM');
    const colArea = findCol('AREA', 'ÁREA', 'MATERNIDAD', 'MAT');
    const colTurno = findCol('TURNO', 'TUR');
    const colPartos = findCol('PARTOS', 'PARTO');
    const colLnv = findCol('LNV', 'LECHONES VIVOS', 'VIVOS');
    const colLnm = findCol('LNM', 'LECHONES MUERTOS', 'MORTINATOS', 'MUERTOS');
    const colLnMom = findCol('LNMOM', 'LN MOM', 'MOMIAS');
    const colLnt = findCol('LNT', 'TOTAL', 'TOTAL NACIDOS');

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || row.every(c => c === '' || c === null || c === undefined)) continue;

      const lnv = colLnv !== -1 ? Number(row[colLnv]) || 0 : 0;
      const lnm = colLnm !== -1 ? Number(row[colLnm]) || 0 : 0;
      const lnMom = colLnMom !== -1 ? Number(row[colLnMom]) || 0 : 0;
      const expectedLnt = lnv + lnm + lnMom;
      const fileLnt = colLnt !== -1 && Number(row[colLnt]) >= 0 ? Number(row[colLnt]) : expectedLnt;

      if (fileLnt !== expectedLnt) {
        discrepancies++;
      }

      records.push({
        id: i,
        vuelta: colVuelta !== -1 ? Number(row[colVuelta]) || 0 : 0,
        pic: colPic !== -1 ? Number(row[colPic]) || 0 : 0,
        semana: colSemana !== -1 ? Number(row[colSemana]) || 0 : 0,
        area: colArea !== -1 ? String(row[colArea] || '').trim().toUpperCase() : 'EST',
        turno: colTurno !== -1 ? Number(row[colTurno]) || 1 : 1,
        partos: colPartos !== -1 ? Number(row[colPartos]) || 0 : 0,
        lnv,
        lnm,
        lnMom,
        lnt: expectedLnt, // Garantizar estrictamente LNT = LNV + LNM + LNMom
        createdAt: new Date().toISOString()
      });
    }

    return { records, discrepancies };
  },

  /**
   * Exporta a formato CSV respetando los filtros actuales
   */
  async exportToCsv() {
    try {
      const all = await this.model.getAll();
      const searchTerms = String(this.state.search).trim().toLowerCase().split(/\s+/).filter(Boolean);

      const hasVuelta = this.state.vuelta !== '' && this.state.vuelta !== null;
      const hasPic = this.state.pic !== '' && this.state.pic !== null;
      const hasArea = this.state.area !== '' && this.state.area !== 'all';
      const hasTurno = this.state.turno !== '' && this.state.turno !== 'all';
      const hasSemana = this.state.semana !== '' && this.state.semana !== 'all';

      const filtered = all.filter((item) => {
        if (hasVuelta && Number(item.vuelta) !== Number(this.state.vuelta)) return false;
        if (hasPic && Number(item.pic) !== Number(this.state.pic)) return false;
        if (hasArea && String(item.area || '').toUpperCase() !== String(this.state.area).toUpperCase()) return false;
        if (hasTurno && Number(item.turno) !== Number(this.state.turno)) return false;
        if (hasSemana && Number(item.semana) !== Number(this.state.semana)) return false;

        if (searchTerms.length > 0) {
          const rowText = [
            item.vuelta,
            item.pic,
            item.semana,
            item.area,
            `t${item.turno}`,
            item.partos,
            item.lnv,
            item.lnm,
            item.lnMom,
            item.lnt
          ].join(' ').toLowerCase();

          for (let t = 0; t < searchTerms.length; t++) {
            if (!rowText.includes(searchTerms[t])) return false;
          }
        }
        return true;
      });

      if (filtered.length === 0) {
        this.notification.warning('No hay registros para exportar con los filtros seleccionados.');
        return;
      }

      // Generar contenido CSV con BOM UTF-8
      const headers = ['Vuelta', 'Pic', 'Semana', 'Area', 'Turno', 'Partos', 'LNV', 'LNM', 'LNMom', 'LNT', 'Fecha'];
      const Format = window.App.Utils.Format;
      const rows = filtered.map(r => {
        let fCal = r.fechaCalendario;
        if (!fCal && Format && Format.FCalendario && r.vuelta !== undefined && r.pic !== undefined) {
          try {
            fCal = Format.formatDate(Format.FCalendario(r.pic, r.vuelta));
          } catch (e) {
            fCal = '';
          }
        }
        return [
          r.vuelta ?? '',
          r.pic ?? '',
          r.semana ?? '',
          `"${r.area || ''}"`,
          r.turno ?? '',
          r.partos ?? 0,
          r.lnv ?? 0,
          r.lnm ?? 0,
          r.lnMom ?? 0,
          r.lnt ?? 0,
          fCal ?? ''
        ];
      });

      const csvContent = '\uFEFF' + [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `resumen_partos_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.notification.success(`Se exportaron ${filtered.length} registros exitosamente.`);
    } catch (err) {
      console.error('Error exportando CSV:', err);
      this.notification.error('Error al exportar registros a CSV.');
    }
  }
};
