import { W, H } from '../sim/world';
import { hitPiece, handleOf } from '../pieces/defs';
import { toWorld } from '../render/draw';
import { game, playing, place, remove, rotate, cancelPlacing, play, reset } from '../game';
import type { Placed } from '../types';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Mouse e toque pela mesma camada (pointer events). */
export function bindInput(cv: HTMLCanvasElement, onChange: () => void) {
  let drag: { dx: number; dy: number } | null = null, turning = false;
  const topAt = (m: { x: number; y: number }): Placed | undefined => [...game.pieces].reverse().find(p => hitPiece(p, m.x, m.y));

  cv.addEventListener('pointerdown', e => {
    if (playing()) return;
    const m = toWorld(cv, e);
    if (game.placing && e.button === 0) { place(game.placing, clamp(m.x, 0.5, W - 0.5), clamp(m.y, 0.5, H - 0.5), game.pa); return; }
    const h = game.sel ? handleOf(game.sel) : null;
    if (h && Math.hypot(m.x - h.x, m.y - h.y) < 0.5) { turning = true; cv.setPointerCapture(e.pointerId); return; }   // pegou a alça
    const p = topAt(m);
    if (e.button === 2) { if (p) remove(p); return; }
    game.sel = p ?? null; drag = p ? { dx: p.x - m.x, dy: p.y - m.y } : null; onChange();
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    const m = toWorld(cv, e); game.mouse = m;
    if (turning && game.sel) { game.sel.a = Math.atan2(m.y - game.sel.y, m.x - game.sel.x); return; }
    if (drag && game.sel) { game.sel.x = clamp(m.x + drag.dx, 0.5, W - 0.5); game.sel.y = clamp(m.y + drag.dy, 0.5, H - 0.5); }
  });
  cv.addEventListener('pointerup', () => { drag = null; turning = false; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { e.preventDefault(); rotate(Math.sign(e.deltaY) * 0.1); }, { passive: false });

  addEventListener('keydown', e => {
    if (e.key === 'q') rotate(-0.15);
    if (e.key === 'e') rotate(0.15);
    if (e.key === 'Escape') cancelPlacing();
    if (e.key === 'Delete' || e.key === 'Backspace') remove();
    if (e.key === ' ') { e.preventDefault(); playing() ? reset() : play(); }
  });
}
