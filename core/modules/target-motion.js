/**
 * Target motion update module (moving + flee behaviors).
 * Keeps deterministic generation separate from frame updates.
 * Accessibility-first: moderate speeds, predictable motion, bounded.
 */
(function(){
  function updateTargetMotion(game, dt){
    if(!game || !Array.isArray(game.targets) || !game.canvas) return;
    const player = game.player;
    if(!player) return;
    const baseMoveSpeed = 40; // px/s for moving targets
    const fleeBaseSpeed = 90; // px/s * fleeSpeed for flee targets
    for(const t of game.targets){
      if(!t || !t.type) continue;
      if(t.type === 'moving' && t.velocity){
        t.x += t.velocity.x * baseMoveSpeed * dt;
        t.y += t.velocity.y * baseMoveSpeed * dt;
        // bounce logic
        if(t.x - t.size < 0){ t.x = t.size; t.velocity.x *= -1; }
        if(t.x + t.size > game.canvas.width){ t.x = game.canvas.width - t.size; t.velocity.x *= -1; }
        if(t.y - t.size < 0){ t.y = t.size; t.velocity.y *= -1; }
        if(t.y + t.size > game.canvas.height){ t.y = game.canvas.height - t.size; t.velocity.y *= -1; }
      } else if(t.type === 'flee'){
        const dx = t.x - player.x; const dy = t.y - player.y; const d = Math.hypot(dx,dy) || 1;
        if(d < (t.detectionRadius || t.size*4)){
          const fs = (t.fleeSpeed || 1.5) * fleeBaseSpeed * dt;
            t.x += (dx/d)*fs; t.y += (dy/d)*fs;
        }
        if(t.x - t.size < 0) t.x = t.size;
        if(t.y - t.size < 0) t.y = t.size;
        if(t.x + t.size > game.canvas.width) t.x = game.canvas.width - t.size;
        if(t.y + t.size > game.canvas.height) t.y = game.canvas.height - t.size;
      }
    }
  }
  window.DSG = window.DSG || {}; window.DSG.targetMotion = { updateTargetMotion };
})();
