// MASQUERADE MANOR — world building: trait assignment, case generation
// with a *verified* unique solution, clue-token scheduling, guest agents
// and the incidents feed.
//
// Trait bits for guest i (see config.js for the reasoning):
//   footprint = bit2(i)            silk  = bit1(i)          seal = bit0(i)
//   perfume   = bit2(i) XOR bit0   key   = bit1(i) XOR bit0
//   alibi     = bit2(i) XOR bit1   (the room the culprit falsely claimed)
// The first three are independent, so footprint+silk+seal always isolate
// exactly one guest. buildCase() checks that claim for the drawn culprit
// before the case is allowed to start — a case that cannot be solved
// cannot be served.

import { GUESTS, CLUE_TYPES, ROOMS, ROOM_BY_ID } from './config.js';
import { makeRng, randRange, randInt, pick, shuffle } from './rng.js';

export function traitBits(i) {
  const b2 = (i >> 2) & 1, b1 = (i >> 1) & 1, b0 = i & 1;
  return {
    footprint: b2,
    silk: b1,
    seal: b0,
    perfume: b2 ^ b0,
    key: b1 ^ b0,
    alibi: b2 ^ b1,
  };
}
export const GUEST_TRAITS = GUESTS.map((_, i) => traitBits(i));

// Guests consistent with a set of collected clues: [{type, value}].
export function candidatesFor(clues) {
  return GUESTS.map((g, i) => i).filter((i) =>
    clues.every((c) => GUEST_TRAITS[i][c.type] === c.value));
}

// How many collected clues point at guest i (their suspicion numerator).
export function matchesFor(i, clues) {
  return clues.reduce((n, c) => n + (GUEST_TRAITS[i][c.type] === c.value ? 1 : 0), 0);
}

function roomPoint(rng, room, pad = 30) {
  return {
    x: randRange(rng, room.x + pad, room.x + room.w - pad),
    y: randRange(rng, room.y + pad + 8, room.y + room.h - pad),
    room: room.id,
  };
}

export function roomAt(x, y) {
  for (const r of ROOMS) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
  }
  return ROOM_BY_ID.gallery;
}

