/**
 * Universal Input Manager
 * Handles keyboard, switch, eye-gaze, and touch inputs with unified event system
 */

class UniversalInputManager {
    constructor() {
        console.log('🎮 UniversalInputManager constructor starting...');
        
        // Check if GamepadInput exists
        if (typeof GamepadInput === 'undefined') {
            console.error('🎮 ERROR: GamepadInput class not defined yet!');
        }
        
        this.inputMethods = {
            keyboard: new KeyboardInput(),
            switch: new SwitchInput(),
            eyeGaze: new EyeGazeInput(),
            touch: new TouchInput(),
            joystick: new GamepadInput()
        };
        
        console.log('🎮 UniversalInputManager: All input methods created');
        
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
            },
            joystick: {
                deadzone: 15,
                sensitivity: 'medium',
                pollRate: 16
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
        // Debug: log received events
        if (inputEvent.data && inputEvent.data.type === 'movement' && inputEvent.data.direction !== 'stop') {
            if (!this._lastProcessLog || Date.now() - this._lastProcessLog > 500) {
                console.log('🎮 UniversalInputManager.processInput received:', inputEvent.inputMethod, inputEvent.data.direction);
                this._lastProcessLog = Date.now();
            }
        }
        
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
        
        // The event type from emit is 'input', actual type is in data.type
        const eventType = data?.type || type;
        
        // Movement events
        if (eventType === 'movement') {
            return new GameEvent('movement', {
                direction: data.direction,
                directionVector: data.directionVector, // Include analog data
                intensity: data.intensity || 1.0,
                angle: data.angle,
                inputMethod: inputMethod,
                timestamp: Date.now()
            });
        }
        
        // Action events
        if (eventType === 'action') {
            return new GameEvent('action', {
                action: data.action,
                inputMethod: inputMethod,
                timestamp: Date.now()
            });
        }
        
        // Interface events
        if (eventType === 'interface') {
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
        console.log(`🎮 ${this.type} input ENABLED`);
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
        
        // Debug logging for movement events
        if (data && data.type === 'movement' && data.direction !== 'stop') {
            if (!this._lastEmitLog || Date.now() - this._lastEmitLog > 500) {
                console.log(`🎮 ${this.type} emitting:`, eventType, 'direction:', data.direction, 'listeners:', listeners.length);
                this._lastEmitLog = Date.now();
            }
        }
        
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
 * Gamepad/Joystick Input Handler
 * Provides analog proportional control for wheelchair joysticks and standard gamepads
 */
class GamepadInput extends BaseInput {
    constructor() {
        super('joystick');
        this.gamepad = null;
        this.gamepadIndex = null;
        this.pollInterval = null;
        this.scanInterval = null; // For scanning when no gamepad detected
        this.config = {
            deadzone: 0.15, // 15% default
            sensitivity: 'medium', // 'low', 'medium', 'high'
            pollRate: 16 // ~60fps polling
        };
        this.lastDirection = { x: 0, y: 0 };
        this.isMoving = false;
        
        // Sensitivity curves (how stick deflection maps to speed)
        this.sensitivityCurves = {
            low: (v) => Math.pow(v, 2), // Quadratic - gradual start
            medium: (v) => v, // Linear
            high: (v) => Math.pow(v, 0.5) // Square root - quick response
        };
        
        // Listen for gamepad connections globally
        this.setupGlobalListeners();
        
        // Store reference globally so early event handlers can notify us
        window._gamepadInputInstance = this;
        
        // Start scanning for gamepads immediately
        this.startScanning();
        
        // Start polling immediately too (will detect gamepad even if not enabled)
        this.startPolling();
        
        // Also check immediately (some controllers already connected)
        setTimeout(() => this.checkExistingGamepads(), 100);
        
        // Check if any gamepads were detected before we were created
        if (window._detectedGamepads && window._detectedGamepads.length > 0) {
            console.log('🎮 GamepadInput found pre-detected gamepads:', window._detectedGamepads);
            this.checkExistingGamepads();
        }
        
        console.log('🎮 GamepadInput initialized - awaiting controller input');
    }
    
    setupGlobalListeners() {
        window.addEventListener('gamepadconnected', (e) => {
            console.log('🎮 gamepadconnected event fired:', e.gamepad.id);
            this.onGamepadConnected(e);
        });
        window.addEventListener('gamepaddisconnected', (e) => {
            console.log('🎮 gamepaddisconnected event fired:', e.gamepad.id);
            this.onGamepadDisconnected(e);
        });
    }
    
    onGamepadConnected(event) {
        console.log('🎮 Gamepad connected:', event.gamepad.id);
        
        const id = event.gamepad.id.toLowerCase();
        const isVirtual = id.includes('vjoy') || id.includes('virtual');
        
        // If we already have a real controller connected, don't switch to a virtual one
        if (this.gamepad && isVirtual) {
            const currentId = this.gamepad.id.toLowerCase();
            const currentIsVirtual = currentId.includes('vjoy') || currentId.includes('virtual');
            if (!currentIsVirtual) {
                console.log('🎮 Ignoring virtual joystick, already have real controller:', this.gamepad.id);
                return;
            }
        }
        
        // If this is a real controller and we're currently using a virtual one, switch
        if (this.gamepad && !isVirtual) {
            const currentId = this.gamepad.id.toLowerCase();
            const currentIsVirtual = currentId.includes('vjoy') || currentId.includes('virtual');
            if (currentIsVirtual) {
                console.log('🎮 Switching from virtual to real controller:', event.gamepad.id);
            }
        }
        
        this.gamepad = event.gamepad;
        this.gamepadIndex = event.gamepad.index;
        
        // Notify listeners
        this.emit('input', {
            type: 'system',
            event: 'gamepadConnected',
            gamepadId: event.gamepad.id
        });
        
        // Update UI status
        this.updateConnectionStatus(true, event.gamepad.id);
    }
    
    onGamepadDisconnected(event) {
        console.log('🎮 Gamepad disconnected:', event.gamepad.id);
        if (this.gamepadIndex === event.gamepad.index) {
            this.gamepad = null;
            this.gamepadIndex = null;
            
            // Notify listeners
            this.emit('input', {
                type: 'system',
                event: 'gamepadDisconnected'
            });
            
            // Update UI status
            this.updateConnectionStatus(false);
        }
    }
    
    updateConnectionStatus(connected, gamepadId = null) {
        const statusEl = document.getElementById('joystick-status');
        const textEl = document.getElementById('joystick-status-text');
        
        if (statusEl && textEl) {
            if (connected) {
                statusEl.classList.add('connected');
                statusEl.classList.remove('disconnected');
                // Truncate long gamepad names
                const displayName = gamepadId && gamepadId.length > 30 
                    ? gamepadId.substring(0, 27) + '...' 
                    : gamepadId || 'Controller';
                textEl.textContent = `✓ ${displayName}`;
            } else {
                statusEl.classList.remove('connected');
                statusEl.classList.add('disconnected');
                textEl.textContent = 'Press any button on controller...';
            }
        }
    }
    
    startScanning() {
        // Continuously scan for gamepads (needed because browsers require button press)
        if (this.scanInterval) return;
        
        this.scanInterval = setInterval(() => {
            if (this.gamepadIndex === null) {
                this.checkExistingGamepads();
            }
        }, 500); // Check every 500ms
    }
    
    stopScanning() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
    }
    
    bindEvents() {
        // Start polling for gamepad input
        this.startPolling();
        
        // Check for already-connected gamepads
        this.checkExistingGamepads();
    }
    
    unbindEvents() {
        this.stopPolling();
    }
    
    checkExistingGamepads() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        
        // First pass: look for real/physical controllers (prefer XInput, avoid virtual)
        for (const gp of gamepads) {
            if (gp && gp.connected) {
                const id = gp.id.toLowerCase();
                // Skip virtual joysticks (vJoy, etc.)
                if (id.includes('vjoy') || id.includes('virtual')) {
                    console.log('🎮 Skipping virtual joystick:', gp.id);
                    continue;
                }
                // Found a real controller
                this.gamepad = gp;
                this.gamepadIndex = gp.index;
                this.updateConnectionStatus(true, gp.id);
                console.log('🎮 GamepadInput connected to:', gp.id, 'index:', gp.index);
                this.stopScanning();
                return;
            }
        }
        
        // Second pass: if no real controller found, accept any connected gamepad
        for (const gp of gamepads) {
            if (gp && gp.connected) {
                this.gamepad = gp;
                this.gamepadIndex = gp.index;
                this.updateConnectionStatus(true, gp.id);
                console.log('🎮 GamepadInput connected to (fallback):', gp.id, 'index:', gp.index);
                this.stopScanning();
                return;
            }
        }
    }
    
    startPolling() {
        if (this.pollInterval) return;
        
        this.pollInterval = setInterval(() => {
            this.pollGamepad();
        }, this.config.pollRate);
    }
    
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        
        // Send stop event when disabling
        if (this.isMoving) {
            this.isMoving = false;
            this.emit('input', {
                type: 'movement',
                direction: 'stop',
                intensity: 0
            });
        }
    }
    
