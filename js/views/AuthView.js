/**
 * AuthView: Interfaz para el formulario de login y autenticación
 */
window.App = window.App || {};
window.App.Views = window.App.Views || {};

window.App.Views.Auth = {
  form: document.getElementById('login-form'),
  usernameInput: document.getElementById('login-username'),
  passwordInput: document.getElementById('login-password'),
  togglePasswordBtn: document.getElementById('toggle-password'),
  alertEl: document.getElementById('login-alert'),
  submitBtn: document.getElementById('btn-login-submit'),

  init() {
    if (this.togglePasswordBtn && this.passwordInput) {
      this.togglePasswordBtn.addEventListener('click', () => {
        const isPassword = this.passwordInput.type === 'password';
        this.passwordInput.type = isPassword ? 'text' : 'password';
      });
    }
  },

  getCredentials() {
    return {
      username: this.usernameInput.value.trim(),
      password: this.passwordInput.value
    };
  },

  showError(message) {
    if (this.alertEl) {
      this.alertEl.innerHTML = message;
      this.alertEl.style.display = 'block';
    }
  },

  hideError() {
    if (this.alertEl) {
      this.alertEl.innerHTML = '';
      this.alertEl.style.display = 'none';
    }
  },

  lockSubmitButton(seconds) {
    if (!this.submitBtn) return;
    let remaining = seconds;
    this.submitBtn.disabled = true;
    this.submitBtn.style.opacity = '0.6';
    const textSpan = this.submitBtn.querySelector('span');

    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        this.submitBtn.disabled = false;
        this.submitBtn.style.opacity = '1';
        if (textSpan) textSpan.textContent = 'Ingresar';
        this.hideError();
      } else {
        if (textSpan) textSpan.textContent = `Bloqueado (${remaining}s)`;
      }
    }, 1000);
  },

  clearForm() {
    if (this.usernameInput) this.usernameInput.value = '';
    if (this.passwordInput) this.passwordInput.value = '';
    this.hideError();
  },

  setLoading(isLoading) {
    if (!this.submitBtn) return;
    if (isLoading) {
      this.submitBtn.disabled = true;
      this.submitBtn.style.opacity = '0.7';
      this.submitBtn.querySelector('span').textContent = 'Ingresando...';
    } else {
      this.submitBtn.disabled = false;
      this.submitBtn.style.opacity = '1';
      this.submitBtn.querySelector('span').textContent = 'Ingresar';
    }
  }
};

