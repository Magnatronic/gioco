/**
 * Universal Input Manager
 * Handles keyboard, switch, eye-gaze, and touch inputs with unified event system
 */

class UniversalInputManager {
    constructor() {
        this.inputMethods = {
            keyboard: new KeyboardInput(),
            switch: new SwitchInput(),
            eyeGaze: new EyeGazeInput(),
            touch: new TouchInput()
        };
        
        this.activeMethod = 'keyboard'; // Default input method
        this.eventQueue = [];
        this.listeners = new Map();
        this.config = this.loadConfig();
        
        // Bind event handlers
        this.bindUniversalEvents();
        
    if(window.game && window.game._log){ window.game._log('UniversalInputManager initialized'); }
    }
    
    /**
     * Load configuration from localStorage or use defaults
     */
    loadConfig() {
        try {
            const stored = localStorage.getItem('inputConfig');
            return stored ? JSON.parse(stored) : this.getDefaultConfig();
        } catch (error) {
            console.warn('Failed to load input config, using defaults:', error);
            return this.getDefaultConfig();
        }
    }
    
    /**
     * Get default configuration for all input methods
     */
    getDefaultConfig() {
        return {
            keyboard: {
                sensitivity: 1.0,
                repeatDelay: 500,
                repeatRate: 100,
                stickyKeys: false,
                filterKeys: false
            },
            switch: {
                scanSpeed: 2000,
                scanMode: 'auto',
                longPressThreshold: 1000,
                audioFeedback: true,
                visualFeedback: true
            },
            eyeGaze: {
                dwellTime: 1500,
                dwellRadius: 40,
                smoothing: 0.3,
                calibrationRequired: false,
                cursorVisible: true
            },
            touch: {
                sensitivity: 1.0,
                gesturesEnabled: true,
                hapticFeedback: true
            }
        };
    }
    
    /**
     * Bind universal event handlers
     */
    bindUniversalEvents() {
        // Listen to all input method events
        Object.values(this.inputMethods).forEach(inputMethod => {
            inputMethod.on('input', (event) => this.processInput(event));
            inputMethod.on('error', (error) => this.handleInputError(error));
        });
        
        // Handle input method switching
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.altKey && e.key >= '1' && e.key <= '4') {
                const methods = ['keyboard', 'switch', 'eyeGaze', 'touch'];
                this.switchInputMethod(methods[parseInt(e.key) - 1]);
            }
        });
    }
    
    /**
     * Process input from any input method into unified game events
     */
    processInput(inputEvent) {
        const gameEvent = this.translateToGameEvent(inputEvent);
        if (gameEvent) {
            this.eventQueue.push(gameEvent);
            this.notifyListeners(gameEvent);
        }
    }
    
    /**
     * Translate raw input to standardized game event
     */
    translateToGameEvent(inputEvent) {
        const { type, data, inputMethod } = inputEvent;
        
        // Movement events
        if (type === 'movement') {
            return new GameEvent('movement', {
                direction: data.direction,
                intensity: data.intensity || 1.0,
                inputMethod: inputMethod,
                timestamp: Date.now()
            });
        }
        
        // Action events
        if (type === 'action') {
            return new GameEvent('action', {
                action: data.action,
                inputMethod: inputMethod,
                timestamp: Date.now()
            });
        }
        
        // Interface events
        if (type === 'interface') {
            return new GameEvent('interface', {
                command: data.command,
                inputMethod: inputMethod,
                timestamp: Date.now()
            });
        }
        
        return null;
    }
    
    /**
     * Switch active input method
     */
    switchInputMethod(method) {
        if (this.inputMethods[method]) {
            const oldMethod = this.activeMethod;
            this.activeMethod = method;
            
            // Disable old method
            this.inputMethods[oldMethod].disable();
            
            // Enable new method
            this.inputMethods[method].enable();
            
            // Announce change
            this.notifyListeners(new GameEvent('system', {
                type: 'inputMethodChanged',
                oldMethod: oldMethod,
                newMethod: method,
                timestamp: Date.now()
            }));
            
            if(window.game && window.game._log){ window.game._log(`Input method switched from ${oldMethod} to ${method}`); }
        }
    }
    
    /**
     * Add event listener
     */
    on(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }
    
    /**
     * Remove event listener
     */
    off(eventType, callback) {
        if (this.listeners.has(eventType)) {
            const callbacks = this.listeners.get(eventType);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    /**
     * Notify all listeners of an event
     */
    notifyListeners(event) {
        const listeners = this.listeners.get(event.type) || [];
        listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Error in event listener:', error);
            }
        });
    }
    
    /**
     * Handle input errors
     */
    handleInputError(error) {
        console.error('Input error:', error);
        this.notifyListeners(new GameEvent('error', {
            type: 'input',
            message: error.message,
            timestamp: Date.now()
        }));
    }
    
    /**
     * Get next event from queue
     */
    getNextEvent() {
        return this.eventQueue.shift();
    }
    
    /**
     * Clear event queue
     */
    clearEvents() {
        this.eventQueue = [];
    }
    
    /**
     * Save current configuration
     */
    saveConfig() {
        try {
            localStorage.setItem('inputConfig', JSON.stringify(this.config));
        } catch (error) {
            console.error('Failed to save input config:', error);
        }
    }
    
    /**
     * Update configuration for specific input method
     */
    updateConfig(inputMethod, newConfig) {
        if (this.config[inputMethod]) {
            this.config[inputMethod] = { ...this.config[inputMethod], ...newConfig };
            this.inputMethods[inputMethod].updateConfig(this.config[inputMethod]);
            this.saveConfig();
        }
    }
}

