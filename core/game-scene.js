/* GameScene wraps the existing DirectionalSkillsGame to enable SceneManager control. */
(function () {
  function GameScene(options) {
    this.options = options || {};
    this.instance = null;
  }
  GameScene.prototype.onEnter = function () {
    // Expect the page has created a DirectionalSkillsGame already
    if (window.game) {
      this.instance = window.game;
      window.__SCENE_ENGINE_ACTIVE__ = true;
    }
  };
  GameScene.prototype.onExit = function () {
    window.__SCENE_ENGINE_ACTIVE__ = false;
  };
  GameScene.prototype.update = function (dt) {
    // Lazy bind in case window.game was created after onEnter
    if (!this.instance && window.game) {
      this.instance = window.game;
      window.__SCENE_ENGINE_ACTIVE__ = true;
    }
    if (!this.instance) return;
    // Delegate to original update
    try { this.instance.update(dt); } catch (e) { /* ignore */ }
  };
  GameScene.prototype.render = function (ctx) {
    if (!this.instance && window.game) {
      this.instance = window.game;
      window.__SCENE_ENGINE_ACTIVE__ = true;
    }
    if (!this.instance) return;
    try { this.instance.render(ctx); } catch (e) { /* ignore */ }
  };
  window.GameScene = GameScene;
})();
