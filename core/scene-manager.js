/*
 Lightweight Scene Manager for vanilla JS (no modules required)
 Usage:
   const sm = new window.SceneManager();
   sm.register('menu', new MenuScene());
   sm.switch('menu');
   // in loop: sm.update(dt); sm.render(ctx);
*/
(function () {
  function SceneManager() {
    this.current = null;
    this.scenes = new Map();
  }

  SceneManager.prototype.register = function (id, scene) {
  this.scenes.set(id, scene);
  if(window.game && window.game._log){ window.game._log('[SceneManager] Registered scene:', id); }
  };

  SceneManager.prototype.unregister = function (id) {
    this.scenes.delete(id);
  };

  SceneManager.prototype.switch = function (id, params) {
  if(window.game && window.game._log){ window.game._log('[SceneManager] Switching to scene:', id, 'with params:', params); }
    if (this.current && typeof this.current.onExit === 'function') {
      try { this.current.onExit(); } catch (e) { console.warn('Scene onExit error', e); }
    }
    const next = this.scenes.get(id);
    if (!next) {
      throw new Error('Scene not found: ' + id);
    }
    this.current = next;
    if (typeof next.onEnter === 'function') {
      try { next.onEnter(params || {}); } catch (e) { console.warn('Scene onEnter error', e); }
    }
  };

  SceneManager.prototype.update = function (dt) {
    if (this.current && typeof this.current.update === 'function') {
      this.current.update(dt);
    }
  };

  SceneManager.prototype.render = function (ctx) {
    if (this.current && typeof this.current.render === 'function') {
      this.current.render(ctx);
    }
  };

  // Optional: delegate input
  SceneManager.prototype.handleInput = function (evt) {
    if (this.current && typeof this.current.handleInput === 'function') {
      this.current.handleInput(evt);
    }
  };

  window.SceneManager = SceneManager;
})();
