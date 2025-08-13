/* StatsScene now extends BaseModalScene for unified accessible modal handling. */
(function () {
  function StatsScene() {
    if (typeof BaseModalScene === 'function') BaseModalScene.call(this);
    this._listenersBound = false;
    this._cleanup = null;
  }
  if (typeof BaseModalScene === 'function') {
    StatsScene.prototype = Object.create(BaseModalScene.prototype);
    StatsScene.prototype.constructor = StatsScene;
  }
  StatsScene.prototype.onEnter = function () {
    var self = this;
    var modal = (typeof this.openModal === 'function') ? this.openModal('stats-modal') : document.getElementById('stats-modal');
    if (!modal) return;
    this.onEscClose = function () { try { if (window.sceneManager) window.sceneManager.switch('menu'); } catch (e) {} };
    if (!this._listenersBound) {
      var statsClose = modal.querySelector('.modal-close');
      var closeStats = document.getElementById('close-stats');
      var handleClose = function () { if (typeof self.closeModal === 'function') self.closeModal(); self.onEscClose(); };
      if (statsClose) statsClose.addEventListener('click', handleClose);
      if (closeStats) closeStats.addEventListener('click', handleClose);
      this._cleanup = function () {
        if (statsClose) statsClose.removeEventListener('click', handleClose);
        if (closeStats) closeStats.removeEventListener('click', handleClose);
      };
      this._listenersBound = true;
    }
  };
  StatsScene.prototype.onExit = function () {
    if (typeof this.closeModal === 'function') this.closeModal();
    if (this._cleanup) this._cleanup();
    this._listenersBound = false;
  };
  window.StatsScene = StatsScene;
})();
