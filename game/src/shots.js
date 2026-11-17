// Deterministic screenshot scenes for MASQUERADE MANOR, driven by the URL:
//   ?shot=climax&seed=7  final case, round 7: the accusation moment, the
//                        Thorn-sighting banner up, full HUD and panels
//   ?shot=board&seed=7   the case board: six clues pinned, suspicion
//                        meters live, one suspect selected
//   ?shot=title&seed=7   the dense title: how-to, all eight guests and
//                        their tells, difficulties and the endless mode
//   ?shot=end&seed=7     the victory end screen: rank, ten stats, tools
// Each scene is built from the game's own case generator with a fixed
// seed, then the main loop freezes it and raises window.__shotReady.
// Without a ?shot param this module does nothing.

import { CLUE_TYPES } from './config.js';
import { GUEST_TRAITS } from './world.js';

function stageGuests(state, spots) {
  state.kase.guests.forEach((g, i) => {
    const s = spots[i % spots.length];
    g.x = s[0]; g.y = s[1]; g.tx = s[0]; g.ty = s[1];
  });
}

function collectAll(state) {
  state.clues = CLUE_TYPES.map((c) => ({ type: c.id, value: GUEST_TRAITS[state.kase.culprit][c.id] }));
}

export function setupShotScene(state, api) {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (!shot) return false;
  const seed = parseInt(params.get('seed') || '7', 10) || 7;
  state.shotMode = shot;
  state.seed = seed * 1000 + 17;

  if (shot === 'title') {
    api.startCase(1);
    state.mode = 'title';
    state.difficulty = 1;
    stageGuests(state, [[200, 200], [480, 180], [820, 200], [1080, 190], [180, 380], [520, 400], [850, 390], [1100, 380]]);
    state.player.x = 500; state.player.y = 210;
  } else if (shot === 'climax') {
    api.startCase(3);
    state.mode = 'play';
    state.round = 7;
    state.timeLeft = 23;
    collectAll(state);
    state.tools = ['lens', 'ledger', 'trumpet'];
    state.score = 28640; state.chain = 4;
    state.stats.clues = 17; state.stats.observations = 11; state.stats.incidents = 23;
    state.stats.bestChain = 5; state.stats.casesSolved = 2; state.stats.roundsUsed = 20;
    stageGuests(state, [[210, 190], [470, 230], [790, 170], [1090, 210], [190, 370], [430, 130], [880, 380], [1120, 370]]);
    state.player.x = 520; state.player.y = 250;
    state.tokens = state.kase.tokensByRound[6].map((t) => ({ ...t, taken: false }));
    state.feed = [
      'THE THORN WAS SEEN IN THE LIBRARY — moments ago.',
      'Madame Odette Lark slipped away to the Conservatory.',
      'Count Emil Varga keeps a careful distance from Miss Priya Anand.',
      'Clue pinned: alibi — the Thorn swore they were in the Library.',
      'You observe Duchess Mara Ilves in the Ballroom. Nothing in her hands. Yet.',
      'Baron Tomas Rhee slipped away to the Dining Hall.',
    ];
    state.banner = { text: 'THE THORN WAS SEEN IN THE LIBRARY', timer: 99 };
    state.accuseTarget = state.kase.culprit;
    state.selected = state.kase.culprit;
  } else if (shot === 'board') {
    api.startCase(3);
    state.mode = 'board';
    state.round = 6;
    collectAll(state);
    state.tools = ['lens', 'ledger', 'notebook'];
    state.score = 24180;
    state.selected = state.kase.culprit;
    state.stats.clues = 14;
  } else if (shot === 'end') {
    api.startCase(3);
    collectAll(state);
    state.mode = 'end';
    state.victory = true;
    state.endLine = 'All three cases solved — the Thorn was named by evidence: footprint, silk and seal.';
    state.score = 43860;
    state.tools = ['lens', 'ledger', 'trumpet', 'gloves', 'mirror'];
    state.stats = { casesSolved: 3, clues: 31, typesCompleted: 6, observations: 26, incidents: 41, bestChain: 6, roundsUsed: 19, accusations: 3, wrong: 0 };
    state.endlessPlayed = 0;
  } else {
    return false;
  }

  // Board completion must tell the same story as the staged clues.
  const types = new Set(state.clues.map((c) => c.type)).size;
  state.boardPct = state.mode === 'title' ? 0 : Math.min(100, Math.round(70 + (types / 6) * 30));
  const msg = document.getElementById('msg');
  if (msg && (shot === 'title' || shot === 'end' || shot === 'board')) msg.textContent = '';
  return true;
}