    pollGamepad() {
        // Re-fetch gamepad state (required in some browsers)
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = this.gamepadIndex !== null ? gamepads[this.gamepadIndex] : null;
        
        if (!gp) {
            // Try to find any connected gamepad if we don't have one
            if (this.gamepadIndex === null) {
                for (const pad of gamepads) {
                    if (pad && pad.connected) {
                        this.gamepad = pad;
                        this.gamepadIndex = pad.index;
                        this.updateConnectionStatus(true, pad.id);
                        console.log('🎮 pollGamepad found gamepad:', pad.id);
                        break;
                    }
                }
            }
            return;
        }
        
        // Skip if not enabled (but still allow detection above)
        if (!this.enabled) {
            // Debug: log occasionally that we're disabled
            if (!this._lastDisabledLog || Date.now() - this._lastDisabledLog > 5000) {
                console.log('🎮 pollGamepad: skipping because not enabled');
                this._lastDisabledLog = Date.now();
            }
            return;
        }
        
        // Read left stick axes (standard mapping)
        const rawX = gp.axes[0] || 0; // Left stick horizontal
        const rawY = gp.axes[1] || 0; // Left stick vertical
        
        // Debug: log raw input when significant
        if (Math.abs(rawX) > 0.1 || Math.abs(rawY) > 0.1) {
            if (!this._lastInputLog || Date.now() - this._lastInputLog > 500) {
                console.log('🎮 Joystick raw input:', rawX.toFixed(2), rawY.toFixed(2));
                this._lastInputLog = Date.now();
            }
        }
        
        // Apply deadzone
        const { x, y } = this.applyDeadzone(rawX, rawY);
        
        // Calculate magnitude (0-1)
        const magnitude = Math.min(1, Math.sqrt(x * x + y * y));
        
        // Apply sensitivity curve
        const curve = this.sensitivityCurves[this.config.sensitivity] || this.sensitivityCurves.medium;
        const adjustedMagnitude = magnitude > 0 ? curve(magnitude) : 0;
        
        // Determine if we're moving
        const wasMoving = this.isMoving;
        this.isMoving = adjustedMagnitude > 0;
        
        if (this.isMoving) {
            // Calculate direction angle
            const angle = Math.atan2(y, x);
            
            // Normalize direction vector
            const dirX = magnitude > 0 ? x / magnitude : 0;
            const dirY = magnitude > 0 ? y / magnitude : 0;
            
            // Emit movement event with analog data
            this.emit('input', {
                type: 'movement',
                direction: this.getCardinalDirection(angle),
                directionVector: { x: dirX, y: dirY },
                intensity: adjustedMagnitude,
                angle: angle,
                raw: { x: rawX, y: rawY }
            });
            
            this.lastDirection = { x: dirX, y: dirY };
            
        } else if (wasMoving && !this.isMoving) {
            // Just stopped moving
            this.emit('input', {
                type: 'movement',
                direction: 'stop',
                intensity: 0
            });
        }
        
        // Check buttons (A/X for confirm, B/Circle for pause, Start for menu)
        this.checkButtons(gp);
    }
    