// Build one case. `caseNum` 1..3 is the campaign; 4+ are endless cases
// (decoys return, and the culprit is never the previous case's culprit).
export function buildCase(caseNum, seed, prevCulprit = -1) {
  const rng = makeRng(seed ^ (caseNum * 0x9e3779b9));
  let culprit = randInt(rng, 0, 7);
  if (culprit === prevCulprit) culprit = (culprit + 3) % 8;

  const final = caseNum === 3;
  const decoyCount = caseNum === 3 ? 2 : (caseNum > 3 ? 2 : 0);
  const others = shuffle(rng, GUESTS.map((_, i) => i).filter((i) => i !== culprit));
  const decoys = others.slice(0, decoyCount);

  // Clue schedule: the three independent clues always arrive inside the
  // first four tokens, then the three confirming clues, then repeats of
  // already-true findings for the remaining rounds (they pay chain score
  // and let a careful player double-check a parity trait).
  const independent = shuffle(rng, ['footprint', 'silk', 'seal']);
  const confirming = shuffle(rng, ['perfume', 'key', 'alibi']);
  const scheduleTypes = [...independent.slice(0, 2), ...confirming.slice(0, 1),
    independent[2], ...confirming.slice(1)];
  const repeats = shuffle(rng, CLUE_TYPES.map((c) => c.id));
  const allTypes = [...scheduleTypes, ...repeats, ...shuffle(rng, CLUE_TYPES.map((c) => c.id))];

  const tokensByRound = [];
  let ti = 0;
  for (let round = 1; round <= 7; round++) {
    const count = round <= 2 ? 2 : 1;
    const toks = [];
    for (let k = 0; k < count; k++) {
      const type = allTypes[ti++ % allTypes.length];
      const room = pick(rng, ROOMS);
      const p = roomPoint(rng, room, 36);
      toks.push({ type, value: GUEST_TRAITS[culprit][type], x: p.x, y: p.y, room: room.id, taken: false, bob: rng() * 6.28 });
    }
    tokensByRound.push(toks);
  }

  // Verify solvability with the three independent clues alone.
  const proof = candidatesFor([
    { type: 'footprint', value: GUEST_TRAITS[culprit].footprint },
    { type: 'silk', value: GUEST_TRAITS[culprit].silk },
    { type: 'seal', value: GUEST_TRAITS[culprit].seal },
  ]);
  if (proof.length !== 1 || proof[0] !== culprit) {
    throw new Error('unsolvable case generated');
  }

  // Guest agents: everyone starts in the ballroom or a neighbouring room
  // and wanders between waypoints; the culprit drifts to the conservatory
  // door more often than anyone else — a soft behavioural hint, never
  // proof (decoys in the final case do the same).
  const guests = GUESTS.map((g, i) => {
    const startRoom = i === culprit ? ROOM_BY_ID.ballroom : pick(rng, ROOMS);
    const p = roomPoint(rng, startRoom, 34);
    return {
      id: i, name: g.name, x: p.x, y: p.y, tx: p.x, ty: p.y,
      room: startRoom.id, wait: randRange(rng, 0, 2.5), phase: rng() * 6.28,
      observedRound: 0, slipped: false,
    };
  });

  // Each guest's claimed alibi for this case: innocents claim the room
  // they genuinely spend the ball in; the culprit claims trait room.
  const claims = GUESTS.map((_, i) => {
    if (i === culprit) return GUEST_TRAITS[i].alibi === 0 ? 'library' : 'conservatory';
    return guests[i].room;
  });

  return {
    num: caseNum, seed, culprit, decoys, guests, tokensByRound, claims,
    // Per-guest count of entries into the conservatory this case. The
    // Thorn (and the final case's decoys) drift there far more often
    // than anyone else, so a rising tally is a real behavioural tell —
    // main.js increments it, render.js shows the leaders on the
    // suspicion panel. A hint, never proof: only clues convict.
    linger: GUESTS.map(() => 0),
    final, name: final ? 'Case III — The Thorn Unmasked'
      : caseNum === 1 ? 'Case I — The Sealed Invitation'
      : caseNum === 2 ? 'Case II — The Conservatory Door'
      : `Endless Case ${caseNum - 3} — The Mask Returns`,
    rngState: rng,
  };
}

// Advance one guest agent; returns an incident string when the guest
// slips into a new room, or null. The culprit (and decoys) favour the
// conservatory, which is exactly the kind of thing the feed reports.
export function stepGuest(kase, guest, dt, rng) {
  guest.wait -= dt;
  const dx = guest.tx - guest.x, dy = guest.ty - guest.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 4) {
    const sp = 46 * dt;
    guest.x += (dx / dist) * Math.min(sp, dist);
    guest.y += (dy / dist) * Math.min(sp, dist);
    guest.room = roomAt(guest.x, guest.y).id;
    return null;
  }
  if (guest.wait > 0) return null;
  guest.wait = randRange(rng, 1.2, 4.2);
  const isThornSide = guest.id === kase.culprit || kase.decoys.includes(guest.id);
  let room;
  if (isThornSide && rng() < 0.42) room = ROOM_BY_ID.conservatory;
  else room = pick(rng, ROOMS);
  const p = roomPoint(rng, room, 34);
  guest.tx = p.x; guest.ty = p.y;
  const from = guest.room;
  guest.room = room.id;
  if (from !== room.id && rng() < 0.6) {
    return `${guest.name} slipped away to the ${room.name}.`;
  }
  return null;
}

// A sighting incident aimed at the culprit — used for the round banner.
// It is always literally true: the culprit's agent really is in (or has
// just entered) the named room when the banner fires.
export function culpritSighting(kase) {
  const g = kase.guests[kase.culprit];
  const room = ROOM_BY_ID[g.room] || ROOM_BY_ID.ballroom;
  return `THE THORN WAS SEEN IN THE ${room.name.toUpperCase()}`;
}
