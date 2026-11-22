// VAULTBREAK — boot, the frame loop, the screens, the synthesized sound, and
// the deterministic screenshot staging (?shot=cover|play|alarm|exit&level=N).
// A staged URL renders one fixed composed frame and never starts the loop, so
// the same URL always produces the identical picture.

// ---------- sound: tiny WebAudio synth, no audio files ----------

var Sfx = {
  ctx: null,
  master: null,
  muted: false,

  init: function () {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.4;
    this.master.connect(this.ctx.destination);
  },

  tone: function (freq, dur, type, vol, delay, slide) {
    if (!this.ctx || this.muted) return;
    var t0 = this.ctx.currentTime + (delay || 0);
    var o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  },

  loot: function () { this.tone(1180, 0.07, 'square', 0.10); this.tone(1760, 0.09, 'square', 0.10, 0.06); },
  coin: function () { this.tone(2093, 0.05, 'square', 0.08); this.tone(1568, 0.08, 'square', 0.08, 0.045); },
  tick: function () { this.tone(240, 0.04, 'square', 0.12); },
  cracked: function () {
    this.tone(660, 0.09, 'triangle', 0.16);
    this.tone(880, 0.09, 'triangle', 0.16, 0.08);
    this.tone(1320, 0.14, 'triangle', 0.16, 0.16);
  },
  sting: function () { this.tone(320, 0.16, 'sawtooth', 0.14, 0, 140); },
  alarmTick: function () { this.tone(980, 0.06, 'square', 0.07); },
  caught: function () {
    this.tone(392, 0.18, 'sawtooth', 0.16);
    this.tone(311, 0.18, 'sawtooth', 0.16, 0.16);
    this.tone(233, 0.34, 'sawtooth', 0.16, 0.32);
  },
  roomClear: function () { this.tone(523, 0.1, 'triangle', 0.14); this.tone(784, 0.14, 'triangle', 0.14, 0.09); },
  win: function () {
    var n = [523, 659, 784, 1046];
    for (var i = 0; i < n.length; i++) this.tone(n[i], 0.16, 'triangle', 0.15, i * 0.11);
  }
};

// ---------- game state machine ----------

var canvas = null, ctx = null;
var run = null;
var screen = 'title';   // title | playing | paused | caught | win
var bannerT = 0;
var lastTs = 0;
var alarmBeepT = 0;

function startGame() {
  run = newRun();
  screen = 'playing';
  bannerT = 1.6;
}

function advanceRoom() {
  if (run.room.idx >= VB_LEVELS.length - 1) {
    screen = 'win';
    Sfx.win();
    return;
  }
  loadRoom(run, run.room.idx + 1);
  bannerT = 1.6;
  Sfx.roomClear();
}

function drainEvents() {
  for (var i = 0; i < run.events.length; i++) {
    var e = run.events[i];
    if (e === 'loot') Sfx.loot();
    else if (e === 'coin') Sfx.coin();
    else if (e === 'tick') Sfx.tick();
    else if (e === 'cracked') Sfx.cracked();
    else if (e === 'spotted') Sfx.sting();
  }
  run.events = [];
}

function step(dt) {
  if (Input.pressed.KeyM) Sfx.muted = !Sfx.muted;

  if (screen === 'title') {
    Input.drainClicks();
    if (Input.pressed.Enter) { Sfx.init(); startGame(); }
    return;
  }
  if (screen === 'win') {
    Input.drainClicks();
    if (Input.pressed.Enter) { run = newRun(); screen = 'title'; }
    return;
  }
  if (screen === 'caught') {
    Input.drainClicks();
    if (Input.pressed.KeyR) { retryRoom(run); screen = 'playing'; }
    return;
  }
  if (Input.pressed.KeyP || Input.pressed.Escape) {
    screen = (screen === 'paused') ? 'playing' : 'paused';
  }
  if (screen !== 'playing') {
    Input.drainClicks();
    return;
  }
  if (bannerT > 0) {
    bannerT -= dt;
    Input.drainClicks();
    return;
  }

  var clicks = Input.drainClicks();
  for (var i = 0; i < clicks.length; i++) {
    if (clicks[i].y > VB_HUD_H) run.coinThrows.push(clicks[i]);
  }

  updateRun(run, dt);
  drainEvents();

  if (run.over) {
    screen = 'caught';
    Sfx.caught();
  } else if (run.exited) {
    run.exited = false;
    advanceRoom();
  }

  if (run.alarm > 55 && screen === 'playing') {
    alarmBeepT -= dt;
    if (alarmBeepT <= 0) {
      alarmBeepT = 0.55;
      Sfx.alarmTick();
    }
  }
}

