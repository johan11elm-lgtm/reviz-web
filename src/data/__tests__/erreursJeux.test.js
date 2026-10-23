import { describe, expect, it } from 'vitest';
import { THEMES_JEUX, tourDeTheme, tourDeLancer } from '../themesJeux';
import { tourDeBuzzer, themeJeux } from '../affirmationsJeux';
import { erreurJeu, erreursUniques, expliquer, nomTheme } from '../erreursJeux';

const phrases = t => t.replace(/av\. J\.-C\./g, 'av JC').split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ«0-9])/).length;

describe('Réviz Games : les explications du récap', () => {
  it('l’exemple de Johan : 7 × 8', () => {
    expect(expliquer('tables', { a: '7 × 8', b: '56' })).toBe('7 × 8 = 56 : pense à 5, 6, 7, 8 → 56 = 7 × 8.');
  });

  it('tables : un truc par facteur, et la réponse donnée replacée dans la table', () => {
    expect(expliquer('tables', { a: '7 × 5', b: '35' })).toBe('7 × 5 = 35 : 7 × 10 = 70, puis la moitié : 35.');
    expect(expliquer('tables', { a: '6 × 9', b: '54' })).toBe('6 × 9 = 54 : 6 × 10 = 60, puis on enlève 6 : 54.');
    expect(expliquer('tables', { a: '6 × 6', b: '36' })).toMatch(/^6 × 6 = 36 : un nombre fois lui-même/);
    expect(expliquer('tables', { a: '7 × 8', b: '56' }, '63')).toMatch(/63, c'est 7 × 9\.$/);
    expect(expliquer('tables', { a: '7 × 8', b: '56' }, '54')).toMatch(/54, c'est 8 × [0-9]+\.$|54 n'est pas dans la table de 7\.$/);
    expect(expliquer('tables', { a: '7 × 8', b: '56' }, '8 × 6')).toMatch(/8 × 6 = 48\.$/);
  });

  it('capitales, contraires, anglais, dates, sciences : la bonne réponse, et la confusion', () => {
    expect(expliquer('capitales', { a: 'Italie', b: 'Rome' }, 'Paris'))
      .toBe("La capitale de l'Italie, c'est Rome. Paris, c'est la capitale de la France.");
    expect(expliquer('contraires', { a: 'entrer', b: 'sortir' }))
      .toBe("Le contraire d'« entrer », c'est « sortir ». On entre dans la classe, on en sort à la sonnerie.");
    expect(expliquer('contraires', { a: 'lourd', b: 'léger' }, 'lent')).toBe('Le contraire de « lourd », c\'est « léger ». « lent » va avec « rapide ».');
    expect(expliquer('animaux', { a: 'duck', b: 'canard' })).toMatch(/Donald Duck/);
    expect(expliquer('dates', { a: '1789', b: 'Révolution française' }, '1914'))
      .toMatch(/Bastille.*1914, c'est le début de la Grande Guerre\.$/);
    expect(expliquer('sciences', { a: 'Lune', b: 'Un satellite' })).toBe('La Lune est un satellite : elle tourne autour de la Terre.');
    // Au buzzer, Réviz dit la réponse en minuscule (« Le Soleil est un satellite ! »).
    expect(expliquer('sciences', { a: 'Soleil', b: 'Une étoile' }, 'un satellite')).toMatch(/«\u00a0un satellite\u00a0» va avec «\u00a0Lune\u00a0»\.$/);
  });

  it('chaque paire de chaque thème a une explication courte (1 ou 2 phrases), sans trou', () => {
    for (const theme of THEMES_JEUX) {
      const paires = theme.banque ? theme.banque.map(([a, b]) => ({ a, b }))
        : [3, 4, 5, 6, 7, 8, 9].flatMap(t => [2, 3, 4, 5, 6, 7, 8, 9].map(m => ({ a: `${t} × ${m}`, b: String(t * m) })));
      for (const p of paires) {
        for (const autre of [null, paires[(paires.indexOf(p) + 1) % paires.length].b]) {
          const t = expliquer(theme.id, p, autre);
          expect(t, `${theme.id} ${p.a}`).not.toMatch(/undefined|null|NaN/);
          expect(t.length, t).toBeLessThanOrEqual(150);
          expect(phrases(t), t).toBeLessThanOrEqual(2);
          expect(t).toMatch(/[.!]$/);
        }
      }
    }
  });

  it('un thème inconnu (chapitre) : une phrase générique', () => {
    expect(expliquer(undefined, { a: 'Clovis', b: 'Roi des Francs' })).toBe('« Clovis » va avec « Roi des Francs ».');
  });
});

describe('Réviz Games : le format commun des erreurs', () => {
  const champs = ['jeu', 'theme', 'question', 'donnee', 'bonne', 'explication'];

  it('erreurJeu donne exactement les 6 champs', () => {
    const tour = tourDeTheme(themeJeux('capitales'), 3);
    const e = erreurJeu({ jeu: 'magie', tour, paire: tour.paires[0], question: tour.paires[0].a, donnee: null, bonne: tour.paires[0].b });
    expect(Object.keys(e).sort()).toEqual([...champs].sort());
    expect(e.theme).toBe('Les capitales');
    expect(e.donnee).toBeNull();
  });

  it('Réviz lance et le buzzer portent la paire de chaque question', () => {
    for (const theme of THEMES_JEUX) {
      for (const qu of tourDeLancer(theme, 6, 2).questions) {
        expect([qu.paire.a, qu.paire.b]).toContain(qu.reponse);
        expect([qu.paire.a, qu.paire.b]).toContain(qu.texte);
      }
      for (const a of tourDeBuzzer(theme, 5).affirmations) expect(a.paire.a).toBeTruthy();
    }
  });

  it('erreursUniques garde la première erreur de chaque question', () => {
    const e = (question, donnee) => ({ jeu: 'magie', theme: 'T', question, donnee, bonne: 'b', explication: '.' });
    expect(erreursUniques([e('q1', 'x'), e('q2', null), e('q1', null)]).map(x => x.donnee)).toEqual(['x', null]);
  });

  it('nomTheme enlève le point d’exclamation', () => {
    expect(nomTheme('Table de 7 !')).toBe('Table de 7');
    expect(nomTheme(undefined)).toBe('');
  });
});
