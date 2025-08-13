/* Tiny pub/sub event bus for decoupling UI and game services */
(function () {
  function Events() {
    this._map = new Map();
  }
  Events.prototype.on = function (name, handler) {
    if (!this._map.has(name)) this._map.set(name, new Set());
    this._map.get(name).add(handler);
    return () => this.off(name, handler);
  };
  Events.prototype.off = function (name, handler) {
    const set = this._map.get(name);
    if (set) set.delete(handler);
  };
  Events.prototype.emit = function (name, payload) {
    const set = this._map.get(name);
    if (set) set.forEach(fn => { try { fn(payload); } catch (e) { console.warn('Events listener error', e); } });
  };
  window.Events = Events;
})();