    applyDeadzone(x, y) {
        const magnitude = Math.sqrt(x * x + y * y);
        const deadzone = this.config.deadzone;
        
        if (magnitude < deadzone) {
            return { x: 0, y: 0 };
        }
        
        // Scale the output so it starts from 0 after the deadzone
        const scaledMagnitude = (magnitude - deadzone) / (1 - deadzone);
        const scale = scaledMagnitude / magnitude;
        
        return {
            x: x * scale,
            y: y * scale
        };
    }
    
    getCardinalDirection(angle) {
        // Convert angle to cardinal direction for compatibility
        // angle is in radians, 0 = right, π/2 = down, π = left, -π/2 = up
        const deg = angle * (180 / Math.PI);
        
        if (deg >= -45 && deg < 45) return 'right';
        if (deg >= 45 && deg < 135) return 'down';
        if (deg >= 135 || deg < -135) return 'left';
        return 'up';
    }
    
    checkButtons(gp) {
        // Standard gamepad button mapping
        // 0 = A/Cross, 1 = B/Circle, 2 = X/Square, 3 = Y/Triangle
        // 8 = Select/Back, 9 = Start
        
        // Check for button presses (rising edge detection would be better but this is simpler)
        if (gp.buttons[0] && gp.buttons[0].pressed) {
            // A button - confirm/select
            if (!this._buttonStates) this._buttonStates = {};
            if (!this._buttonStates[0]) {
                this._buttonStates[0] = true;
                this.emit('input', {
                    type: 'action',
                    action: 'confirm'
                });
            }
        } else if (this._buttonStates && this._buttonStates[0]) {
            this._buttonStates[0] = false;
        }
        
        if (gp.buttons[1] && gp.buttons[1].pressed) {
            // B button - pause
            if (!this._buttonStates) this._buttonStates = {};
            if (!this._buttonStates[1]) {
                this._buttonStates[1] = true;
                this.emit('input', {
                    type: 'action',
                    action: 'pause'
                });
            }
        } else if (this._buttonStates && this._buttonStates[1]) {
            this._buttonStates[1] = false;
        }
        
        if (gp.buttons[9] && gp.buttons[9].pressed) {
            // Start button - menu
            if (!this._buttonStates) this._buttonStates = {};
            if (!this._buttonStates[9]) {
                this._buttonStates[9] = true;
                this.emit('input', {
                    type: 'interface',
                    command: 'menu'
                });
            }
        } else if (this._buttonStates && this._buttonStates[9]) {
            this._buttonStates[9] = false;
        }
    }
    
