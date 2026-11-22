// VAULTBREAK — all drawing. drawWorld paints one frame of the current room plus
// the HUD; the overlay functions paint the title, pause, caught and win screens
// on top. Everything is drawn on the canvas: no images, no fonts, no assets.

// ---------- small helpers ----------

function polyPath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

function drawText(ctx, text, x, y, font, color, align) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function money(n) { return '$' + n.toLocaleString('en-US'); }

// ---------- pieces of the room ----------

function drawFloor(ctx, room) {
  ctx.fillStyle = '#182430';
  ctx.fillRect(0, VB_HUD_H, VB_W, VB_H - VB_HUD_H);
  // Tile grid.
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (var x = 24; x <= 936; x += 48) { ctx.moveTo(x, 72); ctx.lineTo(x, 576); }
  for (var y = 72; y <= 576; y += 48) { ctx.moveTo(24, y); ctx.lineTo(936, y); }
  ctx.stroke();
  // A gilt inlay frames the room: a bank should look like money.
  ctx.strokeStyle = 'rgba(216,177,58,0.07)';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 84, 888, 480);
}

function drawExit(ctx, room) {
  var e = room.exit, open = room.safe.cracked;
  ctx.fillStyle = open ? 'rgba(46,160,90,0.32)' : 'rgba(120,40,40,0.28)';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = open ? '#2ea35e' : '#7a3030';
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x, e.y, e.w, e.h);
  if (open) {
    var p = 2 + 1.6 * Math.sin(room.time * 3);
    ctx.strokeStyle = 'rgba(126,226,168,0.55)';
    ctx.strokeRect(e.x - p, e.y - p, e.w + 2 * p, e.h + 2 * p);
  }
  drawText(ctx, 'EXIT', e.x + e.w / 2, e.y + 24, '700 11px system-ui, sans-serif',
    open ? '#7de2a8' : '#b08080', 'center');
  drawText(ctx, open ? 'OUT' : 'LOCKED', e.x + e.w / 2, e.y + 39, '600 8px system-ui, sans-serif',
    open ? '#7de2a8' : '#8a5a5a', 'center');
}

function drawLootItem(ctx, l, t) {
  if (l.taken) return;
  var bob = Math.sin(t * 2 + l.x * 0.7) * 1.5;
  ctx.fillStyle = 'rgba(255,220,120,0.07)';
  ctx.beginPath(); ctx.arc(l.x, l.y, 16, 0, Math.PI * 2); ctx.fill();
  if (l.kind === 'cash') {
    ctx.fillStyle = '#2e7d46';
    ctx.strokeStyle = '#1c4d2c';
    ctx.lineWidth = 1;
    ctx.fillRect(l.x - 9, l.y - 6 + bob, 18, 12);
    ctx.strokeRect(l.x - 9, l.y - 6 + bob, 18, 12);
    drawText(ctx, '$', l.x, l.y + 3 + bob, '700 9px system-ui, sans-serif', '#c8f0d2', 'center');
  } else if (l.kind === 'gold') {
    ctx.fillStyle = '#d8a722';
    ctx.strokeStyle = '#8a6a14';
    ctx.lineWidth = 1;
    ctx.fillRect(l.x - 10, l.y - 2 + bob, 20, 7);
    ctx.strokeRect(l.x - 10, l.y - 2 + bob, 20, 7);
    ctx.fillRect(l.x - 7, l.y - 9 + bob, 14, 7);
    ctx.strokeRect(l.x - 7, l.y - 9 + bob, 14, 7);
  } else { // gem
    ctx.fillStyle = '#57d7e8';
    ctx.strokeStyle = '#2a7f8f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(l.x, l.y - 10 + bob);
    ctx.lineTo(l.x + 8, l.y + bob);
    ctx.lineTo(l.x, l.y + 10 + bob);
    ctx.lineTo(l.x - 8, l.y + bob);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(l.x - 8, l.y + bob); ctx.lineTo(l.x + 8, l.y + bob);
    ctx.stroke();
  }
  drawText(ctx, money(l.value), l.x, l.y + 22, '600 9px system-ui, sans-serif', '#9fb4c4', 'center');
}

