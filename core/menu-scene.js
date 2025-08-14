/* MenuScene proxies to existing main menu DOM; manages start/replay transitions. */
(function () {
  function MenuScene() {
    this._bound = false;
    this._handlers = {};
  }
  MenuScene.prototype.onEnter = function () {
    if (window.game) {
      window.game.showMainMenu();
    }
    // Attach lightweight scene-owned listeners to switch to main scene
    if (!this._bound) {
      var self = this;
      // Cache focusables for simple arrow navigation
      this._focusables = (function () {
        var list = [];
        var a = document.querySelectorAll('.menu-cards .menu-card');
        var b = document.querySelectorAll('.menu-secondary .secondary-btn');
        a.forEach(function (n) { list.push(n); });
        b.forEach(function (n) { list.push(n); });
        return list;
      })();
      this._focusIndex = 0;
      // Current button IDs in index.html
      var sessionBtn = document.getElementById('configure-session-btn');
      var replayBtn = document.getElementById('play-replay-btn');
      var statsBtn = document.getElementById('progress-history-btn');
      var helpBtn = document.getElementById('help-support-btn');

      // Proxy handlers to existing game methods (which handle pause + scene switch)
      this._handlers.onOpenSession = function () {
  if(window.game && window.game._log){ window.game._log('[MenuScene] Create Game button clicked'); }
        var g = window.game;
  if(window.game && window.game._log){ window.game._log('[MenuScene] typeof window.game:', typeof g, 'has openSessionSetup:', g ? typeof g.openSessionSetup : 'n/a'); }
        try {
          if (g && typeof g.openSessionSetup === 'function') {
            g.openSessionSetup();
          } else {
            console.warn('[MenuScene] openSessionSetup missing; NOT falling back (to expose root cause).');
          }
        } catch (err) {
          console.error('[MenuScene] Error calling openSessionSetup:', err);
        }
      };
      this._handlers.onOpenReplay = function () {
  if(window.game && window.game._log){ window.game._log('[MenuScene] Play Replay Code button clicked'); }
        if (window.game && typeof window.game.openReplayEntry === 'function') {
          window.game.openReplayEntry();
        } else {
          var modal = document.getElementById('replay-modal');
          if (modal) { try { if (typeof modal.showModal === 'function') modal.showModal(); else { modal.setAttribute('open',''); modal.style.display='block'; } } catch (e) {} }
        }
      };
      this._handlers.onOpenStats = function () {
  if(window.game && window.game._log){ window.game._log('[MenuScene] Progress & History button clicked'); }
        if (window.game && typeof window.game.openStats === 'function') {
          window.game.openStats();
        }
      };
      this._handlers.onOpenHelp = function () {
  if(window.game && window.game._log){ window.game._log('[MenuScene] Help & Support button clicked'); }
        if (window.game && typeof window.game.openHelp === 'function') {
          window.game.openHelp();
        }
      };
      // Ensure first card is focused for keyboard users
      this._handlers.focusInitial = function () {
        if (self._focusables && self._focusables[0]) {
          try { self._focusables[0].focus(); } catch (e) {}
        }
      };

  if (sessionBtn) sessionBtn.addEventListener('click', this._handlers.onOpenSession);
  if (replayBtn) replayBtn.addEventListener('click', this._handlers.onOpenReplay);
  if (statsBtn) statsBtn.addEventListener('click', this._handlers.onOpenStats);
  if (helpBtn) helpBtn.addEventListener('click', this._handlers.onOpenHelp);
      // Give the DOM a tick to render, then focus the first menu card
      setTimeout(this._handlers.focusInitial, 0);
        // Keyboard navigation for menu cards
        var menu = document.getElementById('main-menu');
        var cards = Array.from(menu.querySelectorAll('.menu-card'));
        var live = document.getElementById('game-status');
        var focusIdx = 0;
        function focusCard(idx) {
          if (cards[idx]) {
            cards[idx].focus();
            if (live) live.textContent = cards[idx].getAttribute('aria-label') || cards[idx].textContent;
          }
        }
        this._handlers.onMenuKeydown = function (e) {
          var key = e.key;
          var active = document.activeElement;
          var idx = cards.indexOf(active);
          if (key === 'ArrowDown' || key === 'ArrowRight') {
            e.preventDefault();
            var next = (idx + 1) % cards.length;
            focusCard(next);
          } else if (key === 'ArrowUp' || key === 'ArrowLeft') {
            e.preventDefault();
            var prev = (idx - 1 + cards.length) % cards.length;
            focusCard(prev);
          } else if (key === 'Tab') {
            // Tab/Shift+Tab: cycle focus
            e.preventDefault();
            var dir = e.shiftKey ? -1 : 1;
            var nextIdx = (idx + dir + cards.length) % cards.length;
            focusCard(nextIdx);
          } else if (key === 'Enter' || key === ' ') {
            e.preventDefault();
            if (active && typeof active.click === 'function') active.click();
          } else if (key === 'Escape') {
            e.preventDefault();
            focusCard(0);
          }
        };
        // Make cards tabbable
        cards.forEach(function (btn) { btn.setAttribute('tabindex', '0'); });
        // Focus first card on menu entry
        setTimeout(function () { focusCard(0); }, 10);
        menu.addEventListener('keydown', this._handlers.onMenuKeydown);
      this._bound = true;
    }
  };
  MenuScene.prototype.onExit = function () {
    // Keep menu DOM intact but remove our listeners to avoid duplicates
    if (this._bound) {
  var sessionBtn = document.getElementById('configure-session-btn');
  var replayBtn = document.getElementById('play-replay-btn');
  var statsBtn = document.getElementById('progress-history-btn');
  var helpBtn = document.getElementById('help-support-btn');
  if (sessionBtn && this._handlers.onOpenSession) sessionBtn.removeEventListener('click', this._handlers.onOpenSession);
  if (replayBtn && this._handlers.onOpenReplay) replayBtn.removeEventListener('click', this._handlers.onOpenReplay);
  if (statsBtn && this._handlers.onOpenStats) statsBtn.removeEventListener('click', this._handlers.onOpenStats);
  if (helpBtn && this._handlers.onOpenHelp) helpBtn.removeEventListener('click', this._handlers.onOpenHelp);
    }
    // Remove listeners and restore tab order
    var menu = document.getElementById('main-menu');
    var cards = Array.from(menu.querySelectorAll('.menu-card'));
    cards.forEach(function (btn) { btn.setAttribute('tabindex', '-1'); });
    if (this._handlers && this._handlers.onMenuKeydown) {
      menu.removeEventListener('keydown', this._handlers.onMenuKeydown);
    }
    this._handlers = {};
    this._bound = false;
  };
  MenuScene.prototype.update = function () {};
  MenuScene.prototype.render = function () {};
  MenuScene.prototype.handleInput = function (evt) {
  // Arrow-key navigation across menu cards/buttons; Enter/Space to activate
    if (!evt || evt.type !== 'keydown') return;
    var key = evt.key;
    if (!this._focusables || this._focusables.length === 0) return;
    var max = this._focusables.length - 1;
    var handled = false;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      this._focusIndex = Math.min(max, this._focusIndex + 1);
      handled = true;
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      this._focusIndex = Math.max(0, this._focusIndex - 1);
      handled = true;
    } else if (key === 'Home') { this._focusIndex = 0; handled = true; }
    else if (key === 'End') { this._focusIndex = max; handled = true; }
    else if (key === 'Enter' || key === ' ') {
      var active = document.activeElement;
      if (active && (active.classList.contains('menu-card') || active.classList.contains('secondary-btn'))) {
        try { active.click(); } catch (e) {}
        handled = true;
      }
    }
    if (handled) {
      try { evt.preventDefault(); evt.stopPropagation(); } catch (e) {}
      var el = this._focusables[this._focusIndex];
      if (el && document.activeElement !== el) {
        try { el.focus(); } catch (e) {}
      }
    }
  };
  window.MenuScene = MenuScene;
})();
