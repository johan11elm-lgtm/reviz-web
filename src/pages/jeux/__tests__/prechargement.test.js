import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// Le moteur du pantin charge des scripts : hors sujet ici.
vi.mock('../../../components/Pantin', () => ({ prechargerMoteurPantin: async () => {} }));
import { DECORS, DONNEES_PANTIN, FIN, PIECES_PANTIN, TRANSITION, imagesDuJeu, imagesFin, imagesTransition, prechargerPartie } from '../prechargement';

const PUBLIC = path.resolve(__dirname, '../../../../public');
const fichiers = (dossier, ext) => fs.readdirSync(dossier, { withFileTypes: true }).flatMap(e => {
  const p = path.join(dossier, e.name);
  return e.isDirectory() ? fichiers(p, ext) : e.name.endsWith(ext) ? [p] : [];
});

describe('Réviz Games : le préchargement pendant la carte de début', () => {
  it('chaque décor liste exactement les images de public/jeux/<jeu>/', () => {
    for (const [jeu, fichiers] of Object.entries(DECORS)) {
      const reel = fs.readdirSync(path.join(PUBLIC, 'jeux', jeu)).filter(f => f.endsWith('.webp')).sort();
      expect([...fichiers].sort(), jeu).toEqual(reel);
    }
  });

  it('les pièces et les JSON du pantin sont ceux de public/pantin/ (sans les accessoires)', () => {
    const rel = ext => fichiers(path.join(PUBLIC, 'pantin'), ext).map(p => path.relative(path.join(PUBLIC, 'pantin'), p))
      .filter(p => !p.startsWith('accessoires')).sort();
    expect([...PIECES_PANTIN].sort()).toEqual(rel('.webp'));
    expect([...DONNEES_PANTIN].sort()).toEqual(rel('.json'));
  });

  it('téléphone : décor portrait ; ordinateur : la version paysage quand elle existe ; plus le costume', () => {
    const tel = imagesDuJeu('buzzer', { accessoires: ['micro', 'noeud'] });
    expect(tel).toContain('/jeux/buzzer/fond.webp');
    expect(tel).not.toContain('/jeux/buzzer/fond-paysage.webp');
    expect(tel).not.toContain('/jeux/buzzer/pupitre-long.webp');
    expect(tel).toContain('/pantin/accessoires/micro.webp');
    const ordi = imagesDuJeu('buzzer', { large: true });
    expect(ordi).toContain('/jeux/buzzer/fond-paysage.webp');
    expect(ordi).not.toContain('/jeux/buzzer/fond.webp');
    expect(imagesDuJeu('magie', { large: true })).toContain('/jeux/magie/fond.webp'); // pas de version paysage
    for (const u of [...tel, ...ordi]) expect(fs.existsSync(path.join(PUBLIC, u))).toBe(true);
  });

  it('la fin et la transition listent exactement les images de public/jeux/fin/ et transition/ (sans la musique)', () => {
    const reel = dossier => fs.readdirSync(path.join(PUBLIC, 'jeux', dossier)).filter(f => f.endsWith('.webp')).sort();
    expect([...FIN].sort()).toEqual(reel('fin'));
    expect([...TRANSITION].sort()).toEqual(reel('transition'));
  });

  it('la fin : scène et bureau en portrait sur téléphone, en paysage sur ordinateur', () => {
    const tel = imagesFin();
    expect(tel).toContain('/jeux/fin/scene.webp');
    expect(tel).toContain('/jeux/fin/bureau.webp');
    expect(tel).not.toContain('/jeux/fin/scene-paysage.webp');
    const ordi = imagesFin({ large: true });
    expect(ordi).toContain('/jeux/fin/scene-paysage.webp');
    expect(ordi).toContain('/jeux/fin/bureau-paysage.webp');
    expect(ordi).not.toContain('/jeux/fin/scene.webp');
    for (const u of [...tel, ...ordi, ...imagesTransition()]) expect(fs.existsSync(path.join(PUBLIC, u))).toBe(true);
  });
});

describe('prechargerPartie : l’ordre des chargements', () => {
  let demandees;
  beforeEach(() => {
    demandees = [];
    vi.stubGlobal('fetch', vi.fn(async () => ({ blob: async () => new Blob() })));
    // Une image qui se charge tout de suite, en gardant la trace de ce qui est demandé.
    vi.stubGlobal('Image', class {
      set src(u) { demandees.push(u); setTimeout(() => this.onload?.(), 0); }
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  const attendre = () => new Promise(r => setTimeout(r, 30));

  it('la transition, les décors suivants puis la fin viennent après le décor de la première manche', async () => {
    prechargerPartie([{ type: 'ninja' }, { type: 'taupe' }, { type: 'ninja' }]);
    await attendre();
    const rang = u => demandees.findIndex(x => x === u);
    const premier = rang('/jeux/ninja/fond.webp');
    expect(premier).toBeGreaterThanOrEqual(0);
    const transition = rang('/jeux/transition/fond.webp');
    const suivant = rang('/jeux/taupe/fond.webp');
    const fin = rang('/jeux/fin/scene.webp');
    expect(premier).toBeLessThan(transition);
    expect(transition).toBeLessThan(suivant);
    expect(suivant).toBeLessThan(fin);
  });

  it('un jeu seul de plusieurs tours charge aussi la transition et la fin', async () => {
    prechargerPartie([{ type: 'taupe' }, { type: 'taupe' }, { type: 'taupe' }]);
    await attendre();
    expect(demandees).toContain('/jeux/transition/rouleau.webp');
    expect(demandees).toContain('/jeux/fin/podium.webp');
  });

  it('abandonné (la carte se ferme), il ne charge plus le reste', async () => {
    const arreter = prechargerPartie([{ type: 'ninja' }, { type: 'taupe' }]);
    arreter();
    await attendre();
    expect(demandees).not.toContain('/jeux/fin/scene.webp');
  });
});
