/* ResultsScene proxies to existing results modal; keeps rendering noop. */
(function () {
  function ResultsScene() {}
  ResultsScene.prototype.onEnter = function () {
    // The game handles showing the results modal when a session completes
    // This scene exists to enable future routing to a summary screen
  };
  ResultsScene.prototype.update = function () {};
  ResultsScene.prototype.render = function () {};
  ResultsScene.prototype.handleInput = function (evt) {
    // Future: route keys to play again / new session
  };
  window.ResultsScene = ResultsScene;
})();