/**
 * Base class for input methods
 */
class BaseInput {
    constructor(type) {
        this.type = type;
        this.enabled = false;
        this.listeners = new Map();
        this.config = {};
    }
    
    enable() {
        this.enabled = true;
        this.bindEvents();
    }
    
    disable() {
        this.enabled = false;
        this.unbindEvents();
    }
    
    bindEvents() {
        // Override in subclasses
    }
    
    unbindEvents() {
        // Override in subclasses
    }
    
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    
    emit(eventType, data) {
        const listeners = this.listeners.get(eventType) || [];
        const event = {
            type: eventType,
            data: data,
            inputMethod: this.type,
            timestamp: Date.now()
        };
        
        listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error(`Error in ${this.type} input listener:`, error);
            }
        });
    }
    
    on(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }
    
    off(eventType, callback) {
        if (this.listeners.has(eventType)) {
            const callbacks = this.listeners.get(eventType);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
}

/**
 * Keyboard Input Handler
 */
class KeyboardInput extends BaseInput {
    constructor() {
        super('keyboard');
        this.keyStates = new Map();
        this.keyRepeatTimers = new Map();
        this.config = {
            repeatDelay: 500,
            repeatRate: 100,
            simultaneousKeys: true,
            stickyKeys: false
        };
        
        // Key mappings
        this.keyMappings = {
            // Movement keys
            'ArrowUp': { type: 'movement', direction: 'up' },
            'ArrowDown': { type: 'movement', direction: 'down' },
            'ArrowLeft': { type: 'movement', direction: 'left' },
            'ArrowRight': { type: 'movement', direction: 'right' },
            'KeyW': { type: 'movement', direction: 'up' },
            'KeyA': { type: 'movement', direction: 'left' },
            'KeyS': { type: 'movement', direction: 'down' },
            'KeyD': { type: 'movement', direction: 'right' },
            
            // Action keys
            'Space': { type: 'action', action: 'pause' },
            'Enter': { type: 'action', action: 'confirm' },
            'Escape': { type: 'interface', command: 'menu' },
            
            // Interface keys
            'Tab': { type: 'interface', command: 'next' },
            'KeyH': { type: 'interface', command: 'help' },
            'KeyM': { type: 'interface', command: 'mute' }
        };
    }
    
    bindEvents() {
        this.handleKeyDown = (e) => this.onKeyDown(e);
        this.handleKeyUp = (e) => this.onKeyUp(e);
        
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
    }
    
    unbindEvents() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        
        // Clear all timers
        this.keyRepeatTimers.forEach(timer => clearTimeout(timer));
        this.keyRepeatTimers.clear();
        this.keyStates.clear();
    }
    
    onKeyDown(event) {
        if (!this.enabled) return;
        
        const keyCode = event.code;
        // Emergency accessibility shortcuts
        if (event.altKey && (keyCode === 'KeyM' || event.key === 'm' || event.key === 'M')) {
            event.preventDefault();
            this.emit('input', { type: 'interface', command: 'menu' });
            return;
        }
        if (event.ctrlKey && (keyCode === 'KeyH' || event.key === 'h' || event.key === 'H')) {
            event.preventDefault();
            this.emit('input', { type: 'interface', command: 'help' });
            return;
        }
        const mapping = this.keyMappings[keyCode];
        
        if (mapping) {
            event.preventDefault();
            
            // Handle modifier keys
            const modifiers = {
                ctrl: event.ctrlKey,
                alt: event.altKey,
                shift: event.shiftKey
            };
            
            // Sticky keys support
            if (this.config.stickyKeys && this.hasActiveKeys() && !modifiers.shift) {
                this.clearActiveKeys();
            }
            
            // Set key state
            this.keyStates.set(keyCode, {
                pressed: true,
                timestamp: Date.now(),
                modifiers: modifiers
            });
            
            // Send immediate event
            this.emit('input', {
                type: mapping.type,
                ...mapping,
                modifiers: modifiers
            });
            
            // Setup repeat timer if it's a movement key
            if (mapping.type === 'movement') {
                this.setupKeyRepeat(keyCode, mapping);
            }
        }
    }
    
    onKeyUp(event) {
        if (!this.enabled) return;
        
        const keyCode = event.code;
        
        if (this.keyStates.has(keyCode)) {
            this.keyStates.delete(keyCode);
            this.clearKeyRepeat(keyCode);
            
            // Send key release event for movement keys
            const mapping = this.keyMappings[keyCode];
            if (mapping && mapping.type === 'movement') {
                this.emit('input', {
                    type: 'movement',
                    direction: 'stop',
                    previousDirection: mapping.direction
                });
            }
        }
    }
    
    setupKeyRepeat(keyCode, mapping) {
        // Initial delay
        const initialTimer = setTimeout(() => {
            // Start repeating
            const repeatTimer = setInterval(() => {
                if (this.keyStates.has(keyCode)) {
                    this.emit('input', {
                        type: mapping.type,
                        ...mapping,
                        repeat: true
                    });
                } else {
                    clearInterval(repeatTimer);
                }
            }, this.config.repeatRate);
            
            this.keyRepeatTimers.set(keyCode + '_repeat', repeatTimer);
        }, this.config.repeatDelay);
        
        this.keyRepeatTimers.set(keyCode + '_initial', initialTimer);
    }
    
    clearKeyRepeat(keyCode) {
        const initialTimer = this.keyRepeatTimers.get(keyCode + '_initial');
        const repeatTimer = this.keyRepeatTimers.get(keyCode + '_repeat');
        
        if (initialTimer) {
            clearTimeout(initialTimer);
            this.keyRepeatTimers.delete(keyCode + '_initial');
        }
        
        if (repeatTimer) {
            clearInterval(repeatTimer);
            this.keyRepeatTimers.delete(keyCode + '_repeat');
        }
    }
    
    hasActiveKeys() {
        return this.keyStates.size > 0;
    }
    
    clearActiveKeys() {
        this.keyStates.forEach((state, keyCode) => {
            this.clearKeyRepeat(keyCode);
        });
        this.keyStates.clear();
    }
}

