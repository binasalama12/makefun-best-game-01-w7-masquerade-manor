// Input for MASQUERADE MANOR: WASD / arrow keys walk the detective,
// E observes the nearest guest, C opens the case board, the mouse can
// also click guests, clue tokens (walk-to), board cards and buttons —
// render.js registers clickable regions each frame and main.js hit-tests
// them through here.

export function attachInput(canvas, handlers) {
  const keys = new Set();
  function toGame(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  }
  canvas.addEventListener('pointermove', (e) => {
    const p = toGame(e);
    handlers.onMove(p.x, p.y);
  });
  canvas.addEventListener('pointerdown', (e) => {
    const p = toGame(e);
    handlers.onTap(p.x, p.y);
  });
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    handlers.onKey(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  return { keys };
}
