/* Mini-game registry to discover/select games by id */
(function () {
  function Registry() { this._map = new Map(); }
  Registry.prototype.register = function (game) {
    if (!game || !game.id) throw new Error('Mini-game must have an id');
    this._map.set(game.id, game);
  };
  Registry.prototype.get = function (id) { return this._map.get(id); };
  Registry.prototype.list = function () { return Array.from(this._map.values()); };
  window.MiniGames = new Registry();
})();
