/**
 * Session timing utilities.
 *
 * Responsibilities:
 *  - Transition game state from ready -> playing (startSession / beginTimedSession)
 *  - Compute elapsed session time including pause offsets & bonus/penalty adjustments (calculateSessionTime)
 *  - Human friendly formatting of elapsed milliseconds (formatTime)
 *
 * Time model:
 *  elapsed = (endTime || now) - startTime - pausedTime + (timeAdjustments * 1000)
 *  where timeAdjustments is negative for bonuses, positive for penalties.
 *
 * Exports (window.DSG.sessionTiming):
 *  startSession(game)
 *  beginTimedSession(game)
 *  calculateSessionTime(game) -> number (ms)
 *  formatTime(ms) -> string (e.g. 1:05.23 or 12.34s)
 */
(function(){
  function startSession(game){
    game.gameState = 'ready';
    game.canvas.focus();
    game.updatePlayPauseButton();
    game.announceToScreenReader && game.announceToScreenReader('Session ready. Press any movement key or click to start the timer and begin.');
  }
  function beginTimedSession(game){
    if(game.gameState !== 'ready') return;
    game.currentSession.startTime = Date.now();
    game.gameState = 'playing';
    game.updatePlayPauseButton();
    game.announceToScreenReader && game.announceToScreenReader('Timer started! Collect all targets as quickly as possible.');
  }
  function calculateSessionTime(game){
    if(!game.currentSession.startTime) return 0;
    const endTime = game.currentSession.endTime || Date.now();
    const totalTime = endTime - game.currentSession.startTime;
    return totalTime - game.currentSession.pausedTime + (game.currentSession.timeAdjustments * 1000);
  }
  function formatTime(milliseconds){
    const negative = milliseconds < 0;
    const absMs = Math.abs(milliseconds);
    const seconds = Math.floor(absMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const ms = Math.floor((absMs % 1000) / 10);
    const build = minutes>0 ? `${minutes}:${remainingSeconds.toString().padStart(2,'0')}.${ms.toString().padStart(2,'0')}` : `${remainingSeconds}.${ms.toString().padStart(2,'0')}s`;
    return negative ? `-${build}` : build;
  }
  window.DSG = window.DSG || {}; window.DSG.sessionTiming = { startSession, beginTimedSession, calculateSessionTime, formatTime };
})();
