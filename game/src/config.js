// VAULTBREAK — configuration: canvas size, tuning constants, a seeded RNG and the
// three room layouts. Loaded first; every other script reads the globals here.
// The game never uses Math.random or Date.now, so a staged screenshot URL
// always renders the identical frame.

var VB_W = 960;        // canvas width, px
var VB_H = 600;        // canvas height, px
var VB_HUD_H = 48;     // height of the HUD band across the top

// Thief tuning
var THIEF_R = 11;      // body radius, px
var THIEF_WALK = 150;  // walk speed, px/s
var THIEF_SNEAK = 76;  // sneak speed, px/s (slower, much harder to spot)

// Guard tuning
var GUARD_R = 11;
var GUARD_SPEED = 64;    // patrol speed, px/s
var GUARD_CHASE = 122;   // chase speed once a guard's suspicion maxes out
var GUARD_RANGE = 176;   // vision cone length, px
var GUARD_HALF = 0.56;   // vision cone half-angle, radians (~32 degrees)
var SUS_FILL = 0.6;      // suspicion gained per second at mid range
var SUS_DECAY = 0.38;    // suspicion lost per second while the thief is unseen

// Camera tuning
var CAM_RANGE = 158;   // camera cone length, px
var CAM_HALF = 0.42;   // camera cone half-angle, radians (~24 degrees)

// Alarm tuning (the meter runs 0..100; at 100 the heist is blown)
var ALARM_GUARD_RATE = 11;  // per second from one guard who sees the thief
var ALARM_CAM_RATE = 17;    // per second from one camera that sees the thief
var ALARM_DECAY = 8;        // per second while nobody sees the thief
var ALARM_SHOUT = 22;       // instant jump when a guard's suspicion maxes out

var CRACK_TIME = 2.4;  // seconds of holding E at a safe / the vault to crack it
var COIN_TTL = 2.4;    // seconds a thrown coin holds a guard's attention
var COIN_HEAR = 280;   // how far a coin's ping carries, px

var LOOT_VALUES = { cash: 250, gold: 500, gem: 750 };

