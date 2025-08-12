/* Minimal stub that mirrors existing game as a future mini-game.
   Not wired yet: this is for incremental migration. */
(function () {
  function DirectionalPractice() {
    this.id = 'directional-practice';
    this.name = 'Directional Practice';
    this.description = 'Collect targets using directional inputs.';
    this.defaults = {};
  }
  DirectionalPractice.prototype.init = function (ctx, config, services) {
    // Later: mount current game state here
    this._ctx = ctx; this._config = config; this._services = services;
  };
  DirectionalPractice.prototype.update = function (dt) {};
  DirectionalPractice.prototype.render = function (ctx) {};
  DirectionalPractice.prototype.handleInput = function (evt) {};
  DirectionalPractice.prototype.getResults = function () { return {}; };
  DirectionalPractice.prototype.getReplayCode = function () { return ''; };
  DirectionalPractice.prototype.applyReplayCode = function (code) { return null; };

  // Auto-register stub for discovery (harmless until used)
  if (window.MiniGames) {
    try { window.MiniGames.register(new DirectionalPractice()); } catch (e) { /* ignore */ }
  }
})();
