import { describe, it, expect } from 'vitest';
import { TOURS_TAUPE, REGLES_TAUPE, N_TROUS, tourDeTaupe, calculsQuiFont, valeurCalcul } from '../taupes';

const bonSelon = (regleId, p) => {
  const [type, x] = regleId.split('-');
  if (type === 'parite') return (p.valeur % 2 === 0) === (x === 'pairs');
  if (type === 'multiple') return p.valeur % Number(x) === 0;
  return p.valeur === Number(x);
};

describe('Tape-taupe : tourDeTaupe', () => {
  const cas = REGLES_TAUPE.flatMap((regles, niveau) => regles.map(r => [r.id, niveau]));

  it.each(cas)('%s : chaque pancarte est bonne ou mauvaise sans ambiguïté', (id, niveau) => {
    for (let k = 0; k < 60; k++) {
      const tour = tourDeTaupe(niveau, id);
      expect(tour.regle.id).toBe(id);
      for (const x of tour.taupes) {
        expect(bonSelon(id, x)).toBe(x.bon);
        expect(Number.isInteger(x.valeur)).toBe(true);
        expect(x.valeur).toBeGreaterThan(0);
        expect(tour.pourquoi(x)).toMatch(/\d/);
      }
    }
  });

  it.each([0, 1, 2])('niveau %i : assez de bonnes taupes, jamais trop dehors, trous respectés', niveau => {
    const t = TOURS_TAUPE[niveau];
    for (let k = 0; k < 200; k++) {
      const { taupes } = tourDeTaupe(niveau);
      expect(taupes.filter(x => x.bon).length).toBeGreaterThanOrEqual(t.objectif + 3);
      expect(taupes.some(x => !x.bon)).toBe(true);
      taupes.forEach((x, i) => {
        expect(x.trou).toBeGreaterThanOrEqual(0);
        expect(x.trou).toBeLessThan(N_TROUS);
        expect(x.t + x.vie).toBeLessThanOrEqual(t.duree + 1e-9);
        if (i) expect(x.t).toBeGreaterThanOrEqual(taupes[i - 1].t);
        if (i) expect(x.trou).not.toBe(taupes[i - 1].trou);
        const dehors = taupes.filter(y => y !== x && y.t <= x.t && x.t < y.t + y.vie);
        expect(dehors.length).toBeLessThan(t.max);
        expect(dehors.some(y => y.trou === x.trou)).toBe(false);
        expect(dehors.some(y => y.texte === x.texte)).toBe(false);
      });
    }
  });

  it('les calculs du dernier tour sont exacts et faciles', () => {
    for (const n of [10, 12, 20]) {
      for (const c of calculsQuiFont(n)) {
        expect(valeurCalcul(c)).toBe(n);
        const [a, op, b] = c.split(' ');
        expect(['+', '−', '×']).toContain(op);
        expect(Math.max(Number(a), Number(b))).toBeLessThanOrEqual(25);
        expect(Math.min(Number(a), Number(b))).toBeLessThanOrEqual(10);
        if (op === '−') expect(Number(b)).toBeLessThanOrEqual(5);
      }
    }
    expect(calculsQuiFont(12)).toEqual(expect.arrayContaining(['3 × 4', '15 − 3', '6 + 6']));
    expect(calculsQuiFont(20)).toEqual(expect.arrayContaining(['15 + 5', '4 × 5', '22 − 2']));
  });

  it('les pièges du dernier tour comprennent les confusions d’opération', () => {
    const vus = new Set();
    for (let k = 0; k < 300; k++) tourDeTaupe(2, 'egal-12').taupes.filter(x => !x.bon).forEach(x => vus.add(x.texte));
    expect(vus.has('3 + 4')).toBe(true);
    expect([...vus].every(c => valeurCalcul(c) !== 12)).toBe(true);
  });
});
