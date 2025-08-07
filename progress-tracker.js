/**
 * Progress Tracker
 * Handles student progress tracking and analytics (GDPR compliant)
 */

class ProgressTracker {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.sessionStartTime = Date.now();
        this.currentSession = null;
        this.progressData = null;
        this.settings = {
            trackingEnabled: true,
            anonymousOnly: true,
            dataRetentionDays: 90
        };
        
        this.initialize();
        console.log('ProgressTracker initialized');
    }
    
    /**
     * Initialize progress tracking system
     */
    initialize() {
        this.loadSettings();
        this.loadProgressData();
        this.startNewSession();
        this.setupEventListeners();
        this.cleanOldData();
    }
    
    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Load tracking settings from localStorage
     */
    loadSettings() {
        try {
            const stored = localStorage.getItem('progressTrackerSettings');
            if (stored) {
                this.settings = { ...this.settings, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.warn('Failed to load progress tracker settings:', error);
        }
    }
    
    /**
     * Save tracking settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('progressTrackerSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save progress tracker settings:', error);
        }
    }
    
    /**
     * Load existing progress data
     */
    loadProgressData() {
        if (!this.settings.trackingEnabled) return;
        
        try {
            const stored = localStorage.getItem('studentProgressData');
            this.progressData = stored ? JSON.parse(stored) : this.createEmptyProgressData();
        } catch (error) {
            console.warn('Failed to load progress data:', error);
            this.progressData = this.createEmptyProgressData();
        }
    }
    
    /**
     * Create empty progress data structure
     */
    createEmptyProgressData() {
        return {
            version: '1.0',
            created: Date.now(),
            lastUpdated: Date.now(),
            totalSessions: 0,
            totalPlayTime: 0,
            sessions: [],
            achievements: [],
            preferences: {
                inputMethod: 'keyboard',
                difficulty: 'beginner',
                accessibility: {}
            },
            statistics: {
                levelsCompleted: 0,
                targetsCollected: 0,
                totalMovements: 0,
                averageAccuracy: 0,
                bestTime: null,
                skillProgression: []
            }
        };
    }
    
    /**
     * Start a new session
     */
    startNewSession() {
        if (!this.settings.trackingEnabled) return;
        
        this.currentSession = {
            id: this.sessionId,
            startTime: this.sessionStartTime,
            endTime: null,
            duration: 0,
            events: [],
            performance: {
                targetsCollected: 0,
                movementCount: 0,
                accuracyScore: 0,
                levelsCompleted: 0,
                inputErrors: 0,
                pauseCount: 0
            },
            accessibility: {
                inputMethod: 'keyboard',
                assistiveFeatures: [],
                preferenceChanges: []
            },
            learning: {
                skillDemonstrated: [],
                strugglingAreas: [],
                improvementAreas: [],
                confidenceLevel: 'unknown'
            }
        };
        
        this.progressData.totalSessions++;
        this.trackEvent('sessionStart', {});
    }
    
    /**
     * End current session
     */
    endSession() {
        if (!this.currentSession) return;
        
        const endTime = Date.now();
        this.currentSession.endTime = endTime;
        this.currentSession.duration = endTime - this.currentSession.startTime;
        
        this.trackEvent('sessionEnd', {
            duration: this.currentSession.duration,
            performance: this.currentSession.performance
        });
        
        // Add session to progress data
        this.progressData.sessions.push({ ...this.currentSession });
        this.progressData.totalPlayTime += this.currentSession.duration;
        this.progressData.lastUpdated = endTime;
        
        // Keep only recent sessions (for privacy)
        this.limitSessionHistory();
        
        // Update overall statistics
        this.updateOverallStatistics();
        
        // Save progress
        this.saveProgressData();
        
        this.currentSession = null;
    }
    
    /**
     * Track a specific event
     */
    trackEvent(eventType, data = {}) {
        if (!this.settings.trackingEnabled || !this.currentSession) return;
        
        const event = {
            type: eventType,
            timestamp: Date.now(),
            data: data,
            sessionTime: Date.now() - this.sessionStartTime
        };
        
        this.currentSession.events.push(event);
        
        // Update session performance based on event
        this.updateSessionPerformance(eventType, data);
        
        // Check for achievements
        this.checkAchievements(eventType, data);
        
        // Analyze learning progress
        this.analyzeLearningProgress(eventType, data);
    }
    
    /**
     * Update session performance metrics
     */
    updateSessionPerformance(eventType, data) {
        const perf = this.currentSession.performance;
        
        switch (eventType) {
            case 'targetCollected':
                perf.targetsCollected++;
                break;
                
            case 'movement':
                perf.movementCount++;
                break;
                
            case 'levelCompleted':
                perf.levelsCompleted++;
                break;
                
            case 'inputError':
                perf.inputErrors++;
                break;
                
            case 'gamePaused':
                perf.pauseCount++;
                break;
                
            case 'accuracyMeasured':
                perf.accuracyScore = data.accuracy || 0;
                break;
        }
    }
    
    /**
     * Check for achievements
     */
    checkAchievements(eventType, data) {
        const achievements = [
            {
                id: 'firstTarget',
                name: 'First Success',
                description: 'Collected your first target',
                condition: () => this.currentSession.performance.targetsCollected >= 1
            },
            {
                id: 'firstLevel',
                name: 'Level Master',
                description: 'Completed your first level',
                condition: () => this.currentSession.performance.levelsCompleted >= 1
            },
            {
                id: 'persistent',
                name: 'Persistence',
                description: 'Played for 5 minutes without giving up',
                condition: () => (Date.now() - this.sessionStartTime) >= 300000
            },
            {
                id: 'explorer',
                name: 'Explorer',
                description: 'Made 100 movements in a single session',
                condition: () => this.currentSession.performance.movementCount >= 100
            },
            {
                id: 'collector',
                name: 'Collector',
                description: 'Collected 10 targets in a single session',
                condition: () => this.currentSession.performance.targetsCollected >= 10
            }
        ];
        
        achievements.forEach(achievement => {
            if (!this.hasAchievement(achievement.id) && achievement.condition()) {
                this.unlockAchievement(achievement);
            }
        });
    }
    
    /**
     * Check if user has specific achievement
     */
    hasAchievement(achievementId) {
        return this.progressData.achievements.some(a => a.id === achievementId);
    }
    
    /**
     * Unlock an achievement
     */
    unlockAchievement(achievement) {
        const unlocked = {
            ...achievement,
            unlockedAt: Date.now(),
            sessionId: this.sessionId
        };
        
        this.progressData.achievements.push(unlocked);
        
        // Announce achievement
        if (window.accessibilityManager) {
            window.accessibilityManager.announce(`Achievement unlocked: ${achievement.name} - ${achievement.description}`);
        }
        
        // Play achievement sound
        if (window.audioManager) {
            window.audioManager.playSound('levelComplete');
        }
        
        this.trackEvent('achievementUnlocked', { achievement: achievement.id });
    }
    
    /**
     * Analyze learning progress
     */
    analyzeLearningProgress(eventType, data) {
        const learning = this.currentSession.learning;
        
        // Track skills demonstrated
        if (eventType === 'movement' && data.direction) {
            if (!learning.skillDemonstrated.includes('directionalControl')) {
                learning.skillDemonstrated.push('directionalControl');
            }
        }
        
        if (eventType === 'targetCollected') {
            if (!learning.skillDemonstrated.includes('targetAcquisition')) {
                learning.skillDemonstrated.push('targetAcquisition');
            }
        }
        
        if (eventType === 'levelCompleted') {
            if (!learning.skillDemonstrated.includes('goalCompletion')) {
                learning.skillDemonstrated.push('goalCompletion');
            }
        }
        
        // Identify struggling areas
        if (eventType === 'inputError' && data.repeated) {
            const struggle = `${data.inputType}_difficulty`;
            if (!learning.strugglingAreas.includes(struggle)) {
                learning.strugglingAreas.push(struggle);
            }
        }
        
        // Track confidence level
        const errorRate = this.currentSession.performance.inputErrors / 
                         Math.max(1, this.currentSession.performance.movementCount);
        
        if (errorRate < 0.1) {
            learning.confidenceLevel = 'high';
        } else if (errorRate < 0.3) {
            learning.confidenceLevel = 'medium';
        } else {
            learning.confidenceLevel = 'building';
        }
    }
    
    /**
     * Update overall statistics
     */
    updateOverallStatistics() {
        const stats = this.progressData.statistics;
        const session = this.currentSession;
        
        stats.levelsCompleted += session.performance.levelsCompleted;
        stats.targetsCollected += session.performance.targetsCollected;
        stats.totalMovements += session.performance.movementCount;
        
        // Calculate average accuracy
        const sessions = this.progressData.sessions;
        const accuracyScores = sessions
            .map(s => s.performance.accuracyScore)
            .filter(score => score > 0);
        
        if (accuracyScores.length > 0) {
            stats.averageAccuracy = accuracyScores.reduce((a, b) => a + b) / accuracyScores.length;
        }
        
        // Track skill progression
        const skillPoint = {
            timestamp: Date.now(),
            level: this.calculateSkillLevel(),
            confidence: session.learning.confidenceLevel,
            skills: [...session.learning.skillDemonstrated]
        };
        
        stats.skillProgression.push(skillPoint);
        
        // Keep only recent skill progression data
        const maxPoints = 50;
        if (stats.skillProgression.length > maxPoints) {
            stats.skillProgression = stats.skillProgression.slice(-maxPoints);
        }
    }
    
    /**
     * Calculate current skill level
     */
    calculateSkillLevel() {
        const stats = this.progressData.statistics;
        
        // Simple scoring based on activity and success
        let score = 0;
        
        score += Math.min(stats.levelsCompleted * 10, 100);
        score += Math.min(stats.targetsCollected * 2, 100);
        score += Math.min(stats.averageAccuracy * 100, 100);
        score += Math.min(this.progressData.totalSessions * 5, 50);
        
        if (score < 50) return 'beginner';
        if (score < 150) return 'developing';
        if (score < 250) return 'proficient';
        return 'advanced';
    }
    
    /**
     * Get learning insights for educators
     */
    getLearningInsights() {
        if (!this.progressData) return null;
        
        const recentSessions = this.progressData.sessions.slice(-5);
        const skillProgression = this.progressData.statistics.skillProgression.slice(-10);
        
        return {
            currentSkillLevel: this.calculateSkillLevel(),
            totalPlayTime: this.formatDuration(this.progressData.totalPlayTime),
            sessionsCompleted: this.progressData.totalSessions,
            achievementsUnlocked: this.progressData.achievements.length,
            
            recentPerformance: {
                averageSessionTime: this.getAverageSessionTime(recentSessions),
                targetsPerSession: this.getAverageTargetsPerSession(recentSessions),
                consistencyScore: this.calculateConsistency(recentSessions)
            },
            
            skillDevelopment: {
                progression: skillProgression,
                strengthAreas: this.identifyStrengths(),
                improvementAreas: this.identifyImprovementAreas()
            },
            
            engagement: {
                playFrequency: this.calculatePlayFrequency(),
                sessionEngagement: this.calculateEngagementScore(),
                motivationLevel: this.assessMotivation()
            },
            
            accessibility: {
                preferredInputMethod: this.getPreferredInputMethod(),
                assistiveFeatures: this.getUsedAssistiveFeatures(),
                adaptationsNeeded: this.suggestAdaptations()
            }
        };
    }
    
    /**
     * Calculate average session time
     */
    getAverageSessionTime(sessions) {
        if (sessions.length === 0) return 0;
        const total = sessions.reduce((sum, s) => sum + s.duration, 0);
        return total / sessions.length;
    }
    
    /**
     * Calculate average targets per session
     */
    getAverageTargetsPerSession(sessions) {
        if (sessions.length === 0) return 0;
        const total = sessions.reduce((sum, s) => sum + s.performance.targetsCollected, 0);
        return total / sessions.length;
    }
    
    /**
     * Calculate consistency score
     */
    calculateConsistency(sessions) {
        if (sessions.length < 2) return 100;
        
        const scores = sessions.map(s => s.performance.targetsCollected);
        const mean = scores.reduce((a, b) => a + b) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Lower deviation = higher consistency
        return Math.max(0, 100 - (standardDeviation * 10));
    }
    
    /**
     * Identify strength areas
     */
    identifyStrengths() {
        const skills = this.progressData.sessions
            .flatMap(s => s.learning.skillDemonstrated)
            .reduce((counts, skill) => {
                counts[skill] = (counts[skill] || 0) + 1;
                return counts;
            }, {});
        
        return Object.entries(skills)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([skill, count]) => ({ skill, frequency: count }));
    }
    
    /**
     * Identify improvement areas
     */
    identifyImprovementAreas() {
        const struggles = this.progressData.sessions
            .flatMap(s => s.learning.strugglingAreas)
            .reduce((counts, area) => {
                counts[area] = (counts[area] || 0) + 1;
                return counts;
            }, {});
        
        return Object.entries(struggles)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([area, count]) => ({ area, frequency: count }));
    }
    
    /**
     * Calculate play frequency
     */
    calculatePlayFrequency() {
        if (this.progressData.sessions.length < 2) return 'insufficient_data';
        
        const sessions = this.progressData.sessions;
        const timespan = sessions[sessions.length - 1].startTime - sessions[0].startTime;
        const days = timespan / (1000 * 60 * 60 * 24);
        const frequency = sessions.length / days;
        
        if (frequency > 1) return 'daily';
        if (frequency > 0.5) return 'regular';
        if (frequency > 0.2) return 'occasional';
        return 'infrequent';
    }
    
    /**
     * Calculate engagement score
     */
    calculateEngagementScore() {
        const recentSessions = this.progressData.sessions.slice(-5);
        if (recentSessions.length === 0) return 0;
        
        const avgDuration = this.getAverageSessionTime(recentSessions);
        const avgTargets = this.getAverageTargetsPerSession(recentSessions);
        const consistency = this.calculateConsistency(recentSessions);
        
        // Normalize to 0-100 scale
        const durationScore = Math.min(avgDuration / 300000 * 100, 100); // 5 minutes = 100%
        const activityScore = Math.min(avgTargets * 10, 100);
        
        return (durationScore + activityScore + consistency) / 3;
    }
    
    /**
     * Assess motivation level
     */
    assessMotivation() {
        const recentAchievements = this.progressData.achievements
            .filter(a => Date.now() - a.unlockedAt < 7 * 24 * 60 * 60 * 1000) // Last week
            .length;
        
        const playFrequency = this.calculatePlayFrequency();
        const engagementScore = this.calculateEngagementScore();
        
        if (recentAchievements > 2 && engagementScore > 70) return 'high';
        if (recentAchievements > 0 && engagementScore > 40) return 'moderate';
        if (playFrequency !== 'infrequent') return 'building';
        return 'low';
    }
    
    /**
     * Get preferred input method
     */
    getPreferredInputMethod() {
        const methods = this.progressData.sessions
            .map(s => s.accessibility.inputMethod)
            .reduce((counts, method) => {
                counts[method] = (counts[method] || 0) + 1;
                return counts;
            }, {});
        
        return Object.entries(methods)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'keyboard';
    }
    
    /**
     * Get used assistive features
     */
    getUsedAssistiveFeatures() {
        return [...new Set(
            this.progressData.sessions
                .flatMap(s => s.accessibility.assistiveFeatures)
        )];
    }
    
    /**
     * Suggest adaptations
     */
    suggestAdaptations() {
        const suggestions = [];
        const struggles = this.identifyImprovementAreas();
        
        struggles.forEach(({ area }) => {
            if (area.includes('keyboard')) {
                suggestions.push('Consider trying switch control input method');
            }
            if (area.includes('precision')) {
                suggestions.push('Enable larger target sizes in settings');
            }
            if (area.includes('speed')) {
                suggestions.push('Reduce game speed in difficulty settings');
            }
        });
        
        return suggestions;
    }
    
    /**
     * Format duration in human-readable format
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m ${seconds % 60}s`;
    }
    
    /**
     * Limit session history for privacy
     */
    limitSessionHistory() {
        const maxSessions = 20;
        if (this.progressData.sessions.length > maxSessions) {
            this.progressData.sessions = this.progressData.sessions.slice(-maxSessions);
        }
    }
    
    /**
     * Clean old data based on retention policy
     */
    cleanOldData() {
        if (!this.progressData) return;
        
        const retentionTime = this.settings.dataRetentionDays * 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - retentionTime;
        
        // Remove old sessions
        this.progressData.sessions = this.progressData.sessions
            .filter(session => session.startTime > cutoff);
        
        // Remove old achievements if desired
        // (keeping achievements for motivation)
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // End session when page unloads
        window.addEventListener('beforeunload', () => {
            this.endSession();
        });
        
        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEvent('tabHidden', {});
            } else {
                this.trackEvent('tabVisible', {});
            }
        });
    }
    
    /**
     * Save progress data to localStorage
     */
    saveProgressData() {
        if (!this.settings.trackingEnabled) return;
        
        try {
            localStorage.setItem('studentProgressData', JSON.stringify(this.progressData));
        } catch (error) {
            console.error('Failed to save progress data:', error);
        }
    }
    
    /**
     * Export progress data (for teachers/researchers)
     */
    exportData(includeRawEvents = false) {
        if (!this.progressData) return null;
        
        const exportData = {
            exportDate: new Date().toISOString(),
            summary: this.getLearningInsights(),
            statistics: this.progressData.statistics,
            achievements: this.progressData.achievements.map(a => ({
                id: a.id,
                name: a.name,
                unlockedAt: new Date(a.unlockedAt).toISOString()
            }))
        };
        
        if (includeRawEvents) {
            exportData.sessions = this.progressData.sessions.map(session => ({
                id: session.id,
                startTime: new Date(session.startTime).toISOString(),
                duration: session.duration,
                performance: session.performance,
                learning: session.learning,
                accessibility: session.accessibility
                // Exclude raw events for privacy
            }));
        }
        
        return exportData;
    }
    
    /**
     * Clear all progress data
     */
    clearAllData() {
        this.progressData = this.createEmptyProgressData();
        this.saveProgressData();
        
        if (window.accessibilityManager) {
            window.accessibilityManager.announce('All progress data has been cleared');
        }
    }
    
    /**
     * Update tracking preferences
     */
    updateTrackingPreferences(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        
        if (!this.settings.trackingEnabled && this.currentSession) {
            this.endSession();
        }
    }
}

// Export if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressTracker;
}
