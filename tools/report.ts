import { LEVELS } from '../src/levels';
import { simulateFull } from '../src/sim/world';
for (const l of LEVELS) console.log(l.id, l.name, JSON.stringify(simulateFull(l, l.solution.map((p, i) => ({ ...p, note: i })), 20)), 'par', l.par, l.solution.map(p => p.type).join('+'));
