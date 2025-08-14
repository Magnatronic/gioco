/**
 * UI updates & session result utilities.
 *
 * Responsibilities:
 *  - Update live timer & progress bar (updateTimerDisplay / updateUI)
 *  - Aggregate and render stats & recent session history (updateStatsModal / updateSessionHistory)
 *  - Populate & reveal end-of-session results modal (showSessionResults)
 *
 * Accessibility:
 *  - Leaves announcement responsibility to game.announceToScreenReader invoked elsewhere.
 *  - Generates copy buttons with accessible labels via title attribute.
 *
 * Exports (window.DSG.uiSession):
 *  updateUI(game)
 *  updateTimerDisplay(game)
 *  updateStatsModal(game)
 *  updateSessionHistory(game)
 *  showSessionResults(game)
 */
(function(){
  function updateTimerDisplay(game){
    const timeEl=document.getElementById('current-session-time');
    if(game.currentSession && game.currentSession.startTime){
      const sessionTime=game.calculateSessionTime();
      timeEl.textContent=game.formatTime(sessionTime);
      if(sessionTime<0) timeEl.classList.add('time-negative'); else timeEl.classList.remove('time-negative');
    } else { timeEl.textContent='00:00'; }
  }
  function updateUI(game){
    updateTimerDisplay(game);
    const coreTargets=game.targets.filter(t=>['static','moving','flee'].includes(t.type));
    const collected = game.currentSession.totalCoreTargets - coreTargets.length;
    const progress = game.currentSession.totalCoreTargets>0 ? (collected / game.currentSession.totalCoreTargets)*100 : 100;
    const fill=document.getElementById('progress-fill'); if(fill) fill.style.width=progress+'%';
    updateStatsModal(game);
  }
  function updateStatsModal(game){
    const totalSessions=game.sessionHistory.length;
    const totalTargets=game.sessionHistory.reduce((sum,s)=>sum+s.targetsCollected,0);
    const sEl=document.getElementById('stats-sessions'); if(sEl) sEl.textContent=totalSessions;
    const tEl=document.getElementById('stats-targets'); if(tEl) tEl.textContent=totalTargets;
    updateSessionHistory(game);
  }
  function updateSessionHistory(game){
    const container=document.getElementById('session-history'); if(!container) return;
    if(game.sessionHistory.length===0){ container.innerHTML='<div class="no-sessions"><p>No sessions completed yet.</p><p>Complete your first session to see your progress history!</p></div>'; return; }
    const recent=[...game.sessionHistory].reverse();
    container.innerHTML = recent.map((session,index)=>{ const date=new Date(session.endTime||session.startTime); const timeStr=game.formatTime(session.totalTime); const replayCode=session.seed||'N/A'; const dateStr=`${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`; return `<div class="session-item" data-session-index="${index}"><div class="session-time">${timeStr}</div><div class="session-details"><div class="session-replay-info"><div class="replay-code">${replayCode}</div><div class="session-date">${dateStr}</div><button class="copy-replay-btn" data-replay-code="${replayCode}" title="Copy replay code">Copy</button></div></div></div>`; }).join('');
    container.querySelectorAll('.copy-replay-btn').forEach(btn=>btn.addEventListener('click',e=>{ e.preventDefault(); const code=btn.getAttribute('data-replay-code'); game.copyReplayCode(code); }));
  }
  function showSessionResults(game){
    const modal=document.getElementById('results-modal'); if(!modal) return;
    document.getElementById('results-time').textContent = game.formatTime(game.currentSession.totalTime);
    const {isRecord,message}=game.checkPersonalBest(); const banner=document.getElementById('achievement-banner'); const text=document.getElementById('achievement-text'); if(isRecord){ banner.style.display='flex'; text.textContent=message; } else { banner.style.display='none'; }
    const bonusStat=document.getElementById('bonus-stat'); const hazardStat=document.getElementById('hazard-stat');
    if(game.currentSession.bonusTargetsCollected>0){ document.getElementById('results-bonus-targets').textContent=game.currentSession.bonusTargetsCollected; bonusStat.style.display='flex'; } else bonusStat.style.display='none';
    if(game.currentSession.hazardTargetsHit>0){ document.getElementById('results-hazard-targets').textContent=game.currentSession.hazardTargetsHit; hazardStat.style.display='flex'; } else hazardStat.style.display='none';
    document.getElementById('results-seed').textContent=game.currentSession.seed;
    const copyBtn=document.getElementById('copy-replay-code'); copyBtn.onclick=()=>game.copyCurrentSessionReplayCode();
    modal.showModal();
  }
  window.DSG = window.DSG || {}; window.DSG.uiSession = { updateUI, updateTimerDisplay, updateStatsModal, updateSessionHistory, showSessionResults };
})();
