// MASQUERADE MANOR — main loop and game state.
//
// A masked ball in a manor. Eight AI guests wander, mingle and slip
// away; one is secretly the Thorn, drawn by the seeded RNG. The player
// walks the rooms, gathers clue tokens (each reports a TRUE trait of
// the Thorn), reads the incidents feed, pins evidence on the case board
// and spends a single accusation per case. Three cases of seven rounds,
// a 1-of-3 tool draft between cases, then endless cases.

import { ROUNDS_PER_CASE, SCORE, DIFFICULTIES, TOOLS, PICKUP_RADIUS, ROOM_BY_ID } from './config.js';
import { buildCase, stepGuest, culpritSighting, candidatesFor } from './world.js';
import { drawScene, regions, burst, floatText, updateFx, clearFx } from './render.js';
import { updateHud, setMessage } from './hud.js';
import { attachInput } from './input.js';
import { initAudio, sfx } from './audio.js';
import { makeRng } from './rng.js';
import { setupShotScene } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const BASE_SEED = 20261117;

const state = {
  mode: 'title',           // title | play | board | draft | caseclear | end
  kase: null, round: 1, timeLeft: 0, roundSeconds: DIFFICULTIES[1].roundSeconds,
  difficulty: 1,
  clues: [], tokens: [], feed: [], banner: { text: '', timer: 0 },
  player: { x: 500, y: 300, tx: null, ty: null, moving: false },
  score: 0, chain: 0, chainTimer: 0, boardPct: 0,
  tools: [], selected: null, accuseTarget: null, clearedInnocent: -1,
  draftChoices: [], victory: false, endLine: '', endlessPlayed: 0, pendingNext: null,
  trail: { timer: 0, points: [] }, paused: false, shotMode: null,
  stats: null, seed: BASE_SEED, ambientTimer: 6, scoredIncidents: 0,
};
window.__masquerade = state;

const rng = makeRng(BASE_SEED ^ 0x7a11);
let input = { keys: new Set() };

function freshStats() {
  return { casesSolved: 0, clues: 0, typesCompleted: 0, observations: 0, incidents: 0, bestChain: 0, roundsUsed: 0, accusations: 0, wrong: 0 };
}
state.stats = freshStats();

function hasTool(id) { return state.tools.includes(id); }

function pushFeed(line, scored = false) {
  state.feed.unshift(line);
  if (state.feed.length > 12) state.feed.pop();
  state.stats.incidents++;
  if (scored && state.scoredIncidents < 4) { state.score += SCORE.incident; state.scoredIncidents++; }
}

function computeBoard() {
  const cands = candidatesFor(state.clues).length;
  const types = new Set(state.clues.map((c) => c.type)).size;
  state.boardPct = Math.round(((8 - cands) / 7) * 70 + (types / 6) * 30);
}

// --- Case / round flow ---------------------------------------------------------
function startCase(num) {
  const prev = state.kase ? state.kase.culprit : -1;
  state.kase = buildCase(num, state.seed + num * 131, prev);
  state.round = 0;
  state.clues = [];
  state.selected = null;
  state.accuseTarget = null;
  state.clearedInnocent = -1;
  if (hasTool('snare')) {
    const innocents = state.kase.guests.map((g) => g.id)
      .filter((i) => i !== state.kase.culprit && !state.kase.decoys.includes(i));
    state.clearedInnocent = innocents[Math.floor(rng() * innocents.length)];
  }
  state.feed = [`${state.kase.name}. Eight masks, one Thorn. Find the truth before round 7 ends.`];
  if (state.clearedInnocent >= 0) {
    pushFeed(`The Thorn Snare stirs: ${state.kase.guests[state.clearedInnocent].name} is provably innocent.`);
  }
  computeBoard();
  nextRound();
  state.mode = 'play';
}

