/**
 * MaternidadModel: Capa de datos para el módulo Maternidad.
 * Administra los registros de la hoja MATERNIDAD separados por sus dos áreas operativas:
 * - Área Establecida (EST: Salas 1 a 24)
 * - Área Expansión (EXP: Salas 25 a 41)
 * Persistido 100% en IndexedDB (almacén: 'maternidad') a través de StorageAdapter.
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};

window.App.Models.Maternidad = {
  resource: 'maternidad',
  storage: window.App.Models.StorageAdapter,
  _cachedData: null,

  /**
   * Invalida caché en memoria
   */
  invalidateCache() {
    this._cachedData = null;
  },

  /**
   * Obtiene todos los registros ordenados por área y orden operativo
   */
  async getAll(forceRefresh = false) {
    if (this._cachedData && !forceRefresh) {
      return this._cachedData;
    }
    const data = await this.storage.getAll(this.resource);
    this._cachedData = Array.isArray(data) ? data : [];
    return this._cachedData;
  },

  /**
   * Inserción masiva (ej. importación desde Excel o sembrado)
   */
  async bulkCreate(records) {
    this.invalidateCache();
    return await this.storage.bulkCreate(this.resource, records);
  },

  /**
   * Limpia todo el almacén
   */
  async clearAll() {
    this.invalidateCache();
    return await this.storage.clearAll(this.resource);
  },

  /**
   * Crea un nuevo registro
   */
  async create(record) {
    const all = await this.getAll(true);
    const maxId = all.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0);
    const area = record.area || ((Number(record.sala) >= 25 && Number(record.sala) <= 41) ? 'EXP' : 'EST');
    const areaRows = all.filter(r => r.area === area);
    const maxOrden = areaRows.reduce((max, r) => Math.max(max, Number(r.orden) || 0), 0);

    const isPre = String(record.lotePic || '').toUpperCase() === 'PRE' ||
                  String(record.picCierre || '').toUpperCase() === 'PRE' ||
                  record.picCierre === '' || record.picCierre === null || record.picCierre === undefined;

    const newRecord = {
      id: record.id || (maxId + 1),
      area,
      orden: record.orden || (maxOrden + 1),
      nro: record.nro !== undefined && record.nro !== null && record.nro !== '' ? record.nro : '-',
      picInicio: record.picInicio !== '' && record.picInicio !== null && !isNaN(Number(record.picInicio)) ? Number(record.picInicio) : record.picInicio,
      picCierre: record.picCierre !== '' && record.picCierre !== null && record.picCierre !== undefined
        ? (!isNaN(Number(record.picCierre)) ? Number(record.picCierre) : String(record.picCierre).trim().toUpperCase())
        : '',
      sala: Number(record.sala) || 0,
      vlote: record.vlote !== '' && record.vlote !== null && record.vlote !== undefined && !isNaN(Number(record.vlote)) ? Number(record.vlote) : null,
      lotePic: record.lotePic !== '' && record.lotePic !== null && record.lotePic !== undefined
        ? (!isNaN(Number(record.lotePic)) ? Number(record.lotePic) : String(record.lotePic).trim().toUpperCase())
        : 'PRE',
      partos: Number(record.partos) || 0,
      lnv: Number(record.lnv) || 0,
      lnm: Number(record.lnm) || 0,
      lnMo: Number(record.lnMo) || 0,
      mpdAlCierre: Number(record.mpdAlCierre) || 0,
      pesoX: record.pesoX !== '' && record.pesoX !== null && record.pesoX !== undefined && !isNaN(Number(record.pesoX))
        ? Number(parseFloat(String(record.pesoX).replace(',', '.')).toFixed(2))
        : null,
      estado: isPre ? 'Pre-Parto' : 'Cerrada'
    };

    const res = await this.storage.create(this.resource, newRecord);
    this.invalidateCache();
    return res;
  },

  /**
   * Actualiza un registro existente
   */
  async update(id, data) {
    const existing = await this.storage.getById(this.resource, Number(id));
    if (!existing) throw new Error('Registro de maternidad no encontrado.');

    const isPre = String(data.lotePic || '').toUpperCase() === 'PRE' ||
                  String(data.picCierre || '').toUpperCase() === 'PRE' ||
                  data.picCierre === '' || data.picCierre === null || data.picCierre === undefined;

    const updated = {
      ...existing,
      ...data,
      id: existing.id,
      area: data.area || ((Number(data.sala || existing.sala) >= 25 && Number(data.sala || existing.sala) <= 41) ? 'EXP' : 'EST'),
      sala: Number(data.sala !== undefined ? data.sala : existing.sala) || 0,
      partos: Number(data.partos !== undefined ? data.partos : existing.partos) || 0,
      lnv: Number(data.lnv !== undefined ? data.lnv : existing.lnv) || 0,
      lnm: Number(data.lnm !== undefined ? data.lnm : existing.lnm) || 0,
      lnMo: Number(data.lnMo !== undefined ? data.lnMo : existing.lnMo) || 0,
      mpdAlCierre: Number(data.mpdAlCierre !== undefined ? data.mpdAlCierre : existing.mpdAlCierre) || 0,
      pesoX: data.pesoX !== '' && data.pesoX !== null && data.pesoX !== undefined && !isNaN(Number(String(data.pesoX).replace(',', '.')))
        ? Number(parseFloat(String(data.pesoX).replace(',', '.')).toFixed(2))
        : null,
      estado: isPre ? 'Pre-Parto' : 'Cerrada'
    };

    const res = await this.storage.update(this.resource, existing.id, updated);
    this.invalidateCache();
    return res;
  },

  /**
   * Elimina un registro por ID
   */
  async delete(id) {
    const res = await this.storage.delete(this.resource, Number(id));
    this.invalidateCache();
    return res;
  },

  /**
   * Obtiene los registros del módulo MPD (con respaldo a mpdSeed si aún no se cargó)
   */
  async _getMpdSourceData() {
    let mpdData = [];
    if (window.App && window.App.Models && window.App.Models.Mpd) {
      mpdData = await window.App.Models.Mpd.getAll();
    }
    if ((!mpdData || mpdData.length === 0) && window.App && window.App.Data && Array.isArray(window.App.Data.mpdSeed)) {
      mpdData = window.App.Data.mpdSeed;
    }
    return Array.isArray(mpdData) ? mpdData : [];
  },

  /**
   * Obtiene los registros del módulo Destetes (con respaldo a destetesSeed si aún no se cargó)
   */
  async _getDestetesSourceData() {
    let destetesData = [];
    if (window.App && window.App.Models && window.App.Models.Destetes) {
      destetesData = await window.App.Models.Destetes.getAll();
    }
    if ((!destetesData || destetesData.length === 0) && window.App && window.App.Data && Array.isArray(window.App.Data.destetesSeed)) {
      destetesData = window.App.Data.destetesSeed;
    }
    return Array.isArray(destetesData) ? destetesData : [];
  },

  /**
   * Obtiene los registros de Cierres de Mes (con respaldo a cierresMesSeed)
   */
  async _getCierresMesSourceData() {
    let data = [];
    if (window.App && window.App.Models && window.App.Models.CierresMes) {
      data = await window.App.Models.CierresMes.getAll();
    }
    if ((!data || data.length === 0) && window.App && window.App.Data && Array.isArray(window.App.Data.cierresMesSeed)) {
      data = window.App.Data.cierresMesSeed;
    }
    return Array.isArray(data) ? data : [];
  },

  /**
   * Resuelve el límite cronológico del mes cerrado anterior vs mes en curso abierto
   * desde Cierres de Mes (ej: Octubre cerró 20-121, Noviembre inicia 20-122).
   */
  _resolveMonthBoundary(cierresMesData = [], fallbackVuelta = 20) {
    if (!Array.isArray(cierresMesData) || cierresMesData.length === 0) {
      const openAbs = fallbackVuelta * 1000 + 122;
      return {
        openMonthName: 'ACTUAL',
        openMonthStartAbs: openAbs,
        openMonthStartLabel: `${fallbackVuelta}-122`,
        prevClosedEndAbs: openAbs - 1,
        prevClosedEndLabel: `${fallbackVuelta}-121`
      };
    }

    const sorted = [...cierresMesData].sort((a, b) => {
      const ya = Number(a.ano) || 0;
      const yb = Number(b.ano) || 0;
      if (yb !== ya) return yb - ya;
      return (Number(b.mesNum) || 0) - (Number(a.mesNum) || 0);
    });

    const openMonth = sorted.find(r => r.estado === 'Abierto' && r.picInicio !== null && r.picInicio !== undefined);
    const lastClosed = sorted.find(r => r.estado === 'Cerrado' && r.picFin !== null && r.picFin !== undefined);

    let openStartAbs;
    let openLabel = '';
    let openName = '';
    if (openMonth) {
      const ov = Number(openMonth.vInicio) || fallbackVuelta;
      const op = Number(openMonth.picInicio) || 0;
      openStartAbs = ov * 1000 + op;
      openLabel = `${ov}-${op}`;
      openName = `${openMonth.mes} ${openMonth.ano}`;
    } else if (lastClosed) {
      const cv = Number(lastClosed.vFin) || fallbackVuelta;
      const cp = Number(lastClosed.picFin) || 0;
      openStartAbs = (cv * 1000 + cp) + 1;
      openLabel = `${Math.floor(openStartAbs / 1000)}-${openStartAbs % 1000}`;
      openName = 'NUEVO PERÍODO';
    } else {
      openStartAbs = fallbackVuelta * 1000;
      openLabel = `${fallbackVuelta}-0`;
      openName = 'ACTUAL';
    }

    let prevClosedEndAbs;
    let prevLabel = '';
    if (lastClosed) {
      const cv = Number(lastClosed.vFin) || fallbackVuelta;
      const cp = Number(lastClosed.picFin) || 0;
      prevClosedEndAbs = cv * 1000 + cp;
      prevLabel = `${cv}-${cp}`;
    } else {
      prevClosedEndAbs = openStartAbs - 1;
      prevLabel = `${Math.floor(prevClosedEndAbs / 1000)}-${prevClosedEndAbs % 1000}`;
    }

    return {
      openMonthName: openName,
      openMonthStartAbs: openStartAbs,
      openMonthStartLabel: openLabel,
      prevClosedEndAbs,
      prevClosedEndLabel: prevLabel
    };
  },

  /**
   * Congela el snapshot PRE de salas abiertas al cerrar un mes en Configuración
   */
  async onMonthClosed(closedMonthRecord) {
    if (!closedMonthRecord || closedMonthRecord.picFin === null || closedMonthRecord.picFin === undefined) return 0;
    const all = await this.getAll(true);
    const mpdData = await this._getMpdSourceData();
    const closeV = Number(closedMonthRecord.vFin) || 20;
    const closeP = Number(closedMonthRecord.picFin) || 0;
    const closeAbs = closeV * 1000 + closeP;

    let updatedCount = 0;
    for (let i = 0; i < all.length; i++) {
      const r = all[i];
      const isOpenPre = (r.picCierre === '' || r.picCierre === null || r.picCierre === undefined) &&
                        String(r.lotePic).toUpperCase() === 'PRE';
      if (!isOpenPre) continue;

      const rv = (r.vlote !== null && r.vlote !== undefined && r.vlote !== '') ? Number(r.vlote) : closeV;
      const startAbs = rv * 1000 + (Number(r.picInicio) || 0);
      if (startAbs > closeAbs) continue;

      const mpdUntilClose = mpdData
        .filter(m => Number(m.sala) === Number(r.sala) && ((Number(m.vuelta) * 1000 + Number(m.pic)) >= startAbs) && ((Number(m.vuelta) * 1000 + Number(m.pic)) <= closeAbs))
        .reduce((sum, m) => sum + (Number(m.cantidad) || 0), 0);

      await this.storage.update(this.resource, r.id, {
        ...r,
        picCierre: 'PRE',
        lotePic: 'PRE',
        vlote: rv,
        mpdAlCierre: mpdUntilClose,
        estado: 'Pre-Parto'
      });
      updatedCount++;
    }

    this.invalidateCache();
    return updatedCount;
  },

  /**
   * Construye el índice de claves destetadas (vlote-lotePic-sala) desde Destetes
   */
  _buildDestetesSet(destetesData) {
    const set = new Set();
    for (let i = 0; i < destetesData.length; i++) {
      const d = destetesData[i];
      const vlote = Number(d.vlote);
      const lotePic = Number(d.lotePic);
      const sala = Number(d.sala);
      if (!isNaN(vlote) && !isNaN(lotePic) && !isNaN(sala) && sala > 0) {
        set.add(`${vlote}-${lotePic}-${sala}`);
      }
    }
    return set;
  },

  /**
   * Resuelve el día Vuelta-PIC de referencia para Mortalidad del Día y tope acumulado
   */
  _resolveMpdRefDay(mpdData, mpdDayRef = '') {
    const Format = window.App && window.App.Utils ? window.App.Utils.Format : null;
    const todayInfo = (Format && Format.getPicInfo) ? Format.getPicInfo(new Date()) : { vuelta: 20, pic: 131 };

    let maxAbs = -1;
    let maxVuelta = todayInfo.vuelta;
    let maxPic = todayInfo.pic;
    let hasTodayInMpd = false;

    const daysMap = new Map();
    for (let i = 0; i < mpdData.length; i++) {
      const m = mpdData[i];
      const v = Number(m.vuelta);
      const p = Number(m.pic);
      if (isNaN(v) || isNaN(p)) continue;
      const abs = v * 1000 + p;
      if (abs > maxAbs) {
        maxAbs = abs;
        maxVuelta = v;
        maxPic = p;
      }
      if (v === todayInfo.vuelta && p === todayInfo.pic) {
        hasTodayInMpd = true;
      }
      if (!daysMap.has(abs)) {
        daysMap.set(abs, { abs, vuelta: v, pic: p, label: `${v}-${p}` });
      }
    }

    const availableDays = Array.from(daysMap.values()).sort((a, b) => b.abs - a.abs);

    // Si el usuario eligió un día específico (ej: "20-128")
    if (mpdDayRef && String(mpdDayRef).trim() !== '') {
      const clean = String(mpdDayRef).trim();
      const parts = clean.split('-');
      if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
        const rv = Number(parts[0]);
        const rp = Number(parts[1]);
        return {
          vuelta: rv,
          pic: rp,
          absPic: rv * 1000 + rp,
          label: `${rv}-${rp}`,
          latestLabel: maxAbs >= 0 ? `${maxVuelta}-${maxPic}` : `${todayInfo.vuelta}-${todayInfo.pic}`,
          isAuto: false,
          availableDays
        };
      }
    }

    // Automático: usar hoy si existen registros en MPD para hoy; si no, usar el último día disponible en MPD
    const refV = hasTodayInMpd ? todayInfo.vuelta : maxVuelta;
    const refP = hasTodayInMpd ? todayInfo.pic : maxPic;

    return {
      vuelta: refV,
      pic: refP,
      absPic: refV * 1000 + refP,
      label: `${refV}-${refP}`,
      latestLabel: maxAbs >= 0 ? `${maxVuelta}-${maxPic}` : `${todayInfo.vuelta}-${todayInfo.pic}`,
      isAuto: true,
      availableDays
    };
  },

  /**
   * Enriquece cada fila de Maternidad con mortAcum (meses cerrados anteriores),
   * mortActual (mes en curso abierto), mortTotal, mortDia, pctMpd y estatus (Dttada / Activas)
   * cruzando MPD, Cierres de Mes y Destetes.
   */
  _enrichWithMpdMortality(rows, mpdData, mpdDayRef = '', destetesData = [], cierresMesData = []) {
    const ref = this._resolveMpdRefDay(mpdData, mpdDayRef);
    const destetesSet = this._buildDestetesSet(destetesData);
    const monthBoundary = this._resolveMonthBoundary(cierresMesData, ref.vuelta);

    // 1. Indexar mortalidad por Sala -> lista compacta de { absPic, cantidad }
    const mpdBySala = new Map();
    for (let i = 0; i < mpdData.length; i++) {
      const m = mpdData[i];
      const s = Number(m.sala);
      const v = Number(m.vuelta);
      const p = Number(m.pic);
      if (!s || isNaN(v) || isNaN(p)) continue;
      if (!mpdBySala.has(s)) mpdBySala.set(s, []);
      mpdBySala.get(s).push({
        absPic: v * 1000 + p,
        cantidad: Number(m.cantidad) || 0
      });
    }

    // 2. Resolver startAbsPic de cada fila, detectar ciclos posteriores y pares PRE divididos (Salas 33 y 34)
    const startsBySala = new Map();
    const rowStartAbs = new Array(rows.length);
    const cycleGroupFlags = new Map(); // `${sala}-${startAbs}` -> { hasPreSnapshot, hasContinuation }

    const isPreSnapshotRow = (row) => {
      const pc = String(row.picCierre || '').trim().toUpperCase();
      const lp = String(row.lotePic || '').trim().toUpperCase();
      return pc === 'PRE' || (String(row.nro).trim() === '-' && lp === 'PRE');
    };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const sala = Number(r.sala) || 0;
      const picInicio = Number(r.picInicio) || 0;
      let rowVuelta = (r.vlote !== null && r.vlote !== undefined && r.vlote !== '' && !isNaN(Number(r.vlote)))
        ? Number(r.vlote)
        : ref.vuelta;

      if ((r.vlote === null || r.vlote === undefined || r.vlote === '') && picInicio > ref.pic + 200 && rowVuelta > 1) {
        rowVuelta -= 1;
      }

      const startAbs = rowVuelta * 1000 + picInicio;
      rowStartAbs[i] = startAbs;

      if (sala > 0) {
        if (!startsBySala.has(sala)) startsBySala.set(sala, []);
        const arr = startsBySala.get(sala);
        if (!arr.includes(startAbs)) arr.push(startAbs);

        const cKey = `${sala}-${startAbs}`;
        if (!cycleGroupFlags.has(cKey)) {
          cycleGroupFlags.set(cKey, { hasPreSnapshot: false, hasContinuation: false });
        }
        const flags = cycleGroupFlags.get(cKey);
        if (isPreSnapshotRow(r)) {
          flags.hasPreSnapshot = true;
        } else {
          flags.hasContinuation = true;
        }
      }
    }

    startsBySala.forEach(arr => arr.sort((a, b) => a - b));

    // 3. Calcular mortAcum (meses anteriores), mortActual (mes en curso), mortTotal, mortDia y pctMpd por fila
    const enriched = rows.map((r, idx) => {
      const sala = Number(r.sala) || 0;
      const startAbs = rowStartAbs[idx];
      const starts = startsBySala.get(sala) || [];
      const nextStartAbs = starts.find(s => s > startAbs) || null;
      const endCap = nextStartAbs ? Math.min(ref.absPic, nextStartAbs - 1) : ref.absPic;

      const entries = mpdBySala.get(sala) || [];
      const cycleKey = `${sala}-${startAbs}`;
      const flags = cycleGroupFlags.get(cycleKey) || { hasPreSnapshot: false, hasContinuation: false };
      const isSplitPair = flags.hasPreSnapshot && flags.hasContinuation;
      const rowIsPreSnap = isSplitPair && isPreSnapshotRow(r);
      const rowIsContinuation = isSplitPair && !rowIsPreSnap;

      let fullPrev = 0;   // startAbs .. min(prevClosedEndAbs, endCap)
      let fullActual = 0; // max(startAbs, openMonthStartAbs) .. endCap
      let dayCount = 0;

      const prevUpper = Math.min(monthBoundary.prevClosedEndAbs, endCap);
      const currLower = Math.max(startAbs, monthBoundary.openMonthStartAbs);

      for (let j = 0; j < entries.length; j++) {
        const e = entries[j];
        if (startAbs <= prevUpper && e.absPic >= startAbs && e.absPic <= prevUpper) {
          fullPrev += e.cantidad;
        }
        if (currLower <= endCap && e.absPic >= currLower && e.absPic <= endCap) {
          fullActual += e.cantidad;
        }
        if (ref.absPic >= startAbs && (!nextStartAbs || ref.absPic < nextStartAbs) && e.absPic === ref.absPic) {
          dayCount += e.cantidad;
        }
      }

      let mortAcum = fullPrev;
      let mortActual = fullActual;
      let mortDia = dayCount;

      if (rowIsPreSnap) {
        // Fila de cierre PRE del mes anterior: conserva solo lo acumulado hasta cierre de mes
        mortAcum = fullPrev;
        mortActual = 0;
        mortDia = ref.absPic <= monthBoundary.prevClosedEndAbs ? dayCount : 0;
      } else if (rowIsContinuation) {
        // Fila de continuación del mes nuevo: conserva solo lo del mes en curso (evita doble conteo)
        mortAcum = 0;
        mortActual = fullActual;
        mortDia = ref.absPic >= monthBoundary.openMonthStartAbs ? dayCount : 0;
      }

      const mortTotal = mortAcum + mortActual;
      const lnvNum = Number(r.lnv) || 0;
      const pctMpd = lnvNum > 0 ? (mortTotal / lnvNum) * 100 : 0;

      let estatus = 'Activas';
      if (
        r.vlote !== null && r.vlote !== undefined && r.vlote !== '' &&
        r.lotePic !== null && r.lotePic !== undefined && String(r.lotePic).toUpperCase() !== 'PRE' &&
        !isNaN(Number(r.vlote)) && !isNaN(Number(r.lotePic)) && sala > 0
      ) {
        const key = `${Number(r.vlote)}-${Number(r.lotePic)}-${sala}`;
        if (destetesSet.has(key)) {
          estatus = 'Dttada';
        }
      }

      return {
        ...r,
        mortAcum,
        mortActual,
        mortTotal,
        mortDia,
        pctMpd,
        estatus,
        isSplitPre: rowIsPreSnap,
        isSplitCont: rowIsContinuation,
        _cycleKey: cycleKey,
        mpdRefLabel: ref.label
      };
    });

    return { enriched, ref, monthBoundary };
  },

  /**
   * Opciones para selects de filtro (separando salas de EST y EXP para toolbars independientes)
   */
  async getFilterOptions() {
    const [all, mpdData, cierresMesData] = await Promise.all([
      this.getAll(),
      this._getMpdSourceData(),
      this._getCierresMesSourceData()
    ]);
    const salasSet = new Set();
    const estSalasSet = new Set();
    const expSalasSet = new Set();
    all.forEach(r => {
      const s = Number(r.sala);
      if (!s) return;
      salasSet.add(s);
      if (r.area === 'EXP') {
        expSalasSet.add(s);
      } else {
        estSalasSet.add(s);
      }
    });
    const ref = this._resolveMpdRefDay(mpdData, '');
    const monthBoundary = this._resolveMonthBoundary(cierresMesData, ref.vuelta);
    return {
      salas: Array.from(salasSet).sort((a, b) => a - b),
      estSalas: Array.from(estSalasSet).sort((a, b) => a - b),
      expSalas: Array.from(expSalasSet).sort((a, b) => a - b),
      mpdDays: ref.availableDays.slice(0, 45),
      latestMpdLabel: ref.latestLabel,
      activeMpdLabel: ref.label,
      monthBoundary
    };
  },

  /**
   * Calcula los KPIs / totales para un conjunto de filas
   */
  _computeSummary(rows) {
    let partos = 0;
    let lnv = 0;
    let lnm = 0;
    let lnMo = 0;
    let mpdAlCierre = 0;
    let mortAcum = 0;
    let mortActual = 0;
    let mortTotal = 0;
    let mortDia = 0;
    let pesoSum = 0;
    let pesoCount = 0;
    let preCount = 0;
    let dttadasCount = 0;
    let activasCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      partos += Number(r.partos) || 0;
      lnv += Number(r.lnv) || 0;
      lnm += Number(r.lnm) || 0;
      lnMo += Number(r.lnMo) || 0;
      mpdAlCierre += Number(r.mpdAlCierre) || 0;
      mortAcum += Number(r.mortAcum) || 0;
      mortActual += Number(r.mortActual) || 0;
      mortTotal += Number(r.mortTotal) || 0;
      mortDia += Number(r.mortDia) || 0;

      if (r.pesoX !== null && r.pesoX !== undefined && !isNaN(Number(r.pesoX)) && Number(r.pesoX) > 0) {
        pesoSum += Number(r.pesoX);
        pesoCount++;
      }

      if (r.estado === 'Pre-Parto' || String(r.lotePic).toUpperCase() === 'PRE' || String(r.picCierre).toUpperCase() === 'PRE' || r.picCierre === '') {
        preCount++;
      }

      if (r.estatus === 'Dttada') {
        dttadasCount++;
      } else {
        activasCount++;
      }
    }

    const totalNacidos = lnv + lnm + lnMo;
    const pctMpd = lnv > 0 ? (mpdAlCierre / lnv) * 100 : 0;
    const pctMortAcum = lnv > 0 ? (mortTotal / lnv) * 100 : 0;
    const avgPesoX = pesoCount > 0 ? pesoSum / pesoCount : 0;
    const promedioLnvParto = partos > 0 ? lnv / partos : 0;

    return {
      count: rows.length,
      partos,
      lnv,
      lnm,
      lnMo,
      totalNacidos,
      mpdAlCierre,
      pctMpd,
      mortAcum,
      mortActual,
      mortTotal,
      pctMortAcum,
      mortDia,
      avgPesoX,
      promedioLnvParto,
      preCount,
      cerradasCount: rows.length - preCount,
      dttadasCount,
      activasCount
    };
  },

  /**
   * Filtra y ordena un conjunto de filas
   */
  _filterAndSort(rows, { search = '', sala = '', estado = '', estatus = '', picFilter = '', sortBy = 'orden', sortDir = 'asc' }) {
    const searchTokens = search ? search.toLowerCase().trim().split(/\s+/).filter(Boolean) : [];
    const numSala = sala !== '' && sala !== 'all' ? Number(sala) : null;
    const numPic = picFilter !== '' && picFilter !== null && picFilter !== undefined && !isNaN(Number(picFilter)) ? Number(picFilter) : null;

    const filtered = rows.filter(r => {
      if (numSala !== null && Number(r.sala) !== numSala) return false;

      if (estado && estado !== 'all') {
        const isPre = r.estado === 'Pre-Parto' || String(r.lotePic).toUpperCase() === 'PRE' || String(r.picCierre).toUpperCase() === 'PRE' || r.picCierre === '';
        if (estado === 'Pre-Parto' && !isPre) return false;
        if (estado === 'Cerrada' && isPre) return false;
      }

      if (estatus && estatus !== 'all') {
        if ((r.estatus || 'Activas') !== estatus) return false;
      }

      if (numPic !== null) {
        const matchPic = Number(r.picInicio) === numPic ||
                         Number(r.picCierre) === numPic ||
                         Number(r.lotePic) === numPic;
        if (!matchPic) return false;
      }

      if (searchTokens.length > 0) {
        const searchable = `${r.nro} ${r.picInicio} ${r.picCierre} ${r.sala} ${r.vlote || ''} ${r.lotePic} ${r.partos} ${r.lnv} ${r.lnm} ${r.lnMo} ${r.mpdAlCierre} ${r.mortAcum ?? 0} ${r.mortDia ?? 0} ${r.pesoX || ''} ${r.area} ${r.estado} ${r.estatus || ''}`.toLowerCase();
        for (const t of searchTokens) {
          if (!searchable.includes(t)) return false;
        }
      }

      return true;
    });

    filtered.sort((a, b) => {
      const col = sortBy || 'orden';

      // Manejo especial para columna N° ('-' debe ir al final o ordenarse correctamente)
      if (col === 'nro') {
        const valA = a.nro === '-' ? 999999 : Number(a.nro);
        const valB = b.nro === '-' ? 999999 : Number(b.nro);
        if (valA !== valB) return sortDir === 'desc' ? valB - valA : valA - valB;
        return (Number(a.orden) || 0) - (Number(b.orden) || 0);
      }

      if (col === 'picCierre' || col === 'lotePic') {
        const isPreA = String(a[col]).toUpperCase() === 'PRE' || a[col] === '';
        const isPreB = String(b[col]).toUpperCase() === 'PRE' || b[col] === '';
        if (isPreA && !isPreB) return sortDir === 'desc' ? -1 : 1;
        if (!isPreA && isPreB) return sortDir === 'desc' ? 1 : -1;
        const numA = Number(a[col]) || 0;
        const numB = Number(b[col]) || 0;
        if (numA !== numB) return sortDir === 'desc' ? numB - numA : numA - numB;
      }

      const va = a[col];
      const vb = b[col];
      if (va === vb) return (Number(a.orden) || 0) - (Number(b.orden) || 0);
      if (va === null || va === undefined || va === '') return 1;
      if (vb === null || vb === undefined || vb === '') return -1;

      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'desc' ? vb - va : va - vb;
      }

      return sortDir === 'desc'
        ? String(vb).localeCompare(String(va))
        : String(va).localeCompare(String(vb));
    });

    return filtered;
  },

  /**
   * Retorna datos separados para las 2 tablas distintas (Establecida y Expansión) + resúmenes KPI.
   * Acepta filtros globales o independientes por área: { est: {...}, exp: {...} }.
   */
  async getDualTableData(filters = {}) {
    const [all, mpdData, destetesData, cierresMesData] = await Promise.all([
      this.getAll(),
      this._getMpdSourceData(),
      this._getDestetesSourceData(),
      this._getCierresMesSourceData()
    ]);

    const estFilters = filters.est || filters;
    const expFilters = filters.exp || filters;
    const estMpdDay = estFilters.mpdDay || '';
    const expMpdDay = expFilters.mpdDay || '';

    const estAll = all.filter(r => r.area === 'EST');
    const expAll = all.filter(r => r.area === 'EXP');

    let estEnriched;
    let expEnriched;
    let estRef;
    let expRef;
    let monthBoundary;

    if (estMpdDay === expMpdDay) {
      const res = this._enrichWithMpdMortality(all, mpdData, estMpdDay, destetesData, cierresMesData);
      estEnriched = res.enriched.filter(r => r.area === 'EST');
      expEnriched = res.enriched.filter(r => r.area === 'EXP');
      estRef = res.ref;
      expRef = res.ref;
      monthBoundary = res.monthBoundary;
    } else {
      const estRes = this._enrichWithMpdMortality(estAll, mpdData, estMpdDay, destetesData, cierresMesData);
      const expRes = this._enrichWithMpdMortality(expAll, mpdData, expMpdDay, destetesData, cierresMesData);
      estEnriched = estRes.enriched;
      expEnriched = expRes.enriched;
      estRef = estRes.ref;
      expRef = expRes.ref;
      monthBoundary = estRes.monthBoundary || expRes.monthBoundary;
    }

    const establecida = this._filterAndSort(estEnriched, estFilters);
    const expansion = this._filterAndSort(expEnriched, expFilters);

    const estSummary = this._computeSummary(establecida);
    const expSummary = this._computeSummary(expansion);
    const totalSummary = this._computeSummary([...establecida, ...expansion]);

    return {
      establecida,
      expansion,
      estSummary,
      expSummary,
      totalSummary,
      estMpdRefLabel: estRef.label,
      expMpdRefLabel: expRef.label,
      mpdRefLabel: estRef.label === expRef.label ? estRef.label : `${estRef.label} / ${expRef.label}`,
      mpdLatestLabel: estRef.latestLabel,
      monthBoundary,
      totalRecords: all.length
    };
  },

  /**
   * Retorna datos estructurados para los gráficos comparativos entre Establecida y Expansión
   */
  async getChartData(mpdDay = '') {
    const [all, mpdData, destetesData, cierresMesData] = await Promise.all([
      this.getAll(),
      this._getMpdSourceData(),
      this._getDestetesSourceData(),
      this._getCierresMesSourceData()
    ]);
    const { enriched, ref, monthBoundary } = this._enrichWithMpdMortality(
      all, mpdData, mpdDay, destetesData, cierresMesData
    );

    const est = enriched.filter(r => r.area === 'EST').sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const exp = enriched.filter(r => r.area === 'EXP').sort((a, b) => (a.orden || 0) - (b.orden || 0));

    const estSummary = this._computeSummary(est);
    const expSummary = this._computeSummary(exp);

    return {
      estSummary,
      expSummary,
      mpdRefLabel: ref.label,
      monthBoundary,
      establecidaSeries: {
        labels: est.map(r => `Sala ${r.sala}${r.lotePic === 'PRE' ? ' (PRE)' : ` · L${r.lotePic}`}`),
        lnv: est.map(r => r.lnv),
        lnm: est.map(r => r.lnm),
        lnMo: est.map(r => r.lnMo),
        mpd: est.map(r => r.mpdAlCierre),
        mortAcum: est.map(r => r.mortAcum),
        mortActual: est.map(r => r.mortActual),
        mortTotal: est.map(r => r.mortTotal),
        mortDia: est.map(r => r.mortDia),
        pesoX: est.map(r => r.pesoX)
      },
      expansionSeries: {
        labels: exp.map(r => `Sala ${r.sala}${r.lotePic === 'PRE' ? ' (PRE)' : ` · L${r.lotePic}`}`),
        lnv: exp.map(r => r.lnv),
        lnm: exp.map(r => r.lnm),
        lnMo: exp.map(r => r.lnMo),
        mpd: exp.map(r => r.mpdAlCierre),
        mortAcum: exp.map(r => r.mortAcum),
        mortActual: exp.map(r => r.mortActual),
        mortTotal: exp.map(r => r.mortTotal),
        mortDia: exp.map(r => r.mortDia),
        pesoX: exp.map(r => r.pesoX)
      }
    };
  },

  async _getCierresSourceData() {
    if (window.App.Models.Cierres && typeof window.App.Models.Cierres.getAll === 'function') {
      return await window.App.Models.Cierres.getAll();
    }
    return await this.storage.getAll('cierres');
  },

  /**
   * Infiere el Pic Inicio de una sala abierta cuando aún no tiene filas en PARTOS SALAS
   * (busca en MPD el inicio del ciclo activo después de su último cierre o de la vuelta cerrada anterior).
   */
  _inferOpenRoomPicInicioFromMpd(sala, mpdData = [], minAbs = 0, fallbackPic = 0) {
    const targetSala = Number(sala);
    const days = (mpdData || [])
      .filter(d => {
        if (Number(d.sala) !== targetSala || (Number(d.cantidad) || 0) <= 0) return false;
        const abs = ((Number(d.vuelta) || 0) * 1000) + (Number(d.pic) || 0);
        return abs >= minAbs;
      })
      .map(d => ({
        vuelta: Number(d.vuelta) || 0,
        pic: Number(d.pic) || 0,
        abs: ((Number(d.vuelta) || 0) * 1000) + (Number(d.pic) || 0)
      }))
      .sort((a, b) => a.abs - b.abs);

    if (days.length === 0) return fallbackPic;
    // Tomar el último bloque continuo (en caso de haber habido días sin mortalidad de ciclo previo)
    let blockStart = days[0];
    for (let i = 1; i < days.length; i++) {
      if (days[i].abs - days[i - 1].abs > 3) {
        blockStart = days[i];
      }
    }
    return blockStart.pic;
  },

  /**
   * Reconstruye automáticamente las tablas de Maternidad (Establecida y Expansión)
   * cruzando Cierres de Salas, Destetes, Partos Salas, Cierres de Mes, Salas Maternidad y MPD,
   * sin depender de la hoja MATERNIDAD del Excel.
   * Implementa Opción A para cortes PRE de mes anterior cuando llega su Cierre Completo.
   */
  async syncFromSystem(options = {}) {
    const { excelPreRows = [] } = options || {};

    const [existingMat, cierresData, destetesData, mpdData, cierresMesData, salasMapData] = await Promise.all([
      this.getAll(),
      this._getCierresSourceData(),
      this._getDestetesSourceData(),
      this._getMpdSourceData(),
      this._getCierresMesSourceData(),
      this.storage.getAll('salas_maternidades')
    ]);

    const monthBoundary = this._resolveMonthBoundary(cierresMesData);
    const fallbackVuelta = Math.floor(monthBoundary.openMonthStartAbs / 1000) || 20;

    let partosSalasSummaries = new Map();
    if (window.App.Models.PartosSalas && typeof window.App.Models.PartosSalas.getActiveSummariesBySala === 'function') {
      partosSalasSummaries = await window.App.Models.PartosSalas.getActiveSummariesBySala(cierresData, fallbackVuelta);
    }

    // Mapa Sala -> Área ('EST' / 'EXP')
    const areaBySala = new Map();
    for (const sm of (salasMapData || [])) {
      const s = Number(sm.sala) || 0;
      if (s <= 0) continue;
      if (sm.zona === 'E') areaBySala.set(s, 'EST');
      else if (sm.zona === 'X') areaBySala.set(s, 'EXP');
    }
    const resolveArea = (sala) => areaBySala.get(sala) || (sala >= 25 ? 'EXP' : 'EST');

    // Índice de Destetes para clasificar lotes Dttada vs previos al mes
    const destetesByExact = new Map();
    const destetesBySalaLote = new Map();
    const addFin = (map, key, finAbs) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(finAbs);
    };
    for (const d of (destetesData || [])) {
      const s = Number(d.sala) || 0;
      const lp = Number(d.lotePic);
      const vf = Number(d.vfin) || Number(d.vlote) || fallbackVuelta;
      const fin = Number(d.fin) || 0;
      if (s <= 0 || fin <= 0 || isNaN(lp)) continue;
      const finAbs = (vf * 1000) + fin;
      const vl = Number(d.vlote) || vf;
      addFin(destetesByExact, `${s}_${vl}_${lp}`, finAbs);
      addFin(destetesBySalaLote, `${s}_${lp}`, finAbs);
    }
    const lookupWeanedAbs = (cierre, cieAbs) => {
      const s = Number(cierre.sala) || 0;
      const lp = Number(cierre.lotePic);
      const vl = Number(cierre.vlote) || fallbackVuelta;
      if (isNaN(lp)) return 0;
      const candidates = destetesByExact.get(`${s}_${vl}_${lp}`) || destetesBySalaLote.get(`${s}_${lp}`) || [];
      const matched = candidates.filter(f => f >= (cieAbs - 2) && f <= (cieAbs + 65));
      if (matched.length === 0) return 0;
      return Math.max(...matched);
    };

    // Mapa de cortes PRE de mes anterior (prioriza los recién leídos del Excel; si no, conserva snapshots existentes)
    const hasExcelPre = Array.isArray(excelPreRows) && excelPreRows.length > 0;
    const preCutBySala = new Map();
    if (hasExcelPre) {
      for (const p of excelPreRows) {
        const s = Number(p.sala) || 0;
        if (s > 0 && Number(p.picInicio) > 0) {
          preCutBySala.set(s, {
            vini: Number(p.vini) || fallbackVuelta,
            picInicio: Number(p.picInicio) || 0,
            sala: s,
            vlote: Number(p.vlote) || fallbackVuelta,
            partos: Number(p.partos) || 0,
            lnv: Number(p.lnv) || 0,
            lnm: Number(p.lnm) || 0,
            lnMo: Number(p.lnMo !== undefined ? p.lnMo : (p.lnMom || 0)) || 0,
            mpd: Number(p.mpd) || 0,
            fromExcel: true
          });
        }
      }
    } else {
      for (const r of (existingMat || [])) {
        if (String(r.nro) === '-' && String(r.picCierre || '').toUpperCase() === 'PRE') {
          const s = Number(r.sala) || 0;
          if (s > 0) {
            preCutBySala.set(s, {
              vini: fallbackVuelta,
              picInicio: Number(r.picInicio) || 0,
              sala: s,
              vlote: Number(r.vlote) || fallbackVuelta,
              partos: Number(r.partos) || 0,
              lnv: Number(r.lnv) || 0,
              lnm: Number(r.lnm) || 0,
              lnMo: Number(r.lnMo) || 0,
              mpd: Number(r.mpdAlCierre) || 0,
              fromExcel: false
            });
          }
        }
      }
    }

    const generated = [];
    const includedClosedBySala = new Map();
    const minWindowAbs = monthBoundary.openMonthStartAbs - 40;

    // 1. Procesar salas CERRADAS de Cierres
    for (const c of (cierresData || [])) {
      const rawLote = String(c.lotePic || '').trim().toUpperCase();
      if (c.estado === 'Pre-Parto' || rawLote === 'PRE' || rawLote === 'PP') continue;

      const sala = Number(c.sala) || 0;
      if (sala <= 0) continue;

      const vini = Number(c.vini) || fallbackVuelta;
      const vcie = Number(c.vcie) || vini;
      const picInicio = Number(c.picInicio) || 0;
      const picCierre = Number(c.picCierre) || 0;
      const cieAbs = (vcie * 1000) + picCierre;

      const weanedAbs = lookupWeanedAbs(c, cieAbs);
      const isDttadaInMonth = weanedAbs > 0 && weanedAbs >= monthBoundary.openMonthStartAbs;
      const weanedBeforeMonth = weanedAbs > 0 && weanedAbs < monthBoundary.openMonthStartAbs;

      if (weanedBeforeMonth) continue;
      if (!isDttadaInMonth && cieAbs < minWindowAbs) continue;

      const estatus = isDttadaInMonth ? 'Dttada' : (c.estatus === 'Inactiva' ? 'Inactiva' : 'Activa');
      const area = resolveArea(sala);

      if (!includedClosedBySala.has(sala)) includedClosedBySala.set(sala, []);
      includedClosedBySala.get(sala).push({ iniAbs: (vini * 1000) + picInicio, cieAbs });

      // Verificar si aplica Opción A (corte PRE del mes anterior para este mismo ciclo cerrado)
      const pre = preCutBySala.get(sala);
      const matchesPre = pre && (pre.picInicio === picInicio);

      let contPartos = Number(c.partos) || 0;
      let contLnv = Number(c.lnv) || 0;
      let contLnm = Number(c.lnm) || 0;
      let contLnMo = Number(c.lnMom !== undefined ? c.lnMom : (c.lnMo || 0)) || 0;
      let contMpd = Number(c.mpd) || 0;

      if (matchesPre) {
        // Emitir fila 1: instantánea histórica - | PRE
        generated.push({
          area,
          _isDttada: isDttadaInMonth,
          _isPreSnapshot: true,
          _sortPicIni: pre.picInicio,
          _sortPicCie: cieAbs,
          nro: '-',
          picInicio: pre.picInicio,
          picCierre: 'PRE',
          sala,
          vlote: pre.vlote || Number(c.vlote) || fallbackVuelta,
          lotePic: 'PRE',
          partos: pre.partos,
          lnv: pre.lnv,
          lnm: pre.lnm,
          lnMo: pre.lnMo,
          mpdAlCierre: pre.mpd,
          pesoX: null,
          estado: 'Pre-Parto',
          estatus
        });

        // Determinar si Cierres contiene el Cierre Completo (o ya venía restado en seed)
        const existingCont = !hasExcelPre
          ? (existingMat || []).find(r => Number(r.sala) === sala && String(r.nro) !== '-' && Number(r.picCierre) === picCierre)
          : null;
        const alreadySplitInSeed = existingCont && Number(existingCont.partos) === contPartos && contPartos < (pre.partos + existingCont.partos);

        if (pre.fromExcel || (!alreadySplitInSeed && contPartos >= pre.partos && contLnv >= pre.lnv)) {
          contPartos = Math.max(0, contPartos - pre.partos);
          contLnv = Math.max(0, contLnv - pre.lnv);
          contLnm = Math.max(0, contLnm - pre.lnm);
          contLnMo = Math.max(0, contLnMo - pre.lnMo);
          contMpd = Math.max(0, contMpd - pre.mpd);
        }
      }

      generated.push({
        area,
        _isDttada: isDttadaInMonth,
        _isPreSnapshot: false,
        _sortPicIni: picInicio,
        _sortPicCie: cieAbs,
        nro: isDttadaInMonth ? 0 : 1,
        picInicio,
        picCierre,
        sala,
        vlote: Number(c.vlote) || fallbackVuelta,
        lotePic: Number(c.lotePic) || 0,
        partos: contPartos,
        lnv: contLnv,
        lnm: contLnm,
        lnMo: contLnMo,
        mpdAlCierre: contMpd,
        pesoX: Number(c.pesoX) > 0 ? Number(c.pesoX) : null,
        estado: 'Cerrada',
        estatus
      });
    }

    // 2. Procesar salas ABIERTAS (Partos Salas acumulado o Pre-Parto en Cierres)
    const openSalasMap = new Map();
    for (const [sala, summary] of partosSalasSummaries.entries()) {
      openSalasMap.set(sala, { source: 'partos_salas', summary });
    }
    for (const c of (cierresData || [])) {
      const rawLote = String(c.lotePic || '').trim().toUpperCase();
      if (c.estado !== 'Pre-Parto' && rawLote !== 'PRE' && rawLote !== 'PP') continue;
      const sala = Number(c.sala) || 0;
      if (sala <= 0) continue;
      if (openSalasMap.has(sala)) {
        openSalasMap.get(sala).preCierre = c;
      } else {
        openSalasMap.set(sala, { source: 'cierres_pre', preCierre: c });
      }
    }

    const latestMpdRef = mpdData && mpdData.length > 0
      ? mpdData.reduce((acc, d) => (((Number(d.vuelta) || 0) * 1000 + (Number(d.pic) || 0)) > acc.abs
          ? { pic: Number(d.pic) || 0, abs: (Number(d.vuelta) || 0) * 1000 + (Number(d.pic) || 0) }
          : acc), { pic: 0, abs: 0 })
      : { pic: monthBoundary.openMonthStartAbs % 1000, abs: monthBoundary.openMonthStartAbs };

    for (const [sala, info] of openSalasMap.entries()) {
      const { summary, preCierre } = info;
      const area = resolveArea(sala);

      // Si viene de cierres_pre sin partos_salas, inferir picInicio si venía en 0
      let picInicio = summary ? Number(summary.picInicio) : (Number(preCierre?.picInicio) || 0);
      if (picInicio <= 0) {
        const allClosedForSala = (cierresData || [])
          .filter(c => Number(c.sala) === sala && c.estado !== 'Pre-Parto')
          .map(c => ((Number(c.vcie) || Number(c.vini) || fallbackVuelta) * 1000) + (Number(c.picCierre) || 0));
        const minAfterClose = allClosedForSala.length > 0
          ? Math.max(...allClosedForSala) + 1
          : monthBoundary.prevClosedEndAbs + 1;
        picInicio = this._inferOpenRoomPicInicioFromMpd(sala, mpdData, minAfterClose, latestMpdRef.pic);
      }

      const partos = summary ? summary.partos : (Number(preCierre?.partos) || 0);
      const lnv = summary ? summary.lnv : (Number(preCierre?.lnv) || 0);
      const lnm = summary ? summary.lnm : (Number(preCierre?.lnm) || 0);
      const lnMo = summary ? summary.lnMo : (Number(preCierre?.lnMom !== undefined ? preCierre.lnMom : (preCierre?.lnMo || 0)) || 0);
      const vini = summary ? summary.vini : (Number(preCierre?.vini) || fallbackVuelta);

      generated.push({
        area,
        _isDttada: false,
        _isPreSnapshot: false,
        _sortPicIni: picInicio,
        _sortPicCie: (vini * 1000) + picInicio + 900,
        nro: 1,
        picInicio,
        picCierre: '',
        sala,
        vlote: null,
        lotePic: 'PRE',
        partos,
        lnv,
        lnm,
        lnMo,
        mpdAlCierre: Number(preCierre?.mpd) || 0,
        pesoX: null,
        estado: 'Pre-Parto',
        estatus: 'Activa'
      });
    }

    // 3. Ordenar por área y asignar orden + N° (0 = Dttada, '-' = PRE histórico, 1..N = Activas)
    const finalRecords = [];
    for (const areaCode of ['EST', 'EXP']) {
      const areaRows = generated.filter(r => r.area === areaCode);
      areaRows.sort((a, b) => {
        if (a._isDttada !== b._isDttada) return a._isDttada ? -1 : 1;
        if (a._sortPicIni !== b._sortPicIni) return a._sortPicIni - b._sortPicIni;
        if (a._isPreSnapshot !== b._isPreSnapshot) return a._isPreSnapshot ? -1 : 1;
        if (a._sortPicCie !== b._sortPicCie) return a._sortPicCie - b._sortPicCie;
        return a.sala - b.sala;
      });

      let activeNro = 0;
      areaRows.forEach((row, idx) => {
        let nro = row.nro;
        if (row._isPreSnapshot) {
          nro = '-';
        } else if (row._isDttada) {
          nro = 0;
        } else {
          activeNro += 1;
          nro = activeNro;
        }
        const { _isDttada, _isPreSnapshot, _sortPicIni, _sortPicCie, ...clean } = row;
        finalRecords.push({
          id: finalRecords.length + 1,
          orden: idx + 1,
          ...clean,
          nro,
          createdAt: new Date().toISOString()
        });
      });
    }

    await this.clearAll();
    if (finalRecords.length > 0) {
      await this.bulkCreate(finalRecords);
    }

    return {
      total: finalRecords.length,
      estCount: finalRecords.filter(r => r.area === 'EST').length,
      expCount: finalRecords.filter(r => r.area === 'EXP').length,
      preCount: finalRecords.filter(r => r.lotePic === 'PRE').length
    };
  }
};

