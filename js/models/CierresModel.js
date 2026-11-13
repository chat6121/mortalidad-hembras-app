/**
 * CierresModel: Capa de datos y lógica de negocio para Cierre de Salas.
 * Gestiona registros de cierre de salas de maternidad: partos, lechones nacidos vivos (LNV),
 * nacidos muertos (LNM), momificados (LNMom), mortalidad pre-destete (MPD) y peso promedio.
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};

window.App.Models.Cierres = {
  resource: 'cierres',
  storage: window.App.Models.StorageAdapter,
  _cachedData: null,

  /**
   * Invalida la caché interna en memoria
   */
  invalidateCache() {
    this._cachedData = null;
  },

  /**
   * Obtiene todos los registros desde el adaptador
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
   * Obtiene un registro por su ID
   */
  async getById(id) {
    return await this.storage.getById(this.resource, id);
  },

  /**
   * Indica si un registro corresponde a una sala en estado Pre-Parto (PRE / legado PP)
   */
  _isPreParto(row) {
    if (!row) return false;
    if (row.estado === 'Pre-Parto') return true;
    const rawLote = row.lotePic !== null && row.lotePic !== undefined ? String(row.lotePic).trim().toUpperCase() : '';
    const rawPicCierre = row.picCierre !== null && row.picCierre !== undefined ? String(row.picCierre).trim().toUpperCase() : '';
    return rawLote === 'PRE' || rawLote === 'PP' || rawPicCierre === 'PRE';
  },

  /**
   * Crea un nuevo registro individual
   */
  async create(item) {
    const isPreParto = this._isPreParto(item);
    const estado = item.estado || (isPreParto ? 'Pre-Parto' : 'Cerrada');
    const lotePic = isPreParto ? 'PRE' : (Number(item.lotePic) || 0);

    const record = {
      id: item.id || Date.now(),
      vini: Number(item.vini) || 0,
      picInicio: Number(item.picInicio) || 0,
      vcie: Number(item.vcie) || 0,
      picCierre: Number(item.picCierre) || 0,
      sala: Number(item.sala) || 0,
      vlote: Number(item.vlote) || 0,
      lotePic: lotePic,
      partos: Number(item.partos) || 0,
      lnv: Number(item.lnv) || 0,
      lnm: Number(item.lnm) || 0,
      lnMom: Number(item.lnMom) || 0,
      mpd: Number(item.mpd) || 0,
      pesoX: item.pesoX !== null && item.pesoX !== undefined && item.pesoX !== '' ? Number(item.pesoX) : 0,
      maternidad: String(item.maternidad || '').trim(),
      estado: estado,
      estatus: item.estatus || 'Activa',
      createdAt: item.createdAt || new Date().toISOString()
    };
    const created = await this.storage.create(this.resource, record);
    this.invalidateCache();
    return created;
  },

  /**
   * Actualiza un registro existente
   */
  async update(id, item) {
    const updated = await this.storage.update(this.resource, id, item);
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
   * Inserta un conjunto masivo de registros
   */
  async bulkCreate(items) {
    if (!Array.isArray(items) || items.length === 0) return 0;
    const res = await this.storage.bulkCreate(this.resource, items);
    this.invalidateCache();
    return res;
  },

  /**
   * Borra todos los registros del almacén de Cierres
   */
  async clearAll() {
    const res = await this.storage.clear(this.resource);
    this.invalidateCache();
    return res;
  },

  /**
   * Obtiene opciones únicas para alimentar los filtros (Salas, Maternidades, PICs Cierre)
   */
  async getFilterOptions() {
    const data = await this.getAll();
    const salasSet = new Set();
    const maternidadesSet = new Set();
    const picsCierreSet = new Set();
    const vueltasSet = new Set();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row.sala !== undefined && row.sala !== null && row.sala !== '') salasSet.add(Number(row.sala));
      if (row.maternidad) maternidadesSet.add(String(row.maternidad).trim());
      if (row.picCierre !== undefined && row.picCierre !== null && row.picCierre !== '') picsCierreSet.add(Number(row.picCierre));
      if (row.vcie !== undefined && row.vcie !== null && row.vcie !== '') vueltasSet.add(Number(row.vcie));
    }

    return {
      salas: Array.from(salasSet).sort((a, b) => a - b),
      maternidades: Array.from(maternidadesSet).sort((a, b) => a.localeCompare(b)),
      picsCierre: Array.from(picsCierreSet).sort((a, b) => a - b),
      vueltas: Array.from(vueltasSet).sort((a, b) => a - b),
      estados: ['Pre-Parto', 'Cerrada']
    };
  },

  /**
   * Consulta paginada, filtrada y con buscador inteligente
   * Los 15 campos: VIni, Pic Inicio, Vcie, Pic Cierre, Sala, Estado, Vlote, LotePic,
   * Partos, LNV, LNM, LNMom, MPD, Peso X, Maternidad.
   */
  async queryWithFilters(params = {}) {
    const {
      search = '',
      vcie = '',
      picCierre = '',
      sala = '',
      estado = '',
      maternidad = '',
      page = 1,
      pageSize = 50,
      sortBy = 'lote',
      sortDir = 'desc'
    } = params;

    const data = await this.getAll();
    const totalRecords = data.length;

    const cleanSearch = String(search || '').trim().toLowerCase();
    const cleanVcie = vcie !== '' && vcie !== null && vcie !== undefined ? String(vcie).trim() : null;
    const cleanPicCierre = picCierre !== '' && picCierre !== null && picCierre !== undefined ? String(picCierre).trim() : null;
    const cleanSala = sala !== '' && sala !== null && sala !== undefined ? String(sala).trim() : null;
    const cleanEstado = estado !== '' && estado !== null && estado !== undefined ? String(estado).trim() : null;
    const cleanMaternidad = maternidad !== '' && maternidad !== null && maternidad !== undefined ? String(maternidad).trim().toLowerCase() : null;

    const filtered = [];
    let sumPartos = 0;
    let sumLnv = 0;
    let sumLnm = 0;
    let sumLnMom = 0;
    let sumMpd = 0;
    let sumPesoWeighted = 0;
    let countPeso = 0;

    for (let i = 0; i < totalRecords; i++) {
      const row = data[i];

      const isRowPreParto = this._isPreParto(row);
      const rowEstado = row.estado || (isRowPreParto ? 'Pre-Parto' : 'Cerrada');

      // Filtro por Estado (Pre-Parto o Cerrada)
      if (cleanEstado !== null && rowEstado !== cleanEstado) {
        continue;
      }

      // Filtro por Vuelta de Cierre (Vcie)
      if (cleanVcie !== null && String(row.vcie) !== cleanVcie) {
        continue;
      }

      // Filtro por PIC de Cierre (Pic Cierre)
      if (cleanPicCierre !== null && String(row.picCierre) !== cleanPicCierre) {
        continue;
      }

      // Filtro por Sala
      if (cleanSala !== null && String(row.sala) !== cleanSala) {
        continue;
      }

      // Filtro por Maternidad
      if (cleanMaternidad !== null && String(row.maternidad || '').toLowerCase() !== cleanMaternidad) {
        continue;
      }

      // Buscador inteligente en los 16 campos
      if (cleanSearch) {
        const rowStr = `${row.vini} ${row.picInicio} ${row.vcie} ${row.picCierre} ${row.sala} ${row.vlote} ${row.lotePic} ${row.partos} ${row.lnv} ${row.lnm} ${row.lnMom} ${row.mpd} ${row.pesoX || ''} ${row.maternidad || ''} ${rowEstado} ${row.estatus || 'Activa'}`.toLowerCase();
        if (!rowStr.includes(cleanSearch)) {
          continue;
        }
      }

      filtered.push(row);

      const partos = Number(row.partos) || 0;
      const lnv = Number(row.lnv) || 0;
      const lnm = Number(row.lnm) || 0;
      const lnMom = Number(row.lnMom) || 0;
      const mpd = Number(row.mpd) || 0;
      const peso = Number(row.pesoX) || 0;

      sumPartos += partos;
      sumLnv += lnv;
      sumLnm += lnm;
      sumLnMom += lnMom;
      sumMpd += mpd;

      if (peso > 0 && lnv > 0) {
        sumPesoWeighted += (peso * lnv);
        countPeso += lnv;
      } else if (peso > 0) {
        sumPesoWeighted += peso;
        countPeso += 1;
      }
    }

    // Ordenamiento:
    // Regla de negocio solicitada por el usuario:
    // 1. Las salas Pre-Parto (con lote cero o sin lote pic) SIEMPRE DEBEN IR DE PRIMERO en la tabla.
    // 2. Para las salas cerradas, ordenar por Fecha PIC de Lote (VLote + LotePic) de la más actual a la más antigua
    //    (VLote = 20 y LotePic = 120 es mayor y más reciente que VLote = 19 y LotePic = 120).
    if (filtered.length > 0) {
      filtered.sort((a, b) => {
        const isLoteSort = !sortBy || sortBy === 'lote' || sortBy === 'vlote' || sortBy === 'lotePic' || sortBy === 'default';

        if (isLoteSort) {
          const isPreA = this._isPreParto(a);
          const isPreB = this._isPreParto(b);

          // Salas Pre-Parto (con PRE en lotePic) SIEMPRE van de primero
          if (isPreA && !isPreB) return -1;
          if (!isPreA && isPreB) return 1;
          if (isPreA && isPreB) {
            return (Number(a.sala) || 0) - (Number(b.sala) || 0);
          }

          // Para salas cerradas: ordenar por Fecha PIC de Lote (VLote * 1000 + LotePic)
          const loteA = ((Number(a.vlote) || 0) * 1000) + (Number(a.lotePic) || 0);
          const loteB = ((Number(b.vlote) || 0) * 1000) + (Number(b.lotePic) || 0);

          if (loteA !== loteB) {
            return sortDir === 'asc' ? loteA - loteB : loteB - loteA;
          }

          // Desempate secundario: Sala (asc)
          const salaA = Number(a.sala) || 0;
          const salaB = Number(b.sala) || 0;
          if (salaA !== salaB) {
            return salaA - salaB;
          }

          return (Number(b.id) || 0) - (Number(a.id) || 0);
        }

        // Ordenamiento por columna Estado
        if (sortBy === 'estado') {
          const isPreA = this._isPreParto(a);
          const isPreB = this._isPreParto(b);
          if (isPreA !== isPreB) {
            return sortDir === 'asc' ? (isPreA ? -1 : 1) : (isPreA ? 1 : -1);
          }
        }

        // Ordenamiento por Fecha PIC de Cierre (Vcie + Pic Cierre de mayor a menor)
        if (sortBy === 'vcie' || sortBy === 'picCierre' || sortBy === 'cierre' || sortBy === 'fechaCierre') {
          const isPreA = this._isPreParto(a);
          const isPreB = this._isPreParto(b);
          if (isPreA && !isPreB) return -1;
          if (!isPreA && isPreB) return 1;
          if (isPreA && isPreB) return (Number(a.sala) || 0) - (Number(b.sala) || 0);

          const cieA = ((Number(a.vcie) || 0) * 1000) + (Number(a.picCierre) || 0);
          const cieB = ((Number(b.vcie) || 0) * 1000) + (Number(b.picCierre) || 0);
          if (cieA !== cieB) {
            return sortDir === 'asc' ? cieA - cieB : cieB - cieA;
          }
        }

        // Ordenamiento por Fecha PIC de Inicio (VIni + Pic Inicio de mayor a menor)
        if (sortBy === 'vini' || sortBy === 'picInicio') {
          const iniA = ((Number(a.vini) || 0) * 1000) + (Number(a.picInicio) || 0);
          const iniB = ((Number(b.vini) || 0) * 1000) + (Number(b.picInicio) || 0);
          if (iniA !== iniB) {
            return sortDir === 'asc' ? iniA - iniB : iniB - iniA;
          }
        }

        // Ordenamiento por otra columna seleccionada por el usuario
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (valA === valB) {
          // Desempate por Fecha PIC de Lote
          const loteA = ((Number(a.vlote) || 0) * 1000) + (Number(a.lotePic) || 0);
          const loteB = ((Number(b.vlote) || 0) * 1000) + (Number(b.lotePic) || 0);
          return loteB - loteA;
        }

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDir === 'desc' ? valB - valA : valA - valB;
        }

        return sortDir === 'desc'
          ? String(valB).localeCompare(String(valA))
          : String(valA).localeCompare(String(valB));
      });
    }

    const filteredTotal = filtered.length;
    const safePageSize = Math.max(1, Number(pageSize) || 50);
    const totalPages = Math.max(1, Math.ceil(filteredTotal / safePageSize));
    const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);

    const startIndex = (safePage - 1) * safePageSize;
    const endIndex = Math.min(startIndex + safePageSize, filteredTotal);
    const paginatedItems = filtered.slice(startIndex, endIndex);

    const pctMpd = sumLnv > 0 ? ((sumMpd / sumLnv) * 100) : 0;
    const avgPeso = countPeso > 0 ? (sumPesoWeighted / countPeso) : 0;

    return {
      total: totalRecords,
      filteredTotal,
      page: safePage,
      pageSize: safePageSize,
      totalPages,
      startIndex: filteredTotal > 0 ? startIndex + 1 : 0,
      endIndex,
      items: paginatedItems,
      summary: {
        totalPartos: sumPartos,
        totalLnv: sumLnv,
        totalLnm: sumLnm,
        totalLnMom: sumLnMom,
        totalMpd: sumMpd,
        pctMpd: pctMpd,
        avgPeso: avgPeso
      }
    };
  },

  /**
   * Obtiene los datos analíticos para los gráficos de Cierre de Salas:
   * 1. DISTRIBUCIÓN DE NACIMIENTOS Y RENDIMIENTO (LNV, LNM, LNMom, MPD)
   * 2. PRODUCCIÓN POR SALA (Partos y Lechones Nacidos Vivos LNV)
   * 3. BALANCE Y EFICIENCIA POR MATERNIDAD (Partos, LNV, LNM, LNMom, MPD, % MPD promedio)
   */
  async getChartsData(selectedPic = null, selectedVuelta = null) {
    const data = await this.getAll();
    const hasVuelta = selectedVuelta !== null && selectedVuelta !== undefined && selectedVuelta !== '' && selectedVuelta !== 'all';
    const vueltaNum = hasVuelta ? Number(selectedVuelta) : null;
    const hasPic = selectedPic !== null && selectedPic !== undefined && selectedPic !== '' && selectedPic !== 'all';
    const picNum = hasPic ? Number(selectedPic) : null;

    // Filtrar conjunto para gráficos
    const activeData = data.filter(r => {
      if (hasVuelta && Number(r.vcie) !== vueltaNum) return false;
      if (hasPic && Number(r.picCierre) !== picNum) return false;
      return true;
    });

    let totalPartos = 0;
    let totalLnv = 0;
    let totalLnm = 0;
    let totalLnMom = 0;
    let totalMpd = 0;
    let sumPesoWeighted = 0;
    let countPeso = 0;

    // 1. Producción por Sala (Partos y LNV)
    const salaTotals = {};

    activeData.forEach(r => {
      const s = Number(r.sala) || 0;
      const partosVal = Number(r.partos) || 0;
      const lnvVal = Number(r.lnv) || 0;
      const lnmVal = Number(r.lnm) || 0;
      const lnMomVal = Number(r.lnMom) || 0;
      const mpdVal = Number(r.mpd) || 0;
      const pesoVal = Number(r.pesoX) || 0;

      totalPartos += partosVal;
      totalLnv += lnvVal;
      totalLnm += lnmVal;
      totalLnMom += lnMomVal;
      totalMpd += mpdVal;

      if (pesoVal > 0 && lnvVal > 0) {
        sumPesoWeighted += (pesoVal * lnvVal);
        countPeso += lnvVal;
      }

      if (!salaTotals[s]) {
        salaTotals[s] = { sala: s, partos: 0, lnv: 0 };
      }
      salaTotals[s].partos += partosVal;
      salaTotals[s].lnv += lnvVal;
    });

    const salasSorted = Object.values(salaTotals)
      .sort((a, b) => b.lnv - a.lnv);

    // 2. Desglose por Maternidad
    const matTotals = {};
    activeData.forEach(r => {
      const mat = String(r.maternidad || 'Sin Asignar').trim();
      if (!matTotals[mat]) {
        matTotals[mat] = { maternidad: mat, partos: 0, lnv: 0, lnm: 0, lnMom: 0, mpd: 0 };
      }
      matTotals[mat].partos += (Number(r.partos) || 0);
      matTotals[mat].lnv += (Number(r.lnv) || 0);
      matTotals[mat].lnm += (Number(r.lnm) || 0);
      matTotals[mat].lnMom += (Number(r.lnMom) || 0);
      matTotals[mat].mpd += (Number(r.mpd) || 0);
    });

    const matSorted = Object.values(matTotals).map(m => ({
      ...m,
      pctMpd: m.lnv > 0 ? ((m.mpd / m.lnv) * 100) : 0
    })).sort((a, b) => b.lnv - a.lnv);

    return {
      selectedVuelta,
      selectedPic,
      recordsCount: activeData.length,
      kpis: {
        totalPartos,
        totalLnv,
        totalLnm,
        totalLnMom,
        totalMpd,
        pctMpd: totalLnv > 0 ? ((totalMpd / totalLnv) * 100) : 0,
        avgPeso: countPeso > 0 ? (sumPesoWeighted / countPeso) : 0
      },
      produccionSalas: {
        labels: salasSorted.map(item => `Sala ${item.sala}`),
        partos: salasSorted.map(item => item.partos),
        lnv: salasSorted.map(item => item.lnv)
      },
      distributionChart: {
        labels: ['Nacidos Vivos (LNV)', 'Nacidos Muertos (LNM)', 'Momificados (LNMom)', 'Bajas MPD'],
        data: [totalLnv, totalLnm, totalLnMom, totalMpd]
      },
      maternidades: matSorted
    };
  }
};

