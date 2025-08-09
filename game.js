/**
 * Directional Skills Educational Game
 * Accessibility-first design for students with physical and learning difficulties
 */

class DirectionalSkillsGame {
    constructor() {
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
                bonus: 0
            },
            targetSize: 'medium', // 'small', 'medium', 'large', 'extra-large'
            playerSpeed: 3,
            playerTrail: 'short', // 'off', 'short', 'long'
            inputMethods: {
                keyboard: true,
                mouseClick: true
            },
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
            completed: false
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
            targetY: null
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
        
        // Initialize session
        this.initializeNewSession();
        
        // Start game loop
        this.gameLoop();
        
        // Update UI
        this.updateUI();
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
        this.currentSession = {
            seed: seed || this.generateSessionSeed(),
            startTime: null,
            endTime: null,
            totalTime: 0,
            pausedTime: 0,
            pauseStartTime: null,
            targetsCollected: 0,
            totalTargets: this.sessionConfig.targetCount,
            completed: false
        };
        
        // Set seed for reproducible random generation
        this.sessionConfig.seed = this.currentSession.seed;
        
        // Generate targets using the seed
        this.generateSessionTargets();
        
        // Set player position based on seed for reproducibility
        this.setSeededPlayerPosition();
    }
    
    startSession() {
        this.currentSession.startTime = Date.now();
        this.gameState = 'playing';
        this.canvas.focus();
        this.updatePlayPauseButton();
        this.announceToScreenReader('Session started. Use arrow keys or configured input methods to collect targets.');
    }
    
    completeSession() {
        this.currentSession.endTime = Date.now();
        this.currentSession.completed = true;
        this.currentSession.totalTime = this.calculateSessionTime();
        
        // Add to session history
        this.sessionHistory.push({
            ...this.currentSession,
            config: { ...this.sessionConfig }
        });
        this.saveSessionHistory();
        
        this.gameState = 'completed';
        this.showSessionResults();
        
        // Play completion sound
        if (this.sounds.levelComplete) this.sounds.levelComplete();
        
        this.announceToScreenReader(`Session completed! Time: ${this.formatTime(this.currentSession.totalTime)}. All targets collected!`);
    }
    
    calculateSessionTime() {
        if (!this.currentSession.startTime) return 0;
        
        const endTime = this.currentSession.endTime || Date.now();
        const totalTime = endTime - this.currentSession.startTime;
        return totalTime - this.currentSession.pausedTime;
    }
    
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const ms = Math.floor((milliseconds % 1000) / 10); // Show centiseconds
        
        if (minutes > 0) {
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
        } else {
            return `${remainingSeconds}.${ms.toString().padStart(2, '0')}s`;
        }
    }
    
    // Seeded Random Number Generator for reproducible sessions
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
    
    generateSessionTargets() {
        this.targets = [];
        
        // Convert text seed to numeric seed for random generation
        let currentSeed = this.textToNumericSeed(this.sessionConfig.seed);
        
        // Get target size from session config
        const targetSizes = {
            'small': 20,
            'medium': 30,
            'large': 40,
            'extra-large': 50
        };
        const targetSize = targetSizes[this.sessionConfig.targetSize] || 30;
        
        // Create targets based on individual counts
        const targetTypes = ['stationary', 'moving', 'flee', 'bonus'];
        let totalTargets = 0;
        
        for (const type of targetTypes) {
            const count = this.sessionConfig.targetCounts[type] || 0;
            totalTargets += count;
            
            for (let j = 0; j < count; j++) {
                currentSeed++;
                // Map 'stationary' back to 'static' for target creation
                const targetType = type === 'stationary' ? 'static' : type;
                const target = this.createSeededTarget(targetType, targetSize, currentSeed);
                if (target) {
                    this.targets.push(target);
                }
            }
        }
        
        // Ensure at least one target exists
        if (totalTargets === 0) {
            currentSeed++;
            const target = this.createSeededTarget('static', targetSize, currentSeed);
            if (target) {
                this.targets.push(target);
                totalTargets = 1;
            }
        }
        
        this.currentSession.totalTargets = totalTargets;
        this.updateUI();
    }
    
    createSeededTarget(type, size, seed) {
        const margin = size + 20;
        // Account for metrics overlay in top-left corner (approximately 160px x 60px)
        const overlayWidth = 160;
        const overlayHeight = 60;
        const maxAttempts = 50;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const seedX = seed + attempt * 1000;
            const seedY = seed + attempt * 1000 + 500;
            
            const x = margin + this.seededRandom(seedX) * (this.canvas.width - 2 * margin);
            const y = margin + this.seededRandom(seedY) * (this.canvas.height - 2 * margin);
            
            // Check if target would be under the overlay (top-left corner)
            const isUnderOverlay = (x < overlayWidth + margin && y < overlayHeight + margin);
            
            // Check distance from player
            const playerDistance = Math.sqrt(
                Math.pow(x - this.player.x, 2) + Math.pow(y - this.player.y, 2)
            );
            
            if (playerDistance < size * 3 || isUnderOverlay) continue; // Too close to player or under overlay
            
            // Check distance from other targets
            let tooClose = false;
            for (const existingTarget of this.targets) {
                const distance = Math.sqrt(
                    Math.pow(x - existingTarget.x, 2) + Math.pow(y - existingTarget.y, 2)
                );
                if (distance < size * 2.5) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                return this.createTargetByType(type, x, y, size, seed);
            }
        }
        
        // Fallback: create at seeded position if spacing fails
        const x = margin + this.seededRandom(seed) * (this.canvas.width - 2 * margin);
        const y = margin + this.seededRandom(seed + 1) * (this.canvas.height - 2 * margin);
        return this.createTargetByType(type, x, y, size, seed);
    }
    
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
        
        // Set player initial position (center by default)
        this.player.x = containerWidth / 2;
        this.player.y = containerHeight / 2;
    }
    
    setSeededPlayerPosition() {
        // Set player position based on session seed for reproducibility
        if (this.sessionConfig.seed) {
            const numericSeed = this.textToNumericSeed(this.sessionConfig.seed);
            const margin = this.player.size + 20; // Keep player away from edges
            
            // Use different seed offsets to get different position
            const xSeed = numericSeed + 9999; // Different seed for X position
            const ySeed = numericSeed + 7777; // Different seed for Y position
            
            this.player.x = margin + this.seededRandom(xSeed) * (this.canvas.width - 2 * margin);
            this.player.y = margin + this.seededRandom(ySeed) * (this.canvas.height - 2 * margin);
        } else {
            // Default to center if no seed
            this.player.x = this.canvas.width / 2;
            this.player.y = this.canvas.height / 2;
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
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Menu button events
        document.getElementById('play-pause-btn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('session-btn').addEventListener('click', () => this.openSessionSetup());
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
        document.getElementById('stats-btn').addEventListener('click', () => this.openStats());
        document.getElementById('help-btn').addEventListener('click', () => this.openHelp());
        document.getElementById('sound-btn').addEventListener('click', () => this.toggleSound());
        document.getElementById('fullscreen-btn').addEventListener('click', () => this.toggleFullscreen());
        
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
        // Settings modal
        const settingsModal = document.getElementById('settings-modal');
        const settingsClose = settingsModal.querySelector('.modal-close');
        const saveSettings = document.getElementById('save-settings');
        const cancelSettings = document.getElementById('cancel-settings');
        
        settingsClose.addEventListener('click', () => settingsModal.close());
        saveSettings.addEventListener('click', () => this.saveSettings());
        cancelSettings.addEventListener('click', () => settingsModal.close());
        
        // Help modal
        const helpModal = document.getElementById('help-modal');
        const helpClose = helpModal.querySelector('.modal-close');
        const closeHelp = document.getElementById('close-help');
        
        helpClose.addEventListener('click', () => helpModal.close());
        closeHelp.addEventListener('click', () => helpModal.close());
        
        // Stats modal
        const statsModal = document.getElementById('stats-modal');
        const statsClose = statsModal.querySelector('.modal-close');
        const closeStats = document.getElementById('close-stats');
        
        statsClose.addEventListener('click', () => statsModal.close());
        closeStats.addEventListener('click', () => statsModal.close());
        
        // Session modal
        const sessionModal = document.getElementById('session-modal');
        const sessionClose = sessionModal.querySelector('.modal-close');
        const startSession = document.getElementById('start-session');
        const cancelSession = document.getElementById('cancel-session');
        const sessionPresets = document.getElementById('practice-presets');
        const savePreset = document.getElementById('save-preset');
        
        sessionClose.addEventListener('click', () => sessionModal.close());
        startSession.addEventListener('click', () => this.startNewSession());
        cancelSession.addEventListener('click', () => sessionModal.close());
        sessionPresets.addEventListener('change', (e) => this.loadSessionPreset(e.target.value));
        savePreset.addEventListener('click', () => this.saveSessionPreset());
        
        // Session results modal
        const resultsModal = document.getElementById('results-modal');
        const resultsClose = resultsModal.querySelector('.modal-close');
        const replayGame = document.getElementById('replay-game');
        const newSession = document.getElementById('new-session');
        const closeResults = document.getElementById('close-results');
        
        resultsClose.addEventListener('click', () => resultsModal.close());
        replayGame.addEventListener('click', () => {
            resultsModal.close();
            // Restart the game with the same replay code
            this.initializeNewSession(this.currentSession.seed);
            this.startSession();
        });
        newSession.addEventListener('click', () => {
            resultsModal.close();
            this.openSessionSetup();
        });
        closeResults.addEventListener('click', () => resultsModal.close());
        
        // Setup session form interactivity
        this.setupSessionFormEvents();
        
        // Close modals on backdrop click
        [settingsModal, helpModal, statsModal, sessionModal, resultsModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.close();
            });
        });
    }
    
    setupAccessibility() {
        // Set initial ARIA attributes
        this.canvas.setAttribute('aria-describedby', 'game-status');
        
        // Initial game status announcement
        this.announceToScreenReader('Directional Skills Game loaded. Use arrow keys or WASD to move. Press Space to start.');
    }
    
    setupMouseEvents() {
        // Basic mouse event setup for click-to-move
        if (this.sessionConfig.inputMethods.mouseClick) {
            this.canvas.addEventListener('click', (e) => this.handleMouseClick(e));
            this.setCursor('crosshair');
        }
    }
    
    handleKeyDown(e) {
        this.keys[e.code] = true;
        
        // Handle special keys
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'Escape':
                e.preventDefault();
                if (this.gameState === 'playing') {
                    this.pauseGame();
                }
                break;
            case 'F1':
                e.preventDefault();
                this.openHelp();
                break;
            case 'F11':
                e.preventDefault();
                this.toggleFullscreen();
                break;
        }
        
        // Handle movement keys
        if (this.gameState === 'playing') {
            this.handleMovementInput(e.code);
        }
    }
    
    handleKeyUp(e) {
        this.keys[e.code] = false;
    }
    
    handleMovementInput(keyCode) {
        const movementKeys = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'KeyW': 'up',
            'KeyS': 'down',
            'KeyA': 'left',
            'KeyD': 'right'
        };
        
        const direction = movementKeys[keyCode];
        if (direction) {
            this.movePlayer(direction);
        }
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
        if (!this.sessionConfig.inputMethods.mouseClick || this.gameState !== 'playing') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const targetX = e.clientX - rect.left;
        const targetY = e.clientY - rect.top;
        
        // Set target position for player to move towards
        this.player.targetX = targetX;
        this.player.targetY = targetY;
        
        // Play movement sound
        if (this.sounds.move) this.sounds.move();
        
        this.announceToScreenReader(`Moving to position ${Math.round(targetX)}, ${Math.round(targetY)}`);
    }
    
    checkCollisions() {
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            const dx = this.player.x - target.x;
            const dy = this.player.y - target.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.player.size + target.size) {
                this.collectTarget(i);
            }
        }
    }
    
    collectTarget(index) {
        // Remove target
        this.targets.splice(index, 1);
        
        // Update session counters
        this.currentSession.targetsCollected++;
        
        // Play collect sound
        if (this.sounds.collect) this.sounds.collect();
        
        // Update UI
        this.updateUI();
        
        // Announce to screen reader
        this.announceToScreenReader(`Target collected! ${this.targets.length} targets remaining.`);
        
        // Check if session complete
        if (this.targets.length === 0) {
            this.completeSession();
        }
    }

    createPracticeTarget(type, size) {
        const margin = size + 20;
        const maxAttempts = 50;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const x = margin + Math.random() * (this.canvas.width - 2 * margin);
            const y = margin + Math.random() * (this.canvas.height - 2 * margin);
            
            // Check distance from player
            const playerDistance = Math.sqrt(
                Math.pow(x - this.player.x, 2) + Math.pow(y - this.player.y, 2)
            );
            
            if (playerDistance < size * 3) continue; // Too close to player
            
            // Check distance from other targets
            let tooClose = false;
            for (const existingTarget of this.targets) {
                const distance = Math.sqrt(
                    Math.pow(x - existingTarget.x, 2) + Math.pow(y - existingTarget.y, 2)
                );
                if (distance < size * 2.5) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                return this.createTargetByType(type, x, y, size, null);
            }
        }
        
        // Fallback: create at random position if spacing fails
        const x = margin + Math.random() * (this.canvas.width - 2 * margin);
        const y = margin + Math.random() * (this.canvas.height - 2 * margin);
        return this.createTargetByType(type, x, y, size, null);
    }

    createTargetByType(type, x, y, size, seed = null) {
        const baseTarget = {
            x,
            y,
            size,
            type,
            points: type === 'bonus' ? 200 : 100,
            collectible: true,
            createdAt: Date.now()
        };
        
        switch (type) {
            case 'static':
                return {
                    ...baseTarget,
                    color: '#e74c3c'
                };
                
            case 'moving':
                return {
                    ...baseTarget,
                    color: '#3498db',
                    velocity: {
                        x: seed !== null ? (this.seededRandom(seed + 100) - 0.5) * 2 : (Math.random() - 0.5) * 2,
                        y: seed !== null ? (this.seededRandom(seed + 200) - 0.5) * 2 : (Math.random() - 0.5) * 2
                    },
                    pattern: 'linear' // Could be 'linear', 'circular', 'bounce'
                };
                
            case 'flee':
                return {
                    ...baseTarget,
                    color: '#f39c12',
                    fleeSpeed: 1.5,
                    detectionRadius: size * 4,
                    velocity: { x: 0, y: 0 }
                };
                
            case 'bonus':
                return {
                    ...baseTarget,
                    color: '#f1c40f',
                    pulsePhase: seed !== null ? this.seededRandom(seed + 300) * Math.PI * 2 : Math.random() * Math.PI * 2,
                    bonusMultiplier: 2
                };
                
            default:
                return {
                    ...baseTarget,
                    color: '#e74c3c'
                };
        }
    }

    updatePracticeTargets() {
        const currentTime = Date.now();
        
        for (const target of this.targets) {
            switch (target.type) {
                case 'moving':
                    this.updateMovingTarget(target);
                    break;
                    
                case 'flee':
                    this.updateFleeTarget(target);
                    break;
                    
                case 'bonus':
                    this.updateBonusTarget(target, currentTime);
                    break;
            }
        }
    }

    updateMovingTarget(target) {
        // Update position
        target.x += target.velocity.x;
        target.y += target.velocity.y;
        
        // Bounce off walls
        if (target.x <= target.size || target.x >= this.canvas.width - target.size) {
            target.velocity.x *= -1;
            target.x = Math.max(target.size, Math.min(this.canvas.width - target.size, target.x));
        }
        
        if (target.y <= target.size || target.y >= this.canvas.height - target.size) {
            target.velocity.y *= -1;
            target.y = Math.max(target.size, Math.min(this.canvas.height - target.size, target.y));
        }
    }

    updateFleeTarget(target) {
        // Calculate distance to player
        const dx = this.player.x - target.x;
        const dy = this.player.y - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < target.detectionRadius) {
            // Player is close, flee in opposite direction
            const fleeX = distance > 0 ? -(dx / distance) * target.fleeSpeed : 0;
            const fleeY = distance > 0 ? -(dy / distance) * target.fleeSpeed : 0;
            
            target.velocity.x = fleeX;
            target.velocity.y = fleeY;
            
            // Move away from player
            target.x += target.velocity.x;
            target.y += target.velocity.y;
            
            // Keep within bounds
            target.x = Math.max(target.size, Math.min(this.canvas.width - target.size, target.x));
            target.y = Math.max(target.size, Math.min(this.canvas.height - target.size, target.y));
        } else {
            // Player is far, gradually slow down
            target.velocity.x *= 0.95;
            target.velocity.y *= 0.95;
            
            if (Math.abs(target.velocity.x) > 0.1 || Math.abs(target.velocity.y) > 0.1) {
                target.x += target.velocity.x;
                target.y += target.velocity.y;
                
                // Keep within bounds
                target.x = Math.max(target.size, Math.min(this.canvas.width - target.size, target.x));
                target.y = Math.max(target.size, Math.min(this.canvas.height - target.size, target.y));
            }
        }
    }

    updateBonusTarget(target, currentTime) {
        // Update pulse animation
        target.pulsePhase += 0.1;
        if (target.pulsePhase > Math.PI * 2) {
            target.pulsePhase -= Math.PI * 2;
        }
    }
    
    getLevelConfig(level) {
        const baseConfig = {
            targetCount: 5,
            targetSize: 25
        };
        
        // Progressive difficulty following educational design
        switch(level) {
            case 1:
                // Level 1: Foundation - Large targets, one at a time
                return { ...baseConfig, targetCount: 5, targetSize: 40 }; // Extra large targets
            case 2:
                // Level 2: Building Confidence - Same size targets, but more of them
                return { ...baseConfig, targetCount: 6, targetSize: 40 }; // Keep same size to build confidence
            case 3:
                // Level 3: Precision Practice - Slightly smaller targets
                return { ...baseConfig, targetCount: 8, targetSize: 35 };
            case 4:
                // Level 4: Dynamic Elements - Standard size targets
                return { ...baseConfig, targetCount: 10, targetSize: 30 };
            default:
                // Advanced levels - Progressive difficulty
                return { 
                    ...baseConfig, 
                    targetCount: Math.min(5 + level - 1, 15), 
                    targetSize: Math.max(20, 35 - (level - 2) * 3) 
                };
        }
    }
    
    createTarget(config) {
        const margin = config.targetSize + 20;
        const x = margin + Math.random() * (this.canvas.width - 2 * margin);
        const y = margin + Math.random() * (this.canvas.height - 2 * margin);
        
        return {
            x,
            y,
            size: config.targetSize,
            color: '#e74c3c',
            points: 100
        };
    }
    
    createTargetWithSpacing(config) {
        const margin = config.targetSize + 20;
        const minDistance = config.targetSize * 3; // Minimum distance between targets
        const maxAttempts = 50; // Maximum attempts to place a target
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const x = margin + Math.random() * (this.canvas.width - 2 * margin);
            const y = margin + Math.random() * (this.canvas.height - 2 * margin);
            
            // Check distance from player
            const playerDistance = Math.sqrt(
                Math.pow(x - this.player.x, 2) + Math.pow(y - this.player.y, 2)
            );
            
            // Ensure target is not too close to player
            if (playerDistance < minDistance * 1.5) {
                continue;
            }
            
            // Check distance from existing targets
            let tooClose = false;
            for (const existingTarget of this.targets) {
                const distance = Math.sqrt(
                    Math.pow(x - existingTarget.x, 2) + Math.pow(y - existingTarget.y, 2)
                );
                
                if (distance < minDistance) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                return {
                    x,
                    y,
                    size: config.targetSize,
                    color: '#e74c3c',
                    points: 100
                };
            }
        }
        
        // If we couldn't find a good spot, fall back to grid-based placement
        return this.createTargetGridBased(config);
    }
    
    createTargetGridBased(config) {
        const margin = config.targetSize + 20;
        const gridCols = Math.floor((this.canvas.width - 2 * margin) / (config.targetSize * 3));
        const gridRows = Math.floor((this.canvas.height - 2 * margin) / (config.targetSize * 3));
        
        // Create a list of available grid positions
        const availablePositions = [];
        for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
                const x = margin + col * (config.targetSize * 3) + config.targetSize * 1.5;
                const y = margin + row * (config.targetSize * 3) + config.targetSize * 1.5;
                
                // Check if position is far enough from player
                const playerDistance = Math.sqrt(
                    Math.pow(x - this.player.x, 2) + Math.pow(y - this.player.y, 2)
                );
                
                if (playerDistance >= config.targetSize * 4) {
                    // Check if position is far enough from existing targets
                    let tooClose = false;
                    for (const existingTarget of this.targets) {
                        const distance = Math.sqrt(
                            Math.pow(x - existingTarget.x, 2) + Math.pow(y - existingTarget.y, 2)
                        );
                        
                        if (distance < config.targetSize * 2.5) {
                            tooClose = true;
                            break;
                        }
                    }
                    
                    if (!tooClose) {
                        availablePositions.push({ x, y });
                    }
                }
            }
        }
        
        if (availablePositions.length > 0) {
            const randomIndex = Math.floor(Math.random() * availablePositions.length);
            const position = availablePositions[randomIndex];
            
            return {
                x: position.x,
                y: position.y,
                size: config.targetSize,
                color: '#e74c3c',
                points: 100
            };
        }
        
        // Last resort: create target with basic positioning
        return this.createTarget(config);
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Update timer display in real-time
        this.updateTimerDisplay();
        
        // Update trail fade
        const currentTime = Date.now();
        this.player.trail = this.player.trail.filter(point => 
            currentTime - point.timestamp < 2000
        );
        
        // Handle click-to-move
        if (this.player.targetX !== null && this.player.targetY !== null) {
            this.updateClickToMove();
        }
        
        // Update targets (for moving targets in sessions)
        if (this.currentSession && this.gameState === 'playing') {
            this.updatePracticeTargets();
        }
    }

    updateClickToMove() {
        const speed = this.settings.movementSpeed * 1.5; // Slightly slower for precision
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
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState === 'playing' || this.gameState === 'paused') {
            // Draw trail
            this.drawTrail();
            
            // Draw targets
            this.drawTargets();
            
            // Draw player
            this.drawPlayer();
            
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
        this.ctx.fillStyle = this.player.color;
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw direction indicator
        if (this.lastDirection) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            const arrows = { up: '↑', down: '↓', left: '←', right: '→' };
            this.ctx.fillText(arrows[this.lastDirection], this.player.x, this.player.y);
        }
    }
    
    drawTargets() {
        this.targets.forEach(target => {
            this.drawSingleTarget(target);
        });
    }

    drawSingleTarget(target) {
        // Base rendering for all targets
        let pulseScale = 1;
        let size = target.size;
        
        // Apply special effects based on target type
        switch (target.type) {
            case 'bonus':
                // Bonus targets pulse more dramatically
                pulseScale = 1 + Math.sin(target.pulsePhase) * 0.3;
                size = target.size * pulseScale;
                
                // Draw bonus glow effect
                this.ctx.shadowColor = target.color;
                this.ctx.shadowBlur = 15;
                break;
                
            case 'flee':
                // Flee targets have a subtle warning pulse
                pulseScale = 1 + Math.sin(Date.now() * 0.005) * 0.15;
                size = target.size * pulseScale;
                
                // Draw detection radius when player is close
                const dx = this.player.x - target.x;
                const dy = this.player.y - target.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < target.detectionRadius) {
                    this.ctx.strokeStyle = 'rgba(243, 156, 18, 0.3)';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(target.x, target.y, target.detectionRadius, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
                break;
                
            case 'moving':
                // Moving targets have a subtle trail effect
                pulseScale = 1 + Math.sin(Date.now() * 0.004) * 0.1;
                size = target.size * pulseScale;
                break;
                
            default:
                // Static targets with gentle pulse
                pulseScale = 1 + Math.sin(Date.now() * 0.003) * 0.1;
                size = target.size * pulseScale;
                break;
        }
        
        // Draw main target circle
        this.ctx.fillStyle = target.color;
        this.ctx.beginPath();
        this.ctx.arc(target.x, target.y, size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw target center
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(target.x, target.y, size * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add type indicator
        if (target.type !== 'static') {
            this.drawTargetTypeIndicator(target, size);
        }
        
        // Reset shadow effects
        this.ctx.shadowBlur = 0;
    }

    drawTargetTypeIndicator(target, size) {
        this.ctx.fillStyle = 'white';
        this.ctx.font = `${size * 0.6}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        let indicator = '';
        switch (target.type) {
            case 'bonus':
                indicator = '★';
                break;
            case 'moving':
                indicator = '→';
                break;
            case 'flee':
                indicator = '!';
                break;
        }
        
        if (indicator) {
            this.ctx.fillText(indicator, target.x, target.y);
        }
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
        if (this.currentSession && this.currentSession.startTime) {
            const sessionTime = this.calculateSessionTime();
            document.getElementById('current-session-time').textContent = this.formatTime(sessionTime);
        }
    }
    
    updateUI() {
        // Update progress bar
        const progress = (this.currentSession.targetsCollected / this.currentSession.totalTargets) * 100;
        document.getElementById('progress-fill').style.width = `${progress}%`;
        
        // Update stats modal with session-based statistics
        this.updateStatsModal();
    }
    
    updateStatsModal() {
        // Calculate total sessions and targets from history
        const totalSessions = this.sessionHistory.length;
        const totalTargets = this.sessionHistory.reduce((sum, session) => sum + session.targetsCollected, 0);
        const totalTime = this.sessionHistory.reduce((sum, session) => sum + session.totalTime, 0);
        const averageTime = totalSessions > 0 ? totalTime / totalSessions : 0;
        
        document.getElementById('stats-sessions').textContent = totalSessions;
        document.getElementById('stats-targets').textContent = totalTargets;
        document.getElementById('stats-time').textContent = this.formatTime(totalTime);
        document.getElementById('stats-average').textContent = this.formatTime(averageTime);
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
    
    updatePlayPauseButton() {
        const btn = document.getElementById('play-pause-btn');
        if (this.gameState === 'playing') {
            btn.className = 'menu-btn icon icon-pause active';
            btn.setAttribute('aria-label', 'Pause game');
        } else {
            btn.className = 'menu-btn icon icon-play';
            btn.setAttribute('aria-label', 'Play game');
        }
    }
    
    // Modal Management
    openSettings() {
        this.pauseGame();
        const modal = document.getElementById('settings-modal');
        this.loadSettingsToForm();
        modal.showModal();
    }
    
    openStats() {
        this.pauseGame();
        const modal = document.getElementById('stats-modal');
        modal.showModal();
    }
    
    openHelp() {
        this.pauseGame();
        const modal = document.getElementById('help-modal');
        modal.showModal();
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
        
        // Apply settings
        this.applySettings();
        
        // Save to localStorage
        localStorage.setItem('directionalSkillsSettings', JSON.stringify(this.settings));
        
        // Close modal
        document.getElementById('settings-modal').close();
        
        this.announceToScreenReader('Settings saved');
    }
    
    applySettings() {
        // Update audio button
        const soundBtn = document.getElementById('sound-btn');
        if (this.settings.audioEnabled) {
            soundBtn.className = 'menu-btn icon icon-sound';
            soundBtn.setAttribute('aria-label', 'Mute sound');
        } else {
            soundBtn.className = 'menu-btn icon icon-mute';
            soundBtn.setAttribute('aria-label', 'Enable sound');
        }
        
        // Recreate audio context if needed
        if (this.settings.audioEnabled && !this.audioContext) {
            this.setupAudio();
        }
    }

    // Session Management Methods
    openSessionSetup() {
        this.pauseGame();
        const modal = document.getElementById('session-modal');
        this.loadSessionConfigToForm();
        modal.showModal();
    }

    loadSessionConfigToForm() {
        // Load current session configuration to form
        document.getElementById('session-seed').value = this.sessionConfig.seed || '';
        
        // Target counts
        document.getElementById('target-static-count').value = this.sessionConfig.targetCounts.stationary;
        document.getElementById('target-static-count-value').textContent = this.sessionConfig.targetCounts.stationary;
        
        document.getElementById('target-moving-count').value = this.sessionConfig.targetCounts.moving;
        document.getElementById('target-moving-count-value').textContent = this.sessionConfig.targetCounts.moving;
        
        document.getElementById('target-flee-count').value = this.sessionConfig.targetCounts.flee;
        document.getElementById('target-flee-count-value').textContent = this.sessionConfig.targetCounts.flee;
        
        document.getElementById('target-bonus-count').value = this.sessionConfig.targetCounts.bonus;
        document.getElementById('target-bonus-count-value').textContent = this.sessionConfig.targetCounts.bonus;
        
        // Update total
        this.updateTotalTargets();
        
        // Target size
        document.querySelector(`input[name="target-size"][value="${this.sessionConfig.targetSize}"]`).checked = true;
        
        // Player settings
        document.getElementById('player-speed').value = this.sessionConfig.playerSpeed;
        this.updatePlayerSpeedLabel(this.sessionConfig.playerSpeed);
        document.querySelector(`input[name="player-trail"][value="${this.sessionConfig.playerTrail}"]`).checked = true;
        
        // Input methods
        document.getElementById('input-keyboard').checked = this.sessionConfig.inputMethods.keyboard;
        document.getElementById('input-mouse-click').checked = this.sessionConfig.inputMethods.mouseClick;
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
        });
        
        document.getElementById('target-moving-count').addEventListener('input', (e) => {
            document.getElementById('target-moving-count-value').textContent = e.target.value;
            this.updateTotalTargets();
        });
        
        document.getElementById('target-flee-count').addEventListener('input', (e) => {
            document.getElementById('target-flee-count-value').textContent = e.target.value;
            this.updateTotalTargets();
        });
        
        document.getElementById('target-bonus-count').addEventListener('input', (e) => {
            document.getElementById('target-bonus-count-value').textContent = e.target.value;
            this.updateTotalTargets();
        });
        
        // Player speed slider
        document.getElementById('player-speed').addEventListener('input', (e) => {
            this.updatePlayerSpeedLabel(e.target.value);
        });
        
        // Input buffer slider
        document.getElementById('input-buffer').addEventListener('input', (e) => {
            document.getElementById('input-buffer-value').textContent = e.target.value + 'ms';
        });
    }

    updateTotalTargets() {
        const stationary = parseInt(document.getElementById('target-static-count').value) || 0;
        const moving = parseInt(document.getElementById('target-moving-count').value) || 0;
        const flee = parseInt(document.getElementById('target-flee-count').value) || 0;
        const bonus = parseInt(document.getElementById('target-bonus-count').value) || 0;
        const total = stationary + moving + flee + bonus;
        document.getElementById('total-targets-value').textContent = total;
    }

    updatePlayerSpeedLabel(speed) {
        const labels = ['Very Slow', 'Slow', 'Normal', 'Fast', 'Very Fast'];
        document.getElementById('player-speed-value').textContent = labels[speed - 1] || 'Normal';
    }

    startNewSession() {
        // Save form values to session config
        this.saveSessionConfigFromForm();
        
        // Close modal
        document.getElementById('session-modal').close();
        
        // Initialize new session with text seed (will be converted internally)
        const seed = this.sessionConfig.seed || null;
        this.initializeNewSession(seed);
        
        // Start session
        this.startSession();
        
        this.announceToScreenReader('New session started');
    }

    saveSessionConfigFromForm() {
        // Replay Code - store as text, will be converted to numeric when needed
        const seedInput = document.getElementById('session-seed').value.trim();
        this.sessionConfig.seed = seedInput || null;
        
        // Target settings
        this.sessionConfig.targetCounts.stationary = parseInt(document.getElementById('target-static-count').value);
        this.sessionConfig.targetCounts.moving = parseInt(document.getElementById('target-moving-count').value);
        this.sessionConfig.targetCounts.flee = parseInt(document.getElementById('target-flee-count').value);
        this.sessionConfig.targetCounts.bonus = parseInt(document.getElementById('target-bonus-count').value);
        this.sessionConfig.targetSize = document.querySelector('input[name="target-size"]:checked').value;
        
        // Player settings
        this.sessionConfig.playerSpeed = parseInt(document.getElementById('player-speed').value);
        this.sessionConfig.playerTrail = document.querySelector('input[name="player-trail"]:checked').value;
        
        // Input methods
        this.sessionConfig.inputMethods.keyboard = document.getElementById('input-keyboard').checked;
        this.sessionConfig.inputMethods.mouseClick = document.getElementById('input-mouse-click').checked;
        this.sessionConfig.inputBuffer = parseInt(document.getElementById('input-buffer').value);
        
        // Environment
        this.sessionConfig.boundaries = document.querySelector('input[name="game-boundaries"]:checked').value;
        this.sessionConfig.feedback.audio = document.getElementById('feedback-audio').checked;
        this.sessionConfig.feedback.visual = document.getElementById('feedback-visual').checked;
        this.sessionConfig.feedback.haptic = document.getElementById('feedback-haptic').checked;
    }

    showSessionResults() {
        const modal = document.getElementById('results-modal');
        
        // Update results display
        document.getElementById('results-time').textContent = this.formatTime(this.currentSession.totalTime);
        document.getElementById('results-targets').textContent = this.currentSession.targetsCollected;
        document.getElementById('results-seed').textContent = this.currentSession.seed;
        document.getElementById('results-completion').textContent = 
            `${Math.round((this.currentSession.targetsCollected / this.currentSession.totalTargets) * 100)}%`;
        
        // Update session history display
        this.updateSessionHistoryDisplay();
        
        modal.showModal();
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

    loadSessionPreset(presetName) {
        if (!presetName) return;
        
        const presets = {
            'first-steps': {
                targetCounts: { static: 1, moving: 0, flee: 0, bonus: 0 },
                targetSize: 'extra-large',
                playerSpeed: 1,
                playerTrail: 'short',
                inputMethods: { keyboard: true, mouseClick: false },
                inputBuffer: 500,
                boundaries: 'none',
                feedback: { audio: true, visual: true, haptic: false }
            },
            'building-confidence': {
                targetCounts: { static: 3, moving: 0, flee: 0, bonus: 0 },
                targetSize: 'large',
                playerSpeed: 2,
                playerTrail: 'short',
                inputMethods: { keyboard: true, mouseClick: true },
                inputBuffer: 400,
                boundaries: 'visual',
                feedback: { audio: true, visual: true, haptic: false }
            },
            'precision-practice': {
                targetCounts: { static: 4, moving: 0, flee: 0, bonus: 1 },
                targetSize: 'medium',
                playerSpeed: 3,
                playerTrail: 'short',
                inputMethods: { keyboard: true, mouseClick: true },
                inputBuffer: 300,
                boundaries: 'visual',
                feedback: { audio: true, visual: true, haptic: false }
            },
            'dynamic-challenge': {
                targetCounts: { static: 1, moving: 1, flee: 1, bonus: 1 },
                targetSize: 'medium',
                playerSpeed: 3,
                playerTrail: 'long',
                inputMethods: { keyboard: true, mouseClick: true },
                inputBuffer: 200,
                boundaries: 'visual',
                feedback: { audio: true, visual: true, haptic: false }
            }
        };
        
        if (presets[presetName]) {
            this.sessionConfig = { ...this.sessionConfig, ...presets[presetName] };
            this.loadSessionConfigToForm();
        }
    }

    saveSessionPreset() {
        const presetName = prompt('Enter a name for this preset:');
        if (presetName) {
            this.saveSessionConfigFromForm();
            const savedPresets = JSON.parse(localStorage.getItem('sessionPresets') || '{}');
            savedPresets[presetName] = { ...this.sessionConfig };
            localStorage.setItem('sessionPresets', JSON.stringify(savedPresets));
            this.announceToScreenReader(`Preset "${presetName}" saved`);
        }
    }
    
    // Utility Methods
    toggleSound() {
        this.settings.audioEnabled = !this.settings.audioEnabled;
        this.applySettings();
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
    
    handleFullscreenChange() {
        this.isFullscreen = !!document.fullscreenElement;
        if (!this.isFullscreen) {
            document.body.classList.remove('fullscreen');
        }
        this.handleResize();
    }
    
    handleResize() {
        setTimeout(() => {
            const oldWidth = this.canvas.width;
            const oldHeight = this.canvas.height;
            
            this.setupCanvas();
            
            // Handle resize based on user setting
            switch(this.settings.resizeHandling) {
                case 'reposition':
                    this.repositionTargetsAfterResize(oldWidth, oldHeight);
                    break;
                case 'scale':
                    this.scaleTargetsAfterResize(oldWidth, oldHeight);
                    break;
                case 'regenerate':
                    this.regenerateTargetsAfterResize();
                    break;
                case 'pause':
                    if (this.gameState === 'playing') {
                        this.pauseGame();
                        this.announceToScreenReader('Game paused due to window resize. Press Space to resume.');
                    }
                    break;
            }
            
            // Always reposition player if they're now off-screen
            this.repositionPlayerAfterResize();
        }, 100);
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
        // If we have a seeded session, recalculate seeded position for new canvas size
        if (this.sessionConfig.seed && this.gameState === 'playing') {
            this.setSeededPlayerPosition();
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
    
    announceToScreenReader(message) {
        const statusElement = document.getElementById('game-status');
        statusElement.textContent = message;
    }
    
    loadSettings() {
        const saved = localStorage.getItem('directionalSkillsSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
            this.applySettings();
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new DirectionalSkillsGame();
});