/**
 * Switch Input Handler
 */
class SwitchInput extends BaseInput {
    constructor() {
        super('switch');
        this.scanMode = 'auto';
        this.scanSpeed = 2000;
        this.currentIndex = 0;
        this.scanItems = [];
        this.isScanning = false;
        this.scanTimer = null;
        
        this.initializeScanItems();
    }
    
    initializeScanItems() {
        this.scanItems = [
            { type: 'movement', direction: 'up', label: 'Move Up' },
            { type: 'movement', direction: 'right', label: 'Move Right' },
            { type: 'movement', direction: 'down', label: 'Move Down' },
            { type: 'movement', direction: 'left', label: 'Move Left' },
            { type: 'action', action: 'pause', label: 'Pause Game' },
            { type: 'interface', command: 'menu', label: 'Main Menu' }
        ];
        
        this.createScanIndicators();
    }
    
    createScanIndicators() {
        // Remove existing indicators
        document.querySelectorAll('.scan-indicator').forEach(el => el.remove());
        
        // Create new indicators
        this.scanItems.forEach((item, index) => {
            const indicator = document.createElement('div');
            indicator.className = 'scan-indicator';
            indicator.setAttribute('data-scan-index', index);
            indicator.setAttribute('aria-label', item.label);
            indicator.style.display = 'none';
            
            document.body.appendChild(indicator);
            item.element = indicator;
        });
    }
    
