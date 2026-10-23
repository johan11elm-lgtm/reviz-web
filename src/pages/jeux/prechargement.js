import { prechargerMoteurPantin } from '../../components/Pantin';

/**
 * Le préchargement des Réviz Games (23/10, Johan : « fais charger le jeu pendant la carte de début ») :
 * pendant que l'élève lit la carte de début, on charge ce que la première manche va afficher (le moteur
 * du pantin et ses pièces, le costume de Réviz, le décor du jeu), puis le décor des jeux suivants. Les
 * images passent par le cache du navigateur : le jeu les retrouve aussitôt. La musique, elle, se charge
 * en démarrant (elle part dès la carte).
 *
 * Les listes reprennent le contenu de public/jeux/<jeu>/ et de public/pantin/ (images et JSON ; test :
 * __tests__/prechargement.test.js, qui échoue si un fichier est ajouté ou retiré sans les mettre à jour).
 * Sur téléphone, les décors en paysage (« -paysage », « -long ») ne sont pas chargés, et inversement.
 */
export const DECORS = {
  magie: ['carte-dos.webp', 'carte-face.webp', 'fond.webp', 'fumee.webp', 'table.webp'],
  lance: ['etiquette.webp', 'fond.webp', 'panier.webp', 'pupitre.webp', 'tableau.webp'],
  buzzer: ['buzzer-rouge-dome.webp', 'buzzer-rouge-socle.webp', 'buzzer-vert-dome.webp', 'buzzer-vert-socle.webp', 'fond-paysage.webp', 'fond.webp', 'pupitre-long.webp', 'pupitre.webp'],
  pizzeria: ['assiette.webp', 'comptoir-long.webp', 'comptoir.webp', 'fond-paysage.webp', 'fond.webp', 'main-attrape.webp', 'main-pointe.webp', 'main-tapote.webp', 'pizza-bord.webp', 'pizza.webp', 'planche.webp', 'ticket.webp'],
  ninja: ['citron-d.webp', 'citron-g.webp', 'citron.webp', 'etiquette.webp', 'fond-paysage.webp', 'fond.webp', 'jus-citron.webp', 'jus-orange.webp', 'jus-pasteque.webp', 'jus-pomme.webp', 'orange-d.webp', 'orange-g.webp', 'orange.webp', 'pasteque-d.webp', 'pasteque-g.webp', 'pasteque.webp', 'pomme-d.webp', 'pomme-g.webp', 'pomme.webp'],
  taupe: ['etoile.webp', 'fond-paysage.webp', 'fond.webp', 'pancarte.webp', 'taupe-moqueuse.webp', 'taupe-sonnee.webp', 'taupe.webp', 'trou-avant.webp', 'trou.webp'],
};
export const PIECES_PANTIN = [
  'bouche-A.webp', 'bouche-EI.webp', 'bouche-MBP.webp', 'bouche-O.webp', 'bouche-U.webp', 'bouche-fier.webp',
  'bouche-moue.webp', 'bouche-repos.webp', 'bouche-rire.webp', 'bouche-triste.webp',
  'bras/grandes/coucou-d-main.webp', 'bras/grandes/coucou-d-tube.webp', 'bras/grandes/enlair-d-main.webp',
  'bras/grandes/enlair-d-tube.webp', 'bras/grandes/enlair-g-main.webp', 'bras/grandes/enlair-g-tube.webp',
  'bras/grandes/hanche-d-main.webp', 'bras/grandes/hanche-d-tube.webp', 'bras/grandes/hanche-g-main.webp',
  'bras/grandes/hanche-g-tube.webp', 'bras/grandes/menton-d-main.webp', 'bras/grandes/menton-d-tube.webp',
  'bras/grandes/tempe-d-main.webp', 'bras/grandes/tempe-d-tube.webp', 'bras/main-maitresse-d.webp',
  'bras/main-maitresse-g.webp', 'bras/main-ouverte.webp', 'bras/main-plate.webp', 'bras/main-poing.webp',
  'bras/main-pointe.webp', 'bras/main-pouce.webp', 'bras/tube-d.webp', 'bras/tube-g.webp', 'corps.webp',
  'effets/ampoule.webp', 'effets/coeurs.webp', 'effets/eclair.webp', 'effets/etoiles.webp',
  'effets/exclamation.webp', 'effets/interrogation.webp', 'effets/sueur.webp', 'jambes.webp', 'jambes/d-pied.webp',
  'jambes/d-pointe.webp', 'jambes/d-tube.webp', 'jambes/g-pied.webp', 'jambes/g-pointe.webp', 'jambes/g-tube.webp',
  'larmes.webp', 'oeil-g/globe.webp', 'oeil-g/iris.webp', 'oeil-g/paupiere-p100.webp', 'oeil-g/paupiere-p25.webp',
  'oeil-g/paupiere-p50.webp', 'oeil-g/paupiere-p75.webp', 'oeil-g/special-coeurs.webp',
  'oeil-g/special-etoiles.webp', 'oeil-g/special-spirale.webp', 'oeil/globe.webp', 'oeil/iris.webp',
  'oeil/paupiere-p100.webp', 'oeil/paupiere-p25.webp', 'oeil/paupiere-p50.webp', 'oeil/paupiere-p75.webp',
  'oeil/special-coeurs.webp', 'oeil/special-etoiles.webp', 'oeil/special-spirale.webp', 'sourcils.webp',
  'sous-sourcils.webp',
];
// Les gestes et le squelette du pantin (le moteur les lit en créant Réviz).
export const DONNEES_PANTIN = [
  'bras/bras.json', 'bras/caoutchouc.json', 'bras/grandes/coucou-d.json', 'bras/grandes/enlair-d.json', 'bras/grandes/enlair-g.json',
  'bras/grandes/hanche-d.json', 'bras/grandes/hanche-g.json', 'bras/grandes/index.json', 'bras/grandes/menton-d.json', 'bras/grandes/tempe-d.json', 'jambes/jambes.json', 'pantin3d.json',
];

