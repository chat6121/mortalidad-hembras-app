/**
 * Datos Semilla: Tabla Maestra de Salas, Maternidades, Áreas y Siglas de Granja
 * Estructura de infraestructura física de Maternidades (M1 a M5, Salas 1 a 41)
 * y Gestaciones (G1 a G11) asociadas a sus áreas operativas (EST / EXP) y siglas (E / X).
 */
window.App = window.App || {};
window.App.Data = window.App.Data || {};

window.App.Data.salasMaternidadesSeed = [
  // Maternidad M1 (Salas 1 a 8) - Área EST - Sigla E
  { id: 1, sala: 1, mat: 'M1', area: 'EST', sigla: 'E' },
  { id: 2, sala: 2, mat: 'M1', area: 'EST', sigla: 'E' },
  { id: 3, sala: 3, mat: 'M1', area: 'EST', sigla: 'E' },
  { id: 4, sala: 4, mat: 'M1', area: 'EST', sigla: 'E' },
  { id: 5, sala: 5, mat: 'M1', area: 'EST', sigla: 'E' },
  { id: 6, sala: 6, mat: 'M1', area: 'EST', sigla: 'E' },
  { id: 7, sala: 7, mat: 'M1', area: 'EST', sigla: 'E' },
  { id: 8, sala: 8, mat: 'M1', area: 'EST', sigla: 'E' },

  // Maternidad M2 (Salas 9 a 17) - Área EST - Sigla E
  { id: 9, sala: 9, mat: 'M2', area: 'EST', sigla: 'E' },
  { id: 10, sala: 10, mat: 'M2', area: 'EST', sigla: 'E' },
  { id: 11, sala: 11, mat: 'M2', area: 'EST', sigla: 'E' },
  { id: 12, sala: 12, mat: 'M2', area: 'EST', sigla: 'E' },
  { id: 13, sala: 13, mat: 'M2', area: 'EST', sigla: 'E' },
  { id: 14, sala: 14, mat: 'M2', area: 'EST', sigla: 'E' },
  { id: 15, sala: 15, mat: 'M2', area: 'EST', sigla: 'E' },
  { id: 16, sala: 16, mat: 'M2', area: 'EST', sigla: 'E' },
  { id: 17, sala: 17, mat: 'M2', area: 'EST', sigla: 'E' },

  // Maternidad M3 (Salas 18 a 24) - Área EST - Sigla E
  { id: 18, sala: 18, mat: 'M3', area: 'EST', sigla: 'E' },
  { id: 19, sala: 19, mat: 'M3', area: 'EST', sigla: 'E' },
  { id: 20, sala: 20, mat: 'M3', area: 'EST', sigla: 'E' },
  { id: 21, sala: 21, mat: 'M3', area: 'EST', sigla: 'E' },
  { id: 22, sala: 22, mat: 'M3', area: 'EST', sigla: 'E' },
  { id: 23, sala: 23, mat: 'M3', area: 'EST', sigla: 'E' },
  { id: 24, sala: 24, mat: 'M3', area: 'EST', sigla: 'E' },

  // Maternidad M4 (Salas 25 a 33) - Área EXP - Sigla X
  { id: 25, sala: 25, mat: 'M4', area: 'EXP', sigla: 'X' },
  { id: 26, sala: 26, mat: 'M4', area: 'EXP', sigla: 'X' },
  { id: 27, sala: 27, mat: 'M4', area: 'EXP', sigla: 'X' },
  { id: 28, sala: 28, mat: 'M4', area: 'EXP', sigla: 'X' },
  { id: 29, sala: 29, mat: 'M4', area: 'EXP', sigla: 'X' },
  { id: 30, sala: 30, mat: 'M4', area: 'EXP', sigla: 'X' },
  { id: 31, sala: 31, mat: 'M4', area: 'EXP', sigla: 'X' },
  { id: 32, sala: 32, mat: 'M4', area: 'EXP', sigla: 'X' },
  { id: 33, sala: 33, mat: 'M4', area: 'EXP', sigla: 'X' },

  // Maternidad M5 (Salas 34 a 41) - Área EXP - Sigla X
  { id: 34, sala: 34, mat: 'M5', area: 'EXP', sigla: 'X' },
  { id: 35, sala: 35, mat: 'M5', area: 'EXP', sigla: 'X' },
  { id: 36, sala: 36, mat: 'M5', area: 'EXP', sigla: 'X' },
  { id: 37, sala: 37, mat: 'M5', area: 'EXP', sigla: 'X' },
  { id: 38, sala: 38, mat: 'M5', area: 'EXP', sigla: 'X' },
  { id: 39, sala: 39, mat: 'M5', area: 'EXP', sigla: 'X' },
  { id: 40, sala: 40, mat: 'M5', area: 'EXP', sigla: 'X' },
  { id: 41, sala: 41, mat: 'M5', area: 'EXP', sigla: 'X' },

  // Gestaciones (G1 a G11)
  { id: 42, sala: null, mat: 'G1', area: 'EST', sigla: 'E' },
  { id: 43, sala: null, mat: 'G2', area: 'EST', sigla: 'E' },
  { id: 44, sala: null, mat: 'G3', area: 'EST', sigla: 'E' },
  { id: 45, sala: null, mat: 'G4', area: 'EST', sigla: 'E' },
  { id: 46, sala: null, mat: 'G5', area: 'EST', sigla: 'E' },
  { id: 47, sala: null, mat: 'G6', area: 'EXP', sigla: 'X' },
  { id: 48, sala: null, mat: 'G7', area: 'EXP', sigla: 'X' },
  { id: 49, sala: null, mat: 'G8', area: 'EXP', sigla: 'X' },
  { id: 50, sala: null, mat: 'G9', area: 'EXP', sigla: 'X' },
  { id: 51, sala: null, mat: 'G10', area: 'EST', sigla: 'E' },
  { id: 52, sala: null, mat: 'G11', area: 'EST', sigla: 'E' }
];

