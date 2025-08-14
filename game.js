/**
 * Directional Skills Educational Game
 * Accessibility-first design for students with physical and learning difficulties
 */

class DirectionalSkillsGame {
    constructor() {
    // Debug logging flag (enable via ?debug=1 in URL for ad-hoc diagnostics)
    this.debug = /[?&]debug=1/i.test(window.location.search);
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'menu'; // menu, playing, paused, completed
        this.isFullscreen = false;
        
        // Game settings
        this.settings = {
            movementSpeed: 3,
            inputBuffering: true,
            audioEnabled: true,
            reducedMotion: false,
            resizeHandling: 'reposition' // 'reposition', 'scale', 'regenerate', 'pause'
        };
        
        // Session configuration (formerly practice mode configuration)
        this.sessionConfig = {
            targetCounts: {
                stationary: 5,
                moving: 0,
                flee: 0,
                bonus: 0,
                hazard: 0
            },
            targetSize: 'medium', // 'small', 'medium', 'large', 'extra-large'
            playerSpeed: 3,
            playerTrail: 'short', // 'off', 'short', 'long'
            inputMethod: 'discrete', // 'discrete', 'continuous', 'mouse'
            inputBuffer: 300,
            boundaries: 'none', // 'none', 'visual', 'hard'
            feedback: {
                audio: true,
                visual: true,
                haptic: false
            },
            seed: null // Random seed for reproducible sessions
        };
        
        // Session data
        this.currentSession = {
            seed: null,
            startTime: null,
            endTime: null,
            totalTime: 0,
            pausedTime: 0,
            pauseStartTime: null,
            targetsCollected: 0,
            totalTargets: 0,
            coreTargetsCollected: 0, // Track core targets separately
            bonusTargetsCollected: 0, // Track bonus targets
            hazardTargetsHit: 0, // Track hazard targets hit
            completed: false,
            timeAdjustments: 0 // Track bonus/penalty time adjustments
        };
        
        // Session history (last 10 attempts)
        this.sessionHistory = this.loadSessionHistory();
        
        // Player object
        this.player = {
            x: 0,
            y: 0,
            size: 25,
            color: '#3498db',
            trail: [],
            targetX: null,
            targetY: null,
            continuousDirection: null, // For continuous movement mode
            isMoving: false // For continuous movement mode
        };
        
        // Targets array
        this.targets = [];
        
        // Input system
        this.keys = {};
        this.lastDirection = null;
        
        // Audio system
        this.audioContext = null;
        this.sounds = {};
        
        this.init();
    }
    
    async init() {
        this.setupCanvas();
        this.setupAudio();
        this.loadSettings();
        this.setupEventListeners();
        this.setupAccessibility();

        // Register all modal scenes with SceneManager if available
        if (window.sceneManager) {
            if (window.HelpScene) window.sceneManager.register('help', new window.HelpScene());
            if (window.StatsScene) window.sceneManager.register('stats', new window.StatsScene());
            if (window.SettingsScene) window.sceneManager.register('settings', new window.SettingsScene());
            if (window.SessionScene) window.sceneManager.register('session', new window.SessionScene());
            if (window.ReplayScene) window.sceneManager.register('replay', new window.ReplayScene());
            if (window.PauseScene) window.sceneManager.register('pause', new window.PauseScene());
            if (window.ResultsScene) window.sceneManager.register('results', new window.ResultsScene());
        }

        // Optional: Universal Input Manager (off by default for safety)
        this.useUniversalInput = true;
        if (window.UniversalInputManager) {
            this.inputBridge = new window.UniversalInputManager();
            if (this.useUniversalInput) {
                this.enableUniversalInputBridge();
                // Default to keyboard on load; settings panel can change this later
                this.inputBridge.switchInputMethod('keyboard');
            }
            // Reflect current method in UI
            const updateInputLabel = () => {
                const el = document.getElementById('current-input-method');
                if (el && this.inputBridge) el.textContent = this.inputBridge.activeMethod ? this.inputBridge.activeMethod : 'Keyboard';
            };
            updateInputLabel();
            this.inputBridge.on('system', (evt) => {
                if (evt.data && evt.data.type === 'inputMethodChanged') updateInputLabel();
            });
            // URL param support: ?input=keyboard|switch|eyeGaze|touch
            try {
                const params = new URLSearchParams(window.location.search);
                const method = params.get('input');
                const allowed = ['keyboard', 'switch', 'eyeGaze', 'touch'];
                if (method && allowed.includes(method)) {
                    if (!this.useUniversalInput) {
                        this.useUniversalInput = true;
                        this.enableUniversalInputBridge();
                    }
                    this.inputBridge.switchInputMethod(method);
                    updateInputLabel();
                }
            } catch (e) {}
        }
        
        // Initialize session but don't start
        this.initializeNewSession();
        
        // Start with main menu visible
        this.showMainMenu();
        
        // Start game loop only if no external engine is planned to drive updates
        // Detect bootstrap: presence of Engine + SceneManager and not disabled via ?engine=off
        const urlParams = new URLSearchParams(window.location.search);
        const externalEngineDisabled = urlParams.get('engine') === 'off';
        const externalEngineAvailable = !!(window.Engine && window.SceneManager);
        if (!externalEngineAvailable || externalEngineDisabled) {
            // Fall back to legacy loop
            this.gameLoop();
        } else {
            // External engine will take over via GameScene; avoid even the first legacy tick
            window.__SCENE_ENGINE_ACTIVE__ = true;
        }
        
        // Update UI
        this.updateUI();
        this.updateSoundButton();
        
        // Make testing available globally for easy debugging
        window.testReplaySystem = () => this.testReplayCodeAccuracy();
        this._log('🧪 To test replay code accuracy, run: testReplaySystem()');
    }

    enableUniversalInputBridge() {
        if (!this.inputBridge) return;
        // Feed events into existing input handlers
        this.inputBridge.on('movement', (evt) => {
            const dir = evt.data.direction;
            if (!dir) return;
            // Start timed session on first input
            if (this.gameState === 'ready') this.beginTimedSession();
            if (dir === 'stop') {
                // No-op; discrete movement relies on key state
                return;
            }
            if (this.sessionConfig.inputMethod === 'continuous') {
                this.setContinuousDirection(dir);
            } else if (this.sessionConfig.inputMethod === 'discrete') {
                // Directly move a small step to emulate key repeat when buffer enabled
                this.movePlayer(dir);
            }
        });
        this.inputBridge.on('action', (evt) => {
            const action = evt.data.action;
            if (action === 'pause') this.togglePlayPause();
            if (action === 'confirm') this.startSession();
            if (action === 'tap' && this.sessionConfig.inputMethod === 'mouse') {
                // Map tap to click-to-move center point when possible
                const coords = evt.data.coordinates;
                if (coords) {
                    const rect = this.canvas.getBoundingClientRect();
                    this.player.targetX = coords.x - rect.left;
                    this.player.targetY = coords.y - rect.top;
                    if (this.gameState === 'ready') this.beginTimedSession();
                }
            }
        });
        this.inputBridge.on('interface', (evt) => {
            const cmd = evt.data.command;
            if (cmd === 'menu') this.returnToMainMenu();
            if (cmd === 'help') this.openHelp();
            if (cmd === 'mute') this.toggleSound();
        });
        this._log('Universal Input Bridge enabled');
    }

    // Guarded logger
    _log(...args) {
        if (this.debug) console.log(...args);
    }
    
    showMainMenu() {
        // Show main menu and hide game interface
        document.getElementById('main-menu').style.display = 'flex';
        document.getElementById('game-interface').style.display = 'none';
        this.gameState = 'menu';
    }
    
    // Session Management Methods
    loadSessionHistory() {
        try {
            const saved = localStorage.getItem('giocoSessionHistory');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.warn('Failed to load session history:', error);
            return [];
        }
    }
    
    saveSessionHistory() {
        try {
            // Keep only last 10 sessions
            const historyToSave = this.sessionHistory.slice(-10);
            localStorage.setItem('giocoSessionHistory', JSON.stringify(historyToSave));
        } catch (error) {
            console.warn('Failed to save session history:', error);
        }
    }
    
