/**
 * Accessibility Manager
 * Handles screen reader announcements, focus management, and accessibility features
 */

class AccessibilityManager {
    constructor() {
        this.announceElement = null;
        this.alertElement = null;
        this.focusHistory = [];
        this.highContrastMode = false;
        this.reducedMotionMode = false;
        this.screenReaderActive = false;
        
        this.initialize();
        console.log('AccessibilityManager initialized');
    }
    
    /**
     * Initialize accessibility features
     */
    initialize() {
        this.setupAnnouncementElements();
        this.detectScreenReader();
        this.bindAccessibilityEvents();
        this.checkUserPreferences();
        this.setupHighContrastToggle();
        this.setupReducedMotionToggle();
    }
    
    /**
     * Setup screen reader announcement elements
     */
    setupAnnouncementElements() {
        this.announceElement = document.getElementById('sr-announcements');
        this.alertElement = document.getElementById('sr-alerts');
        
        if (!this.announceElement) {
            this.announceElement = document.createElement('div');
            this.announceElement.id = 'sr-announcements';
            this.announceElement.setAttribute('aria-live', 'polite');
            this.announceElement.className = 'sr-only';
            document.body.appendChild(this.announceElement);
        }
        
        if (!this.alertElement) {
            this.alertElement = document.createElement('div');
            this.alertElement.id = 'sr-alerts';
            this.alertElement.setAttribute('aria-live', 'assertive');
            this.alertElement.className = 'sr-only';
            document.body.appendChild(this.alertElement);
        }
    }
    
    /**
     * Detect if screen reader is active
     */
    detectScreenReader() {
        // Check for common screen reader indicators
        this.screenReaderActive = (
            navigator.userAgent.includes('NVDA') ||
            navigator.userAgent.includes('JAWS') ||
            window.speechSynthesis ||
            'speechSynthesis' in window
        );
        
        // Listen for screen reader events
        document.addEventListener('keydown', (e) => {
            // Screen reader navigation keys
            if (e.key === 'Insert' || e.key === 'CapsLock') {
                this.screenReaderActive = true;
            }
        });
    }
    
