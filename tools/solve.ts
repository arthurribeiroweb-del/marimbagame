// Busca automática da melhor montagem de uma fase: npm run solve -- <id> [segundos]
// Grava `par` e `solution` no JSON da fase. Não prova otimalidade (aleatório + hill-climb com várias sementes).
import { readFileSync, writeFileSync } from 'node:fs';
import { simulate, simulateFull } from '../src/sim/world';
import { PIECE_TYPES } from '../src/pieces/defs';
import type { Level, PieceType, Placed } from '../src/types';

const id = Number(process.argv[2]), secs = Number(process.argv[3] || 60);
const MIN_STARS = 2;
const file = new URL(`../src/levels/level${id}.json`, import.meta.url);
const level = JSON.parse(readFileSync(file, 'utf8')) as Level;

type Cfg = { type: PieceType; x: number; y: number; a: number }[];
const R = (a: number, b: number) => a + Math.random() * (b - a);
// metade das peças nasce perto da bola (combinações como gangorra+peso precisam estar juntas e perto dela)
const near = () => (Math.random() < 0.5 ? { x: R(1.5, 22.5), y: R(2, 14) } : { x: Math.min(22.5, Math.max(1.5, level.ball.x + R(-3.5, 3.5))), y: Math.min(14, Math.max(1, level.ball.y + R(-6, 3))) });
const place = (c: Cfg): Placed[] => c.map((p, i) => ({ ...p, note: i }));
const bag = PIECE_TYPES.flatMap(t => Array(level.inventory[t] ?? 0).fill(t) as PieceType[]);

// Pontuação de uma montagem: vencer > estrelas > menor tempo. Mesmo sem vencer, estrelas dão gradiente à busca.
// Robustez: vale o PIOR caso entre pequenas variações de posição/ângulo, senão a solução é "no fio da navalha"
// e muda de resultado entre Node e navegador.
const JIT: [number, number, number][] = [[0, 0, 0], [0.03, 0, 0], [-0.03, 0.03, 0], [0, -0.03, 0.03], [0.02, 0.02, -0.03], [-0.03, -0.02, 0.02]];
const score = (c: Cfg) => {
  const missing = (level.requires ?? []).some(t => !c.some(p => p.type === t)) ? 20000 : 0;   // sem a peça exigida a nota despenca
  return scoreRaw(c) - missing;
};
const scoreRaw = (c: Cfg) => {
  let worst = Infinity;
  for (const [dx, dy, da] of JIT) {
    const r = simulateFull(level, place(c.map(p => ({ ...p, x: p.x + dx, y: p.y + dy, a: p.a + da }))), 20);
    worst = Math.min(worst, (r.win ? 10000 : 0) + r.stars * 1000 - (r.win ? r.time : 0));
    if (!r.win && dx === 0 && r.stars === 0) break;   // nominal nem vence nem pega estrela: não vale testar variações
  }
  return worst;
};

const POOL = 8;
let pool: { c: Cfg; s: number }[] = [];
const offer = (c: Cfg) => {
  const s = score(c);
  if (pool.length < POOL || s > pool[pool.length - 1].s) { pool.push({ c, s }); pool.sort((a, b) => b.s - a.s); pool = pool.slice(0, POOL); }
};

const t0 = Date.now(), jig = (v: number, s: number) => v + (Math.random() - 0.5) * s;
while (Date.now() - t0 < secs * 400) {   // 40%: aleatório
  const types = [...bag].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * bag.length));
  offer(types.map(type => ({ type, ...near(), a: R(-1.6, 1.6) })));
}
while (Date.now() - t0 < secs * 1000) {   // 60%: hill-climb em várias sementes
  const base = pool[Math.floor(Math.random() * Math.min(pool.length, 1 + Math.floor(Math.random() * POOL)))].c;
  const s = [1.5, 0.6, 0.15, 0.04][Math.floor(Math.random() * 4)];
  offer(base.map(c => (Math.random() < 0.5 ? { type: c.type, x: jig(c.x, s), y: jig(c.y, s), a: jig(c.a, s / 2) } : c)));
}
const top = pool[0];
if (!top || top.s < 10000 + MIN_STARS * 1000 - 100) {
  console.log(`fase ${id}: sem solução robusta com ${MIN_STARS}+ estrelas (melhor pontuação ${top?.s.toFixed(1)})`);
  process.exit(1);
}
// tira peças que não fazem diferença (menos peças = montagem mais enxuta)
let slim = top.c;
for (let i = slim.length - 1; i >= 0; i--) {
  const t = slim.filter((_, j) => j !== i);
  if (t.length && score(t) >= top.s - 1e-9) slim = t;
}
const check = simulate(level, place(slim), 20)!;
level.par = Math.round(check.time * 100) / 100;
level.solution = slim.map(p => ({ type: p.type, x: p.x, y: p.y, a: p.a }));
writeFileSync(file, JSON.stringify(level, null, 2) + '\n');
console.log(`fase ${id}: ${check.stars}/${level.stars.length} estrelas, par ${level.par}s com ${slim.length} peça(s):`, slim.map(p => p.type).join(', '));