    generateSessionSeed() {
        // Generate a random memorable text seed
        const adjectives = ['blue', 'red', 'bright', 'calm', 'quick', 'gentle', 'happy', 'smooth'];
        const nouns = ['circle', 'star', 'path', 'journey', 'practice', 'session', 'target', 'challenge'];
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${adjective}-${noun}`;
    }
    
    // Convert text seed to numeric seed for consistent random generation
    textToNumericSeed(textSeed) {
        if (!textSeed || textSeed.trim() === '') {
            return Math.floor(Math.random() * 1000000);
        }
        
        // Simple hash function to convert text to number
        let hash = 0;
        const str = textSeed.toLowerCase().trim();
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    
    initializeNewSession(seed = null) {
        // Handle replay codes and auto-generation
        let finalSeed;
        let configFromCode = null;
        
        if (seed) {
            // If we have a seed parameter, try to decode configuration from it (REPLAY MODE)
            configFromCode = this.decodeReplayCode(seed);
            if (configFromCode) {
                // Apply the decoded configuration to sessionConfig
                this.sessionConfig = { ...this.sessionConfig, ...configFromCode };
                console.log('🎮 Applied configuration from replay code:', configFromCode);
            }
            finalSeed = seed;
        } else if (this.sessionConfig.seed) {
            // Use seed from session config if provided (FORM MODE - seed is pre-generated)
            finalSeed = this.sessionConfig.seed;
            console.log('🎮 Using form configuration with pre-generated seed:', finalSeed);
        } else {
            // Auto-generate a new replay code from current session config (FALLBACK)
            finalSeed = this.generateReplayCodeFromConfig(this.sessionConfig);
            console.log('🎮 Auto-generated new replay code from session config:', finalSeed);
        }
        
        this.currentSession = {
            seed: finalSeed,
            startTime: null,
            endTime: null,
            totalTime: 0,
            pausedTime: 0,
            pauseStartTime: null,
            targetsCollected: 0,
            // Track only core targets for progress (stationary + moving + flee)
            totalTargets: (
                (this.sessionConfig.targetCounts?.stationary || 0) +
                (this.sessionConfig.targetCounts?.moving || 0) +
                (this.sessionConfig.targetCounts?.flee || 0)
            ),
            coreTargetsCollected: 0, // Track core targets separately
            bonusTargetsCollected: 0, // Track bonus targets
            hazardTargetsHit: 0, // Track hazard targets hit
            completed: false,
            timeAdjustments: 0 // Track bonus/penalty time adjustments
        };
        
        // Set seed for reproducible random generation
        this.sessionConfig.seed = this.currentSession.seed;
        
        // Note: Seeded random number generator will be initialized later
        // when targets are actually generated to avoid state corruption
        
        // Generate targets using the seeded random - but only if canvas is properly sized
        // If canvas is small (not yet properly set up), skip target generation for now
        if (this.canvas.width > 400 && this.canvas.height > 200) {
            this.generateSessionTargets();
        } else {
            console.log('🎯 Canvas too small, deferring target generation until interface is shown');
        }
    }
    
    startSession() {
    /**
     * Prepare a new session: puts game in 'ready' state and focuses canvas.
     * Actual implementation lives in DSG.sessionTiming.startSession.
     */
    if(window.DSG && window.DSG.sessionTiming){ window.DSG.sessionTiming.startSession(this); return; }
        // Fallback if module missing
        this.gameState='ready'; this.canvas.focus(); this.updatePlayPauseButton();
    }
    
    // New method to actually begin the timed session
    beginTimedSession() {
    /**
     * Start timing on first movement input from ready state.
     * Delegated to DSG.sessionTiming.beginTimedSession.
     */
    if(window.DSG && window.DSG.sessionTiming){ window.DSG.sessionTiming.beginTimedSession(this); return; }
        if(this.gameState!=='ready') return; this.currentSession.startTime=Date.now(); this.gameState='playing'; this.updatePlayPauseButton();
    }
    
    completeSession() {
        this.currentSession.endTime = Date.now();
        this.currentSession.completed = true;
        this.currentSession.totalTime = this.calculateSessionTime();
        
        // Add to session history
        const sessionToSave = {
            ...this.currentSession,
            config: { ...this.sessionConfig }
        };
        console.log('💾 Saving session with seed:', sessionToSave.seed);
        this.sessionHistory.push(sessionToSave);
        this.saveSessionHistory();
        
        this.gameState = 'completed';
    this.showSessionResults();
        
        // Play completion sound
        if (this.sounds.levelComplete) this.sounds.levelComplete();
        
        this.announceToScreenReader(`Session completed! Time: ${this.formatTime(this.currentSession.totalTime)}. All targets collected!`);
    }
    
    calculateSessionTime() {
    /**
     * Compute elapsed session time including adjustments (bonus/hazard).
     */
    if(window.DSG && window.DSG.sessionTiming) return window.DSG.sessionTiming.calculateSessionTime(this);
        if(!this.currentSession.startTime) return 0; const endTime=this.currentSession.endTime||Date.now(); const total=endTime-this.currentSession.startTime; return total - this.currentSession.pausedTime + (this.currentSession.timeAdjustments*1000);
    }
    
    formatTime(milliseconds) {
    /**
     * Format milliseconds into human-readable mm:ss.ms string.
     */
    if(window.DSG && window.DSG.sessionTiming) return window.DSG.sessionTiming.formatTime(milliseconds);
        const neg=milliseconds<0; const abs=Math.abs(milliseconds); const s=Math.floor(abs/1000); const m=Math.floor(s/60); const rs=s%60; const cs=Math.floor((abs%1000)/10); const base=m>0?`${m}:${rs.toString().padStart(2,'0')}.${cs.toString().padStart(2,'0')}`:`${rs}.${cs.toString().padStart(2,'0')}s`; return neg?`-${base}`:base;
    }
    
    // Seeded Random Number Generator for reproducible sessions
        seededRandom() { return (window.DSG && window.DSG.targets) ? window.DSG.targets.seededRandom(this) : Math.random(); }
    /** Generate all targets deterministically for current session seed */
    generateSessionTargets() { if(window.DSG && window.DSG.targets) { window.DSG.targets.generateSessionTargets(this); } }
    /** Create a single deterministic target (internal helper used by generation) */
    createDeterministicTarget(type, size) { if(window.DSG && window.DSG.targets) { return window.DSG.targets.createDeterministicTarget(this, type, size); } }
    /** Position player based on current session seed */
    setSeededPlayerPosition() { if(window.DSG && window.DSG.targets) { window.DSG.targets.setSeededPlayerPosition(this); } }
    /** Initialize linear congruential RNG with provided numeric seed */
    seedRandom(seed) { if(window.DSG && window.DSG.targets) { window.DSG.targets.seedRandom(this, seed); } else { this.seedValue = seed; } }
    /** Convert replay code text into numeric seed (hash). */
    hashCodeToSeed(code) { if(window.DSG && window.DSG.targets) { return window.DSG.targets.hashCodeToSeed(code); } return 0; }
    
    setupCanvas() {
        // Set canvas size to fill the container
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth - 20; // Account for padding
        const containerHeight = container.clientHeight - 20; // Account for padding
        
        // Set canvas size to fill the container
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
        
        // Update canvas style to fill container
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        
        // Don't automatically set player position here - let seeded positioning handle it
        // Only set center position if player position is not yet initialized
        if (this.player.x === 0 && this.player.y === 0) {
            this.player.x = containerWidth / 2;
            this.player.y = containerHeight / 2;
            console.log('🎯 Set initial default player position (center):', Math.round(this.player.x), ',', Math.round(this.player.y));
        }
    }
    
    setSeededPlayerPosition() {
        // Set player position based on session seed for reproducibility
        if (this.currentSession && this.currentSession.seed) {
            // Ensure seeded random is initialized (in case this is called separately)
            if (!this.seedValue) {
                const numericSeed = this.hashCodeToSeed(this.currentSession.seed);
                this.seedRandom(numericSeed);
            }
            
            const margin = this.player.size + 20; // Keep player away from edges
            
            this.player.x = margin + this.seededRandom() * (this.canvas.width - 2 * margin);
            this.player.y = margin + this.seededRandom() * (this.canvas.height - 2 * margin);
            
            console.log('🎯 Set seeded player position:', Math.round(this.player.x), ',', Math.round(this.player.y), 'with seed:', this.currentSession.seed);
        } else {
            // Default to center if no seed
            this.player.x = this.canvas.width / 2;
            this.player.y = this.canvas.height / 2;
            console.log('🎯 Set default player position (center):', Math.round(this.player.x), ',', Math.round(this.player.y));
        }
        
        // Clear player trail when position is set
        this.player.trail = [];
    }
    
    setupAudio() {
        if (!this.settings.audioEnabled) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createSounds();
        } catch (error) {
            console.warn('Audio not supported:', error);
            this.settings.audioEnabled = false;
        }
    }
    
    createSounds() {
        // Create simple beep sounds using Web Audio API
        this.sounds = {
            move: () => this.playBeep(220, 0.1),
            collect: () => this.playBeep(440, 0.2),
            levelComplete: () => this.playBeep(660, 0.5)
        };
    }
    
    playBeep(frequency, duration) {
        if (!this.audioContext || !this.settings.audioEnabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    // (Deprecated) Legacy generateReplayCode removed – use generateReplayCodeFromConfig instead.
    
    hashCodeToSeed(code) {
        // Convert replay code to a numeric seed for deterministic generation
        let hash = 0;
        if (!code || code.length === 0) return Math.random();
        
        for (let i = 0; i < code.length; i++) {
            const char = code.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Ensure positive seed
        return Math.abs(hash);
    }
    
    seedRandom(seed) {
        // Initialize the seeded random number generator without advancing the state
        this.seedValue = seed;
        console.log('🌱 Initialized seed value:', this.seedValue);
    }
    
    setupEventListeners() {
        // Keyboard events via input module
    // Wire keyboard events (delegated); fallback attaches minimal listeners if module missing
    if(window.DSG && window.DSG.input) { window.DSG.input.wireDocumentKeyboard(this); } else {
            document.addEventListener('keydown', (e) => this.handleKeyDown(e));
            document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        }
        
        // Main menu card events
        document.getElementById('configure-session-btn').addEventListener('click', () => this.openSessionSetup());
        document.getElementById('play-replay-btn').addEventListener('click', () => this.openReplayEntry());
        document.getElementById('progress-history-btn').addEventListener('click', () => this.openStats());
        document.getElementById('help-support-btn').addEventListener('click', () => this.openHelp());
        
        // Secondary menu events
        document.getElementById('sound-toggle-btn').addEventListener('click', () => this.toggleSound());
        document.getElementById('fullscreen-toggle-btn').addEventListener('click', () => this.toggleFullscreen());
        
        // Modal events
        this.setupModalEvents();
        
        // Canvas focus management
        this.canvas.addEventListener('click', () => this.canvas.focus());
        
        // Setup mouse events if needed
        this.setupMouseEvents();
        
        // Resize handling
        window.addEventListener('resize', () => this.handleResize());
        
        // Fullscreen change
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
    }
    
    setupModalEvents() {
        // Only attach fallback listeners when corresponding scene is unavailable
        const attachIfNoScene = (sceneCtor, modalId, bindingsFn) => {
            const hasScene = !!(window.sceneManager && sceneCtor);
            if (!hasScene) bindingsFn();
        };

        // Clear history button (not scene managed)
        const clearHistoryBtn = document.getElementById('clear-history-btn');
        if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => this.clearHistory());

        attachIfNoScene(window.SettingsScene, 'settings-modal', () => {
            const modal = document.getElementById('settings-modal');
            if (!modal) return;
            const closeBtn = modal.querySelector('.modal-close');
            const saveBtn = document.getElementById('save-settings');
            const cancelBtn = document.getElementById('cancel-settings');
            if (closeBtn) closeBtn.addEventListener('click', () => modal.close());
            if (saveBtn) saveBtn.addEventListener('click', () => this.saveSettings());
            if (cancelBtn) cancelBtn.addEventListener('click', () => modal.close());
        });

        attachIfNoScene(window.HelpScene, 'help-modal', () => {
            const modal = document.getElementById('help-modal');
            if (!modal) return;
            const closeBtns = [modal.querySelector('.modal-close'), document.getElementById('close-help')];
            closeBtns.forEach(btn => btn && btn.addEventListener('click', () => {
                modal.close();
                if (this.gameState === 'menu') this.showMainMenu();
            }));
        });

        attachIfNoScene(window.StatsScene, 'stats-modal', () => {
            const modal = document.getElementById('stats-modal');
            if (!modal) return;
            const closeBtns = [modal.querySelector('.modal-close'), document.getElementById('close-stats')];
            closeBtns.forEach(btn => btn && btn.addEventListener('click', () => {
                modal.close();
                if (this.gameState === 'menu') this.showMainMenu();
            }));
        });

        attachIfNoScene(window.SessionScene, 'session-modal', () => {
            const modal = document.getElementById('session-modal');
            if (!modal) return;
            const closeBtn = modal.querySelector('.modal-close');
            const startBtn = document.getElementById('start-session');
            const cancelBtn = document.getElementById('cancel-session');
            if (closeBtn) closeBtn.addEventListener('click', () => modal.close());
            if (cancelBtn) cancelBtn.addEventListener('click', () => modal.close());
            if (startBtn) startBtn.addEventListener('click', () => this.startNewSession());
        });

        attachIfNoScene(window.ReplayScene, 'replay-modal', () => {
            const modal = document.getElementById('replay-modal');
            if (!modal) return;
            const closeBtn = modal.querySelector('.modal-close');
            const startBtn = document.getElementById('start-replay');
            const cancelBtn = document.getElementById('cancel-replay');
            if (closeBtn) closeBtn.addEventListener('click', () => modal.close());
            if (cancelBtn) cancelBtn.addEventListener('click', () => modal.close());
            if (startBtn) startBtn.addEventListener('click', () => this.startReplaySession());
        });

        attachIfNoScene(window.ResultsScene, 'results-modal', () => {
            const modal = document.getElementById('results-modal');
            if (!modal) return;
            const replayBtn = document.getElementById('replay-game');
            const newBtn = document.getElementById('new-session');
            const closeBtn = document.getElementById('close-results');
            const modalClose = modal.querySelector('.modal-close');
            const toMenu = () => this.returnToMainMenu();
            if (modalClose) modalClose.addEventListener('click', () => { modal.close(); toMenu(); });
            if (closeBtn) closeBtn.addEventListener('click', () => { modal.close(); toMenu(); });
            if (replayBtn) replayBtn.addEventListener('click', () => {
                modal.close();
                this.initializeNewSession(this.currentSession.seed);
                this.startSession();
            });
            if (newBtn) newBtn.addEventListener('click', () => { modal.close(); this.openSessionSetup(); });
        });

        attachIfNoScene(window.PauseScene, 'pause-modal', () => {
            const modal = document.getElementById('pause-modal');
            if (!modal) return;
            const resumeBtn = document.getElementById('resume-session-btn');
            const quitBtn = document.getElementById('quit-session-btn');
            if (resumeBtn) resumeBtn.addEventListener('click', () => { this.hidePauseModal(); this.resumeGame(); });
            if (quitBtn) quitBtn.addEventListener('click', () => { this.hidePauseModal(); this.returnToMainMenu(); });
        });

        // Session form interactivity always needed
        this.setupSessionFormEvents();
    }
    
    setupAccessibility() {
        // Set initial ARIA attributes
        this.canvas.setAttribute('aria-describedby', 'game-status');
        
        // Initial game status announcement
        this.announceToScreenReader('Directional Skills Game loaded. Use arrow keys or WASD to move. Press Space to start.');
    }
    
    setupMouseEvents() {
        // Remove any existing mouse event listeners first
        this.removeMouseEvents();
        
        // Basic mouse event setup for click-to-move
        if (this.sessionConfig.inputMethod === 'mouse') {
            this.mouseClickHandler = (e) => this.handleMouseClick(e);
            this.canvas.addEventListener('click', this.mouseClickHandler);
            this.setCursor('crosshair');
        } else {
            this.setCursor('default');
            // Clear any existing mouse target when mouse click is disabled
            if (this.player) {
                this.player.targetX = null;
                this.player.targetY = null;
            }
        }
    }
    
    removeMouseEvents() {
        if (this.mouseClickHandler) {
            this.canvas.removeEventListener('click', this.mouseClickHandler);
            this.mouseClickHandler = null;
        }
    }
    
    handleKeyDown(e) {
    // Delegate keydown handling (movement / state transitions)
    if(window.DSG && window.DSG.input){ window.DSG.input.handleKeyDown(this,e); return; }
    }
    
    handleKeyUp(e) {
    // Delegate keyup handling
    if(window.DSG && window.DSG.input){ window.DSG.input.handleKeyUp(this,e); return; }
    }
    
    handleMovementInput(keyCode) {
    // Delegate buffered discrete movement
    if(window.DSG && window.DSG.input){ window.DSG.input.handleMovementInput(this,keyCode); }
    }
    
    setContinuousDirection(direction) {
        // Clear any mouse targets when switching to continuous movement
        this.player.targetX = null;
        this.player.targetY = null;
        
        // Set new direction
        this.player.continuousDirection = direction;
        this.player.isMoving = true;
        
        // Play movement sound
        if (this.sounds.move) this.sounds.move();
        
        this.announceToScreenReader(`Moving ${direction} continuously`);
    }
    
    movePlayer(direction) {
        const speed = this.settings.movementSpeed * 2; // Make movement more responsive
        const oldX = this.player.x;
        const oldY = this.player.y;
        
        switch(direction) {
            case 'up':
                this.player.y = Math.max(this.player.size, this.player.y - speed);
                break;
            case 'down':
                this.player.y = Math.min(this.canvas.height - this.player.size, this.player.y + speed);
                break;
            case 'left':
                this.player.x = Math.max(this.player.size, this.player.x - speed);
                break;
            case 'right':
                this.player.x = Math.min(this.canvas.width - this.player.size, this.player.x + speed);
                break;
        }
        
        // Add to trail if player moved
        if (oldX !== this.player.x || oldY !== this.player.y) {
            this.addToTrail(oldX, oldY);
            this.lastDirection = direction;
            
            // Play movement sound
            if (this.sounds.move) this.sounds.move();
            
            // Check for target collisions
            this.checkCollisions();
        }
    }
    
    addToTrail(x, y) {
        this.player.trail.push({ x, y, timestamp: Date.now() });
        
        // Limit trail length
        const maxTrailLength = 15;
        if (this.player.trail.length > maxTrailLength) {
            this.player.trail.shift();
        }
    }

    // Mouse Input Handlers
    handleMouseClick(e) {
    // Delegate click-to-move handling
    if(window.DSG && window.DSG.input){ window.DSG.input.handleMouseClick(this,e); }
    }
    
    checkCollisions() {
    // Delegate collision detection & resolution
    if(window.DSG && window.DSG.collision){ window.DSG.collision.checkCollisions(this); }
    }
    
    collectTarget(index) {
    // Delegate collection effects & scoring
    if(window.DSG && window.DSG.collision){ window.DSG.collision.collectTarget(this,index); }
    }

    handleHazardCollision(target, index) {
    // Delegate hazard collision (time penalty + visual)
    if(window.DSG && window.DSG.collision){ window.DSG.collision.handleHazardCollision(this,target,index); }
    }
    // Legacy target generation helpers removed (replaced by DSG.targets module)
    
    gameLoop() {
        // Keep existing loop unless an external Engine is driving updates
        if (!window.__SCENE_ENGINE_ACTIVE__) {
            this.update();
            this.render();
            requestAnimationFrame(() => this.gameLoop());
        }
    }
    
    update() {
        if (this.gameState !== 'playing' && this.gameState !== 'ready') return;
        
        // Update timer display in real-time (only when playing)
        if (this.gameState === 'playing') {
            this.updateTimerDisplay();
        }
        
        // Update trail fade
        const currentTime = Date.now();
        this.player.trail = this.player.trail.filter(point => 
            currentTime - point.timestamp < 2000
        );
        
        // Handle different input methods
        if (this.sessionConfig.inputMethod === 'continuous') {
            this.updateContinuousMovement();
        } else if (this.sessionConfig.inputMethod === 'discrete') {
            this.updateDiscreteMovement();
        } else if (this.sessionConfig.inputMethod === 'mouse') {
            this.updateClickToMove();
        }
        
    // Target motion & collision effects handled by collision / targets modules now
    }

    updateClickToMove() {
        // Only move if we have a valid target
        if (this.player.targetX === null || this.player.targetY === null) {
            return;
        }
        
        const speed = this.sessionConfig.playerSpeed * 2; // Consistent with other movement methods
        const dx = this.player.targetX - this.player.x;
        const dy = this.player.targetY - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < speed) {
            // Close enough, snap to target
            const oldX = this.player.x;
            const oldY = this.player.y;
            this.player.x = this.player.targetX;
            this.player.y = this.player.targetY;
            this.player.targetX = null;
            this.player.targetY = null;
            
            // Add to trail
            this.addToTrail(oldX, oldY);
            this.checkCollisions();
        } else {
            // Move towards target
            const oldX = this.player.x;
            const oldY = this.player.y;
            this.player.x += (dx / distance) * speed;
            this.player.y += (dy / distance) * speed;
            
            // Keep within bounds
            this.player.x = Math.max(this.player.size, Math.min(this.canvas.width - this.player.size, this.player.x));
            this.player.y = Math.max(this.player.size, Math.min(this.canvas.height - this.player.size, this.player.y));
            
            // Add to trail
            this.addToTrail(oldX, oldY);
            this.checkCollisions();
        }
    }
    
    updateContinuousMovement() {
        if (!this.player.isMoving || !this.player.continuousDirection) return;
        
        const speed = this.sessionConfig.playerSpeed * 2;
        const oldX = this.player.x;
        const oldY = this.player.y;
        
        switch (this.player.continuousDirection) {
            case 'up':
                this.player.y -= speed;
                break;
            case 'down':
                this.player.y += speed;
                break;
            case 'left':
                this.player.x -= speed;
                break;
            case 'right':
                this.player.x += speed;
                break;
        }
        
        // Keep within bounds
        this.player.x = Math.max(this.player.size, Math.min(this.canvas.width - this.player.size, this.player.x));
        this.player.y = Math.max(this.player.size, Math.min(this.canvas.height - this.player.size, this.player.y));
        
        // Add to trail if player actually moved
        if (oldX !== this.player.x || oldY !== this.player.y) {
            this.addToTrail(oldX, oldY);
        }
        
        this.checkCollisions();
    }
    
    updateDiscreteMovement() {
        // Handle traditional press-and-hold movement
        const speed = this.sessionConfig.playerSpeed * 2;
        const oldX = this.player.x;
        const oldY = this.player.y;
        let moved = false;
        
        if (this.keys['ArrowUp'] || this.keys['KeyW']) {
            this.player.y -= speed;
            moved = true;
        }
        if (this.keys['ArrowDown'] || this.keys['KeyS']) {
            this.player.y += speed;
            moved = true;
        }
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.player.x -= speed;
            moved = true;
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.player.x += speed;
            moved = true;
        }
        
        if (moved) {
            // Keep within bounds
            this.player.x = Math.max(this.player.size, Math.min(this.canvas.width - this.player.size, this.player.x));
            this.player.y = Math.max(this.player.size, Math.min(this.canvas.height - this.player.size, this.player.y));
            
            // Add to trail if player actually moved
            if (oldX !== this.player.x || oldY !== this.player.y) {
                this.addToTrail(oldX, oldY);
            }
            
            this.checkCollisions();
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'ready') {
            // Draw trail
            this.drawTrail();
            
            // Draw targets
            this.drawTargets();
            
            // Draw player
            this.drawPlayer();
            
            // Draw ready instructions if in ready state
            if (this.gameState === 'ready') {
                this.drawReadyInstructions();
            }
            
            // Draw pause overlay if paused
            if (this.gameState === 'paused') {
                this.drawPauseOverlay();
            }
        } else {
            // Draw menu screen
            this.drawMenuScreen();
        }
    }
    
    drawTrail() {
        if (this.settings.reducedMotion || this.player.trail.length < 2) return;
        
        this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.3)';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        
        for (let i = 0; i < this.player.trail.length; i++) {
            const point = this.player.trail[i];
            if (i === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        }
        
        this.ctx.stroke();
    }
    
    drawPlayer() {
        // Draw player as a rounded rectangle to distinguish from circular targets
        const size = this.player.size;
        const cornerRadius = size * 0.3; // Rounded corners
        
        // Add a subtle glow effect for better visibility
        this.ctx.shadowColor = '#ffffff';
        this.ctx.shadowBlur = 8;
        
        // Draw player border for enhanced visibility
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.drawRoundedRect(this.player.x - size, this.player.y - size, size * 2, size * 2, cornerRadius, false, true);
        
        // Draw main player rounded rectangle
        this.ctx.fillStyle = this.player.color;
        this.drawRoundedRect(this.player.x - size, this.player.y - size, size * 2, size * 2, cornerRadius, true, false);
        
        // Reset shadow effects
        this.ctx.shadowBlur = 0;
        this.ctx.shadowColor = 'transparent';
        
        // Draw direction indicator with simple, thick arrow
        if (this.lastDirection) {
            // Draw custom thick arrow shape
            this.ctx.fillStyle = '#000000'; // Black arrow
            this.ctx.strokeStyle = '#ffffff'; // White outline for visibility
            this.ctx.lineWidth = 1;
            
            const arrowSize = size * 0.5;
            this.drawCustomArrow(this.player.x, this.player.y, arrowSize, this.lastDirection);
        }
    }
    
    drawReadyInstructions() {
        // Draw centered message with high contrast for maximum visibility
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Draw semi-transparent background for text readability
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(centerX - 120, centerY - 25, 240, 50);
        
        // Draw white text with large, bold font
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Simple clear message
        if (this.sessionConfig.inputMethod === 'mouse') {
            this.ctx.fillText('Click to start', centerX, centerY);
        } else {
            this.ctx.fillText('Move to start', centerX, centerY);
        }
    }
    
    drawRoundedRect(x, y, width, height, radius, fill, stroke) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        
        if (fill) {
            this.ctx.fill();
        }
        if (stroke) {
            this.ctx.stroke();
        }
    }
    
    drawCustomArrow(x, y, size, direction) {
        this.ctx.beginPath();
        
        switch (direction) {
            case 'up':
                this.ctx.moveTo(x, y - size);           // Top point
                this.ctx.lineTo(x - size * 0.6, y + size * 0.2); // Bottom left
                this.ctx.lineTo(x - size * 0.25, y + size * 0.2); // Inner left
                this.ctx.lineTo(x - size * 0.25, y + size); // Stem left
                this.ctx.lineTo(x + size * 0.25, y + size); // Stem right
                this.ctx.lineTo(x + size * 0.25, y + size * 0.2); // Inner right
                this.ctx.lineTo(x + size * 0.6, y + size * 0.2); // Bottom right
                break;
                
            case 'down':
                this.ctx.moveTo(x, y + size);           // Bottom point
                this.ctx.lineTo(x - size * 0.6, y - size * 0.2); // Top left
                this.ctx.lineTo(x - size * 0.25, y - size * 0.2); // Inner left
                this.ctx.lineTo(x - size * 0.25, y - size); // Stem left
                this.ctx.lineTo(x + size * 0.25, y - size); // Stem right
                this.ctx.lineTo(x + size * 0.25, y - size * 0.2); // Inner right
                this.ctx.lineTo(x + size * 0.6, y - size * 0.2); // Top right
                break;
                
            case 'left':
                this.ctx.moveTo(x - size, y);           // Left point
                this.ctx.lineTo(x + size * 0.2, y - size * 0.6); // Top right
                this.ctx.lineTo(x + size * 0.2, y - size * 0.25); // Inner top
                this.ctx.lineTo(x + size, y - size * 0.25); // Stem top
                this.ctx.lineTo(x + size, y + size * 0.25); // Stem bottom
                this.ctx.lineTo(x + size * 0.2, y + size * 0.25); // Inner bottom
                this.ctx.lineTo(x + size * 0.2, y + size * 0.6); // Bottom right
                break;
                
            case 'right':
                this.ctx.moveTo(x + size, y);           // Right point
                this.ctx.lineTo(x - size * 0.2, y - size * 0.6); // Top left
                this.ctx.lineTo(x - size * 0.2, y - size * 0.25); // Inner top
                this.ctx.lineTo(x - size, y - size * 0.25); // Stem top
                this.ctx.lineTo(x - size, y + size * 0.25); // Stem bottom
                this.ctx.lineTo(x - size * 0.2, y + size * 0.25); // Inner bottom
                this.ctx.lineTo(x - size * 0.2, y + size * 0.6); // Bottom left
                break;
        }
        
        this.ctx.closePath();
        
        // Draw arrow with subtle white outline for visibility
        this.ctx.stroke();
        this.ctx.fill();
    }
    
    drawTargets() {
        this.targets.forEach(target => {
            this.drawSingleTarget(target);
        });
    }

    drawSingleTarget(target) {
        // Draw targets with distinct shapes based on type
        let size = target.size; // No pulsing - consistent size
        
        // Apply special effects based on target type (non-animated)
        switch (target.type) {
            case 'bonus':
                // Draw rounded star shape (no glow - clean style like other targets)
                this.drawRoundedStar(target.x, target.y, size, target.color);
                break;
                
            case 'hazard':
                // Draw rounded triangle shape (no glow - clean style like other targets)
                this.drawRoundedTriangle(target.x, target.y, size, target.color);
                break;
                
            case 'flee':
                // Draw detection radius when player is close (static)
                const dx = this.player.x - target.x;
                const dy = this.player.y - target.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < target.detectionRadius) {
                    this.ctx.strokeStyle = 'rgba(155, 89, 182, 0.3)';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(target.x, target.y, target.detectionRadius, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
                // Draw circular target (keep circles for core targets)
                this.drawCircularTarget(target.x, target.y, size, target.color);
                break;
                
            case 'moving':
            case 'static':
            default:
                // Draw circular target (keep circles for core targets)
                this.drawCircularTarget(target.x, target.y, size, target.color);
                break;
        }
        
        // Add type indicator for moving and flee targets only
        // Removed - using pure solid shapes for therapeutic simplicity
        
        // Reset shadow effects
        this.ctx.shadowBlur = 0;
    }

    drawTargetTypeIndicator(target, size) {
        // Removed - using pure solid shapes without any text symbols
        // This provides better therapeutic design and cognitive simplicity
    }

    // Helper function to draw circular targets (core targets)
    drawCircularTarget(x, y, size, color) {
        // Draw light fill with thick outline - therapeutic and visible
        
        // Light transparent fill
        this.ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ', 0.2)');
        // Fallback for hex colors
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
        }
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Thick colored outline for visibility
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    // Custom shape: Star inside circle for bonus targets
    drawRoundedStar(x, y, size, color) {
        const ctx = this.ctx;
        
        // Draw circular background with transparent fill like other targets
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw thick circular outline
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.stroke();
        
        const spikes = 6; // 6-pointed star for bonus
        const outerRadius = size * 0.7; // Scale to fit nicely in circle
        const innerRadius = size * 0.4; // Adjusted for better proportions
        
        // Create smooth star shape using bezier curves
        const points = [];
        for (let i = 0; i < spikes * 2; i++) {
            const angle = (i * Math.PI) / spikes - Math.PI / 2; // Start from top
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            points.push({
                x: x + Math.cos(angle) * radius,
                y: y + Math.sin(angle) * radius
            });
        }
        
        // Draw solid star shape inside the circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            const current = points[i];
            const next = points[(i + 1) % points.length];
            
            // Create control points for smooth curves
            const controlDistance = size * 0.07;
            const angle1 = Math.atan2(current.y - y, current.x - x);
            const angle2 = Math.atan2(next.y - y, next.x - x);
            
            const cp1x = current.x - Math.cos(angle1) * controlDistance;
            const cp1y = current.y - Math.sin(angle1) * controlDistance;
            const cp2x = next.x - Math.cos(angle2) * controlDistance;
            const cp2y = next.y - Math.sin(angle2) * controlDistance;
            
            ctx.quadraticCurveTo(cp1x, cp1y, current.x, current.y);
            if (i === points.length - 1) {
                ctx.quadraticCurveTo(cp2x, cp2y, points[0].x, points[0].y);
            }
        }
        
        ctx.closePath();
        ctx.fill();
    }

    // Custom shape: Triangle inside circle for hazard targets
    drawRoundedTriangle(x, y, size, color) {
        const ctx = this.ctx;
        
        // Draw circular background with transparent fill like other targets
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw thick circular outline
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw triangle that fits nicely inside the circle
        const triangleSize = size * 0.8; // Use most of the circle
        const height = triangleSize * 1.2;
        const width = triangleSize * 1.4;
        const cornerRadius = size * 0.08; // Smaller radius for larger triangle
        
        // Calculate triangle points (pointing up - warning sign style)
        const top = { x: x, y: y - height * 0.5 };
        const bottomLeft = { x: x - width * 0.5, y: y + height * 0.5 };
        const bottomRight = { x: x + width * 0.5, y: y + height * 0.5 };
        
        // Draw solid triangle inside the circle
        ctx.fillStyle = color;
        ctx.beginPath();
        
        // Start from top point, moving clockwise
        ctx.moveTo(top.x - cornerRadius, top.y);
        
        // Top to bottom-right with rounded corner
        ctx.arcTo(top.x, top.y, bottomRight.x, bottomRight.y, cornerRadius);
        ctx.arcTo(bottomRight.x, bottomRight.y, bottomLeft.x, bottomLeft.y, cornerRadius);
        
        // Bottom edge to bottom-left with rounded corner
        ctx.arcTo(bottomLeft.x, bottomLeft.y, top.x, top.y, cornerRadius);
        
        // Close back to top
        ctx.closePath();
        ctx.fill();
    }

    drawPauseOverlay() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Press Space to resume', this.canvas.width / 2, this.canvas.height / 2 + 50);
    }
    
    drawMenuScreen() {
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 28px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Directional Skills Game', this.canvas.width / 2, this.canvas.height / 2 - 40);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Press Space or click Play to start', this.canvas.width / 2, this.canvas.height / 2 + 10);
        
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Use Arrow Keys or WASD to move', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }
    
    // UI Management
    updateTimerDisplay() {
    // Delegate timer DOM update
    if(window.DSG && window.DSG.uiSession){ window.DSG.uiSession.updateTimerDisplay(this); }
    }
    
    updateUI() {
    // Delegate dynamic UI updates
    if(window.DSG && window.DSG.uiSession){ window.DSG.uiSession.updateUI(this); }
    }
    
    updateStatsModal() {
    // Delegate statistics modal content refresh
    if(window.DSG && window.DSG.uiSession){ window.DSG.uiSession.updateStatsModal(this); }
    }
    
    updateSessionHistory() {
    // Delegate session history list refresh
    if(window.DSG && window.DSG.uiSession){ window.DSG.uiSession.updateSessionHistory(this); }
    }
    
    copyReplayCode(replayCode) {
        if (!replayCode || replayCode === 'N/A') {
            this.announceToScreenReader('No replay code available for this session');
            return;
        }
        
        // Copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(replayCode).then(() => {
                this.announceToScreenReader(`Replay code ${replayCode} copied to clipboard`);
                this.showToast(`Replay code copied: ${replayCode}`);
            }).catch(err => {
                console.warn('Failed to copy to clipboard:', err);
                this.fallbackCopyToClipboard(replayCode);
            });
        } else {
            this.fallbackCopyToClipboard(replayCode);
        }
    }
    
    // NOTE: unified fallbackCopyToClipboard defined once (duplicate removed further below)
    fallbackCopyToClipboard(text) { this._fallbackCopyToClipboardUnified(text); }
    
    showToast(message) {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary-color);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Fade in
        setTimeout(() => toast.style.opacity = '1', 10);
        
        // Fade out and remove
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 2000);
    }
    
    clearHistory() {
        // Confirm before clearing
        if (confirm('Are you sure you want to clear all progress and session history? This action cannot be undone.')) {
            this.sessionHistory = [];
            this.saveSessionHistory();
            this.updateStatsModal();
            this.showToast('Progress and history cleared');
            this.announceToScreenReader('All progress and session history has been cleared');
        }
    }
    
    // Game Control Methods
    startGame() {
        this.gameState = 'playing';
        this.canvas.focus();
        this.updatePlayPauseButton();
        this.announceToScreenReader('Game started. Use arrow keys or WASD to move and collect targets.');
    }
    
    pauseGame() {
        this.gameState = 'paused';
        // Record when the pause started
        this.pauseStartTime = Date.now();
        this.updatePlayPauseButton();
        this.announceToScreenReader('Game paused');
    }
    
    resumeGame() {
        this.gameState = 'playing';
        // Add the paused duration to total paused time
        if (this.pauseStartTime) {
            this.totalPausedTime += Date.now() - this.pauseStartTime;
            this.pauseStartTime = null;
        }
        this.canvas.focus();
        this.updatePlayPauseButton();
        this.announceToScreenReader('Game resumed');
    }
    
    togglePlayPause() {
        if (this.gameState === 'menu') {
            this.startGame();
        } else if (this.gameState === 'playing') {
            this.pauseGame();
        } else if (this.gameState === 'paused') {
            this.resumeGame();
        }
    }
    
    // Modal Management
    openSettings() {
        this.pauseGame();
    if (window.sceneManager && window.SettingsScene) window.sceneManager.switch('settings');
    }
    
    openStats() {
        this.pauseGame();
    if (window.sceneManager && window.StatsScene) window.sceneManager.switch('stats');
    }
    
    openHelp() {
        this.pauseGame();
    if (window.sceneManager && window.HelpScene) window.sceneManager.switch('help');
    }
    
    openReplayEntry() {
        this.pauseGame();
    if (window.sceneManager && window.ReplayScene) window.sceneManager.switch('replay');
    }
    
    loadSettingsToForm() {
        document.getElementById('movement-speed').value = this.settings.movementSpeed;
        document.getElementById('input-buffering').checked = this.settings.inputBuffering;
        document.getElementById('reduced-motion').checked = this.settings.reducedMotion;
        document.getElementById('audio-enabled').checked = this.settings.audioEnabled;
        document.getElementById('resize-handling').value = this.settings.resizeHandling;
    }
    
    saveSettings() {
        this.settings.movementSpeed = parseInt(document.getElementById('movement-speed').value);
        this.settings.inputBuffering = document.getElementById('input-buffering').checked;
        this.settings.reducedMotion = document.getElementById('reduced-motion').checked;
        this.settings.audioEnabled = document.getElementById('audio-enabled').checked;
        this.settings.resizeHandling = document.getElementById('resize-handling').value;

        // Assistive input settings
        const universalEnabledEl = document.getElementById('universal-input-enabled');
        const assistiveMethodEl = document.getElementById('assistive-input-method');
        if (universalEnabledEl) {
            this.useUniversalInput = universalEnabledEl.checked;
            if (this.inputBridge) {
                if (this.useUniversalInput) {
                    this.enableUniversalInputBridge();
                } else {
                    // Soft disable by switching to keyboard method and clearing queue
                    this.inputBridge.switchInputMethod('keyboard');
                    this.inputBridge.clearEvents();
                }
            }
        }
        if (assistiveMethodEl && this.inputBridge) {
            this.inputBridge.switchInputMethod(assistiveMethodEl.value);
        }
        
        // Apply settings
        this.applySettings();
        
        // Save to localStorage
        localStorage.setItem('directionalSkillsSettings', JSON.stringify(this.settings));
        
        // Close modal
        document.getElementById('settings-modal').close();
        
        this.announceToScreenReader('Settings saved');
    }
    
    applySettings() {
        // Update audio button - check both old and new button IDs for compatibility
        const soundBtn = document.getElementById('sound-toggle-btn') || document.getElementById('sound-btn');
        if (soundBtn) {
            if (this.settings.audioEnabled) {
                // Update for new Material Icons interface
                const icon = soundBtn.querySelector('.material-icons');
                const label = soundBtn.querySelector('.btn-label');
                if (icon) icon.textContent = 'volume_up';
                if (label) label.textContent = 'Sound On';
                soundBtn.setAttribute('aria-label', 'Turn sound off');
            } else {
                const icon = soundBtn.querySelector('.material-icons');
                const label = soundBtn.querySelector('.btn-label');
                if (icon) icon.textContent = 'volume_off';
                if (label) label.textContent = 'Sound Off';
                soundBtn.setAttribute('aria-label', 'Turn sound on');
            }
        }
        
        // Recreate audio context if needed
        if (this.settings.audioEnabled && !this.audioContext) {
            this.setupAudio();
        }

        // Sync Assistive Input form values if present
        const universalEnabledEl = document.getElementById('universal-input-enabled');
        const assistiveMethodEl = document.getElementById('assistive-input-method');
        if (universalEnabledEl) universalEnabledEl.checked = !!this.useUniversalInput;
        if (assistiveMethodEl && this.inputBridge) {
            assistiveMethodEl.value = this.inputBridge.activeMethod || 'keyboard';
        }
    }

    // Session Management Methods
    openSessionSetup() {
    console.log('[Game] openSessionSetup called');
    this.pauseGame();
    if (window.sceneManager && window.SessionScene) {
        console.log('[Game] Attempting scene switch to session. Registered scenes:', Array.from(window.sceneManager.scenes.keys()));
        try { window.sceneManager.switch('session'); } catch (e) { console.warn('[Game] scene switch to session failed', e); }
    } else {
        console.warn('[Game] SessionScene missing or sceneManager unavailable; NOT falling back (to expose root cause).');
    }
    }

    loadSessionConfigToForm() {
        // Load current session configuration to form
        
        // Target counts
        document.getElementById('target-static-count').value = this.sessionConfig.targetCounts.stationary;
        document.getElementById('target-static-count-value').textContent = this.sessionConfig.targetCounts.stationary;
        
        document.getElementById('target-moving-count').value = this.sessionConfig.targetCounts.moving;
        document.getElementById('target-moving-count-value').textContent = this.sessionConfig.targetCounts.moving;
        
        document.getElementById('target-flee-count').value = this.sessionConfig.targetCounts.flee;
        document.getElementById('target-flee-count-value').textContent = this.sessionConfig.targetCounts.flee;
        
        document.getElementById('target-bonus-count').value = this.sessionConfig.targetCounts.bonus;
        document.getElementById('target-bonus-count-value').textContent = this.sessionConfig.targetCounts.bonus;
        
        document.getElementById('target-hazard-count').value = this.sessionConfig.targetCounts.hazard;
        document.getElementById('target-hazard-count-value').textContent = this.sessionConfig.targetCounts.hazard;
        
        // Update total
        this.updateTotalTargets();
        
        // Target size
        document.querySelector(`input[name="target-size"][value="${this.sessionConfig.targetSize}"]`).checked = true;
        
        // Player settings
        document.getElementById('player-speed').value = this.sessionConfig.playerSpeed;
        this.updatePlayerSpeedLabel(this.sessionConfig.playerSpeed);
        document.querySelector(`input[name="player-trail"][value="${this.sessionConfig.playerTrail}"]`).checked = true;
        
        // Input method - single exclusive choice
        document.querySelector(`input[name="input-method"][value="${this.sessionConfig.inputMethod}"]`).checked = true;
        document.getElementById('input-buffer').value = this.sessionConfig.inputBuffer;
        document.getElementById('input-buffer-value').textContent = this.sessionConfig.inputBuffer + 'ms';
        
        // Environment
        document.querySelector(`input[name="game-boundaries"][value="${this.sessionConfig.boundaries}"]`).checked = true;
        document.getElementById('feedback-audio').checked = this.sessionConfig.feedback.audio;
        document.getElementById('feedback-visual').checked = this.sessionConfig.feedback.visual;
        document.getElementById('feedback-haptic').checked = this.sessionConfig.feedback.haptic;
    }

    setupSessionFormEvents() {
        // Target count sliders
        document.getElementById('target-static-count').addEventListener('input', (e) => {
            document.getElementById('target-static-count-value').textContent = e.target.value;
            this.updateTotalTargets();
            this.updateLiveReplayCode();
        });
        
        document.getElementById('target-moving-count').addEventListener('input', (e) => {
            document.getElementById('target-moving-count-value').textContent = e.target.value;
            this.updateTotalTargets();
            this.updateLiveReplayCode();
        });
        
        document.getElementById('target-flee-count').addEventListener('input', (e) => {
            document.getElementById('target-flee-count-value').textContent = e.target.value;
            this.updateTotalTargets();
            this.updateLiveReplayCode();
        });
        
        document.getElementById('target-bonus-count').addEventListener('input', (e) => {
            document.getElementById('target-bonus-count-value').textContent = e.target.value;
            this.updateTotalTargets();
            this.updateLiveReplayCode();
        });
        
        document.getElementById('target-hazard-count').addEventListener('input', (e) => {
            document.getElementById('target-hazard-count-value').textContent = e.target.value;
            this.updateTotalTargets();
            this.updateLiveReplayCode();
        });
        
        // Target size radio buttons
        document.querySelectorAll('input[name="target-size"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateLiveReplayCode());
        });
        
        // Player settings
        document.getElementById('player-speed').addEventListener('input', (e) => {
            this.updatePlayerSpeedLabel(e.target.value);
            this.updateLiveReplayCode();
        });
        
        document.querySelectorAll('input[name="player-trail"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateLiveReplayCode());
        });
        
        // Input method radio buttons
        document.querySelectorAll('input[name="input-method"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateLiveReplayCode());
        });
        
        // Input buffer slider
        document.getElementById('input-buffer').addEventListener('input', (e) => {
            document.getElementById('input-buffer-value').textContent = e.target.value + 'ms';
            this.updateLiveReplayCode();
        });
        
        // Environment settings
        document.querySelectorAll('input[name="game-boundaries"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateLiveReplayCode());
        });
        
        // Feedback checkboxes
        document.getElementById('feedback-audio').addEventListener('change', () => this.updateLiveReplayCode());
        document.getElementById('feedback-visual').addEventListener('change', () => this.updateLiveReplayCode());
        document.getElementById('feedback-haptic').addEventListener('change', () => this.updateLiveReplayCode());
    }

    updateTotalTargets() {
        const stationary = parseInt(document.getElementById('target-static-count').value) || 0;
        const moving = parseInt(document.getElementById('target-moving-count').value) || 0;
        const flee = parseInt(document.getElementById('target-flee-count').value) || 0;
        const bonus = parseInt(document.getElementById('target-bonus-count').value) || 0;
        const hazard = parseInt(document.getElementById('target-hazard-count').value) || 0;
        const total = stationary + moving + flee + bonus + hazard;
        document.getElementById('total-targets-value').textContent = total;
    }

    updatePlayerSpeedLabel(speed) {
        const labels = ['Very Slow', 'Slow', 'Normal', 'Fast', 'Very Fast'];
        document.getElementById('player-speed-value').textContent = labels[speed - 1] || 'Normal';
    }

    updateLiveReplayCode() {
        // Don't generate live codes during form editing to avoid confusion
        // The final code will be generated when the game starts
        const codeElement = document.getElementById('live-replay-code');
        if (codeElement) {
            codeElement.textContent = 'Will be generated when game starts';
        }
    }

    getFormConfigForCode() {
        // Get current form values to generate a consistent code
        const stationary = parseInt(document.getElementById('target-static-count').value) || 0;
        const moving = parseInt(document.getElementById('target-moving-count').value) || 0;
        const flee = parseInt(document.getElementById('target-flee-count').value) || 0;
        const bonus = parseInt(document.getElementById('target-bonus-count').value) || 0;
        const hazard = parseInt(document.getElementById('target-hazard-count').value) || 0;
        
        const targetSize = document.querySelector('input[name="target-size"]:checked')?.value || 'medium';
        const playerSpeed = parseInt(document.getElementById('player-speed').value) || 3;
        const playerTrail = document.querySelector('input[name="player-trail"]:checked')?.value || 'short';
        const inputMethod = document.querySelector('input[name="input-method"]:checked')?.value || 'discrete';
        const inputBuffer = parseInt(document.getElementById('input-buffer').value) || 300;
        const boundaries = document.querySelector('input[name="game-boundaries"]:checked')?.value || 'visual';
        
        const feedbackAudio = document.getElementById('feedback-audio').checked;
        const feedbackVisual = document.getElementById('feedback-visual').checked;
        const feedbackHaptic = document.getElementById('feedback-haptic').checked;
        
        const formConfig = {
            targetCounts: { stationary, moving, flee, bonus, hazard },
            targetSize,
            playerSpeed,
            playerTrail,
            inputMethod,
            inputBuffer,
            boundaries,
            feedback: { audio: feedbackAudio, visual: feedbackVisual, haptic: feedbackHaptic }
        };
        
        console.log('🔍 getFormConfigForCode returning:', formConfig);
        return formConfig;
    }

    generateReplayCodeFromConfig(config) {
    const mod = window.DSG && window.DSG.replay;
    const code = mod ? mod.generateFromConfig(config) : (window.ReplayCode ? window.ReplayCode.generateFromConfig(config) : null);
    if(!code) return '00000000000000';
    this._log('🔢 Encoding config via replay helpers:', config, '→', code);
    return code;
    }

    // Encoding helper methods
    // Encoding helpers now live in core/replay-code.js

    decodeReplayCode(replayCode) {
        try {
            const mod = window.DSG && window.DSG.replay;
            const decoded = mod ? mod.decode(replayCode) : (window.ReplayCode ? window.ReplayCode.decode(replayCode) : null);
            if(!decoded) return null;
            this._log('🔍 Decoded via replay helpers:', decoded, 'from:', replayCode);
            return decoded;
        } catch(e){ console.error('Error decoding replay code:', e); return null; }
    }

    // Decoding helpers now live in core/replay-code.js

    // Testing method to verify code accuracy
    testReplayCodeAccuracy() {
        console.log('🧪 Testing Replay Code Accuracy...');
        
        // Test various configurations
        const testConfigs = [
            // Basic config
            {
                targetCounts: { stationary: 5, moving: 2, flee: 1, bonus: 1, hazard: 0 },
                targetSize: 'medium',
                playerSpeed: 3,
                playerTrail: 'short',
                inputMethod: 'discrete',
                inputBuffer: 300,
                boundaries: 'visual',
                feedback: { audio: true, visual: true, haptic: false }
            },
            // Advanced config
            {
                targetCounts: { stationary: 8, moving: 3, flee: 2, bonus: 2, hazard: 1 },
                targetSize: 'small',
                playerSpeed: 5,
                playerTrail: 'long',
                inputMethod: 'continuous',
                inputBuffer: 150,
                boundaries: 'hard',
                feedback: { audio: false, visual: true, haptic: true }
            }
        ];
        
        testConfigs.forEach((config, index) => {
            console.log(`\n📋 Test ${index + 1}:`);
            console.log('Original config:', config);
            
            const code = this.generateReplayCodeFromConfig(config);
            console.log('Generated code:', code);
            
            const decoded = this.decodeReplayCode(code);
            console.log('Decoded config:', decoded);
            
            const matches = this.compareConfigs(config, decoded);
            console.log('✅ Config match:', matches ? 'PASS' : 'FAIL');
            
            if (!matches) {
                console.log('❌ Differences found!');
            }
        });
    }

    compareConfigs(config1, config2) {
    const mod = window.DSG && window.DSG.replay; return mod ? mod.compareConfigs(config1, config2) : false;
    }

    startNewSession() {
        // Save form values to session config
        this.saveSessionConfigFromForm();
        
        // Close modal
        document.getElementById('session-modal').close();
        
        // Show game interface
        this.showGameInterface();
    // Switch scene to main (gameplay) explicitly if scene system active
    try { if (window.sceneManager) window.sceneManager.switch('main'); } catch (e) {}
        
        // Initialize new session WITHOUT passing seed - let it use the form configuration
        // The seed from the form is the live-generated code, not a code to decode
        this.initializeNewSession();
        
        // Start session
        this.startSession();
        
        this.announceToScreenReader('New session started');
    }
    
    startReplaySession() {
        // Get replay code from input
        const replayCode = document.getElementById('replay-code-input').value.trim();
        
        if (!replayCode) {
            alert('Please enter a replay code');
            return;
        }
        
        // Close modal
        document.getElementById('replay-modal').close();
        
        // Initialize session with the replay code FIRST (before showing interface)
        this.initializeNewSession(replayCode);
        
        // Show game interface (this will generate targets with the correct config)
        this.showGameInterface();
    // Ensure scene switched to main for gameplay
    try { if (window.sceneManager) window.sceneManager.switch('main'); } catch (e) {}
        
        // Start session
        this.startSession();
        
        this.announceToScreenReader(`Playing replay code: ${replayCode}`);
    }

    saveSessionConfigFromForm() {
        // Target settings
        this.sessionConfig.targetCounts.stationary = parseInt(document.getElementById('target-static-count').value);
        this.sessionConfig.targetCounts.moving = parseInt(document.getElementById('target-moving-count').value);
        this.sessionConfig.targetCounts.flee = parseInt(document.getElementById('target-flee-count').value);
        this.sessionConfig.targetCounts.bonus = parseInt(document.getElementById('target-bonus-count').value);
        this.sessionConfig.targetCounts.hazard = parseInt(document.getElementById('target-hazard-count').value);
        this.sessionConfig.targetSize = document.querySelector('input[name="target-size"]:checked').value;
        
        // Player settings
        this.sessionConfig.playerSpeed = parseInt(document.getElementById('player-speed').value);
        this.sessionConfig.playerTrail = document.querySelector('input[name="player-trail"]:checked').value;
        
        // Input method - single exclusive choice
        this.sessionConfig.inputMethod = document.querySelector('input[name="input-method"]:checked').value;
        this.sessionConfig.inputBuffer = parseInt(document.getElementById('input-buffer').value);
        
        // Reset player movement state when input method changes
        if (this.player) {
            this.player.continuousDirection = null;
            this.player.isMoving = false;
            this.player.targetX = null;
            this.player.targetY = null;
        }
        
        // Environment
        this.sessionConfig.boundaries = document.querySelector('input[name="game-boundaries"]:checked').value;
        this.sessionConfig.feedback.audio = document.getElementById('feedback-audio').checked;
        this.sessionConfig.feedback.visual = document.getElementById('feedback-visual').checked;
        this.sessionConfig.feedback.haptic = document.getElementById('feedback-haptic').checked;
        
        // Generate the final replay code AFTER all configuration is set
        this.sessionConfig.seed = this.generateReplayCodeFromConfig(this.sessionConfig);
        console.log('🎮 Generated FINAL replay code from session config:', this.sessionConfig.seed);
        console.log('🎮 Session config used for code generation:', this.sessionConfig);
        
        // Update mouse events based on new configuration
        this.setupMouseEvents();
    }

    showSessionResults() {
        if(window.DSG && window.DSG.uiSession){ window.DSG.uiSession.showSessionResults(this); }
    }
    
    checkPersonalBest() {
        const currentTime = this.currentSession.totalTime;
        const history = this.sessionHistory.filter(session => session.completed);
        
        if (history.length === 0) {
            return { isRecord: true, message: "🎉 First completion!" };
        }
        
        // Find best time for similar configuration (same target counts)
        const similarSessions = history.filter(session => {
            const currentCounts = this.sessionConfig.targetCounts;
            const sessionCounts = session.config?.targetCounts;
            if (!sessionCounts) return false;
            
            return (
                sessionCounts.stationary === currentCounts.stationary &&
                sessionCounts.moving === currentCounts.moving &&
                sessionCounts.flee === currentCounts.flee &&
                sessionCounts.bonus === currentCounts.bonus &&
                sessionCounts.hazard === currentCounts.hazard
            );
        });
        
        if (similarSessions.length === 0) {
            return { isRecord: true, message: "🆕 New challenge completed!" };
        }
        
        const bestTime = Math.min(...similarSessions.map(s => s.totalTime));
        const averageTime = similarSessions.reduce((sum, s) => sum + s.totalTime, 0) / similarSessions.length;
        
        // Fix the logic: if current time is better (smaller) than best time, it's a new record
        if (currentTime < bestTime) {
            return { isRecord: true, message: "🏆 New Personal Best!" };
        } else if (currentTime < averageTime * 1.1) { // Within 10% of average is considered good
            return { isRecord: true, message: "📈 Great performance!" };
        }
        
        // Don't show achievement banner for average or poor performance
        return { isRecord: false, message: "" };
    }
    
    copyCurrentSessionReplayCode() {
        const replayCode = this.currentSession.seed;
        
        // Try to use the modern clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(replayCode).then(() => {
                if (typeof this.showCopyConfirmation === 'function') this.showCopyConfirmation();
                if (typeof this.announceToScreenReader === 'function') this.announceToScreenReader(`Replay code ${replayCode} copied to clipboard`);
                if (typeof this.showToast === 'function') this.showToast(`Replay code copied: ${replayCode}`);
            }).catch(() => {
                this.fallbackCopyToClipboard(replayCode);
            });
        } else {
            this.fallbackCopyToClipboard(replayCode);
        }
    }
    
    // Duplicate fallback removed; shares unified helper
    fallbackCopyToClipboard(text) { this._fallbackCopyToClipboardUnified(text); }

    // Centralized clipboard fallback (used by both copy methods)
    _fallbackCopyToClipboardUnified(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        let success = false;
        try { success = document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(textArea);
        if (success) {
            if (typeof this.showCopyConfirmation === 'function') this.showCopyConfirmation();
            if (typeof this.announceToScreenReader === 'function') this.announceToScreenReader(`Replay code ${text} copied to clipboard`);
            if (typeof this.showToast === 'function') this.showToast(`Replay code copied: ${text}`);
        } else {
            console.warn('Clipboard fallback failed');
            if (typeof this.announceToScreenReader === 'function') this.announceToScreenReader('Failed to copy replay code');
        }
    }
    
    showCopyConfirmation() {
        const button = document.getElementById('copy-replay-code');
        const originalText = button.innerHTML;
        
        button.innerHTML = '<span class="material-icons">check</span> Copied!';
        button.style.backgroundColor = '#4caf50';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.backgroundColor = '';
        }, 2000);
    }

    updateSessionHistoryDisplay() {
        const historyList = document.getElementById('session-history-list');
        historyList.innerHTML = '';
        
        // Show last 5 sessions
        const recentSessions = this.sessionHistory.slice(-5).reverse();
        
        recentSessions.forEach((session, index) => {
            const sessionDiv = document.createElement('div');
            sessionDiv.className = 'history-item';
            sessionDiv.innerHTML = `
                <div class="history-time">${this.formatTime(session.totalTime)}</div>
                <div class="history-details">
                    <div class="history-targets">${session.targetsCollected}/${session.totalTargets} targets</div>
                    <div class="history-seed">Code: ${session.seed}</div>
                </div>
            `;
            historyList.appendChild(sessionDiv);
        });
        
        if (recentSessions.length === 0) {
            historyList.innerHTML = '<div class="history-empty">No previous games</div>';
        }
    }


    
    // Utility Methods
    toggleSound() {
        this.settings.audioEnabled = !this.settings.audioEnabled;
        this.applySettings();
        this.updateSoundButton();
        localStorage.setItem('directionalSkillsSettings', JSON.stringify(this.settings));
    }
    
    toggleFullscreen() {
        if (!this.isFullscreen) {
            document.documentElement.requestFullscreen().then(() => {
                this.isFullscreen = true;
                document.body.classList.add('fullscreen');
                this.handleResize();
            }).catch(err => {
                console.warn('Fullscreen not available:', err);
            });
        } else {
            document.exitFullscreen().then(() => {
                this.isFullscreen = false;
                document.body.classList.remove('fullscreen');
                this.handleResize();
            });
        }
    }
    

    
    showGameInterface() {
        // Hide main menu and show game interface
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('game-interface').style.display = 'flex';
        
        // Ensure canvas is properly sized with a small delay to allow layout
        setTimeout(() => {
            this.setupCanvas();
            
            // Generate targets if they haven't been generated yet (due to small canvas during init)
            if (this.targets.length === 0) {
                console.log('🎯 Canvas now properly sized, generating targets');
                this.generateSessionTargets();
                // Player position is set inside generateSessionTargets()
            }
        }, 50);
        
        // Focus canvas for keyboard input
        setTimeout(() => {
            this.canvas.focus();
        }, 100);
    }
    
    returnToMainMenu() {
        // Pause/stop current session
        if (this.gameState === 'playing') {
            this.pauseGame();
        }
        
        // Show main menu and hide game interface
    document.getElementById('main-menu').style.display = 'flex';
    document.getElementById('game-interface').style.display = 'none';
        
        // Reset game state
        this.gameState = 'menu';
        
        // Update UI
        this.updateUI();
        
        this.announceToScreenReader('Returned to main menu');
    }
    
    confirmReturnToMenu() {
        // If session is active and not completed, show confirmation
        if ((this.gameState === 'playing' || this.gameState === 'paused') && 
            this.currentSession.targetsCollected < this.currentSession.totalCoreTargets) {
            this.showQuitConfirmation();
        } else {
            // If no active session or session completed, return directly
            this.returnToMainMenu();
        }
    }
    
    showQuitConfirmation() {
        // Show the pause modal instead of browser confirm
        this.showPauseModal();
    }
    
    showPauseModal() {
        if (window.sceneManager && window.PauseScene) {
            window.sceneManager.switch('pause');
        } else {
            const modal = document.getElementById('pause-modal');
            modal.showModal();
            
            // Focus the resume button by default
            setTimeout(() => {
                const resumeBtn = document.getElementById('resume-session-btn');
                if (resumeBtn) resumeBtn.focus();
            }, 100);
            
            // Add backdrop click handler
            modal.addEventListener('click', this.handleBackdropClick.bind(this));
            
            this.announceToScreenReader('Session paused. Choose to resume or quit.');
        }
    }
    
    handleBackdropClick(event) {
        // Only close if clicking the backdrop (modal itself), not the content
        if (event.target === event.currentTarget) {
            this.resumeGame();
        }
    }
    
    hidePauseModal() {
        if (window.sceneManager && window.PauseScene) {
            // PauseScene will close itself on exit when switching back to main
            if (window.sceneManager) window.sceneManager.switch('main');
        } else {
            const modal = document.getElementById('pause-modal');
            modal.close();
        }
    }
    
    updatePlayPauseButton() {
        const btn = document.getElementById('play-pause-btn');
        if (!btn) return; // Button might not exist in main menu
        
        const icon = btn.querySelector('.material-icons');
        const label = btn.querySelector('.btn-label');
        
        if (this.gameState === 'playing') {
            if (icon) icon.textContent = 'pause';
            if (label) label.textContent = 'Pause';
            btn.setAttribute('aria-label', 'Pause game');
        } else {
            if (icon) icon.textContent = 'play_arrow';
            if (label) label.textContent = 'Play';
            btn.setAttribute('aria-label', 'Play game');
        }
    }
    
    updateSoundButton() {
        const btn = document.getElementById('sound-toggle-btn');
        if (!btn) return;
        
        const icon = btn.querySelector('.material-icons');
        const label = btn.querySelector('.btn-label');
        
        if (this.settings.audioEnabled) {
            if (icon) icon.textContent = 'volume_up';
            if (label) label.textContent = 'Sound On';
            btn.setAttribute('aria-label', 'Turn sound off');
        } else {
            if (icon) icon.textContent = 'volume_off';
            if (label) label.textContent = 'Sound Off';
            btn.setAttribute('aria-label', 'Turn sound on');
        }
    }
    
    handleFullscreenChange() {
        this.isFullscreen = !!document.fullscreenElement;
        if (!this.isFullscreen) {
            document.body.classList.remove('fullscreen');
        }
        this.handleResize();
    }
    
    handleResize() {
        if(window.DSG && window.DSG.resize){ window.DSG.resize.handleResize(this); }
    }
    
    repositionTargetsAfterResize(oldWidth, oldHeight) {
        let repositionedCount = 0;
        
        this.targets.forEach(target => {
            const originalX = target.x;
            const originalY = target.y;
            
            // Check if target is off-screen and reposition if needed
            const margin = target.size + 10;
            
            // Clamp target position to new canvas bounds
            target.x = Math.max(margin, Math.min(this.canvas.width - margin, target.x));
            target.y = Math.max(margin, Math.min(this.canvas.height - margin, target.y));
            
            // If canvas got much smaller, use proportional scaling
            if (this.canvas.width < oldWidth * 0.7 || this.canvas.height < oldHeight * 0.7) {
                const scaleX = (this.canvas.width - 2 * margin) / (oldWidth - 2 * margin);
                const scaleY = (this.canvas.height - 2 * margin) / (oldHeight - 2 * margin);
                
                target.x = margin + (target.x - margin) * scaleX;
                target.y = margin + (target.y - margin) * scaleY;
            }
            
            // Count repositioned targets
            if (originalX !== target.x || originalY !== target.y) {
                repositionedCount++;
            }
        });
        
        // Announce repositioning to screen reader users
        if (repositionedCount > 0) {
            this.announceToScreenReader(`Window resized. ${repositionedCount} target${repositionedCount > 1 ? 's' : ''} repositioned to stay visible.`);
        }
    }
    
    repositionPlayerAfterResize() {
        // For seeded sessions, don't change player position to maintain consistency
        if (this.currentSession && this.currentSession.seed && this.gameState === 'playing') {
            console.log('🎯 Maintaining seeded player position during resize');
            // Just ensure player is still on screen with current position
            const margin = this.player.size;
            this.player.x = Math.max(margin, Math.min(this.canvas.width - margin, this.player.x));
            this.player.y = Math.max(margin, Math.min(this.canvas.height - margin, this.player.y));
        } else {
            // Otherwise, just keep player on screen
            const margin = this.player.size;
            this.player.x = Math.max(margin, Math.min(this.canvas.width - margin, this.player.x));
            this.player.y = Math.max(margin, Math.min(this.canvas.height - margin, this.player.y));
            
            // Clear trail as positions have changed
            this.player.trail = [];
        }
    }
    
    scaleTargetsAfterResize(oldWidth, oldHeight) {
        if (oldWidth === 0 || oldHeight === 0) return;
        
        const scaleX = this.canvas.width / oldWidth;
        const scaleY = this.canvas.height / oldHeight;
        
        this.targets.forEach(target => {
            target.x = target.x * scaleX;
            target.y = target.y * scaleY;
            
            // Ensure targets stay within bounds
            const margin = target.size + 10;
            target.x = Math.max(margin, Math.min(this.canvas.width - margin, target.x));
            target.y = Math.max(margin, Math.min(this.canvas.height - margin, target.y));
        });
        
        this.announceToScreenReader('Window resized. All targets scaled to maintain relative positions.');
    }
    
    regenerateTargetsAfterResize() {
        const currentTargetCount = this.targets.length;
        this.targets = [];
        
        // Regenerate the same number of targets that were left using proper spacing
        const levelConfig = this.getLevelConfig(this.currentLevel);
        for (let i = 0; i < currentTargetCount; i++) {
            const target = this.createTargetWithSpacing(levelConfig);
            if (target) {
                this.targets.push(target);
            }
        }
        
        this.announceToScreenReader(`Window resized. ${currentTargetCount} new targets generated with proper spacing.`);
    }
    
    setCursor(cursorType) {
        // Remove all cursor classes
        this.canvas.classList.remove('cursor-crosshair', 'cursor-grab', 'cursor-grabbing');
        
        // Add the appropriate cursor class
        switch (cursorType) {
            case 'crosshair':
                this.canvas.classList.add('cursor-crosshair');
                break;
            case 'grab':
                this.canvas.classList.add('cursor-grab');
                break;
            case 'grabbing':
                this.canvas.classList.add('cursor-grabbing');
                break;
            case 'default':
                // Default cursor, no class needed
                this.canvas.style.cursor = 'default';
                break;
        }
    }
    
    announceToScreenReader(message){ if(window.DSG && window.DSG.announcer){ window.DSG.announcer.announce(message); } }
    
    loadSettings() {
        const saved = localStorage.getItem('directionalSkillsSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
            this.applySettings();
        }
    }
}

// Game instance now created in index.html before scene bootstrap to avoid race conditions.
// Expose class on window so bootstrap (which checks window.DirectionalSkillsGame) can instantiate it.
// Note: class declarations (unlike var/function) do NOT auto-attach to window in browsers.
if (typeof window !== 'undefined' && !window.DirectionalSkillsGame) {
    window.DirectionalSkillsGame = DirectionalSkillsGame;
}