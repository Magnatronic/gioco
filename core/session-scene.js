/* SessionScene now extends BaseModalScene for unified accessible modal handling. */
(function () {
  function SessionScene() {
    if (typeof BaseModalScene === 'function') BaseModalScene.call(this);
    this._listenersBound = false;
    this._cleanup = null;
  }
  if (typeof BaseModalScene === 'function') {
    SessionScene.prototype = Object.create(BaseModalScene.prototype);
    SessionScene.prototype.constructor = SessionScene;
  }
  SessionScene.prototype.onEnter = function () {
  if(window.game && window.game._log){ window.game._log('[SessionScene] onEnter invoked'); }
    var self = this;
    var modal = (typeof this.openModal === 'function') ? this.openModal('session-modal') : document.getElementById('session-modal');
    if (!modal) return;
    // Populate session form and generate initial replay code
    if (window.game) {
      try {
        if (typeof window.game.loadSessionConfigToForm === 'function') {
          window.game.loadSessionConfigToForm();
        }
        if (typeof window.game.updateLiveReplayCode === 'function') {
          window.game.updateLiveReplayCode();
        }
      } catch (e) {}
    }
  // Do NOT force a switch back to menu on close; just close the modal. The game manages scene changes.
  this.onEscClose = function () { /* Intentionally left blank: avoid unintended menu switch */ };
    if (!this._listenersBound) {
      var sessionClose = modal.querySelector('.modal-close');
      var startSession = document.getElementById('start-session');
      var cancelSession = document.getElementById('cancel-session');
  if(window.game && window.game._log){ window.game._log('[SessionScene] Binding listeners', { hasClose: !!sessionClose, hasStart: !!startSession, hasCancel: !!cancelSession }); }
  var handleClose = function () { if (typeof self.closeModal === 'function') self.closeModal(); };
      var handleStart = function () {
  if(window.game && window.game._log){ window.game._log('[SessionScene] Start button clicked'); }
        if (window.game && typeof window.game.startNewSession === 'function') {
          window.game.startNewSession();
        } else {
          console.warn('[SessionScene] window.game.startNewSession missing');
        }
        handleClose();
      };
      if (sessionClose) sessionClose.addEventListener('click', handleClose);
      if (cancelSession) cancelSession.addEventListener('click', handleClose);
      if (startSession) startSession.addEventListener('click', handleStart);
      this._cleanup = function () {
        if (sessionClose) sessionClose.removeEventListener('click', handleClose);
        if (cancelSession) cancelSession.removeEventListener('click', handleClose);
        if (startSession) startSession.removeEventListener('click', handleStart);
      };
      this._listenersBound = true;
    }
  };
  SessionScene.prototype.onExit = function () {
    if (typeof this.closeModal === 'function') this.closeModal();
    if (this._cleanup) this._cleanup();
    this._listenersBound = false;
  };
  window.SessionScene = SessionScene;
})();