    bindEvents() {
        this.handleSwitchPress = (e) => this.onSwitchPress(e);
        
        // Bind switch events (this would be customized for actual switch hardware)
        document.addEventListener('keydown', this.handleSwitchPress);
    }
    
    unbindEvents() {
        document.removeEventListener('keydown', this.handleSwitchPress);
        this.stopScanning();
    }
    
    onSwitchPress(event) {
        if (!this.enabled) return;
        
        // Map specific keys to switch inputs for testing
        if (event.code === 'F1') { // Switch 1
            event.preventDefault();
            this.handleSwitchAction(1);
        } else if (event.code === 'F2') { // Switch 2
            event.preventDefault();
            this.handleSwitchAction(2);
        }
    }
    
    handleSwitchAction(switchNumber) {
        if (switchNumber === 1) {
            if (this.scanMode === 'manual') {
                this.advanceToNext();
            } else {
                this.selectCurrentItem();
            }
        } else if (switchNumber === 2) {
            this.selectCurrentItem();
        }
    }
    
    enable() {
        super.enable();
        this.startScanning();
    }
    
    disable() {
        super.disable();
        this.stopScanning();
    }
    
    startScanning() {
        if (this.isScanning) return;
        
        this.isScanning = true;
        this.currentIndex = 0;
        this.showScanIndicators();
        
        if (this.scanMode === 'auto') {
            this.autoScan();
        }
        
        this.updateVisualIndicator();
    }
    
    stopScanning() {
        this.isScanning = false;
        if (this.scanTimer) {
            clearInterval(this.scanTimer);
            this.scanTimer = null;
        }
        this.hideScanIndicators();
    }
    
    autoScan() {
        this.scanTimer = setInterval(() => {
            this.currentIndex = (this.currentIndex + 1) % this.scanItems.length;
            this.updateVisualIndicator();
            this.announceCurrentItem();
        }, this.scanSpeed);
    }
    
    advanceToNext() {
        this.currentIndex = (this.currentIndex + 1) % this.scanItems.length;
        this.updateVisualIndicator();
        this.announceCurrentItem();
    }
    
    selectCurrentItem() {
        const selectedItem = this.scanItems[this.currentIndex];
        
        this.emit('input', {
            type: selectedItem.type,
            ...selectedItem
        });
        
        // Provide feedback
        this.provideFeedback(selectedItem);
    }
    
    updateVisualIndicator() {
        // Clear all highlights
        this.scanItems.forEach(item => {
            if (item.element) {
                item.element.classList.remove('scanning');
            }
        });
        
        // Highlight current item
        const currentItem = this.scanItems[this.currentIndex];
        if (currentItem.element) {
            currentItem.element.classList.add('scanning');
        }
    }
    
    announceCurrentItem() {
        const currentItem = this.scanItems[this.currentIndex];
        if (window.accessibilityManager) {
            window.accessibilityManager.announce(`Scanning: ${currentItem.label}`);
        }
    }
    
    provideFeedback(item) {
        if (window.accessibilityManager) {
            window.accessibilityManager.announce(`Selected: ${item.label}`);
        }
    }
    
    showScanIndicators() {
        document.getElementById('switch-overlay').style.display = 'block';
        this.scanItems.forEach(item => {
            if (item.element) {
                item.element.style.display = 'block';
            }
        });
    }
    