    updateConfig(newConfig) {
        super.updateConfig(newConfig);
        
        // Convert percentage deadzone to decimal
        if (newConfig.deadzone !== undefined) {
            this.config.deadzone = newConfig.deadzone / 100;
        }
        if (newConfig.sensitivity !== undefined) {
            this.config.sensitivity = newConfig.sensitivity;
        }
    }
    
    isConnected() {
        return this.gamepad !== null;
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
        TouchInput,
        GamepadInput
    };
}

// Also export to window for browser usage
window.UniversalInputManager = UniversalInputManager;
window.GameEvent = GameEvent;
window.KeyboardInput = KeyboardInput;
window.SwitchInput = SwitchInput;
window.EyeGazeInput = EyeGazeInput;
window.TouchInput = TouchInput;
window.GamepadInput = GamepadInput;

console.log('🎮 Input manager classes exported to window');

// Early gamepad detection - register listeners immediately at script load
// Store detected gamepads so GamepadInput can find them later
window._detectedGamepads = window._detectedGamepads || [];

(function() {
    console.log('🎮 Registering early gamepad listeners...');
    
    window.addEventListener('gamepadconnected', (e) => {
        console.log('🎮 [EARLY] Gamepad connected event:', e.gamepad.id, 'index:', e.gamepad.index);
        window._detectedGamepads.push(e.gamepad.index);
        
        // If GamepadInput already exists, notify it
        if (window._gamepadInputInstance) {
            console.log('🎮 [EARLY] Notifying GamepadInput instance of connection');
            window._gamepadInputInstance.onGamepadConnected(e);
        } else {
            console.log('🎮 [EARLY] GamepadInput instance not yet created, will check later');
        }
    });
    
    window.addEventListener('gamepaddisconnected', (e) => {
        console.log('🎮 [EARLY] Gamepad disconnected event:', e.gamepad.id);
        window._detectedGamepads = window._detectedGamepads.filter(i => i !== e.gamepad.index);
        
        // If GamepadInput already exists, notify it
        if (window._gamepadInputInstance) {
            window._gamepadInputInstance.onGamepadDisconnected(e);
        }
    });
    
    // Also do an immediate check
    if (navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        const connected = Array.from(gamepads).filter(g => g !== null);
        console.log('🎮 [EARLY] Initial gamepad check:', connected.length, 'gamepads found');
        connected.forEach(gp => {
            console.log('🎮 [EARLY] Found:', gp.id, 'buttons:', gp.buttons.length, 'axes:', gp.axes.length);
            window._detectedGamepads.push(gp.index);
        });
    } else {
        console.warn('🎮 [EARLY] navigator.getGamepads not available!');
    }
})();
