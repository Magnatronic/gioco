// Input handling abstraction extracted from game.js
(function(){
  function handleKeyDown(game,e){
    game.keys[e.code] = true;
    switch(e.code){
      case 'Space':
        e.preventDefault();
        const pauseModal = document.getElementById('pause-modal');
        if(pauseModal && pauseModal.open){ game.hidePauseModal(); game.resumeGame(); }
        else { game.togglePlayPause(); }
        break;
      case 'Escape':
        e.preventDefault();
        const pm = document.getElementById('pause-modal');
        if(pm && pm.open){ game.hidePauseModal(); game.returnToMainMenu(); }
        else if(game.gameState==='playing'){ game.pauseGame(); setTimeout(()=>game.showPauseModal(),100); }
        else if(game.gameState==='paused'){ game.showPauseModal(); }
        break;
      case 'F1': e.preventDefault(); game.openHelp(); break;
      case 'F11': e.preventDefault(); game.toggleFullscreen(); break;
    }
    if(game.gameState==='playing' || game.gameState==='ready'){
      handleMovementInput(game,e.code);
    }
  }
  function handleKeyUp(game,e){ game.keys[e.code] = false; }
  function handleMovementInput(game,keyCode){
    const map={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',KeyW:'up',KeyS:'down',KeyA:'left',KeyD:'right'};
    const dir = map[keyCode];
    if(!dir) return;
    if(game.gameState==='ready') beginTimedSession(game); // start timer
    if(game.sessionConfig.inputMethod==='continuous') game.setContinuousDirection(dir);
  }
  function handleMouseClick(game,e){
    if(game.sessionConfig.inputMethod!=='mouse' || (game.gameState!=='playing' && game.gameState!=='ready')) return;
    if(game.gameState==='ready') beginTimedSession(game);
    const rect = game.canvas.getBoundingClientRect();
    game.player.targetX = e.clientX - rect.left;
    game.player.targetY = e.clientY - rect.top;
    if(game.sounds.move) game.sounds.move();
    game.announceToScreenReader && game.announceToScreenReader(`Moving to position ${Math.round(game.player.targetX)}, ${Math.round(game.player.targetY)}`);
  }
  function wireDocumentKeyboard(game){
    document.addEventListener('keydown', e=>handleKeyDown(game,e));
    document.addEventListener('keyup', e=>handleKeyUp(game,e));
  }
  window.DSG = window.DSG || {}; window.DSG.input = { handleKeyDown, handleKeyUp, handleMovementInput, handleMouseClick, wireDocumentKeyboard };
  // dependencies across modules
  function beginTimedSession(game){ if(window.DSG && window.DSG.sessionTiming) window.DSG.sessionTiming.beginTimedSession(game); }
})();
