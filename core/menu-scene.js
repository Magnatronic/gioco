/* MenuScene proxies to existing main menu DOM; keeps rendering noop. */
(function () {
  function MenuScene() {}
  MenuScene.prototype.onEnter = function () {
    if (window.game) {
      window.game.showMainMenu();
    }
  };
  MenuScene.prototype.update = function () {};
  MenuScene.prototype.render = function () {};
  MenuScene.prototype.handleInput = function (evt) {
    // Future: route keys to menu navigation
  };
  window.MenuScene = MenuScene;
})();
