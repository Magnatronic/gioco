/* HelpScene now extends BaseModalScene to provide unified accessible modal behavior. */
(function () {
  function HelpScene() {
    if (typeof BaseModalScene === 'function') BaseModalScene.call(this);
    this._listenersBound = false;
    this._cleanup = null;
  }
  if (typeof BaseModalScene === 'function') {
    HelpScene.prototype = Object.create(BaseModalScene.prototype);
    HelpScene.prototype.constructor = HelpScene;
  }
  HelpScene.prototype.onEnter = function () {
    var self = this;
    var modal = (typeof this.openModal === 'function') ? this.openModal('help-modal') : document.getElementById('help-modal');
    if (!modal) return;
    this.onEscClose = function () {
      try { if (window.sceneManager) window.sceneManager.switch('menu'); } catch (e) {}
    };
    if (!this._listenersBound) {
      var helpClose = modal.querySelector('.modal-close');
      var closeHelp = document.getElementById('close-help');
      var handleClose = function () {
        if (typeof self.closeModal === 'function') self.closeModal();
        self.onEscClose();
      };
      if (helpClose) helpClose.addEventListener('click', handleClose);
      if (closeHelp) closeHelp.addEventListener('click', handleClose);
      this._cleanup = function () {
        if (helpClose) helpClose.removeEventListener('click', handleClose);
        if (closeHelp) closeHelp.removeEventListener('click', handleClose);
      };
      this._listenersBound = true;
    }
  };
  HelpScene.prototype.onExit = function () {
    if (typeof this.closeModal === 'function') this.closeModal();
    if (this._cleanup) this._cleanup();
    this._listenersBound = false;
  };
  window.HelpScene = HelpScene;
})();
