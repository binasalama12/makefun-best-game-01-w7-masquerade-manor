// MASQUERADE MANOR — all canvas art: the textured manor, the masked
// guests, the detective, clue tokens, the incidents feed and suspicion
// panels, the case board, the tool draft, the dense title screen and
// the end screen. Clickable regions are re-registered on every draw so
// main.js can hit-test taps against exactly what is on screen.

import { VIEW_W, VIEW_H, ROOMS, GUESTS, CLUE_TYPES, CLUE_BY_ID, TOOLS, TOOL_BY_ID, DIFFICULTIES, ROUNDS_PER_CASE } from './config.js';
import { candidatesFor, matchesFor } from './world.js';

export const regions = [];
function reg(x, y, w, h, action, data) { regions.push({ x, y, w, h, action, data }); }

// --- particles & floating text -------------------------------------------
const particles = [];
const floats = [];
export function burst(x, y, color, n = 12, spd = 120) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 30 + Math.random() * spd;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 0.7, max: 0.7, color, r: 2 + Math.random() * 2.5 });
  }
}
export function floatText(x, y, text, color = '#ffd76a') {
  floats.push({ x, y, text, color, life: 1.4 });
}
export function updateFx(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt;
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i]; f.life -= dt; f.y -= 34 * dt;
    if (f.life <= 0) floats.splice(i, 1);
  }
}
export function clearFx() { particles.length = 0; floats.length = 0; }
function drawFx(ctx) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const f of floats) {
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.font = 'bold 17px Georgia';
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

// --- helpers ---------------------------------------------------------------
function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) | 0; return ((h * 1274126177) >> 16) & 0xffff; }
function wrap(ctx, text, x, y, maxW, lh, maxLines = 4) {
  const words = String(text).split(' ');
  let line = '', lines = 0;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y); y += lh; lines++;
      if (lines >= maxLines) return y;
      line = w;
    } else line = test;
  }
  if (line) { ctx.fillText(line, x, y); y += lh; }
  return y;
}
function panel(ctx, x, y, w, h, fill = 'rgba(16,12,28,0.92)', edge = '#5a4a8a') {
  ctx.fillStyle = fill;
  ctx.strokeStyle = edge; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
}

