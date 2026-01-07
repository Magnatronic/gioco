/* Replay code utilities extracted for reuse across mini-games.
   Version 2: Extended format with calm mode, dwell settings, and joystick config. */
(function () {
  function encodeSize(size) { const m = { 'small': 0, 'medium': 1, 'large': 2, 'extra-large': 3 }; return m.hasOwnProperty(size) ? m[size] : 1; }
  function encodeTrail(trail) { const m = { 'short': 0, 'long': 1, 'off': 2 }; return m.hasOwnProperty(trail) ? m[trail] : 0; }
  function encodeInputMethod(method) { const m = { 'discrete': 0, 'continuous': 1, 'mouse': 2, 'joystick': 3, 'cursor': 4 }; return m.hasOwnProperty(method) ? m[method] : 0; }
  function encodeBoundaries(boundaries) { const m = { 'none': 0, 'visual': 1, 'hard': 2 }; return m.hasOwnProperty(boundaries) ? m[boundaries] : 0; }
  function encodeJoystickSensitivity(sens) { const m = { 'low': 0, 'medium': 1, 'high': 2 }; return m.hasOwnProperty(sens) ? m[sens] : 1; }
  function encodeDwellTime(ms) { 
    // Map 500-3000ms to 0-5 (500ms steps)
    const step = Math.round((ms - 500) / 500);
    return Math.max(0, Math.min(5, step));
  }
  function encodeDeadzone(pct) {
    // Map 5-30% to 0-5 (5% steps)
    const step = Math.round((pct - 5) / 5);
    return Math.max(0, Math.min(5, step));
  }

  function decodeSize(n) { const m = { 0: 'small', 1: 'medium', 2: 'large', 3: 'extra-large' }; return m[n] || 'medium'; }
  function decodeTrail(n) { const m = { 0: 'short', 1: 'long', 2: 'off' }; return m[n] || 'short'; }
  function decodeInputMethod(n) { const m = { 0: 'discrete', 1: 'continuous', 2: 'mouse', 3: 'joystick', 4: 'cursor' }; return m[n] || 'discrete'; }
  function decodeBoundaries(n) { const m = { 0: 'none', 1: 'visual', 2: 'hard' }; return m[n] || 'none'; }
  function decodeJoystickSensitivity(n) { const m = { 0: 'low', 1: 'medium', 2: 'high' }; return m[n] || 'medium'; }
  function decodeDwellTime(n) { return 500 + (n * 500); } // 0->500, 1->1000, etc.
  function decodeDeadzone(n) { return 5 + (n * 5); } // 0->5%, 1->10%, etc.

  function checksum(s) {
    // Simple mod-10 checksum
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
      fh: config.feedback.haptic ? 1 : 0,
      // New v2 fields
      cm: config.calmMode ? 1 : 0,
      dm: config.dwellMode ? 1 : 0,
      dt: encodeDwellTime(config.dwellTime || 1000),
      jd: encodeDeadzone(config.joystickDeadzone || 15),
      js: encodeJoystickSensitivity(config.joystickSensitivity || 'medium')
    };
    // v2 payload: 14 original digits + 5 new = 19 digits
    const payload = `${d.st}${d.mv}${d.fl}${d.bn}${d.hz}${d.sz}${d.sp}${d.tr}${d.im}${d.ib}${d.bd}${d.fa}${d.fv}${d.fh}${d.cm}${d.dm}${d.dt}${d.jd}${d.js}`;
    const ver = '2'; // version 2
    const chk = checksum(payload);
    return `${payload}${ver}${chk}`; // 21 digits total
  }

  function decode(code) {
    let s = code.trim();
    if (s.includes('-')) {
      const parts = s.split('-');
      if (parts.length === 3) s = parts[2]; else return null;
    }
    
    let payload = null;
    let version = '1';
    
    // Version 2 format: 21 digits (19 payload + 1 version + 1 checksum)
    if (/^\d{21}$/.test(s)) {
      const body = s.slice(0, 19);
      version = s[19];
      const chk = s[20];
      if (version === '2') {
        const ok = checksum(body) === chk;
        if (!ok) return null;
      }
      payload = body;
    }
    // Version 1 format: 16 digits (14 payload + 1 version + 1 checksum)
    else if (/^\d{16}$/.test(s)) {
      const body = s.slice(0, 14);
      version = s[14];
      const chk = s[15];
      if (version === '1') {
        const ok = checksum(body) === chk;
        if (!ok) return null;
      }
      payload = body;
    }
    // Legacy format: 14 digits (no version/checksum)
    else if (/^\d{14}$/.test(s)) {
      payload = s;
      version = '0'; // legacy
    } else {
      return null;
    }
    
    // Base config (all versions)
    const config = {
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
      feedback: { 
        audio: payload[11] === '1', 
        visual: payload[12] === '1', 
        haptic: payload[13] === '1' 
      },
      // Defaults for v1/legacy codes
      calmMode: false,
      dwellMode: false,
      dwellTime: 1000,
      joystickDeadzone: 15,
      joystickSensitivity: 'medium'
    };
    
    // Parse v2 extended fields
    if (version === '2' && payload.length >= 19) {
      config.calmMode = payload[14] === '1';
      config.dwellMode = payload[15] === '1';
      config.dwellTime = decodeDwellTime(parseInt(payload[16]) || 0);
      config.joystickDeadzone = decodeDeadzone(parseInt(payload[17]) || 0);
      config.joystickSensitivity = decodeJoystickSensitivity(parseInt(payload[18]) || 1);
    }
    
    return config;
  }

  window.ReplayCode = {
    encodeSize, encodeTrail, encodeInputMethod, encodeBoundaries,
    decodeSize, decodeTrail, decodeInputMethod, decodeBoundaries,
    encodeJoystickSensitivity, decodeJoystickSensitivity,
    encodeDwellTime, decodeDwellTime,
    encodeDeadzone, decodeDeadzone,
    generateFromConfig, decode
  };
})();
