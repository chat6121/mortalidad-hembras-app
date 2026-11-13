/**
 * cierres-mes-seed.js: Datos iniciales de Calendario de Producción y Cierres de Mes PIC.
 * Define los cortes de período productivo de la granja (2024, 2025, 2026),
 * con sus fechas de inicio, fechas de fin, correlativos PIC y sus Vueltas exactas derivadas de las fechas calendario.
 * 100% Offline para almacenamiento y persistencia en IndexedDB (almacén: 'cierres_mes').
 */
window.App = window.App || {};
window.App.Data = window.App.Data || {};

window.App.Data.cierresMesSeed = [
  // --- AÑO 2024 (12 Períodos - Vuelta 19) ---
  { id: 1,  ano: 2024, mes: 'ENERO',      mesNum: 1,  fechaIni: '29/12/2023', fechaFin: '30/01/2024', vInicio: 19, picInicio: 86,  vFin: 19, picFin: 118, dias: 33, estado: 'Cerrado', fechaCierre: '2024-01-30T23:59:59' },
  { id: 2,  ano: 2024, mes: 'FEBRERO',    mesNum: 2,  fechaIni: '31/01/2024', fechaFin: '28/02/2024', vInicio: 19, picInicio: 119, vFin: 19, picFin: 147, dias: 29, estado: 'Cerrado', fechaCierre: '2024-02-28T23:59:59' },
  { id: 3,  ano: 2024, mes: 'MARZO',      mesNum: 3,  fechaIni: '29/02/2024', fechaFin: '30/03/2024', vInicio: 19, picInicio: 148, vFin: 19, picFin: 178, dias: 31, estado: 'Cerrado', fechaCierre: '2024-03-30T23:59:59' },
  { id: 4,  ano: 2024, mes: 'ABRIL',      mesNum: 4,  fechaIni: '31/03/2024', fechaFin: '29/04/2024', vInicio: 19, picInicio: 179, vFin: 19, picFin: 208, dias: 30, estado: 'Cerrado', fechaCierre: '2024-04-29T23:59:59' },
  { id: 5,  ano: 2024, mes: 'MAYO',       mesNum: 5,  fechaIni: '30/04/2024', fechaFin: '30/05/2024', vInicio: 19, picInicio: 209, vFin: 19, picFin: 239, dias: 31, estado: 'Cerrado', fechaCierre: '2024-05-30T23:59:59' },
  { id: 6,  ano: 2024, mes: 'JUNIO',      mesNum: 6,  fechaIni: '31/05/2024', fechaFin: '29/06/2024', vInicio: 19, picInicio: 240, vFin: 19, picFin: 269, dias: 30, estado: 'Cerrado', fechaCierre: '2024-06-29T23:59:59' },
  { id: 7,  ano: 2024, mes: 'JULIO',      mesNum: 7,  fechaIni: '30/06/2024', fechaFin: '30/07/2024', vInicio: 19, picInicio: 270, vFin: 19, picFin: 300, dias: 31, estado: 'Cerrado', fechaCierre: '2024-07-30T23:59:59' },
  { id: 8,  ano: 2024, mes: 'AGOSTO',     mesNum: 8,  fechaIni: '31/07/2024', fechaFin: '30/08/2024', vInicio: 19, picInicio: 301, vFin: 19, picFin: 331, dias: 31, estado: 'Cerrado', fechaCierre: '2024-08-30T23:59:59' },
  { id: 9,  ano: 2024, mes: 'SEPTIEMBRE', mesNum: 9,  fechaIni: '31/08/2024', fechaFin: '29/09/2024', vInicio: 19, picInicio: 332, vFin: 19, picFin: 361, dias: 30, estado: 'Cerrado', fechaCierre: '2024-09-29T23:59:59' },
  { id: 10, ano: 2024, mes: 'OCTUBRE',    mesNum: 10, fechaIni: '30/09/2024', fechaFin: '30/10/2024', vInicio: 19, picInicio: 362, vFin: 19, picFin: 392, dias: 31, estado: 'Cerrado', fechaCierre: '2024-10-30T23:59:59' },
  { id: 11, ano: 2024, mes: 'NOVIEMBRE',  mesNum: 11, fechaIni: '31/10/2024', fechaFin: '29/11/2024', vInicio: 19, picInicio: 393, vFin: 19, picFin: 422, dias: 30, estado: 'Cerrado', fechaCierre: '2024-11-29T23:59:59' },
  { id: 12, ano: 2024, mes: 'DICIEMBRE',  mesNum: 12, fechaIni: '30/11/2024', fechaFin: '30/12/2024', vInicio: 19, picInicio: 423, vFin: 19, picFin: 453, dias: 31, estado: 'Cerrado', fechaCierre: '2024-12-30T23:59:59' },

  // --- AÑO 2025 (12 Períodos - Vuelta 19) ---
  { id: 13, ano: 2025, mes: 'ENERO',      mesNum: 1,  fechaIni: '31/12/2024', fechaFin: '30/01/2025', vInicio: 19, picInicio: 454, vFin: 19, picFin: 484, dias: 31, estado: 'Cerrado', fechaCierre: '2025-01-30T23:59:59' },
  { id: 14, ano: 2025, mes: 'FEBRERO',    mesNum: 2,  fechaIni: '31/01/2025', fechaFin: '27/02/2025', vInicio: 19, picInicio: 485, vFin: 19, picFin: 512, dias: 28, estado: 'Cerrado', fechaCierre: '2025-02-27T23:59:59' },
  { id: 15, ano: 2025, mes: 'MARZO',      mesNum: 3,  fechaIni: '28/02/2025', fechaFin: '30/03/2025', vInicio: 19, picInicio: 513, vFin: 19, picFin: 543, dias: 31, estado: 'Cerrado', fechaCierre: '2025-03-30T23:59:59' },
  { id: 16, ano: 2025, mes: 'ABRIL',      mesNum: 4,  fechaIni: '31/03/2025', fechaFin: '29/04/2025', vInicio: 19, picInicio: 544, vFin: 19, picFin: 573, dias: 30, estado: 'Cerrado', fechaCierre: '2025-04-29T23:59:59' },
  { id: 17, ano: 2025, mes: 'MAYO',       mesNum: 5,  fechaIni: '30/04/2025', fechaFin: '29/05/2025', vInicio: 19, picInicio: 574, vFin: 19, picFin: 603, dias: 30, estado: 'Cerrado', fechaCierre: '2025-05-29T23:59:59' },
  { id: 18, ano: 2025, mes: 'JUNIO',      mesNum: 6,  fechaIni: '30/05/2025', fechaFin: '29/06/2025', vInicio: 19, picInicio: 604, vFin: 19, picFin: 634, dias: 31, estado: 'Cerrado', fechaCierre: '2025-06-29T23:59:59' },
  { id: 19, ano: 2025, mes: 'JULIO',      mesNum: 7,  fechaIni: '30/06/2025', fechaFin: '30/07/2025', vInicio: 19, picInicio: 635, vFin: 19, picFin: 665, dias: 31, estado: 'Cerrado', fechaCierre: '2025-07-30T23:59:59' },
  { id: 20, ano: 2025, mes: 'AGOSTO',     mesNum: 8,  fechaIni: '31/07/2025', fechaFin: '29/08/2025', vInicio: 19, picInicio: 666, vFin: 19, picFin: 695, dias: 30, estado: 'Cerrado', fechaCierre: '2025-08-29T23:59:59' },
  { id: 21, ano: 2025, mes: 'SEPTIEMBRE', mesNum: 9,  fechaIni: '30/08/2025', fechaFin: '28/09/2025', vInicio: 19, picInicio: 696, vFin: 19, picFin: 725, dias: 30, estado: 'Cerrado', fechaCierre: '2025-09-28T23:59:59' },
  { id: 22, ano: 2025, mes: 'OCTUBRE',    mesNum: 10, fechaIni: '29/09/2025', fechaFin: '29/10/2025', vInicio: 19, picInicio: 726, vFin: 19, picFin: 756, dias: 31, estado: 'Cerrado', fechaCierre: '2025-10-29T23:59:59' },
  { id: 23, ano: 2025, mes: 'NOVIEMBRE',  mesNum: 11, fechaIni: '30/10/2025', fechaFin: '28/11/2025', vInicio: 19, picInicio: 757, vFin: 19, picFin: 786, dias: 30, estado: 'Cerrado', fechaCierre: '2025-11-28T23:59:59' },
  { id: 24, ano: 2025, mes: 'DICIEMBRE',  mesNum: 12, fechaIni: '29/11/2025', fechaFin: '28/12/2025', vInicio: 19, picInicio: 787, vFin: 19, picFin: 816, dias: 30, estado: 'Cerrado', fechaCierre: '2025-12-28T23:59:59' },

  // --- AÑO 2026 (11 Períodos - Transición Vuelta 19 a 20) ---
  { id: 25, ano: 2026, mes: 'ENERO',      mesNum: 1,  fechaIni: '29/12/2025', fechaFin: '28/01/2026', vInicio: 19, picInicio: 817, vFin: 19, picFin: 847, dias: 31, estado: 'Cerrado', fechaCierre: '2026-01-28T23:59:59' },
  { id: 26, ano: 2026, mes: 'FEBRERO',    mesNum: 2,  fechaIni: '29/01/2026', fechaFin: '26/02/2026', vInicio: 19, picInicio: 848, vFin: 19, picFin: 876, dias: 29, estado: 'Cerrado', fechaCierre: '2026-02-26T23:59:59' },
  { id: 27, ano: 2026, mes: 'MARZO',      mesNum: 3,  fechaIni: '27/02/2026', fechaFin: '29/03/2026', vInicio: 19, picInicio: 877, vFin: 19, picFin: 907, dias: 31, estado: 'Cerrado', fechaCierre: '2026-03-29T23:59:59' },
  { id: 28, ano: 2026, mes: 'ABRIL',      mesNum: 4,  fechaIni: '30/03/2026', fechaFin: '28/04/2026', vInicio: 19, picInicio: 908, vFin: 19, picFin: 937, dias: 30, estado: 'Cerrado', fechaCierre: '2026-04-28T23:59:59' },
  { id: 29, ano: 2026, mes: 'MAYO',       mesNum: 5,  fechaIni: '29/04/2026', fechaFin: '28/05/2026', vInicio: 19, picInicio: 938, vFin: 19, picFin: 967, dias: 30, estado: 'Cerrado', fechaCierre: '2026-05-28T23:59:59' },
  { id: 30, ano: 2026, mes: 'JUNIO',      mesNum: 6,  fechaIni: '29/05/2026', fechaFin: '28/06/2026', vInicio: 19, picInicio: 968, vFin: 19, picFin: 998, dias: 31, estado: 'Cerrado', fechaCierre: '2026-06-28T23:59:59' },
  { id: 31, ano: 2026, mes: 'JULIO',      mesNum: 7,  fechaIni: '29/06/2026', fechaFin: '29/07/2026', vInicio: 19, picInicio: 999, vFin: 20, picFin: 29,  dias: 31, estado: 'Cerrado', fechaCierre: '2026-07-29T23:59:59' },
  { id: 32, ano: 2026, mes: 'AGOSTO',     mesNum: 8,  fechaIni: '30/07/2026', fechaFin: '29/08/2026', vInicio: 20, picInicio: 30,  vFin: 20, picFin: 60,  dias: 31, estado: 'Cerrado', fechaCierre: '2026-08-29T23:59:59' },
  { id: 33, ano: 2026, mes: 'SEPTIEMBRE', mesNum: 9,  fechaIni: '30/08/2026', fechaFin: '28/09/2026', vInicio: 20, picInicio: 61,  vFin: 20, picFin: 90,  dias: 30, estado: 'Cerrado', fechaCierre: '2026-09-28T23:59:59' },
  { id: 34, ano: 2026, mes: 'OCTUBRE',    mesNum: 10, fechaIni: '29/09/2026', fechaFin: '29/10/2026', vInicio: 20, picInicio: 91,  vFin: 20, picFin: 121, dias: 31, estado: 'Cerrado', fechaCierre: '2026-10-29T23:59:59' },
  { id: 35, ano: 2026, mes: 'NOVIEMBRE',  mesNum: 11, fechaIni: '30/10/2026', fechaFin: '',           vInicio: 20, picInicio: 122, vFin: null, picFin: null, dias: null, estado: 'Abierto', fechaCierre: null }
];
