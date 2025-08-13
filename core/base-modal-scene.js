/* BaseModalScene utility providing consistent accessible modal handling (focus trap, ESC close, focus restore). */
(function () {
  function BaseModalScene() {
    this._modal = null;
    this._prevFocus = null;
    this._focusTrapHandler = null;
    this._keydownHandler = null;
  }
  BaseModalScene.prototype._getFocusable = function (root) {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ));
  };
  BaseModalScene.prototype.openModal = function (modalId, opts) {
    opts = opts || {};
    var focusSelector = opts.focusSelector;
    var closeOnEsc = opts.closeOnEsc !== false; // default true
    var modal = document.getElementById(modalId);
    if (!modal) return null;
    this._modal = modal;
    this._prevFocus = document.activeElement;
    if (typeof modal.showModal === 'function' && !modal.open) {
      try { modal.showModal(); } catch (e) { console.warn('[BaseModalScene] showModal failed, using fallback', e); }
    } else if (!modal.open) {
      // Fallback for browsers without <dialog> support
      modal.setAttribute('open', '');
      modal.style.display = 'block';
      modal.classList.add('modal-fallback-open');
    }
    // Set role/ARIA helpers if missing
    if (!modal.getAttribute('role')) modal.setAttribute('role', 'dialog');
    if (!modal.getAttribute('aria-modal')) modal.setAttribute('aria-modal', 'true');

    // Initial focus
    var focusTarget = null;
    if (focusSelector) focusTarget = modal.querySelector(focusSelector);
    if (!focusTarget) {
      var list = this._getFocusable(modal);
      focusTarget = list.length ? list[0] : null;
    }
    if (focusTarget) try { focusTarget.focus(); } catch (e) {}

    var self = this;
    // Focus trap
    this._focusTrapHandler = function () {
      if (!self._modal || !self._modal.open) return;
      if (!self._modal.contains(document.activeElement)) {
        var list = self._getFocusable(self._modal);
        if (list.length) list[0].focus();
      }
    };
    document.addEventListener('focus', this._focusTrapHandler, true);

    // ESC close
    if (closeOnEsc) {
      this._keydownHandler = function (e) {
        if (e.key === 'Escape') {
          self.closeModal();
          if (typeof self.onEscClose === 'function') {
            try { self.onEscClose(); } catch (err) {}
          }
        }
      };
      document.addEventListener('keydown', this._keydownHandler);
    }
    return modal;
  };
  BaseModalScene.prototype.closeModal = function () {
    if (this._modal) {
      if (this._modal.open && typeof this._modal.close === 'function') {
        try { this._modal.close(); } catch (e) {}
      } else if (this._modal.classList.contains('modal-fallback-open')) {
        this._modal.style.display = 'none';
        this._modal.classList.remove('modal-fallback-open');
        this._modal.removeAttribute('open');
      }
    }
    if (this._focusTrapHandler) {
      document.removeEventListener('focus', this._focusTrapHandler, true);
      this._focusTrapHandler = null;
    }
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }
    // Restore focus
    if (this._prevFocus && typeof this._prevFocus.focus === 'function' && document.contains(this._prevFocus)) {
      try { this._prevFocus.focus(); } catch (e) {}
    }
    this._modal = null;
  };
  window.BaseModalScene = BaseModalScene;
})();
