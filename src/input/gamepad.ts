import { W, H } from '../sim/world';
import { PIECE_TYPES, hitPiece } from '../pieces/defs';
import { game, playing, canPlace, pick, place, remove, rotate, cancelPlacing, play, reset, loadLevel } from '../game';
import { LEVELS } from '../levels';
import { openMenu } from '../ui/ui';

// Mapeamento "standard" do navegador (controle de Xbox): 0=A 1=B 2=X 3=Y 4=LB 5=RB 6=LT 7=RT 8=Back 9=Start 12-15=direcional
const A = 0, B = 1, X = 2, Y = 3, LB = 4, RB = 5, LT = 6, RT = 7, BACK = 8, START = 9, UP = 12, DOWN = 13, LEFT = 14, RIGHT = 15;
const DEAD = 0.18, SPEED = 11;   // zona morta do analógico; metros/s no máximo

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
let prev: boolean[] = [], carry = false;

/** Lê o 1º controle conectado. Chamada a cada frame. Usa a mesma lógica do mouse (colocar, girar, devolver). */
export function pollGamepad(dt: number) {
  const pad = (navigator.getGamepads?.() ?? []).find(p => p && p.connected);
  if (!pad) { game.pad = null; return; }
  const btn = (i: number) => !!pad.buttons[i]?.pressed;
  const edge = (i: number) => btn(i) && !prev[i];
  const dz = (v: number) => (Math.abs(v) < DEAD ? 0 : Math.sign(v) * (Math.abs(v) - DEAD) / (1 - DEAD));

  // cursor: analógico esquerdo + direcional
  const c = (game.pad ??= { x: W / 2, y: H / 2 });
  const dx = dz(pad.axes[0] ?? 0) + (btn(RIGHT) ? 1 : 0) - (btn(LEFT) ? 1 : 0), dy = dz(pad.axes[1] ?? 0) + (btn(DOWN) ? 1 : 0) - (btn(UP) ? 1 : 0);
  c.x = clamp(c.x + dx * SPEED * dt, 0.5, W - 0.5); c.y = clamp(c.y + dy * SPEED * dt, 0.5, H - 0.5);

  const o = game.outcome;
  if (o && (edge(A) || edge(START))) {   // cartão de resultado aberto: A = botão principal
    if (o.kind === 'win' && game.levelIndex + 1 < LEVELS.length) loadLevel(game.levelIndex + 1); else reset();
  } else if (!playing()) {
    game.mouse = { x: c.x, y: c.y };   // o fantasma da peça segue o cursor
    if (carry && game.sel) { game.sel.x = c.x; game.sel.y = c.y; }
    if (edge(A)) {
      if (game.placing) { place(game.placing, c.x, c.y, game.pa); carry = false; }
      else if (carry) carry = false;                                   // soltar a peça carregada
      else { const p = [...game.pieces].reverse().find(q => hitPiece(q, c.x, c.y)); game.sel = p ?? null; carry = !!p; }
    }
    if (edge(B)) { if (game.placing) cancelPlacing(); else if (carry) carry = false; else remove(); }
    if (btn(LB)) rotate(-1.8 * dt); if (btn(RB)) rotate(1.8 * dt);
    const lt = pad.buttons[LT]?.value ?? 0, rt = pad.buttons[RT]?.value ?? 0;   // giro fino pelos gatilhos
    if (lt > 0.1) rotate(-0.5 * lt * dt); if (rt > 0.1) rotate(0.5 * rt * dt);
    if (edge(X) || edge(Y)) {   // percorre as peças que ainda dá para colocar
      const list = PIECE_TYPES.filter(t => canPlace(t) && (game.level.inventory[t] || game.jokers > 0));
      if (list.length) { const i = game.placing ? list.indexOf(game.placing) : -1; pick(list[(i + (edge(Y) ? 1 : -1) + list.length) % list.length]); carry = false; }
    }
    if (edge(START)) play();
  } else if (edge(START) || edge(B)) reset();
  if (edge(BACK)) openMenu();
  prev = pad.buttons.map(b => b.pressed);
}
