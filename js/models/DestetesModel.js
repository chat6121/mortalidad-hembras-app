/**
 * DestetesModel: Capa de datos y lógica de negocio para el Módulo de Destetes.
 * Gestiona registros de destete en producción porcina: Fecha, Vuelta Fin, PIC Fin,
 * Vuelta Lote, PIC Lote, Sala, Granja (EST/EXP), Zona (E/X), Maternidad (M1-M5),
 * Días de lactancia, Lechones Sitio 2, Recría, Muertos, Eliminados, Cantidad Neta S2,
 * Pesos Promedio, Pesos Netos y Eficiencias zootécnicas calculadas contra la curva estándar.
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};

window.App.Models.Destetes = {
  resource: 'destetes',
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
   * Obtiene un registro por su ID
   */
  async getById(id) {
    return await this.storage.getById(this.resource, id);
  },

  /**
   * Resuelve granja, zona y maternidad a partir de la sala
   */
  resolveSalaInfo(sala) {
    const salasModel = window.App.Models.SalasMaternidad;
    if (salasModel && typeof salasModel.resolveSalaSync === 'function') {
      const loc = salasModel.resolveSalaSync(sala);
      if (loc) {
        return {
          granja: loc.area || 'EST',
          zona: loc.sigla || 'E',
          maternidad: loc.mat || 'M1'
        };
      }
    }
    const num = Number(sala) || 0;
    if (num >= 1 && num <= 8) return { granja: 'EST', zona: 'E', maternidad: 'M1' };
    if (num >= 9 && num <= 17) return { granja: 'EST', zona: 'E', maternidad: 'M2' };
    if (num >= 18 && num <= 24) return { granja: 'EST', zona: 'E', maternidad: 'M3' };
    if (num >= 25 && num <= 33) return { granja: 'EXP', zona: 'X', maternidad: 'M4' };
    if (num >= 34 && num <= 41) return { granja: 'EXP', zona: 'X', maternidad: 'M5' };
    return { granja: 'EST', zona: 'E', maternidad: 'M1' };
  },

  /**
   * Calcula el peso estándar esperado para una edad en días según la curva zootécnica
   */
  getPesoEsperado(dias) {
    const d = Math.max(1, Math.min(40, Math.round(Number(dias) || 21)));
    const pesosModel = window.App.Models.PesosEdad;
    if (pesosModel && typeof pesosModel.getPesoEsperado === 'function') {
      return pesosModel.getPesoEsperado(d);
    }
    // Fallback estándar si el modelo no está listo
    const standardWeights = {
      20: 5.82, 21: 6.12, 22: 6.42, 23: 6.74, 24: 7.04,
      25: 7.44, 26: 7.74, 27: 8.14, 28: 8.44
    };
    return standardWeights[d] || (1.5 + (d * 0.28));
  },

  /**
   * Calcula la eficiencia zootécnica porcentual: (Peso Promedio / Peso Esperado) * 100
   */
  calcEficiencia(pesoPromedio, dias) {
    const peso = Number(pesoPromedio) || 0;
    if (peso <= 0) return 0;
    const esperado = this.getPesoEsperado(dias);
    if (!esperado || esperado <= 0) return 0;
    return Number(((peso / esperado) * 100).toFixed(2));
  },

  /**
   * Normaliza y calcula los campos zootécnicos de un registro de destete
   */
  sanitizeRecord(item) {
    const sala = Number(item.sala) || 0;
    const locInfo = this.resolveSalaInfo(sala);

    const dias = Number(item.dias) || 0;
    const sitio2 = Number(item.sitio2) || 0;
    const recria = Number(item.recria) || 0;
    const muertos = Number(item.muertos) || 0;
    const eliminados = Number(item.eliminados) || 0;
    
    // Cantidad neta enviada a Sitio 2 = Sitio 2 - Eliminados
    const cantS2 = item.cantS2 !== undefined && item.cantS2 !== null
      ? Number(item.cantS2)
      : Math.max(0, sitio2 - eliminados);

    let pesoXS2 = Number(item.pesoXS2) || 0;
    let pesoNS2 = Number(item.pesoNS2) || 0;
    if (pesoXS2 <= 0 && pesoNS2 > 0 && cantS2 > 0) {
      pesoXS2 = Number((pesoNS2 / cantS2).toFixed(2));
    } else if (pesoNS2 <= 0 && pesoXS2 > 0 && cantS2 > 0) {
      pesoNS2 = Math.round(pesoXS2 * cantS2);
    }

    let eficS2 = Number(item.eficS2) || 0;
    if (eficS2 <= 0 && pesoXS2 > 0 && dias > 0) {
      eficS2 = this.calcEficiencia(pesoXS2, dias);
    }

    let pesoXR = Number(item.pesoXR) || 0;
    let pesoNR = Number(item.pesoNR) || 0;
    if (pesoXR <= 0 && pesoNR > 0 && recria > 0) {
      pesoXR = Number((pesoNR / recria).toFixed(2));
    } else if (pesoNR <= 0 && pesoXR > 0 && recria > 0) {
      pesoNR = Math.round(pesoXR * recria);
    }

    let eficR = Number(item.eficR) || 0;
    if (eficR <= 0 && pesoXR > 0 && dias > 0) {
      eficR = this.calcEficiencia(pesoXR, dias);
    }

    return {
      id: item.id || Date.now(),
      fecha: String(item.fecha || '').trim(),
      vfin: Number(item.vfin) || 0,
      fin: Number(item.fin) || 0,
      vlote: Number(item.vlote) || 0,
      lotePic: Number(item.lotePic) || 0,
      sala: sala,
      granja: item.granja || locInfo.granja,
      zona: item.zona || locInfo.zona,
      maternidad: item.maternidad || locInfo.maternidad,
      dias: dias,
      sitio2: sitio2,
      recria: recria,
      muertos: muertos,
      eliminados: eliminados,
      cantS2: cantS2,
      pesoXS2: Number(pesoXS2.toFixed(2)),
      eficS2: Number(eficS2.toFixed(2)),
      pesoNS2: pesoNS2,
      pesoXR: Number(pesoXR.toFixed(2)),
      eficR: Number(eficR.toFixed(2)),
      pesoNR: pesoNR,
      createdAt: item.createdAt || new Date().toISOString()
    };
  },

  /**
   * Crea un nuevo registro individual
   */
  async create(item) {
    const record = this.sanitizeRecord(item);
    const created = await this.storage.create(this.resource, record);
    this.invalidateCache();
    return created;
  },

  /**
   * Actualiza un registro existente
   */
  async update(id, item) {
    const record = this.sanitizeRecord({ ...item, id });
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
   * Inserta un lote de registros masivos
   */
  async bulkCreate(items) {
    if (!Array.isArray(items) || items.length === 0) return 0;
    const sanitized = items.map(item => this.sanitizeRecord(item));
    const res = await this.storage.bulkCreate(this.resource, sanitized);
    this.invalidateCache();
    return res;
  },

  /**
   * Limpia todos los registros del almacén
   */
  async clearAll() {
    const res = await this.storage.clear(this.resource);
    this.invalidateCache();
    return res;
  },

  /**
   * Obtiene las opciones únicas disponibles para los filtros de la vista
   */
  async getFilterOptions() {
    const all = await this.getAll();
    const salas = new Set();
    const maternidades = new Set();
    const granjas = new Set();
    const vueltas = new Set();
    const pics = new Set();

    for (let i = 0; i < all.length; i++) {
      const r = all[i];
      if (r.sala) salas.add(Number(r.sala));
      if (r.maternidad) maternidades.add(r.maternidad);
      if (r.granja) granjas.add(r.granja);
      if (r.vfin) vueltas.add(Number(r.vfin));
      if (r.fin) pics.add(Number(r.fin));
    }

    return {
      salas: Array.from(salas).sort((a, b) => a - b),
      maternidades: Array.from(maternidades).sort(),
      granjas: Array.from(granjas).sort(),
      vueltas: Array.from(vueltas).sort((a, b) => b - a),
      pics: Array.from(pics).sort((a, b) => b - a)
    };
  },

  /**
   * Consulta con filtros, búsqueda debounced, ordenamiento y paginación
   */
  async query(options = {}) {
    const {
      page = 1,
      pageSize = 50,
      search = '',
      vuelta = '',
      pic = '',
      fecha = '',
      sala = '',
      maternidad = '',
      granja = '',
      sortBy = 'fin',
      sortDir = 'desc'
    } = options;

    let records = await this.getAll();

    // Filtro por Vuelta de fin
    if (vuelta !== '' && vuelta !== 'all' && vuelta !== null && vuelta !== undefined) {
      const vNum = Number(vuelta);
      records = records.filter(r => Number(r.vfin) === vNum);
    }

    // Filtro por PIC de fin
    if (pic !== '' && pic !== 'all' && pic !== null && pic !== undefined) {
      const pNum = Number(pic);
      records = records.filter(r => Number(r.fin) === pNum);
    }

    // Filtro por Fecha de calendario exacta (dd-mm-yyyy)
    if (fecha && String(fecha).trim() !== '') {
      const targetDate = String(fecha).trim();
      records = records.filter(r => r.fecha === targetDate);
    }

    // Filtro por Sala
    if (sala !== '' && sala !== 'all' && sala !== null && sala !== undefined) {
      const sNum = Number(sala);
      records = records.filter(r => Number(r.sala) === sNum);
    }

    // Filtro por Maternidad
    if (maternidad && maternidad !== 'all') {
      records = records.filter(r => r.maternidad === maternidad);
    }

    // Filtro por Granja / Área (EST / EXP)
    if (granja && granja !== 'all') {
      records = records.filter(r => r.granja === granja);
    }

    // Buscador general de texto
    if (search && String(search).trim() !== '') {
      const q = String(search).trim().toLowerCase();
      records = records.filter(r => {
        return (
          String(r.fecha || '').toLowerCase().includes(q) ||
          String(r.vfin || '').includes(q) ||
          String(r.fin || '').includes(q) ||
          String(r.vlote || '').includes(q) ||
          String(r.lotePic || '').includes(q) ||
          String(r.sala || '').includes(q) ||
          String(r.granja || '').toLowerCase().includes(q) ||
          String(r.zona || '').toLowerCase().includes(q) ||
          String(r.maternidad || '').toLowerCase().includes(q)
        );
      });
    }

    // Calcular KPIs antes de paginar
    const kpis = this.calculateKpis(records);

    // Ordenamiento
    records.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'fecha') {
        const partsA = (a.fecha || '').split('-');
        const partsB = (b.fecha || '').split('-');
        valA = partsA.length === 3 ? new Date(partsA[2], partsA[1] - 1, partsA[0]).getTime() : 0;
        valB = partsB.length === 3 ? new Date(partsB[2], partsB[1] - 1, partsB[0]).getTime() : 0;
      }

      if (valA === valB) {
        // Criterio de desempate por vfin DESC, fin DESC, id DESC
        if (a.vfin !== b.vfin) return b.vfin - a.vfin;
        if (a.fin !== b.fin) return b.fin - a.fin;
        return (b.id || 0) - (a.id || 0);
      }

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    const totalRecords = records.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedItems = records.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      totalRecords,
      totalPages,
      currentPage,
      pageSize,
      kpis
    };
  },

  /**
   * Calcula los indicadores zootécnicos consolidados (KPIs) de un grupo de registros
   */
  calculateKpis(records) {
    const total = records.length;
    if (total === 0) {
      return {
        totalDestetes: 0,
        totalSitio2: 0,
        totalRecria: 0,
        totalEliminados: 0,
        totalMuertos: 0,
        totalDestetados: 0,
        promedioPesoS2: 0,
        promedioEficS2: 0,
        promedioPesoRec: 0,
        promedioEficRec: 0,
        promedioDias: 0
      };
    }

    let sumSitio2 = 0;
    let sumRecria = 0;
    let sumEliminados = 0;
    let sumMuertos = 0;
    let sumCantS2 = 0;
    let sumPesoNS2 = 0;
    let sumPesoNR = 0;
    let sumEficS2 = 0;
    let countEficS2 = 0;
    let sumEficR = 0;
    let countEficR = 0;
    let sumDias = 0;

    for (let i = 0; i < total; i++) {
      const r = records[i];
      sumSitio2 += Number(r.sitio2) || 0;
      sumRecria += Number(r.recria) || 0;
      sumEliminados += Number(r.eliminados) || 0;
      sumMuertos += Number(r.muertos) || 0;
      sumCantS2 += Number(r.cantS2) || 0;
      sumPesoNS2 += Number(r.pesoNS2) || 0;
      sumPesoNR += Number(r.pesoNR) || 0;
      sumDias += Number(r.dias) || 0;

      if (r.eficS2 > 0) {
        sumEficS2 += Number(r.eficS2);
        countEficS2++;
      }
      if (r.eficR > 0) {
        sumEficR += Number(r.eficR);
        countEficR++;
      }
    }

    const promedioPesoS2 = sumCantS2 > 0 ? Number((sumPesoNS2 / sumCantS2).toFixed(2)) : 0;
    const promedioEficS2 = countEficS2 > 0 ? Number((sumEficS2 / countEficS2).toFixed(2)) : 0;
    const promedioPesoRec = sumRecria > 0 ? Number((sumPesoNR / sumRecria).toFixed(2)) : 0;
    const promedioEficRec = countEficR > 0 ? Number((sumEficR / countEficR).toFixed(2)) : 0;
    const promedioDias = total > 0 ? Number((sumDias / total).toFixed(1)) : 0;

    return {
      totalDestetes: total,
      totalSitio2: sumSitio2,
      totalRecria: sumRecria,
      totalEliminados: sumEliminados,
      totalMuertos: sumMuertos,
      totalDestetados: sumCantS2 + sumRecria,
      totalCantS2: sumCantS2,
      promedioPesoS2,
      promedioEficS2,
      promedioPesoRec,
      promedioEficRec,
      promedioDias
    };
  }
};
