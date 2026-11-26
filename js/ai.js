// Stuffed & Furious: CPU opponent (AI agent). Defines top-level `const CPU`.
// Reads game.js globals at call time: proj, phase, frame, pl, sel, FOODS, W, G.
'use strict';
const CPU = (() => {
  const PGRAV = 0.3;       // fighter gravity (matches upP)
  const MAXSIM = 60;       // max simulation steps per check

  // Per-level tuning
  const LV = [
    { // EASY
      react: 25, reactJit: 8, success: 0.4, w: { block: 0.15, jump: 0.5, move: 0.35 }, minStam: 6,
      lead: 0, aimErr: 34, fireP: 0.035, wildP: 0.008, cycleEvery: 90, cycleSkill: 0.35,
      prefJit: 45, superGoodP: 0.004, superWasteP: 0.006, punish: false, hopP: 0.002, wallSmart: 0.3
    },
    { // NORMAL
      react: 12, reactJit: 5, success: 0.72, w: { block: 0.4, jump: 0.35, move: 0.25 }, minStam: 22,
      lead: 0.5, aimErr: 12, fireP: 0.22, wildP: 0.002, cycleEvery: 45, cycleSkill: 0.75,
      prefJit: 22, superGoodP: 0.06, superWasteP: 0.0005, punish: false, hopP: 0.004, wallSmart: 0.7
    },
    { // HARD
      react: 4, reactJit: 2, success: 0.93, w: { block: 0.3, jump: 0.33, move: 0.37 }, minStam: 30,
      lead: 1, aimErr: 3, fireP: 0.65, wildP: 0, cycleEvery: 22, cycleSkill: 0.95,
      prefJit: 12, superGoodP: 0.5, superWasteP: 0, punish: true, hopP: 0.006, wallSmart: 1
    }
  ];

  // ---------- per-round memory ----------
  let mems = {}, mem;          // memory per fighter index (safe even if both sides are CPU)
  function freshMem() {
    return {
      prev: { jumpP: false, cycleP: false, super: false },
      threats: new Map(),       // projectile -> {t0, delay, roll, choice, dir}
      wantSlot: -1, nextCycle: 0, lastCycle: -99,
      aimOff: 0, aimT: 0,
      prefOff: 0, prefT: 0,
      superWait: 0,
      crossing: 0,
      lastFrame: -1
    };
  }
  mem = freshMem();

  // ---------- helpers ----------
  const R = Math.random;
  const sgn = v => (v > 0 ? 1 : v < 0 ? -1 : 0);
  const curFood = p => {
    try { const k = sel.picks[p.i][p.sel]; return FOODS[k] || null; } catch (e) { return null; }
  };
  const slotFood = (p, s) => {
    try { const k = sel.picks[p.i][s]; return FOODS[k] || null; } catch (e) { return null; }
  };
  const lv = () => LV[Math.max(0, Math.min(2, CPU.level | 0))];
  const spdOf = p => (p.c ? p.c.spd : 1.6) * (p.slow > 0 ? 0.5 : 1);

  // Range profile per food: which horizontal distances a standing throw hits a standing foe. Cached.
  const profCache = new Map();
  function profile(f) {
    let pr = profCache.get(f);
    if (pr) return pr;
    const gnd = G, hit = [];
    const n = f.sp === 'spread' ? 3 : 1;
    for (let d = 20; d <= 300; d += 5) {
      let ok = false;
      for (let j = 0; j < n && !ok; j++) {
        let x = 16, y = gnd - 28, vx = f.spd, vy = f.vy + (n > 1 ? (j - 1) * 0.75 : 0);
        for (let k = 0; k < 90; k++) {
          vy += f.grav; x += vx; y += vy;
          if (Math.abs(x - d) < 14 && y > gnd - 40 && y < gnd + 2) { ok = true; break; }
          if (y >= gnd - 1) { if (f.sp === 'splash' && Math.abs(d - x) < 30) ok = true; break; }
        }
      }
      hit.push(ok);
    }
    // contiguous bands
    const bands = [];
    let s = -1;
    for (let i = 0; i <= hit.length; i++) {
      if (i < hit.length && hit[i]) { if (s < 0) s = i; }
      else if (s >= 0) { bands.push([20 + s * 5, 20 + (i - 1) * 5]); s = -1; }
    }
    const far = bands.length ? bands[bands.length - 1] : [60, 120];
    let pref;
    if (far[0] < 60) { // straight shooter, no dead zone
      pref = Math.max(110, Math.min(190, far[1] * 0.62));
      if (f.sp === 'spread') pref *= 0.7;     // corn: mid-range so the spread connects
    } else {
      pref = far[0] + (far[1] - far[0]) * 0.4;  // lobs: sit inside the falling arc
    }
    pr = { hit, bands, pref, max: far[1] };
    profCache.set(f, pr);
    return pr;
  }
  const hitsAt = (f, d) => {
    const pr = profile(f), i = Math.round((d - 20) / 5);
    return i < 0 ? true : i >= pr.hit.length ? false : pr.hit[i];
  };

  // Simulate a projectile against a fighter following `mode`
  // mode: 0 stay, 1 jump, 2 walk in direction `dir`
  // returns frames until impact, or -1 if it misses.
  function simThreat(q, p, mode, dir) {
    let qx = q.x, qy = q.y, qvx = q.vx, qvy = q.vy;
    const gr = q.f ? q.f.grav : 0.1, splash = q.f && q.f.sp === 'splash';
    let px = p.x, py = p.y, pvx = p.vx || 0, pvy = p.vy || 0, gnd = !!p.ground;
    const sp = spdOf(p), jv = p.c ? p.c.jump : 5;
    for (let k = 1; k <= MAXSIM; k++) {
      // fighter step (upP runs before upProj)
      const tv = mode === 2 ? dir * sp : 0;
      pvx += (tv - pvx) * (gnd ? 0.35 : 0.12);
      if (mode === 1 && k === 1 && gnd) { pvy = -jv; gnd = false; }
      pvy += PGRAV; px += pvx; py += pvy;
      if (py >= G) { py = G; pvy = 0; gnd = true; }
      px = Math.max(14, Math.min(W - 14, px));
      // projectile step
      qvy += gr; qx += qvx; qy += qvy;
      if (Math.abs(qx - px) < 14 && qy > py - 40 && qy < py + 2) return k;
      if (qy >= G - 1) return (splash && Math.abs(px - qx) < 30 && py > G - 10) ? k : -1;
      if (qx < -20 || qx > W + 20) return -1;
    }
    return -1;
  }

  // Would a throw of food f right now hit the opponent (predicting their motion with `lead`)?
  function simShot(p, o, f, lead, aimOff) {
    const n = f.sp === 'spread' ? 3 : 1, face = o.x > p.x ? 1 : -1;
    for (let j = 0; j < n; j++) {
      let qx = p.x + face * 16, qy = p.y - 28, qvx = face * f.spd + (p.vx || 0) * 0.3;
      let qvy = f.vy + (n > 1 ? (j - 1) * 0.75 : 0);
      let ox = o.x + aimOff, oy = o.y, ovy = o.vy || 0, ognd = !!o.ground;
      const ovx = (o.vx || 0) * lead;
      for (let k = 1; k <= MAXSIM; k++) {
        ox += ovx;
        if (lead > 0 && !ognd) { ovy += PGRAV; oy += ovy; if (oy >= G) { oy = G; ognd = true; } }
        ox = Math.max(14, Math.min(W - 14, ox));
        qvy += f.grav; qx += qvx; qy += qvy;
        if (Math.abs(qx - ox) < 14 && qy > oy - 40 && qy < oy + 2) return k;
        if (qy >= G - 1) { if (f.sp === 'splash' && Math.abs(ox - qx) < 30 && oy > G - 10) return k; break; }
        if (qx < -20 || qx > W + 20) break;
      }
    }
    return -1;
  }

  function pickWeighted(opts, w) {
    let tot = 0;
    for (const o of opts) tot += w[o.kind] * (o.bias || 1);
    let r = R() * tot;
    for (const o of opts) { r -= w[o.kind] * (o.bias || 1); if (r <= 0) return o; }
    return opts[opts.length - 1];
  }

  // ---------- threat handling ----------
  function handleThreats(p, o, L, a) {
    const T = mem.threats;
    // prune dead projectiles
    for (const q of T.keys()) if (proj.indexOf(q) < 0) T.delete(q);
    let best = null, bestK = 1e9, checked = 0;
    for (let i = 0; i < proj.length && checked < 6; i++) {
      const q = proj[i];
      if (!q || q.dead || q.o === p.i) continue;
      if (Math.abs(q.x - p.x) > 200) continue;
      checked++;
      const k = simThreat(q, p, 0, 0);
      if (k > 0 && k < bestK) { bestK = k; best = q; }
    }
    if (!best) return false;
    let m = T.get(best);
    if (!m) {
      m = { t0: frame, delay: Math.max(0, L.react + Math.round((R() * 2 - 1) * L.reactJit)), roll: R(), choice: null, dir: 0 };
      T.set(best, m);
    }
    if (frame - m.t0 < m.delay) return false;          // still "noticing"
    if (m.roll > L.success) {                            // flubbed reaction
      if (m.choice === null) m.choice = (R() < 0.3 && bestK < 8) ? 'panic' : 'none';
      if (m.choice === 'panic' && p.ground) { a.jumpP = true; m.choice = 'none'; }
      return false;
    }
    if (m.choice === null) {
      const opts = [];
      const qdir = sgn(best.vx);
      const canBlock = p.ground && p.stam > L.minStam && qdir === -p.face && bestK > 1;
      if (canBlock) opts.push({ kind: 'block', bias: p.stam > 60 ? 1.2 : 0.6 });
      if (p.ground && simThreat(best, p, 1, 0) < 0) opts.push({ kind: 'jump' });
      const away = qdir || -p.face;
      if (simThreat(best, p, 2, away) < 0) opts.push({ kind: 'move', dir: away });
      if (simThreat(best, p, 2, -away) < 0) opts.push({ kind: 'move', dir: -away, bias: L.punish ? 1.3 : 0.7 });
      if (opts.length) {
        const c = pickWeighted(opts, L.w);
        m.choice = c.kind; m.dir = c.dir || 0;
      } else m.choice = canBlock ? 'block' : (p.ground ? 'jump' : 'none');
    }
    if (m.choice === 'block') {
      if (p.ground && p.stam > 4) { a.block = true; return true; }
      m.choice = 'none';
    } else if (m.choice === 'jump') {
      if (p.ground) a.jumpP = true;
      m.choice = 'air';
      return true;
    } else if (m.choice === 'air') {
      return true;                                        // let the jump play out
    } else if (m.choice === 'move') {
      a[m.dir > 0 ? 'right' : 'left'] = true;
      return true;
    }
    return false;
  }

  // ---------- food choice ----------
  function scoreFood(f, p, o, dist) {
    if (!f) return -1e9;
    const pow = p.c ? p.c.pow : 1;
    let s = (f.dmg * (f.sp === 'spread' ? 2 : 1) * pow) / Math.max(10, f.cd) * 10;
    if (hitsAt(f, dist)) s += 4; else s -= 3;
    s -= Math.abs(dist - profile(f).pref) / 40;
    const hpF = p.hp / p.max, oNearWall = o.x < 60 || o.x > W - 60;
    switch (f.sp) {
      case 'steal': if (hpF < 0.5) s += 5 * (1 - hpF) + 2; break;
      case 'stun': if (o.stun > 0) s += 6; if (dist < 90) s += 3; break;
      case 'knock': if (oNearWall) s += 4; break;
      case 'sticky': if (dist > 160) s += 3; if (o.slow > 0) s -= 2; break;
      case 'burn': if (o.burn > 0) s -= 3; else s += 1; break;
      case 'splash': if (dist >= 100 && dist <= 160) s += 2; break;
      case 'spread': if (dist >= 60 && dist <= 140) s += 2; if (!o.ground) s += 1.5; break;
    }
    return s;
  }
  function chooseSlot(p, o, L, dist) {
    if (frame >= mem.nextCycle) {
      mem.nextCycle = frame + L.cycleEvery + Math.floor(R() * L.cycleEvery * 0.5);
      if (R() < L.cycleSkill) {
        let bi = p.sel, bs = -1e9;
        for (let s = 0; s < 3; s++) {
          const v = scoreFood(slotFood(p, s), p, o, dist) + (s === p.sel ? 1 : 0) + R() * 0.8;
          if (v > bs) { bs = v; bi = s; }
        }
        mem.wantSlot = bi;
      } else if (R() < 0.3) mem.wantSlot = Math.floor(R() * 3);  // whimsical swap
    }
    return mem.wantSlot >= 0 && mem.wantSlot !== p.sel && frame - mem.lastCycle > 3;
  }

  // ---------- super ----------
  function wantSuper(p, o, L, dist) {
    if (typeof p.meter !== 'number' || p.meter < 100) return false;
    const good = o.stun > 0 || (o.cd > 12 && dist < 170) || (o.x < 50 || o.x > W - 50) || o.hp / o.max < 0.25 || (!o.ground && dist < 140);
    if (good) return R() < L.superGoodP;
    if (R() < L.superWasteP) return true;                       // EASY: sometimes blows it
    mem.superWait++;
    return L.punish ? mem.superWait > 600 && R() < 0.02 : mem.superWait > 400 && R() < 0.01;
  }

  // ---------- main ----------
  function act(p, o) {
    const a = {};
    try {
      if (p) mem = mems[p.i] || (mems[p.i] = freshMem());
      if (typeof phase === 'undefined' || phase !== 'play' || !p || !o || typeof proj === 'undefined') { mem.prev = { jumpP: false, cycleP: false, super: false }; return {}; }
      if (frame < mem.lastFrame) mem = freshMem();    // frame counter went backwards: new session
      mem.lastFrame = frame;
      const L = lv();
      const dx = o.x - p.x, dist = Math.abs(dx), toO = sgn(dx) || p.face;
      const f = curFood(p);

      // 1) threats
      const busy = handleThreats(p, o, L, a);

      // 2) super
      if (!a.block && wantSuper(p, o, L, dist)) { a.super = true; mem.superWait = 0; }

      if (!busy) {
        // 3) spacing
        if (frame >= mem.prefT) {
          mem.prefT = frame + 50 + Math.floor(R() * 70);
          mem.prefOff = (R() * 2 - 1) * L.prefJit;
        }
        let pref = (f ? profile(f).pref : 120) + mem.prefOff;
        if (L.punish && o.cd > 15) pref = f ? Math.min(pref, profile(f).pref) : pref;   // press in during their reload
        else if (p.cd > 20 && o.cd <= 0) pref += 25;                                      // back off while we reload
        if (o.stun > 0 && f && f.sp === 'stun') pref = Math.min(pref, 40);              // close in on a dazed foe
        pref = Math.max(30, Math.min(220, pref));

        // target x on our current side; if that is off-stage, cross over to the other side
        let side = -toO;                       // which side of the opponent we stand on
        let tx = o.x + side * pref;
        const lo = 26, hi = W - 26;
        const cornered = (p.x < 40 && side < 0) || (p.x > W - 40 && side > 0);
        if ((tx < lo || tx > hi) && cornered && mem.crossing <= 0 && R() < L.wallSmart * 0.06) mem.crossing = 70;
        if (mem.crossing > 0) {
          mem.crossing--;
          side = -side; tx = o.x + side * pref;
          if (p.ground && dist < 46 && dist > 8) a.jumpP = true;    // hop over the opponent
          else if (!p.ground && p.jumps < ((p.c && p.c.jumps) || 1) && p.vy > 0 && dist < 30) a.jumpP = true;
          if ((p.x - o.x) * side > 40) mem.crossing = 0;            // made it to the open side
        }
        tx = Math.max(lo, Math.min(hi, tx));
        const ex = tx - p.x;
        if (Math.abs(ex) > 10) a[ex > 0 ? 'right' : 'left'] = true;

        // random hops for flavour / HARD mixups
        if (p.ground && R() < L.hopP) a.jumpP = true;
        if (L.punish && p.ground && o.cd > 20 && dist < 150 && R() < 0.01) a.jumpP = true; // aerial angle

        // 4) food choice
        if (chooseSlot(p, o, L, dist) && !a.jumpP) { a.cycleP = true; mem.lastCycle = frame; }
      }

      // 5) throwing (can throw out of a dodge too, but never while blocking)
      if (!a.block && f && p.cd <= 0 && p.stun <= 0) {
        if (frame >= mem.aimT) { mem.aimT = frame + 20 + Math.floor(R() * 30); mem.aimOff = (R() * 2 - 1) * L.aimErr; }
        const k = simShot(p, o, f, L.lead, mem.aimOff);
        let fire = false;
        if (k > 0) {
          let pr = L.fireP;
          if (L.punish && o.cd > 10) pr = Math.min(1, pr * 1.4);
          if (o.stun > 0) pr = Math.min(1, pr * 1.5);
          if (o.block && f.sp !== 'splash') pr *= 0.4;              // don't feed a block
          fire = R() < pr;
        } else fire = R() < L.wildP;
        if (fire) a.throw = true;
      }
    } catch (e) {
      // never crash the game loop
    }
    // one-frame presses: never true two frames running
    for (const key of ['jumpP', 'cycleP', 'super']) {
      if (a[key] && mem.prev[key]) a[key] = false;
      mem.prev[key] = !!a[key];
    }
    if (a.left && a.right) a.right = false;
    return a;
  }

  return {
    levels: ['EASY', 'NORMAL', 'HARD'],
    level: 1,
    reset() { mems = {}; mem = freshMem(); },
    act
  };
})();
