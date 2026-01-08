/**
 * Collision detection & target effect handlers.
 *
 * Responsibilities:
 *  - Detect player -> target overlaps (circle vs square approximation)
 *  - Apply per-target type effects (bonus time reduction, hazard penalty)
 *  - Handle dwell mode collection (require staying inside target for set time)
 *  - Maintain session counters & trigger completion when core targets are exhausted.
 *  - Provide lightweight visual feedback elements (bonus/hazard overlays) with auto cleanup.
 *
 * Performance:
 *  - O(n) per frame over active targets. Adequate for modest counts; spatial partitioning unnecessary now.
 *
 * Exports (window.DSG.collision):
 *  checkCollisions(game)
 *  collectTarget(game, targetIndex)
 *  handleHazardCollision(game, target, index)
 *  updateDwellProgress(game, dt) - for dwell mode rendering
 */
(function(){
  
  // Track dwell progress per target - use global Map for debugging
  // Store on window to ensure single instance across any re-runs
  if (!window._dwellProgressMap) {
    window._dwellProgressMap = new Map();
    console.log('🎯 Created NEW dwellProgress Map on window');
  }
  let dwellProgress = window._dwellProgressMap;
  
  function checkCollisions(game){
    const isDwellMode = game.sessionConfig.dwellMode;
    const dwellTime = game.sessionConfig.dwellTime || 1000;
    
    for(let i=game.targets.length-1;i>=0;i--){
      const t=game.targets[i];
      const closestX=Math.max(game.player.x-game.player.size, Math.min(t.x, game.player.x+game.player.size));
      const closestY=Math.max(game.player.y-game.player.size, Math.min(t.y, game.player.y+game.player.size));
      const dx=t.x-closestX, dy=t.y-closestY;
      const dist = Math.hypot(dx,dy);
      const isColliding = dist < t.size;
      
      // Debug: log when actually colliding
      if (isColliding) {
        console.log('🎯 COLLISION with', t.type, 'dist:', dist.toFixed(1), '< size:', t.size, 'dwellMode:', isDwellMode);
      }
      
      if(isColliding) {
        // Hazards always trigger immediately
        if(t.type==='hazard') {
          handleHazardCollision(game,t,i);
          continue;
        }
        
        // Flee targets don't require dwell (too hard otherwise)
        if(t.type==='flee') {
          collectTarget(game,i);
          continue;
        }
        
        // Check if dwell mode applies
        if(isDwellMode) {
          // Initialize or update dwell progress
          const targetId = t.id || t.createdAt || i; // Use unique ID (prefer t.id)
          const currentProgress = dwellProgress.get(targetId) || 0;
          const newProgress = currentProgress + 16; // Approximate frame time in ms
          
          // Debug: log Map state
          console.log('🎯 Dwell:', t.type, 'id:', targetId, '(t.id:', t.id, ') current:', currentProgress, 'new:', newProgress, 'mapSize:', dwellProgress.size);
          
          if(newProgress >= dwellTime) {
            // Dwell complete - collect target
            console.log('🎯 Dwell complete! Collecting target:', t.type);
            dwellProgress.delete(targetId);
            t.dwellProgress = 0;
            collectTarget(game,i);
          } else {
            // Update progress
            dwellProgress.set(targetId, newProgress);
            console.log('🎯 SET dwellProgress for', targetId, 'to', newProgress, 'mapSize now:', dwellProgress.size);
            t.dwellProgress = newProgress / dwellTime; // 0-1 for rendering
            
            // Play tick sound at intervals
            if(game.sessionConfig.feedback.audio && Math.floor(newProgress / 200) > Math.floor(currentProgress / 200)) {
              if(game.sounds.move) game.sounds.move();
            }
          }
        } else {
          // Instant collection
          collectTarget(game,i);
        }
      } else {
        // Not colliding - reset dwell progress for this target
        const targetId = t.id || t.createdAt || i;
        if(dwellProgress.has(targetId)) {
          console.log('🎯 DELETING progress for', targetId, 'because NOT colliding. targets.length:', game.targets.length);
          dwellProgress.delete(targetId);
          t.dwellProgress = 0;
        }
      }
    }
  }
  
  function collectTarget(game,index){
    const target = game.targets[index];
    game.targets.splice(index,1);
    
    // Clear dwell progress
    const targetId = target.id || target.createdAt || index;
    dwellProgress.delete(targetId);
    
    if(target.type==='bonus'){
      const timeReduction = target.timeBonus || 5;
      game.currentSession.timeAdjustments -= timeReduction;
      game.currentSession.bonusTargetsCollected++;
      game.currentSession.targetsCollected++;
      if(game.sounds.collect) game.sounds.collect();
      showBonusEffect(game,timeReduction);
      game.announceToScreenReader && game.announceToScreenReader(`Bonus collected! Time reduced by ${timeReduction} seconds.`);
    } else {
      game.currentSession.coreTargetsCollected++;
      game.currentSession.targetsCollected++;
      if(game.sounds.collect) game.sounds.collect();
      game.announceToScreenReader && game.announceToScreenReader('Target collected! Progress toward completion.');
    }
    game.updateUI();
    const coreLeft = game.targets.filter(t=>['static','moving','flee'].includes(t.type));
    if(coreLeft.length===0) game.completeSession();
  }
  
  function handleHazardCollision(game,target,index){
    const penalty = target.timePenalty || 5;
    game.currentSession.timeAdjustments += penalty;
    game.currentSession.hazardTargetsHit++;
    game.targets.splice(index,1);
    
    // Clear any dwell progress
    const targetId = target.createdAt || index;
    dwellProgress.delete(targetId);
    
    showHazardWarning(game,penalty);
    if(game.sounds.warning) game.sounds.warning();
    game.updateUI();
    game.announceToScreenReader && game.announceToScreenReader(`Hazard hit! Time penalty: ${penalty} seconds.`);
    const coreLeft = game.targets.filter(t=>['static','moving','flee'].includes(t.type));
    if(coreLeft.length===0) game.completeSession();
  }
  
  function showHazardWarning(game,penalty){
    const warning=document.createElement('div'); warning.className='hazard-warning'; warning.innerHTML=`<div class="hazard-warning-content"><div class="hazard-icon">⚠️</div><div class="hazard-text">Time Penalty</div><div class="hazard-penalty">+${penalty} seconds</div></div>`; document.body.appendChild(warning); setTimeout(()=>warning.parentNode&&warning.parentNode.removeChild(warning),2000);
  }
  
  function showBonusEffect(game,timeReduction){
    const bonus=document.createElement('div'); bonus.className='bonus-effect'; bonus.innerHTML=`<div class="bonus-effect-content"><div class="bonus-icon">⭐</div><div class="bonus-text">Time Bonus!</div><div class="bonus-reduction">-${timeReduction} seconds</div></div>`; document.body.appendChild(bonus); setTimeout(()=>bonus.parentNode&&bonus.parentNode.removeChild(bonus),2000);
  }
  
  // Clear all dwell progress (call on session reset)
  function resetDwellProgress() {
    dwellProgress.clear();
  }
  
  window.DSG = window.DSG || {}; 
  window.DSG.collision = { checkCollisions, collectTarget, handleHazardCollision, resetDwellProgress };
})();
