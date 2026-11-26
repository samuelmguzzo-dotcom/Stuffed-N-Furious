// audio.js — "Stuffed & Furious" chiptune engine (MUSIC agent)
// Self-contained WebAudio synth: 2 pulse leads, triangle bass, noise drums.
// All melodies are original compositions.
//
// Public API (see CONTRACT.md):
//   Music.unlock()  Music.play(name)  Music.stop()  Music.sting(name)
//   Music.toggleMute() -> bool   Music.muted   Music.duck(on)

const Music = (function () {
  'use strict';

  // ---------------------------------------------------------------- songs
  // Channel strings: tokens separated by spaces; '|' marks bars (ignored).
  //   C5, F#4, Bb3      note (1 step)        C5:3   note lasting 3 steps
  //   .                 rest (1 step)        .:2    rest lasting 2 steps
  // Drum strings: one char per step: k kick, s snare, h hat, o open hat,
  //   x kick+hat, '.' rest. Spaces and '|' ignored.
  // A step is an eighth note. `bar` = steps per bar.

  const TRACKS = {
    // Bouncy, heroic, silly. C major, 140 bpm.
    title: {
      bpm: 140, bar: 8,
      loop: {
        lead1: 'C5:2 G4 C5 E5:2 G5:2 | F5 E5 D5 C5 D5:2 G4:2 | A4:2 C5 F5 A5:2 G5 F5 | E5 F5 G5 E5 C5:4 |' +
               'C5:2 G4 C5 E5:2 G5:2 | A5 G5 F5 E5 F5:2 A5:2 | G5 F5 E5 D5 C5 D5 E5 G5 | C6:3 G5 C5:4',
        lead2: 'E4:2 . E4 G4:2 C5:2 | A4 G4 F4 E4 F4:2 D4:2 | F4:2 A4 C5 F5:2 E5 D5 | C5 D5 E5 C5 G4:4 |' +
               'E4:2 . E4 G4:2 C5:2 | F5 E5 D5 C5 D5:2 F5:2 | E5 D5 C5 B4 A4 B4 C5 D5 | E5:3 D5 E4:4',
        bass:  'C3 C4 G2 G3 C3 C4 G2 G3 | F2 F3 C3 C4 G2 G3 B2 G2 | F2 F3 C3 F3 F2 F3 C3 A2 | C3 C4 G2 G3 C3 E3 G3 C3 |' +
               'C3 C4 G2 G3 C3 C4 G2 G3 | F2 F3 A2 C3 D3 D4 F3 D3 | G2 G3 G2 G3 G2 G3 B2 D3 | C3 C4 G2 G3 C3:4',
        drums: 'khshkhsh|khshkhsh|khshkhsh|khshssss|khshkhsh|khshkhsh|khshkhsh|kkssksss'
      }
    },

    // Light and loopy. F major, 120 bpm.
    select: {
      bpm: 120, bar: 8,
      loop: {
        lead1: 'F5 . A5 . C6 . A5 . | G5 . Bb5 . D6:2 C6:2 | A5 . F5 . C5:2 F5:2 | E5 F5 G5 A5 G5:4 |' +
               'F5 . A5 . C6 . A5 . | Bb5 A5 G5 F5 G5:2 D5:2 | C5 E5 G5 Bb5 A5 G5 F5 E5 | F5:6 . .',
        lead2: '. A4 . A4 . C5 . A4 | . Bb4 . Bb4 . D5 . Bb4 | . A4 . A4 . F4 . A4 | . G4 . G4 . C5 . Bb4 |' +
               '. A4 . A4 . C5 . A4 | . D5 . D5 . Bb4 . Bb4 | . C5 . C5 . E5 . C5 | . A4 . F4 A4:4',
        bass:  'F3:2 C3:2 F3:2 C3:2 | Bb2:2 F3:2 Bb2:2 D3:2 | F3:2 C3:2 A2:2 C3:2 | C3:2 G2:2 C3:2 E3:2 |' +
               'F3:2 C3:2 F3:2 C3:2 | Bb2:2 D3:2 G2:2 Bb2:2 | C3:2 G2:2 C3:2 E3:2 | F3:4 C3:2 F2:2',
        drums: 'k.h.s.h.|k.h.s.h.|k.h.s.h.|k.h.s.hh|k.h.s.h.|k.h.s.h.|k.h.s.h.|k.h.s.ss'
      },
      gate2: 0.5
    },

    // Upbeat hoedown, banjo-roll second voice. G major, 150 bpm.
    farm: {
      bpm: 150, bar: 8,
      loop: {
        lead1: 'G5 D5 B4 D5 G5 A5 B5 G5 | A5 G5 E5 D5 E5:2 D5:2 | G5 D5 B4 D5 G5 A5 B5 D6 | C6 B5 A5 F#5 G5:2 . . |' +
               'B5 B5 A5 G5 A5:2 B5 A5 | G5 E5 D5 E5 G5:2 E5:2 | D5 G5 B5 G5 A5 F#5 D5 F#5 | G5:2 D5 B4 G4:2 . .',
        lead2: 'G4 B4 D5 G4 B4 D5 G4 B4 | C5 E5 G4 C5 B4 D5 G4 B4 | G4 B4 D5 G4 B4 D5 G4 B4 | A4 C5 D5 A4 B4 D5 G4 B4 |' +
               'G4 B4 D5 G4 C5 E5 G4 C5 | C5 E5 G4 C5 G4 B4 D5 G4 | D5 F#4 A4 D5 F#4 A4 C5 A4 | B4 D5 G4 B4 G4:2 . .',
        bass:  'G2:2 D3:2 G2:2 D3:2 | C3:2 G2:2 G2:2 D3:2 | G2:2 D3:2 G2:2 D3:2 | D3:2 A2:2 G2:2 B2:2 |' +
               'G2:2 D3:2 C3:2 G2:2 | C3:2 G2:2 G2:2 D3:2 | D3:2 A2:2 D3:2 F#2:2 | G2:2 D3:2 G2:4',
        drums: 'khshkhsh|khshkhsh|khshkhsh|khshkkss|khshkhsh|khshkhsh|khshkhsh|khsskkss'
      },
      gate2: 0.45
    },

    // Sneaky jazzy waltz in Grandma's dining room. A minor, 3/4, 112 bpm.
    table: {
      bpm: 112, bar: 6,
      loop: {
        lead1: 'A4:2 C5 E5 D#5 E5 | C5:2 A4:2 . . | B4:2 D5 F5 E5 F5 | D5:2 B4:2 G#4:2 |' +
               'A4 C5 E5 A5 G#5 G5 | F#5 F5 E5 D#5 E5:2 | D5 F5 B4 D5 G#4 B4 | A4:4 . .',
        lead2: '. . C5 . C5 . | . . E5 . C5 . | . . D5 . F5 . | . . E5 . D5 . |' +
               '. . C5 . E5 . | . . C5 . B4 . | . . D5 . F5 . | . . C5 . A4 .',
        bass:  'A2:2 E3:2 C3:2 | A2:2 E3:2 A2:2 | D3:2 A2:2 F3:2 | E3:2 B2:2 G#2:2 |' +
               'A2:2 C3:2 E3:2 | F3:2 E3:2 D#3:2 | E3:2 D3:2 B2:2 | A2:4 E2:2',
        drums: 'k.h.h.|k.h.h.|k.h.h.|k.h.hh|k.h.h.|k.h.h.|k.h.h.|k.s.ss'
      },
      gate1: 0.7, gate2: 0.4
    },

    // Brassy marching band. Bb major, 120 bpm.
    parade: {
      bpm: 120, bar: 8,
      loop: {
        lead1: 'Bb4:3 F4 Bb4:2 D5:2 | F5:3 D5 Bb4:4 | C5:3 D5 Eb5:2 C5:2 | D5:3 C5 Bb4:2 F4:2 |' +
               'Bb4:3 F4 Bb4:2 D5:2 | F5:3 G5 F5:2 D5:2 | Eb5 Eb5 G5 Eb5 D5 D5 F5 D5 | C5:2 F5:2 Bb4:4',
        lead2: 'D4:3 D4 D4:2 F4:2 | Bb4:3 F4 D4:4 | Eb4:3 F4 G4:2 Eb4:2 | F4:3 Eb4 D4:2 C4:2 |' +
               'D4:3 D4 D4:2 F4:2 | Bb4:3 Bb4 A4:2 F4:2 | G4 G4 Bb4 G4 F4 F4 Bb4 F4 | Eb4:2 A4:2 D4:4',
        bass:  'Bb2:2 F2:2 Bb2:2 F2:2 | Bb2:2 F2:2 Bb2:2 D3:2 | Eb3:2 Bb2:2 Eb3:2 C3:2 | Bb2:2 F2:2 Bb2:2 F2:2 |' +
               'Bb2:2 F2:2 Bb2:2 F2:2 | D3:2 A2:2 Bb2:2 D3:2 | Eb3:2 C3:2 F3:2 D3:2 | F2:2 F3:2 Bb2:4',
        drums: 'kssskss.|kssskss.|kssskss.|ksskksss|kssskss.|kssskss.|kssskss.|ksskksss'
      },
      inst1: 'brass', inst2: 'pulse25'
    },

    // Short fanfare intro, then a gentle loop. C major, 132 bpm.
    victory: {
      bpm: 132, bar: 8,
      intro: {
        lead1: 'G4 C5 E5 G5:2 E5 G5:2 | C6:6 . .',
        lead2: 'E4 G4 C5 E5:2 C5 E5:2 | G5:6 . .',
        bass:  'C3:2 G2:2 C3:2 G2:2 | C3:6 . .',
        drums: 'kshskshs|kkkksss.'
      },
      loop: {
        lead1: 'E5:2 G5:2 C6:4 | B5:2 A5:2 G5:4 | F5:2 A5:2 D6:3 C6 | B5:4 G5:4 |' +
               'E5:2 G5:2 C6:3 D6 | E6:2 D6:2 C6:2 A5:2 | G5:2 F5:2 E5:2 D5:2 | C5:8',
        lead2: 'C5:4 E5:4 | D5:4 B4:4 | A4:4 F5:4 | D5:4 B4:4 |' +
               'C5:4 E5:4 | C5:4 F5:4 | B4:4 G4:4 | E4:8',
        bass:  'C3:4 G2:4 | G2:4 D3:4 | F2:4 A2:4 | G2:4 B2:4 |' +
               'C3:4 E3:4 | A2:4 F2:4 | G2:4 G2:4 | C3:8',
        drums: 'k...h...|k...h...|k...h...|k...h.h.|k...h...|k...h...|k...h...|k.......'
      },
      vol2: 0.22
    }
  };

  // One-shot stings, layered over music.
  const STINGS = {
    round: { bpm: 180, ch: {
      lead1: 'C5 E5 G5 C6:3',
      lead2: 'G4 C5 E5 G5:3',
      bass:  'C3 . G2 C3:3',
      drums: 'sss k..' } },
    fight: { bpm: 200, ch: {
      lead1: 'G5 G5 . C6:4',
      lead2: 'D5 D5 . E5:4',
      bass:  'G2 G2 . C3:4',
      drums: 'ss.x...' } },
    // Descending sad-trombone "wah wah wah waaah".
    ko: { bpm: 96, inst1: 'bone', ch: {
      lead1: 'G3:2 F#3:2 F3:2 E3:7',
      bass:  'G2:2 F#2:2 F2:2 E2:7' }, bend: true },
    // Rising sparkle arpeggio.
    super: { bpm: 260, inst1: 'pulse12', inst2: 'pulse25', ch: {
      lead1: 'C5 E5 G5 C6 E6 G6 C7:4',
      lead2: '. G5 C6 E6 G6 C7 E7:4',
      drums: 'hhhhhho...' } }
  };

  // --------------------------------------------------------------- parser
  const NOTE_IX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function noteToMidi(tok) {
    const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(tok);
    if (!m) return null;
    let n = NOTE_IX[m[1].toUpperCase()];
    if (m[2] === '#') n++;
    else if (m[2] === 'b') n--;
    return (parseInt(m[3], 10) + 1) * 12 + n;
  }

  // -> { events: [{step, len, midi}], length }
  function parseChannel(str) {
    const events = [];
    let step = 0;
    const toks = String(str || '').replace(/\|/g, ' ').trim().split(/\s+/);
    for (const raw of toks) {
      if (!raw) continue;
      const parts = raw.split(':');
      const len = parts[1] ? Math.max(1, parseInt(parts[1], 10) || 1) : 1;
      if (parts[0] !== '.') {
        const midi = noteToMidi(parts[0]);
        if (midi != null) events.push({ step, len, midi });
      }
      step += len;
    }
    return { events, length: step };
  }

  function parseDrums(str) {
    const events = [];
    const chars = String(str || '').replace(/[\s|]/g, '');
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (c === 'k' || c === 's' || c === 'h' || c === 'o') events.push({ step: i, kind: c });
      else if (c === 'x') { events.push({ step: i, kind: 'k' }); events.push({ step: i, kind: 'h' }); }
    }
    return { events, length: chars.length };
  }

  // Build per-step lookup tables for a section {lead1, lead2, bass, drums}.
  function compileSection(sec) {
    const out = { length: 0, steps: [] };
    if (!sec) return out;
    const chans = {};
    for (const k of ['lead1', 'lead2', 'bass']) if (sec[k]) chans[k] = parseChannel(sec[k]);
    if (sec.drums) chans.drums = parseDrums(sec.drums);
    for (const k in chans) out.length = Math.max(out.length, chans[k].length);
    for (let i = 0; i < out.length; i++) out.steps.push([]);
    for (const k in chans) {
      for (const ev of chans[k].events) {
        if (ev.step < out.length) out.steps[ev.step].push(Object.assign({ ch: k }, ev));
      }
    }
    out.chans = chans;
    return out;
  }

  const COMPILED = {};
  for (const name in TRACKS) {
    try {
      const t = TRACKS[name];
      COMPILED[name] = { def: t, intro: compileSection(t.intro), loop: compileSection(t.loop) };
    } catch (e) { /* never throw at load */ }
  }
  const COMPILED_STINGS = {};
  for (const name in STINGS) {
    try { COMPILED_STINGS[name] = { def: STINGS[name], sec: compileSection(STINGS[name].ch) }; } catch (e) {}
  }

  // ---------------------------------------------------------------- state
  const MUSIC_VOL = 0.12, STING_VOL = 0.13, DUCK_LEVEL = 0.3;
  const LOOKAHEAD = 0.1, TICK_MS = 25;

  let ctx = null, master = null, musicGain = null, stingGain = null;
  let noiseBuf = null, waves = {};
  let unlocked = false, muted = false, ducked = false;
  let wanted = null;        // track name requested (may be pending unlock)
  let cur = null;           // {name, comp, bus, pos, nextTime, stepDur}
  let timer = null;

  try {
    if (typeof localStorage !== 'undefined') muted = localStorage.getItem('sf-muted') === '1';
  } catch (e) { muted = false; }

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function masterLevel() { return muted ? 0 : (ducked ? DUCK_LEVEL : 1); }

  function applyMaster() {
    if (!ctx || !master) return;
    const t = ctx.currentTime, g = master.gain;
    try {
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(masterLevel(), t + 0.08);
    } catch (e) { g.value = masterLevel(); }
  }

  function pulseWave(duty) {
    const N = 32;
    const real = new Float32Array(N), imag = new Float32Array(N);
    for (let n = 1; n < N; n++) real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    return ctx.createPeriodicWave(real, imag);
  }

  function brassWave() { // bright saw-ish with softened highs
    const N = 24;
    const real = new Float32Array(N), imag = new Float32Array(N);
    for (let n = 1; n < N; n++) imag[n] = (1 / n) * (n < 8 ? 1 : 0.5);
    return ctx.createPeriodicWave(real, imag);
  }

  function initCtx() {
    if (ctx) return true;
    const AC = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) ||
               (typeof AudioContext !== 'undefined' ? AudioContext : null);
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = masterLevel();
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = MUSIC_VOL;
    musicGain.connect(master);
    stingGain = ctx.createGain();
    stingGain.gain.value = STING_VOL;
    stingGain.connect(master);

    const len = Math.floor(ctx.sampleRate * 0.5) || 22050;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate || 44100);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    try {
      waves.pulse25 = pulseWave(0.25);
      waves.pulse12 = pulseWave(0.125);
      waves.pulse50 = pulseWave(0.5);
      waves.brass = brassWave();
    } catch (e) { waves = {}; }
    return true;
  }

  // ----------------------------------------------------------- instruments
  function setWave(osc, kind) {
    if (waves[kind] && osc.setPeriodicWave) osc.setPeriodicWave(waves[kind]);
    else osc.type = kind === 'brass' ? 'sawtooth' : 'square';
  }

  function cleanup(nodes) {
    return function () { for (const n of nodes) { try { n.disconnect(); } catch (e) {} } };
  }

  // Generic tone voice with ADSR-ish envelope.
  function tone(dest, kind, midi, t, dur, vol, opt) {
    opt = opt || {};
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const nodes = [osc, g];
    if (kind === 'triangle') osc.type = 'triangle';
    else setWave(osc, kind);
    const f = mtof(midi);
    osc.frequency.setValueAtTime(f, t);
    if (opt.detune) osc.detune.setValueAtTime(opt.detune, t);
    // gentle vibrato on long lead notes (via scheduled detune wiggle)
    if (opt.vib && dur > 0.35) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 5.5;
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(dur, 0.6));
      lfo.connect(lg); lg.connect(osc.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.1);
      nodes.push(lfo, lg);
    }
    let out = osc;
    if (opt.filter) {
      const bq = ctx.createBiquadFilter();
      bq.type = 'lowpass';
      bq.frequency.setValueAtTime(opt.filter, t);
      bq.Q.value = 1;
      osc.connect(bq); out = bq; nodes.push(bq);
    }
    out.connect(g);
    g.connect(dest);
    const a = 0.006, rel = opt.rel || 0.05;
    const sus = vol * (opt.sus != null ? opt.sus : 0.7);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.linearRampToValueAtTime(sus, t + a + Math.min(0.09, dur * 0.5));
    g.gain.setValueAtTime(sus, t + Math.max(dur, a + 0.01));
    g.gain.linearRampToValueAtTime(0, t + Math.max(dur, a + 0.01) + rel);
    osc.start(t);
    osc.stop(t + dur + rel + 0.02);
    osc.onended = cleanup(nodes);
    return osc;
  }

  // Wah-wah trombone voice for the KO sting.
  function bone(dest, midi, t, dur, vol, bendDown) {
    const osc = ctx.createOscillator(), bq = ctx.createBiquadFilter(), g = ctx.createGain();
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    setWave(osc, 'brass');
    const f = mtof(midi);
    osc.frequency.setValueAtTime(f * 1.03, t);
    osc.frequency.linearRampToValueAtTime(f, t + 0.06);
    if (bendDown) {
      osc.frequency.setValueAtTime(f, t + dur * 0.35);
      osc.frequency.linearRampToValueAtTime(f * 0.89, t + dur);
    }
    bq.type = 'lowpass'; bq.Q.value = 6;
    bq.frequency.setValueAtTime(500, t);
    bq.frequency.linearRampToValueAtTime(1800, t + Math.min(0.15, dur * 0.4));
    bq.frequency.linearRampToValueAtTime(600, t + dur);
    // wobble ("wah") on the filter, plus pitch vibrato on the long last note
    lfo.frequency.value = bendDown ? 6 : 3;
    lg.gain.value = bendDown ? 500 : 250;
    lfo.connect(lg); lg.connect(bq.frequency);
    osc.connect(bq); bq.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.05);
    osc.start(t); lfo.start(t);
    osc.stop(t + dur + 0.08); lfo.stop(t + dur + 0.08);
    osc.onended = cleanup([osc, bq, g, lfo, lg]);
  }

  function drum(dest, kind, t, vol) {
    vol = vol == null ? 1 : vol;
    if (kind === 'k') {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(0.9 * vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + 0.18);
      osc.onended = cleanup([osc, g]);
      return;
    }
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    let len;
    if (kind === 's') {
      f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
      len = 0.13; g.gain.setValueAtTime(0.5 * vol, t);
      // little tonal body for the snare
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(140, t + 0.06);
      og.gain.setValueAtTime(0.3 * vol, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      o.connect(og); og.connect(dest);
      o.start(t); o.stop(t + 0.08);
      o.onended = cleanup([o, og]);
    } else {
      f.type = 'highpass'; f.frequency.value = 7000;
      len = kind === 'o' ? 0.22 : 0.04;
      g.gain.setValueAtTime(0.22 * vol, t);
    }
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 0.3); src.stop(t + len + 0.02);
    src.onended = cleanup([src, f, g]);
  }

  // Play one compiled event on a destination bus.
  function playEvent(ev, t, stepDur, dest, def) {
    if (ev.ch === 'drums') { drum(dest, ev.kind, t, def.drumVol); return; }
    const dur = ev.len * stepDur;
    if (ev.ch === 'lead1') {
      const kind = def.inst1 || 'pulse25';
      if (kind === 'bone') { bone(dest, ev.midi, t, dur, 0.55, def.bend && ev === def._last); return; }
      tone(dest, kind, ev.midi, t, dur * (def.gate1 || 0.88), def.vol1 || 0.42,
        { vib: true, filter: kind === 'brass' ? 2600 : 0 });
    } else if (ev.ch === 'lead2') {
      tone(dest, def.inst2 || 'pulse12', ev.midi, t, dur * (def.gate2 || 0.85), def.vol2 || 0.26,
        { detune: 6, sus: 0.6 });
    } else if (ev.ch === 'bass') {
      tone(dest, 'triangle', ev.midi, t, dur * (def.gateB || 0.92), def.volB || 0.7, { sus: 0.85, rel: 0.03 });
    }
  }

  // ------------------------------------------------------------- scheduler
  function tick() {
    try {
      if (!ctx || !cur) return;
      const now = ctx.currentTime;
      // fell far behind (tab hidden / throttled): resync instead of bursting
      if (cur.nextTime < now - 0.2) cur.nextTime = now + 0.05;
      let guard = 0;
      while (cur.nextTime < now + LOOKAHEAD && guard++ < 64) {
        const c = cur.comp;
        let sec = c.loop, idx;
        if (c.intro.length && cur.pos < c.intro.length) { sec = c.intro; idx = cur.pos; }
        else idx = (cur.pos - c.intro.length) % (c.loop.length || 1);
        const evs = sec.steps[idx] || [];
        for (const ev of evs) {
          try { playEvent(ev, cur.nextTime, cur.stepDur, cur.bus, c.def); } catch (e) {}
        }
        cur.pos++;
        cur.nextTime += cur.stepDur;
      }
    } catch (e) {}
  }

  function ensureTimer() {
    if (timer == null && typeof setInterval !== 'undefined') timer = setInterval(tick, TICK_MS);
  }

  function fadeOutCurrent() {
    if (!cur || !ctx) { cur = null; return; }
    const bus = cur.bus, t = ctx.currentTime;
    try {
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.linearRampToValueAtTime(0, t + 0.15);
    } catch (e) {}
    setTimeout(function () { try { bus.disconnect(); } catch (e) {} }, 400);
    cur = null;
  }

  function startTrack(name) {
    const comp = COMPILED[name];
    if (!comp || !ctx) return;
    fadeOutCurrent();
    const bus = ctx.createGain();
    const t = ctx.currentTime;
    bus.gain.setValueAtTime(0, t);
    bus.gain.linearRampToValueAtTime(1, t + 0.08);
    bus.connect(musicGain);
    cur = { name, comp, bus, pos: 0, nextTime: t + 0.08, stepDur: 30 / comp.def.bpm };
    ensureTimer();
    tick();
  }

  // ------------------------------------------------------------- public API
  const api = {
    unlock() {
      try {
        if (!initCtx()) return;
        if (ctx.state === 'suspended' && ctx.resume) {
          const p = ctx.resume();
          if (p && p.catch) p.catch(function () {});
        }
        if (!unlocked) {
          unlocked = true;
          applyMaster();
          if (wanted && (!cur || cur.name !== wanted)) startTrack(wanted);
        }
      } catch (e) {}
    },

    play(name) {
      try {
        if (!COMPILED[name]) return;
        if (wanted === name && (cur && cur.name === name || !unlocked)) return;
        wanted = name;
        if (unlocked && ctx) startTrack(name);
      } catch (e) {}
    },

    stop() {
      try { wanted = null; fadeOutCurrent(); } catch (e) {}
    },

    sting(name) {
      try {
        const s = COMPILED_STINGS[name];
        if (!s || !ctx || !unlocked) return;
        const def = s.def, sec = s.sec;
        const stepDur = 30 / def.bpm;
        const t0 = ctx.currentTime + 0.02;
        // mark the final lead note for the KO pitch bend
        if (def.bend && sec.chans && sec.chans.lead1) {
          const evs = sec.chans.lead1.events;
          const lastStep = evs.length ? evs[evs.length - 1].step : -1;
          for (const ev of sec.steps[lastStep] || []) if (ev.ch === 'lead1') def._last = ev;
        }
        for (let i = 0; i < sec.length; i++) {
          for (const ev of sec.steps[i]) {
            try { playEvent(ev, t0 + i * stepDur, stepDur, stingGain, def); } catch (e) {}
          }
        }
        // dip the music under the sting
        const total = sec.length * stepDur;
        const g = musicGain.gain;
        g.cancelScheduledValues(t0);
        g.setValueAtTime(MUSIC_VOL, t0);
        g.linearRampToValueAtTime(MUSIC_VOL * 0.45, t0 + 0.05);
        g.setValueAtTime(MUSIC_VOL * 0.45, t0 + total);
        g.linearRampToValueAtTime(MUSIC_VOL, t0 + total + 0.3);
      } catch (e) {}
    },

    toggleMute() {
      try { setMuted(!muted); } catch (e) {}
      return muted;
    },

    duck(on) {
      try { ducked = !!on; applyMaster(); } catch (e) {}
    },

    get muted() { return muted; },
    set muted(v) { try { setMuted(!!v); } catch (e) {} }
  };

  function setMuted(v) {
    muted = !!v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('sf-muted', muted ? '1' : '0'); } catch (e) {}
    applyMaster();
  }

  return api;
})();