function nextRound() {
  state.round++;
  state.stats.roundsUsed++;
  state.scoredIncidents = 0;
  state.timeLeft = state.roundSeconds;
  const base = state.kase.tokensByRound[state.round - 1] || [];
  state.tokens = base.map((t) => ({ ...t, taken: false }));
  if (hasTool('lens') && base.length) {
    const extra = base[0];
    state.tokens.push({ ...extra, x: Math.min(1210, extra.x + 90), y: Math.max(90, extra.y - 50), taken: false });
  }
  for (const g of state.kase.guests) g.observedRound = 0;
  // The Candle Lantern shows the Thorn's trail early in the round.
  state.trail = { timer: 0, points: [] };
  if (hasTool('lantern')) {
    const c = state.kase.guests[state.kase.culprit];
    state.trail = {
      timer: 4,
      points: Array.from({ length: 7 }, (_, i) => ({ x: c.x - i * 14 + (rng() - 0.5) * 16, y: c.y + (rng() - 0.5) * 22 })),
    };
  }
  // A true sighting banner on the tense rounds.
  if (state.round === 3 || state.round === 6 || (state.kase.final && state.round === 7)) {
    state.banner = { text: culpritSighting(state.kase), timer: 3.6 };
    sfx.bell();
  }
  if (hasTool('trumpet')) {
    const g = state.kase.guests[Math.floor(rng() * 8)];
    pushFeed(`Heard through the Ear Trumpet: ${g.name} is in the ${ROOM_BY_ID[g.room].name} right now.`, true);
  }
  setMessage(`Round ${state.round} of ${ROUNDS_PER_CASE} — gather clues, watch the guests. C opens the case board.`);
}

function startRun() {
  state.score = 0;
  state.stats = freshStats();
  state.tools = [];
  state.endlessPlayed = 0;
  state.victory = false;
  state.roundSeconds = DIFFICULTIES[state.difficulty].roundSeconds;
  startCase(1);
}

function endRun(victory, line) {
  state.victory = victory;
  state.endLine = line;
  state.mode = 'end';
  if (victory) sfx.solved(); else sfx.strike();
}

function solveCase() {
  const spared = ROUNDS_PER_CASE - state.round;
  let gain = SCORE.caseBase + spared * SCORE.roundSpared;
  if (state.kase.final) gain += SCORE.finalBonus;
  if (state.kase.num > 3) gain += SCORE.endlessBase - SCORE.caseBase;
  state.score += gain;
  state.stats.casesSolved++;
  state.stats.typesCompleted = Math.max(state.stats.typesCompleted, new Set(state.clues.map((c) => c.type)).size);
  floatText(state.player.x, state.player.y - 40, `+${gain} CASE SOLVED`, '#a8ffd8');
  state.mode = 'caseclear';
  sfx.solved();
}

function accuse(id) {
  state.accuseTarget = null;
  state.stats.accusations++;
  if (id === state.kase.culprit) { solveCase(); return; }
  state.stats.wrong++;
  endRun(false, `You accused ${state.kase.guests[id].name} — an innocent mask. In the hush that followed, the Thorn struck, and ${state.kase.name} went cold.`);
}

function openDraftOrNext() {
  const next = state.kase.num + 1;
  if (state.kase.num === 3) { endRun(true, 'All three cases solved. The manor breathes again — and endless cases wait beyond the ball.'); return; }
  state.pendingNext = next;
  const unowned = TOOLS.map((t) => t.id).filter((id) => !hasTool(id));
  if (!unowned.length) { startCase(next); return; }
  const shuffled = unowned.sort(() => rng() - 0.5);
  state.draftChoices = shuffled.slice(0, Math.min(3, shuffled.length));
  state.mode = 'draft';
}

// --- Actions ----------------------------------------------------------------------
function collectToken(tok) {
  tok.taken = true;
  state.chain = state.chainTimer > 0 ? state.chain + 1 : 1;
  state.chainTimer = 4;
  state.stats.bestChain = Math.max(state.stats.bestChain, state.chain);
  const isNew = !state.clues.some((c) => c.type === tok.type);
  if (isNew) state.clues.push({ type: tok.type, value: tok.value });
  state.stats.clues++;
  const gain = SCORE.clue * state.chain;
  state.score += gain;
  computeBoard();
  burst(tok.x, tok.y, '#ffd76a', 14, 130);
  floatText(tok.x, tok.y - 18, `+CLUE ${gain}`, '#ffd76a');
  sfx.clue();
  pushFeed(isNew
    ? `Clue pinned: ${tok.type} — evidence about the Thorn secured.`
    : `Another ${tok.type} token — it confirms what the board already says.`, true);
}