    /**
     * Bind accessibility-related event handlers
     */
    bindAccessibilityEvents() {
        // Handle focus management
        document.addEventListener('focusin', (e) => this.onFocusIn(e));
        document.addEventListener('focusout', (e) => this.onFocusOut(e));
        
        // Keyboard shortcuts for accessibility features
        document.addEventListener('keydown', (e) => {
            // Ctrl+1: Toggle high contrast
            if (e.ctrlKey && e.key === '1') {
                e.preventDefault();
                this.toggleHighContrast();
            }
            
            // Ctrl+2: Toggle reduced motion
            if (e.ctrlKey && e.key === '2') {
                e.preventDefault();
                this.toggleReducedMotion();
            }
            
            // Ctrl+H: Context help
            if (e.ctrlKey && e.key === 'h') {
                e.preventDefault();
                this.showContextHelp();
            }
            
            // Alt+M: Emergency menu
            if (e.altKey && e.key === 'm') {
                e.preventDefault();
                this.showEmergencyMenu();
            }
        });
        
        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.announce('Game window is now active.');
            }
        });
    }
    
    /**
     * Check user preferences for accessibility features
     */
    checkUserPreferences() {
        // Check stored preferences
        const preferences = this.loadPreferences();
        
        if (preferences.highContrast) {
            this.enableHighContrast();
        }
        
        if (preferences.reducedMotion) {
            this.enableReducedMotion();
        }
        
        // Check system preferences
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            this.enableHighContrast();
        }
        
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.enableReducedMotion();
        }
        
        // Listen for system preference changes
        window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
            if (e.matches) {
                this.enableHighContrast();
            } else {
                this.disableHighContrast();
            }
        });
        
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            if (e.matches) {
                this.enableReducedMotion();
            } else {
                this.disableReducedMotion();
            }
        });
    }
    
    /**
     * Load accessibility preferences from localStorage
     */
    loadPreferences() {
        try {
            const stored = localStorage.getItem('accessibilityPreferences');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.warn('Failed to load accessibility preferences:', error);
            return {};
        }
    }
    
    /**
     * Save accessibility preferences to localStorage
     */
    savePreferences() {
        try {
            const preferences = {
                highContrast: this.highContrastMode,
                reducedMotion: this.reducedMotionMode
            };
            localStorage.setItem('accessibilityPreferences', JSON.stringify(preferences));
        } catch (error) {
            console.error('Failed to save accessibility preferences:', error);
        }
    }
    
    /**
     * Announce text to screen readers (polite)
     */
    announce(text, priority = 'polite') {
        if (!text) return;
        
        const element = priority === 'assertive' ? this.alertElement : this.announceElement;
        
        // Clear and set new text
        element.textContent = '';
        setTimeout(() => {
            element.textContent = text;
        }, 100);
        
        // Also log for debugging
        console.log(`[A11Y ${priority}]:`, text);
    }
    
    /**
     * Announce urgent text to screen readers (assertive)
     */
    alert(text) {
        this.announce(text, 'assertive');
    }
    
    /**
     * Handle focus entering an element
     */
    onFocusIn(event) {
        const element = event.target;
        
        // Add to focus history
        this.focusHistory.push({
            element: element,
            timestamp: Date.now()
        });
        
        // Limit history size
        if (this.focusHistory.length > 10) {
            this.focusHistory.shift();
        }
        
        // Announce focused element if appropriate
        this.announceFocusedElement(element);
    }
    
    /**
     * Handle focus leaving an element
     */
    onFocusOut(event) {
        // Could track focus leaving if needed
    }
    
    /**
     * Announce the currently focused element
     */
    announceFocusedElement(element) {
        if (!this.screenReaderActive) return;
        
        let announcement = '';
        
        // Get element description
        const label = element.getAttribute('aria-label') || 
                     element.getAttribute('title') || 
                     element.textContent.trim();
        
        const role = element.getAttribute('role') || element.tagName.toLowerCase();
        
        if (label) {
            announcement = `${label}, ${role}`;
        }
        
        // Add state information
        if (element.disabled) {
            announcement += ', disabled';
        }
        
        if (element.getAttribute('aria-expanded') === 'true') {
            announcement += ', expanded';
        } else if (element.getAttribute('aria-expanded') === 'false') {
            announcement += ', collapsed';
        }
        
        if (announcement) {
            this.announce(announcement);
        }
    }
    
    /**
     * Move focus to element safely
     */
    moveFocusTo(element) {
        if (!element) return false;
        
        try {
            element.focus();
            
            // Verify focus moved
            if (document.activeElement === element) {
                this.announce(`Focus moved to ${this.getElementDescription(element)}`);
                return true;
            }
        } catch (error) {
            console.error('Failed to move focus:', error);
        }
        
        return false;
    }
    
    /**
     * Get description of an element for announcements
     */
    getElementDescription(element) {
        return element.getAttribute('aria-label') || 
               element.getAttribute('title') || 
               element.textContent.trim() || 
               element.tagName.toLowerCase();
    }
    
    /**
     * Focus the first focusable element in a container
     */
    focusFirstElement(container = document) {
        const focusable = this.getFocusableElements(container);
        if (focusable.length > 0) {
            return this.moveFocusTo(focusable[0]);
        }
        return false;
    }
    
    /**
     * Get all focusable elements in a container
     */
    getFocusableElements(container = document) {
        const selector = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ');
        
        return Array.from(container.querySelectorAll(selector))
            .filter(element => {
                return element.offsetWidth > 0 && 
                       element.offsetHeight > 0 && 
                       !element.hidden;
            });
    }
    
    /**
     * Setup high contrast mode toggle
     */
    setupHighContrastToggle() {
        const toggle = document.getElementById('toggle-contrast');
        if (toggle) {
            toggle.addEventListener('click', () => this.toggleHighContrast());
        }
    }
    
    /**
     * Toggle high contrast mode
     */
    toggleHighContrast() {
        if (this.highContrastMode) {
            this.disableHighContrast();
        } else {
            this.enableHighContrast();
        }
    }
    
    /**
     * Enable high contrast mode
     */
    enableHighContrast() {
        this.highContrastMode = true;
        document.documentElement.setAttribute('data-contrast', 'high');
        
        // Update toggle button
        const toggle = document.getElementById('toggle-contrast');
        if (toggle) {
            toggle.setAttribute('aria-pressed', 'true');
            toggle.title = 'Disable high contrast mode';
        }
        
        this.announce('High contrast mode enabled');
        this.savePreferences();
    }
    
    /**
     * Disable high contrast mode
     */
    disableHighContrast() {
        this.highContrastMode = false;
        document.documentElement.removeAttribute('data-contrast');
        
        // Update toggle button
        const toggle = document.getElementById('toggle-contrast');
        if (toggle) {
            toggle.setAttribute('aria-pressed', 'false');
            toggle.title = 'Enable high contrast mode';
        }
        
        this.announce('High contrast mode disabled');
        this.savePreferences();
    }
    
    /**
     * Setup reduced motion toggle
     */
    setupReducedMotionToggle() {
        // Add toggle button if needed
        const toolbar = document.querySelector('.quick-settings');
        if (toolbar && !document.getElementById('toggle-motion')) {
            const toggle = document.createElement('button');
            toggle.id = 'toggle-motion';
            toggle.className = 'icon-button';
            toggle.setAttribute('aria-label', 'Toggle reduced motion');
            toggle.title = 'Reduced motion';
            toggle.innerHTML = '<span class="icon" aria-hidden="true">⚡</span>';
            toggle.addEventListener('click', () => this.toggleReducedMotion());
            toolbar.appendChild(toggle);
        }
    }
    
    /**
     * Toggle reduced motion mode
     */
    toggleReducedMotion() {
        if (this.reducedMotionMode) {
            this.disableReducedMotion();
        } else {
            this.enableReducedMotion();
        }
    }
    
    /**
     * Enable reduced motion mode
     */
    enableReducedMotion() {
        this.reducedMotionMode = true;
        document.documentElement.setAttribute('data-motion', 'reduce');
        
        // Update toggle button
        const toggle = document.getElementById('toggle-motion');
        if (toggle) {
            toggle.setAttribute('aria-pressed', 'true');
            toggle.title = 'Enable animations';
        }
        
        this.announce('Reduced motion mode enabled');
        this.savePreferences();
    }
    
    /**
     * Disable reduced motion mode
     */
    disableReducedMotion() {
        this.reducedMotionMode = false;
        document.documentElement.removeAttribute('data-motion');
        
        // Update toggle button
        const toggle = document.getElementById('toggle-motion');
        if (toggle) {
            toggle.setAttribute('aria-pressed', 'false');
            toggle.title = 'Reduce motion';
        }
        
        this.announce('Animations enabled');
        this.savePreferences();
    }
    
    /**
     * Show context-sensitive help
     */
    showContextHelp() {
        const focusedElement = document.activeElement;
        let helpText = 'General help: Use arrow keys or WASD to move your character. Press Space to pause, Escape for menu.';
        
        // Provide context-specific help
        if (focusedElement.id === 'game-canvas') {
            helpText = 'Game area: Use arrow keys or WASD to move your character. Collect the colored shapes to score points. Press Space to pause the game.';
        } else if (focusedElement.classList.contains('menu-button')) {
            helpText = 'Menu: Use arrow keys to navigate menu options. Press Enter to select, Escape to go back.';
        }
        
        this.alert(helpText);
    }
    
    /**
     * Show emergency menu
     */
    showEmergencyMenu() {
        // Pause game if running
        if (window.gameInstance && window.gameInstance.isPlaying()) {
            window.gameInstance.pauseGame();
        }
        
        // Show emergency options
        const message = 'Emergency menu: Press Escape for main menu, Space to resume game, H for help, or F5 to refresh page.';
        this.alert(message);
        
        // Focus main menu button if available
        const menuButton = document.getElementById('pause-settings') || 
                          document.getElementById('help-button');
        if (menuButton) {
            this.moveFocusTo(menuButton);
        }
    }
    
    /**
     * Announce game state changes
     */
    announceGameState(state, details = '') {
        let message = '';
        
        switch (state) {
            case 'started':
                message = 'Game started. Use arrow keys or WASD to move your character.';
                break;
            case 'paused':
                message = 'Game paused. Press Space to resume or Escape for menu.';
                break;
            case 'resumed':
                message = 'Game resumed.';
                break;
            case 'levelComplete':
                message = `Level completed! ${details}`;
                break;
            case 'gameOver':
                message = `Game over. ${details}`;
                break;
            case 'targetCollected':
                message = `Target collected! ${details}`;
                break;
            default:
                message = details;
        }
        
        this.announce(message);
    }
    
    /**
     * Update progress indicators for screen readers
     */
    updateProgress(type, current, total, percentage) {
        const progressElement = document.querySelector(`[role="progressbar"]`);
        if (progressElement) {
            progressElement.setAttribute('aria-valuenow', percentage);
            progressElement.setAttribute('aria-valuetext', `${current} of ${total} complete`);
        }
        
        // Announce significant progress milestones
        if (percentage % 25 === 0 && percentage > 0) {
            this.announce(`${percentage}% complete`);
        }
    }
    
    /**
     * Create accessible game description for canvas
     */
    createGameDescription(gameState) {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;
        
        const description = `Game area: Player at position ${gameState.player.x}, ${gameState.player.y}. ` +
                          `${gameState.targets.length} targets remaining. ` +
                          `Score: ${gameState.score}. Level: ${gameState.level}.`;
        
        canvas.setAttribute('aria-description', description);
    }
    
    /**
     * Handle keyboard navigation traps
     */
    preventKeyboardTraps(container) {
        const focusableElements = this.getFocusableElements(container);
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        container.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }
    
    /**
     * Check if accessibility features are working
     */
    testAccessibility() {
        const tests = {
            announcements: !!this.announceElement,
            alerts: !!this.alertElement,
            highContrast: document.documentElement.hasAttribute('data-contrast'),
            reducedMotion: document.documentElement.hasAttribute('data-motion'),
            focusManagement: document.activeElement !== null
        };
        
        console.log('Accessibility test results:', tests);
        return tests;
    }
}

// Export if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityManager;
}
