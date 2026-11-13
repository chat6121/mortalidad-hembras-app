/**
 * app.js: Punto de entrada principal de la aplicación
 * Carga e inicializa el modelo, la base de datos IndexedDB y los controladores.
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Inicializar la persistencia en IndexedDB
    await window.App.Models.Database.init();
    console.log('IndexedDB inicializada y sincronizada correctamente.');

    // 2. Comprobar que la sumatoria de los LNV + LNM + LNMom sea = LNT al cargar el sistema
    if (window.App.Models.Partos && typeof window.App.Models.Partos.verifyIntegrity === 'function') {
      const integrity = await window.App.Models.Partos.verifyIntegrity({ autoFix: true });
      if (integrity.isClean) {
        console.log(`%c[Auditoría Matemática de Partos] Verificación al cargar el sistema: ${integrity.total}/${integrity.total} registros cumplen LNV + LNM + LNMom = LNT (100% íntegro).`, 'color: #10b981; font-weight: bold;');
      } else {
        console.warn(`%c[Auditoría Matemática de Partos] Inconsistencias detectadas y corregidas al cargar el sistema: ${integrity.errorCount} registros ajustados para cumplir LNV + LNM + LNMom = LNT.`, 'color: #f59e0b; font-weight: bold;', integrity.discrepancies);
      }
    }

    // 3. Inicializar controladores
    window.App.Controllers.App.init();
    window.App.Controllers.Auth.init();
    window.App.Controllers.User.init();
    window.App.Controllers.Role.init();

    // 4. Iniciar sincronización de fondo con Google Sheets desde el arranque del sistema
    if (window.App.Models.Hembras) {
      window.App.Models.Hembras.init().then(() => {
        if (navigator.onLine && window.App.Models.Hembras.gasWebAppUrl) {
          window.App.Models.Hembras.syncFromSheets(false);
        }
      });
    }

    // 5. Comprobar si existe una sesión previa restaurable
    const hasSession = await window.App.Controllers.Auth.checkExistingSession();
    if (!hasSession) {
      window.App.Views.Layout.showAuth();
    }
  } catch (error) {
    console.error('Error crítico al iniciar la aplicación:', error);
    alert('Ocurrió un error al inicializar el almacenamiento local del navegador: ' + error.message);
  }
});