    hideScanIndicators() {
        document.getElementById('switch-overlay').style.display = 'none';
        this.scanItems.forEach(item => {
            if (item.element) {
                item.element.style.display = 'none';
            }
        });
    }
}

/**
 * Eye Gaze Input Handler (Placeholder implementation)
 */
class EyeGazeInput extends BaseInput {
    constructor() {
        super('eyeGaze');
        this.dwellTime = 1500;
        this.currentDwell = null;
        this.gazeTargets = [];
        
        this.initializeGazeTargets();
    }
    
    initializeGazeTargets() {
        this.gazeTargets = [
            { id: 'up', x: 400, y: 200, action: { type: 'movement', direction: 'up' } },
            { id: 'down', x: 400, y: 600, action: { type: 'movement', direction: 'down' } },
            { id: 'left', x: 200, y: 400, action: { type: 'movement', direction: 'left' } },
            { id: 'right', x: 600, y: 400, action: { type: 'movement', direction: 'right' } },
            { id: 'pause', x: 100, y: 100, action: { type: 'action', action: 'pause' } }
        ];
    }
    
    bindEvents() {
        // Placeholder for eye gaze integration
        // In a real implementation, this would interface with eye tracking hardware
    if(window.game && window.game._log){ window.game._log('Eye gaze input method activated (placeholder)'); }
    }
    
    unbindEvents() {
    if(window.game && window.game._log){ window.game._log('Eye gaze input method deactivated'); }
    }
}

/**
 * Touch Input Handler
 */
class TouchInput extends BaseInput {
    constructor() {
        super('touch');
        this.touchStates = new Map();
        this.swipeThreshold = 50;
        this.tapTimeout = 300;
    }
    
    bindEvents() {
        this.handleTouchStart = (e) => this.onTouchStart(e);
        this.handleTouchEnd = (e) => this.onTouchEnd(e);
        this.handleTouchMove = (e) => this.onTouchMove(e);
        
        document.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    }
    
    unbindEvents() {
        document.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('touchmove', this.handleTouchMove);
    }
    
    onTouchStart(event) {
        if (!this.enabled) return;
        
        event.preventDefault();
        
        Array.from(event.touches).forEach(touch => {
            this.touchStates.set(touch.identifier, {
                startX: touch.clientX,
                startY: touch.clientY,
                startTime: Date.now()
            });
        });
    }
    
    onTouchEnd(event) {
        if (!this.enabled) return;
        
        event.preventDefault();
        
        Array.from(event.changedTouches).forEach(touch => {
            const startState = this.touchStates.get(touch.identifier);
            if (startState) {
                const deltaX = touch.clientX - startState.startX;
                const deltaY = touch.clientY - startState.startY;
                const deltaTime = Date.now() - startState.startTime;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (distance > this.swipeThreshold) {
                    // Handle swipe
                    this.handleSwipe(deltaX, deltaY);
                } else if (deltaTime < this.tapTimeout) {
                    // Handle tap
                    this.handleTap(touch.clientX, touch.clientY);
                }
                
                this.touchStates.delete(touch.identifier);
            }
        });
    }
    
    onTouchMove(event) {
        if (!this.enabled) return;
        event.preventDefault();
    }
    
    handleSwipe(deltaX, deltaY) {
        let direction;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            direction = deltaX > 0 ? 'right' : 'left';
        } else {
            direction = deltaY > 0 ? 'down' : 'up';
        }
        
        this.emit('input', {
            type: 'movement',
            direction: direction
        });
    }
    
    handleTap(x, y) {
        this.emit('input', {
            type: 'action',
            action: 'tap',
            coordinates: { x, y }
        });
    }
}

/**
 * Game Event Class
 */
class GameEvent {
    constructor(type, data = {}) {
        this.type = type;
        this.data = data;
        this.timestamp = Date.now();
        this.processed = false;
    }
    
    markProcessed() {
        this.processed = true;
    }
    
    isProcessed() {
        return this.processed;
    }
}

// Export classes if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UniversalInputManager,
        GameEvent,
        KeyboardInput,
        SwitchInput,
        EyeGazeInput,
        TouchInput
    };
}
