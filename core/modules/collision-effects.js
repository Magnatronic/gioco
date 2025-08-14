/**
 * Collision detection & target effect handlers.
 *
 * Responsibilities:
 *  - Detect player -> target overlaps (circle vs square approximation)
 *  - Apply per-target type effects (bonus time reduction, hazard penalty)
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
 */
(function(){
  function checkCollisions(game){
    for(let i=game.targets.length-1;i>=0;i--){
      const t=game.targets[i];
      const closestX=Math.max(game.player.x-game.player.size, Math.min(t.x, game.player.x+game.player.size));
      const closestY=Math.max(game.player.y-game.player.size, Math.min(t.y, game.player.y+game.player.size));
      const dx=t.x-closestX, dy=t.y-closestY; if(Math.hypot(dx,dy) < t.size){
        if(t.type==='hazard') handleHazardCollision(game,t,i); else collectTarget(game,i);
      }
    }
  }
  function collectTarget(game,index){
    const target = game.targets[index];
    game.targets.splice(index,1);
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
    showHazardWarning(game,penalty);
    if(game.sounds.warning) game.sounds.warning();
    game.updateUI();
    game.announceToScreenReader && game.announceToScreenReader(`Hazard avoided! Time penalty: ${penalty} seconds.`);
    const coreLeft = game.targets.filter(t=>['static','moving','flee'].includes(t.type));
    if(coreLeft.length===0) game.completeSession();
  }
  function showHazardWarning(game,penalty){
    const warning=document.createElement('div'); warning.className='hazard-warning'; warning.innerHTML=`<div class="hazard-warning-content"><div class="hazard-icon">⚠️</div><div class="hazard-text">Time Penalty</div><div class="hazard-penalty">+${penalty} seconds</div></div>`; document.body.appendChild(warning); setTimeout(()=>warning.parentNode&&warning.parentNode.removeChild(warning),2000);
  }
  function showBonusEffect(game,timeReduction){
    const bonus=document.createElement('div'); bonus.className='bonus-effect'; bonus.innerHTML=`<div class="bonus-effect-content"><div class="bonus-icon">⭐</div><div class="bonus-text">Time Bonus!</div><div class="bonus-reduction">-${timeReduction} seconds</div></div>`; document.body.appendChild(bonus); setTimeout(()=>bonus.parentNode&&bonus.parentNode.removeChild(bonus),2000);
  }
  window.DSG = window.DSG || {}; window.DSG.collision = { checkCollisions, collectTarget, handleHazardCollision };
})();
