/**
 * PartosSalasModel.js - Modelo para seguimiento diario acumulado por sala abierta (hoja PARTOS SALAS)
 * Estructura Excel esperada: Pic Inicio | Sala | Partos | LNV | LNM | LNMo
 */

window.App = window.App || {};
window.App.Models = window.App.Models || {};

window.App.Models.PartosSalas = {
  resource: 'partos_salas',
  storage: window.App.Models.Database,
  _cache: null,

  invalidateCache() {
    this._cache = null;
  },

  async getAll() {
    if (this._cache) return this._cache;
    const rows = await this.storage.getAll(this.resource);
    this._cache = Array.isArray(rows) ? rows : [];
    return this._cache;
  },

  async clearAll() {
    const res = await this.storage.clearStore(this.resource);
    this.invalidateCache();
    return res;
  },

  async bulkReplace(items) {
    await this.clearAll();
    if (!Array.isArray(items) || items.length === 0) return 0;
    const sanitized = items.map((item, idx) => ({
      id: item.id || (idx + 1),
      vuelta: Number(item.vuelta) || 0,
      picInicio: Number(item.picInicio) || 0,
      sala: Number(item.sala) || 0,
      partos: Number(item.partos) || 0,
      lnv: Number(item.lnv) || 0,
      lnm: Number(item.lnm) || 0,
      lnMo: Number(item.lnMo !== undefined ? item.lnMo : (item.lnMom || 0)) || 0,
      createdAt: item.createdAt || new Date().toISOString()
    })).filter(r => r.sala > 0 && r.picInicio >= 0);

    if (sanitized.length === 0) return 0;
    const res = await this.storage.bulkPut(this.resource, sanitized);
    this.invalidateCache();
    return res;
  },

  /**
   * Parsea filas de la hoja PARTOS SALAS (Pic Inicio | Sala | Partos | LNV | LNM | LNMo)
   * e infiere la vuelta PIC correspondiente.
   */
  parseExcelRows(rows, referenceVuelta = null) {
    if (!Array.isArray(rows) || rows.length <= 1) return [];

    // Permitir encabezados en fila 0 o primeras 5 filas
    let headerIdx = 0;
    for (let r = 0; r < Math.min(rows.length, 5); r++) {
      const cells = (rows[r] || []).map(c => String(c || '').trim().toUpperCase());
      if (cells.some(c => c.includes('SALA')) && cells.some(c => c.includes('PARTOS') || c === 'LNV')) {
        headerIdx = r;
        break;
      }
    }

    const headers = (rows[headerIdx] || []).map(h => String(h || '').trim().toUpperCase());
    const findCol = (...names) => {
      for (const name of names) {
        const idx = headers.findIndex(h => h === name || h.includes(name));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const colPic = findCol('PIC INICIO', 'PIC INI', 'PIC', 'FECHA');
    const colSala = findCol('SALA');
    const colPartos = findCol('PARTOS', 'PARTO');
    const colLnv = findCol('LNV', 'LECHONES VIVOS');
    const colLnm = findCol('LNM', 'MORTINATOS');
    const colLnMo = findCol('LNMO', 'LNMOM', 'LN MO', 'LN MOM', 'MOMIAS');
    const colVuelta = findCol('VUELTA', 'VINI', 'VPIC');

    if (colSala === -1 || colPic === -1) return [];

    const Format = window.App.Utils && window.App.Utils.Format;
    let currentVuelta = Number(referenceVuelta) || (Format ? Format.getCurrentVuelta() : 20);
    let lastPicSeen = null;
    const records = [];

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => c === '' || c === null || c === undefined)) continue;

      const pic = Number(row[colPic]);
      const sala = Number(row[colSala]);
      if (!Number.isFinite(pic) || !Number.isFinite(sala) || sala <= 0) continue;

      let vuelta = colVuelta !== -1 && Number(row[colVuelta]) > 0 ? Number(row[colVuelta]) : currentVuelta;
      if (colVuelta === -1 && lastPicSeen !== null && (lastPicSeen - pic) > 500) {
        currentVuelta += 1;
        vuelta = currentVuelta;
      }
      lastPicSeen = pic;

      records.push({
        id: records.length + 1,
        vuelta,
        picInicio: pic,
        sala,
        partos: colPartos !== -1 ? (Number(row[colPartos]) || 0) : 0,
        lnv: colLnv !== -1 ? (Number(row[colLnv]) || 0) : 0,
        lnm: colLnm !== -1 ? (Number(row[colLnm]) || 0) : 0,
        lnMo: colLnMo !== -1 ? (Number(row[colLnMo]) || 0) : 0,
        createdAt: new Date().toISOString()
      });
    }

    return records;
  },

  /**
   * Agrupa los registros diarios acumulados por sala y ciclo, descartando ciclos ya cerrados en Cierres,
   * y devuelve un Map<sala, { sala, vini, picInicio, lastVuelta, lastPic, partos, lnv, lnm, lnMo }>
   * correspondiente al ciclo abierto actual de cada sala.
   */
  async getActiveSummariesBySala(cierresData = [], fallbackVuelta = 20) {
    const rows = await this.getAll();
    const result = new Map();
    if (!rows || rows.length === 0) return result;

    const bySala = new Map();
    for (const r of rows) {
      const sala = Number(r.sala) || 0;
      if (sala <= 0) continue;
      if (!bySala.has(sala)) bySala.set(sala, []);
      bySala.get(sala).push({
        ...r,
        vuelta: Number(r.vuelta) || Number(fallbackVuelta) || 20,
        picInicio: Number(r.picInicio) || 0,
        partos: Number(r.partos) || 0,
        lnv: Number(r.lnv) || 0,
        lnm: Number(r.lnm) || 0,
        lnMo: Number(r.lnMo) || 0
      });
    }

    const closedBySala = new Map();
    for (const c of (cierresData || [])) {
      if (c.estado === 'Pre-Parto') continue;
      const sala = Number(c.sala) || 0;
      if (sala <= 0) continue;
      const iniAbs = ((Number(c.vini) || Number(fallbackVuelta) || 20) * 1000) + (Number(c.picInicio) || 0);
      const cieAbs = ((Number(c.vcie) || Number(c.vini) || Number(fallbackVuelta) || 20) * 1000) + (Number(c.picCierre) || 0);
      if (!closedBySala.has(sala)) closedBySala.set(sala, []);
      closedBySala.get(sala).push({ iniAbs, cieAbs, picInicio: Number(c.picInicio) || 0 });
    }

    for (const [sala, salaRows] of bySala.entries()) {
      salaRows.sort((a, b) => ((a.vuelta * 1000) + a.picInicio) - ((b.vuelta * 1000) + b.picInicio));

      // Segmentar por ciclos: un nuevo ciclo inicia si hay brecha > 5 PICs o caída en acumulados
      const cycles = [];
      let currentCycle = [];
      for (const row of salaRows) {
        if (currentCycle.length === 0) {
          currentCycle.push(row);
          continue;
        }
        const prev = currentCycle[currentCycle.length - 1];
        const prevAbs = (prev.vuelta * 1000) + prev.picInicio;
        const currAbs = (row.vuelta * 1000) + row.picInicio;
        const picGap = currAbs - prevAbs;
        const droppedAccum = row.partos < prev.partos || row.lnv < prev.lnv;

        if (picGap > 5 || droppedAccum) {
          cycles.push(currentCycle);
          currentCycle = [row];
        } else {
          currentCycle.push(row);
        }
      }
      if (currentCycle.length > 0) cycles.push(currentCycle);

      const closedList = closedBySala.get(sala) || [];
      const openCycles = cycles.filter(cycle => {
        const first = cycle[0];
        const last = cycle[cycle.length - 1];
        const firstAbs = (first.vuelta * 1000) + first.picInicio;
        const lastAbs = (last.vuelta * 1000) + last.picInicio;
        return !closedList.some(cl =>
          (cl.picInicio > 0 && cl.picInicio === first.picInicio && Math.abs(firstAbs - cl.iniAbs) <= 5) ||
          (lastAbs <= cl.cieAbs + 1 && firstAbs >= cl.iniAbs - 1)
        );
      });

      if (openCycles.length === 0) continue;
      const latest = openCycles[openCycles.length - 1];
      const first = latest[0];
      const last = latest[latest.length - 1];

      result.set(sala, {
        sala,
        vini: first.vuelta,
        picInicio: first.picInicio,
        lastVuelta: last.vuelta,
        lastPic: last.picInicio,
        partos: last.partos,
        lnv: last.lnv,
        lnm: last.lnm,
        lnMo: last.lnMo,
        rowsCount: latest.length
      });
    }

    return result;
  }
};