function observe(guest) {
  if (guest.observedRound === state.round) { setMessage(`${guest.name} has nothing new for you this round.`); return; }
  guest.observedRound = state.round;
  state.stats.observations++;
  state.score += SCORE.observe;
  floatText(guest.x, guest.y - 34, `+${SCORE.observe} OBSERVED`, '#7fd4ff');
  burst(guest.x, guest.y, '#7fd4ff', 8, 90);
  sfx.observe();
  if (hasTool('mirror')) {
    pushFeed(`Silver Mirror — ${guest.name}'s tell: ${guestTell(guest.id)}`, true);
  } else {
    pushFeed(`You observe ${guest.name} in the ${ROOM_BY_ID[guest.room].name}. Nothing in their hands. Yet.`, true);
  }
}
function guestTell(id) {
  return ['Never dances; watches the conservatory door.', 'Laughs a beat too late at every joke.', 'Fans herself when the music stops.', 'Counts the candles, then the exits.', 'Greets every guest by name — except one.', 'Blesses the punch bowl; never drinks.', 'Her dance card has one name crossed out.', 'Tells the same war story with a new ending.'][id];
}

// --- Simulation ---------------------------------------------------------------------
function update(dt) {
  if (state.banner.timer > 0) state.banner.timer -= dt;
  if (state.chainTimer > 0) { state.chainTimer -= dt; if (state.chainTimer <= 0) state.chain = 0; }
  if (state.trail.timer > 0) state.trail.timer -= dt;
  updateFx(dt);
  if (state.mode !== 'play' || state.paused || state.accuseTarget != null) return;

  // Player movement: keys, or walk-to target from a click.
  const p = state.player;
  let mx = 0, my = 0;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) mx -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) mx += 1;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) my -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) my += 1;
  if (mx || my) { p.tx = null; const l = Math.hypot(mx, my); mx /= l; my /= l; }
  else if (p.tx != null) {
    const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
    if (d < 6) { p.tx = null; } else { mx = dx / d; my = dy / d; }
  }
  p.moving = !!(mx || my);
  if (p.moving) {
    p.x = Math.max(30, Math.min(1250, p.x + mx * 178 * dt));
    p.y = Math.max(70, Math.min(452, p.y + my * 178 * dt));
  }

  // Guests wander; their room changes become incidents. Entries into
  // the conservatory are tallied per guest — the linger tracker the
  // suspicion panel reads (the Thorn and its decoys drift there).
  for (const g of state.kase.guests) {
    const before = g.room;
    const inc = stepGuest(state.kase, g, dt, rng);
    if (g.room === 'conservatory' && before !== 'conservatory') state.kase.linger[g.id]++;
    if (inc) pushFeed(inc, true);
  }
  // Ambient social texture: who avoids whom.
  state.ambientTimer -= dt;
  if (state.ambientTimer <= 0) {
    state.ambientTimer = 9 + rng() * 5;
    const a = state.kase.guests[Math.floor(rng() * 8)];
    const b = state.kase.guests[Math.floor(rng() * 8)];
    if (a.id !== b.id) pushFeed(`${a.name} keeps a careful distance from ${b.name}.`);
  }

  // Clue pickup.
  const radius = hasTool('gloves') ? PICKUP_RADIUS * 2 : PICKUP_RADIUS;
  for (const tok of state.tokens) {
    if (!tok.taken && Math.hypot(tok.x - p.x, tok.y - p.y) < radius) collectToken(tok);
  }

  // Round clock.
  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    if (state.round >= ROUNDS_PER_CASE) {
      endRun(false, `The seventh round ended with the Thorn still masked. ${state.kase.name} goes into the cold drawer.`);
      return;
    }
    nextRound();
  }
}

// --- Input ----------------------------------------------------------------------------
function nearestGuest(x, y, maxD) {
  let best = null, bd = maxD;
  for (const g of state.kase.guests) {
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < bd) { bd = d; best = g; }
  }
  return best;
}