// --- the manor ---------------------------------------------------------------
function drawRoomTexture(ctx, room, t) {
  ctx.fillStyle = room.floor;
  ctx.fillRect(room.x, room.y, room.w, room.h);
  // Procedural texture: alternating boards / tiles from a coord hash —
  // never a plain grid: plank seams, worn patches and candle flecks.
  const step = 34;
  for (let gx = room.x; gx < room.x + room.w; gx += step) {
    for (let gy = room.y; gy < room.y + room.h; gy += step) {
      const h = hash(gx, gy);
      if (h % 3 === 0) { ctx.fillStyle = room.floorAlt; ctx.fillRect(gx, gy, step, step); }
      if (h % 11 === 0) { ctx.fillStyle = 'rgba(255,220,150,0.05)'; ctx.fillRect(gx + 6, gy + 6, 10, 4); }
      if (h % 17 === 0) { ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(gx + 3, gy + step - 6, step - 6, 3); }
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
  for (let gx = room.x; gx <= room.x + room.w; gx += step) { ctx.beginPath(); ctx.moveTo(gx, room.y); ctx.lineTo(gx, room.y + room.h); ctx.stroke(); }
  // Gaslight glow pools at the corners.
  for (const [cx, cy] of [[room.x + 18, room.y + 18], [room.x + room.w - 18, room.y + 18], [room.x + 18, room.y + room.h - 18], [room.x + room.w - 18, room.y + room.h - 18]]) {
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 46);
    g.addColorStop(0, 'rgba(255,190,90,0.20)'); g.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 46, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#ffca7a'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 6.29); ctx.fill();
  }
  ctx.strokeStyle = room.trim; ctx.lineWidth = 3;
  ctx.strokeRect(room.x, room.y, room.w, room.h);
  ctx.fillStyle = 'rgba(240,230,255,0.85)';
  ctx.font = 'bold 13px Georgia'; ctx.textAlign = 'left';
  ctx.fillText(room.name.toUpperCase(), room.x + 10, room.y + 17);
}

function drawFurniture(ctx, room) {
  ctx.save();
  if (room.id === 'library') {
    ctx.fillStyle = '#4a3423';
    for (let i = 0; i < 5; i++) ctx.fillRect(room.x + 14 + i * 50, room.y + 30, 38, 10);
    ctx.fillStyle = '#7a5a8a'; for (let i = 0; i < 5; i++) ctx.fillRect(room.x + 18 + i * 50, room.y + 32, 5, 6);
  } else if (room.id === 'ballroom') {
    ctx.strokeStyle = 'rgba(255,215,130,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(room.x + room.w / 2, room.y + room.h / 2 + 12, 120, 62, 0, 0, 6.29); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(room.x + room.w / 2, room.y + room.h / 2 + 12, 78, 38, 0, 0, 6.29); ctx.stroke();
    ctx.fillStyle = '#ffd76a';
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; ctx.beginPath(); ctx.arc(room.x + room.w / 2 + Math.cos(a) * 26, room.y + 44 + Math.sin(a) * 8, 3, 0, 6.29); ctx.fill(); }
  } else if (room.id === 'conservatory') {
    ctx.fillStyle = '#2f6a3f';
    for (const [px, py] of [[30, 52], [70, 130], [180, 60], [200, 140], [120, 160]]) {
      ctx.beginPath(); ctx.arc(room.x + px, room.y + py, 13, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#8a4a2c'; ctx.fillRect(room.x + px - 5, room.y + py + 10, 10, 8); ctx.fillStyle = '#2f6a3f';
    }
    ctx.strokeStyle = 'rgba(180,255,200,0.25)';
    ctx.strokeRect(room.x + room.w - 60, room.y + 26, 44, 120); // the conservatory door
    ctx.fillStyle = 'rgba(220,255,230,0.8)'; ctx.font = '10px Georgia'; ctx.textAlign = 'center';
    ctx.fillText('DOOR', room.x + room.w - 38, room.y + 22);
  } else if (room.id === 'dining') {
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(room.x + 60, room.y + 70, room.w - 120, 54);
    ctx.fillStyle = '#e8e2d4'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(room.x + 84 + i * 38, room.y + 97, 8, 0, 6.29); ctx.fill(); }
  } else if (room.id === 'study') {
    ctx.fillStyle = '#4a3423'; ctx.fillRect(room.x + 30, room.y + 110, 90, 40);
    ctx.fillStyle = '#d8cfae'; ctx.fillRect(room.x + 44, room.y + 118, 26, 18);
  } else if (room.id === 'gallery') {
    ctx.fillStyle = '#6a5a3a';
    for (let i = 0; i < 5; i++) ctx.strokeRect(room.x + 40 + i * 116, room.y + 26, 62, 44);
    ctx.fillStyle = 'rgba(200,170,255,0.20)';
    for (let i = 0; i < 5; i++) ctx.fillRect(room.x + 46 + i * 116, room.y + 32, 50, 32);
  } else if (room.id === 'chapel') {
    ctx.fillStyle = '#3a3f52';
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) ctx.fillRect(room.x + 40 + i * 60, room.y + 60 + r * 36, 44, 10);
  } else if (room.id === 'music') {
    ctx.fillStyle = '#191922'; ctx.fillRect(room.x + 120, room.y + 60, 76, 46);
    ctx.fillStyle = '#e8e8f2'; ctx.fillRect(room.x + 126, room.y + 96, 64, 8);
  }
  ctx.restore();
}

function drawGuest(ctx, g, t, opts = {}) {
  const bob = Math.sin(t * 2 + g.phase) * 1.6;
  const x = g.x, y = g.y + bob;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(g.x, g.y + 16, 13, 5, 0, 0, 6.29); ctx.fill();
  ctx.fillStyle = GUESTS[g.id].robe;
  ctx.beginPath();
  ctx.moveTo(x - 11, y + 16); ctx.lineTo(x - 6, y - 4); ctx.lineTo(x + 6, y - 4); ctx.lineTo(x + 11, y + 16);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath(); ctx.arc(x, y - 11, 8, 0, 6.29); ctx.fill();
  ctx.fillStyle = GUESTS[g.id].accent;
  ctx.fillRect(x - 8, y - 14, 16, 6); // the mask band
  ctx.fillStyle = '#14101e';
  ctx.beginPath(); ctx.arc(x - 3.4, y - 11, 1.5, 0, 6.29); ctx.arc(x + 3.4, y - 11, 1.5, 0, 6.29); ctx.fill();
  if (opts.cleared) {
    ctx.strokeStyle = 'rgba(255,90,90,0.9)'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(x - 10, y - 20); ctx.lineTo(x + 10, y + 18); ctx.moveTo(x + 10, y - 20); ctx.lineTo(x - 10, y + 18); ctx.stroke();
  }
  ctx.font = '10.5px Georgia'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(8,6,16,0.65)';
  const label = GUESTS[g.id].name;
  ctx.fillRect(x - ctx.measureText(label).width / 2 - 4, y - 36, ctx.measureText(label).width + 8, 13);
  ctx.fillStyle = '#efe8ff';
  ctx.fillText(label, x, y - 26);
}

