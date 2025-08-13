// Accessibility announcer extracted from game.js
(function(){
  function announce(message){
    var el=document.getElementById('game-status');
    if(!el) return;
    el.textContent='';
    setTimeout(function(){ el.textContent=message; },10);
  }
  window.DSG = window.DSG || {}; window.DSG.announcer = { announce };
})();
