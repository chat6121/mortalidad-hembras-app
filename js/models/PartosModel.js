/**
 * PartosModel: Capa de datos y lógica de negocio para Resumen de Partos.
 * Gestiona registros de partos en producción porcina: Vuelta, PIC, Semana, Área,
 * Turno, Partos, LNV (Lechones Nacidos Vivos), LNM (Nacidos Muertos),
 * LNMom (Momificados) y LNT (Lechones Nacidos Totales).
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};

window.App.Models.Partos = {
  resource: 'partos',
  storage: window.App.Models.StorageAdapter,
  _cachedData: null,

  /**
   * Invalida la memoria caché interna
   */
  invalidateCache() {
    this._cachedData = null;
  },

  /**
   * Obtiene todos los registros desde el adaptador de almacenamiento
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
   * Obtiene un registro por ID
   */
  async getById(id) {
    return await this.storage.getById(this.resource, id);
  },

  /**
   * Crea un nuevo registro individual
   */
  async create(item) {
    const lnv = Number(item.lnv) || 0;
    const lnm = Number(item.lnm) || 0;
    const lnMom = Number(item.lnMom) || 0;
    const lntCalculated = lnv + lnm + lnMom;

    const record = {
      id: item.id || Date.now(),
      vuelta: Number(item.vuelta) || 0,
      pic: Number(item.pic) || 0,
      semana: Number(item.semana) || 0,
      area: String(item.area || '').trim().toUpperCase(),
      turno: Number(item.turno) || 1,
      partos: Number(item.partos) || 0,
      lnv: lnv,
      lnm: lnm,
      lnMom: lnMom,
      lnt: lntCalculated, // Garantizar estrictamente LNT = LNV + LNM + LNMom
      createdAt: new Date().toISOString()
    };

    const created = await this.storage.create(this.resource, record);
    this.invalidateCache();
    return created;
  },

  /**
   * Actualiza un registro existente
   */
  async update(id, item) {
    const lnv = Number(item.lnv) || 0;
    const lnm = Number(item.lnm) || 0;
    const lnMom = Number(item.lnMom) || 0;
    const lntCalculated = lnv + lnm + lnMom;

    const record = {
      ...item,
      vuelta: Number(item.vuelta) || 0,
      pic: Number(item.pic) || 0,
      semana: Number(item.semana) || 0,
      area: String(item.area || '').trim().toUpperCase(),
      turno: Number(item.turno) || 1,
      partos: Number(item.partos) || 0,
      lnv: lnv,
      lnm: lnm,
      lnMom: lnMom,
      lnt: lntCalculated // Garantizar estrictamente LNT = LNV + LNM + LNMom
    };

    const updated = await this.storage.update(this.resource, id, record);
    this.invalidateCache();
    return updated;
  },

  /**
   * Elimina un registro por ID
   */
  async delete(id) {
    const res = await this.storage.delete(this.resource, id);
    this.invalidateCache();
    return res;
  },

  /**
   * Inserta un conjunto masivo de registros garantizando la regla LNV + LNM + LNMom = LNT
   */
  async bulkCreate(items) {
    if (!Array.isArray(items) || items.length === 0) return 0;
    const sanitized = items.map(item => {
      const lnv = Number(item.lnv) || 0;
      const lnm = Number(item.lnm) || 0;
      const lnMom = Number(item.lnMom) || 0;
      return {
        ...item,
        lnv,
        lnm,
        lnMom,
        lnt: lnv + lnm + lnMom
      };
    });
    const res = await this.storage.bulkCreate(this.resource, sanitized);
    this.invalidateCache();
    return res;
  },

  /**
   * Comprueba que la sumatoria de los LNV + LNM + LNMom sea igual a LNT en todos los registros.
   * Si se especifica autoFix = true, repara y sincroniza cualquier discrepancia detectada en IndexedDB.
   * @param {Object} options
   * @param {boolean} options.autoFix - Si es true, sobrescribe LNT con el cálculo exacto
   * @returns {Promise<{ total: number, validCount: number, errorCount: number, discrepancies: Array, isClean: boolean }>}
   */
  async verifyIntegrity(options = { autoFix: false }) {
    const all = await this.getAll();
    const discrepancies = [];
    let validCount = 0;

    for (let i = 0; i < all.length; i++) {
      const r = all[i];
      const lnv = Number(r.lnv) || 0;
      const lnm = Number(r.lnm) || 0;
      const lnMom = Number(r.lnMom) || 0;
      const currentLnt = Number(r.lnt) || 0;
      const expectedLnt = lnv + lnm + lnMom;

      if (currentLnt !== expectedLnt) {
        discrepancies.push({
          id: r.id,
          vuelta: r.vuelta,
          pic: r.pic,
          semana: r.semana,
          area: r.area,
          turno: r.turno,
          lnv,
          lnm,
          lnMom,
          currentLnt,
          expectedLnt,
          diff: currentLnt - expectedLnt
        });

        if (options && options.autoFix) {
          r.lnt = expectedLnt;
          await this.storage.update(this.resource, r.id, r);
        }
      } else {
        validCount++;
      }
    }

    if (discrepancies.length > 0 && options && options.autoFix) {
      this.invalidateCache();
    }

    return {
      total: all.length,
      validCount,
      errorCount: discrepancies.length,
      discrepancies,
      isClean: discrepancies.length === 0
    };
  },

  /**
   * Elimina todos los registros de Partos
   */
  async clearAll() {
    const res = await this.storage.clear(this.resource);
    this.invalidateCache();
    return res;
  },

  /**
   * Obtiene listas únicas para poblar los selectores de filtro
   */
  async getFilterOptions() {
    const all = await this.getAll();
    const areas = new Set();
    const turnos = new Set();
    const pics = new Set();
    const vueltas = new Set();
    const semanas = new Set();

    for (let i = 0; i < all.length; i++) {
      const r = all[i];
      if (r.area) areas.add(r.area);
      if (r.turno !== undefined && r.turno !== null) turnos.add(r.turno);
      if (r.pic !== undefined && r.pic !== null) pics.add(r.pic);
      if (r.vuelta !== undefined && r.vuelta !== null) vueltas.add(r.vuelta);
      if (r.semana !== undefined && r.semana !== null) semanas.add(r.semana);
    }

    return {
      areas: Array.from(areas).sort((a, b) => String(a).localeCompare(String(b))),
      turnos: Array.from(turnos).sort((a, b) => Number(a) - Number(b)),
      pics: Array.from(pics).sort((a, b) => Number(a) - Number(b)),
      vueltas: Array.from(vueltas).sort((a, b) => Number(b) - Number(a)),
      semanas: Array.from(semanas).sort((a, b) => Number(a) - Number(b))
    };
  },

  /**
   * Consulta con filtros, búsqueda inteligente, ordenamiento y paginación
   */
  async queryWithFilters(params = {}) {
    const {
      search = '',
      vuelta = '',
      pic = '',
      area = '',
      turno = '',
      semana = '',
      page = 1,
      pageSize = 25,
      sortBy = 'fecha',
      sortDir = 'desc'
    } = params;

    const all = await this.getAll();
    const Format = window.App.Utils.Format;
    const searchTerms = String(search).trim().toLowerCase().split(/\s+/).filter(Boolean);

    const hasVuelta = vuelta !== '' && vuelta !== null && vuelta !== undefined;
    const numVuelta = hasVuelta ? Number(vuelta) : null;

    const hasPic = pic !== '' && pic !== null && pic !== undefined;
    const numPic = hasPic ? Number(pic) : null;

    const hasArea = area !== '' && area !== null && area !== 'all';
    const hasTurno = turno !== '' && turno !== null && turno !== 'all';
    const numTurno = hasTurno ? Number(turno) : null;

    const hasSemana = semana !== '' && semana !== null && semana !== 'all';
    const numSemana = hasSemana ? Number(semana) : null;

    // 1. Filtrado
    const filtered = all.filter((item) => {
      // Calcular fecha calendario en memoria si no está calculada
      if (!item.fechaCalendario && Format && Format.FCalendario) {
        try {
          const d = Format.FCalendario(item.pic, item.vuelta);
          item.fechaCalendario = Format.formatDate(d);
          item.fechaTimestamp = d.getTime();
        } catch (e) {
          item.fechaCalendario = '-';
          item.fechaTimestamp = 0;
        }
      }

      // Filtro exacto por Vuelta
      if (hasVuelta && Number(item.vuelta) !== numVuelta) return false;

      // Filtro exacto por PIC
      if (hasPic && Number(item.pic) !== numPic) return false;

      // Filtro por Área
      if (hasArea && String(item.area || '').toUpperCase() !== String(area).toUpperCase()) return false;

      // Filtro por Turno
      if (hasTurno && Number(item.turno) !== numTurno) return false;

      // Filtro por Semana
      if (hasSemana && Number(item.semana) !== numSemana) return false;

      // Búsqueda inteligente multi-término
      if (searchTerms.length > 0) {
        const rowText = [
          item.vuelta,
          item.pic,
          item.semana,
          item.area,
          `t${item.turno}`,
          `turno ${item.turno}`,
          item.partos,
          item.lnv,
          item.lnm,
          item.lnMom,
          item.lnt,
          item.fechaCalendario || ''
        ].join(' ').toLowerCase();

        for (let t = 0; t < searchTerms.length; t++) {
          if (!rowText.includes(searchTerms[t])) {
            return false;
          }
        }
      }

      return true;
    });

    // 2. Cálculo de KPIs globales sobre el conjunto filtrado
    let totalPartos = 0;
    let totalLnv = 0;
    let totalLnm = 0;
    let totalLnMom = 0;
    let totalLnt = 0;

    for (let i = 0; i < filtered.length; i++) {
      const r = filtered[i];
      totalPartos += Number(r.partos) || 0;
      totalLnv += Number(r.lnv) || 0;
      totalLnm += Number(r.lnm) || 0;
      totalLnMom += Number(r.lnMom) || 0;
      totalLnt += Number(r.lnt) || (Number(r.lnv) || 0) + (Number(r.lnm) || 0) + (Number(r.lnMom) || 0);
    }

    const avgLnvParto = totalPartos > 0 ? (totalLnv / totalPartos) : 0;
    const avgLntParto = totalPartos > 0 ? (totalLnt / totalPartos) : 0;
    const pctLnm = totalLnt > 0 ? ((totalLnm / totalLnt) * 100) : 0;
    const pctMom = totalLnt > 0 ? ((totalLnMom / totalLnt) * 100) : 0;

    // 3. Ordenamiento multi-criterio: Fecha -> Área -> Turno
    filtered.sort((a, b) => {
      // Ordenamiento predeterminado: Fecha (actual a más antigua) -> Área (EST, EXP) -> Turno (T1, T2, T3)
      if (sortBy === 'fecha' || sortBy === 'fechaCalendario' || sortBy === 'default' || !sortBy) {
        // 1. Fecha (de más actual a más antigua: desc por defecto)
        const timeA = a.fechaTimestamp !== undefined ? a.fechaTimestamp : ((Number(a.vuelta) * 1000) + Number(a.pic));
        const timeB = b.fechaTimestamp !== undefined ? b.fechaTimestamp : ((Number(b.vuelta) * 1000) + Number(b.pic));
        if (timeA !== timeB) {
          return sortDir === 'asc' ? timeA - timeB : timeB - timeA;
        }

        // 2. Área (EST antes que EXP: asc)
        const areaA = String(a.area || '').toUpperCase();
        const areaB = String(b.area || '').toUpperCase();
        if (areaA !== areaB) {
          return areaA.localeCompare(areaB);
        }

        // 3. Turno (T1, T2, T3: asc)
        const turnoA = Number(a.turno) || 0;
        const turnoB = Number(b.turno) || 0;
        if (turnoA !== turnoB) {
          return turnoA - turnoB;
        }

        return (a.id || 0) - (b.id || 0);
      }

      // Si el usuario hace clic para ordenar por otra columna específica
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        if (valA !== valB) {
          return sortDir === 'asc' ? valA - valB : valB - valA;
        }
      } else {
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA !== strB) {
          return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
        }
      }

      // Desempate secundario: Fecha desc -> Área asc -> Turno asc
      const timeA = a.fechaTimestamp !== undefined ? a.fechaTimestamp : ((Number(a.vuelta) * 1000) + Number(a.pic));
      const timeB = b.fechaTimestamp !== undefined ? b.fechaTimestamp : ((Number(b.vuelta) * 1000) + Number(b.pic));
      if (timeA !== timeB) return timeB - timeA;

      const areaA = String(a.area || '').toUpperCase();
      const areaB = String(b.area || '').toUpperCase();
      if (areaA !== areaB) return areaA.localeCompare(areaB);

      const turnoA = Number(a.turno) || 0;
      const turnoB = Number(b.turno) || 0;
      if (turnoA !== turnoB) return turnoA - turnoB;

      return (a.id || 0) - (b.id || 0);
    });

    // 4. Paginación
    const totalRecords = filtered.length;
    const safePageSize = Math.max(1, Number(pageSize) || 25);
    const totalPages = Math.ceil(totalRecords / safePageSize) || 1;
    const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const startIndex = (safePage - 1) * safePageSize;
    const items = filtered.slice(startIndex, startIndex + safePageSize);

    return {
      items,
      totalRecords,
      totalPages,
      currentPage: safePage,
      pageSize: safePageSize,
      summary: {
        totalPartos,
        totalLnv,
        totalLnm,
        totalLnMom,
        totalLnt,
        avgLnvParto: Number(avgLnvParto.toFixed(2)),
        avgLntParto: Number(avgLntParto.toFixed(2)),
        pctLnm: Number(pctLnm.toFixed(2)),
        pctMom: Number(pctMom.toFixed(2))
      }
    };
  },

  /**
   * Genera la analítica y agregaciones para la vista de Gráficos
   */
  async getChartsData(selectedPic = null, selectedVuelta = null) {
    const all = await this.getAll();
    let records = all;

    const hasPic = selectedPic !== null && selectedPic !== undefined && selectedPic !== '';
    const hasVuelta = selectedVuelta !== null && selectedVuelta !== undefined && selectedVuelta !== '';

    if (hasPic || hasVuelta) {
      records = all.filter((r) => {
        if (hasVuelta && Number(r.vuelta) !== Number(selectedVuelta)) return false;
        if (hasPic && Number(r.pic) !== Number(selectedPic)) return false;
        return true;
      });
    }

    let totalPartos = 0;
    let totalLnv = 0;
    let totalLnm = 0;
    let totalLnMom = 0;
    let totalLnt = 0;

    const areaMap = {};
    const turnoMap = {
      1: { turno: 1, label: 'Turno 1', partos: 0, lnv: 0, lnm: 0, lnMom: 0, lnt: 0 },
      2: { turno: 2, label: 'Turno 2', partos: 0, lnv: 0, lnm: 0, lnMom: 0, lnt: 0 },
      3: { turno: 3, label: 'Turno 3', partos: 0, lnv: 0, lnm: 0, lnMom: 0, lnt: 0 }
    };

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const partos = Number(r.partos) || 0;
      const lnv = Number(r.lnv) || 0;
      const lnm = Number(r.lnm) || 0;
      const lnMom = Number(r.lnMom) || 0;
      const lnt = Number(r.lnt) || (lnv + lnm + lnMom);

      totalPartos += partos;
      totalLnv += lnv;
      totalLnm += lnm;
      totalLnMom += lnMom;
      totalLnt += lnt;

      // Agrupación por Área
      const areaKey = String(r.area || 'S/A').trim().toUpperCase();
      if (!areaMap[areaKey]) {
        areaMap[areaKey] = {
          area: areaKey,
          partos: 0,
          lnv: 0,
          lnm: 0,
          lnMom: 0,
          lnt: 0
        };
      }
      areaMap[areaKey].partos += partos;
      areaMap[areaKey].lnv += lnv;
      areaMap[areaKey].lnm += lnm;
      areaMap[areaKey].lnMom += lnMom;
      areaMap[areaKey].lnt += lnt;

      // Agrupación por Turno
      const tKey = Number(r.turno) || 1;
      if (!turnoMap[tKey]) {
        turnoMap[tKey] = { turno: tKey, label: `Turno ${tKey}`, partos: 0, lnv: 0, lnm: 0, lnMom: 0, lnt: 0 };
      }
      turnoMap[tKey].partos += partos;
      turnoMap[tKey].lnv += lnv;
      turnoMap[tKey].lnm += lnm;
      turnoMap[tKey].lnMom += lnMom;
      turnoMap[tKey].lnt += lnt;
    }

    const byArea = Object.values(areaMap).sort((a, b) => a.area.localeCompare(b.area));
    const byTurno = Object.values(turnoMap).sort((a, b) => a.turno - b.turno);

    // Calcular promedios por área
    const areaStats = byArea.map((a) => {
      const avgLnv = a.partos > 0 ? (a.lnv / a.partos) : 0;
      const avgLnt = a.partos > 0 ? (a.lnt / a.partos) : 0;
      const pctLnm = a.lnt > 0 ? ((a.lnm / a.lnt) * 100) : 0;
      const pctMom = a.lnt > 0 ? ((a.lnMom / a.lnt) * 100) : 0;
      return {
        ...a,
        avgLnv: Number(avgLnv.toFixed(2)),
        avgLnt: Number(avgLnt.toFixed(2)),
        pctLnm: Number(pctLnm.toFixed(2)),
        pctMom: Number(pctMom.toFixed(2))
      };
    });

    const avgLnvGlobal = totalPartos > 0 ? (totalLnv / totalPartos) : 0;
    const avgLntGlobal = totalPartos > 0 ? (totalLnt / totalPartos) : 0;
    const pctLnmGlobal = totalLnt > 0 ? ((totalLnm / totalLnt) * 100) : 0;
    const pctMomGlobal = totalLnt > 0 ? ((totalLnMom / totalLnt) * 100) : 0;

    return {
      selectedPic,
      selectedVuelta,
      recordCount: records.length,
      totals: {
        totalPartos,
        totalLnv,
        totalLnm,
        totalLnMom,
        totalLnt,
        avgLnvParto: Number(avgLnvGlobal.toFixed(2)),
        avgLntParto: Number(avgLntGlobal.toFixed(2)),
        pctLnm: Number(pctLnmGlobal.toFixed(2)),
        pctMom: Number(pctMomGlobal.toFixed(2))
      },
      distribution: [
        { label: 'Nacidos Vivos (LNV)', value: totalLnv, color: '#10b981', pct: totalLnt > 0 ? Number(((totalLnv / totalLnt) * 100).toFixed(1)) : 0 },
        { label: 'Nacidos Muertos (LNM)', value: totalLnm, color: '#ef4444', pct: totalLnt > 0 ? Number(((totalLnm / totalLnt) * 100).toFixed(1)) : 0 },
        { label: 'Momias (LNMom)', value: totalLnMom, color: '#f59e0b', pct: totalLnt > 0 ? Number(((totalLnMom / totalLnt) * 100).toFixed(1)) : 0 }
      ],
      byArea: areaStats,
      byTurno
    };
  }
};

