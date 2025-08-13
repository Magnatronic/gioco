/* Lightweight Engine loop that drives SceneManager with delta time */
(function () {
  function Engine(ctx) {
    this.ctx = ctx || null;
    this.running = false;
    this._last = 0;
    this._sm = null;
  }
  Engine.prototype.start = function (sceneManager) {
    if (!sceneManager) throw new Error('Engine requires a SceneManager');
    this._sm = sceneManager;
    this.running = true;
    this._last = performance.now();
    const loop = (t) => {
      if (!this.running) return;
      const dt = (t - this._last) / 1000;
      this._last = t;
      try { this._sm.update(dt); } catch (e) { console.warn('Scene update error', e); }
      try { this._sm.render(this.ctx); } catch (e) { console.warn('Scene render error', e); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };
  Engine.prototype.stop = function () { this.running = false; };
  window.Engine = Engine;
})();
