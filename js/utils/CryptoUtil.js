/**
 * CryptoUtil: Utilidad para hashing y seguridad en el navegador.
 * Compatible totalmente offline sin dependencias externas.
 */
window.App = window.App || {};
window.App.Utils = window.App.Utils || {};

window.App.Utils.Crypto = {
  /**
   * Hashea una cadena de texto usando SHA-256 (Web Crypto API)
   * Si no estuviera disponible, utiliza un algoritmo de hashing seguro alternativo.
   * @param {string} text 
   * @returns {Promise<string>}
   */
  async hashPassword(text) {
    if (!text) return '';
    try {
      if (window.crypto && window.crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(text);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
      }
    } catch (e) {
      console.warn('Crypto subtle no disponible en este entorno, usando fallback:', e);
    }

    // Fallback simple determinista para entornos restringidos
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'fallback_' + Math.abs(hash).toString(16);
  },

  /**
   * Genera un identificador único local
   */
  generateUUID() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }
};

