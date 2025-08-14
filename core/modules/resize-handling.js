/**
 * Canvas resize handling utilities.
 *
 * Responsibilities:
 *  - Debounced reaction to window resize (handleResize)
 *  - Strategy-specific adjustments: reposition, scale, regenerate, or pause.
 *  - Maintain player visibility & optionally clear trail when deterministic replay context changes.
 *
 * Notes:
 *  - regenerateTargetsAfterResize currently references legacy helpers (getLevelConfig / createTargetWithSpacing) which
 *    are pruned; path retained for potential future restoration but effectively inert without those functions.
 *  - Future enhancement: integrate with deterministic generator to re-seed targets for regenerate strategy.
 *
 * Export (window.DSG.resize):
 *  handleResize(game)
 */
(function(){
  function handleResize(game){
    setTimeout(()=>{
      const oldWidth=game.canvas.width, oldHeight=game.canvas.height;
      game.setupCanvas();
      switch(game.settings.resizeHandling){
        case 'reposition': repositionTargetsAfterResize(game,oldWidth,oldHeight); break;
        case 'scale': scaleTargetsAfterResize(game,oldWidth,oldHeight); break;
        case 'regenerate': regenerateTargetsAfterResize(game); break;
        case 'pause': if(game.gameState==='playing'){ game.pauseGame(); game.announceToScreenReader && game.announceToScreenReader('Game paused due to window resize. Press Space to resume.'); } break; }
      repositionPlayerAfterResize(game);
    },100);
  }
  function repositionTargetsAfterResize(game,oldWidth,oldHeight){ let repositioned=0; game.targets.forEach(t=>{ const ox=t.x, oy=t.y; const margin=t.size+10; t.x=Math.max(margin,Math.min(game.canvas.width-margin,t.x)); t.y=Math.max(margin,Math.min(game.canvas.height-margin,t.y)); if(game.canvas.width < oldWidth*0.7 || game.canvas.height < oldHeight*0.7){ const scaleX=(game.canvas.width-2*margin)/(oldWidth-2*margin); const scaleY=(game.canvas.height-2*margin)/(oldHeight-2*margin); t.x = margin + (t.x-margin)*scaleX; t.y = margin + (t.y-margin)*scaleY; } if(ox!==t.x || oy!==t.y) repositioned++; }); if(repositioned>0) game.announceToScreenReader && game.announceToScreenReader(`Window resized. ${repositioned} target${repositioned>1?'s':''} repositioned to stay visible.`); }
  function repositionPlayerAfterResize(game){ const margin=game.player.size; game.player.x=Math.max(margin,Math.min(game.canvas.width-margin,game.player.x)); game.player.y=Math.max(margin,Math.min(game.canvas.height-margin,game.player.y)); if(!(game.currentSession && game.currentSession.seed && game.gameState==='playing')) game.player.trail=[]; }
  function scaleTargetsAfterResize(game,oldWidth,oldHeight){ if(oldWidth===0||oldHeight===0) return; const scaleX=game.canvas.width/oldWidth, scaleY=game.canvas.height/oldHeight; game.targets.forEach(t=>{ t.x*=scaleX; t.y*=scaleY; const margin=t.size+10; t.x=Math.max(margin,Math.min(game.canvas.width-margin,t.x)); t.y=Math.max(margin,Math.min(game.canvas.height-margin,t.y)); }); game.announceToScreenReader && game.announceToScreenReader('Window resized. All targets scaled to maintain relative positions.'); }
  function regenerateTargetsAfterResize(game){ const count=game.targets.length; game.targets=[]; const cfg = game.getLevelConfig ? game.getLevelConfig(game.currentLevel) : null; for(let i=0;i<count;i++){ const t = game.createTargetWithSpacing ? game.createTargetWithSpacing(cfg) : null; if(t) game.targets.push(t); } game.announceToScreenReader && game.announceToScreenReader(`Window resized. ${count} new targets generated with proper spacing.`); }
  window.DSG = window.DSG || {}; window.DSG.resize = { handleResize };
})();