function handleRegion(r) {
  if (r.action === 'board') { state.mode = 'board'; sfx.pin(); }
  else if (r.action === 'close-board') { state.mode = 'play'; }
  else if (r.action === 'select') { state.selected = r.data; sfx.pin(); }
  else if (r.action === 'accuse-from-board') { state.accuseTarget = state.selected; state.mode = 'play'; }
  else if (r.action === 'accuse-confirm') { accuse(state.accuseTarget); }
  else if (r.action === 'accuse-cancel') { state.accuseTarget = null; }
  else if (r.action === 'draft') {
    state.tools.push(r.data); sfx.draft();
    startCase(state.pendingNext ?? state.kase.num + 1);
    state.pendingNext = null;
  } else if (r.action === 'difficulty') { state.difficulty = r.data; state.roundSeconds = DIFFICULTIES[r.data].roundSeconds; }
  else if (r.action === 'guest') {
    const g = state.kase.guests[r.data];
    if (Math.hypot(g.x - state.player.x, g.y - state.player.y) < 95) observe(g);
    else { state.player.tx = g.x; state.player.ty = g.y; }
  }
}

input = attachInput(canvas, {
  onMove() {},
  onTap(x, y) {
    initAudio();
    if (state.shotMode) return;
    for (let i = regions.length - 1; i >= 0; i--) {
      const r = regions[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { handleRegion(r); return; }
    }
    if (state.mode === 'title') { startRun(); return; }
    if (state.mode === 'caseclear') { openDraftOrNext(); return; }
    if (state.mode === 'end') {
      if (state.victory && state.kase && state.kase.num >= 3 && state.stats.casesSolved >= 3) {
        state.endlessPlayed++;
        state.pendingNext = 3 + state.endlessPlayed;
        const unowned = TOOLS.map((t) => t.id).filter((id) => !hasTool(id));
        if (unowned.length) { state.draftChoices = unowned.sort(() => rng() - 0.5).slice(0, 3); state.mode = 'draft'; }
        else { startCase(state.pendingNext); state.pendingNext = null; }
        return;
      }
      startRun(); return;
    }
    if (state.mode === 'play') { state.player.tx = x; state.player.ty = Math.min(452, Math.max(70, y)); }
  },
  onKey(code) {
    initAudio();
    if (state.shotMode) return;
    if (code === 'Enter' || code === 'Space') {
      if (state.mode === 'title') startRun();
      else if (state.mode === 'caseclear') openDraftOrNext();
      else if (state.mode === 'end') startRun();
      return;
    }
    if (code === 'KeyC') {
      if (state.mode === 'play') state.mode = 'board';
      else if (state.mode === 'board') state.mode = 'play';
      return;
    }
    if (code === 'Escape') {
      if (state.mode === 'board') state.mode = 'play';
      if (state.accuseTarget != null) state.accuseTarget = null;
      return;
    }
    if (code === 'KeyP' && state.mode === 'play') { state.paused = !state.paused; return; }
    if (code === 'KeyE' && state.mode === 'play') {
      const g = nearestGuest(state.player.x, state.player.y, 80);
      if (g) observe(g);
    }
  },
});

// --- Boot -------------------------------------------------------------------------------
const api = { startCase, startRun };
if (!setupShotScene(state, api)) {
  state.kase = buildCase(1, state.seed + 131, -1);
  state.mode = 'title';
}

let last = performance.now();
let simT = 0;
let shotFrame = 0;
const SHOT_FREEZE_FRAME = 150;
function frame(now) {
  if (state.shotMode) {
    if (shotFrame < SHOT_FREEZE_FRAME) {
      shotFrame++;
      simT += 1 / 60;
      if (state.mode === 'play' && !state.shotFrozen) { /* staged scenes hold still */ }
      updateFx(1 / 60);
      if (state.banner.timer > 0) state.banner.timer = Math.max(state.banner.timer, 3);
      if (shotFrame === SHOT_FREEZE_FRAME) { clearFx(); window.__shotReady = true; }
    }
    drawScene(ctx, state, simT);
    updateHud(state);
    requestAnimationFrame(frame);
    return;
  }
  const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  simT += dt;
  update(dt);
  drawScene(ctx, state, simT);
  updateHud(state);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
