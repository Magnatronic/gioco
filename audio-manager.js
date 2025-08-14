/**
 * Audio Manager
 * Handles accessible audio feedback and sound effects
 */

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = new Map();
        this.enabled = true;
        this.volume = 0.7;
        this.audioFiles = {};
        this.loadingPromises = new Map();
        
        this.initialize();
    if(window.game && window.game._log){ window.game._log('AudioManager initialized'); }
    }
    
    /**
     * Initialize audio system
     */
    async initialize() {
        try {
            // Check if Web Audio API is supported
            if (!window.AudioContext && !window.webkitAudioContext) {
                console.warn('Web Audio API not supported, disabling audio');
                this.enabled = false;
                return;
            }

            // Initialize Web Audio API
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Handle audio context suspension (required by browsers)
            if (this.audioContext.state === 'suspended') {
                document.addEventListener('click', this.resumeAudioContext.bind(this), { once: true });
                document.addEventListener('keydown', this.resumeAudioContext.bind(this), { once: true });
            }
            
            // Load sound definitions
            this.defineSounds();
            
            // Setup volume controls
            this.setupVolumeControls();
            
            // Load user preferences
            this.loadPreferences();
            
            if(window.game && window.game._log){ window.game._log('Audio system initialized successfully'); }

        } catch (error) {
            console.warn('Audio initialization failed, continuing without audio:', error);
            this.enabled = false;
            // Don't throw the error - game should work without audio
        }
    }
    
    /**
     * Resume audio context (required by browser autoplay policies)
     */
    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                if(window.game && window.game._log){ window.game._log('Audio context resumed'); }
            } catch (error) {
                console.error('Failed to resume audio context:', error);
            }
        }
    }
    
    /**
     * Define all game sounds
     */
    defineSounds() {
        this.soundDefinitions = {
            // Movement sounds
            move: {
                type: 'synthetic',
                frequency: 440,
                duration: 0.1,
                volume: 0.3,
                description: 'Movement sound'
            },
            
            // Target collection sounds
            targetCollect: {
                type: 'synthetic',
                frequency: 660,
                duration: 0.3,
                volume: 0.6,
                description: 'Target collected'
            },
            
            // Success sounds
            levelComplete: {
                type: 'synthetic',
                frequencies: [523, 659, 784], // C-E-G chord
                duration: 1.0,
                volume: 0.8,
                description: 'Level completed'
            },
            
            // Interface sounds
            menuNavigate: {
                type: 'synthetic',
                frequency: 800,
                duration: 0.1,
                volume: 0.4,
                description: 'Menu navigation'
            },
            
            menuSelect: {
                type: 'synthetic',
                frequency: 1000,
                duration: 0.2,
                volume: 0.5,
                description: 'Menu selection'
            },
            
            // Accessibility sounds
            scanHighlight: {
                type: 'synthetic',
                frequency: 600,
                duration: 0.15,
                volume: 0.4,
                description: 'Scan highlight'
            },
            
            switchSelect: {
                type: 'synthetic',
                frequency: 880,
                duration: 0.25,
                volume: 0.6,
                description: 'Switch selection'
            },
            
            // Error/alert sounds
            error: {
                type: 'synthetic',
                frequency: 200,
                duration: 0.5,
                volume: 0.7,
                description: 'Error alert'
            },
            
            // Pause/resume sounds
            pause: {
                type: 'synthetic',
                frequency: 400,
                duration: 0.3,
                volume: 0.5,
                description: 'Game paused'
            },
            
            resume: {
                type: 'synthetic',
                frequency: 600,
                duration: 0.3,
                volume: 0.5,
                description: 'Game resumed'
            }
        };
    }
    
    /**
     * Play a sound by name
     */
    async playSound(soundName, options = {}) {
        if (!this.enabled || !this.audioContext) {
            return;
        }
        
        try {
            const soundDef = this.soundDefinitions[soundName];
            if (!soundDef) {
                console.warn(`Sound '${soundName}' not found`);
                return;
            }
            
            // Merge options with sound definition
            const config = { ...soundDef, ...options };
            
            if (config.type === 'synthetic') {
                await this.playSyntheticSound(config);
            } else if (config.type === 'file') {
                await this.playAudioFile(config);
            }
            
            // Provide visual feedback if needed
            if (options.visualFeedback !== false) {
                this.showVisualFeedback(soundName, config.description);
            }
            
        } catch (error) {
            console.error(`Error playing sound '${soundName}':`, error);
        }
    }
    
    /**
     * Play synthetically generated sound
     */
    async playSyntheticSound(config) {
        const duration = config.duration || 0.2;
        const volume = (config.volume || 0.5) * this.volume;
        
        if (config.frequencies && Array.isArray(config.frequencies)) {
            // Play chord
            return this.playChord(config.frequencies, duration, volume);
        } else {
            // Play single tone
            const frequency = config.frequency || 440;
            return this.playTone(frequency, duration, volume);
        }
    }
    
    /**
     * Play a single tone
     */
    async playTone(frequency, duration, volume) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // Configure oscillator
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        // Configure gain (volume)
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Play sound
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
        
        return new Promise(resolve => {
            oscillator.onended = resolve;
        });
    }
    
    /**
     * Play multiple tones as a chord
     */
    async playChord(frequencies, duration, volume) {
        const promises = frequencies.map(freq => 
            this.playTone(freq, duration, volume / frequencies.length)
        );
        
        return Promise.all(promises);
    }
    
    /**
     * Play audio file (if implemented)
     */
    async playAudioFile(config) {
        // Placeholder for future audio file implementation
    if(window.game && window.game._log){ window.game._log(`Playing audio file: ${config.file}`); }
    }
    
    /**
     * Show visual feedback for audio
     */
    showVisualFeedback(soundName, description) {
        // Create visual indicator for users who can't hear audio
        const indicator = document.createElement('div');
        indicator.className = 'audio-visual-feedback';
        indicator.setAttribute('aria-hidden', 'true');
        indicator.textContent = '♪';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 102, 204, 0.8);
            color: white;
            padding: 10px;
            border-radius: 50%;
            font-size: 20px;
            pointer-events: none;
            z-index: 9999;
            animation: audioFeedback 0.5s ease-out;
        `;
        
        // Add animation keyframes if not already present
        if (!document.getElementById('audio-feedback-styles')) {
            const style = document.createElement('style');
            style.id = 'audio-feedback-styles';
            style.textContent = `
                @keyframes audioFeedback {
                    0% { opacity: 0; transform: scale(0.5); }
                    50% { opacity: 1; transform: scale(1.2); }
                    100% { opacity: 0; transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(indicator);
        
        // Remove after animation
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 500);
        
        // Announce to screen readers if description provided
        if (description && window.accessibilityManager) {
            window.accessibilityManager.announce(`Sound: ${description}`);
        }
    }
    
    /**
     * Setup volume controls
     */
    setupVolumeControls() {
        // Setup sound toggle button
        const soundToggle = document.getElementById('toggle-sound');
        if (soundToggle) {
            soundToggle.addEventListener('click', () => this.toggleSound());
            this.updateSoundButton();
        }
        
        // Listen for keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'm' && !e.ctrlKey && !e.altKey) {
                // M key toggles sound
                const target = e.target;
                if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    this.toggleSound();
                }
            }
        });
    }
    
    /**
     * Toggle sound on/off
     */
    toggleSound() {
        this.enabled = !this.enabled;
        this.updateSoundButton();
        this.savePreferences();
        
        // Play confirmation sound if enabling
        if (this.enabled) {
            this.playSound('menuSelect');
        }
        
        // Announce change
        if (window.accessibilityManager) {
            window.accessibilityManager.announce(
                this.enabled ? 'Sound effects enabled' : 'Sound effects disabled'
            );
        }
    }
    
    /**
     * Update sound toggle button
     */
    updateSoundButton() {
        const button = document.getElementById('toggle-sound');
        if (button) {
            button.setAttribute('aria-pressed', this.enabled.toString());
            button.title = this.enabled ? 'Disable sound effects' : 'Enable sound effects';
            
            const icon = button.querySelector('.sound-icon');
            if (icon) {
                icon.textContent = this.enabled ? '♪' : '🔇';
            }
        }
    }
    
    /**
     * Set volume level (0.0 to 1.0)
     */
    setVolume(level) {
        this.volume = Math.max(0, Math.min(1, level));
        this.savePreferences();
        
        // Play test sound
        this.playSound('menuNavigate');
    }
    
    /**
     * Get current volume level
     */
    getVolume() {
        return this.volume;
    }
    
    /**
     * Load audio preferences from localStorage
     */
    loadPreferences() {
        try {
            const stored = localStorage.getItem('audioPreferences');
            if (stored) {
                const prefs = JSON.parse(stored);
                this.enabled = prefs.enabled !== false; // Default to true
                this.volume = prefs.volume || 0.7;
            }
        } catch (error) {
            console.warn('Failed to load audio preferences:', error);
        }
        
        this.updateSoundButton();
    }
    
    /**
     * Save audio preferences to localStorage
     */
    savePreferences() {
        try {
            const prefs = {
                enabled: this.enabled,
                volume: this.volume
            };
            localStorage.setItem('audioPreferences', JSON.stringify(prefs));
        } catch (error) {
            console.error('Failed to save audio preferences:', error);
        }
    }
    
    /**
     * Play sound for game events
     */
    playGameSound(event) {
        if (!event || !event.type) return;
        
        switch (event.type) {
            case 'movement':
                if (event.data.direction !== 'stop') {
                    this.playSound('move', { volume: 0.2 });
                }
                break;
                
            case 'targetCollected':
                this.playSound('targetCollect');
                break;
                
            case 'levelComplete':
                this.playSound('levelComplete');
                break;
                
            case 'pause':
                this.playSound('pause');
                break;
                
            case 'resume':
                this.playSound('resume');
                break;
                
            case 'menuNavigate':
                this.playSound('menuNavigate');
                break;
                
            case 'menuSelect':
                this.playSound('menuSelect');
                break;
                
            case 'error':
                this.playSound('error');
                break;
                
            case 'scanHighlight':
                this.playSound('scanHighlight');
                break;
                
            case 'switchSelect':
                this.playSound('switchSelect');
                break;
        }
    }
    
    /**
     * Play sound for input events
     */
    playInputSound(inputType, action) {
        const soundMap = {
            'keyboard': {
                'keypress': 'move',
                'select': 'menuSelect'
            },
            'switch': {
                'scan': 'scanHighlight',
                'select': 'switchSelect'
            },
            'eyeGaze': {
                'dwell': 'menuNavigate',
                'select': 'menuSelect'
            },
            'touch': {
                'tap': 'menuSelect',
                'swipe': 'move'
            }
        };
        
        const sound = soundMap[inputType] && soundMap[inputType][action];
        if (sound) {
            this.playSound(sound, { volume: 0.4 });
        }
    }
    
    /**
     * Create spatial audio for game positioning (future enhancement)
     */
    createSpatialAudio(x, y, canvasWidth, canvasHeight) {
        // Calculate panning based on position
        const pan = (x / canvasWidth) * 2 - 1; // -1 to 1
        
        // Future: Use Web Audio API's PannerNode for true spatial audio
        return { pan: pan };
    }
    
    /**
     * Test audio system
     */
    testAudio() {
        const tests = {
            audioContext: !!this.audioContext,
            enabled: this.enabled,
            volume: this.volume,
            sounds: Object.keys(this.soundDefinitions).length
        };
        
    if(window.game && window.game._log){ window.game._log('Audio test results:', tests); }
        
        if (this.enabled) {
            this.playSound('menuSelect', { visualFeedback: true });
        }
        
        return tests;
    }
    
    /**
     * Clean up audio resources
     */
    destroy() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.sounds.clear();
        this.loadingPromises.clear();
    }
}

// Export if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioManager;
}
