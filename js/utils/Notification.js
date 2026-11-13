/**
 * Notification: Gestor de notificaciones y avisos interactivos con SweetAlert2
 * Totalmente compatible offline con fallback automático.
 */
window.App = window.App || {};
window.App.Utils = window.App.Utils || {};

window.App.Utils.Notification = {
  // Toast configurable con SweetAlert2
  getToastMixin() {
    if (typeof Swal !== 'undefined') {
      return Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        padding: '0.45rem 0.8rem',
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer);
          toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
      });
    }
    return null;
  },

  /**
   * Muestra un Toast rápido
   */
  show(message, type = 'info') {
    const toast = this.getToastMixin();
    if (toast) {
      // Mapear tipos a SweetAlert2 (info, success, warning, error)
      const swalType = type === 'danger' ? 'error' : type;
      toast.fire({
        icon: swalType,
        title: message
      });
      return;
    }

    // Fallback nativo en caso de que no cargue la librería
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'danger'); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg) { this.show(msg, 'info'); },
  toast(msg, type = 'info') { this.show(msg, type); },

  /**
   * Muestra un aviso modal con SweetAlert2
   */
  async alert(title, htmlMessage, icon = 'info') {
    if (typeof Swal !== 'undefined') {
      return await Swal.fire({
        title: title,
        html: htmlMessage,
        icon: icon === 'danger' ? 'error' : icon,
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Aceptar',
        customClass: {
          popup: 'swal-custom-popup'
        }
      });
    } else {
      alert(`${title}\n${htmlMessage}`);
    }
  },

  /**
   * Muestra un diálogo de confirmación moderno con SweetAlert2
   * @returns {Promise<boolean>} Retorna true si el usuario aceptó
   */
  async confirm(title, htmlMessage, confirmBtnText = 'Sí, confirmar', isDanger = false) {
    if (typeof Swal !== 'undefined') {
      const result = await Swal.fire({
        title: title,
        html: htmlMessage,
        icon: isDanger ? 'warning' : 'question',
        showCancelButton: true,
        confirmButtonColor: isDanger ? '#ef4444' : '#4f46e5',
        cancelButtonColor: '#64748b',
        confirmButtonText: confirmBtnText,
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
        focusCancel: true
      });
      return result.isConfirmed;
    } else {
      return confirm(`${title}\n${htmlMessage}`);
    }
  }
};
