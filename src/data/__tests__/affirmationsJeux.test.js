import { describe, expect, it } from 'vitest';
import { THEMES_JEUX } from '../themesJeux';
import { tourDeBuzzer, themeJeux } from '../affirmationsJeux';

describe('Réviz se trompe ? : les affirmations', () => {
  it.each(THEMES_JEUX.map(t => [t.id, t]))('%s : n phrases courtes, moitié vraies, pas trois fois le même verdict', (_, theme) => {
    for (let k = 0; k < 40; k++) {
      const { titre, affirmations } = tourDeBuzzer(theme, 5);
      expect(titre).toBeTruthy();
      expect(affirmations).toHaveLength(5);
      const vraies = affirmations.filter(a => a.vrai).length;
      expect(vraies === 2 || vraies === 3).toBe(true);
      expect(new Set(affirmations.map(a => a.texte)).size).toBe(5);
      affirmations.forEach((a, i) => {
        expect(a.texte.length).toBeLessThanOrEqual(56);
        expect(a.texte).toMatch(/\u00a0!$/);
        expect(a.texte).not.toMatch(/undefined|null/);
        expect(a.correction).toBeTruthy();
        expect(a.avant + a.dit + a.apres).toBe(a.texte);
        expect(a.dit === a.bonne).toBe(a.vrai);
        if (i >= 2) expect(a.vrai === affirmations[i - 1].vrai && a.vrai === affirmations[i - 2].vrai).toBe(false);
      });
    }
  });

  it('une vraie reprend la paire, une fausse prend la réponse d’un autre élément du thème', () => {
    const capitales = themeJeux('capitales');
    for (let k = 0; k < 30; k++) {
      for (const a of tourDeBuzzer(capitales, 4).affirmations) {
        const [, pays, ville] = a.texte.match(/^La capitale (.+), c'est (.+)\u00a0!$/);
        const paire = capitales.banque.find(([p]) => pays.endsWith(p));
        expect(paire).toBeTruthy();
        expect(capitales.banque.some(([, v]) => v === ville)).toBe(true);
        expect(ville === paire[1]).toBe(a.vrai);
      }
    }
  });

  it('les phrases sonnent juste', () => {
    const textes = new Set();
    for (let k = 0; k < 60; k++) for (const t of THEMES_JEUX) tourDeBuzzer(t, 4).affirmations.forEach(a => textes.add(a.texte));
    expect(textes).toContain("La capitale de l'Italie, c'est Rome\u00a0!");
    expect(textes).toContain('La capitale du Portugal, c\'est Lisbonne\u00a0!');
    expect(textes).toContain('La Révolution française éclate en 1789\u00a0!');
    expect(textes).toContain('En anglais, «\u00a0dog\u00a0» veut dire «\u00a0chien\u00a0»\u00a0!');
    expect([...textes].some(t => /^Le cœur sert à (pomper le sang|respirer|digérer)\u00a0!$/.test(t))).toBe(true);
    // Sciences : une fausse reste dans sa famille (jamais « Le cœur sert à une étoile »).
    expect([...textes].filter(t => t.startsWith('Le cœur sert à')).every(t => /(pomper le sang|respirer|digérer)\u00a0!$/.test(t))).toBe(true);
  });

  it('tables : une fausse est le résultat voisin de la même table', () => {
    for (let k = 0; k < 40; k++) {
      for (const a of tourDeBuzzer(themeJeux('tables'), 4).affirmations) {
        const [, t, m, r] = a.texte.match(/^(\d) × (\d) = (\d+)\u00a0!$/).map(Number);
        if (a.vrai) expect(r).toBe(t * m);
        else { expect(r % t).toBe(0); expect(r).not.toBe(t * m); expect(Math.abs(r - t * m)).toBe(t); }
      }
    }
  });

  // 23/10 : quand les deux cases voisines servaient déjà dans le tour, une affirmation prévue fausse
  // devenait vraie et pouvait faire trois « vrai » d'affilée (environ 1 tour de tables sur 1 000).
  it('tables : sur des milliers de tours, jamais trois verdicts pareils, fausses toujours dans la table', () => {
    const tables = themeJeux('tables');
    for (let k = 0; k < 4000; k++) {
      const { affirmations: a } = tourDeBuzzer(tables, k % 2 ? 5 : 4);
      a.forEach((x, i) => {
        if (i >= 2) expect(x.vrai === a[i - 1].vrai && x.vrai === a[i - 2].vrai).toBe(false);
        const [t, m] = x.paire.a.split(' × ').map(Number);
        if (!x.vrai) {
          expect(x.dit).not.toBe(x.bonne);
          expect(Number(x.dit) % t).toBe(0);
          expect(Math.abs(Number(x.dit) / t - m)).toBeLessThanOrEqual(2);
        }
      });
      expect(new Set(a.filter(x => !x.vrai).map(x => x.dit)).size).toBe(a.filter(x => !x.vrai).length);
    }
  });
});