function drawPlayer(ctx, p, t) {
  const bob = Math.sin(t * 6) * (p.moving ? 1.8 : 0.6);
  const x = p.x, y = p.y + bob;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 17, 13, 5, 0, 0, 6.29); ctx.fill();
  ctx.strokeStyle = 'rgba(140,220,255,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(p.x, p.y, 24 + Math.sin(t * 3) * 2, 0, 6.29); ctx.stroke();
  ctx.fillStyle = '#274b63';
  ctx.beginPath();
  ctx.moveTo(x - 11, y + 17); ctx.lineTo(x - 6, y - 3); ctx.lineTo(x + 6, y - 3); ctx.lineTo(x + 11, y + 17);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath(); ctx.arc(x, y - 10, 8, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#101018'; ctx.fillRect(x - 10, y - 19, 20, 4); ctx.fillRect(x - 6, y - 26, 12, 8); // detective's hat
  ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x + 12, y + 2, 6, 0, 6.29); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 16, y + 7); ctx.lineTo(x + 21, y + 13); ctx.stroke();
  ctx.font = 'bold 10.5px Georgia'; ctx.textAlign = 'center';
  ctx.fillStyle = '#bfe8ff'; ctx.fillText('YOU — DETECTIVE', x, y - 32);
}

function drawToken(ctx, tok, t) {
  const y = tok.y + Math.sin(t * 2.4 + tok.bob) * 3;
  const pulse = 13 + Math.sin(t * 3.4 + tok.bob) * 3;
  const g = ctx.createRadialGradient(tok.x, y, 2, tok.x, y, 30);
  g.addColorStop(0, 'rgba(255,215,106,0.55)'); g.addColorStop(1, 'rgba(255,215,106,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tok.x, y, 30, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath(); ctx.arc(tok.x, y, pulse * 0.62, 0, 6.29); ctx.fill();
  ctx.font = '15px Georgia'; ctx.textAlign = 'center';
  ctx.fillText(CLUE_BY_ID[tok.type].icon, tok.x, y + 5);
  ctx.font = 'bold 9px Georgia'; ctx.fillStyle = '#ffe9b8';
  ctx.fillText(CLUE_BY_ID[tok.type].name.toUpperCase(), tok.x, y + 26);
}

// --- play screen ---------------------------------------------------------------
function drawPlayPanels(ctx, state, t) {
  // Incidents feed (bottom-left)
  panel(ctx, 36, 470, 596, 232);
  ctx.fillStyle = '#ffb0a8'; ctx.font = 'bold 14px Georgia'; ctx.textAlign = 'left';
  ctx.fillText('⚠ INCIDENTS — WHO SLIPS AWAY, WHO LINGERS', 52, 494);
  ctx.font = '13px Georgia';
  let y = 518;
  for (const line of state.feed.slice(0, 7)) {
    ctx.fillStyle = '#e8e2f2';
    y = wrap(ctx, '• ' + line, 52, y, 566, 16, 2);
    y += 3;
    if (y > 690) break;
  }
  if (!state.feed.length) { ctx.fillStyle = '#9a92b8'; ctx.fillText('The ball is young. Watch the guests…', 52, 520); }

  // Suspicion panel (bottom-middle)
  panel(ctx, 648, 470, 288, 232);
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 14px Georgia';
  ctx.fillText('SUSPICION — CLUES MATCHED', 664, 494);
  const ranked = GUESTS.map((g, i) => ({ i, m: matchesFor(i, state.clues) }))
    .sort((a, b) => b.m - a.m).slice(0, 5);
  ctx.font = '12.5px Georgia';
  let sy = 520;
  for (const r of ranked) {
    ctx.fillStyle = '#e8e2f2'; ctx.textAlign = 'left';
    ctx.fillText(GUESTS[r.i].name.split(' ').slice(-1)[0], 664, sy);
    ctx.fillStyle = '#3a2c55'; ctx.fillRect(736, sy - 9, 130, 9);
    ctx.fillStyle = r.m >= 4 ? '#ff5a6e' : r.m >= 2 ? '#ffb34d' : '#8a7fd0';
    ctx.fillRect(736, sy - 9, 130 * (state.clues.length ? r.m / state.clues.length : 0), 9);
    ctx.fillStyle = '#ffe9b8'; ctx.fillText(`${r.m}/${state.clues.length}`, 874, sy);
    sy += 24;
  }
  ctx.fillStyle = '#9a92b8'; ctx.font = '11.5px Georgia';
  wrap(ctx, `Candidates still standing: ${candidatesFor(state.clues).length} of 8. Three true clues (footprint, silk, seal) always name one guest.`, 664, sy + 8, 258, 15, 4);

  // Objective / tools panel (bottom-right)
  panel(ctx, 952, 470, 292, 232);
  ctx.fillStyle = '#a8ffd8'; ctx.font = 'bold 13px Georgia';
  ctx.fillText('WIN: accuse the Thorn — correctly, once.', 968, 494);
  ctx.fillStyle = '#ff9a9a';
  wrap(ctx, 'LOSE: a wrong accusation (the Thorn strikes) or the 7th round ends.', 968, 514, 262, 15, 3);
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 12.5px Georgia';
  ctx.fillText(`TOOLS CARRIED (${state.tools.length}/8)`, 968, 562);
  ctx.font = '12px Georgia'; ctx.fillStyle = '#e8e2f2';
  let ty = 582;
  if (!state.tools.length) { ctx.fillStyle = '#9a92b8'; ctx.fillText('None yet — solve a case to draft one.', 968, ty); }
  for (const id of state.tools.slice(0, 4)) { ctx.fillText('◆ ' + TOOL_BY_ID[id].name, 968, ty); ty += 17; }
  // Buttons
  ctx.fillStyle = '#5a3a8a'; ctx.strokeStyle = '#c9a8ff'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(968, 656, 124, 34, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Georgia'; ctx.textAlign = 'center';
  ctx.fillText('CASE BOARD (C)', 1030, 678);
  reg(968, 656, 124, 34, 'board');
  ctx.fillStyle = '#8a2c3a';
  ctx.beginPath(); ctx.roundRect(1104, 656, 124, 34, 6); ctx.fill(); ctx.stroke();
  ctx.fillText('ACCUSE…', 1166, 678);
  reg(1104, 656, 124, 34, 'board');
  ctx.textAlign = 'left';
}

export function drawPlay(ctx, state, t) {
  regions.length = 0;
  ctx.fillStyle = '#0d0a14'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (const room of ROOMS) { drawRoomTexture(ctx, room, t); drawFurniture(ctx, room); }
  // Thorn trail (Candle Lantern tool)
  if (state.trail && state.trail.timer > 0) {
    ctx.fillStyle = 'rgba(255,120,140,0.5)';
    for (const p of state.trail.points) { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 6.29); ctx.fill(); }
  }
  const cands = candidatesFor(state.clues);
  for (const tok of state.tokens) if (!tok.taken) drawToken(ctx, tok, t);
  for (const g of state.kase.guests) {
    drawGuest(ctx, g, t, { cleared: state.clues.length >= 3 && !cands.includes(g.id) });
    reg(g.x - 16, g.y - 22, 32, 42, 'guest', g.id);
  }
  drawPlayer(ctx, state.player, t);
  drawPlayPanels(ctx, state, t);
  // Round clock bar
  ctx.fillStyle = '#241a3a'; ctx.fillRect(36, 458, 1208, 6);
  ctx.fillStyle = state.timeLeft < 8 ? '#ff5a6e' : '#7fd4ff';
  ctx.fillRect(36, 458, 1208 * Math.max(0, state.timeLeft / state.roundSeconds), 6);
  // Incident banner
  if (state.banner && state.banner.timer > 0) {
    ctx.fillStyle = 'rgba(120,16,32,0.92)';
    ctx.fillRect(240, 52, 800, 40);
    ctx.strokeStyle = '#ff8a9a'; ctx.strokeRect(240, 52, 800, 40);
    ctx.fillStyle = '#ffe2e6'; ctx.font = 'bold 19px Georgia'; ctx.textAlign = 'center';
    ctx.fillText(state.banner.text, 640, 79);
    ctx.textAlign = 'left';
  }
  drawFx(ctx);
  if (state.accuseTarget != null && state.accuseTarget !== undefined) drawAccuseModal(ctx, state);
}

function drawAccuseModal(ctx, state) {
  const g = GUESTS[state.accuseTarget];
  ctx.fillStyle = 'rgba(4,2,10,0.72)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 390, 210, 500, 280, 'rgba(24,14,36,0.98)', '#ff8a9a');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff8a9a'; ctx.font = 'bold 25px Georgia';
  ctx.fillText('THE SINGLE ACCUSATION', 640, 256);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 21px Georgia';
  ctx.fillText(`Accuse ${g.name}?`, 640, 296);
  ctx.font = '15px Georgia'; ctx.fillStyle = '#e8e2f2';
  wrap(ctx, `${g.mask} — suspicion ${matchesFor(state.accuseTarget, state.clues)}/${state.clues.length} clues matched. You have ONE accusation this case. Right: the case is solved. Wrong: the Thorn strikes and the case is lost.`, 640, 330, 420, 20, 4);
  ctx.fillStyle = '#8a2c3a'; ctx.strokeStyle = '#ff8a9a';
  ctx.beginPath(); ctx.roundRect(440, 420, 170, 42, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Georgia';
  ctx.fillText('ACCUSE!', 525, 447);
  reg(440, 420, 170, 42, 'accuse-confirm');
  ctx.fillStyle = '#3a2c55'; ctx.strokeStyle = '#8a7fd0';
  ctx.beginPath(); ctx.roundRect(670, 420, 170, 42, 7); ctx.fill(); ctx.stroke();
  ctx.fillText('NOT YET', 755, 447);
  reg(670, 420, 170, 42, 'accuse-cancel');
  ctx.textAlign = 'left';
}

// --- case board (meta screen) ---------------------------------------------------
export function drawBoard(ctx, state, t) {
  regions.length = 0;
  ctx.fillStyle = '#0d0a14'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#171126'; ctx.fillRect(24, 52, 1232, 640);
  ctx.strokeStyle = '#5a4a8a'; ctx.strokeRect(24, 52, 1232, 640);
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 26px Georgia'; ctx.textAlign = 'left';
  ctx.fillText(`CASE BOARD — ${state.kase.name}`, 48, 92);
  ctx.font = '14px Georgia'; ctx.fillStyle = '#c9bfe8';
  ctx.fillText(`Round ${state.round}/7 · Clues pinned ${state.clues.length} · Board ${state.boardPct}% complete · Candidates standing: ${candidatesFor(state.clues).length}/8 · ONE accusation`, 48, 116);

  const cands = candidatesFor(state.clues);
  const order = GUESTS.map((_, i) => i);
  if (state.tools.includes('notebook')) order.sort((a, b) => matchesFor(b, state.clues) - matchesFor(a, state.clues));
  const hasLedger = state.tools.includes('ledger');
  order.forEach((gi, k) => {
    const cx = 48 + (k % 4) * 224, cy = 132 + Math.floor(k / 4) * 196;
    const sel = state.selected === gi;
    const out = state.clues.length >= 2 && !cands.includes(gi);
    panel(ctx, cx, cy, 208, 180, sel ? 'rgba(70,40,110,0.95)' : 'rgba(22,17,40,0.95)', sel ? '#ffd76a' : '#5a4a8a');
    drawGuest(ctx, { id: gi, x: cx + 34, y: cy + 52, phase: gi * 1.3 }, t, { cleared: out });
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13.5px Georgia'; ctx.textAlign = 'left';
    wrap(ctx, GUESTS[gi].name, cx + 62, cy + 26, 138, 16, 2);
    ctx.font = '11.5px Georgia'; ctx.fillStyle = '#c9bfe8';
    ctx.fillText(GUESTS[gi].mask, cx + 62, cy + 62);
    const m = matchesFor(gi, state.clues);
    ctx.fillStyle = '#3a2c55'; ctx.fillRect(cx + 14, cy + 88, 180, 12);
    ctx.fillStyle = m >= 4 ? '#ff5a6e' : m >= 2 ? '#ffb34d' : '#8a7fd0';
    ctx.fillRect(cx + 14, cy + 88, 180 * (state.clues.length ? m / state.clues.length : 0), 12);
    ctx.fillStyle = '#ffe9b8'; ctx.font = 'bold 12px Georgia';
    ctx.fillText(`SUSPICION ${m}/${state.clues.length}`, cx + 14, cy + 118);
    ctx.font = '11px Georgia'; ctx.fillStyle = out ? '#ff9a9a' : '#a8ffd8';
    ctx.fillText(out ? '✕ CLEARED BY THE EVIDENCE' : state.clearedInnocent === gi ? '✕ CLEARED BY THE THORN SNARE' : '· still a candidate', cx + 14, cy + 138);
    if (hasLedger) {
      ctx.fillStyle = '#9fd4ff'; ctx.font = '11px Georgia';
      ctx.fillText(`Alibi claimed: ${state.kase.claims[gi] === 'library' ? 'Library' : state.kase.claims[gi] === 'conservatory' ? 'Conservatory' : 'the ball'}`, cx + 14, cy + 158);
    }
    reg(cx, cy, 208, 180, 'select', gi);
  });

  // Pinned clues column
  panel(ctx, 952, 132, 280, 388);
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 15px Georgia';
  ctx.fillText('PINNED EVIDENCE', 968, 160);
  ctx.font = '13px Georgia';
  let y = 188;
  if (!state.clues.length) { ctx.fillStyle = '#9a92b8'; wrap(ctx, 'No clues yet. Walk the manor and gather the glowing tokens.', 968, y, 248, 17, 3); }
  const seen = new Set();
  for (const c of state.clues) {
    if (seen.has(c.type)) continue; seen.add(c.type);
    const ct = CLUE_BY_ID[c.type];
    ctx.fillStyle = '#ffe9b8';
    ctx.fillText(`${ct.icon} ${ct.name}`, 968, y); y += 17;
    ctx.fillStyle = '#e8e2f2';
    y = wrap(ctx, '→ ' + ct.values[c.value], 984, y, 232, 16, 2); y += 8;
    // link line from the clue to the selected suspect card
    if (state.selected != null) {
      ctx.strokeStyle = 'rgba(255,215,106,0.35)';
      ctx.beginPath(); ctx.moveTo(952, y - 22); ctx.lineTo(940, 300); ctx.stroke();
    }
  }
  ctx.fillStyle = '#9a92b8'; ctx.font = '12px Georgia';
  wrap(ctx, 'Footprint + silk + seal together always name exactly one guest. Perfume, key and alibi confirm — or expose a guess.', 968, 470, 248, 16, 4);

  // Buttons
  ctx.fillStyle = state.selected != null ? '#8a2c3a' : '#3a2c3a'; ctx.strokeStyle = '#ff8a9a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(48, 540, 260, 48, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Georgia'; ctx.textAlign = 'center';
  ctx.fillText(state.selected != null ? `ACCUSE ${GUESTS[state.selected].name.split(' ').slice(-1)[0].toUpperCase()} — FINAL` : 'SELECT A SUSPECT', 178, 570);
  if (state.selected != null) reg(48, 540, 260, 48, 'accuse-from-board');
  ctx.fillStyle = '#3a2c55'; ctx.strokeStyle = '#8a7fd0';
  ctx.beginPath(); ctx.roundRect(952, 540, 280, 48, 7); ctx.fill(); ctx.stroke();
  ctx.fillText('BACK TO THE BALL (ESC)', 1092, 570);
  reg(952, 540, 280, 48, 'close-board');
  ctx.textAlign = 'left';
  drawFx(ctx);
}

// --- draft screen -----------------------------------------------------------------
export function drawDraft(ctx, state, t) {
  regions.length = 0;
  ctx.fillStyle = '#0d0a14'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (const room of ROOMS) { drawRoomTexture(ctx, room, t); }
  ctx.fillStyle = 'rgba(6,4,14,0.78)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#a8ffd8'; ctx.font = 'bold 30px Georgia';
  ctx.fillText('CASE SOLVED — THE DETECTIVE\'S DRAFT', 640, 120);
  ctx.fillStyle = '#e8e2f2'; ctx.font = '16px Georgia';
  ctx.fillText('Choose ONE tool to carry into the next case. Tools are permanent for the whole campaign.', 640, 152);
  state.draftChoices.forEach((id, k) => {
    const cx = 190 + k * 320, cy = 210;
    const tool = TOOL_BY_ID[id];
    panel(ctx, cx, cy, 280, 300, 'rgba(26,19,46,0.97)', '#ffd76a');
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 34px Georgia';
    ctx.fillText(['🔍', '📖', '📯', '🧤', '🕯', '📓', '🪞', '🪤'][TOOLS.findIndex((x) => x.id === id)] || '◆', cx + 140, cy + 66);
    ctx.font = 'bold 20px Georgia'; ctx.fillStyle = '#fff';
    ctx.fillText(tool.name, cx + 140, cy + 110);
    ctx.font = '14.5px Georgia'; ctx.fillStyle = '#e8e2f2';
    wrap(ctx, tool.desc, cx + 140, cy + 146, 236, 20, 6);
    ctx.fillStyle = '#5a3a8a'; ctx.strokeStyle = '#c9a8ff';
    ctx.beginPath(); ctx.roundRect(cx + 60, cy + 238, 160, 40, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Georgia';
    ctx.fillText('TAKE THIS TOOL', cx + 140, cy + 264);
    reg(cx, cy, 280, 300, 'draft', id);
  });
  ctx.textAlign = 'left';
  drawFx(ctx);
}

// --- title screen -------------------------------------------------------------------
export function drawTitle(ctx, state, t) {
  regions.length = 0;
  ctx.fillStyle = '#0d0a14'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (const room of ROOMS) { drawRoomTexture(ctx, room, t); drawFurniture(ctx, room); }
  ctx.fillStyle = 'rgba(6,4,14,0.66)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (state.kase) for (const g of state.kase.guests) drawGuest(ctx, g, t, {});
  panel(ctx, 36, 56, 1208, 640, 'rgba(13,9,24,0.90)', '#8a6fd0');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 44px Georgia';
  ctx.fillText('MASQUERADE MANOR', 640, 108);
  ctx.fillStyle = '#ffb0a8'; ctx.font = 'bold 16.5px Georgia';
  ctx.fillText('One guest is the Thorn: 7 rounds · 8 guests · 6 clue types · 8 tools · final case The Thorn Unmasked', 640, 134);
  ctx.textAlign = 'left';
  // How to play
  ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 15px Georgia';
  ctx.fillText('HOW TO PLAY', 60, 168);
  ctx.font = '13px Georgia'; ctx.fillStyle = '#e8e2f2';
  const how = [
    '• Walk the manor (WASD / arrows, or click). Guests wander, mingle and slip away.',
    '• Gather glowing CLUE TOKENS — 6 types: footprint, torn silk, wax seal,',
    '  perfume vial, scratched key, false alibi. Each reports a TRUE trait of the Thorn.',
    '• Observe guests up close (E / click) and read the INCIDENTS feed: who avoids',
    '  whom, who lingers at the conservatory door.',
    '• Pin evidence on the CASE BOARD (C): suspicion meters, alibis, candidates.',
    '• Footprint + silk + seal together ALWAYS name exactly one guest.',
    '• Spend your SINGLE ACCUSATION wisely: right = case solved (+6,000 and a',
    '  bonus per round spared). Wrong = the Thorn strikes, the case is lost.',
    '• 3 cases of 7 rounds, then ENDLESS cases. Draft 1-of-3 tools between cases.',
  ];
  let y = 190;
  for (const line of how) { ctx.fillText(line, 60, y); y += 19; }
  // Difficulties
  ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 15px Georgia';
  ctx.fillText('DIFFICULTY (click to choose)', 60, y + 14);
  y += 24;
  DIFFICULTIES.forEach((d, i) => {
    const sel = state.difficulty === i;
    ctx.fillStyle = sel ? '#5a3a8a' : '#241a3a'; ctx.strokeStyle = sel ? '#ffd76a' : '#5a4a8a';
    ctx.beginPath(); ctx.roundRect(60 + i * 196, y, 184, 44, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13.5px Georgia'; ctx.textAlign = 'center';
    ctx.fillText(`${d.name} — ${d.roundSeconds}s rounds`, 60 + i * 196 + 92, y + 19);
    ctx.font = '10.5px Georgia'; ctx.fillStyle = '#c9bfe8';
    ctx.fillText(i === 2 ? '+ Endless after Case III' : d.desc.split(',')[0], 60 + i * 196 + 92, y + 35);
    reg(60 + i * 196, y, 184, 44, 'difficulty', i);
    ctx.textAlign = 'left';
  });
  // Bestiary
  const bx = 700, by = 160;
  ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 15px Georgia';
  ctx.fillText('THE EIGHT GUESTS — AND THEIR TELLS', bx, by + 8);
  ctx.font = '11.8px Georgia';
  let gy = by + 32;
  GUESTS.forEach((g, i) => {
    ctx.fillStyle = GUESTS[i].accent;
    ctx.fillRect(bx, gy - 9, 10, 10);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Georgia';
    ctx.fillText(`${g.name} — ${g.mask}`, bx + 16, gy);
    ctx.font = '11.8px Georgia'; ctx.fillStyle = '#c9bfe8';
    gy = wrap(ctx, g.tell, bx + 16, gy + 15, 500, 14, 2);
    gy += 12;
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 19px Georgia';
  ctx.fillText('CLICK OR PRESS ENTER — THE BALL BEGINS', 640, 676);
  ctx.textAlign = 'left';
  drawFx(ctx);
}

// --- case clear & end screens ---------------------------------------------------------
export function drawCaseClear(ctx, state, t) {
  regions.length = 0;
  ctx.fillStyle = '#0d0a14'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (const room of ROOMS) drawRoomTexture(ctx, room, t);
  ctx.fillStyle = 'rgba(6,10,6,0.74)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#a8ffd8'; ctx.font = 'bold 40px Georgia';
  ctx.fillText('CASE SOLVED', 640, 220);
  ctx.fillStyle = '#fff'; ctx.font = '19px Georgia';
  ctx.fillText(`The Thorn was ${GUESTS[state.kase.culprit].name} — caught by the evidence, not a guess.`, 640, 262);
  ctx.font = '16px Georgia'; ctx.fillStyle = '#e8e2f2';
  ctx.fillText(`Case score: base 6,000 · rounds spared ×900 · clue chains · Score now ${state.score}`, 640, 300);
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 18px Georgia';
  ctx.fillText(state.kase.num === 3 ? 'CLICK — THE FINAL RESULTS' : state.kase.num > 3 ? 'CLICK — DRAFT A TOOL, THE BALL GOES ON' : 'CLICK — DRAFT A DETECTIVE TOOL', 640, 380);
  ctx.textAlign = 'left';
  drawFx(ctx);
}

export function rankFor(score, victory) {
  if (!victory) return 'F';
  if (score >= 40000) return 'S';
  if (score >= 32000) return 'A';
  if (score >= 24000) return 'B';
  if (score >= 16000) return 'C';
  return 'D';
}

export function drawEnd(ctx, state, t) {
  regions.length = 0;
  ctx.fillStyle = '#0d0a14'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (const room of ROOMS) drawRoomTexture(ctx, room, t);
  ctx.fillStyle = 'rgba(5,3,12,0.82)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 240, 60, 800, 600, 'rgba(15,11,28,0.96)', state.victory ? '#ffd76a' : '#ff8a9a');
  ctx.textAlign = 'center';
  ctx.fillStyle = state.victory ? '#a8ffd8' : '#ff9a9a'; ctx.font = 'bold 34px Georgia';
  ctx.fillText(state.victory ? 'THE THORN IS UNMASKED' : 'THE THORN STRIKES', 640, 116);
  ctx.fillStyle = '#e8e2f2'; ctx.font = '15.5px Georgia';
  ctx.fillText(state.endLine || '', 640, 144);
  const rank = rankFor(state.score, state.victory);
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 92px Georgia';
  ctx.fillText(rank, 380, 262);
  ctx.font = 'bold 15px Georgia'; ctx.fillStyle = '#c9bfe8';
  ctx.fillText('DETECTIVE RANK', 380, 292);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 40px Georgia';
  ctx.fillText(`${state.score}`, 800, 250);
  ctx.font = '14px Georgia'; ctx.fillStyle = '#c9bfe8';
  ctx.fillText('FINAL SCORE', 800, 276);
  const s = state.stats;
  const rows = [
    ['Cases solved', `${s.casesSolved} / 3${state.endlessPlayed ? ' + endless ' + state.endlessPlayed : ''}`],
    ['Clues gathered', `${s.clues}`],
    ['Clue types completed', `${s.typesCompleted} / 6`],
    ['Guests observed', `${s.observations}`],
    ['Incidents logged', `${s.incidents}`],
    ['Best clue chain', `×${s.bestChain}`],
    ['Rounds used', `${s.roundsUsed}`],
    ['Accusations made', `${s.accusations} (1 per case)`],
    ['Wrong accusations', `${s.wrong}`],
    ['Tools carried', `${state.tools.length} / 8`],
  ];
  ctx.font = '15px Georgia'; ctx.textAlign = 'left';
  let y = 330;
  rows.forEach(([k, v], i) => {
    const cx = i % 2 === 0 ? 300 : 660, cy = y + Math.floor(i / 2) * 34;
    ctx.fillStyle = '#9a92b8'; ctx.fillText(k, cx, cy);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Georgia';
    ctx.fillText(v, cx + 170, cy);
    ctx.font = '15px Georgia';
  });
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 14.5px Georgia';
  ctx.fillText('TOOLS RECAP', 300, 540);
  ctx.font = '13.5px Georgia'; ctx.fillStyle = '#e8e2f2';
  const recap = state.tools.length ? state.tools.map((id) => TOOL_BY_ID[id].name).join('  ·  ') : 'None — the manor keeps its secrets.';
  wrap(ctx, recap, 300, 564, 680, 18, 3);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 17px Georgia';
  ctx.fillText('CLICK OR PRESS ENTER — A NEW BALL, A NEW THORN (ENDLESS CASES AWAIT)', 640, 636);
  ctx.textAlign = 'left';
  drawFx(ctx);
}

export function drawScene(ctx, state, t) {
  if (state.mode === 'title') drawTitle(ctx, state, t);
  else if (state.mode === 'board') drawBoard(ctx, state, t);
  else if (state.mode === 'draft') drawDraft(ctx, state, t);
  else if (state.mode === 'caseclear') drawCaseClear(ctx, state, t);
  else if (state.mode === 'end') drawEnd(ctx, state, t);
  else drawPlay(ctx, state, t);
}
