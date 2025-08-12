/* Replay code utilities extracted for reuse across mini-games.
   Keeps current 14-digit numbers-only format with legacy decode support. */
(function () {
  function encodeSize(size) { const m = { 'small': 0, 'medium': 1, 'large': 2, 'extra-large': 3 }; return m.hasOwnProperty(size) ? m[size] : 1; }
  function encodeTrail(trail) { const m = { 'short': 0, 'long': 1 }; return m.hasOwnProperty(trail) ? m[trail] : 0; }
  function encodeInputMethod(method) { const m = { 'discrete': 0, 'continuous': 1, 'mouse': 2 }; return m.hasOwnProperty(method) ? m[method] : 0; }
  function encodeBoundaries(boundaries) { const m = { 'none': 0, 'visual': 1, 'hard': 2 }; return m.hasOwnProperty(boundaries) ? m[boundaries] : 0; }

  function decodeSize(n) { const m = { 0: 'small', 1: 'medium', 2: 'large', 3: 'extra-large' }; return m[n] || 'medium'; }
  function decodeTrail(n) { const m = { 0: 'short', 1: 'long' }; return m[n] || 'short'; }
  function decodeInputMethod(n) { const m = { 0: 'discrete', 1: 'continuous', 2: 'mouse' }; return m[n] || 'discrete'; }
  function decodeBoundaries(n) { const m = { 0: 'none', 1: 'visual', 2: 'hard' }; return m[n] || 'none'; }

  function generateFromConfig(config) {
    const d = {
      st: Math.min(config.targetCounts.stationary, 9),
      mv: Math.min(config.targetCounts.moving, 9),
      fl: Math.min(config.targetCounts.flee, 9),
      bn: Math.min(config.targetCounts.bonus, 9),
      hz: Math.min(config.targetCounts.hazard, 9),
      sz: encodeSize(config.targetSize),
      sp: config.playerSpeed,
      tr: encodeTrail(config.playerTrail),
      im: encodeInputMethod(config.inputMethod),
      ib: Math.min(Math.floor(config.inputBuffer / 50), 9),
      bd: encodeBoundaries(config.boundaries),
      fa: config.feedback.audio ? 1 : 0,
      fv: config.feedback.visual ? 1 : 0,
      fh: config.feedback.haptic ? 1 : 0
    };
    return `${d.st}${d.mv}${d.fl}${d.bn}${d.hz}${d.sz}${d.sp}${d.tr}${d.im}${d.ib}${d.bd}${d.fa}${d.fv}${d.fh}`;
  }

  function decode(code) {
    let s = code.trim();
    if (s.includes('-')) {
      const parts = s.split('-');
      if (parts.length === 3) s = parts[2]; else return null;
    }
    if (!/^\d{14}$/.test(s)) return null;
    return {
      targetCounts: {
        stationary: parseInt(s[0]) || 0,
        moving: parseInt(s[1]) || 0,
        flee: parseInt(s[2]) || 0,
        bonus: parseInt(s[3]) || 0,
        hazard: parseInt(s[4]) || 0
      },
      targetSize: decodeSize(parseInt(s[5])),
      playerSpeed: parseInt(s[6]) || 3,
      playerTrail: decodeTrail(parseInt(s[7])),
      inputMethod: decodeInputMethod(parseInt(s[8])),
      inputBuffer: (parseInt(s[9]) || 0) * 50,
      boundaries: decodeBoundaries(parseInt(s[10])),
      feedback: { audio: s[11] === '1', visual: s[12] === '1', haptic: s[13] === '1' }
    };
  }

  window.ReplayCode = {
    encodeSize, encodeTrail, encodeInputMethod, encodeBoundaries,
    decodeSize, decodeTrail, decodeInputMethod, decodeBoundaries,
    generateFromConfig, decode
  };
})();
