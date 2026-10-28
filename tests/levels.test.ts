import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels';
import { simulate } from '../src/sim/world';
import { DEFS } from '../src/pieces/defs';
import type { Placed } from '../src/types';

const place = (l: (typeof LEVELS)[number]): Placed[] => l.solution.map((p, i) => ({ ...p, note: i }));

describe.each(LEVELS)('fase $id ($name)', level => {
  it('a solução gravada vence no tempo de referência', () => {
    const r = simulate(level, place(level));
    expect(r).not.toBeNull();
    expect(r!.time).toBeCloseTo(level.par, 1);
    expect(r!.stars).toBeGreaterThanOrEqual(2);   // mínimo para passar
  });

  it('a solução usa as peças que a fase exige', () => {
    for (const t of level.requires ?? []) expect(level.solution.some(p => p.type === t)).toBe(true);
  });

  it('a solução respeita o inventário', () => {
    for (const t of Object.keys(DEFS) as (keyof typeof DEFS)[])
      expect(level.solution.filter(p => p.type === t).length).toBeLessThanOrEqual(level.inventory[t] ?? 0);
  });

  it('é determinística (2 execuções = mesmo resultado)', () => {
    expect(simulate(level, place(level))).toEqual(simulate(level, place(level)));
  });

  it('é robusta: pequenas variações na montagem ainda vencem', () => {
    for (const [dx, dy, da] of [[0.03, 0, 0], [-0.03, 0.03, 0], [0, -0.03, 0.03], [0.02, 0.02, -0.03]]) {
      const shifted = place(level).map(p => ({ ...p, x: p.x + dx, y: p.y + dy, a: p.a + da }));
      expect(simulate(level, shifted)).not.toBeNull();
    }
  });

  it('sem peças a fase não se resolve sozinha', () => {
    expect(simulate(level, [])).toBeNull();
  });
});
