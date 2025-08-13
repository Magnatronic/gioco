/* ReplayScene now extends BaseModalScene for unified accessible modal handling. */
(function () {
  function ReplayScene() {
    if (typeof BaseModalScene === 'function') BaseModalScene.call(this);
    this._listenersBound = false;
    this._cleanup = null;
  }
  if (typeof BaseModalScene === 'function') {
    ReplayScene.prototype = Object.create(BaseModalScene.prototype);
    ReplayScene.prototype.constructor = ReplayScene;
  }
  ReplayScene.prototype.onEnter = function () {
    var self = this;
    var modal = (typeof this.openModal === 'function') ? this.openModal('replay-modal') : document.getElementById('replay-modal');
    if (!modal) return;
  // Prevent automatic jump back to menu; game logic decides scene changes
  this.onEscClose = function () { /* no-op */ };
    if (!this._listenersBound) {
      var replayClose = modal.querySelector('.modal-close');
      var startReplay = document.getElementById('start-replay');
      var cancelReplay = document.getElementById('cancel-replay');
  var handleClose = function () { if (typeof self.closeModal === 'function') self.closeModal(); };
      if (replayClose) replayClose.addEventListener('click', handleClose);
      if (cancelReplay) cancelReplay.addEventListener('click', handleClose);
      if (startReplay) startReplay.addEventListener('click', function () {
        if (window.game) window.game.startReplaySession();
        handleClose();
      });
      this._cleanup = function () {
        if (replayClose) replayClose.removeEventListener('click', handleClose);
        if (cancelReplay) cancelReplay.removeEventListener('click', handleClose);
        if (startReplay) startReplay.removeEventListener('click', handleClose);
      };
      this._listenersBound = true;
    }
  };
  ReplayScene.prototype.onExit = function () {
    if (typeof this.closeModal === 'function') this.closeModal();
    if (this._cleanup) this._cleanup();
    this._listenersBound = false;
  };
  window.ReplayScene = ReplayScene;
})();
