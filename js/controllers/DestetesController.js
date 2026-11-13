/**
 * DestetesController: Controlador para el Módulo de Destetes.
 * Orquesta la sincronización bidireccional tridimensional de fechas (Vuelta, PIC, Calendario),
 * filtros zootécnicos, paginación configurable, ordenamiento interactivo, exportación CSV,
 * operaciones CRUD con autocompletado y analítica gráfica con Chart.js.
 */
window.App = window.App || {};
window.App.Controllers = window.App.Controllers || {};

window.App.Controllers.Destetes = {
  model: window.App.Models.Destetes,
  view: window.App.Views.Destetes,
  notification: window.App.Utils.Notification,

  state: {
    activeTab: 'table', // 'table' | 'charts'
    page: 1,
    pageSize: 50,
    search: '',
    vuelta: '',
    pic: '',
    calendarDate: '',
    granja: 'all',
    maternidad: 'all',
    sala: 'all',
    sortBy: 'fin',
    sortDir: 'desc',
    searchDebounceTimer: null,
    // Estado subvista gráficos
    chartVuelta: 20,
    chartPic: 'all',
    chartDate: '',
    isInitialized: false
  },

  /**
   * Inicializa el módulo
   */
  async init(subview = 'table') {
    try {
      this.view.container = document.getElementById('view-destetes');
      if (!this.view.container) return;

      await this.ensureSeedData();

      const filterOptions = await this.model.getFilterOptions();

      // Inicializar Vuelta y PIC actuales
      const Format = window.App.Utils.Format;
      const currentInfo = Format ? Format.getPicInfo(new Date()) : { vuelta: 20, pic: 131 };
      const currentIso = Format && Format.formatDateISO ? Format.formatDateISO(new Date()) : new Date().toISOString().slice(0, 10);
      
      this.state.chartVuelta = currentInfo.vuelta;
      this.state.chartPic = 'all';
      this.state.chartDate = '';

      this.view.renderSkeleton(filterOptions);
      this.bindEvents();
      this.state.isInitialized = true;

      await this.switchTab(subview, false);
    } catch (err) {
      console.error('Error inicializando módulo Destetes:', err);
      this.notification.error('Error al inicializar el módulo Destetes: ' + (err.message || ''));
    }
  },

  /**
   * Asegura que los datos semilla de la hoja DESTETES estén sembrados en IndexedDB
   */
  async ensureSeedData() {
    try {
      const db = window.App.Models.Database;
      if (!db || !db.count) return;

      const currentCount = await db.count('destetes');
      const seedData = window.App.Data && Array.isArray(window.App.Data.destetesSeed) ? window.App.Data.destetesSeed : [];

      if (seedData.length > 0 && (currentCount === 0 || currentCount !== seedData.length)) {
        console.log(`[DestetesController] Sincronizando ${seedData.length} registros oficiales en almacén destetes...`);
        await this.model.clearAll();
        await this.model.bulkCreate(seedData);
        console.log('[DestetesController] Sembrado Destetes completado con éxito.');
      }
    } catch (err) {
      console.warn('Nota: comprobación de sembrado destetes:', err);
    }
  },

  /**
   * Carga los datos de la tabla con los filtros actuales
   */
  async loadTableData() {
    try {
      const Format = window.App.Utils.Format;
      let fechaFormatted = '';
      if (this.state.calendarDate) {
        fechaFormatted = Format && Format.formatDate ? Format.formatDate(this.state.calendarDate) : '';
      }

      const result = await this.model.query({
        page: this.state.page,
        pageSize: this.state.pageSize,
        search: this.state.search,
        vuelta: this.state.vuelta,
        pic: this.state.pic,
        fecha: fechaFormatted,
        granja: this.state.granja,
        maternidad: this.state.maternidad,
        sala: this.state.sala,
        sortBy: this.state.sortBy,
        sortDir: this.state.sortDir
      });

      this.view.renderKpis(result.kpis);
      this.view.renderTable(result.items, this.state.sortBy, this.state.sortDir);
      this.view.renderPagination(result.totalRecords, result.currentPage, result.pageSize, result.totalPages);
    } catch (err) {
      console.error('Error cargando tabla de destetes:', err);
      this.notification.error('Error al consultar registros de destete.');
    }
  },

  /**
   * Carga los gráficos analíticos
   */
  async loadChartsData() {
    try {
      let records = await this.model.getAll();
      let filterDesc = 'Acumulado Histórico Total';

      // Filtro por Vuelta en gráficos
      if (this.state.chartVuelta && this.state.chartVuelta !== 'all') {
        const vNum = Number(this.state.chartVuelta);
        records = records.filter(r => Number(r.vfin) === vNum);
        filterDesc = `Vuelta ${vNum}`;
      }

      // Filtro por PIC Fin en gráficos
      if (this.state.chartPic && this.state.chartPic !== 'all') {
        const pNum = Number(this.state.chartPic);
        records = records.filter(r => Number(r.fin) === pNum);
        filterDesc += ` - PIC ${pNum}`;
      }

      // Filtro por Fecha de Calendario en gráficos
      if (this.state.chartDate) {
        const Format = window.App.Utils.Format;
        const targetStr = Format && Format.formatDate ? Format.formatDate(this.state.chartDate) : '';
        if (targetStr) {
          records = records.filter(r => r.fecha === targetStr);
          filterDesc = `Fecha ${targetStr} (V${this.state.chartVuelta} / PIC ${this.state.chartPic})`;
        }
      }

      this.view.renderCharts(records, filterDesc);
    } catch (err) {
      console.error('Error cargando gráficos de destetes:', err);
    }
  },

  /**
   * Cambia de pestaña interna
   */
  async switchTab(tabName, updateHash = true) {
    this.state.activeTab = tabName;
    this.view.switchTab(tabName);

    if (updateHash) {
      window.location.hash = tabName === 'charts' ? '#destetes-charts' : '#destetes-table';
    }

    if (tabName === 'table') {
      await this.loadTableData();
    } else {
      await this.loadChartsData();
    }
  },

  /**
   * Enlaza todos los eventos del DOM
   */
  bindEvents() {
    const container = this.view.container;
    if (!container) return;

    // 1. Pestañas de navegación interna
    container.addEventListener('click', async (e) => {
      const tabBtn = e.target.closest('.mpd-tab-btn');
      if (tabBtn && tabBtn.dataset.tab) {
        e.preventDefault();
        await this.switchTab(tabBtn.dataset.tab);
        return;
      }

      // Botón Limpiar Filtros
      if (e.target.closest('#destetes-btn-reset-filters')) {
        this.resetFilters();
        await this.loadTableData();
        return;
      }

      // Botón Exportar CSV
      if (e.target.closest('#destetes-btn-export-csv')) {
        await this.exportCsv();
        return;
      }

      // Botón Nuevo Destete
      if (e.target.closest('#destetes-btn-new-record')) {
        this.view.openModal();
        return;
      }

      // Botón Editar Destete en fila
      const editBtn = e.target.closest('.btn-edit-destete');
      if (editBtn) {
        const id = Number(editBtn.dataset.id);
        const item = await this.model.getById(id);
        if (item) {
          this.view.openModal(item);
        }
        return;
      }

      // Botón Eliminar Destete en fila
      const delBtn = e.target.closest('.btn-delete-destete');
      if (delBtn) {
        const id = Number(delBtn.dataset.id);
        await this.handleDelete(id);
        return;
      }

      // Paginación: click en número de página
      const pageBtn = e.target.closest('.btn-page:not(.disabled):not(.active)');
      if (pageBtn && pageBtn.dataset.page) {
        this.state.page = Number(pageBtn.dataset.page);
        await this.loadTableData();
        return;
      }

      // Ordenamiento por cabecera
      const sortTh = e.target.closest('th.th-sortable');
      if (sortTh && sortTh.dataset.sort) {
        const sortCol = sortTh.dataset.sort;
        if (this.state.sortBy === sortCol) {
          this.state.sortDir = this.state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.state.sortBy = sortCol;
          this.state.sortDir = 'desc';
        }
        this.state.page = 1;
        await this.loadTableData();
        return;
      }

      // Botón "Ver Acumulado Total" en Gráficos
      if (e.target.closest('#destetes-chart-btn-all')) {
        this.state.chartVuelta = 'all';
        this.state.chartPic = 'all';
        this.state.chartDate = '';
        const vpInput = document.getElementById('destetes-chart-vueltapic');
        const dInput = document.getElementById('destetes-chart-date');
        if (vpInput) vpInput.value = '';
        if (dInput) dInput.value = '';
        if (Format) Format.updateDateCaption('destetes-chart-date-caption', '');
        await this.loadChartsData();
        return;
      }
    });

    // 2. Sincronización Integrada en Filtros de Tabla (Fecha PIC unificada)
    const inputVueltaPic = document.getElementById('destetes-filter-vueltapic');
    const inputDate = document.getElementById('destetes-filter-date');
    const Format = window.App.Utils.Format;

    if (Format && inputVueltaPic) {
      Format.setupVueltaPicInput(inputVueltaPic);
      Format.updateDateCaption('destetes-filter-date-caption', inputVueltaPic.value);
    }

    if (inputDate) {
      if (Format) Format.attachCalendarPicker(inputDate);
      inputDate.addEventListener('change', async (e) => {
        const val = e.target.value;
        this.state.calendarDate = val;
        if (val) {
          if (Format) {
            const parsed = Format.parseDate(val);
            if (parsed) {
              const v = Format.Vuelta(parsed);
              const p = Format.FPic(parsed);
              this.state.vuelta = v;
              this.state.pic = p;
              if (inputVueltaPic) inputVueltaPic.value = Format.formatVueltaPic(v, p);
            }
            Format.updateDateCaption('destetes-filter-date-caption', val);
          }
        } else {
          this.state.vuelta = '';
          this.state.pic = '';
          if (inputVueltaPic) inputVueltaPic.value = Format ? Format.getDefaultVueltaPicPrefix() : '20-';
          if (Format) Format.updateDateCaption('destetes-filter-date-caption', '');
        }
        this.state.page = 1;
        await this.loadTableData();
      });
    }

    if (inputVueltaPic) {
      const syncFromVueltaPic = async () => {
        const val = inputVueltaPic.value.trim();
        if (Format) {
          const parsed = Format.parseVueltaPic(val);
          if (parsed.isValid) {
            this.state.vuelta = parsed.vuelta;
            this.state.pic = parsed.pic;
            if (parsed.date) {
              const iso = Format.formatDateISO(parsed.date);
              this.state.calendarDate = iso;
              if (inputDate) inputDate.value = iso;
            }
            Format.updateDateCaption('destetes-filter-date-caption', parsed.date);
          } else if (parsed.vuelta !== null && parsed.pic === null) {
            // Solo se especificó la vuelta (ej: "20-" o "19-")
            this.state.vuelta = parsed.vuelta;
            this.state.pic = '';
            this.state.calendarDate = '';
            if (inputDate) inputDate.value = '';
            Format.updateDateCaption('destetes-filter-date-caption', '');
          } else {
            this.state.vuelta = '';
            this.state.pic = '';
            this.state.calendarDate = '';
            if (inputDate) inputDate.value = '';
            Format.updateDateCaption('destetes-filter-date-caption', '');
          }
        }
        this.state.page = 1;
        await this.loadTableData();
      };

      inputVueltaPic.addEventListener('input', () => this.debounce(syncFromVueltaPic, 350));
    }

    // 3. Selectores de Granja, Maternidad y Sala
    const selGranja = document.getElementById('destetes-filter-granja');
    if (selGranja) {
      selGranja.addEventListener('change', async (e) => {
        this.state.granja = e.target.value;
        this.state.page = 1;
        await this.loadTableData();
      });
    }

    const selMat = document.getElementById('destetes-filter-maternidad');
    if (selMat) {
      selMat.addEventListener('change', async (e) => {
        this.state.maternidad = e.target.value;
        this.state.page = 1;
        await this.loadTableData();
      });
    }

    const selSala = document.getElementById('destetes-filter-sala');
    if (selSala) {
      selSala.addEventListener('change', async (e) => {
        this.state.sala = e.target.value;
        this.state.page = 1;
        await this.loadTableData();
      });
    }

    // 4. Buscador general con debounce
    const searchInput = document.getElementById('destetes-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.state.search = e.target.value;
        this.debounce(async () => {
          this.state.page = 1;
          await this.loadTableData();
        }, 300);
      });
    }

    // 5. Selector de Filas por Página
    const pageSizeSelect = document.getElementById('destetes-page-size');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', async (e) => {
        this.state.pageSize = Number(e.target.value) || 50;
        this.state.page = 1;
        await this.loadTableData();
      });
    }

    // 6. Sincronización Integrada en Gráficos (Fecha PIC unificada)
    const chartVpInput = document.getElementById('destetes-chart-vueltapic');
    const chartDInput = document.getElementById('destetes-chart-date');

    if (Format && chartVpInput) {
      Format.setupVueltaPicInput(chartVpInput);
      Format.updateDateCaption('destetes-chart-date-caption', chartVpInput.value);
    }
    if (Format && chartDInput) {
      Format.attachCalendarPicker(chartDInput);
    }

    const updateChartDates = async () => {
      const val = chartVpInput ? chartVpInput.value.trim() : '';
      if (Format) {
        const parsed = Format.parseVueltaPic(val);
        if (parsed.isValid) {
          this.state.chartVuelta = parsed.vuelta;
          this.state.chartPic = parsed.pic;
          if (parsed.date) {
            const iso = Format.formatDateISO(parsed.date);
            this.state.chartDate = iso;
            if (chartDInput) chartDInput.value = iso;
          }
          Format.updateDateCaption('destetes-chart-date-caption', parsed.date);
        } else if (parsed.vuelta !== null && parsed.pic === null) {
          this.state.chartVuelta = parsed.vuelta;
          this.state.chartPic = 'all';
          this.state.chartDate = '';
          if (chartDInput) chartDInput.value = '';
          Format.updateDateCaption('destetes-chart-date-caption', '');
        } else {
          this.state.chartVuelta = 'all';
          this.state.chartPic = 'all';
          this.state.chartDate = '';
          if (chartDInput) chartDInput.value = '';
          Format.updateDateCaption('destetes-chart-date-caption', '');
        }
      }
      await this.loadChartsData();
    };

    if (chartVpInput) chartVpInput.addEventListener('input', () => this.debounce(updateChartDates, 350));

    if (chartDInput) {
      chartDInput.addEventListener('change', async (e) => {
        const val = e.target.value;
        this.state.chartDate = val;
        if (val) {
          if (Format) {
            const parsed = Format.parseDate(val);
            if (parsed) {
              const v = Format.Vuelta(parsed);
              const p = Format.FPic(parsed);
              this.state.chartVuelta = v;
              this.state.chartPic = p;
              if (chartVpInput) chartVpInput.value = Format.formatVueltaPic(v, p);
            }
            Format.updateDateCaption('destetes-chart-date-caption', val);
          }
        } else {
          this.state.chartVuelta = 'all';
          this.state.chartPic = 'all';
          if (chartVpInput) chartVpInput.value = Format ? Format.getDefaultVueltaPicPrefix() : '20-';
          if (Format) Format.updateDateCaption('destetes-chart-date-caption', '');
        }
        await this.loadChartsData();
      });
    }

    // 7. Eventos reactivos en el Formulario del Modal
    this.bindModalFormEvents();
  },

  /**
   * Enlaza autocompletado y cálculos en el formulario modal
   */
  bindModalFormEvents() {
    const salaInput = document.getElementById('destete-form-sala');
    if (salaInput) {
      salaInput.addEventListener('input', (e) => {
        this.view.updateModalSalaPreview(e.target.value);
      });
    }

    const calcCountsAndWeights = () => {
      const sitio2 = Number(document.getElementById('destete-form-sitio2').value) || 0;
      const recria = Number(document.getElementById('destete-form-recria').value) || 0;
      const eliminados = Number(document.getElementById('destete-form-eliminados').value) || 0;
      const dias = Number(document.getElementById('destete-form-dias').value) || 24;

      const cantS2 = Math.max(0, sitio2 - eliminados);
      const cantS2El = document.getElementById('destete-form-cants2');
      if (cantS2El) cantS2El.value = cantS2;

      // Sitio 2
      const pesoNS2 = Number(document.getElementById('destete-form-pesons2').value) || 0;
      let pesoXS2 = Number(document.getElementById('destete-form-pesoxs2').value) || 0;
      if (pesoNS2 > 0 && cantS2 > 0) {
        pesoXS2 = Number((pesoNS2 / cantS2).toFixed(2));
        document.getElementById('destete-form-pesoxs2').value = pesoXS2;
      }
      if (pesoXS2 > 0 && dias > 0) {
        const ef = this.model.calcEficiencia(pesoXS2, dias);
        document.getElementById('destete-form-efics2').value = ef;
      }

      // Recría
      const pesoNR = Number(document.getElementById('destete-form-pesonr').value) || 0;
      let pesoXR = Number(document.getElementById('destete-form-pesoxr').value) || 0;
      if (pesoNR > 0 && recria > 0) {
        pesoXR = Number((pesoNR / recria).toFixed(2));
        document.getElementById('destete-form-pesoxr').value = pesoXR;
      }
      if (pesoXR > 0 && dias > 0) {
        const efR = this.model.calcEficiencia(pesoXR, dias);
        document.getElementById('destete-form-eficr').value = efR;
      }
    };

    ['destete-form-sitio2', 'destete-form-recria', 'destete-form-eliminados', 'destete-form-pesons2', 'destete-form-pesoxs2', 'destete-form-pesonr', 'destete-form-pesoxr', 'destete-form-dias'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', calcCountsAndWeights);
    });

    // Guardar formulario
    const form = document.getElementById('destetes-modal-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSaveModal();
      });
    }
  },

  /**
   * Guarda o actualiza un registro desde el modal
   */
  async handleSaveModal() {
    try {
      const idVal = document.getElementById('destete-form-id').value;
      const isEdit = Boolean(idVal);

      const record = {
        fecha: document.getElementById('destete-form-fecha').value.trim(),
        vfin: Number(document.getElementById('destete-form-vfin').value) || 0,
        fin: Number(document.getElementById('destete-form-fin').value) || 0,
        vlote: Number(document.getElementById('destete-form-vlote').value) || 0,
        lotePic: Number(document.getElementById('destete-form-lotepic').value) || 0,
        sala: Number(document.getElementById('destete-form-sala').value) || 0,
        dias: Number(document.getElementById('destete-form-dias').value) || 0,
        sitio2: Number(document.getElementById('destete-form-sitio2').value) || 0,
        recria: Number(document.getElementById('destete-form-recria').value) || 0,
        muertos: 0,
        eliminados: Number(document.getElementById('destete-form-eliminados').value) || 0,
        cantS2: Number(document.getElementById('destete-form-cants2').value) || 0,
        pesoNS2: Number(document.getElementById('destete-form-pesons2').value) || 0,
        pesoXS2: Number(document.getElementById('destete-form-pesoxs2').value) || 0,
        eficS2: Number(document.getElementById('destete-form-efics2').value) || 0,
        pesoNR: Number(document.getElementById('destete-form-pesonr').value) || 0,
        pesoXR: Number(document.getElementById('destete-form-pesoxr').value) || 0,
        eficR: Number(document.getElementById('destete-form-eficr').value) || 0
      };

      if (!record.fecha) throw new Error('La fecha es obligatoria.');
      if (record.sala <= 0) throw new Error('La sala debe ser mayor a 0.');
      if (record.sitio2 <= 0) throw new Error('Debe especificar la cantidad de lechones para Sitio 2.');

      if (isEdit) {
        await this.model.update(Number(idVal), record);
        this.notification.success('Registro de destete actualizado con éxito.');
      } else {
        await this.model.create(record);
        this.notification.success('Nuevo registro de destete creado con éxito.');
      }

      this.view.closeModal();
      await this.loadTableData();
    } catch (err) {
      console.error('Error guardando destete:', err);
      this.notification.error(err.message || 'Error al guardar el destete.');
    }
  },

  /**
   * Elimina un registro de destete
   */
  async handleDelete(id) {
    try {
      const confirm = await window.App.Utils.Notification.confirm(
        '¿Eliminar Destete?',
        `¿Está seguro de que desea eliminar permanentemente el registro de destete #${id}?`,
        'Eliminar'
      );
      if (!confirm) return;

      await this.model.delete(id);
      this.notification.success('Registro eliminado exitosamente.');
      await this.loadTableData();
    } catch (err) {
      console.error('Error eliminando destete:', err);
      this.notification.error('No se pudo eliminar el registro.');
    }
  },

  /**
   * Restablece los filtros de la tabla
   */
  resetFilters() {
    this.state.vuelta = '';
    this.state.pic = '';
    this.state.calendarDate = '';
    this.state.granja = 'all';
    this.state.maternidad = 'all';
    this.state.sala = 'all';
    this.state.search = '';
    this.state.page = 1;
    this.state.sortBy = 'fin';
    this.state.sortDir = 'desc';

    const ids = ['destetes-filter-date', 'destetes-search-input'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    if (window.App && window.App.Utils && window.App.Utils.Format) {
      window.App.Utils.Format.updateDateCaption('destetes-filter-date-caption', '');
    }

    const vpInput = document.getElementById('destetes-filter-vueltapic');
    if (vpInput) {
      const Format = window.App.Utils.Format;
      vpInput.value = Format ? Format.getDefaultVueltaPicPrefix() : '20-';
    }

    ['destetes-filter-granja', 'destetes-filter-maternidad', 'destetes-filter-sala'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 'all';
    });
  },

  /**
   * Exporta la vista actual a formato CSV con compatibilidad Excel
   */
  async exportCsv() {
    try {
      const Format = window.App.Utils.Format;
      let fechaFormatted = '';
      if (this.state.calendarDate) {
        fechaFormatted = Format && Format.formatDate ? Format.formatDate(this.state.calendarDate) : '';
      }

      const result = await this.model.query({
        page: 1,
        pageSize: 100000,
        search: this.state.search,
        vuelta: this.state.vuelta,
        pic: this.state.pic,
        fecha: fechaFormatted,
        granja: this.state.granja,
        maternidad: this.state.maternidad,
        sala: this.state.sala,
        sortBy: this.state.sortBy,
        sortDir: this.state.sortDir
      });

      const records = result.items || [];
      if (records.length === 0) {
        this.notification.warning('No hay datos para exportar con los filtros actuales.');
        return;
      }

      const headers = [
        'Fecha', 'Vfin', 'Fin', 'Vlote', 'LotePic', 'Granja', 'Zona', 'Maternidad', 'Sala',
        'Dias', 'Sitio 2', 'Recria', 'Eliminados', 'Cant. S2', 'Peso X S2', 'Efic S2 %',
        'Peso N S2', 'Peso X Rec', 'Efic Rec %', 'Peso N Rec'
      ];

      const csvRows = [headers.join(';')];

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        csvRows.push([
          `"${r.fecha || ''}"`,
          r.vfin || 0,
          r.fin || 0,
          r.vlote || 0,
          r.lotePic || 0,
          `"${r.granja || ''}"`,
          `"${r.zona || ''}"`,
          `"${r.maternidad || ''}"`,
          r.sala || 0,
          r.dias || 0,
          r.sitio2 || 0,
          r.recria || 0,
          r.eliminados || 0,
          r.cantS2 || 0,
          String(r.pesoXS2 || 0).replace('.', ','),
          String(r.eficS2 || 0).replace('.', ','),
          r.pesoNS2 || 0,
          String(r.pesoXR || 0).replace('.', ','),
          String(r.eficR || 0).replace('.', ','),
          r.pesoNR || 0
        ].join(';'));
      }

      const csvContent = '\uFEFF' + csvRows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Destetes_Produccion_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.notification.success(`Exportados ${records.length.toLocaleString('es-ES')} registros a CSV.`);
    } catch (err) {
      console.error('Error exportando CSV:', err);
      this.notification.error('Error al exportar CSV.');
    }
  },

  /**
   * Procesa filas de Excel procedentes de la hoja DESTETES
   */
  parseExcelRows(rows) {
    if (!Array.isArray(rows) || rows.length < 2) return [];

    const headers = rows[0].map(h => String(h || '').trim().toUpperCase());
    const records = [];

    const findCol = (namePatterns) => {
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        for (const p of namePatterns) {
          if (h.includes(p)) return i;
        }
      }
      return -1;
    };

    const colFecha = findCol(['FECHA']);
    const colVfin = findCol(['VFIN', 'V.FIN']);
    const colFin = findCol(['FIN', 'PIC FIN', 'PICFIN']);
    const colVlote = findCol(['VLOTE', 'V.LOTE']);
    const colLotePic = findCol(['LOTEPIC', 'LOTE PIC', 'LOTE']);
    const colSala = findCol(['SALA']);
    const colDias = findCol(['DIAS', 'DÍAS', 'EDAD']);
    const colSitio2 = findCol(['SITIO 2', 'SITIO2']);
    const colRecria = findCol(['RECRIA', 'RECRÍA']);
    const colMuertos = findCol(['MUERTO']);
    const colElim = findCol(['ELIMINADO', 'ELIM']);
    const colCantS2 = findCol(['CANT. S2', 'CANT S2', 'CANTS2']);
    const colPesoXS2 = findCol(['PESO X SITIO 2', 'PESO X S2', 'PESO XS2']);
    const colEficS2 = findCol(['EFICIENCIA SITIO 2', 'EFIC S2', 'EFICIENCIA S2']);
    const colPesoNS2 = findCol(['PESO N SITIO 2', 'PESO N S2', 'PESO NS2']);
    const colPesoXR = findCol(['PESO X-R', 'PESO XR', 'PESO X RECRIA']);
    const colEficR = findCol(['EFICIENCIA3', 'EFIC R', 'EFICIENCIA RECRIA']);
    const colPesoNR = findCol(['PESO N-R', 'PESO NR', 'PESO N RECRIA']);

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0 || !r.some(v => v !== null && v !== undefined && v !== '')) continue;

      let fechaStr = '';
      if (colFecha !== -1 && r[colFecha] !== null && r[colFecha] !== undefined) {
        const val = r[colFecha];
        if (typeof val === 'number') {
          // Fecha serial Excel
          const dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
          fechaStr = window.App.Utils.Format.formatDate(dateObj);
        } else if (val instanceof Date) {
          fechaStr = window.App.Utils.Format.formatDate(val);
        } else {
          fechaStr = String(val).trim();
        }
      }

      const sala = colSala !== -1 ? Number(r[colSala]) || 0 : 0;
      const loc = this.model.resolveSalaInfo(sala);

      const sitio2 = colSitio2 !== -1 ? Number(r[colSitio2]) || 0 : 0;
      const recria = colRecria !== -1 ? Number(r[colRecria]) || 0 : 0;
      const eliminados = colElim !== -1 ? Number(r[colElim]) || 0 : 0;
      const cantS2 = colCantS2 !== -1 && r[colCantS2] !== null && r[colCantS2] !== undefined
        ? Number(r[colCantS2])
        : Math.max(0, sitio2 - eliminados);

      records.push({
        id: i,
        fecha: fechaStr,
        vfin: colVfin !== -1 ? Number(r[colVfin]) || 0 : 0,
        fin: colFin !== -1 ? Number(r[colFin]) || 0 : 0,
        vlote: colVlote !== -1 ? Number(r[colVlote]) || 0 : 0,
        lotePic: colLotePic !== -1 ? Number(r[colLotePic]) || 0 : 0,
        sala: sala,
        granja: loc.granja,
        zona: loc.zona,
        maternidad: loc.maternidad,
        dias: colDias !== -1 ? Number(r[colDias]) || 0 : 0,
        sitio2: sitio2,
        recria: recria,
        muertos: colMuertos !== -1 ? Number(r[colMuertos]) || 0 : 0,
        eliminados: eliminados,
        cantS2: cantS2,
        pesoXS2: colPesoXS2 !== -1 ? Number(r[colPesoXS2]) || 0 : 0,
        eficS2: colEficS2 !== -1 ? Number(r[colEficS2]) || 0 : 0,
        pesoNS2: colPesoNS2 !== -1 ? Number(r[colPesoNS2]) || 0 : 0,
        pesoXR: colPesoXR !== -1 ? Number(r[colPesoXR]) || 0 : 0,
        eficR: colEficR !== -1 ? Number(r[colEficR]) || 0 : 0,
        pesoNR: colPesoNR !== -1 ? Number(r[colPesoNR]) || 0 : 0,
        createdAt: new Date().toISOString()
      });
    }

    return records;
  },

  /**
   * Función de ayuda para debounce
   */
  debounce(func, wait) {
    clearTimeout(this.state.searchDebounceTimer);
    this.state.searchDebounceTimer = setTimeout(func, wait);
  }
};