// Deterministic RNG (mulberry32), used for tiny patrol variations only.
function vbRng(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampNum(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function dist2(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; }

// Smallest signed difference from angle a to angle b, in (-PI, PI].
function angleDiff(a, b) {
  var d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Turn cur toward target by at most maxStep radians.
function angleTurn(cur, target, maxStep) {
  var d = angleDiff(cur, target);
  if (Math.abs(d) <= maxStep) return target;
  return cur + (d > 0 ? 1 : -1) * maxStep;
}

// "m:ss" clock for the HUD and the win screen.
function fmtClock(s) {
  var m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return m + ':' + (ss < 10 ? '0' : '') + ss;
}

// The room shell shared by every room. Interior is x 24..936, y 72..576.
function vbBorder() {
  return [
    [8, 56, 944, 16],    // top
    [8, 576, 944, 16],   // bottom
    [8, 56, 16, 536],    // left
    [936, 56, 16, 536]   // right
  ];
}

// Room layouts. Walls and crates are [x, y, w, h] rects and block both movement
// and sight. Guards walk their waypoint loops; cameras sweep around `base`.
var VB_LEVELS = [
  {
    name: 'The Lobby',
    sub: 'One safe, two patrols, one camera. Learn the cones.',
    spawn: [64, 516],
    exit: { x: 896, y: 452, w: 40, h: 56 },
    safe: { x: 884, y: 118, value: 1500, label: 'Lobby Safe' },
    walls: [
      [296, 292, 208, 24],   // reception desk
      [452, 420, 20, 156],   // stub up from the bottom wall
      [452, 72, 20, 84]      // stub down from the top wall
    ],
    crates: [
      [168, 140, 40, 40], [736, 140, 40, 40],
      [168, 424, 40, 40], [736, 424, 40, 40]
    ],
    loot: [
      { x: 250, y: 520, kind: 'cash' },
      { x: 700, y: 330, kind: 'gold' },
      { x: 480, y: 214, kind: 'gem' },
      { x: 884, y: 300, kind: 'cash' }
    ],
    guards: [
      { path: [[120, 196], [840, 196], [840, 268], [120, 268]] },
      { path: [[840, 516], [560, 516], [560, 376], [840, 376]] }
    ],
    cameras: [
      { x: 480, y: 84, base: Math.PI / 2, sweep: 0.62, speed: 0.55, phase: 0 }
    ],
    coins: 3
  },
  {
    name: 'The Counting Room',
    sub: 'Long tables, offset gaps, three patrols.',
    spawn: [60, 540],
    exit: { x: 896, y: 96, w: 40, h: 56 },
    safe: { x: 480, y: 104, value: 2500, label: 'Counting Safe' },
    walls: [
      [420, 72, 16, 64], [524, 72, 16, 64],       // the safe's alcove
      [150, 210, 300, 26], [540, 210, 270, 26],   // counting table A (gap at x 450..540)
      [150, 380, 270, 26], [510, 380, 300, 26]    // counting table B (gap at x 420..510)
    ],
    crates: [
      [76, 96, 36, 36], [848, 96, 36, 36],
      [76, 452, 36, 36], [848, 452, 36, 36]
    ],
    loot: [
      { x: 480, y: 308, kind: 'cash' },
      { x: 120, y: 540, kind: 'gold' },
      { x: 845, y: 545, kind: 'gem' },
      { x: 480, y: 470, kind: 'gold' },
      { x: 255, y: 350, kind: 'cash' }
    ],
    guards: [
      { path: [[90, 150], [870, 150]] },
      { path: [[870, 308], [90, 308]] },
      { path: [[90, 500], [870, 500]] }
    ],
    cameras: [
      { x: 120, y: 84, base: Math.PI / 2, sweep: 0.7, speed: 0.5, phase: 1.3 },
      { x: 840, y: 564, base: -Math.PI / 2, sweep: 0.7, speed: 0.45, phase: 0.4 }
    ],
    coins: 3
  },
  {
    name: 'The Vault Floor',
    sub: 'The main vault. Four patrols, three cameras, one way out.',
    spawn: [64, 500],
    exit: { x: 896, y: 296, w: 40, h: 56 },
    safe: { x: 480, y: 392, value: 5000, label: 'Main Vault' },
    vaultRect: [380, 228, 200, 130],   // the vault block itself (also in walls)
    walls: [
      [380, 228, 200, 130],                        // the vault block
      [180, 150, 220, 20], [560, 150, 220, 20],    // north ring walls
      [180, 430, 220, 20], [560, 430, 220, 20]     // south ring walls
    ],
    crates: [
      [300, 300, 34, 34], [626, 300, 34, 34],
      [300, 482, 34, 26], [626, 482, 34, 26]
    ],
    loot: [
      { x: 90, y: 100, kind: 'gem' },
      { x: 870, y: 100, kind: 'gem' },
      { x: 90, y: 545, kind: 'gold' },
      { x: 870, y: 545, kind: 'gold' },
      { x: 480, y: 520, kind: 'cash' },
      { x: 480, y: 128, kind: 'cash' }
    ],
    guards: [
      { path: [[140, 140], [820, 140], [820, 470], [140, 470]] },
      { path: [[250, 520], [710, 520]] },
      { path: [[710, 110], [250, 110]] },
      { path: [[110, 470], [110, 140]] }
    ],
    cameras: [
      { x: 480, y: 84, base: Math.PI / 2, sweep: 0.66, speed: 0.6, phase: 0 },
      { x: 36, y: 200, base: 0, sweep: 0.55, speed: 0.5, phase: 2.1 },
      { x: 924, y: 412, base: Math.PI, sweep: 0.55, speed: 0.52, phase: 4.0 }
    ],
    coins: 4
  }
];

// Every dollar on offer across the three rooms (loot + safes): the win screen's par.
var VB_TOTAL_LOOT = 0;
VB_LEVELS.forEach(function (L) {
  L.loot.forEach(function (l) { VB_TOTAL_LOOT += LOOT_VALUES[l.kind]; });
  VB_TOTAL_LOOT += L.safe.value;
});
