// Target generation & deterministic seeding utilities extracted from game.js
// Provides deterministic placement of player and targets based on a replay code seed.
// All functions operate on a passed game instance to avoid tight coupling.
(function(){
  // Factory for different target types (moved from game.js during pruning)
  function createTargetByType(game, type, x, y, size){
    const baseTarget = {
      x, y, size,
      type,
      points: type === 'bonus' ? 200 : 100,
      collectible: true,
      createdAt: Date.now()
    };
    switch(type){
      case 'static':
        return { ...baseTarget, color:'#27ae60' };
      case 'moving':
        return { ...baseTarget, color:'#3498db', velocity:{ x:(seededRandom(game)-0.5)*2, y:(seededRandom(game)-0.5)*2 }, pattern:'linear' };
      case 'flee':
        return { ...baseTarget, color:'#9b59b6', fleeSpeed:1.5, detectionRadius:size*4, velocity:{x:0,y:0} };
      case 'bonus':
        return { ...baseTarget, color:'#f39c12', bonusMultiplier:2, timeBonus:5 };
      case 'hazard':
        return { ...baseTarget, color:'#e74c3c', collectible:false, timePenalty:5, hazardEffect:'warning' };
      default:
        return { ...baseTarget, color:'#27ae60' };
    }
  }
  function hashCodeToSeed(code){
    let hash = 0;
    if(!code || code.length===0) return Math.random();
    for(let i=0;i<code.length;i++){
      const char = code.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32-bit
    }
    return Math.abs(hash);
  }
  function seedRandom(game, seed){
    game.seedValue = seed;
    if(game.debug) console.log('🌱 Initialized seed value:', game.seedValue);
  }
  function seededRandom(game){
    game.seedValue = (game.seedValue * 1664525 + 1013904223) % 4294967296;
    return game.seedValue / 4294967296;
  }
  function setSeededPlayerPosition(game){
    if(game.currentSession && game.currentSession.seed){
      if(!game.seedValue){
        seedRandom(game, hashCodeToSeed(game.currentSession.seed));
      }
      const margin = game.player.size + 20;
      game.player.x = margin + seededRandom(game) * (game.canvas.width - 2 * margin);
      game.player.y = margin + seededRandom(game) * (game.canvas.height - 2 * margin);
      if(game.debug) console.log('🎯 Set seeded player position:', Math.round(game.player.x), ',', Math.round(game.player.y), 'with seed:', game.currentSession.seed);
    } else {
      game.player.x = game.canvas.width / 2;
      game.player.y = game.canvas.height / 2;
      if(game.debug) console.log('🎯 Set default player position (center):', Math.round(game.player.x), ',', Math.round(game.player.y));
    }
    game.player.trail = [];
  }
  function createDeterministicTarget(game, type, size){
    const margin = size + 20;
    const overlayWidth = 160, overlayHeight = 60;
    const maxAttempts = 50;
    for(let attempt=0; attempt<maxAttempts; attempt++){
      const x = margin + seededRandom(game) * (game.canvas.width - 2 * margin);
      const y = margin + seededRandom(game) * (game.canvas.height - 2 * margin);
      const isUnderOverlay = (x < overlayWidth + margin && y < overlayHeight + margin);
      const playerDistance = Math.hypot(x - game.player.x, y - game.player.y);
      if(playerDistance < size * 3 || isUnderOverlay) continue;
      let tooClose = false;
      for(const existing of game.targets){
        const d = Math.hypot(x - existing.x, y - existing.y);
        if(d < size * 2.5){ tooClose = true; break; }
      }
      if(!tooClose){
    return createTargetByType(game, type, x, y, size);
      }
    }
    // fallback
    const x = margin + seededRandom(game) * (game.canvas.width - 2 * margin);
    const y = margin + seededRandom(game) * (game.canvas.height - 2 * margin);
  return createTargetByType(game, type, x, y, size);
  }
  function generateSessionTargets(game){
    game.targets = [];
    const numericSeed = hashCodeToSeed(game.currentSession.seed);
    if(game.debug) console.log('🌱 Setting seed for target generation:', game.currentSession.seed,'→', numericSeed);
    seedRandom(game, numericSeed);
    if(game.debug) console.log('🌱 Seed value after initialization:', game.seedValue);
    setSeededPlayerPosition(game);
    if(game.debug) console.log('🎯 Generating targets with configuration:', { targetCounts: game.sessionConfig.targetCounts, targetSize: game.sessionConfig.targetSize });
    const targetSizes = { 'small':20, 'medium':30, 'large':40, 'extra-large':50 };
    const targetSize = targetSizes[game.sessionConfig.targetSize] || 30;
    const targetTypes = ['stationary','moving','flee','bonus','hazard'];
    let totalTargets = 0;
    for(const type of targetTypes){
      const count = game.sessionConfig.targetCounts[type] || 0;
      totalTargets += count;
      for(let j=0;j<count;j++){
        const mapped = type === 'stationary' ? 'static' : type;
        const t = createDeterministicTarget(game, mapped, targetSize);
        if(t) game.targets.push(t);
      }
    }
    if(totalTargets === 0){
      const t = createDeterministicTarget(game,'static',targetSize);
      if(t){ game.targets.push(t); totalTargets = 1; }
    }
    game.currentSession.totalTargets = totalTargets;
    game.player.size = targetSize;
    game.currentSession.totalCoreTargets = (game.sessionConfig.targetCounts.stationary||0)+(game.sessionConfig.targetCounts.moving||0)+(game.sessionConfig.targetCounts.flee||0);
    if(game.currentSession.totalCoreTargets===0 && totalTargets>0){
      const t = createDeterministicTarget(game,'static',targetSize);
      if(t){ game.targets.push(t); game.currentSession.totalCoreTargets = 1; totalTargets++; }
    }
    game.currentSession.totalTargets = totalTargets;
    game.updateUI();
  }
  window.DSG = window.DSG || {}; 
  window.DSG.targets = { hashCodeToSeed, seedRandom, seededRandom, setSeededPlayerPosition, createDeterministicTarget, createTargetByType, generateSessionTargets };
})();
