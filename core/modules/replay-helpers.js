/**
 * Replay helper wrappers & shallow config comparator.
 *
 * Responsibilities:
 *  - Thin wrappers around global ReplayCode utilities (generateFromConfig / decode)
 *  - Lightweight deep-ish comparison (compareConfigs) for config equality checks without JSON stringify cost.
 *
 * Limitations:
 *  - Comparator skips symbol & non-enumerable properties; designed for plain config objects only.
 *
 * Exports (window.DSG.replay):
 *  generateFromConfig(config) -> string
 *  decode(code) -> object | null
 *  compareConfigs(a,b) -> boolean
 */
(function(){
  if(!window.ReplayCode) return;
  function generateFromConfig(cfg){ return window.ReplayCode.generateFromConfig(cfg); }
  function decode(code){ return window.ReplayCode.decode(code); }
  function compare(a,b){ if(!b) return false; var stack=[[a,b]]; while(stack.length){ var p=stack.pop(), o1=p[0], o2=p[1]; for(var k in o1){ if(Object.prototype.hasOwnProperty.call(o1,k)){ var v1=o1[k], v2=o2?o2[k]:undefined; if(v1 && typeof v1==='object'){ stack.push([v1,v2]); } else if(v1!==v2){ return false; } } } } return true; }
  window.DSG = window.DSG || {}; window.DSG.replay = { generateFromConfig:generateFromConfig, decode:decode, compareConfigs:compare };
})();