function drawSafe(ctx, run) {
  var room = run.room, s = room.safe;
  if (!s.cracked) {
    ctx.strokeStyle = 'rgba(216,177,58,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.arc(s.x, s.y, 48, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = s.cracked ? '#5d6873' : '#78838f';
  ctx.strokeStyle = '#3a434d';
  ctx.lineWidth = 2;
  ctx.fillRect(s.x - 19, s.y - 19, 38, 38);
  ctx.strokeRect(s.x - 19, s.y - 19, 38, 38);
  // The door: shut and round-dialled, or swung open once cracked.
  ctx.fillStyle = '#66727e';
  ctx.beginPath(); ctx.arc(s.x + (s.cracked ? 7 : 0), s.y, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3a434d';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(s.x + (s.cracked ? 7 : 0), s.y, 11, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#39424b';
  ctx.beginPath(); ctx.arc(s.x + (s.cracked ? 7 : 0), s.y, 3, 0, Math.PI * 2); ctx.fill();
  drawText(ctx, s.label.toUpperCase(), s.x, s.y - 27, '700 10px system-ui, sans-serif', '#cfe0ee', 'center');
  if (s.cracked) {
    drawText(ctx, '+' + money(s.value), s.x, s.y + 34, '700 11px system-ui, sans-serif', '#d8b13a', 'center');
  } else {
    if (s.crack > 0) {
      ctx.strokeStyle = '#d8b13a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (s.crack / CRACK_TIME));
      ctx.stroke();
    }
    var th = room.thief;
    if (run.cracking) {
      drawText(ctx, 'CRACKING…', s.x, s.y + 34, '700 10px system-ui, sans-serif', '#d8b13a', 'center');
    } else if (dist2(th.x, th.y, s.x, s.y) < 60 * 60) {
      drawText(ctx, 'HOLD E', s.x, s.y + 34, '600 10px system-ui, sans-serif', '#8fa6ba', 'center');
    }
  }
}

function drawDecoys(ctx, room) {
  for (var i = 0; i < room.decoys.length; i++) {
    var d = room.decoys[i], f = d.t / COIN_TTL;
    ctx.strokeStyle = 'rgba(216,177,58,' + (0.55 * (1 - f)).toFixed(3) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(d.x, d.y, 6 + f * 24, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#d8b13a';
    ctx.beginPath(); ctx.arc(d.x, d.y, 4, 0, Math.PI * 2); ctx.fill();
  }
}

function drawSolids(ctx, room) {
  var i, r;
  for (i = 0; i < room.wallRects.length; i++) {
    r = room.wallRects[i];
    if (room.vaultRect && r.x === room.vaultRect.x && r.y === room.vaultRect.y &&
        r.w === room.vaultRect.w && r.h === room.vaultRect.h) {
      drawVaultBlock(ctx, r);
      continue;
    }
    ctx.fillStyle = '#43536a';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(r.x, r.y, r.w, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(r.x, r.y + r.h - 2, r.w, 2);
  }
  for (i = 0; i < room.crateRects.length; i++) {
    r = room.crateRects[i];
    ctx.fillStyle = '#6e5230';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#4c381e';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.w, r.y + r.h);
    ctx.moveTo(r.x + r.w, r.y); ctx.lineTo(r.x, r.y + r.h);
    ctx.stroke();
  }
}

function drawVaultBlock(ctx, r) {
  ctx.fillStyle = '#5b6672';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = '#39424b';
  ctx.lineWidth = 2;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  var cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  ctx.fillStyle = '#6d7885';
  ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#39424b';
  ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  for (var i = 0; i < 3; i++) {
    var a = i * Math.PI * 2 / 3 + 0.5;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22);
  }
  ctx.stroke();
  drawText(ctx, 'VAULT', cx, r.y + r.h - 10, '700 12px system-ui, sans-serif', '#39424b', 'center');
}

function drawCones(ctx, room) {
  var i, g, cam;
  for (i = 0; i < room.guards.length; i++) {
    g = room.guards[i];
    var pts = conePolygon(g.x, g.y, g.angle, GUARD_HALF, GUARD_RANGE, room.solids);
    var gr = Math.round(200 - 150 * g.suspicion);
    ctx.fillStyle = 'rgba(255,' + gr + ',50,' + (0.15 + 0.13 * g.suspicion).toFixed(3) + ')';
    polyPath(ctx, pts);
    ctx.fill();
  }
  for (i = 0; i < room.cameras.length; i++) {
    cam = room.cameras[i];
    var cps = conePolygon(cam.x, cam.y, cam.angle, CAM_HALF, CAM_RANGE, room.solids);
    ctx.fillStyle = cam.seeing ? 'rgba(255,90,90,0.20)' : 'rgba(90,200,255,0.12)';
    polyPath(ctx, cps);
    ctx.fill();
  }
}

function drawCameraBody(ctx, cam) {
  ctx.fillStyle = '#39434e';
  ctx.strokeStyle = '#20262c';
  ctx.lineWidth = 1;
  ctx.fillRect(cam.x - 8, cam.y - 6, 16, 12);
  ctx.strokeRect(cam.x - 8, cam.y - 6, 16, 12);
  var lx = cam.x + Math.cos(cam.angle) * 9, ly = cam.y + Math.sin(cam.angle) * 9;
  ctx.strokeStyle = '#20262c';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cam.x, cam.y); ctx.lineTo(lx, ly); ctx.stroke();
  ctx.fillStyle = '#0c0f12';
  ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = cam.seeing ? '#ff5040' : '#3fae5a';
  ctx.beginPath(); ctx.arc(cam.x + 5, cam.y - 4, 1.8, 0, Math.PI * 2); ctx.fill();
}

function drawGuard(ctx, g) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(g.x, g.y + 9, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b5ea7';
  ctx.strokeStyle = '#122c52';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(g.x, g.y, GUARD_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Cap: a wedge toward the facing, with a brim.
  ctx.fillStyle = '#16345f';
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.arc(g.x, g.y, GUARD_R - 1, g.angle - 1.1, g.angle + 1.1);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#16345f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(g.angle) * 13, g.y + Math.sin(g.angle) * 13);
  ctx.stroke();
  ctx.fillStyle = '#dfe9f5';
  ctx.beginPath();
  ctx.arc(g.x + Math.cos(g.angle) * 4, g.y + Math.sin(g.angle) * 4, 2, 0, Math.PI * 2);
  ctx.fill();
  // Suspicion: a bar over the head, then ? and ! as it boils over.
  if (g.suspicion > 0.02) {
    ctx.fillStyle = '#0a0f14';
    ctx.fillRect(g.x - 13, g.y - 25, 26, 4);
    ctx.fillStyle = g.suspicion > 0.7 ? '#ff5040' : '#ffd23e';
    ctx.fillRect(g.x - 13, g.y - 25, 26 * g.suspicion, 4);
  }
  if (g.mode === 'chase' || g.suspicion >= 0.99) {
    drawText(ctx, '!', g.x, g.y - 30, '700 15px system-ui, sans-serif', '#ff5040', 'center');
  } else if (g.suspicion > 0.4) {
    drawText(ctx, '?', g.x, g.y - 30, '700 13px system-ui, sans-serif',
      'rgba(255,210,62,' + (0.4 + 0.6 * g.suspicion).toFixed(3) + ')', 'center');
  }
}

function drawThief(ctx, th) {
  var r = th.sneaking ? 9.5 : THIEF_R;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(th.x, th.y + 9, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  // The gold scarf is the thief's one vanity — and the player's best landmark.
  ctx.fillStyle = '#131a22';
  ctx.strokeStyle = '#d8b13a';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(th.x, th.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1f2a36';
  ctx.beginPath(); ctx.arc(th.x, th.y, r * 0.55, 0, Math.PI * 2); ctx.fill();
  // Scarf tail trailing behind the facing.
  ctx.fillStyle = '#d8b13a';
  ctx.beginPath();
  ctx.moveTo(th.x - Math.cos(th.angle) * r, th.y - Math.sin(th.angle) * r);
  ctx.lineTo(th.x - Math.cos(th.angle - 0.5) * (r + 5), th.y - Math.sin(th.angle - 0.5) * (r + 5));
  ctx.lineTo(th.x - Math.cos(th.angle + 0.5) * (r + 5), th.y - Math.sin(th.angle + 0.5) * (r + 5));
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8eef4';
  ctx.beginPath();
  ctx.arc(th.x + Math.cos(th.angle) * 5, th.y + Math.sin(th.angle) * 5, 1.6, 0, Math.PI * 2);
  ctx.fill();
  if (th.sneaking) {
    ctx.strokeStyle = 'rgba(216,177,58,0.4)';
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(th.x, th.y, r + 4, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ---------- the frame ----------

function drawHUD(ctx, run) {
  var room = run.room;
  ctx.fillStyle = '#0a0f14';
  ctx.fillRect(0, 0, VB_W, VB_HUD_H);
  ctx.fillStyle = '#223140';
  ctx.fillRect(0, VB_HUD_H - 1, VB_W, 1);

  drawText(ctx, 'ROOM ' + (room.idx + 1) + '/3 · ' + room.def.name.toUpperCase(),
    16, 20, '700 13px system-ui, sans-serif', '#e8eef4');
  drawText(ctx, room.safe.cracked ? 'Objective: reach the EXIT' : 'Objective: crack the ' + room.safe.label,
    16, 38, '400 11px system-ui, sans-serif', room.safe.cracked ? '#7de2a8' : '#8fa6ba');

  // The alarm meter: the one number the whole heist hangs on.
  drawText(ctx, 'ALARM', 352, 20, '700 11px system-ui, sans-serif', '#8fa6ba');
  ctx.fillStyle = '#26313d';
  ctx.fillRect(352, 26, 256, 10);
  var a = run.alarm;
  ctx.fillStyle = a >= 70 ? '#ff5040' : (a >= 40 ? '#ffb02e' : '#3fae5a');
  ctx.fillRect(352, 26, 256 * a / 100, 10);
  drawText(ctx, Math.floor(a) + '%', 616, 36, '700 12px system-ui, sans-serif', '#e8eef4');

  drawText(ctx, 'LOOT ' + money(run.lootTotal), VB_W - 16, 22, '700 15px system-ui, sans-serif', '#d8b13a', 'right');
  drawText(ctx, 'COINS ×' + run.coins + ' · ' + fmtClock(run.totalTime),
    VB_W - 16, 39, '400 11px system-ui, sans-serif', '#8fa6ba', 'right');
}

function drawWorld(ctx, run) {
  var room = run.room, i;
  ctx.fillStyle = '#0d141c';
  ctx.fillRect(0, 0, VB_W, VB_H);
  drawFloor(ctx, room);
  drawExit(ctx, room);
  for (i = 0; i < room.loot.length; i++) drawLootItem(ctx, room.loot[i], room.time);
  drawSafe(ctx, run);
  drawDecoys(ctx, room);
  drawCones(ctx, room);
  drawSolids(ctx, room);
  for (i = 0; i < room.cameras.length; i++) drawCameraBody(ctx, room.cameras[i]);
  for (i = 0; i < room.guards.length; i++) drawGuard(ctx, room.guards[i]);
  drawThief(ctx, room.thief);
  drawHUD(ctx, run);
  // High alarm: the room itself starts to feel it.
  if (run.alarm > 70) {
    ctx.strokeStyle = 'rgba(255,60,40,' + (0.25 + 0.2 * Math.sin(room.time * 5)).toFixed(3) + ')';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, VB_HUD_H + 3, VB_W - 6, VB_H - VB_HUD_H - 6);
  }
}

// ---------- overlays ----------

function dimScreen(ctx, alpha) {
  ctx.fillStyle = 'rgba(4,8,12,' + alpha + ')';
  ctx.fillRect(0, 0, VB_W, VB_H);
}

function drawTitle(ctx) {
  dimScreen(ctx, 0.78);
  drawText(ctx, 'VAULTBREAK', VB_W / 2, 190, '800 54px system-ui, sans-serif', '#d8b13a', 'center');
  drawText(ctx, 'One thief. Three rooms. Every camera is a witness.',
    VB_W / 2, 224, '400 15px system-ui, sans-serif', '#cfe0ee', 'center');
  drawText(ctx, 'Cross each room, crack its safe, and slip out the exit —', VB_W / 2, 268,
    '400 14px system-ui, sans-serif', '#8fa6ba', 'center');
  drawText(ctx, 'but if the ALARM meter fills, the heist is blown.', VB_W / 2, 288,
    '400 14px system-ui, sans-serif', '#8fa6ba', 'center');
  var lines = [
    'WASD / arrows — move        SHIFT — sneak (slower, harder to spot)',
    'E — grab loot, hold to crack the safe        CLICK — throw a coin decoy',
    'P / ESC — pause        M — mute        R — retry a blown room'
  ];
  for (var i = 0; i < lines.length; i++) {
    drawText(ctx, lines[i], VB_W / 2, 340 + i * 24, '400 13px system-ui, sans-serif', '#cfe0ee', 'center');
  }
  drawText(ctx, 'PRESS ENTER TO START', VB_W / 2, 448, '700 17px system-ui, sans-serif', '#7de2a8', 'center');
}

function drawPause(ctx) {
  dimScreen(ctx, 0.6);
  drawText(ctx, 'PAUSED', VB_W / 2, 290, '800 34px system-ui, sans-serif', '#e8eef4', 'center');
  drawText(ctx, 'P or Esc to resume', VB_W / 2, 322, '400 14px system-ui, sans-serif', '#8fa6ba', 'center');
}

function drawCaught(ctx, reason) {
  ctx.fillStyle = 'rgba(60,6,4,0.72)';
  ctx.fillRect(0, 0, VB_W, VB_H);
  drawText(ctx, 'BUSTED', VB_W / 2, 250, '800 48px system-ui, sans-serif', '#ff5040', 'center');
  drawText(ctx, reason === 'guard'
      ? 'A guard laid a hand on you in the open.'
      : 'The alarm hit 100% — the bank locked down around you.',
    VB_W / 2, 292, '400 15px system-ui, sans-serif', '#e8eef4', 'center');
  drawText(ctx, 'PRESS R TO RETRY THE ROOM', VB_W / 2, 348, '700 16px system-ui, sans-serif', '#7de2a8', 'center');
}

function gradeFor(loot) {
  if (loot >= 15000) return 'S';
  if (loot >= 12000) return 'A';
  if (loot >= 8500) return 'B';
  return 'C';
}

function drawWin(ctx, run) {
  dimScreen(ctx, 0.82);
  drawText(ctx, 'CLEAN GETAWAY', VB_W / 2, 180, '800 42px system-ui, sans-serif', '#7de2a8', 'center');
  drawText(ctx, 'The vault is empty, the tape is wiped, and you were never there.',
    VB_W / 2, 214, '400 14px system-ui, sans-serif', '#8fa6ba', 'center');
  drawText(ctx, gradeFor(run.lootTotal), VB_W / 2, 300, '800 64px system-ui, sans-serif', '#d8b13a', 'center');
  var rows = [
    'Loot: ' + money(run.lootTotal) + ' of ' + money(VB_TOTAL_LOOT),
    'Time: ' + fmtClock(run.totalTime),
    'Times spotted: ' + run.spotted
  ];
  for (var i = 0; i < rows.length; i++) {
    drawText(ctx, rows[i], VB_W / 2, 348 + i * 24, '400 15px system-ui, sans-serif', '#e8eef4', 'center');
  }
  drawText(ctx, 'PRESS ENTER TO PLAY AGAIN', VB_W / 2, 452, '700 16px system-ui, sans-serif', '#7de2a8', 'center');
}

function drawBanner(ctx, title, sub) {
  ctx.fillStyle = 'rgba(4,8,12,0.55)';
  ctx.fillRect(0, 250, VB_W, 92);
  drawText(ctx, title.toUpperCase(), VB_W / 2, 292, '800 26px system-ui, sans-serif', '#e8eef4', 'center');
  drawText(ctx, sub, VB_W / 2, 320, '400 13px system-ui, sans-serif', '#8fa6ba', 'center');
}
