/**
 * Le ninja des fautes (Réviz Games, 23/10) : les mots portés par les fruits, écrits à la main.
 * Chaque paire est [bien écrit, mal écrit] ; un fruit ne porte que l'un des deux, et deux fruits
 * d'un même tour ne viennent jamais de la même paire. Niveau 6e-5e, une seule faute par étiquette,
 * franche : pas d'exception piège (landaus, pneus, festivals…), pas de cas ambigu (ces / ses).
 * Le contenu n'est pas branché aux leçons : il est facile exprès.
 */

// Tour 1 : les pluriels en -x (et leurs fautes en -s, -als, -aus), plus quelques -s qu'on écrit -x.
export const PLURIELS = [
  ['chevaux', 'chevals'], ['oiseaux', 'oiseaus'], ['bijoux', 'bijous'], ['jeux', 'jeus'],
  ['gâteaux', 'gâteaus'], ['journaux', 'journals'], ['animaux', 'animals'], ['bateaux', 'bateaus'],
  ['châteaux', 'châteaus'], ['genoux', 'genous'], ['cailloux', 'caillous'], ['hiboux', 'hibous'],
  ['cheveux', 'cheveus'], ['chapeaux', 'chapeaus'], ['feux', 'feus'], ['hôpitaux', 'hôpitals'],
  ['rideaux', 'rideaus'], ['manteaux', 'manteaus'], ['cadeaux', 'cadeaus'], ['choux', 'chous'],
  ['poux', 'pous'], ['neveux', 'neveus'], ['trous', 'troux'], ['clous', 'cloux'], ['bisous', 'bisoux'],
  ['tuyaux', 'tuyaus'],
];

// Tour 2 : les homophones a / à, et / est, son / sont, on / ont, ce / se, ça / sa, c'est / s'est.
export const HOMOPHONES = [
  ['il a faim', 'il à faim'], ['elle a peur', 'elle à peur'], ['il a un chat', 'il à un chat'],
  ['à la plage', 'a la plage'], ['va à l’école', 'va a l’école'], ['à demain !', 'a demain !'],
  ['elle est partie', 'elle et partie'], ['toi et moi', 'toi est moi'], ['du pain et du lait', 'du pain est du lait'],
  ['ils sont là', 'ils son là'], ['son vélo', 'sont vélo'], ['elles sont amies', 'elles son amies'],
  ['on a gagné', 'ont a gagné'], ['ils ont froid', 'ils on froid'], ['elles ont fini', 'elles on fini'],
  ['ce chien', 'se chien'], ['il se lave', 'il ce lave'], ['ça va ?', 'sa va ?'], ['sa trousse', 'ça trousse'],
  ['c’est beau', 's’est beau'], ['il s’est levé', 'il c’est levé'],
];

// Tour 3 : les accords dans le groupe du nom et la conjugaison simple (présent).
export const ACCORDS = [
  ['des pommes vertes', 'des pommes vert'], ['les petits chats', 'les petit chats'], ['une robe bleue', 'une robe bleu'],
  ['une belle maison', 'un belle maison'], ['des chiens noirs', 'des chiens noir'], ['trois livres', 'trois livre'],
  ['elle est contente', 'elle est content'], ['les grandes filles', 'les grande filles'], ['une fleur rouge', 'une fleur rouges'],
  ['nous chantons', 'nous chantont'], ['tu manges', 'tu mange'], ['ils jouent', 'ils joue'], ['je finis', 'je finit'],
  ['vous êtes', 'vous êtres'], ['tu es grand', 'tu est grand'], ['il mange', 'il manges'], ['nous avons', 'nous avont'],
  ['je peux', 'je peut'], ['tu veux', 'tu veut'], ['vous dites', 'vous disez'], ['vous faites', 'vous faisez'],
];

export const BANQUES_NINJA = [PLURIELS, HOMOPHONES, ACCORDS];

/**
 * Les trois tours. n : fruits lancés, dont `fautes` mal écrits ; vol : secondes d'un fruit en l'air ;
 * salves : fruits lancés ensemble (1 ou 2), dans l'ordre ; la dernière part `fin` secondes avant la fin
 * du chrono, encore en l'air quand il sonne (le chrono compte : une faute pas tranchée à temps).
 */
export const TOURS_NINJA = [
  { duree: 14, n: 6, fautes: 3, vol: 3.1, fin: 1.9, salves: [1, 1, 1, 1, 1, 1], titre: 'Les pluriels', sous: 'Un fruit à la fois' },
  { duree: 13, n: 7, fautes: 3, vol: 2.8, fin: 1.8, salves: [1, 1, 2, 1, 2], titre: 'Les homophones', sous: 'a / à, et / est, son / sont…' },
  { duree: 12, n: 8, fautes: 4, vol: 2.5, fin: 1.7, salves: [1, 2, 1, 2, 2], titre: 'Les accords', sous: 'Plus vite, ninja !' },
];

export const FRUITS_NINJA = ['pasteque', 'orange', 'pomme', 'citron'];
const melange = liste => {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const entre = (a, b) => a + Math.random() * (b - a);

/**
 * Les fruits d'un tour au niveau 0, 1 ou 2 : mots tirés au hasard dans la banque du niveau, fautes
 * placées au hasard dans la volée, chaque fruit avec son départ et sa trajectoire. Repère de l'aire de
 * jeu : x de 0 (gauche) à 1 (droite), y de 0 (haut) à 1 (bas) ; un fruit part sous le bord du bas,
 * monte jusqu'à `haut` puis retombe en `vol` secondes en dérivant de x0 à x1.
 */
export function voleeNinja(niveau) {
  const tour = TOURS_NINJA[niveau];
  const paires = melange(BANQUES_NINJA[niveau]).slice(0, tour.n);
  const fautes = new Set(melange(paires.map((_, i) => i)).slice(0, tour.fautes));
  // Les salves, réparties du début (0,5 s) jusqu'à `fin` secondes avant le bout du chrono.
  const derniere = tour.duree - tour.fin, pas = (derniere - 0.5) / (tour.salves.length - 1);
  const fruits = [];
  let k = 0, avant = null;
  tour.salves.forEach((taille, s) => {
    const t = 0.5 + s * pas;
    // Deux fruits ensemble partent chacun de son côté et se croisent à peine ; seul, il part d'un
    // côté au hasard et dérive vers l'autre (jamais tout droit).
    const cotes = taille === 2 ? [-1, 1] : [Math.random() < 0.5 ? -1 : 1];
    cotes.forEach((cote, j) => {
      const [bon, faux] = paires[k];
      const faute = fautes.has(k);
      let fruit;
      do { fruit = FRUITS_NINJA[Math.floor(Math.random() * FRUITS_NINJA.length)]; } while (fruit === avant);
      avant = fruit;
      const x0 = 0.5 + cote * entre(0.12, 0.3);
      fruits.push({
        id: k, mot: faute ? faux : bon, faute, bon, faux, fruit,
        t: t + j * 0.18, vol: tour.vol * entre(0.95, 1.05),
        x0, x1: 0.5 - cote * entre(0.02, 0.2), haut: taille === 2 && j === 1 ? entre(0.36, 0.44) : entre(0.24, 0.34),
        tourne: (Math.random() < 0.5 ? -1 : 1) * entre(25, 70),
      });
      k += 1;
    });
  });
  return fruits;
}
