/**
 * MaternidadController: Coordina el módulo Maternidad (Tablas duales Establecida / Expansión,
 * filtros sincronizados, ordenamiento, importación de hoja Excel MATERNIDAD, exportación CSV, CRUD y gráficos).
 */
window.App = window.App || {};
window.App.Controllers = window.App.Controllers || {};

window.App.Controllers.Maternidad = {
  model: window.App.Models.Maternidad,
  view: window.App.Views.Maternidad,
  notification: window.App.Utils.Notification,

  state: {
    est: {
      search: '',
      sala: '',
      estado: '',
      estatus: '',
      picFilter: '',
      picRawValue: '',
      mpdDay: '',
      sortBy: 'orden',
      sortDir: 'asc',
      searchDebounceTimer: null
    },
    exp: {
      search: '',
      sala: '',
      estado: '',
      estatus: '',
      picFilter: '',
      picRawValue: '',
      mpdDay: '',
      sortBy: 'orden',
      sortDir: 'asc',
      searchDebounceTimer: null
    },
    activeTab: 'table',
    isInitialized: false
  },

  /**
   * Inicializa el módulo Maternidad
   */
  async init(subview = 'table') {
    this.view.container = document.getElementById('view-maternidad');
    if (!this.view.container) return;

    await this.ensureSeedData();
    const filterOptions = await this.model.getFilterOptions();
    this.view.renderSkeleton(filterOptions);
    this.bindEvents();
    this.state.isInitialized = true;

    await this.switchTab(subview, false);
  },

  /**
   * Asegura que la base de datos tenga registros si está vacía
   */
  async ensureSeedData() {
    const existing = await this.model.getAll(true);
    if (existing.length === 0 && window.App.Data && Array.isArray(window.App.Data.maternidadSeed) && window.App.Data.maternidadSeed.length > 0) {
      await this.model.bulkCreate(window.App.Data.maternidadSeed);
    }
  },

  /**
   * Conmuta entre pestañas ('table' o 'charts')
   */
  async switchTab(tabName = 'table', updateHash = true) {
    this.state.activeTab = tabName;
    this.view.switchTab(tabName);

    const subItems = document.querySelectorAll('#submenu-maternidad .nav-sub-item');
    subItems.forEach(item => {
      const target = tabName === 'charts' ? 'maternidad-charts' : 'maternidad-table';
      item.classList.toggle('active', item.dataset.view === target);
    });

    if (updateHash) {
      window.location.hash = tabName === 'charts' ? '#maternidad-charts' : '#maternidad-table';
    }

    if (tabName === 'charts') {
      const mpdDay = this.state.est.mpdDay || this.state.exp.mpdDay || '';
      const chartData = await this.model.getChartData(mpdDay);
      this.view.renderCharts(chartData);
    } else {
      await this.loadData();
    }
  },

  /**
   * Carga y renderiza las dos tablas (Establecida y Expansión) con filtros independientes
   */
  async loadData() {
    const data = await this.model.getDualTableData({
      est: this.state.est,
      exp: this.state.exp
    });
    this.view.renderDualTables(data, {
      est: { sortBy: this.state.est.sortBy, sortDir: this.state.est.sortDir },
      exp: { sortBy: this.state.exp.sortBy, sortDir: this.state.exp.sortDir }
    });
  },

  /**
   * Registra los eventos de la barra de filtros y acciones de una tabla específica ('est' o 'exp')
   */
  _bindAreaToolbar(areaKey, areaCode) {
    const Format = window.App.Utils.Format;
    const areaState = this.state[areaKey];
    const p = `maternidad-${areaKey}`;
    const b = `btn-maternidad-${areaKey}`;

    // 1. Control sincronizado Fecha PIC (Vuelta-PIC ↔ Calendario)
    const filterVp = document.getElementById(`${p}-filter-vueltapic`);
    const filterDate = document.getElementById(`${p}-filter-date`);
    const captionId = `${p}-filter-date-caption`;

    if (Format && filterVp) {
      if (areaState.picRawValue) filterVp.value = areaState.picRawValue;
      Format.setupVueltaPicInput(filterVp);
    }
    if (Format && filterDate) {
      Format.attachCalendarPicker(filterDate);
      if (areaState.picRawValue) {
        const parsed = Format.parseVueltaPic(areaState.picRawValue);
        if (parsed.isValid && parsed.date) {
          filterDate.value = Format.formatDateISO ? Format.formatDateISO(parsed.date) : parsed.date.toISOString().slice(0, 10);
          Format.updateDateCaption(captionId, parsed.date);
        } else {
          Format.updateDateCaption(captionId, '');
        }
      } else {
        Format.updateDateCaption(captionId, filterVp ? filterVp.value : '');
      }
    }

    const syncFromVueltaPic = () => {
      const val = filterVp ? filterVp.value.trim() : '';
      areaState.picRawValue = val;
      if (Format) {
        const parsed = Format.parseVueltaPic(val);
        if (parsed.isValid) {
          if (parsed.date && filterDate) {
            filterDate.value = Format.formatDateISO ? Format.formatDateISO(parsed.date) : parsed.date.toISOString().slice(0, 10);
          }
          areaState.picFilter = parsed.pic;
          Format.updateDateCaption(captionId, parsed.date);
        } else {
          if (filterDate) filterDate.value = '';
          Format.updateDateCaption(captionId, '');
          areaState.picFilter = '';
        }
      }
      this.loadData();
    };

    if (filterVp) {
      filterVp.addEventListener('input', () => {
        clearTimeout(areaState.searchDebounceTimer);
        areaState.searchDebounceTimer = setTimeout(syncFromVueltaPic, 300);
      });
      filterVp.addEventListener('change', syncFromVueltaPic);
    }

    const syncFromDatePicker = (e) => {
      const val = e.target.value;
      if (val && Format) {
        try {
          const info = Format.getPicInfo(val);
          const vpFormatted = Format.formatVueltaPic(info.vuelta, info.pic);
          if (filterVp) filterVp.value = vpFormatted;
          areaState.picRawValue = vpFormatted;
          areaState.picFilter = info.pic;
          Format.updateDateCaption(captionId, val);
        } catch (err) {}
      } else {
        const defPrefix = Format ? Format.getDefaultVueltaPicPrefix() : '20-';
        if (filterVp) filterVp.value = defPrefix;
        areaState.picRawValue = '';
        Format.updateDateCaption(captionId, '');
        areaState.picFilter = '';
      }
      this.loadData();
    };

    if (filterDate) {
      filterDate.addEventListener('change', syncFromDatePicker);
      filterDate.addEventListener('input', syncFromDatePicker);
    }

    // 2. Filtro Sala
    const filterSala = document.getElementById(`${p}-filter-sala`);
    if (filterSala) {
      if (areaState.sala) filterSala.value = areaState.sala;
      filterSala.addEventListener('change', (e) => {
        areaState.sala = e.target.value;
        this.loadData();
      });
    }

    // 3. Filtro Estado
    const filterEstado = document.getElementById(`${p}-filter-estado`);
    if (filterEstado) {
      if (areaState.estado) filterEstado.value = areaState.estado;
      filterEstado.addEventListener('change', (e) => {
        areaState.estado = e.target.value;
        this.loadData();
      });
    }

    // 4. Filtro Estatus (Activas / Dttada)
    const filterEstatus = document.getElementById(`${p}-filter-estatus`);
    if (filterEstatus) {
      if (areaState.estatus) filterEstatus.value = areaState.estatus;
      filterEstatus.addEventListener('change', (e) => {
        areaState.estatus = e.target.value;
        this.loadData();
      });
    }

    // 5. Selector Día de Mortalidad MPD
    const filterMpdDay = document.getElementById(`${p}-filter-mpd-day`);
    if (filterMpdDay) {
      if (areaState.mpdDay) filterMpdDay.value = areaState.mpdDay;
      filterMpdDay.addEventListener('change', (e) => {
        areaState.mpdDay = e.target.value;
        this.loadData();
      });
    }

    // 6. Buscador rápido debounced
    const searchInput = document.getElementById(`${p}-search-input`);
    if (searchInput) {
      if (areaState.search) searchInput.value = areaState.search;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(areaState.searchDebounceTimer);
        areaState.searchDebounceTimer = setTimeout(() => {
          areaState.search = e.target.value;
          this.loadData();
        }, 250);
      });
    }

    // 7. Limpiar filtros (solo de esta tabla)
    const clearBtn = document.getElementById(`${p}-btn-clear-filters`);
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        areaState.search = '';
        areaState.sala = '';
        areaState.estado = '';
        areaState.estatus = '';
        areaState.picFilter = '';
        areaState.picRawValue = '';
        areaState.mpdDay = '';
        areaState.sortBy = 'orden';
        areaState.sortDir = 'asc';

        if (searchInput) searchInput.value = '';
        if (filterSala) filterSala.value = '';
        if (filterEstado) filterEstado.value = '';
        if (filterEstatus) filterEstatus.value = '';
        if (filterMpdDay) filterMpdDay.value = '';
        if (filterVp) filterVp.value = Format ? Format.getDefaultVueltaPicPrefix() : '20-';
        if (filterDate) filterDate.value = '';
        if (Format) Format.updateDateCaption(captionId, '');

        this.loadData();
      });
    }

    // 8. Sincronizar automáticamente desde módulos del sistema
    const btnSync = document.getElementById(`${b}-sync`);
    if (btnSync) {
      btnSync.addEventListener('click', () => this.handleSyncFromSystem());
    }

    // 8b. Importar Excel (hoja MATERNIDAD)
    const btnImport = document.getElementById(`${b}-import`);
    const fileInput = document.getElementById('maternidad-file-input');
    if (btnImport && fileInput) {
      btnImport.addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
      });
    }

    // 9. Exportar CSV (solo de esta área)
    const btnExport = document.getElementById(`${b}-export-csv`);
    if (btnExport) {
      btnExport.addEventListener('click', () => this.handleExportCsv(areaCode));
    }

    // 10. Nuevo Registro (preselecciona el área correspondiente)
    const btnNew = document.getElementById(`${b}-new`);
    if (btnNew) {
      btnNew.addEventListener('click', () => this.promptEditRecord(null, areaCode));
    }
  },

  /**
   * Registra los eventos del DOM del módulo Maternidad
   */
  bindEvents() {
    // 1. Pestañas internas
    const tabsNav = document.getElementById('maternidad-tabs-nav');
    if (tabsNav) {
      tabsNav.addEventListener('click', (e) => {
        const btn = e.target.closest('.mpd-tab-btn');
        if (btn && btn.dataset.tab) {
          this.switchTab(btn.dataset.tab);
        }
      });
    }

    // 2. Input de archivo Excel compartido
    const fileInput = document.getElementById('maternidad-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileImport(e));
    }

    // 3. Toolbars independientes por área (Establecida y Expansión)
    this._bindAreaToolbar('est', 'EST');
    this._bindAreaToolbar('exp', 'EXP');

    // 4. Delegación en contenedores de tablas (ordenamiento independiente por área, edición y eliminación)
    const subviewTable = document.getElementById('maternidad-subview-table');
    if (subviewTable) {
      subviewTable.addEventListener('click', (e) => {
        const th = e.target.closest('.th-sortable');
        if (th && th.dataset.sort) {
          const tableEl = th.closest('table[data-area]');
          const areaKey = (tableEl && tableEl.dataset.area === 'EXP') ? 'exp' : 'est';
          const areaState = this.state[areaKey];
          const col = th.dataset.sort;

          if (areaState.sortBy === col) {
            areaState.sortDir = areaState.sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            areaState.sortBy = col;
            areaState.sortDir = (col === 'nro' || col === 'sala') ? 'asc' : 'desc';
          }
          this.loadData();
          return;
        }

        const editBtn = e.target.closest('.btn-edit-maternidad');
        if (editBtn) {
          this.handleEditClick(Number(editBtn.dataset.id));
          return;
        }

        const delBtn = e.target.closest('.btn-delete-maternidad');
        if (delBtn) {
          this.handleDeleteClick(Number(delBtn.dataset.id), delBtn.dataset.sala);
          return;
        }
      });
    }
  },

  /**
   * Maneja la importación manual desde archivo Excel (.xlsm / .xlsx)
   */
  async handleFileImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
      this.notification.error('La librería SheetJS (XLSX) no está disponible.');
      return;
    }

    try {
      this.notification.toast('Leyendo hoja MATERNIDAD...', 'info');
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array' });

          const sheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === 'MATERNIDAD') ||
                            wb.SheetNames.find(n => n.toUpperCase().includes('MATERNIDAD')) ||
                            wb.SheetNames[0];
          const ws = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

          const records = this.parseExcelRows(rows);
          if (records.length === 0) {
            this.notification.warning(`No se encontraron registros válidos en la hoja "${sheetName}".`);
            return;
          }

          const estCount = records.filter(r => r.area === 'EST').length;
          const expCount = records.filter(r => r.area === 'EXP').length;

          const confirm = await this.notification.confirm(
            `Importar Hoja "${sheetName}"`,
            `Se encontraron ${records.length} registros (${estCount} Establecida y ${expCount} Expansión). ¿Deseas reemplazar los datos actuales en IndexedDB?`
          );

          if (!confirm) return;

          await this.model.clearAll();
          await this.model.bulkCreate(records);
          window.App.Data.maternidadSeed = records;

          await this.refreshCurrentView();
          this.notification.success(`¡Importación Exitosa! ${estCount} registros EST y ${expCount} EXP cargados.`);
        } catch (err) {
          console.error('Error importando hoja MATERNIDAD:', err);
          this.notification.error('Error al procesar el archivo: ' + err.message);
        } finally {
          event.target.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      this.notification.error('No se pudo leer el archivo seleccionado.');
    }
  },

  /**
   * Parsea matriz cruda de filas de la hoja MATERNIDAD, detectando automáticamente
   * los dos bloques independientes (Bloque 1: Establecida, Bloque 2: Expansión)
   */
  parseExcelRows(rows) {
    if (!Array.isArray(rows) || rows.length < 2) return [];

    const records = [];
    let currentGroup = 0; // 1 = EST, 2 = EXP
    let idCounter = 1;
    let ordenEst = 1;
    let ordenExp = 1;

    // Mapa dinámico de índices por si cambian columnas
    let colMap = {
      nro: 0,
      picInicio: 1,
      picCierre: 2,
      sala: 3,
      vlote: 4,
      lotePic: 5,
      partos: 6,
      lnv: 7,
      lnm: 8,
      lnMo: 9,
      mpdAlCierre: 10,
      pesoX: 11
    };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.every(c => c === '' || c === null || c === undefined)) continue;

      const normalizedCells = r.map(c => String(c || '').trim().toUpperCase());
      const isHeaderRow = normalizedCells.some(c => c === 'N°' || c === 'Nº' || c === 'NO') &&
                          normalizedCells.some(c => c === 'SALA') &&
                          normalizedCells.some(c => c.includes('LNV'));

      if (isHeaderRow) {
        currentGroup++;
        const findIdx = (...names) => {
          for (const n of names) {
            const idx = normalizedCells.findIndex(c => c === n || c.includes(n));
            if (idx !== -1) return idx;
          }
          return -1;
        };
        const idxNro = findIdx('N°', 'Nº', 'NO');
        const idxPicIni = findIdx('PIC INICIO');
        const idxPicCie = findIdx('PIC CIERRE');
        const idxSala = findIdx('SALA');
        const idxVlote = findIdx('VLOTE');
        const idxLotePic = findIdx('LOTEPIC');
        const idxPartos = findIdx('PARTOS');
        const idxLnv = findIdx('LNV');
        const idxLnm = findIdx('LNM');
        const idxLnMo = findIdx('LNMO');
        const idxMpd = findIdx('MPD AL CIERRE', 'MPD');
        const idxPeso = findIdx('PESO X', 'PESO');

        colMap = {
          nro: idxNro !== -1 ? idxNro : 0,
          picInicio: idxPicIni !== -1 ? idxPicIni : 1,
          picCierre: idxPicCie !== -1 ? idxPicCie : 2,
          sala: idxSala !== -1 ? idxSala : 3,
          vlote: idxVlote !== -1 ? idxVlote : 4,
          lotePic: idxLotePic !== -1 ? idxLotePic : 5,
          partos: idxPartos !== -1 ? idxPartos : 6,
          lnv: idxLnv !== -1 ? idxLnv : 7,
          lnm: idxLnm !== -1 ? idxLnm : 8,
          lnMo: idxLnMo !== -1 ? idxLnMo : 9,
          mpdAlCierre: idxMpd !== -1 ? idxMpd : 10,
          pesoX: idxPeso !== -1 ? idxPeso : 11
        };
        continue;
      }

      const sala = parseInt(r[colMap.sala], 10);
      if (isNaN(sala) || sala <= 0) continue;

      // Bloque 1 = EST (Salas 1-24), Bloque 2 = EXP (Salas 25-41)
      const area = (currentGroup >= 2 || (sala >= 25 && sala <= 41)) ? 'EXP' : 'EST';
      const orden = area === 'EST' ? ordenEst++ : ordenExp++;

      const rawNro = r[colMap.nro];
      const nro = String(rawNro).trim() === '-'
        ? '-'
        : (rawNro !== '' && rawNro !== null && rawNro !== undefined && !isNaN(Number(rawNro)) ? Number(rawNro) : String(rawNro || '').trim());

      const rawPicIni = r[colMap.picInicio];
      const picInicio = (rawPicIni !== '' && rawPicIni !== null && rawPicIni !== undefined && !isNaN(Number(rawPicIni)))
        ? Number(rawPicIni)
        : String(rawPicIni || '').trim();

      const rawPicCie = r[colMap.picCierre];
      const picCierre = (rawPicCie === '' || rawPicCie === null || rawPicCie === undefined)
        ? ''
        : (!isNaN(Number(rawPicCie)) ? Number(rawPicCie) : String(rawPicCie).trim().toUpperCase());

      const rawVlote = r[colMap.vlote];
      const vlote = (rawVlote !== '' && rawVlote !== null && rawVlote !== undefined && !isNaN(Number(rawVlote)))
        ? Number(rawVlote)
        : null;

      const rawLotePic = r[colMap.lotePic];
      const lotePic = (rawLotePic === '' || rawLotePic === null || rawLotePic === undefined)
        ? ''
        : (!isNaN(Number(rawLotePic)) ? Number(rawLotePic) : String(rawLotePic).trim().toUpperCase());

      const partos = Number(r[colMap.partos]) || 0;
      const lnv = Number(r[colMap.lnv]) || 0;
      const lnm = Number(r[colMap.lnm]) || 0;
      const lnMo = Number(r[colMap.lnMo]) || 0;
      const mpdAlCierre = Number(r[colMap.mpdAlCierre]) || 0;

      const rawPeso = r[colMap.pesoX];
      let pesoX = null;
      if (rawPeso !== '' && rawPeso !== null && rawPeso !== undefined) {
        const parsedPeso = parseFloat(String(rawPeso).replace(',', '.'));
        if (!isNaN(parsedPeso)) {
          pesoX = Number(parsedPeso.toFixed(2));
        }
      }

      const isPre = lotePic === 'PRE' || picCierre === 'PRE' || picCierre === '';
      const estado = isPre ? 'Pre-Parto' : 'Cerrada';

      records.push({
        id: idCounter++,
        area,
        orden,
        nro,
        picInicio,
        picCierre,
        sala,
        vlote,
        lotePic,
        partos,
        lnv,
        lnm,
        lnMo,
        mpdAlCierre,
        pesoX,
        estado
      });
    }

    return records;
  },

  /**
   * Edita un registro por ID
   */
  async handleEditClick(id) {
    const all = await this.model.getAll();
    const record = all.find(r => r.id === id);
    if (!record) return;
    await this.promptEditRecord(record);
  },

  /**
   * Elimina un registro por ID
   */
  async handleDeleteClick(id, sala) {
    const res = await Swal.fire({
      title: `¿Eliminar registro de Sala ${sala}?`,
      text: 'Esta acción eliminará el registro de la base de datos IndexedDB.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (res.isConfirmed) {
      await this.model.delete(id);
      await this.refreshCurrentView();
      this.notification.success('Registro eliminado exitosamente.');
    }
  },

  /**
   * Modal para crear o editar un registro de Maternidad
   */
  async promptEditRecord(record = null, defaultArea = 'EST') {
    const isNew = !record;
    const areaNombre = defaultArea === 'EXP' ? 'Expansión' : 'Establecida';
    const title = isNew ? `Nuevo Registro en Maternidad (${areaNombre})` : `Editar Registro · Sala ${record.sala}`;

    const curArea = record ? record.area : defaultArea;
    const curNro = record ? record.nro : 0;
    const curPicIni = record ? record.picInicio : '';
    const curPicCie = record ? record.picCierre : '';
    const curSala = record ? record.sala : '';
    const curVlote = record && record.vlote !== null ? record.vlote : 20;
    const curLotePic = record ? record.lotePic : '';
    const curPartos = record ? record.partos : 0;
    const curLnv = record ? record.lnv : 0;
    const curLnm = record ? record.lnm : 0;
    const curLnMo = record ? record.lnMo : 0;
    const curMpd = record ? record.mpdAlCierre : 0;
    const curPeso = record && record.pesoX !== null ? record.pesoX : '';

    const { value: formValues } = await Swal.fire({
      title,
      width: '620px',
      html: `
        <div style="text-align: left; font-size: 0.9rem; margin-top: 0.5rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.65rem; margin-bottom: 0.75rem;">
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; color: #334155;">Área:</label>
              <select id="swal-mat-area" class="swal2-select" style="width: 100%; margin: 0; height: 40px;">
                <option value="EST" ${curArea === 'EST' ? 'selected' : ''}>Establecida (EST)</option>
                <option value="EXP" ${curArea === 'EXP' ? 'selected' : ''}>Expansión (EXP)</option>
              </select>
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; color: #334155;">Sala *:</label>
              <input id="swal-mat-sala" type="number" min="1" max="41" class="swal2-input" style="width: 100%; margin: 0; height: 40px;" value="${curSala}">
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; color: #334155;">N°:</label>
              <input id="swal-mat-nro" type="text" class="swal2-input" style="width: 100%; margin: 0; height: 40px;" value="${curNro}" placeholder="Ej. 0, 1 o -">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.65rem; margin-bottom: 0.75rem;">
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; color: #334155;">Pic Inicio *:</label>
              <input id="swal-mat-picini" type="number" class="swal2-input" style="width: 100%; margin: 0; height: 40px;" value="${curPicIni}">
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; color: #334155;">Pic Cierre:</label>
              <input id="swal-mat-piccie" type="text" class="swal2-input" style="width: 100%; margin: 0; height: 40px;" value="${curPicCie}" placeholder="Ej. 128 o PRE">
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; color: #334155;">Vlote:</label>
              <input id="swal-mat-vlote" type="number" class="swal2-input" style="width: 100%; margin: 0; height: 40px;" value="${curVlote}">
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; color: #334155;">LotePic *:</label>
              <input id="swal-mat-lotepic" type="text" class="swal2-input" style="width: 100%; margin: 0; height: 40px;" value="${curLotePic}" placeholder="Ej. 128 o PRE">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.65rem; margin-bottom: 0.75rem;">
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; color: #334155;">Partos:</label>
              <input id="swal-mat-partos" type="number" min="0" class="swal2-input" style="width: 100%; margin: 0; height: 40px;" value="${curPartos}">
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; color: #334155;">LNV:</label>
              <input id="swal-mat-lnv" type="number" min="0" class="swal2-input" style="width: 100%; margin: 0; height: 40px;" value="${curLnv}">
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; color: #334155;">LNM:</label>
              <input id="swal-mat-lnm" type="number" min="0" class="swal2-input" style="width: 100%; margin: 0; height: 40px;" value="${curLnm}">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.65rem;">
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; color: #334155;">LNMo (Momias):</label>
              <input id="swal-mat-lnmo" type="number" min="0" class="swal2-input" style="width: 100%; margin: 0; height: 40px;" value="${curLnMo}">
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; color: #334155;">MPD al Cierre:</label>
              <input id="swal-mat-mpd" type="number" min="0" class="swal2-input" style="width: 100%; margin: 0; height: 40px;" value="${curMpd}">
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; color: #334155;">Peso X (kg):</label>
              <input id="swal-mat-peso" type="number" step="0.01" min="0" class="swal2-input" style="width: 100%; margin: 0; height: 40px;" value="${curPeso}" placeholder="Ej. 1.38">
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: isNew ? 'Crear Registro' : 'Guardar Cambios',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      didOpen: () => {
        const salaInput = document.getElementById('swal-mat-sala');
        const areaSelect = document.getElementById('swal-mat-area');
        if (salaInput && areaSelect) {
          salaInput.addEventListener('input', () => {
            const s = parseInt(salaInput.value, 10);
            if (!isNaN(s)) {
              areaSelect.value = (s >= 25 && s <= 41) ? 'EXP' : 'EST';
            }
          });
        }
      },
      preConfirm: () => {
        const area = document.getElementById('swal-mat-area').value;
        const sala = Number(document.getElementById('swal-mat-sala').value);
        const nroRaw = document.getElementById('swal-mat-nro').value.trim();
        const picInicio = document.getElementById('swal-mat-picini').value.trim();
        const picCierre = document.getElementById('swal-mat-piccie').value.trim();
        const vloteVal = document.getElementById('swal-mat-vlote').value.trim();
        const lotePic = document.getElementById('swal-mat-lotepic').value.trim();
        const partos = Number(document.getElementById('swal-mat-partos').value) || 0;
        const lnv = Number(document.getElementById('swal-mat-lnv').value) || 0;
        const lnm = Number(document.getElementById('swal-mat-lnm').value) || 0;
        const lnMo = Number(document.getElementById('swal-mat-lnmo').value) || 0;
        const mpdAlCierre = Number(document.getElementById('swal-mat-mpd').value) || 0;
        const pesoVal = document.getElementById('swal-mat-peso').value.trim();

        if (!sala || isNaN(sala)) {
          Swal.showValidationMessage('El número de sala es obligatorio.');
          return false;
        }
        if (!picInicio || isNaN(Number(picInicio))) {
          Swal.showValidationMessage('El Pic Inicio es obligatorio.');
          return false;
        }

        const nro = nroRaw === '-' ? '-' : (!isNaN(Number(nroRaw)) && nroRaw !== '' ? Number(nroRaw) : nroRaw);

        return {
          area,
          sala,
          nro,
          picInicio: Number(picInicio),
          picCierre: picCierre === '' ? '' : (!isNaN(Number(picCierre)) ? Number(picCierre) : picCierre.toUpperCase()),
          vlote: vloteVal !== '' ? Number(vloteVal) : null,
          lotePic: lotePic === '' ? 'PRE' : (!isNaN(Number(lotePic)) ? Number(lotePic) : lotePic.toUpperCase()),
          partos,
          lnv,
          lnm,
          lnMo,
          mpdAlCierre,
          pesoX: pesoVal !== '' ? Number(parseFloat(pesoVal).toFixed(2)) : null
        };
      }
    });

    if (formValues) {
      try {
        if (isNew) {
          await this.model.create(formValues);
          this.notification.success('Registro agregado exitosamente en Maternidad.');
        } else {
          await this.model.update(record.id, formValues);
          this.notification.success('Registro actualizado exitosamente.');
        }
        await this.refreshCurrentView();
      } catch (err) {
        this.notification.error('Error guardando registro: ' + err.message);
      }
    }
  },

  /**
   * Sincroniza automáticamente Maternidad desde Cierres, Destetes, MPD, Cierres de Mes y Partos Salas
   */
  async handleSyncFromSystem() {
    try {
      const res = await this.model.syncFromSystem();
      const filterOptions = await this.model.getFilterOptions();
      this.view.renderSkeleton(filterOptions);
      this.bindEvents();
      await this.loadData();
      this.notification.success(
        `Maternidad sincronizada: ${res.total} registros (${res.estCount} Establecida · ${res.expCount} Expansión).`
      );
    } catch (err) {
      console.error('Error sincronizando Maternidad:', err);
      this.notification.alert('Error de Sincronización', err.message || 'No se pudo sincronizar Maternidad.', 'danger');
    }
  },

  /**
   * Exporta a CSV con UTF-8 BOM (individual por área 'EST'/'EXP' o ambas)
   */
  async handleExportCsv(areaCode = null) {
    try {
      const data = await this.model.getDualTableData({
        est: this.state.est,
        exp: this.state.exp
      });

      const allRows = areaCode === 'EST'
        ? data.establecida
        : (areaCode === 'EXP' ? data.expansion : [...data.establecida, ...data.expansion]);

      if (allRows.length === 0) {
        this.notification.warning('No hay registros para exportar.');
        return;
      }

      const headers = ['Área', 'N°', 'Pic Inicio', 'Pic Cierre', 'Sala', 'Vlote', 'LotePic', 'Partos', 'LNV', 'LNM', 'LNMo', 'MPD al Cierre', 'Mort. Acum.', 'Mort. Act.', 'Mort. Tot.', 'Mort. Día', '% MPD', 'Peso X', 'Estatus'];
      const csvRows = [
        headers.join(';'),
        ...allRows.map(r => [
          r.area === 'EST' ? 'Establecida' : 'Expansión',
          r.nro,
          r.picInicio,
          r.picCierre,
          r.sala,
          r.vlote !== null && r.vlote !== undefined ? r.vlote : '',
          r.lotePic,
          r.partos,
          r.lnv,
          r.lnm,
          r.lnMo,
          r.mpdAlCierre,
          r.mortAcum ?? 0,
          r.mortActual ?? 0,
          r.mortTotal ?? 0,
          r.mortDia ?? 0,
          Number(r.pctMpd || 0).toFixed(2).replace('.', ','),
          r.pesoX !== null && r.pesoX !== undefined ? String(r.pesoX).replace('.', ',') : '',
          r.estatus || 'Activas'
        ].join(';'))
      ];

      const areaTag = areaCode === 'EST' ? 'Establecida' : (areaCode === 'EXP' ? 'Expansion' : 'EST_EXP');
      const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Maternidad_${areaTag}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.notification.success(`Exportados ${allRows.length} registros a CSV.`);
    } catch (err) {
      this.notification.error('Error exportando CSV: ' + err.message);
    }
  },

  /**
   * Refresca la vista actual
   */
  async refreshCurrentView() {
    const filterOptions = await this.model.getFilterOptions();
    if (this.view.container) {
      this.view.renderSkeleton(filterOptions);
      this.bindEvents();
    }
    if (this.state.activeTab === 'charts') {
      const mpdDay = this.state.est.mpdDay || this.state.exp.mpdDay || '';
      const chartData = await this.model.getChartData(mpdDay);
      this.view.renderCharts(chartData);
    } else {
      await this.loadData();
    }
  }
};

