/**
 * ConfiguracionController: Controlador para la administración de parámetros del sistema:
 * 1. Curva de Pesos Estándar por Edad (1 a 40 días).
 * 2. Estructura de Infraestructura: Salas, Maternidades (M1 a M5), Gestaciones (G1 a G11) y Áreas (EST/EXP).
 * 3. Cierres de Mes y Calendario PIC (Cortes mensuales, Fechas Inicio/Fin y Rangos PIC en IndexedDB: 'cierres_mes').
 */
window.App = window.App || {};
window.App.Controllers = window.App.Controllers || {};

window.App.Controllers.Configuracion = {
  pesosModel: window.App.Models.PesosEdad,
  salasModel: window.App.Models.SalasMaternidad,
  cierresMesModel: window.App.Models.CierresMes,
  configView: window.App.Views.Configuracion,
  notification: window.App.Utils.Notification,

  _pesosData: [],
  _salasData: [],
  _cierresMesData: [],
  _eventsBound: false,

  async init(activeTab = null) {
    if (activeTab) {
      this.configView.activeTab = activeTab;
    }

    await this.loadData();
    this.render();

    if (!this._eventsBound) {
      this.bindEvents();
      this._eventsBound = true;
    }
  },

  async loadData() {
    this._pesosData = await this.pesosModel.getAll(true);
    this._salasData = await this.salasModel.getAll(true);
    this._cierresMesData = await this.cierresMesModel.getAll(true);

    // Si la tabla de pesos estuviera vacía, sembrarla automáticamente desde el seed
    if ((!this._pesosData || this._pesosData.length === 0) && window.App.Data && window.App.Data.pesosEdadSeed) {
      await this.pesosModel.bulkCreate(window.App.Data.pesosEdadSeed);
      this._pesosData = await this.pesosModel.getAll(true);
    }

    // Si la tabla de salas estuviera vacía, sembrarla automáticamente desde el seed
    if ((!this._salasData || this._salasData.length === 0) && window.App.Data && window.App.Data.salasMaternidadesSeed) {
      await this.salasModel.bulkCreate(window.App.Data.salasMaternidadesSeed);
      this._salasData = await this.salasModel.getAll(true);
    }

    // Si la tabla de cierres de mes estuviera vacía, sembrarla automáticamente desde el seed
    if ((!this._cierresMesData || this._cierresMesData.length === 0) && window.App.Data && window.App.Data.cierresMesSeed) {
      await this.cierresMesModel.bulkCreate(window.App.Data.cierresMesSeed);
      this._cierresMesData = await this.cierresMesModel.getAll(true);
    }
  },

  render() {
    this.configView.render(this._pesosData, this._salasData, this._cierresMesData);
  },

  bindEvents() {
    document.addEventListener('click', async (e) => {
      // Cambio de pestaña en Configuración
      const tabBtn = e.target.closest('.btn-config-tab');
      if (tabBtn) {
        const tab = tabBtn.dataset.tab;
        this.configView.activeTab = tab;
        this.render();
        return;
      }

      // Respaldo y Restauración JSON de IndexedDB
      if (e.target.closest('#btn-export-backup')) {
        await this.handleExportBackup();
        return;
      }
      if (e.target.closest('#btn-import-backup')) {
        const input = document.getElementById('config-backup-file-input');
        if (input) {
          input.value = '';
          input.click();
        }
        return;
      }

      // ---------------------------------------------
      // EVENTOS PESTAÑA: PESOS POR EDAD
      // ---------------------------------------------
      if (e.target.closest('#btn-restore-pesos')) {
        await this.handleRestorePesos();
        return;
      }

      if (e.target.closest('#btn-add-peso')) {
        await this.promptEditPeso(null, null);
        return;
      }

      const editPesoBtn = e.target.closest('.btn-edit-peso');
      if (editPesoBtn) {
        const edad = Number(editPesoBtn.dataset.edad);
        const peso = Number(editPesoBtn.dataset.peso);
        await this.promptEditPeso(edad, peso);
        return;
      }

      // ---------------------------------------------
      // EVENTOS PESTAÑA: SALAS Y ÁREAS
      // ---------------------------------------------
      if (e.target.closest('#btn-restore-salas')) {
        await this.handleRestoreSalas();
        return;
      }

      if (e.target.closest('#btn-add-sala')) {
        await this.promptEditSala(null);
        return;
      }

      const editSalaBtn = e.target.closest('.btn-edit-sala');
      if (editSalaBtn) {
        const id = editSalaBtn.dataset.id;
        const sala = editSalaBtn.dataset.sala;
        const mat = editSalaBtn.dataset.mat;
        const area = editSalaBtn.dataset.area;
        const sigla = editSalaBtn.dataset.sigla;
        await this.promptEditSala({ id, sala, mat, area, sigla });
        return;
      }

      // ---------------------------------------------
      // EVENTOS PESTAÑA: CIERRES DE MES (CALENDARIO PIC)
      // ---------------------------------------------
      if (e.target.closest('#btn-restore-cierres-mes')) {
        await this.handleRestoreCierresMes();
        return;
      }

      if (e.target.closest('#btn-add-cierre-mes')) {
        await this.promptEditCierreMes(null);
        return;
      }

      // Botón Cerrar Mes
      const cerrarMesBtn = e.target.closest('.btn-cerrar-mes');
      if (cerrarMesBtn) {
        const id = Number(cerrarMesBtn.dataset.id) || cerrarMesBtn.dataset.id;
        const mes = cerrarMesBtn.dataset.mes;
        const ano = cerrarMesBtn.dataset.ano;
        await this.handleCerrarMes(id, mes, ano);
        return;
      }

      // Botón Reabrir Mes
      const reabrirMesBtn = e.target.closest('.btn-reabrir-mes');
      if (reabrirMesBtn) {
        const id = Number(reabrirMesBtn.dataset.id) || reabrirMesBtn.dataset.id;
        const mes = reabrirMesBtn.dataset.mes;
        const ano = reabrirMesBtn.dataset.ano;
        await this.handleReabrirMes(id, mes, ano);
        return;
      }

      // Botón Editar Período de Mes
      const editCierreMesBtn = e.target.closest('.btn-edit-cierre-mes');
      if (editCierreMesBtn) {
        const id = Number(editCierreMesBtn.dataset.id) || editCierreMesBtn.dataset.id;
        const record = this._cierresMesData.find(r => r.id == id);
        if (record) {
          await this.promptEditCierreMes(record);
        }
        return;
      }

      // Botón Eliminar Período de Mes
      const deleteCierreMesBtn = e.target.closest('.btn-delete-cierre-mes');
      if (deleteCierreMesBtn) {
        const id = Number(deleteCierreMesBtn.dataset.id) || deleteCierreMesBtn.dataset.id;
        const mes = deleteCierreMesBtn.dataset.mes;
        const ano = deleteCierreMesBtn.dataset.ano;
        await this.handleDeleteCierreMes(id, mes, ano);
        return;
      }
    });

    // Eventos de Input y Búsqueda
    document.addEventListener('input', (e) => {
      if (e.target.id === 'input-search-pesos') {
        this.configView.searchPesosTerm = e.target.value;
        const tabContent = document.getElementById('tab-content-pesos');
        if (tabContent) {
          tabContent.innerHTML = this.configView.renderPesosTab(this._pesosData);
        }
      }

      if (e.target.id === 'input-search-salas') {
        this.configView.searchSalasTerm = e.target.value;
        const tabContent = document.getElementById('tab-content-salas');
        if (tabContent) {
          tabContent.innerHTML = this.configView.renderSalasTab(this._salasData);
        }
      }

      if (e.target.id === 'input-search-cierres-mes') {
        this.configView.searchCierresMesTerm = e.target.value;
        const tabContent = document.getElementById('tab-content-cierres-mes');
        if (tabContent) {
          tabContent.innerHTML = this.configView.renderCierresMesTab(this._cierresMesData);
        }
      }
    });

    // Eventos de Select Filters
    document.addEventListener('change', (e) => {
      if (e.target.id === 'select-filter-area') {
        this.configView.salasAreaFilter = e.target.value;
        const tabContent = document.getElementById('tab-content-salas');
        if (tabContent) {
          tabContent.innerHTML = this.configView.renderSalasTab(this._salasData);
        }
      }

      if (e.target.id === 'select-filter-tipo') {
        this.configView.salasTipoFilter = e.target.value;
        const tabContent = document.getElementById('tab-content-salas');
        if (tabContent) {
          tabContent.innerHTML = this.configView.renderSalasTab(this._salasData);
        }
      }

      if (e.target.id === 'select-filter-ano-cierres-mes') {
        this.configView.cierresMesAnoFilter = e.target.value;
        const tabContent = document.getElementById('tab-content-cierres-mes');
        if (tabContent) {
          tabContent.innerHTML = this.configView.renderCierresMesTab(this._cierresMesData);
        }
      }

      if (e.target.id === 'select-filter-estado-cierres-mes') {
        this.configView.cierresMesEstadoFilter = e.target.value;
        const tabContent = document.getElementById('tab-content-cierres-mes');
        if (tabContent) {
          tabContent.innerHTML = this.configView.renderCierresMesTab(this._cierresMesData);
        }
      }

      if (e.target.id === 'config-backup-file-input') {
        const file = e.target.files && e.target.files[0];
        if (file) {
          this.handleImportBackupFile(file);
        }
        e.target.value = '';
      }
    });
  },

  // =========================================================
  // MÉTODOS DE CIERRES DE MES (CALENDARIO PIC)
  // =========================================================

  /**
   * Cierra formalmente un mes de producción con el control estandarizado de Fecha PIC (Vuelta-PIC + Calendario)
   */
  async handleCerrarMes(id, mes, ano) {
    const record = this._cierresMesData.find(r => r.id == id);
    if (!record) return;

    const Format = window.App.Utils.Format;
    const defaultVuelta = record.vFin || record.vInicio || (Format ? Format.getCurrentVuelta() : 20);
    const defaultVueltaPic = (record.vFin && record.picFin !== null && record.picFin !== undefined)
      ? Format.formatVueltaPic(record.vFin, record.picFin)
      : `${defaultVuelta}-`;

    const { value: formValues } = await Swal.fire({
      title: `Cierre Oficial de Mes: ${mes} ${ano}`,
      html: `
        <div style="text-align: left; font-size: 0.95rem; line-height: 1.5; color: #334155;">
          <div style="background: #f1f5f9; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <span style="color: #64748b;">Período en curso:</span>
              <strong style="color: #0f172a; text-transform: uppercase;">${mes} ${ano}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Inicio de producción:</span>
              <span style="font-family: monospace; font-weight: 600;">
                ${record.fechaIni}
                <span style="color:#0284c7; font-weight: 700;">(${Format ? Format.formatVueltaPic(record.vInicio, record.picInicio) : `PIC ${record.picInicio}`})</span>
              </span>
            </div>
          </div>

          <!-- CONTROL UNIFICADO: FECHA PIC CON SELECTOR DE CALENDARIO Y FECHA HUMANA -->
          <div class="pic-date-control" style="margin-bottom: 1.25rem;" title="Fecha PIC de Cierre (Vuelta-PIC)">
            <label class="filter-field-label" style="display: block; font-weight: 700; margin-bottom: 0.4rem; color: #1e293b; font-size: 0.85rem;" title="Formato: Vuelta-PIC (Ej: 20-132 o 19-786)">
              FECHA PIC DE CIERRE
            </label>
            <div class="pic-input-wrapper" style="position: relative;">
              <input type="text" id="swal-cierre-vueltapic" class="form-control pic-input-field" placeholder="Ej: 20-132" value="${defaultVueltaPic}" autocomplete="off" style="width: 100%; box-sizing: border-box; height: 44px; font-weight: 700; color: #1d4ed8; font-size: 1.15rem; padding-right: 44px;" />
              <div class="btn-pic-calendar-wrapper" id="swal-cierre-btn-cal" title="Seleccionar fecha en calendario" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 4px; color: #475569;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <input type="date" id="swal-cierre-date" class="pic-hidden-datepicker" style="position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none;" tabindex="-1" />
              </div>
            </div>
            <div class="pic-date-caption" id="swal-cierre-caption" style="margin-top: 0.4rem; font-size: 0.85rem; color: #0f172a; font-weight: 600; min-height: 1.25rem;"></div>
          </div>

          <div id="swal-cierre-summary" style="padding: 0.85rem 1rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 0.85rem; color: #1e40af;">
            💡 Ingresa la <b>Fecha PIC (Vuelta-PIC)</b> o haz clic en el icono 📅 para seleccionar la fecha del calendario.
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#0f172a',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Confirmar y Cerrar Mes',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const inputVp = document.getElementById('swal-cierre-vueltapic');
        const datePicker = document.getElementById('swal-cierre-date');
        const btnCal = document.getElementById('swal-cierre-btn-cal');
        const summaryEl = document.getElementById('swal-cierre-summary');

        const parseDMY = (str) => {
          if (!str) return null;
          const clean = str.trim().replace(/-/g, '/');
          const parts = clean.split('/');
          if (parts.length === 3) {
            return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), 12, 0, 0);
          }
          return null;
        };

        const dIni = parseDMY(record.fechaIni);
        let updating = false;

        const updateSummary = (endDate, endV, endP) => {
          if (!summaryEl) return;
          if (dIni && endDate && !isNaN(endDate.getTime())) {
            const diasDiff = Math.round((endDate - dIni) / (1000 * 60 * 60 * 24)) + 1;
            const d = String(endDate.getDate()).padStart(2, '0');
            const m = String(endDate.getMonth() + 1).padStart(2, '0');
            const y = endDate.getFullYear();
            const dmy = `${d}/${m}/${y}`;
            const vStr = Format ? Format.formatVueltaPic(endV, endP) : `${endV}-${endP}`;
            summaryEl.innerHTML = `
              <div style="font-weight: 700; color: #0f172a; margin-bottom: 0.25rem;">
                Duración del Ciclo: <span style="color: #2563eb;">${diasDiff} días</span>
              </div>
              <div style="color: #475569; font-size: 0.8rem;">
                Desde ${record.fechaIni} (${Format ? Format.formatVueltaPic(record.vInicio, record.picInicio) : record.picInicio}) hasta ${dmy} (${vStr})
              </div>
            `;
          } else {
            summaryEl.innerHTML = `💡 Ingresa la <b>Fecha PIC (Vuelta-PIC)</b> o haz clic en 📅 para seleccionar la fecha del calendario.`;
          }
        };

        const syncFromDate = (dateObj) => {
          if (updating || !dateObj || isNaN(dateObj.getTime())) return;
          updating = true;
          try {
            const picInfo = Format.getPicInfo(dateObj);
            inputVp.value = Format.formatVueltaPic(picInfo.vuelta, picInfo.pic);
            datePicker.value = Format.formatDateISO(dateObj);
            Format.updateDateCaption('swal-cierre-caption', dateObj);
            updateSummary(dateObj, picInfo.vuelta, picInfo.pic);
          } finally {
            updating = false;
          }
        };

        const syncFromVueltaPic = (str) => {
          if (updating) return;
          updating = true;
          try {
            const parsed = Format.parseVueltaPic(str);
            if (parsed.isValid && parsed.date) {
              datePicker.value = Format.formatDateISO(parsed.date);
              Format.updateDateCaption('swal-cierre-caption', parsed.date);
              updateSummary(parsed.date, parsed.vuelta, parsed.pic);
            } else {
              datePicker.value = '';
              Format.updateDateCaption('swal-cierre-caption', '');
              updateSummary(null, null, null);
            }
          } finally {
            updating = false;
          }
        };

        if (Format) {
          Format.setupVueltaPicInput(inputVp);
          Format.attachCalendarPicker(datePicker, btnCal);
        }

        // Si ya tenía datos predefinidos
        if (record.fechaFin) {
          const d = parseDMY(record.fechaFin);
          if (d) syncFromDate(d);
        } else if (record.picFin !== null && record.picFin !== undefined && record.picFin !== '') {
          syncFromVueltaPic(inputVp.value);
        } else {
          Format.updateDateCaption('swal-cierre-caption', '');
        }

        inputVp.addEventListener('input', () => syncFromVueltaPic(inputVp.value));
        inputVp.addEventListener('change', () => syncFromVueltaPic(inputVp.value));

        datePicker.addEventListener('change', (e) => {
          if (!e.target.value) return;
          const [y, m, d] = e.target.value.split('-').map(Number);
          syncFromDate(new Date(y, m - 1, d, 12, 0, 0));
        });
        datePicker.addEventListener('input', (e) => {
          if (!e.target.value) return;
          const [y, m, d] = e.target.value.split('-').map(Number);
          syncFromDate(new Date(y, m - 1, d, 12, 0, 0));
        });
      },
      preConfirm: () => {
        const inputVp = document.getElementById('swal-cierre-vueltapic');
        const val = inputVp ? inputVp.value.trim() : '';
        const parsed = Format ? Format.parseVueltaPic(val) : null;

        if (!parsed || !parsed.isValid || !parsed.date) {
          Swal.showValidationMessage('Por favor ingresa una Fecha PIC válida en formato Vuelta-PIC (ej. 20-132) o selecciona una fecha del calendario.');
          return false;
        }

        const d = String(parsed.date.getDate()).padStart(2, '0');
        const m = String(parsed.date.getMonth() + 1).padStart(2, '0');
        const y = parsed.date.getFullYear();
        const fFin = `${d}/${m}/${y}`;

        // Validación de orden de fecha
        const parts = record.fechaIni.trim().replace(/-/g, '/').split('/');
        if (parts.length === 3) {
          const dIni = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), 12, 0, 0);
          if (parsed.date < dIni) {
            Swal.showValidationMessage(`La fecha de cierre (${fFin}) no puede ser anterior a la fecha de inicio (${record.fechaIni}).`);
            return false;
          }
        }

        return {
          fechaFin: fFin,
          vFin: parsed.vuelta,
          picFin: parsed.pic,
          parsedDate: parsed.date
        };
      }
    });

    if (formValues) {
      try {
        const currentUser = (window.App.Controllers.Auth && window.App.Controllers.Auth.currentUser)
          ? window.App.Controllers.Auth.currentUser.username
          : 'admin';

        const diasCalculados = this._calculateDias(record.fechaIni, formValues.fechaFin);

        const updatedRecord = {
          ...record,
          fechaFin: formValues.fechaFin,
          vFin: formValues.vFin,
          picFin: formValues.picFin,
          dias: diasCalculados,
          estado: 'Cerrado',
          fechaCierre: new Date().toISOString(),
          cerradoPor: currentUser
        };

        await this.cierresMesModel.update(record.id, updatedRecord);

        // Prepara automáticamente el inicio del siguiente mes de producción (día siguiente)
        await this._prepararSiguienteMes(updatedRecord);

        // Sincroniza cierres 'PRE' abiertos en Maternidad al cerrar el mes
        if (window.App.Models.Maternidad && typeof window.App.Models.Maternidad.onMonthClosed === 'function') {
          await window.App.Models.Maternidad.onMonthClosed(updatedRecord);
        }

        await this.loadData();
        this.render();
        const picDisplay = `${formValues.vFin}-${formValues.picFin}`;
        this.notification.success(`El período de ${mes} ${ano} fue cerrado exitosamente (Fecha: ${formValues.fechaFin} | PIC: ${picDisplay}).`);
      } catch (err) {
        console.error('Error al cerrar mes:', err);
        this.notification.error('No se pudo cerrar el mes: ' + err.message);
      }
    }
  },

  /**
   * Prepara o crea el siguiente mes comenzando el día posterior al cierre (ej: cierra el 28, inicia el 29)
   */
  async _prepararSiguienteMes(closedRecord) {
    if (!closedRecord.fechaFin) return;

    try {
      const Format = window.App.Utils.Format;
      const parseDMY = (str) => {
        const [d, m, y] = str.split('/').map(Number);
        return new Date(y, m - 1, d, 12, 0, 0);
      };
      const formatDMY = (date) => {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
      };

      const nextDate = parseDMY(closedRecord.fechaFin);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextFechaIni = formatDMY(nextDate);
      const nextPicInfo = Format.getPicInfo(nextDate);
      const nextPicIni = nextPicInfo.pic;
      const nextVueltaIni = nextPicInfo.vuelta;

      const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      let nextMesNum = closedRecord.mesNum + 1;
      let nextAno = closedRecord.ano;
      if (nextMesNum > 12) {
        nextMesNum = 1;
        nextAno += 1;
      }
      const nextMesNombre = meses[nextMesNum - 1];

      // Comprobar si ya existe el registro del mes siguiente
      const all = await this.cierresMesModel.getAll();
      const existingNext = all.find(r => r.ano === nextAno && (r.mesNum === nextMesNum || r.mes === nextMesNombre));

      if (existingNext) {
        if (existingNext.estado === 'Abierto') {
          await this.cierresMesModel.update(existingNext.id, {
            ...existingNext,
            fechaIni: nextFechaIni,
            vInicio: nextVueltaIni,
            picInicio: nextPicIni
          });
        }
      } else {
        await this.cierresMesModel.create({
          ano: nextAno,
          mes: nextMesNombre,
          mesNum: nextMesNum,
          fechaIni: nextFechaIni,
          fechaFin: '',
          vInicio: nextVueltaIni,
          picInicio: nextPicIni,
          vFin: null,
          picFin: null,
          dias: null,
          estado: 'Abierto'
        });
      }
    } catch (err) {
      console.warn('Nota al preparar siguiente mes:', err);
    }
  },

  /**
   * Reabre un período mensual previamente cerrado
   */
  async handleReabrirMes(id, mes, ano) {
    const res = await Swal.fire({
      title: `¿Reabrir Mes de ${mes} ${ano}?`,
      text: `El período volverá a estado Abierto permitiendo modificaciones operativas y registros adicionales.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Reabrir Mes',
      cancelButtonText: 'Cancelar'
    });

    if (res.isConfirmed) {
      try {
        await this.cierresMesModel.reabrirMes(id);
        await this.loadData();
        this.render();
        this.notification.success(`El período de ${mes} ${ano} ha sido reabierto.`);
      } catch (err) {
        console.error('Error al reabrir mes:', err);
        this.notification.error('No se pudo reabrir el mes: ' + err.message);
      }
    }
  },

  /**
   * Modal SweetAlert para agregar o editar un período de mes con control estandarizado Fecha PIC
   */
  async promptEditCierreMes(cierreData = null) {
    const isNew = !cierreData;
    const title = isNew ? 'Nuevo Período de Cierre de Mes' : `Modificar Período (${cierreData.mes} ${cierreData.ano})`;

    const Format = window.App.Utils.Format;
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const currentAno = cierreData ? cierreData.ano : (new Date().getFullYear());
    const currentMes = cierreData ? cierreData.mes : 'ENERO';
    const currentEstado = cierreData ? cierreData.estado : 'Abierto';

    const defaultVpIni = (cierreData && cierreData.picInicio !== null && cierreData.picInicio !== undefined)
      ? Format.formatVueltaPic(cierreData.vInicio, cierreData.picInicio)
      : (Format ? Format.getDefaultVueltaPicPrefix() : '20-');

    const defaultVpFin = (cierreData && cierreData.picFin !== null && cierreData.picFin !== undefined)
      ? Format.formatVueltaPic(cierreData.vFin, cierreData.picFin)
      : '';

    const { value: formValues } = await Swal.fire({
      title: title,
      html: `
        <div style="text-align: left; font-size: 0.9rem; margin-top: 0.5rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.85rem;">
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.35rem; color: #334155;">Año:</label>
              <input id="swal-cm-ano" type="number" min="2020" max="2050" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; height: 42px;" value="${currentAno}">
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.35rem; color: #334155;">Mes:</label>
              <select id="swal-cm-mes" class="swal2-select" style="width: 100%; margin: 0; box-sizing: border-box; height: 42px;">
                ${meses.map(m => `<option value="${m}" ${currentMes === m ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- CONTROL FECHA PIC INICIO -->
          <div class="pic-date-control" style="margin-bottom: 0.85rem;" title="Fecha PIC de Inicio (Vuelta-PIC)">
            <label class="filter-field-label" style="display: block; font-weight: 700; margin-bottom: 0.35rem; color: #1e293b; font-size: 0.85rem;">
              FECHA PIC INICIO (VUELTA-PIC)
            </label>
            <div class="pic-input-wrapper" style="position: relative;">
              <input type="text" id="swal-cm-vueltapic-ini" class="form-control pic-input-field" placeholder="Ej: 20-122" value="${defaultVpIni}" autocomplete="off" style="width: 100%; box-sizing: border-box; height: 42px; font-weight: 700; color: #1d4ed8; font-size: 1.05rem; padding-right: 40px;" />
              <div class="btn-pic-calendar-wrapper" id="swal-cm-btn-cal-ini" title="Seleccionar fecha de inicio en calendario" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 4px; color: #475569;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <input type="date" id="swal-cm-picker-ini" class="pic-hidden-datepicker" style="position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none;" tabindex="-1" />
              </div>
            </div>
            <div class="pic-date-caption" id="swal-cm-caption-ini" style="margin-top: 0.35rem; font-size: 0.8rem; color: #0f172a; font-weight: 600; min-height: 1.2rem;"></div>
          </div>

          <!-- CONTROL FECHA PIC FIN -->
          <div class="pic-date-control" style="margin-bottom: 0.85rem;" title="Fecha PIC de Fin (Vuelta-PIC)">
            <label class="filter-field-label" style="display: block; font-weight: 700; margin-bottom: 0.35rem; color: #1e293b; font-size: 0.85rem;">
              FECHA PIC FIN (OPCIONAL SI ESTÁ EN CURSO)
            </label>
            <div class="pic-input-wrapper" style="position: relative;">
              <input type="text" id="swal-cm-vueltapic-fin" class="form-control pic-input-field" placeholder="Ej: 20-152 (Vacío si en curso)" value="${defaultVpFin}" autocomplete="off" style="width: 100%; box-sizing: border-box; height: 42px; font-weight: 700; color: #1d4ed8; font-size: 1.05rem; padding-right: 40px;" />
              <div class="btn-pic-calendar-wrapper" id="swal-cm-btn-cal-fin" title="Seleccionar fecha de fin en calendario" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 4px; color: #475569;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <input type="date" id="swal-cm-picker-fin" class="pic-hidden-datepicker" style="position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none;" tabindex="-1" />
              </div>
            </div>
            <div class="pic-date-caption" id="swal-cm-caption-fin" style="margin-top: 0.35rem; font-size: 0.8rem; color: #0f172a; font-weight: 600; min-height: 1.2rem;"></div>
          </div>

          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.35rem; color: #334155;">Estado del Mes:</label>
            <select id="swal-cm-estado" class="swal2-select" style="width: 100%; margin: 0; box-sizing: border-box; height: 42px;">
              <option value="Abierto" ${currentEstado === 'Abierto' ? 'selected' : ''}>Abierto (En Producción Activa)</option>
              <option value="Cerrado" ${currentEstado === 'Cerrado' ? 'selected' : ''}>Cerrado (Consolidado)</option>
            </select>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar Período',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      didOpen: () => {
        const inputIni = document.getElementById('swal-cm-vueltapic-ini');
        const pickerIni = document.getElementById('swal-cm-picker-ini');
        const btnCalIni = document.getElementById('swal-cm-btn-cal-ini');

        const inputFin = document.getElementById('swal-cm-vueltapic-fin');
        const pickerFin = document.getElementById('swal-cm-picker-fin');
        const btnCalFin = document.getElementById('swal-cm-btn-cal-fin');

        let updating = false;

        const syncFromDate = (dateObj, targetInput, targetPicker, targetCaptionId) => {
          if (updating || !dateObj || isNaN(dateObj.getTime())) return;
          updating = true;
          try {
            const picInfo = Format.getPicInfo(dateObj);
            targetInput.value = Format.formatVueltaPic(picInfo.vuelta, picInfo.pic);
            targetPicker.value = Format.formatDateISO(dateObj);
            Format.updateDateCaption(targetCaptionId, dateObj);
          } finally {
            updating = false;
          }
        };

        const syncFromVueltaPic = (str, targetPicker, targetCaptionId) => {
          if (updating) return;
          updating = true;
          try {
            const parsed = Format.parseVueltaPic(str);
            if (parsed.isValid && parsed.date) {
              targetPicker.value = Format.formatDateISO(parsed.date);
              Format.updateDateCaption(targetCaptionId, parsed.date);
            } else {
              targetPicker.value = '';
              Format.updateDateCaption(targetCaptionId, '');
            }
          } finally {
            updating = false;
          }
        };

        if (Format) {
          Format.setupVueltaPicInput(inputIni);
          Format.attachCalendarPicker(pickerIni, btnCalIni);
          Format.setupVueltaPicInput(inputFin);
          Format.attachCalendarPicker(pickerFin, btnCalFin);
        }

        // Inicializar captions si hay valores
        if (inputIni && inputIni.value) syncFromVueltaPic(inputIni.value, pickerIni, 'swal-cm-caption-ini');
        if (inputFin && inputFin.value) syncFromVueltaPic(inputFin.value, pickerFin, 'swal-cm-caption-fin');

        // Eventos Inicio
        if (inputIni) {
          inputIni.addEventListener('input', () => syncFromVueltaPic(inputIni.value, pickerIni, 'swal-cm-caption-ini'));
          inputIni.addEventListener('change', () => syncFromVueltaPic(inputIni.value, pickerIni, 'swal-cm-caption-ini'));
        }
        if (pickerIni) {
          pickerIni.addEventListener('change', (e) => {
            if (!e.target.value) return;
            const [y, m, d] = e.target.value.split('-').map(Number);
            syncFromDate(new Date(y, m - 1, d, 12, 0, 0), inputIni, pickerIni, 'swal-cm-caption-ini');
          });
        }

        // Eventos Fin
        if (inputFin) {
          inputFin.addEventListener('input', () => syncFromVueltaPic(inputFin.value, pickerFin, 'swal-cm-caption-fin'));
          inputFin.addEventListener('change', () => syncFromVueltaPic(inputFin.value, pickerFin, 'swal-cm-caption-fin'));
        }
        if (pickerFin) {
          pickerFin.addEventListener('change', (e) => {
            if (!e.target.value) return;
            const [y, m, d] = e.target.value.split('-').map(Number);
            syncFromDate(new Date(y, m - 1, d, 12, 0, 0), inputFin, pickerFin, 'swal-cm-caption-fin');
          });
        }
      },
      preConfirm: () => {
        const ano = Number(document.getElementById('swal-cm-ano').value);
        const mes = document.getElementById('swal-cm-mes').value;
        const vpIniVal = document.getElementById('swal-cm-vueltapic-ini').value.trim();
        const vpFinVal = document.getElementById('swal-cm-vueltapic-fin').value.trim();
        const estado = document.getElementById('swal-cm-estado').value;

        if (!ano || isNaN(ano) || ano < 2000) {
          Swal.showValidationMessage('Ingresa un año válido.');
          return false;
        }

        const parsedIni = Format ? Format.parseVueltaPic(vpIniVal) : null;
        if (!parsedIni || !parsedIni.isValid || !parsedIni.date) {
          Swal.showValidationMessage('La Fecha PIC de inicio es obligatoria y debe tener formato válido (ej. 20-122).');
          return false;
        }

        let parsedFin = null;
        if (vpFinVal) {
          parsedFin = Format ? Format.parseVueltaPic(vpFinVal) : null;
          if (!parsedFin || !parsedFin.isValid || !parsedFin.date) {
            Swal.showValidationMessage('La Fecha PIC de fin tiene un formato inválido (ej. 20-152).');
            return false;
          }
        }

        if (estado === 'Cerrado' && (!parsedFin || !parsedFin.date)) {
          Swal.showValidationMessage('Para guardar un mes como Cerrado, debes indicar la Fecha PIC de fin.');
          return false;
        }

        const formatDMY = (date) => {
          const d = String(date.getDate()).padStart(2, '0');
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const y = date.getFullYear();
          return `${d}/${m}/${y}`;
        };

        const fechaIniStr = formatDMY(parsedIni.date);
        const fechaFinStr = parsedFin && parsedFin.date ? formatDMY(parsedFin.date) : '';

        const mesesList = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
        const mesNum = mesesList.indexOf(mes) + 1;

        return {
          ano,
          mes,
          mesNum: mesNum > 0 ? mesNum : 1,
          fechaIni: fechaIniStr,
          fechaFin: fechaFinStr,
          vInicio: parsedIni.vuelta,
          picInicio: parsedIni.pic,
          vFin: parsedFin ? parsedFin.vuelta : null,
          picFin: parsedFin ? parsedFin.pic : null,
          dias: (fechaIniStr && fechaFinStr) ? this._calculateDias(fechaIniStr, fechaFinStr) : null,
          estado
        };
      }
    });

    if (formValues) {
      try {
        if (isNew) {
          await this.cierresMesModel.create(formValues);
          this.notification.success(`Período ${formValues.mes} ${formValues.ano} creado exitosamente.`);
        } else {
          await this.cierresMesModel.update(cierreData.id, formValues);
          this.notification.success(`Período ${formValues.mes} ${formValues.ano} actualizado.`);
        }
        await this.loadData();
        this.render();
      } catch (err) {
        console.error('Error guardando período de mes:', err);
        this.notification.error('No se pudo guardar el período: ' + err.message);
      }
    }
  },

  /**
   * Calcula los días transcurridos entre dos fechas en formato DD/MM/AAAA
   */
  _calculateDias(fIni, fFin) {
    if (!fIni || !fFin) return null;
    try {
      const parseDMY = (str) => {
        const parts = str.trim().replace(/-/g, '/').split('/');
        if (parts.length === 3) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
        return new Date(str);
      };
      const d1 = parseDMY(fIni);
      const d2 = parseDMY(fFin);
      if (!d1 || !d2 || isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
      const diffTime = Math.abs(d2 - d1);
      return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } catch {
      return 30;
    }
  },

  /**
   * Elimina un período mensual
   */
  async handleDeleteCierreMes(id, mes, ano) {
    const res = await Swal.fire({
      title: `¿Eliminar período de ${mes} ${ano}?`,
      text: 'Esta acción eliminará el registro de corte de mes en la base de datos IndexedDB.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (res.isConfirmed) {
      try {
        await this.cierresMesModel.delete(id);
        await this.loadData();
        this.render();
        this.notification.success(`Período de ${mes} ${ano} eliminado correctamente.`);
      } catch (err) {
        console.error('Error eliminando período de mes:', err);
        this.notification.error('Error al eliminar: ' + err.message);
      }
    }
  },

  /**
   * Restablece los 35 períodos predeterminados de cierres de mes desde el seed
   */
  async handleRestoreCierresMes() {
    const res = await Swal.fire({
      title: '¿Restaurar Períodos Originales?',
      html: `Esta acción restablecerá los <b>35 períodos oficiales de cierres de mes</b> (2024, 2025 y 2026) con sus rangos de fechas y correlativos PIC en IndexedDB.<br><br>¿Deseas continuar?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Restaurar Períodos',
      cancelButtonText: 'Cancelar'
    });

    if (res.isConfirmed) {
      try {
        await this.cierresMesModel.restoreDefaults();
        await this.loadData();
        this.render();
        this.notification.success('Cierres de mes restablecidos con éxito a sus 35 períodos originales en IndexedDB.');
      } catch (err) {
        console.error('Error al restaurar cierres de mes:', err);
        this.notification.error('Error al restaurar cierres de mes: ' + err.message);
      }
    }
  },

  // =========================================================
  // MÉTODOS DE PESOS POR EDAD
  // =========================================================

  /**
   * Modal SweetAlert para editar o agregar peso
   */
  async promptEditPeso(edad = null, currentPeso = null) {
    const isNew = edad === null;
    const title = isNew ? 'Registrar / Modificar Peso por Edad' : `Modificar Peso para Día ${edad}`;

    const { value: formValues } = await Swal.fire({
      title: title,
      html: `
        <div style="text-align: left; font-size: 0.95rem; margin-top: 0.5rem;">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-weight: 600; margin-bottom: 0.35rem; color: #334155;">Día de Edad (1 a 60 días):</label>
            <input id="swal-peso-edad" type="number" min="1" max="100" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box;" value="${edad || ''}" ${!isNew ? 'readonly' : ''} placeholder="Ej. 15">
          </div>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.35rem; color: #334155;">Peso Estándar (kg):</label>
            <input id="swal-peso-val" type="number" step="0.01" min="0.1" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box;" value="${currentPeso !== null ? currentPeso : ''}" placeholder="Ej. 4.54">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar Peso',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      preConfirm: () => {
        const edadVal = document.getElementById('swal-peso-edad').value;
        const pesoVal = document.getElementById('swal-peso-val').value;

        if (!edadVal || Number(edadVal) < 1) {
          Swal.showValidationMessage('Ingresa un día de edad válido (mínimo día 1).');
          return false;
        }
        if (!pesoVal || Number(pesoVal) <= 0) {
          Swal.showValidationMessage('Ingresa un peso válido mayor a 0 kg.');
          return false;
        }

        return {
          edad: Number(edadVal),
          peso: parseFloat(Number(pesoVal).toFixed(2))
        };
      }
    });

    if (formValues) {
      try {
        await this.pesosModel.update(formValues.edad, { peso: formValues.peso });
        await this.loadData();
        this.render();
        this.notification.success(`Peso para el Día ${formValues.edad} actualizado correctamente a ${formValues.peso.toFixed(2).replace('.', ',')} kg.`);
      } catch (err) {
        console.error('Error guardando peso:', err);
        this.notification.error('No se pudo guardar el peso: ' + err.message);
      }
    }
  },

  /**
   * Restablece la tabla de pesos a los 40 valores estándar del seed
   */
  async handleRestorePesos() {
    const res = await Swal.fire({
      title: '¿Restaurar Pesos Originales?',
      html: `Esta acción reemplazará la tabla actual con los <b>40 pesos estándar predeterminados</b> (desde 1.50 kg a día 1 hasta 13.10 kg a día 40).<br><br>¿Deseas continuar?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Restaurar Pesos',
      cancelButtonText: 'Cancelar'
    });

    if (res.isConfirmed) {
      try {
        await this.pesosModel.clearAll();
        await this.pesosModel.bulkCreate(window.App.Data.pesosEdadSeed);
        await this.loadData();
        this.render();
        this.notification.success('Tabla de pesos restablecida con éxito a sus 40 valores predeterminados.');
      } catch (err) {
        console.error('Error al restaurar pesos:', err);
        this.notification.error('Error al restaurar pesos: ' + err.message);
      }
    }
  },

  // =========================================================
  // MÉTODOS DE SALAS Y ÁREAS
  // =========================================================

  /**
   * Modal SweetAlert para editar o registrar sala/ubicación
   */
  async promptEditSala(salaData = null) {
    const isNew = !salaData;
    const title = isNew ? 'Nueva Sala / Ubicación' : `Modificar Ubicación (${salaData.mat}${salaData.sala ? ' - Sala ' + salaData.sala : ''})`;

    const currentId = salaData ? salaData.id : null;
    const currentSala = salaData && salaData.sala ? salaData.sala : '';
    const currentMat = salaData ? salaData.mat : 'M1';
    const currentArea = salaData ? salaData.area : 'EST';
    const currentSigla = salaData ? salaData.sigla : 'E';

    const { value: formValues } = await Swal.fire({
      title: title,
      html: `
        <div style="text-align: left; font-size: 0.95rem; margin-top: 0.5rem;">
          <div style="margin-bottom: 0.75rem;">
            <label style="display: block; font-weight: 600; margin-bottom: 0.35rem; color: #334155;">Número de Sala (Opcional si es Gestación):</label>
            <input id="swal-sala-num" type="number" min="1" max="99" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box;" value="${currentSala}" placeholder="Ej. 15 (Dejar vacío para naves generales)">
          </div>

          <div style="margin-bottom: 0.75rem;">
            <label style="display: block; font-weight: 600; margin-bottom: 0.35rem; color: #334155;">Maternidad / Gestación:</label>
            <input id="swal-sala-mat" type="text" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; text-transform: uppercase;" value="${currentMat}" placeholder="Ej. M1, M2, G1, G6...">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.35rem; color: #334155;">Área Operativa:</label>
              <select id="swal-sala-area" class="swal2-select" style="width: 100%; margin: 0; box-sizing: border-box; height: 44px;">
                <option value="EST" ${currentArea === 'EST' ? 'selected' : ''}>EST (Estándar)</option>
                <option value="EXP" ${currentArea === 'EXP' ? 'selected' : ''}>EXP (Expansión)</option>
              </select>
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.35rem; color: #334155;">Sigla de Granja:</label>
              <select id="swal-sala-sigla" class="swal2-select" style="width: 100%; margin: 0; box-sizing: border-box; height: 44px;">
                <option value="E" ${currentSigla === 'E' ? 'selected' : ''}>E (Estándar)</option>
                <option value="X" ${currentSigla === 'X' ? 'selected' : ''}>X (Expansión)</option>
              </select>
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar Ubicación',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      preConfirm: () => {
        const salaNum = document.getElementById('swal-sala-num').value.trim();
        const matVal = document.getElementById('swal-sala-mat').value.trim().toUpperCase();
        const areaVal = document.getElementById('swal-sala-area').value;
        const siglaVal = document.getElementById('swal-sala-sigla').value;

        if (!matVal) {
          Swal.showValidationMessage('La denominación de Maternidad/Gestación es obligatoria.');
          return false;
        }

        return {
          sala: salaNum !== '' ? Number(salaNum) : null,
          mat: matVal,
          area: areaVal,
          sigla: siglaVal
        };
      }
    });

    if (formValues) {
      try {
        if (isNew) {
          await this.salasModel.create(formValues);
          this.notification.success(`Ubicación ${formValues.mat} registrada exitosamente.`);
        } else {
          await this.salasModel.update(currentId, formValues);
          this.notification.success(`Ubicación actualizada correctamente.`);
        }
        await this.loadData();
        this.render();
      } catch (err) {
        console.error('Error guardando sala:', err);
        this.notification.error('No se pudo guardar la ubicación: ' + err.message);
      }
    }
  },

  /**
   * Restablece las 52 salas y áreas predeterminadas desde el seed
   */
  async handleRestoreSalas() {
    const res = await Swal.fire({
      title: '¿Restaurar Salas Originales?',
      html: `Esta acción restablecerá las <b>52 ubicaciones físicas</b> (Salas 1 a 41 de M1-M5 y Gestaciones G1-G11 con sus áreas EST/EXP y siglas E/X).<br><br>¿Deseas continuar?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Restaurar Salas',
      cancelButtonText: 'Cancelar'
    });

    if (res.isConfirmed) {
      try {
        await this.salasModel.clearAll();
        await this.salasModel.bulkCreate(window.App.Data.salasMaternidadesSeed);
        await this.loadData();
        this.render();
        this.notification.success('Estructura de salas y áreas restablecida con éxito a sus 52 registros originales.');
      } catch (err) {
        console.error('Error al restaurar salas:', err);
        this.notification.error('Error al restaurar salas: ' + err.message);
      }
    }
  },

  /**
   * Exporta toda la base IndexedDB en un archivo .json de respaldo
   */
  async handleExportBackup() {
    try {
      const db = window.App.Models.Database;
      if (!db || typeof db.exportAllData !== 'function') {
        throw new Error('El motor de respaldo no está disponible.');
      }
      const snapshot = await db.exportAllData();
      const jsonStr = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `respaldo-granja-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.notification.success(`Respaldo descargado con ${snapshot.totalRecords.toLocaleString('es-ES')} registros totales.`);
    } catch (err) {
      console.error('Error exportando respaldo:', err);
      this.notification.error('Error al generar el respaldo JSON: ' + err.message);
    }
  },

  /**
   * Restaura una instantánea .json hacia todos los almacenes IndexedDB
   */
  async handleImportBackupFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const confirm = await Swal.fire({
        title: '¿Restaurar Base de Datos?',
        html: `El archivo <b>${file.name}</b> contiene <b>${payload.totalRecords || 0}</b> registros.<br>Se reemplazarán los datos locales actuales en IndexedDB.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, Restaurar Todo',
        cancelButtonText: 'Cancelar'
      });

      if (!confirm.isConfirmed) return;

      const summary = await window.App.Models.Database.importAllData(payload);
      const total = Object.values(summary).reduce((acc, n) => acc + n, 0);
      await this.loadData();
      this.render();
      this.notification.success(`Base de datos restaurada con éxito (${total.toLocaleString('es-ES')} registros).`);
    } catch (err) {
      console.error('Error restaurando respaldo:', err);
      this.notification.error('No se pudo restaurar el respaldo: ' + err.message);
    }
  }
};
