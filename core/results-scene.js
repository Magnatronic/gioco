/* ResultsScene now extends BaseModalScene for unified accessible modal handling. */
(function () {
  function ResultsScene() {
    if (typeof BaseModalScene === 'function') BaseModalScene.call(this);
    this._listenersBound = false;
    this._cleanup = null;
  }
  if (typeof BaseModalScene === 'function') {
    ResultsScene.prototype = Object.create(BaseModalScene.prototype);
    ResultsScene.prototype.constructor = ResultsScene;
  }
  ResultsScene.prototype.onEnter = function () {
    var self = this;
    var modal = (typeof this.openModal === 'function') ? this.openModal('results-modal', { focusSelector: '#replay-game' }) : document.getElementById('results-modal');
    if (!modal) return;
    this.onEscClose = function () { try { if (window.sceneManager) window.sceneManager.switch('menu'); } catch (e) {} };
    if (!this._listenersBound) {
      var replayBtn = document.getElementById('replay-game');
      var newBtn = document.getElementById('new-session');
      var closeBtn = document.getElementById('close-results');
      var handleReplay = function () { if (typeof self.closeModal === 'function') self.closeModal(); try { if (window.sceneManager) window.sceneManager.switch('main'); } catch (e) {} };
      var handleNew = function () { if (typeof self.closeModal === 'function') self.closeModal(); try { if (window.sceneManager) window.sceneManager.switch('menu'); } catch (e) {} };
      var handleClose = handleNew;
      if (replayBtn) replayBtn.addEventListener('click', handleReplay);
      if (newBtn) newBtn.addEventListener('click', handleNew);
      if (closeBtn) closeBtn.addEventListener('click', handleClose);
      this._cleanup = function () {
        if (replayBtn) replayBtn.removeEventListener('click', handleReplay);
        if (newBtn) newBtn.removeEventListener('click', handleNew);
        if (closeBtn) closeBtn.removeEventListener('click', handleClose);
      };
      this._listenersBound = true;
    }
  };
  ResultsScene.prototype.onExit = function () {
    if (typeof this.closeModal === 'function') this.closeModal();
    if (this._cleanup) this._cleanup();
    this._listenersBound = false;
  };
  ResultsScene.prototype.update = function () {};
  ResultsScene.prototype.render = function () {};
  ResultsScene.prototype.handleInput = function () {};
  window.ResultsScene = ResultsScene;
})();
