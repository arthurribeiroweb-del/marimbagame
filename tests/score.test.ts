import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels';
import { ecoBonus, minPieces, scoreOf } from '../src/game';

const l = LEVELS[0];

describe('pontuação', () => {
  it('economia: máximo no mínimo de peças, cai 250 por peça extra, nunca negativa', () => {
    const m = minPieces(l);
    expect(ecoBonus(l, m)).toBe(1000);
    expect(ecoBonus(l, Math.max(0, m - 1))).toBe(1000);   // abaixo do mínimo não passa de 1000
    expect(ecoBonus(l, m + 1)).toBe(750);
    expect(ecoBonus(l, m + 10)).toBe(0);
  });
  it('menos peças, mais estrelas ou mais rápido => mais pontos', () => {
    const base = scoreOf(l, 2, l.par, minPieces(l));
    expect(scoreOf(l, 2, l.par, minPieces(l) + 2)).toBeLessThan(base);
    expect(scoreOf(l, 3, l.par, minPieces(l))).toBeGreaterThan(base);
    expect(scoreOf(l, 2, l.par * 3, minPieces(l))).toBeLessThan(base);
  });
});

import { baseTotal, savedOf } from '../src/game';
describe('coringas', () => {
  it('peças que sobram do inventário viram economia; usar tudo = 0', () => {
    const total = baseTotal(l);
    expect(savedOf(l, total)).toBe(0);
    expect(savedOf(l, total + 3)).toBe(0);
    expect(savedOf(l, 1)).toBe(total - 1);
  });
});
