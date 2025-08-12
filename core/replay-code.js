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

  function checksum14(s) {
    // Simple mod-10 checksum (Luhn-like variant without doubling) for 14-digit base
    let sum = 0;
    for (let i = 0; i < s.length; i++) sum = (sum + (s.charCodeAt(i) - 48)) % 10;
    return String(sum);
  }

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
    const payload = `${d.st}${d.mv}${d.fl}${d.bn}${d.hz}${d.sz}${d.sp}${d.tr}${d.im}${d.ib}${d.bd}${d.fa}${d.fv}${d.fh}`; // 14 digits
    const ver = '1'; // version nibble
    const chk = checksum14(payload);
    return `${payload}${ver}${chk}`; // 16 digits total
  }

  function decode(code) {
    let s = code.trim();
    if (s.includes('-')) {
      const parts = s.split('-');
      if (parts.length === 3) s = parts[2]; else return null;
    }
    // Backward compatibility: accept 14-digit codes (no version/checksum)
    let payload = null;
    if (/^\d{16}$/.test(s)) {
      const body = s.slice(0, 14);
      const ver = s[14];
      const chk = s[15];
      // Validate checksum only for known version '1'
      if (ver === '1') {
        const ok = checksum14(body) === chk;
        if (!ok) return null;
      }
      payload = body;
    } else if (/^\d{14}$/.test(s)) {
      payload = s; // legacy
    } else {
      return null;
    }
    return {
      targetCounts: {
        stationary: parseInt(payload[0]) || 0,
        moving: parseInt(payload[1]) || 0,
        flee: parseInt(payload[2]) || 0,
        bonus: parseInt(payload[3]) || 0,
        hazard: parseInt(payload[4]) || 0
      },
      targetSize: decodeSize(parseInt(payload[5])),
      playerSpeed: parseInt(payload[6]) || 3,
      playerTrail: decodeTrail(parseInt(payload[7])),
      inputMethod: decodeInputMethod(parseInt(payload[8])),
      inputBuffer: (parseInt(payload[9]) || 0) * 50,
      boundaries: decodeBoundaries(parseInt(payload[10])),
      feedback: { audio: payload[11] === '1', visual: payload[12] === '1', haptic: payload[13] === '1' }
    };
  }

  window.ReplayCode = {
    encodeSize, encodeTrail, encodeInputMethod, encodeBoundaries,
    decodeSize, decodeTrail, decodeInputMethod, decodeBoundaries,
  generateFromConfig, decode
  };
})();
