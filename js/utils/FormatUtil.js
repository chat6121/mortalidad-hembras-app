/**
 * FormatUtil: Utilidades globales de formato de fechas (dd-mm-yyyy),
 * semanas que inician en Lunes, números con separador de miles '.' y decimal ',',
 * y el cálculo matemático preciso de la Fecha PIC y Vuelta (Base 27/09/1971).
 */
window.App = window.App || {};
window.App.Utils = window.App.Utils || {};

window.App.Utils.Format = {
  // Fecha Base fijada a mediodía para evitar cualquier salto por husos horarios o horario de verano
  BASE_PIC_YEAR: 1971,
  BASE_PIC_MONTH: 8, // Septiembre (índice base 0 en JS: 0=Ene, 8=Sep)
  BASE_PIC_DAY: 27,

  /**
   * Obtiene una instancia limpia de la fecha base PIC (27 de Septiembre de 1971)
   */
  getBasePicDate() {
    return new Date(this.BASE_PIC_YEAR, this.BASE_PIC_MONTH, this.BASE_PIC_DAY, 12, 0, 0, 0);
  },

  // ==========================================================================
  // 1. FORMATEO Y PARSEO DE FECHAS (dd-mm-yyyy)
  // ==========================================================================

  /**
   * Formatea un Date a cadena con formato "dd-mm-yyyy"
   * @param {Date|string|number} dateInput 
   * @returns {string} Fecha en formato "dd-mm-yyyy"
   */
  formatDate(dateInput) {
    if (!dateInput) return '';
    const d = this.ensureDate(dateInput);
    if (!d || isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  },

  /**
   * Formatea un Date a cadena con formato estándar ISO "yyyy-mm-dd" (apto para inputs type="date")
   * @param {Date|string|number} dateInput 
   * @returns {string} Fecha en formato "yyyy-mm-dd"
   */
  formatDateISO(dateInput) {
    if (!dateInput) return '';
    const d = this.ensureDate(dateInput);
    if (!d || isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${year}-${month}-${day}`;
  },

  /**
   * Formatea una fecha en formato legible y descriptivo en español:
   * Ejemplo: "Lunes, 09 de Nov. 2026"
   * @param {Date|string|number} dateInput 
   * @returns {string}
   */
  formatDateHuman(dateInput) {
    if (!dateInput) return '';
    const d = this.ensureDate(dateInput);
    if (!d || isNaN(d.getTime())) return '';

    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'];

    const diaSem = dias[d.getDay()];
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = meses[d.getMonth()];
    const anio = d.getFullYear();

    return `${diaSem}, ${dia} de ${mes} ${anio}`;
  },

  /**
   * Formatea la fecha humana directamente a partir de una cadena Vuelta-PIC (ej: "20-132")
   * @param {string} vueltapicStr 
   * @returns {string} Ejemplo: "Lunes, 09 de Nov. 2026"
   */
  formatDateHumanFromVueltaPic(vueltapicStr) {
    if (!vueltapicStr) return '';
    const parsed = this.parseVueltaPic(vueltapicStr);
    if (parsed && parsed.isValid && parsed.date) {
      return this.formatDateHuman(parsed.date);
    }
    return '';
  },

  /**
   * Actualiza el contenido textual del elemento caption que acompaña al control Vuelta-PIC
   * @param {HTMLElement|string} captionElOrId 
   * @param {Date|string} dateOrVp 
   */
  updateDateCaption(captionElOrId, dateOrVp) {
    const el = typeof captionElOrId === 'string'
      ? document.getElementById(captionElOrId)
      : captionElOrId;
    if (!el) return;

    if (!dateOrVp) {
      el.textContent = '';
      return;
    }

    if (dateOrVp instanceof Date) {
      el.textContent = this.formatDateHuman(dateOrVp);
      return;
    }

    const strVal = String(dateOrVp).trim();
    if (!strVal) {
      el.textContent = '';
      return;
    }

    // Si es formato ISO yyyy-mm-dd
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(strVal) || /^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(strVal)) {
      el.textContent = this.formatDateHuman(strVal);
      return;
    }

    // Tratar como Vuelta-PIC
    el.textContent = this.formatDateHumanFromVueltaPic(strVal);
  },

  /**
   * Conecta el disparador del selector de fecha nativo (showPicker) al hacer click
   * en el wrapper del icono de calendario
   * @param {HTMLInputElement} dateInputEl 
   * @param {HTMLElement} wrapperEl 
   */
  attachCalendarPicker(dateInputEl, wrapperEl) {
    if (!dateInputEl) return;
    const trigger = wrapperEl || dateInputEl.parentElement;
    if (trigger && !trigger._pickerAttached) {
      trigger._pickerAttached = true;
      trigger.addEventListener('click', (e) => {
        try {
          if (typeof dateInputEl.showPicker === 'function') {
            dateInputEl.showPicker();
          }
        } catch (err) {
          // Ignorado si el navegador ya maneja el click
        }
      });
    }
  },

  /**
   * Obtiene la Vuelta correspondiente a la fecha actual del sistema o del año en curso
   * @returns {number} Vuelta entera en curso (ej: 20)
   */
  getCurrentVuelta() {
    try {
      return this.Vuelta(new Date());
    } catch (e) {
      return 20;
    }
  },

  /**
   * Parsea de manera segura cadenas en formato "dd-mm-yyyy", "dd/mm/yyyy" o "yyyy-mm-dd"
   * Retorna un objeto Date con hora 12:00:00 para evitar desajustes de zona horaria.
   * @param {string} dateString 
   * @returns {Date|null}
   */
  parseDate(dateString) {
    if (!dateString) return null;
    if (dateString instanceof Date) return dateString;

    const trimmed = String(dateString).trim();

    // Formato dd-mm-yyyy o dd/mm/yyyy
    const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1], 10);
      const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
      const year = parseInt(ddmmyyyyMatch[3], 10);
      const result = new Date(year, month, day, 12, 0, 0, 0);
      return isNaN(result.getTime()) ? null : result;
    }

    // Formato ISO yyyy-mm-dd
    const yyyymmddMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (yyyymmddMatch) {
      const year = parseInt(yyyymmddMatch[1], 10);
      const month = parseInt(yyyymmddMatch[2], 10) - 1;
      const day = parseInt(yyyymmddMatch[3], 10);
      const result = new Date(year, month, day, 12, 0, 0, 0);
      return isNaN(result.getTime()) ? null : result;
    }

    const generic = new Date(trimmed);
    return isNaN(generic.getTime()) ? null : generic;
  },

  /**
   * Convierte cualquier entrada válida a un objeto Date a mediodía local
   */
  ensureDate(dateInput) {
    if (dateInput instanceof Date) {
      return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 12, 0, 0, 0);
    }
    return this.parseDate(dateInput);
  },

  // ==========================================================================
  // 2. MANEJO DE SEMANAS (INICIO EN LUNES)
  // ==========================================================================

  /**
   * Retorna el día de la semana donde:
   * 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado, 7 = Domingo
   */
  getDayOfWeekMondayFirst(dateInput) {
    const d = this.ensureDate(dateInput);
    if (!d) return 1;
    const day = d.getDay(); // 0 = Domingo, 1 = Lunes, ...
    return day === 0 ? 7 : day;
  },

  /**
   * Retorna la fecha correspondiente al Lunes de la semana de la fecha dada
   */
  getMondayOfWeek(dateInput) {
    const d = this.ensureDate(dateInput);
    if (!d) return null;
    const dayOfWeek = this.getDayOfWeekMondayFirst(d);
    const diffToMonday = dayOfWeek - 1; // Días que restar para llegar al lunes
    const monday = new Date(d);
    monday.setDate(d.getDate() - diffToMonday);
    return monday;
  },

  /**
   * Retorna el número de semana ISO-8601 (donde la semana inicia en Lunes)
   */
  getWeekNumber(dateInput) {
    const d = this.ensureDate(dateInput);
    if (!d) return 1;
    // Copia de fecha ajustada al jueves de la semana actual (ISO standard)
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
  },

  // ==========================================================================
  // 3. FORMATEO DE NÚMEROS (MILES: '.' | DECIMALES: ',')
  // ==========================================================================

  /**
   * Formatea un valor numérico con separador de miles con punto (.) y decimales con coma (,)
   * Ejemplo: 1234567.89 -> "1.234.567,89"
   * @param {number|string} value 
   * @param {number} decimals Cantidad de decimales (por defecto 2)
   * @returns {string}
   */
  formatNumber(value, decimals = 2) {
    if (value === null || value === undefined || value === '') return '0,00';
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
    if (isNaN(num)) return '0,00';

    const parts = num.toFixed(decimals).split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];

    // Insertar puntos en miles
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return decimals > 0 ? `${integerPart},${decimalPart}` : integerPart;
  },

  /**
   * Formatea número como moneda
   * Ejemplo: 1234567.89 -> "$ 1.234.567,89"
   */
  formatCurrency(value, currencySymbol = '$', decimals = 2) {
    return `${currencySymbol} ${this.formatNumber(value, decimals)}`;
  },

  /**
   * Parsea un string formateado con miles "." y decimales "," a número flotante JS
   * Ejemplo: "1.234.567,89" -> 1234567.89
   * @param {string} formattedStr 
   * @returns {number}
   */
  parseNumber(formattedStr) {
    if (typeof formattedStr === 'number') return formattedStr;
    if (!formattedStr) return 0;
    const cleanStr = String(formattedStr)
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const val = parseFloat(cleanStr);
    return isNaN(val) ? 0 : val;
  },

  // ==========================================================================
  // 4. LÓGICA DE FECHA PIC & VUELTA (BASE 27/09/1971)
  // ==========================================================================

  /**
   * Calcula la cantidad exacta de días transcurridos desde el 27/09/1971 hasta la fecha dada
   * @param {Date|string} fechaInput 
   * @returns {number} Días totales enteros
   */
  calcDiferenciaDias(fechaInput) {
    const target = this.ensureDate(fechaInput);
    if (!target) throw new Error('Fecha no válida proporcionada para cálculo PIC.');

    const inicioVuelta = this.getBasePicDate();
    const diffMs = target.getTime() - inicioVuelta.getTime();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    return Math.round(diffMs / MS_PER_DAY);
  },

  /**
   * Función Vuelta:
   * Calcula el número de vuelta (cada vuelta equivale a un bloque de 1000 días).
   * @param {Date|string} fechaInput 
   * @returns {number} Vuelta entera (ej: 20)
   */
  Vuelta(fechaInput) {
    const diffDias = this.calcDiferenciaDias(fechaInput);
    return Math.floor(diffDias / 1000);
  },

  /**
   * Función FPic (Fecha PIC):
   * Retorna los días de la vuelta actual (0 a 999).
   * @param {Date|string} fechaInput 
   * @returns {number} Número PIC (ej: 125)
   */
  FPic(fechaInput) {
    const diffDias = this.calcDiferenciaDias(fechaInput);
    const pic = diffDias % 1000;
    return pic >= 0 ? pic : 1000 + pic;
  },

  /**
   * Genera el código completo PIC concatenado (Vuelta + PIC formateado a 3 dígitos)
   * Ejemplo: Vuelta 20, PIC 125 -> "20125" | Vuelta 20, PIC 5 -> "20005"
   * @param {Date|string} fechaInput 
   * @returns {string} Código PIC (ej: "20125")
   */
  getPicCode(fechaInput) {
    const diffDias = this.calcDiferenciaDias(fechaInput);
    const vuelta = Math.floor(diffDias / 1000);
    const pic = diffDias % 1000;
    return `${vuelta}${String(pic).padStart(3, '0')}`;
  },

  /**
   * Función FCalendario (Función Inversa):
   * A partir del número PIC y de la Vuelta, reconstruye la fecha de calendario exacta.
   * Total de días = (Vuelta * 1000) + Pic
   * Fecha = 27/09/1971 + Total de días
   * @param {number|string} pic Días PIC (0 - 999)
   * @param {number|string} vuelta Número de Vuelta
   * @returns {Date} Objeto Date exacto
   */
  FCalendario(pic, vuelta) {
    const p = parseInt(pic, 10);
    const v = parseFloat(vuelta);

    if (isNaN(p) || isNaN(v)) {
      throw new Error('Valores de PIC o Vuelta inválidos.');
    }

    const totalDias = (v * 1000) + p;
    const inicioVuelta = this.getBasePicDate();
    
    const targetDate = new Date(inicioVuelta.getTime());
    targetDate.setDate(targetDate.getDate() + totalDias);

    return targetDate;
  },

  /**
   * Descompone un código PIC completo (ej: "20125" o "20005") y retorna la fecha y sus partes
   * @param {string|number} picCode 
   * @returns {{ vuelta: number, pic: number, totalDias: number, date: Date, formattedDate: string }}
   */
  parsePicCode(picCode) {
    const codeStr = String(picCode).trim();
    if (!codeStr || isNaN(codeStr) || codeStr.length < 4) {
      throw new Error(`El código PIC "${picCode}" es inválido. Debe tener al menos 4 dígitos.`);
    }

    // Los últimos 3 dígitos son el PIC, los anteriores representan la Vuelta
    const pic = parseInt(codeStr.slice(-3), 10);
    const vuelta = parseInt(codeStr.slice(0, -3), 10);
    const date = this.FCalendario(pic, vuelta);

    return {
      vuelta: vuelta,
      pic: pic,
      totalDias: (vuelta * 1000) + pic,
      date: date,
      formattedDate: this.formatDate(date)
    };
  },

  /**
   * Obtiene un resumen completo de información PIC para una fecha dada
   * @param {Date|string} fechaInput 
   */
  getPicInfo(fechaInput) {
    const date = this.ensureDate(fechaInput);
    const totalDias = this.calcDiferenciaDias(date);
    const vuelta = Math.floor(totalDias / 1000);
    const pic = totalDias % 1000;
    const picCode = `${vuelta}${String(pic).padStart(3, '0')}`;
    const dayOfWeek = this.getDayOfWeekMondayFirst(date);
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    return {
      date: date,
      formattedDate: this.formatDate(date),
      totalDias: totalDias,
      vuelta: vuelta,
      pic: pic,
      picCode: picCode,
      dayOfWeekNr: dayOfWeek,
      dayName: dayNames[dayOfWeek - 1],
      weekNumber: this.getWeekNumber(date)
    };
  },

  /**
   * Genera el prefijo predeterminado para el campo unificado de Fecha PIC (ej: "20-")
   * basado en la vuelta actual en curso.
   * @returns {string} Prefijo ej: "20-"
   */
  getDefaultVueltaPicPrefix() {
    return `${this.getCurrentVuelta()}-`;
  },

  /**
   * Formatea Vuelta y PIC en una sola cadena integrada: "{vuelta}-{pic}"
   * Ejemplos: (20, 131) -> "20-131", (19, 786) -> "19-786"
   * @param {number|string} vuelta 
   * @param {number|string} pic 
   * @returns {string}
   */
  formatVueltaPic(vuelta, pic) {
    if (vuelta === undefined || vuelta === null || vuelta === '' || vuelta === 'all') {
      if (pic !== undefined && pic !== null && pic !== '' && pic !== 'all') {
        return `${this.getCurrentVuelta()}-${pic}`;
      }
      return '';
    }
    if (pic === undefined || pic === null || pic === '' || pic === 'all') {
      return `${vuelta}-`;
    }
    return `${vuelta}-${pic}`;
  },

  /**
   * Parsea una cadena de entrada unificada de Fecha PIC (ej: "20-131", "19-786", "20-", "131")
   * y extrae { vuelta, pic, isValid, date }
   * @param {string} inputStr 
   * @returns {{ vuelta: number|null, pic: number|null, isValid: boolean, date: Date|null }}
   */
  parseVueltaPic(inputStr) {
    if (!inputStr) return { vuelta: null, pic: null, isValid: false, date: null };
    const str = String(inputStr).trim();

    // 1. Caso estándar con guion o barra: "20-131", "19-786", "20 - 131"
    const dashMatch = str.match(/^(\d{1,3})\s*[-/]\s*(\d{1,4})$/);
    if (dashMatch) {
      const v = parseInt(dashMatch[1], 10);
      const p = parseInt(dashMatch[2], 10);
      let d = null;
      try { d = this.FCalendario(p, v); } catch (e) {}
      return { vuelta: v, pic: p, isValid: true, date: d };
    }

    // 2. Solo prefijo con guion (ej: "20-"): vuelta especificada, pic pendiente
    const prefixMatch = str.match(/^(\d{1,3})\s*[-/]$/);
    if (prefixMatch) {
      const v = parseInt(prefixMatch[1], 10);
      return { vuelta: v, pic: null, isValid: false, date: null };
    }

    // 3. Código concatenado de 4-5 dígitos (ej: "20131" -> vuelta 20, pic 131)
    if (/^\d{4,5}$/.test(str)) {
      try {
        const info = this.parsePicCode(str);
        return { vuelta: info.vuelta, pic: info.pic, isValid: true, date: info.date };
      } catch (e) {}
    }

    // 4. Solo número (ej: "131"): se asume la vuelta actual
    if (/^\d{1,3}$/.test(str)) {
      const p = parseInt(str, 10);
      const v = this.getCurrentVuelta();
      let d = null;
      try { d = this.FCalendario(p, v); } catch (e) {}
      return { vuelta: v, pic: p, isValid: true, date: d };
    }

    return { vuelta: null, pic: null, isValid: false, date: null };
  },

  /**
   * Helper para adjuntar comportamiento amigable de prefijo al campo unificado:
   * Al enfocar si está vacío, coloca automáticamente "20-" y posiciona el cursor al final.
   * @param {HTMLInputElement} inputEl 
   */
  setupVueltaPicInput(inputEl) {
    if (!inputEl) return;
    const defaultPrefix = this.getDefaultVueltaPicPrefix();

    inputEl.addEventListener('focus', () => {
      if (!inputEl.value || inputEl.value.trim() === '') {
        inputEl.value = defaultPrefix;
      }
      setTimeout(() => {
        try {
          const len = inputEl.value.length;
          inputEl.setSelectionRange(len, len);
        } catch (e) {}
      }, 10);
    });

    inputEl.addEventListener('click', () => {
      if (inputEl.value === defaultPrefix) {
        try {
          inputEl.setSelectionRange(defaultPrefix.length, defaultPrefix.length);
        } catch (e) {}
      }
    });
  }
};

