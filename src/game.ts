import { createSim, STEP, W, H, type Sim } from './sim/world';
import { DEFS } from './pieces/defs';
import { LEVELS } from './levels';
import { noteOf } from './audio/scale';
import { marimba, chime, fanfare, resumeAudio } from './audio/marimba';
import * as store from './storage';
import type { Level, Placed, PieceType } from './types';

export interface Fx { x: number; y: number; t: number; c: string; big?: number }
export const MIN_STARS = 2;   // estrelas mínimas para passar de fase
export type Outcome = { kind: 'fail' } | { kind: 'low'; stars: number; time: number } | { kind: 'win'; score: number; stars: number; time: number; pieces: number; eco: number; jokersWon: number; newBest: boolean; best: store.Result };

export const game = {
  levelIndex: 0,
  level: LEVELS[0] as Level,
  pieces: [] as Placed[],
  sel: null as Placed | null,
  placing: null as PieceType | null,
  pa: 0,                                  // ângulo da peça que está sendo colocada
  mouse: { x: 12, y: 7 },
  pad: null as { x: number; y: number } | null,   // cursor do controle (null = sem controle)
  sim: null as Sim | null,
  acc: 0,
  trail: [] as { x: number; y: number }[],
  fx: [] as Fx[],
  outcome: null as Outcome | null,
  jokers: 0,                              // coringas disponíveis nesta tentativa da fase
  spent: 0,                               // coringas já cobrados nesta tentativa
  shake: 0,                               // tremor da tela (batida do peso), decai sozinho
};

let onChange = () => {};
export const setOnChange = (fn: () => void) => { onChange = fn; };
let noteCounter = 0;

export const playing = () => game.sim !== null;
const base = (t: PieceType) => game.level.inventory[t] ?? 0;
const count = (t: PieceType) => game.pieces.filter(p => p.type === t).length;
/** Peças do inventário da fase ainda não colocadas. */
export const left = (t: PieceType) => Math.max(0, base(t) - count(t));
/** Peças colocadas além do inventário (cada uma custa 1 coringa). */
export const extrasUsed = () => (Object.keys(DEFS) as PieceType[]).reduce((n, t) => n + Math.max(0, count(t) - base(t)), 0);
export const jokersLeft = () => game.jokers - extrasUsed();
export const canPlace = (t: PieceType) => left(t) > 0 || jokersLeft() > 0;

/** Peças que sobraram do inventário base: viram coringas ao vencer (a 1ª vez que bate cada marca). */
export const baseTotal = (level: Level) => Object.values(level.inventory).reduce((a, b) => a + (b ?? 0), 0);
export const savedOf = (level: Level, pieces: number) => Math.max(0, baseTotal(level) - pieces);
export const unlocked = (i: number) => i === 0 || !!store.load()[LEVELS[i - 1].id];

/** Mínimo conhecido de peças (a solução de referência). */
export const minPieces = (level: Level) => Math.max(1, level.solution.length);

/** Bônus de economia: até 1000, perde 250 por peça acima do mínimo conhecido (nunca negativo). */
export const ecoBonus = (level: Level, pieces: number) => Math.max(0, 1000 - 250 * Math.max(0, pieces - minPieces(level)));

/** Pontos: vitória 1000 + 1000 por estrela + bônus de tempo (até 500, teto em bater a referência) + economia (até 1000). */
export const scoreOf = (level: Level, stars: number, time: number, pieces: number) =>
  1000 + 1000 * stars + Math.round(500 * Math.min(1, level.par / Math.max(time, 0.01))) + ecoBonus(level, pieces);

export function loadLevel(i: number) {
  game.levelIndex = i; game.level = LEVELS[i]; game.pieces = []; game.sel = null; game.placing = null;
  game.jokers = store.getBank(); game.spent = 0;
  reset();
}

