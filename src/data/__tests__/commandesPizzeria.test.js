import { describe, expect, it } from 'vitest';
import { commandesPizzeria } from '../commandesPizzeria';

// La valeur d'un ticket, en fraction de pizza (pourcentages et décimaux compris).
const valeur = ticket => {
  let total = 0;
  for (const m of ticket) {
    if (Array.isArray(m)) total += m[0] / m[1];
    else if (m === '+') continue;
    else if (m.endsWith('%')) total += parseFloat(m) / 100;
    else if (/^\d/.test(m)) total += parseFloat(m.replace(',', '.'));
    else total += { 'la moitié': 1 / 2, 'un quart': 1 / 4, 'trois quarts': 3 / 4, 'un tiers': 1 / 3, 'deux tiers': 2 / 3 }[m];
  }
  return total;
};

describe('La pizzeria : les commandes', () => {
  it.each([[0, 4], [1, 4], [2, 3]])('niveau %i : %i commandes justes, qui tiennent sur les pizzas', (niveau, n) => {
    for (let k = 0; k < 300; k++) {
      const liste = commandesPizzeria(niveau, n);
      expect(liste).toHaveLength(n);
      expect(new Set(liste.map(c => `${JSON.stringify(c.ticket)}|${c.coupe}`)).size).toBe(n);
      for (const c of liste) {
        expect(Number.isInteger(c.attendu)).toBe(true);
        expect(c.attendu).toBeGreaterThan(0);
        expect(c.attendu).toBeLessThan(c.pizzas * c.coupe);
        expect(c.coupe).toBeGreaterThanOrEqual(3);
        expect(c.coupe).toBeLessThanOrEqual(c.pizzas > 1 ? 8 : 12);
        expect(valeur(c.ticket)).toBeCloseTo(c.attendu / c.coupe, 9);
        for (const servies of [null, 0, c.attendu + 1]) {
          const e = c.erreur(servies);
          expect(Object.keys(e).sort()).toEqual(['bonne', 'donnee', 'explication', 'jeu', 'libelles', 'question', 'theme']);
          expect(e.jeu).toBe('pizzeria');
          expect(JSON.stringify(e)).not.toMatch(/undefined|NaN/);
          expect(e.explication.length).toBeLessThanOrEqual(150);
          expect(e.donnee === null).toBe(servies === null);
        }
      }
    }
  });

  it('niveau 0 : le ticket donne la coupe', () => {
    for (const c of commandesPizzeria(0, 4)) expect(c.ticket[0][1]).toBe(c.coupe);
  });

  it('niveau 1 : la pizza n’est jamais coupée comme le dit le ticket', () => {
    for (let k = 0; k < 200; k++) {
      const liste = commandesPizzeria(1, 4);
      for (const c of liste) if (Array.isArray(c.ticket[0])) expect(c.ticket[0][1]).not.toBe(c.coupe);
      expect(liste.filter(c => typeof c.ticket[0] === 'string')).toHaveLength(1);
    }
  });

  it('niveau 2 : les trois sortes de commandes, sur deux pizzas', () => {
    for (let k = 0; k < 100; k++) {
      const liste = commandesPizzeria(2, 3);
      expect(liste.every(c => c.pizzas === 2)).toBe(true);
      const sortes = liste.map(c => (c.ticket.includes('+') ? 'somme' : typeof c.ticket[0] === 'string' ? 'pourcent' : 'plus'));
      expect(new Set(sortes).size).toBe(3);
    }
  });
});
