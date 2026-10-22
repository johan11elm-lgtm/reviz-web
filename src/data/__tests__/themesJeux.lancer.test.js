import { describe, it, expect } from 'vitest';
import { THEMES_JEUX, tourDeLancer } from '../themesJeux';

describe('Réviz lance : tourDeLancer', () => {
  it.each(THEMES_JEUX.map(t => [t.id, t]))('%s : 6 questions, 2 réponses distinctes dont la bonne', (_, theme) => {
    const tour = tourDeLancer(theme, 6, 2);
    expect(tour.questions).toHaveLength(6);
    for (const q of tour.questions) {
      expect(q.choix).toHaveLength(2);
      expect(new Set(q.choix).size).toBe(2);
      expect(q.choix).toContain(q.reponse);
    }
  });

  it('met le côté court de la paire sur les étiquettes (dates : les années aux paniers)', () => {
    const tour = tourDeLancer(THEMES_JEUX.find(t => t.id === 'dates'));
    for (const q of tour.questions) expect(q.reponse.length).toBeLessThanOrEqual(12);
  });

  it('préfère des leurres de la même forme (chiffres avec chiffres)', () => {
    const tour = tourDeLancer(THEMES_JEUX.find(t => t.id === 'tables'));
    for (const q of tour.questions) expect(q.choix.every(c => /^\d+$/.test(c))).toBe(true);
  });
});