export function pick(type: PieceType) {   // clicou no ícone: a peça já aparece na cena, segue o mouse
  if (playing() || !canPlace(type)) return;
  game.placing = game.placing === type ? null : type; game.pa = DEFS[type].defaultAngle; game.sel = null;
  game.mouse = { x: W / 2, y: H / 2 - 0.5 }; onChange();
}

export function place(type: PieceType, x: number, y: number, a = DEFS[type].defaultAngle) {
  if (playing() || !canPlace(type)) return;
  const p: Placed = { type, x, y, a, note: noteOf(noteCounter++ * 2 + 3) };
  game.pieces.push(p); game.sel = p; game.placing = null; onChange();
}

export function rotate(da: number) {
  if (playing()) return;
  if (game.placing) game.pa += da; else if (game.sel) game.sel.a += da;
}

export function remove(p = game.sel) {
  if (playing() || !p) return;
  game.pieces = game.pieces.filter(q => q !== p);
  if (game.sel === p) game.sel = null;
  onChange();
}

export function cancelPlacing() { if (game.placing) { game.placing = null; onChange(); } }

export function play() {
  if (playing()) return;
  resumeAudio();
  const extras = extrasUsed();   // cobra os coringas usados (uma vez por tentativa da fase)
  if (extras > game.spent) { store.setBank(store.getBank() - (extras - game.spent)); game.spent = extras; }
  game.sel = null; game.placing = null; game.outcome = null; game.acc = 0; game.trail = []; game.fx = [];
  game.sim = createSim(game.level, game.pieces, {
    hit: h => {
      if (h.heavy) { const k = h.strength ?? 1; marimba(h.note - 24, k); game.shake = 0.4 * k; } else marimba(h.note, Math.min(1, 0.25 + h.impulse / 1.2));
      game.fx.push({ x: h.x, y: h.y, t: 0, c: h.color, big: h.blast }); },
    star: i => { chime(i); const s = game.level.stars[i]; game.fx.push({ x: s.x, y: s.y, t: 0, c: '#ffd166' }); },
  });
  onChange();
}

export function reset() { game.sim = null; game.outcome = null; game.fx = []; game.trail = []; onChange(); }

function finish(sim: Sim) {
  if (sim.fell) { reset(); return; }   // caiu no chão: reinicia sozinho (a barra avisou)
  if (sim.result === 'fail') { game.outcome = { kind: 'fail' }; onChange(); return; }
  const stars = sim.collected.filter(Boolean).length, time = sim.winTime;
  if (stars < MIN_STARS) { game.outcome = { kind: 'low', stars, time }; onChange(); return; }
  const pieces = game.pieces.length, score = scoreOf(game.level, stars, time, pieces);
  const newBest = store.save(game.level.id, { score, stars, time });
  const saved = extrasUsed() > 0 ? 0 : savedOf(game.level, pieces), gain = Math.max(0, Math.min(store.MAX_JOKERS - store.getBank(), saved - store.getSaved(game.level.id)));
  if (saved > store.getSaved(game.level.id)) store.setSaved(game.level.id, saved);
  if (gain > 0) store.setBank(store.getBank() + gain);
  game.outcome = { kind: 'win', score, stars, time, pieces, eco: ecoBonus(game.level, pieces), jokersWon: gain, newBest, best: store.load()[game.level.id] };
  fanfare(); onChange();
}

/** Avança a simulação em passo fixo, independente do FPS. */
export function frame(dt: number) {
  const sim = game.sim;
  game.fx = game.fx.filter(f => (f.t += 0.04) < 1);
  game.shake *= 0.88;
  if (!sim) return;
  game.acc += Math.min(dt, 0.1);
  while (game.acc >= STEP && !sim.result) { game.acc -= STEP; sim.step(); }
  const p = sim.ball.getPosition();
  game.trail.push({ x: p.x, y: p.y }); if (game.trail.length > 40) game.trail.shift();
  if (sim.result && !game.outcome) finish(sim);
}
