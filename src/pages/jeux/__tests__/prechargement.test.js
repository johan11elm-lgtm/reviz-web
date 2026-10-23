import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DECORS, DONNEES_PANTIN, PIECES_PANTIN, imagesDuJeu } from '../prechargement';

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
});
