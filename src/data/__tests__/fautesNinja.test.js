import { describe, it, expect } from 'vitest';
import { BANQUES_NINJA, TOURS_NINJA, FRUITS_NINJA, voleeNinja, regleNinja } from '../fautesNinja';

describe('Le ninja des fautes : la banque', () => {
  it.each(BANQUES_NINJA.map((b, i) => [i, b]))('niveau %i : assez de paires, toutes distinctes', (niveau, banque) => {
    expect(banque.length).toBeGreaterThanOrEqual(TOURS_NINJA[niveau].n + 6);
    const mots = banque.flat();
    expect(new Set(mots).size).toBe(mots.length);
  });

  it('chaque paire a un mot bien écrit et sa faute, différents et courts (une étiquette de fruit)', () => {
    for (const [bon, faux] of BANQUES_NINJA.flat()) {
      expect(bon).not.toBe(faux);
      expect(bon.trim()).toBe(bon);
      expect(faux.trim()).toBe(faux);
      expect(Math.max(bon.length, faux.length)).toBeLessThanOrEqual(19);
    }
  });

  it('pas de faute qui serait une autre forme juste de la banque', () => {
    const justes = new Set(BANQUES_NINJA.flat().map(p => p[0]));
    for (const [, faux] of BANQUES_NINJA.flat()) expect(justes.has(faux)).toBe(false);
  });
});

describe('Le ninja des fautes : voleeNinja', () => {
  it.each([0, 1, 2])('niveau %i : n fruits, le bon nombre de fautes, jamais deux fois la même paire', niveau => {
    const tour = TOURS_NINJA[niveau];
    for (let essai = 0; essai < 200; essai++) {
      const fruits = voleeNinja(niveau);
      expect(fruits).toHaveLength(tour.n);
      expect(fruits.filter(f => f.faute)).toHaveLength(tour.fautes);
      expect(new Set(fruits.map(f => f.bon)).size).toBe(tour.n);
      for (const f of fruits) {
        expect(f.mot).toBe(f.faute ? f.faux : f.bon);
        expect(FRUITS_NINJA).toContain(f.fruit);
      }
    }
  });

  it.each([0, 1, 2])('niveau %i : tout part dans le chrono, la dernière salve est encore en l’air quand il sonne', niveau => {
    const tour = TOURS_NINJA[niveau];
    for (let essai = 0; essai < 200; essai++) {
      const fruits = voleeNinja(niveau);
      const departs = fruits.map(f => f.t);
      expect(Math.min(...departs)).toBeGreaterThanOrEqual(0.4);
      expect(Math.max(...departs)).toBeLessThan(tour.duree - 1);
      expect(Math.max(...fruits.map(f => f.t + f.vol))).toBeGreaterThan(tour.duree);
      // Un fruit seul a le temps d'être lu : jamais plus de 3 en l'air à la fois.
      for (const f of fruits) expect(fruits.filter(g => g.t <= f.t && g.t + g.vol > f.t).length).toBeLessThanOrEqual(3);
    }
  });

  it('trajectoires dans l’aire de jeu, deux fruits de suite jamais du même genre', () => {
    for (let essai = 0; essai < 200; essai++) {
      const fruits = voleeNinja(2);
      for (const f of fruits) {
        for (const x of [f.x0, f.x1]) { expect(x).toBeGreaterThan(0.1); expect(x).toBeLessThan(0.9); }
        expect(f.haut).toBeGreaterThan(0.2);
        expect(f.haut).toBeLessThan(0.5);
      }
      fruits.slice(1).forEach((f, i) => expect(f.fruit).not.toBe(fruits[i].fruit));
    }
  });
});

describe('Le ninja des fautes : les explications du récap', () => {
  it.each(BANQUES_NINJA.map((b, i) => [i, b]))('niveau %i : une règle courte pour chaque paire', (niveau, banque) => {
    for (const paire of banque) {
      const r = regleNinja(niveau, paire);
      expect(r).not.toMatch(/undefined|null/);
      // Le cas le plus long au récap : « « mot » était bien écrit. » + la règle.
      expect(`« ${paire[0]} » était bien écrit. ${r}`.length).toBeLessThanOrEqual(150);
      expect(r.split(/[.!?](\s|$)/).filter(x => x && x.trim()).length).toBeLessThanOrEqual(2);
    }
  });
  it('les homophones ont tous leur truc (pas la phrase de repli)', () => {
    for (const paire of BANQUES_NINJA[1]) expect(regleNinja(1, paire)).not.toMatch(/^On écrit/);
  });
});
