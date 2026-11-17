// DOM HUD for MASQUERADE MANOR: the strip across the top of the stage
// shows the case, the round, the round clock, clue tokens held, the clue
// chain, the case-board completion and the score. The in-canvas panels
// (incidents feed, suspicion panel, tools) live in render.js.

const el = (id) => document.getElementById(id);

export function updateHud(state) {
  const kase = state.kase;
  el('h-case').textContent = kase ? `${kase.num <= 3 ? kase.num + ' / 3' : 'Endless ' + (kase.num - 3)}` : '–';
  el('h-round').textContent = kase ? `${state.round} / 7` : '–';
  el('h-clock').textContent = state.mode === 'play' ? `${Math.max(0, Math.ceil(state.timeLeft))}s` : '–';
  el('h-clues').textContent = `${state.clues.length} / 6 types`;
  el('h-chain').textContent = state.chain > 1 ? `×${state.chain}` : '—';
  el('h-board').textContent = `${state.boardPct}%`;
  el('h-score').textContent = `${state.score}`;
  el('boardbar').style.width = `${state.boardPct}%`;
}

export function setMessage(text) {
  const m = el('msg');
  if (m) m.textContent = text || '';
}