const enPaysage = f => /-(paysage|long)\.webp$/.test(f);
const aSaVersionPaysage = (j, f) => DECORS[j].includes(f.replace(/\.webp$/, '-paysage.webp')) || DECORS[j].includes(f.replace(/\.webp$/, '-long.webp'));

/** Les images d'un jeu pour cet écran : son décor (portrait ou paysage) et le costume de Réviz. */
export function imagesDuJeu(jeu, { large = false, accessoires = [] } = {}) {
  const decor = (DECORS[jeu] ?? []).filter(f => (large ? !aSaVersionPaysage(jeu, f) : !enPaysage(f)));
  return [...decor.map(f => `/jeux/${jeu}/${f}`), ...accessoires.map(a => `/pantin/accessoires/${a}.webp`)];
}

const gardees = new Set(); // les images en cours de chargement restent référencées
const chargerDonnee = url => fetch(url).then(r => r.blob()).catch(() => {});
function chargerImage(url) {
  return new Promise(ok => {
    const im = new Image();
    gardees.add(im);
    const fin = () => { gardees.delete(im); ok(); };
    im.onload = fin; im.onerror = fin;
    im.decoding = 'async';
    im.src = url;
  });
}

/**
 * Charge la partie : d'abord tout ce qu'il faut pour la première manche (progression comptée sur
 * cette part, onProgres(0 → 1)), puis le décor des manches suivantes, en arrière-plan.
 * accessoiresDe(type) : le costume de Réviz pour ce jeu. Renvoie une fonction qui arrête le décompte.
 */
export function prechargerPartie(partie, { large = false, accessoiresDe = () => [], onProgres = () => {} } = {}) {
  let vivant = true;
  const types = [...new Set(partie.map(m => m.type))];
  const [premier, ...suivants] = types;
  const urgent = [...PIECES_PANTIN.map(p => `/pantin/${p}`), ...imagesDuJeu(premier, { large, accessoires: accessoiresDe(premier) })];
  const donnees = DONNEES_PANTIN.map(d => `/pantin/${d}`);
  let faits = 0;
  const total = urgent.length + donnees.length + 1; // + le moteur du pantin
  const un = () => { faits += 1; if (vivant) onProgres(Math.min(1, faits / total)); };
  onProgres(0);
  Promise.all([prechargerMoteurPantin().then(un, un), ...donnees.map(u => chargerDonnee(u).then(un)), ...urgent.map(u => chargerImage(u).then(un))]).then(async () => {
    for (const t of suivants) {
      if (!vivant) return;
      await Promise.all(imagesDuJeu(t, { large, accessoires: accessoiresDe(t) }).map(chargerImage));
    }
  });
  return () => { vivant = false; };
}