function draw() {
  drawWorld(ctx, run);
  if (screen === 'title') drawTitle(ctx);
  else if (screen === 'paused') drawPause(ctx);
  else if (screen === 'caught') drawCaught(ctx, run.over);
  else if (screen === 'win') drawWin(ctx, run);
  if (screen === 'playing' && bannerT > 0) {
    drawBanner(ctx, run.room.def.name, run.room.def.sub);
  }
  if (Sfx.muted) {
    drawText(ctx, 'MUTED', VB_W - 12, VB_HUD_H + 16, '600 10px system-ui, sans-serif', '#8fa6ba', 'right');
  }
}

function frame(ts) {
  requestAnimationFrame(frame);
  var dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 0);
  lastTs = ts;
  step(dt);
  draw();
  Input.clearPressed();
}

// ---------- screenshot staging ----------

// Compose one fixed frame for ?shot=<scene>&level=<n>. Positions are literals
// tuned for the scene's home room (cover/exit: room 1, play: room 2, alarm:
// room 3); nothing here moves, sweeps or rolls dice.
function stageShot(scene, level) {
  run = newRun();
  loadRoom(run, clampNum(level - 1, 0, VB_LEVELS.length - 1));
  run.staged = true;   // render.js skips its live-only effects for this frame
  var room = run.room, th = room.thief, G = room.guards, C = room.cameras;
  room.time = 2.0;

  if (scene === 'play') {
    // Room 2: the thief sneaks the middle lane while its guard stares him down.
    th.x = 408; th.y = 308; th.angle = 0; th.sneaking = true;
    G[0].x = 300; G[0].y = 150; G[0].angle = 0;
    G[1].x = 560; G[1].y = 308; G[1].angle = Math.PI;
    G[1].suspicion = 0.5; G[1].seeing = true;
    G[2].x = 700; G[2].y = 500; G[2].angle = Math.PI;
    C[0].angle = Math.PI / 2 - 0.4;
    C[1].angle = -Math.PI / 2 + 0.3;
    room.loot[1].taken = true;
    room.loot[4].taken = true;
    run.lootTotal = 750;
    run.alarm = 38;
    run.totalTime = 97;
  } else if (scene === 'alarm') {
    // Room 3: caught in the open under the vault — a guard at full suspicion
    // gives chase and the meter is about to blow.
    th.x = 480; th.y = 404; th.angle = -Math.PI / 2;
    G[0].x = 700; G[0].y = 140; G[0].angle = Math.PI;
    G[1].x = 480; G[1].y = 500; G[1].angle = -Math.PI / 2;
    G[1].suspicion = 1; G[1].seeing = true; G[1].mode = 'chase';
    G[2].x = 300; G[2].y = 110; G[2].angle = 0;
    G[3].x = 110; G[3].y = 300; G[3].angle = Math.PI / 2;
    C[0].angle = Math.PI / 2;
    C[1].angle = 0.3;
    C[2].angle = Math.PI - 0.2;
    room.loot[0].taken = true;
    room.loot[1].taken = true;
    run.lootTotal = 1500;
    run.alarm = 82;
    run.totalTime = 183;
  } else if (scene === 'exit') {
    // Room 1: safe cracked, pockets lined, the door is green and close.
    room.safe.cracked = true;
    room.loot[0].taken = true;
    run.lootTotal = 1750;
    th.x = 852; th.y = 480; th.angle = 0;
    G[0].x = 220; G[0].y = 232; G[0].angle = 0;
    G[1].x = 330; G[1].y = 430; G[1].angle = 0.2;
    C[0].angle = Math.PI / 2 - 0.5;
    run.alarm = 14;
    run.totalTime = 65;
  } else {
    // 'cover' (and any unknown scene): room 1, mid-crossing, cones everywhere.
    th.x = 430; th.y = 322; th.angle = 0.1;
    G[0].x = 640; G[0].y = 210; G[0].angle = Math.PI * 0.92;
    G[0].suspicion = 0.35;
    G[1].x = 700; G[1].y = 470; G[1].angle = -Math.PI / 2;
    G[1].suspicion = 0.1;
    // The Lobby camera is remounted toward the right and raked diagonally —
    // in staging only — so its cone visibly crosses the room in the cover
    // frame instead of pooling in the top strip.
    C[0].x = 672;
    C[0].angle = Math.PI / 2 + 0.5;
    run.alarm = 22;
    run.totalTime = 42;
  }

  drawWorld(ctx, run);
}

// ---------- boot ----------

function boot() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  Input.init(canvas);
  window.addEventListener('keydown', function () { Sfx.init(); });
  canvas.addEventListener('mousedown', function () { Sfx.init(); });

  var q = new URLSearchParams(location.search);
  var shot = q.get('shot');
  if (shot) {
    stageShot(shot, parseInt(q.get('level') || '1', 10) || 1);
    return;
  }
  run = newRun();
  requestAnimationFrame(frame);
}

window.addEventListener('load', boot);
