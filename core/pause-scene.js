/* PauseScene now extends BaseModalScene for unified accessible modal handling. */
(function () {
  function PauseScene() {
    if (typeof BaseModalScene === 'function') BaseModalScene.call(this);
    this._listenersBound = false;
    this._cleanup = null;
  }
  if (typeof BaseModalScene === 'function') {
    PauseScene.prototype = Object.create(BaseModalScene.prototype);
    PauseScene.prototype.constructor = PauseScene;
  }
  PauseScene.prototype.onEnter = function () {
    var self = this;
    var modal = (typeof this.openModal === 'function') ? this.openModal('pause-modal') : document.getElementById('pause-modal');
    if (!modal) return;
    this.onEscClose = function () { if (window.game) { window.game.hidePauseModal(); window.game.resumeGame(); } };
    if (!this._listenersBound) {
      var resumeSessionBtn = document.getElementById('resume-session-btn');
      var quitSessionBtn = document.getElementById('quit-session-btn');
      var handleResume = function () { if (typeof self.closeModal === 'function') self.closeModal(); if (window.game) { window.game.hidePauseModal(); window.game.resumeGame(); } };
      var handleQuit = function () { if (typeof self.closeModal === 'function') self.closeModal(); if (window.game) { window.game.hidePauseModal(); window.game.returnToMainMenu(); } };
      if (resumeSessionBtn) resumeSessionBtn.addEventListener('click', handleResume);
      if (quitSessionBtn) quitSessionBtn.addEventListener('click', handleQuit);
      this._cleanup = function () {
        if (resumeSessionBtn) resumeSessionBtn.removeEventListener('click', handleResume);
        if (quitSessionBtn) quitSessionBtn.removeEventListener('click', handleQuit);
      };
      this._listenersBound = true;
    }
  };
  PauseScene.prototype.onExit = function () {
    if (typeof this.closeModal === 'function') this.closeModal();
    if (this._cleanup) this._cleanup();
    this._listenersBound = false;
  };
  window.PauseScene = PauseScene;
})();
