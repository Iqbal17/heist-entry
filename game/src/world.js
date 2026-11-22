// VAULTBREAK — the world: geometry (sight lines and vision cones), the run and
// room state, and the per-frame simulation. No drawing and no sound here; the
// simulation reports what happened through run.events for main.js to voice.

// ---------- geometry ----------

function segSeg(x1, y1, x2, y2, x3, y3, x4, y4) {
  var d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (d === 0) return false;
  var t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  var u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function segHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  return segSeg(x1, y1, x2, y2, r.x, r.y, r.x + r.w, r.y) ||
         segSeg(x1, y1, x2, y2, r.x + r.w, r.y, r.x + r.w, r.y + r.h) ||
         segSeg(x1, y1, x2, y2, r.x + r.w, r.y + r.h, r.x, r.y + r.h) ||
         segSeg(x1, y1, x2, y2, r.x, r.y + r.h, r.x, r.y);
}

// True when nothing solid blocks the straight line between two points.
function losClear(x1, y1, x2, y2, solids) {
  for (var i = 0; i < solids.length; i++) {
    if (segHitsRect(x1, y1, x2, y2, solids[i])) return false;
  }
  return true;
}

// Distance along a ray to the nearest face of rect r (slab test), or Infinity.
function rayRectT(ox, oy, dx, dy, r) {
  var tmin = 0, tmax = Infinity, t1, t2, s;
  if (Math.abs(dx) < 1e-9) {
    if (ox < r.x || ox > r.x + r.w) return Infinity;
  } else {
    t1 = (r.x - ox) / dx; t2 = (r.x + r.w - ox) / dx;
    if (t1 > t2) { s = t1; t1 = t2; t2 = s; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return Infinity;
  }
  if (Math.abs(dy) < 1e-9) {
    if (oy < r.y || oy > r.y + r.h) return Infinity;
  } else {
    t1 = (r.y - oy) / dy; t2 = (r.y + r.h - oy) / dy;
    if (t1 > t2) { s = t1; t1 = t2; t2 = s; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return Infinity;
  }
  return tmin;
}

// The visible fan of a vision cone: a polygon from the watcher's eye, clipped
// by walls and crates. Used both to draw cones and (via watcherSees) to detect.
function conePolygon(x, y, angle, half, range, solids) {
  var pts = [[x, y]], steps = 22, i, j, a, dx, dy, best, t;
  for (i = 0; i <= steps; i++) {
    a = angle - half + (2 * half) * (i / steps);
    dx = Math.cos(a); dy = Math.sin(a); best = range;
    for (j = 0; j < solids.length; j++) {
      t = rayRectT(x, y, dx, dy, solids[j]);
      if (t < best) best = t;
    }
    pts.push([x + dx * best, y + dy * best]);
  }
  return pts;
}

// 0 when the watcher cannot see the target, else a closeness factor in
// (0.45, 1]: nearer targets are spotted faster. A target practically on top
// of the watcher is always seen, cone or not.
function watcherSees(wx, wy, angle, half, range, tx, ty, solids) {
  var d2 = dist2(wx, wy, tx, ty);
  if (d2 > range * range) return 0;
  var d = Math.sqrt(d2);
  if (d > 26) {
    var want = Math.atan2(ty - wy, tx - wx);
    if (Math.abs(angleDiff(angle, want)) > half) return 0;
  }
  if (!losClear(wx, wy, tx, ty, solids)) return 0;
  return 1 - (d / range) * 0.55;
}

// ---------- movement ----------

function circleHits(x, y, r, solids) {
  for (var i = 0; i < solids.length; i++) {
    var s = solids[i];
    var cx = clampNum(x, s.x, s.x + s.w), cy = clampNum(y, s.y, s.y + s.h);
    if (dist2(x, y, cx, cy) < r * r) return true;
  }
  return false;
}

// Axis-separated slide: try x, then y, so bodies glide along walls.
function moveCircle(e, r, dx, dy, solids) {
  if (dx !== 0 && !circleHits(e.x + dx, e.y, r, solids)) e.x += dx;
  if (dy !== 0 && !circleHits(e.x, e.y + dy, r, solids)) e.y += dy;
}

// ---------- state ----------

function rectOf(a) { return { x: a[0], y: a[1], w: a[2], h: a[3] }; }

function loadRoom(run, idx) {
  var L = VB_LEVELS[idx];
  var wallRects = vbBorder().concat(L.walls).map(rectOf);
  var crateRects = L.crates.map(rectOf);
  var room = {
    idx: idx,
    def: L,
    wallRects: wallRects,
    crateRects: crateRects,
    solids: wallRects.concat(crateRects),
    vaultRect: L.vaultRect ? rectOf(L.vaultRect) : null,
    thief: { x: L.spawn[0], y: L.spawn[1], angle: 0, moving: false, sneaking: false },
    guards: L.guards.map(function (g, i) {
      return {
        x: g.path[0][0], y: g.path[0][1], path: g.path,
        wpi: 1 % g.path.length, angle: 0,
        suspicion: 0, seeing: false, staring: false,
        wait: 0, mode: 'patrol', chaseT: 0, shoutCd: 0,
        phase: i * 1.7, speed: g.speed || GUARD_SPEED
      };
    }),
    cameras: L.cameras.map(function (c) {
      return {
        x: c.x, y: c.y, base: c.base, sweep: c.sweep,
        speed: c.speed, phase: c.phase, angle: c.base,
        seeing: false, seeT: 0, locked: false
      };
    }),
    loot: L.loot.map(function (l) {
      return { x: l.x, y: l.y, kind: l.kind, value: LOOT_VALUES[l.kind], taken: false };
    }),
    safe: { x: L.safe.x, y: L.safe.y, value: L.safe.value, label: L.safe.label, cracked: false, crack: 0 },
    exit: { x: L.exit.x, y: L.exit.y, w: L.exit.w, h: L.exit.h },
    decoys: [],
    time: 0
  };
  room.guards.forEach(function (g) {
    var t = g.path[g.wpi];
    g.angle = Math.atan2(t[1] - g.y, t[0] - g.x);
  });
  run.room = room;
  run.alarm = 0;
  run.coins = L.coins;
  run.roomLootStart = run.lootTotal;
  run.roomSpottedStart = run.spotted;
  return room;
}

function newRun() {
  var run = {
    lootTotal: 0, spotted: 0, totalTime: 0,
    alarm: 0, coins: 0, room: null,
    roomLootStart: 0, roomSpottedStart: 0,
    events: [], coinThrows: [],
    over: null, exited: false, cracking: false
  };
  loadRoom(run, 0);
  return run;
}

// Retry after being caught: the room resets, the haul from earlier rooms stays.
function retryRoom(run) {
  var idx = run.room.idx;
  run.lootTotal = run.roomLootStart;
  run.spotted = run.roomSpottedStart;
  run.over = null;
  run.exited = false;
  run.coinThrows = [];
  loadRoom(run, idx);
}

// ---------- guards ----------

function updateGuard(run, g, dt) {
  var room = run.room, th = room.thief;
  g.shoutCd = Math.max(0, g.shoutCd - dt);

  // Caught sight of the thief and not yet chasing: stop and stare him down.
  if (g.staring && g.mode !== 'chase') {
    g.angle = angleTurn(g.angle, Math.atan2(th.y - g.y, th.x - g.x), 4.2 * dt);
    return;
  }

  var tx, ty, spd = g.speed, arrive = 6;

  if (g.mode === 'chase') {
    g.chaseT -= dt;
    if (g.chaseT <= 0) { g.mode = 'patrol'; }
    tx = th.x; ty = th.y; spd = GUARD_CHASE; arrive = 4;
  } else {
    // A coin ping is the most interesting thing in the room, if it is close.
    var decoy = null, bd = COIN_HEAR * COIN_HEAR, i, dd;
    for (i = 0; i < room.decoys.length; i++) {
      dd = dist2(g.x, g.y, room.decoys[i].x, room.decoys[i].y);
      if (dd < bd) { bd = dd; decoy = room.decoys[i]; }
    }
    if (decoy) {
      g.mode = 'decoy'; tx = decoy.x; ty = decoy.y; arrive = 16;
    } else {
      if (g.mode === 'decoy') g.mode = 'patrol';
      if (g.wait > 0) {
        g.wait -= dt;
        g.angle += Math.sin(room.time * 0.8 + g.phase) * 0.35 * dt;
        return;
      }
      var wp = g.path[g.wpi];
      tx = wp[0]; ty = wp[1]; arrive = 6;
    }
  }

  var dx = tx - g.x, dy = ty - g.y;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d <= arrive) {
    if (g.mode === 'patrol') {
      g.wpi = (g.wpi + 1) % g.path.length;
      g.wait = 0.45 + (g.wpi % 3) * 0.18;
    }
    return;
  }
  var want = Math.atan2(dy, dx);
  g.angle = angleTurn(g.angle, want, 3.4 * dt);
  var step = Math.min(d, spd * dt);
  moveCircle(g, GUARD_R, (dx / d) * step, (dy / d) * step, room.solids);
}

// ---------- detection & alarm ----------

function detectionPass(run, dt) {
  var room = run.room, th = room.thief;
  var pressure = 0, anySeen = false, i, g, cam, see;

  for (i = 0; i < room.guards.length; i++) {
    g = room.guards[i];
    see = watcherSees(g.x, g.y, g.angle, GUARD_HALF, GUARD_RANGE, th.x, th.y, room.solids);
    g.seeing = see > 0;
    if (see > 0) {
      anySeen = true;
      var rate = SUS_FILL * (0.55 + see) *
        (th.sneaking ? 0.45 : 1) *
        (th.moving && !th.sneaking ? 1.15 : 1);
      g.suspicion = clampNum(g.suspicion + rate * dt, 0, 1);
      pressure += ALARM_GUARD_RATE * (0.45 + g.suspicion);
      if (g.suspicion >= 1 && g.shoutCd <= 0) {
        g.shoutCd = 3;
        g.mode = 'chase';
        g.chaseT = 2.6;
        run.spotted++;
        run.alarm += ALARM_SHOUT;
        run.events.push('spotted');
      }
    } else {
      g.suspicion = clampNum(g.suspicion - SUS_DECAY * dt, 0, 1);
    }
    g.staring = g.seeing && g.suspicion > 0.45 && g.mode !== 'chase';
    // A guard who lays a hand on the thief ends the heist on the spot.
    if (dist2(g.x, g.y, th.x, th.y) < 20 * 20) run.over = 'guard';
  }

  for (i = 0; i < room.cameras.length; i++) {
    cam = room.cameras[i];
    see = watcherSees(cam.x, cam.y, cam.angle, CAM_HALF, CAM_RANGE, th.x, th.y, room.solids);
    cam.seeing = see > 0;
    if (see > 0) {
      anySeen = true;
      pressure += ALARM_CAM_RATE;
      cam.seeT += dt;
      if (cam.seeT >= 1.0 && !cam.locked) {
        cam.locked = true;
        run.spotted++;
        run.alarm += 10;
        run.events.push('spotted');
      }
    } else {
      cam.seeT = 0;
      cam.locked = false;
    }
  }

  if (anySeen) run.alarm += pressure * dt;
  else run.alarm -= ALARM_DECAY * dt;
  run.alarm = clampNum(run.alarm, 0, 100);
  if (run.alarm >= 100) run.over = 'alarm';
}

// ---------- the frame ----------

function updateRun(run, dt) {
  var room = run.room, th = room.thief, i;
  room.time += dt;
  run.totalTime += dt;

  // Thief movement (WASD / arrows; Shift sneaks).
  var mx = 0, my = 0;
  if (Input.down.KeyA || Input.down.ArrowLeft) mx -= 1;
  if (Input.down.KeyD || Input.down.ArrowRight) mx += 1;
  if (Input.down.KeyW || Input.down.ArrowUp) my -= 1;
  if (Input.down.KeyS || Input.down.ArrowDown) my += 1;
  th.sneaking = !!(Input.down.ShiftLeft || Input.down.ShiftRight);
  th.moving = (mx !== 0 || my !== 0);
  if (th.moving) {
    var len = Math.sqrt(mx * mx + my * my);
    var sp = th.sneaking ? THIEF_SNEAK : THIEF_WALK;
    moveCircle(th, THIEF_R, (mx / len) * sp * dt, (my / len) * sp * dt, room.solids);
    th.angle = angleTurn(th.angle, Math.atan2(my, mx), 14 * dt);
  }

  // Coin decoys thrown with the mouse.
  while (run.coinThrows.length) {
    var c = run.coinThrows.shift();
    if (run.coins > 0) {
      run.coins--;
      room.decoys.push({ x: c.x, y: c.y, t: 0 });
      run.events.push('coin');
    }
  }
  room.decoys = room.decoys.filter(function (d) {
    d.t += dt;
    return d.t < COIN_TTL;
  });

  // Cameras sweep on their timed arcs.
  for (i = 0; i < room.cameras.length; i++) {
    var cam = room.cameras[i];
    cam.angle = cam.base + Math.sin(room.time * cam.speed + cam.phase) * cam.sweep;
  }

  for (i = 0; i < room.guards.length; i++) updateGuard(run, room.guards[i], dt);

  detectionPass(run, dt);
  if (run.over) return;

  // Loot: walk over a stack to pocket it; holding E sweeps a wider radius.
  var grabR = Input.down.KeyE ? 36 : 22;
  for (i = 0; i < room.loot.length; i++) {
    var l = room.loot[i];
    if (!l.taken && dist2(th.x, th.y, l.x, l.y) < grabR * grabR) {
      l.taken = true;
      run.lootTotal += l.value;
      run.events.push('loot');
    }
  }

  // The safe / vault: stand close and hold E to crack it.
  var safe = room.safe;
  run.cracking = false;
  if (!safe.cracked && dist2(th.x, th.y, safe.x, safe.y) < 48 * 48) {
    if (Input.down.KeyE) {
      run.cracking = true;
      var beat = Math.floor(safe.crack / 0.45);
      safe.crack += dt;
      if (Math.floor(safe.crack / 0.45) !== beat) run.events.push('tick');
      if (safe.crack >= CRACK_TIME) {
        safe.cracked = true;
        run.lootTotal += safe.value;
        run.events.push('cracked');
      }
    }
  }
  if (!run.cracking && !safe.cracked && safe.crack > 0) {
    safe.crack = Math.max(0, safe.crack - dt * 0.25);
  }

  // Out the door, once the safe is cracked.
  var e = room.exit;
  if (safe.cracked &&
      th.x > e.x && th.x < e.x + e.w && th.y > e.y && th.y < e.y + e.h) {
    run.exited = true;
  }
}
