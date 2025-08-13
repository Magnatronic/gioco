/* SettingsScene now extends BaseModalScene for unified accessible modal handling. */
(function () {
  function SettingsScene() {
    if (typeof BaseModalScene === 'function') BaseModalScene.call(this);
    this._listenersBound = false;
    this._cleanup = null;
  }
  if (typeof BaseModalScene === 'function') {
    SettingsScene.prototype = Object.create(BaseModalScene.prototype);
    SettingsScene.prototype.constructor = SettingsScene;
  }
  SettingsScene.prototype.onEnter = function () {
    var self = this;
    var modal = (typeof this.openModal === 'function') ? this.openModal('settings-modal') : document.getElementById('settings-modal');
    if (!modal) return;
    this.onEscClose = function () { try { if (window.sceneManager) window.sceneManager.switch('menu'); } catch (e) {} };
    if (!this._listenersBound) {
      var settingsClose = modal.querySelector('.modal-close');
      var saveSettings = document.getElementById('save-settings');
      var cancelSettings = document.getElementById('cancel-settings');
      var handleClose = function () { if (typeof self.closeModal === 'function') self.closeModal(); self.onEscClose(); };
      if (settingsClose) settingsClose.addEventListener('click', handleClose);
      if (cancelSettings) cancelSettings.addEventListener('click', handleClose);
      if (saveSettings) saveSettings.addEventListener('click', function () {
        if (window.game) window.game.saveSettings();
        handleClose();
      });
      this._cleanup = function () {
        if (settingsClose) settingsClose.removeEventListener('click', handleClose);
        if (cancelSettings) cancelSettings.removeEventListener('click', handleClose);
        if (saveSettings) saveSettings.removeEventListener('click', handleClose);
      };
      this._listenersBound = true;
    }
  };
  SettingsScene.prototype.onExit = function () {
    if (typeof this.closeModal === 'function') this.closeModal();
    if (this._cleanup) this._cleanup();
    this._listenersBound = false;
  };
  window.SettingsScene = SettingsScene;
})();
