/* Green Apple — generative ambient soundtrack + UI sound effects (Web Audio, no audio files) */
(function () {
  const M = { on: false, ready: false };
  let ctx, master, musicBus, sfxBus, comp, reverb, delay, delayFb, analyser, freqData;
  let nextTime = 0, step = 0, timer = null;
  const BPM = 92, STEP = 60 / BPM / 4; // 16th note
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);

  // F maj9 → A m9 → C maj9 → G 6/9   (midi notes)
  const CHORDS = [
    { pad: [53, 57, 60, 64, 67], bass: 41, arp: [65, 69, 72, 76, 79, 77] },
    { pad: [57, 60, 64, 67, 71], bass: 45, arp: [69, 72, 76, 79, 81, 83] },
    { pad: [48, 55, 59, 62, 64], bass: 36, arp: [67, 71, 72, 74, 76, 79] },
    { pad: [55, 59, 62, 64, 69], bass: 43, arp: [67, 69, 71, 74, 76, 78] }
  ];
  const BAR_STEPS = 16, CHORD_BARS = 2;
  const VOL = 0.4;   // soft background level

  function impulse(sec, decay) {
    const len = ctx.sampleRate * sec, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0;
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.82;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.9;
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55;
    reverb = ctx.createConvolver(); reverb.buffer = impulse(4.5, 2.6);
    const revGain = ctx.createGain(); revGain.gain.value = 0.55;
    delay = ctx.createDelay(2); delay.delayTime.value = STEP * 3;
    delayFb = ctx.createGain(); delayFb.gain.value = 0.38;
    const delayLP = ctx.createBiquadFilter(); delayLP.type = 'lowpass'; delayLP.frequency.value = 2600;
    delay.connect(delayLP); delayLP.connect(delayFb); delayFb.connect(delay);
    delayLP.connect(musicBus);
    musicBus.connect(comp); sfxBus.connect(comp);
    musicBus.connect(reverb); reverb.connect(revGain); revGain.connect(comp);
    comp.connect(master); master.connect(analyser); analyser.connect(ctx.destination);
    M.ready = true;
  }

  /* ---------- instruments ---------- */
  function pad(notes, t, dur) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.7;
    f.frequency.setValueAtTime(500, t);
    f.frequency.linearRampToValueAtTime(1500, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(700, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.055, t + 1.8);
    g.gain.setValueAtTime(0.055, t + dur - 0.4);
    g.gain.linearRampToValueAtTime(0, t + dur + 2.6);
    f.connect(g); g.connect(musicBus);
    notes.forEach(n => {
      [-7, 7].forEach(det => {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.value = hz(n); o.detune.value = det + (Math.random() * 4 - 2);
        o.connect(f); o.start(t); o.stop(t + dur + 3);
      });
    });
  }
  function bass(n, t, dur) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(n);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.1);
  }
  function pluck(n, t, vel) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(n);
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = hz(n + 12);
    const g = ctx.createGain(), g2 = ctx.createGain(); g2.gain.value = 0.25;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09 * vel, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(musicBus); g.connect(delay);
    o.start(t); o2.start(t); o.stop(t + 1); o2.stop(t + 1);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(0.42, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.45);
  }
  let noiseBuf;
  function noise(t, dur, freq, vol, type) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'highpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(musicBus); s.start(t); s.stop(t + dur + 0.05);
  }

  /* ---------- sequencer ---------- */
  function schedule() {
    while (nextTime < ctx.currentTime + 0.25) {
      const s = step % (BAR_STEPS * CHORD_BARS * CHORDS.length);
      const chordIdx = Math.floor(s / (BAR_STEPS * CHORD_BARS));
      const inChord = s % (BAR_STEPS * CHORD_BARS);
      const bar = Math.floor(step / BAR_STEPS);
      const c = CHORDS[chordIdx];
      const t = nextTime;
      if (inChord === 0) pad(c.pad, t, STEP * BAR_STEPS * CHORD_BARS);
      if (inChord % 8 === 0) bass(c.bass, t, STEP * 7);
      // arpeggio: denser as the loop develops
      const density = bar < 2 ? 0.25 : 0.55;
      const accent = (inChord % 4 === 0) ? 1 : 0.6;
      if (inChord % 2 === 0 && Math.random() < density + (inChord % 4 === 0 ? 0.25 : 0)) {
        pluck(c.arp[Math.floor(Math.random() * c.arp.length)], t, accent);
      }
      // soft beat after the intro
      if (bar >= 4) {
        if (inChord % 8 === 0 || (inChord % 16 === 10 && Math.random() < 0.5)) kick(t);
        if (inChord % 4 === 2) noise(t, 0.05, 7000, 0.06);
        if (inChord % 8 === 4) noise(t, 0.18, 1800, 0.05, 'bandpass');
      }
      nextTime += STEP; step++;
    }
  }

  M.start = function () {
    if (!M.ready) build();
    if (ctx.state === 'suspended') ctx.resume();
    if (!timer) { nextTime = ctx.currentTime + 0.1; timer = setInterval(schedule, 60); }
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(VOL, ctx.currentTime + 3);
    M.on = true; document.dispatchEvent(new CustomEvent('music', { detail: true }));
  };
  M.stop = function () {
    if (!M.ready) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    M.on = false; document.dispatchEvent(new CustomEvent('music', { detail: false }));
    setTimeout(() => { if (!M.on) { clearInterval(timer); timer = null; } }, 900);
  };
  // the visitor's own on/off choice (the sound button) is remembered for next visits
  const PREF = 'ga-sound';
  M.toggle = () => {
    if (M.on) M.stop(); else M.start();
    try { localStorage.setItem(PREF, M.on ? 'on' : 'off'); } catch (e) {}
  };
  // the site is silent by default: music (and the gate's sounds) only play for a visitor who
  // turned them on with the sound button. Browsers keep audio silent until the first
  // tap/click/key, so for them it starts on the first gesture (usually the click on the gate).
  M.autoplay = function () {
    let pref = null; try { pref = localStorage.getItem(PREF); } catch (e) {}
    if (pref !== 'on') return;
    M.start();
    const wake = () => { if (M.on && ctx && ctx.state !== 'running') ctx.resume(); if (ctx && ctx.state === 'running') off(); };
    const off = () => ['pointerdown', 'keydown', 'touchend', 'click'].forEach(ev => removeEventListener(ev, wake, true));
    ['pointerdown', 'keydown', 'touchend', 'click'].forEach(ev => addEventListener(ev, wake, true));
  };

  /* 0..1 overall energy, and n frequency bands */
  M.level = function () {
    if (!M.on || !analyser) return 0;
    analyser.getByteFrequencyData(freqData);
    let s = 0; for (let i = 0; i < 48; i++) s += freqData[i];
    return s / (48 * 255);
  };
  M.bands = function (n) {
    const out = new Array(n).fill(0);
    if (!M.on || !analyser) return out;
    analyser.getByteFrequencyData(freqData);
    const per = Math.floor(64 / n);
    for (let b = 0; b < n; b++) { let s = 0; for (let i = 0; i < per; i++) s += freqData[b * per + i + 1]; out[b] = s / (per * 255); }
    return out;
  };

  /* ---------- UI sound effects ---------- */
  function sfxOk() { return M.on && ctx && ctx.state === 'running'; }
  let lastHover = 0;
  M.hover = function () {
    if (!sfxOk()) return; const now = ctx.currentTime; if (now - lastHover < 0.06) return; lastHover = now;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(1800 + Math.random() * 400, now);
    o.frequency.exponentialRampToValueAtTime(900, now + 0.06);
    g.gain.setValueAtTime(0.05, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    o.connect(g); g.connect(sfxBus); o.start(now); o.stop(now + 0.1);
  };
  M.click = function () {
    if (!sfxOk()) return; const now = ctx.currentTime;
    [0, 0.06].forEach((d, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle';
      o.frequency.value = i ? 1320 : 880;
      g.gain.setValueAtTime(0.12, now + d); g.gain.exponentialRampToValueAtTime(0.0001, now + d + 0.25);
      o.connect(g); g.connect(sfxBus); g.connect(reverb); o.start(now + d); o.stop(now + d + 0.3);
    });
  };
  M.whoosh = function (up = true) {
    if (!sfxOk()) return; const now = ctx.currentTime;
    if (!noiseBuf) noise(now, 0.01, 100, 0.0001);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(up ? 300 : 3000, now);
    f.frequency.exponentialRampToValueAtTime(up ? 3200 : 260, now + 0.6);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.28, now + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    s.connect(f); f.connect(g); g.connect(sfxBus); g.connect(reverb); s.start(now); s.stop(now + 0.8);
  };
  M.chime = function () {
    if (!sfxOk()) return; const now = ctx.currentTime;
    [76, 79, 83, 88].forEach((n, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = hz(n);
      g.gain.setValueAtTime(0, now + i * 0.07); g.gain.linearRampToValueAtTime(0.07, now + i * 0.07 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 1.4);
      o.connect(g); g.connect(sfxBus); g.connect(reverb); o.start(now + i * 0.07); o.stop(now + i * 0.07 + 1.5);
    });
  };

  /* farm gate: wooden door creak + a latch, and birdsong */
  M.creak = function () {
    if (!ctx) return; if (ctx.state !== 'running') ctx.resume();
    const now = ctx.currentTime + 0.05;
    if (!noiseBuf) noise(now, 0.01, 100, 0.0001);
    const latch = ctx.createBufferSource(); latch.buffer = noiseBuf;
    const lf = ctx.createBiquadFilter(); lf.type = 'bandpass'; lf.frequency.value = 2400; lf.Q.value = 3;
    const lg = ctx.createGain(); lg.gain.setValueAtTime(0.5, now); lg.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    latch.connect(lf); lf.connect(lg); lg.connect(sfxBus); latch.start(now); latch.stop(now + 0.1);
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 23; lfoG.gain.value = 18;
    lfo.connect(lfoG); lfoG.connect(o.frequency);
    o.frequency.setValueAtTime(95, now + 0.15); o.frequency.linearRampToValueAtTime(150, now + 0.8); o.frequency.linearRampToValueAtTime(110, now + 1.5);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 950; f.Q.value = 7;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, now + 0.15); g.gain.linearRampToValueAtTime(0.09, now + 0.4);
    g.gain.linearRampToValueAtTime(0.05, now + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, now + 1.7);
    o.connect(f); f.connect(g); g.connect(sfxBus); g.connect(reverb);
    o.start(now + 0.15); lfo.start(now + 0.15); o.stop(now + 1.8); lfo.stop(now + 1.8);
  };
  M.birds = function () {
    if (!sfxOk()) return; const now = ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 3), base = 2600 + Math.random() * 1400;
    for (let i = 0; i < n; i++) {
      const t = now + i * (0.11 + Math.random() * 0.06);
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * 1.45, t + 0.04); o.frequency.exponentialRampToValueAtTime(base * 0.85, t + 0.09);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(g); g.connect(sfxBus); g.connect(reverb); o.start(t); o.stop(t + 0.12);
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (M.on) ctx.resume();
  });
  window.Music = M;
})();
