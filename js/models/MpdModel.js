/**
 * MpdModel: Gestiona las operaciones de datos y lógica de negocio para el módulo MPD.
 * Conectado a través del StorageAdapter para soportar tanto IndexedDB como API REST.
 */
window.App = window.App || {};
window.App.Models = window.App.Models || {};

window.App.Models.Mpd = {
  resource: 'mpd',
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
    const records = Array.isArray(data) ? data : [];
    const salasModel = window.App.Models.SalasMaternidad;

    // Normalizar registros para asegurar Granja (EST/EXP), Zona (E/X) y Maternidad (M1 a M5)
    if (salasModel) {
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const numSala = Number(r.sala) || 0;
        if (numSala > 0) {
          if (!r.maternidad) {
            r.maternidad = salasModel.getMatBySalaSync(numSala);
          }
          if (r.granja === 'E' || r.granja === 'X') {
            if (!r.zona) r.zona = r.granja;
            r.granja = salasModel.getAreaBySalaSync(numSala);
          } else if (!r.granja) {
            r.granja = salasModel.getAreaBySalaSync(numSala);
          }
          if (!r.zona) {
            r.zona = salasModel.getSiglaBySalaSync(numSala);
          }
        }
      }
    }

    this._cachedData = records;
    return this._cachedData;
  },

  /**
   * Obtiene un registro por su ID
   */
  async getById(id) {
    return await this.storage.getById(this.resource, id);
  },

  /**
   * Crea un nuevo registro individual
   */
  async create(item) {
    const numSala = Number(item.sala) || 0;
    const salasModel = window.App.Models.SalasMaternidad;

    let maternidad = String(item.maternidad || '').trim();
    if (!maternidad && numSala > 0 && salasModel) {
      maternidad = salasModel.getMatBySalaSync(numSala);
    }

    let granja = String(item.granja || '').trim().toUpperCase();
    let zona = String(item.zona || '').trim().toUpperCase();

    if (granja === 'E' || granja === 'X') {
      if (!zona) zona = granja;
      granja = salasModel ? salasModel.getAreaBySalaSync(numSala) : ((numSala >= 25 && numSala <= 41) ? 'EXP' : 'EST');
    } else if (!granja) {
      granja = salasModel ? salasModel.getAreaBySalaSync(numSala) : ((numSala >= 25 && numSala <= 41) ? 'EXP' : 'EST');
    }

    if (!zona) {
      zona = salasModel ? salasModel.getSiglaBySalaSync(numSala) : ((numSala >= 25 && numSala <= 41) ? 'X' : 'E');
    }

    const record = {
      id: item.id || Date.now(),
      vuelta: Number(item.vuelta) || 0,
      pic: Number(item.pic) || 0,
      cantidad: Number(item.cantidad) || 0,
      causa: Number(item.causa) || 0,
      peso: item.peso !== null && item.peso !== undefined && item.peso !== '' ? Number(item.peso) : null,
      turno: Number(item.turno) || 1,
      sala: numSala,
      semana: Number(item.semana) || 0,
      nota: Number(item.nota) || 0,
      observacion: String(item.observacion || '').trim(),
      granja: granja,
      zona: zona,
      maternidad: maternidad,
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
   * Inserta un conjunto masivo de registros (ej. importación Excel)
   */
  async bulkCreate(items) {
    if (!Array.isArray(items) || items.length === 0) return 0;
    const res = await this.storage.bulkCreate(this.resource, items);
    this.invalidateCache();
    return res;
  },

  /**
   * Borra todos los registros del almacén MPD
   */
  async clearAll() {
    const res = await this.storage.clear(this.resource);
    this.invalidateCache();
    return res;
  },

  /**
   * Obtiene opciones únicas para alimentar los filtros (Pic, Sala, Nota)
   */
  async getFilterOptions() {
    const data = await this.getAll();
    const salasSet = new Set();
    const picsSet = new Set();
    const notasSet = new Set();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row.sala !== undefined && row.sala !== null && row.sala !== '') salasSet.add(Number(row.sala));
      if (row.pic !== undefined && row.pic !== null && row.pic !== '') picsSet.add(Number(row.pic));
      if (row.nota !== undefined && row.nota !== null && row.nota !== '') notasSet.add(Number(row.nota));
    }

    return {
      salas: Array.from(salasSet).sort((a, b) => a - b),
      pics: Array.from(picsSet).sort((a, b) => a - b),
      notas: Array.from(notasSet).sort((a, b) => a - b)
    };
  },

  /**
   * Consulta paginada, filtrada y con buscador inteligente sobre el conjunto de datos
   * Diseñado para responder en menos de 5ms incluso con más de 10,000 filas.
   */
  async queryWithFilters(params = {}) {
    const {
      search = '',
      vuelta = '',
      pic = '',
      sala = '',
      nota = '',
      page = 1,
      pageSize = 50,
      sortBy = null,
      sortDir = 'asc'
    } = params;

    const data = await this.getAll();
    const totalRecords = data.length;

    const cleanSearch = String(search || '').trim().toLowerCase();
    const cleanVuelta = vuelta !== '' && vuelta !== null && vuelta !== undefined ? String(vuelta).trim() : null;
    const cleanPic = pic !== '' && pic !== null && pic !== undefined ? String(pic).trim() : null;
    const cleanSala = sala !== '' && sala !== null && sala !== undefined ? String(sala).trim() : null;
    const cleanNota = nota !== '' && nota !== null && nota !== undefined ? String(nota).trim() : null;

    // Filtrado de alto rendimiento
    const filtered = [];
    let sumCantidad = 0;
    const salasPresentes = new Set();
    const maternidadesPresentes = new Set();

    for (let i = 0; i < totalRecords; i++) {
      const row = data[i];

      // Filtro exacto por Vuelta (si se especifica)
      if (cleanVuelta !== null && String(row.vuelta) !== cleanVuelta) {
        continue;
      }

      // Filtro exacto por PIC (si se especifica)
      if (cleanPic !== null && String(row.pic) !== cleanPic) {
        continue;
      }

      // Filtro exacto por Sala
      if (cleanSala !== null && String(row.sala) !== cleanSala) {
        continue;
      }

      // Filtro por Nota de Salida (coincidencia de texto o número)
      if (cleanNota !== null && !String(row.nota).toLowerCase().includes(cleanNota.toLowerCase())) {
        continue;
      }

      // Buscador inteligente global multicampo
      if (cleanSearch) {
        const rowStr = `${row.vuelta} ${row.pic} ${row.cantidad} ${row.causa} ${row.peso || ''} ${row.turno} ${row.sala} ${row.semana} ${row.nota} ${row.observacion || ''} ${row.granja || ''} ${row.zona || ''} ${row.maternidad || ''}`.toLowerCase();
        if (!rowStr.includes(cleanSearch)) {
          continue;
        }
      }

      filtered.push(row);
      sumCantidad += (Number(row.cantidad) || 0);
      if (row.sala !== undefined && row.sala !== null) salasPresentes.add(row.sala);
      if (row.maternidad) maternidadesPresentes.add(row.maternidad);
    }

    // Ordenamiento: si se especifica sortBy se aplica; por defecto se ordena desde lo más actual a lo más antiguo
    if (filtered.length > 0) {
      filtered.sort((a, b) => {
        if (sortBy) {
          const valA = a[sortBy];
          const valB = b[sortBy];
          if (valA === valB) return 0;
          if (valA === null || valA === undefined) return 1;
          if (valB === null || valB === undefined) return -1;
          if (typeof valA === 'number' && typeof valB === 'number') {
            return sortDir === 'desc' ? valB - valA : valA - valB;
          }
          return sortDir === 'desc'
            ? String(valB).localeCompare(String(valA))
            : String(valA).localeCompare(String(valB));
        }

        // Orden predeterminado: Más actual primero (Vuelta DESC, Pic DESC, Id DESC)
        const codeA = (Number(a.vuelta) || 0) * 1000000 + (Number(a.pic) || 0) * 1000 + (Number(a.id) || 0);
        const codeB = (Number(b.vuelta) || 0) * 1000000 + (Number(b.pic) || 0) * 1000 + (Number(b.id) || 0);
        return codeB - codeA;
      });
    }

    const filteredTotal = filtered.length;
    const safePageSize = Math.max(1, Number(pageSize) || 50);
    const totalPages = Math.max(1, Math.ceil(filteredTotal / safePageSize));
    const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);

    const startIndex = (safePage - 1) * safePageSize;
    const endIndex = Math.min(startIndex + safePageSize, filteredTotal);
    const paginatedItems = filtered.slice(startIndex, endIndex);

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
        totalCantidad: sumCantidad,
        distinctSalas: salasPresentes.size,
        distinctMaternidades: maternidadesPresentes.size
      }
    };
  },

  /**
   * Obtiene los datos analíticos para los gráficos requeridos:
   * 1. MORTALIDAD POR CAUSAS
   * 2. MORTALIDAD POR SALAS
   * Permite filtrar por PIC específico y Vuelta o consolidado general.
   */
  async getMortalidadCharts(selectedPic = 78, selectedVuelta = null) {
    const data = await this.getAll();
    const Format = window.App && window.App.Utils ? window.App.Utils.Format : null;

    const hasVuelta = selectedVuelta !== null && selectedVuelta !== undefined && selectedVuelta !== '' && selectedVuelta !== 'all';
    const vueltaNum = hasVuelta ? Number(selectedVuelta) : null;

    // Obtener lista única de todos los PICs ordenados descendente
    const picsSet = new Set();
    data.forEach(r => {
      if (hasVuelta && Number(r.vuelta) !== vueltaNum) return;
      if (r.pic !== undefined && r.pic !== null && r.pic !== '') {
        picsSet.add(Number(r.pic));
      }
    });
    const availablePics = Array.from(picsSet).sort((a, b) => b - a);

    // Filtrar por Vuelta si se especificó
    let filtered = data;
    if (hasVuelta) {
      filtered = filtered.filter(r => Number(r.vuelta) === vueltaNum);
    }

    // Filtrar por PIC si se especificó (o 'all' para todo)
    const isAll = selectedPic === 'all' || selectedPic === null || selectedPic === undefined || selectedPic === '';
    if (!isAll) {
      const picNum = Number(selectedPic);
      filtered = filtered.filter(r => Number(r.pic) === picNum);
    }

    const causesMap = new Map();
    const roomsMap = new Map();
    let totalMortalidad = 0;

    for (let i = 0; i < filtered.length; i++) {
      const r = filtered[i];
      const cant = Number(r.cantidad) || 0;
      totalMortalidad += cant;

      if (r.causa !== undefined && r.causa !== null && r.causa !== '') {
        const c = Number(r.causa);
        causesMap.set(c, (causesMap.get(c) || 0) + cant);
      }

      if (r.sala !== undefined && r.sala !== null && r.sala !== '') {
        const s = Number(r.sala);
        roomsMap.set(s, (roomsMap.get(s) || 0) + cant);
      }
    }

    // Ordenar de mayor a menor frecuencia (descendente)
    const sortedCauses = Array.from(causesMap.entries())
      .sort((a, b) => b[1] - a[1]);

    const sortedRooms = Array.from(roomsMap.entries())
      .sort((a, b) => b[1] - a[1]);

    // Reconstruir fecha calendario si hay PIC y Vuelta
    let formattedDate = '';
    let isoDate = '';
    if (!isAll && Format) {
      try {
        const v = hasVuelta ? vueltaNum : (Format.getCurrentVuelta ? Format.getCurrentVuelta() : 20);
        const p = Number(selectedPic);
        const dateObj = Format.FCalendario(p, v);
        formattedDate = Format.formatDate(dateObj);
        isoDate = Format.formatDateISO ? Format.formatDateISO(dateObj) : dateObj.toISOString().slice(0, 10);
      } catch (e) {
        console.warn('No se pudo derivar fecha calendario para gráficos:', e);
      }
    }

    return {
      selectedPic: isAll ? 'all' : Number(selectedPic),
      selectedVuelta: hasVuelta ? vueltaNum : null,
      formattedDate,
      isoDate,
      totalMortalidad,
      availablePics,
      causas: {
        labels: sortedCauses.map(c => String(c[0])),
        values: sortedCauses.map(c => c[1]),
        total: totalMortalidad
      },
      salas: {
        labels: sortedRooms.map(s => String(s[0])),
        values: sortedRooms.map(s => s[1]),
        total: totalMortalidad
      }
    };
  }
};

