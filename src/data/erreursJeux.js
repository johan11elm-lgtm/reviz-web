/**
 * Les erreurs de Réviz Games (23/10) : un format commun à tous les jeux, pour le récap de fin de
 * partie (une carte par erreur, Réviz qui explique) :
 *
 *   { jeu, theme, question, donnee, bonne, explication }
 *
 * jeu : l'identifiant du jeu ('magie', 'lance', 'buzzer'…) ; theme : le nom lisible du tour
 * (« Table de 7 », « Les capitales ») ; question : ce qui était demandé ; donnee : la réponse de
 * l'élève, ou null si le temps s'est écoulé ; bonne : la bonne réponse ; explication : une ou deux
 * phrases de Réviz, écrites par le code, à hauteur de collégien.
 *
 * L'explication part de la paire du thème ({ a, b } de themesJeux.js) et, quand l'élève a donné une
 * autre réponse du même thème, dit à quoi celle-ci correspond (« Paris, c'est la capitale de la
 * France. ») : on apprend aussi de sa confusion. Sinon, un petit truc pour retenir.
 */
import { THEMES_JEUX } from './themesJeux';
import { DE_PAYS } from './affirmationsJeux';

const banqueDe = id => THEMES_JEUX.find(t => t.id === id)?.banque?.map(([a, b]) => ({ a, b })) ?? [];
// La paire du thème qui contient ce mot (d'un côté ou de l'autre), autre que la paire en cours.
// Sans tenir compte de la casse : au buzzer, Réviz dit « un satellite » (banque : « Un satellite »).
const pareil = (x, y) => !!x && !!y && x.toLowerCase() === y.toLowerCase();
const paireDe = (id, mot, sauf) => banqueDe(id).find(p => (pareil(p.a, mot) || pareil(p.b, mot)) && p.a !== sauf.a);
// « de grand », « d'entrer » (guillemets : « le contraire d'« entrer » »).
const de = mot => (/^[aeiouyhéèêàâîôû]/i.test(mot) ? `d'« ${mot} »` : `de « ${mot} »`);
const g = mot => `« ${mot} »`;

// ── Tables : un truc de calcul selon le facteur le plus facile ──────────────────────────────
const TRUCS_TABLES = [
  [2, (n, r) => `c'est le double de ${n}.`],
  [5, (n, r) => `${n} × 10 = ${n * 10}, puis la moitié : ${r}.`],
  [9, (n, r) => `${n} × 10 = ${n * 10}, puis on enlève ${n} : ${r}.`],
  [4, (n, r) => `le double de ${n}, c'est ${2 * n}, et encore le double : ${r}.`],
  [3, (n, r) => `${n} + ${n} + ${n} = ${r}.`],
  [6, (n, r) => `${n} × 5 = ${5 * n}, plus ${n} : ${r}.`],
  [8, (n, r) => `le double de ${n} trois fois : ${2 * n}, ${4 * n}, ${r}.`],
];
function expliquerTable(p, autre) {
  const [t, m] = p.a.split(' × ').map(Number);
  const r = t * m;
  let principal;
  if (r === 56) principal = `${p.a} = 56 : pense à 5, 6, 7, 8 → 56 = 7 × 8.`;
  else if (t === m) principal = `${p.a} = ${r} : un nombre fois lui-même, ça se retient par cœur.`;
  else {
    const [f, truc] = TRUCS_TABLES.find(([k]) => k === t || k === m);
    principal = `${p.a} = ${r} : ${truc(f === t ? m : t, r)}`;
  }
  let suite = null;
  if (autre && /^\d+$/.test(autre) && Number(autre) !== r) {
    const x = Number(autre);
    suite = x % t === 0 && x / t <= 10 ? `${x}, c'est ${t} × ${x / t}.`
      : x % m === 0 && x / m <= 10 ? `${x}, c'est ${m} × ${x / m}.`
        : `${x} n'est pas dans la table de ${t}.`;
  } else if (autre && /×/.test(autre) && autre !== p.a) {
    const [x, y] = autre.split(' × ').map(Number);
    if (x * y !== r) suite = `${autre} = ${x * y}.`;
  }
  return [principal, suite];
}

// ── Les autres thèmes : une phrase principale, une phrase sur la confusion, un truc ─────────
const TRUCS_CAPITALES = {
  Suisse: 'Pas Genève ni Zurich : la ville fédérale, c\'est Berne.',
  'Pays-Bas': 'Le gouvernement est à La Haye, mais la capitale reste Amsterdam.',
  'Royaume-Uni': 'Big Ben et la Tamise, c\'est Londres.',
  Italie: 'Le Colisée, c\'est à Rome.',
  Grèce: 'L\'Acropole, c\'est à Athènes.',
};
const EXEMPLES_CONTRAIRES = {
  grand: 'Une girafe est grande, une souris est petite.',
  chaud: 'Le soleil est chaud, la glace est froide.',
  rapide: 'Le guépard est rapide, l\'escargot est lent.',
  jour: 'Le jour il fait clair, la nuit il fait noir.',
  haut: 'Le toit est en haut, la cave est en bas.',
  lourd: 'Un éléphant est lourd, une plume est légère.',
  vrai: '2 + 2 = 4, c\'est vrai ; 2 + 2 = 5, c\'est faux.',
  ouvert: 'Porte ouverte, on passe ; porte fermée, on frappe.',
  plein: 'Un verre plein déborde, un verre vide n\'a plus rien.',
  propre: 'Après le bain on est propre, après la boue on est sale.',
  gagner: 'À la fin du match, une équipe gagne et l\'autre perd.',
  entrer: 'On entre dans la classe, on en sort à la sonnerie.',
  monter: 'On monte l\'escalier, puis on le descend.',
  toujours: 'Toujours, c\'est à chaque fois ; jamais, c\'est pas une seule fois.',
};
const TRUCS_ANIMAUX = {
  dog: 'Un hot-dog, c\'est un « chien chaud » !',
  cat: '« Cat » ressemble à « chat ».',
  mouse: 'Mickey Mouse est une souris.',
  duck: 'Donald Duck est un canard.',
  pig: 'Peppa Pig est un petit cochon.',
  fish: 'Fish and chips : du poisson-frites.',
  bear: 'Un teddy bear, c\'est un ours en peluche.',
  cow: 'Un cowboy garde les vaches.',
  horse: 'Un seahorse, un « cheval de mer », c\'est un hippocampe.',
  bird: 'Dans Angry Birds, ce sont des oiseaux.',
  rabbit: 'Le lapin blanc d\'Alice, c\'est le White Rabbit.',
  frog: 'Le prince grenouille, en anglais : The Frog Prince.',
  snake: 'Le jeu Snake : un serpent qui grandit.',
  sheep: 'Sheep et sleep : on compte les moutons pour dormir.',
};
// Dates : une phrase par événement ; COURT pour parler de l'autre date.
const DATES = {
  'Révolution française': ['Le 14 juillet 1789, on prend la Bastille : c\'est le début de la Révolution française.', 'la Révolution française'],
  'Colomb en Amérique': ['En 1492, Christophe Colomb traverse l\'Atlantique et arrive en Amérique.', 'l\'arrivée de Colomb en Amérique'],
  'Charlemagne empereur': ['Le jour de Noël de l\'an 800, Charlemagne est sacré empereur à Rome.', 'le sacre de Charlemagne'],
  Marignan: ['1515, Marignan : la victoire de François Ier, la date la plus connue de France.', 'la bataille de Marignan'],
  'Grande Guerre': ['La Première Guerre mondiale commence en 1914 et finit en 1918.', 'le début de la Grande Guerre'],
  'Fin de la guerre 39-45': ['La Seconde Guerre mondiale commence en 1939 et finit en 1945.', 'la fin de la guerre 39-45'],
  'Un homme sur la Lune': ['En juillet 1969, Neil Armstrong est le premier homme à marcher sur la Lune.', 'le premier pas sur la Lune'],
  'Napoléon empereur': ['En 1804, Napoléon Bonaparte se fait sacrer empereur des Français.', 'le sacre de Napoléon'],
  Alésia: ['En 52 av. J.-C., Vercingétorix se rend à Jules César à Alésia.', 'la bataille d\'Alésia'],
  "Fin de l'esclavage": ['En 1848, la France abolit l\'esclavage, grâce à Victor Schœlcher.', 'la fin de l\'esclavage'],
};
const SCIENCES = {
  'H₂O': 'H₂O, c\'est l\'eau : 2 atomes d\'hydrogène (H) et 1 d\'oxygène (O).',
  'CO₂': 'CO₂, c\'est le dioxyde de carbone : 1 carbone (C) et 2 oxygènes (O), le gaz qu\'on rejette en respirant.',
  'O₂': 'O₂, c\'est le dioxygène : 2 atomes d\'oxygène, le gaz qu\'on respire.',
  Cœur: 'Le cœur est un muscle qui pompe le sang dans tout le corps.',
  Poumons: 'Les poumons servent à respirer : ils prennent le dioxygène de l\'air.',
  Estomac: 'L\'estomac sert à digérer : il broie et mélange les aliments.',
  Soleil: 'Le Soleil est une étoile : il fabrique sa propre lumière.',
  Lune: 'La Lune est un satellite : elle tourne autour de la Terre.',
  '0 °C': 'À 0 °C, l\'eau gèle et devient de la glace.',
  '100 °C': 'À 100 °C, l\'eau bout et part en vapeur.',
};

const EXPLICATIONS = {
  tables: expliquerTable,
  capitales: (p, autre) => {
    const q = paireDe('capitales', autre, p);
    return [
      `La capitale ${DE_PAYS[p.a] ?? `de ${p.a}`}, c'est ${p.b}.`,
      q ? (autre === q.b ? `${q.b}, c'est la capitale ${DE_PAYS[q.a] ?? `de ${q.a}`}.` : `La capitale ${DE_PAYS[q.a] ?? `de ${q.a}`}, c'est ${q.b}.`) : TRUCS_CAPITALES[p.a],
    ];
  },
  contraires: (p, autre) => {
    const q = paireDe('contraires', autre, p);
    return [`Le contraire ${de(p.a)}, c'est ${g(p.b)}.`, q ? `${g(autre)} va avec ${g(autre === q.a ? q.b : q.a)}.` : EXEMPLES_CONTRAIRES[p.a]];
  },
  animaux: (p, autre) => {
    const q = paireDe('animaux', autre, p);
    return [`En anglais, ${g(p.a)} veut dire ${g(p.b)}.`, q ? (autre === q.b ? `${g(q.b)} se dit ${g(q.a)}.` : `${g(q.a)} veut dire ${g(q.b)}.`) : TRUCS_ANIMAUX[p.a]];
  },
  dates: (p, autre) => {
    const q = paireDe('dates', autre, p);
    const [phrase] = DATES[p.b] ?? [`${p.b} : c'est en ${p.a}.`];
    return [phrase, q ? `${q.a}, c'est ${DATES[q.b]?.[1] ?? q.b.toLowerCase()}.` : null];
  },
  sciences: (p, autre) => {
    const q = paireDe('sciences', autre, p);
    return [SCIENCES[p.a] ?? `${p.a} va avec ${g(p.b)}.`, q ? `${g(autre)} va avec ${g(pareil(autre, q.a) ? q.b : q.a)}.` : null];
  },
};

/**
 * L'explication de Réviz pour une paire d'un thème : une ou deux phrases. autre : la réponse
 * donnée par l'élève (ou la fausse réponse de Réviz au buzzer), pour expliquer la confusion.
 */
export function expliquer(themeId, paire, autre = null) {
  const f = EXPLICATIONS[themeId];
  const phrases = f ? f(paire, autre) : [`${g(paire.a)} va avec ${g(paire.b)}.`];
  return phrases.filter(Boolean).join(' ');
}

/** Le nom du tour sans le point d'exclamation du titre : « Table de 7 », « Les capitales ». */
export const nomTheme = titre => (titre ?? '').replace(/\s*!$/, '');

/**
 * Une erreur au format commun. tour : { theme (id du thème), titre } ; paire : { a, b } du thème ;
 * autre : ce qui sert à expliquer la confusion (par défaut, la réponse de l'élève).
 */
export function erreurJeu({ jeu, tour, paire, question, donnee = null, bonne, autre = donnee }) {
  return { jeu, theme: nomTheme(tour.titre), question, donnee, bonne, explication: expliquer(tour.theme, paire, autre) };
}

/** Une erreur par question : la première rencontrée (celle où l'élève avait répondu). */
export function erreursUniques(erreurs) {
  const vues = new Set();
  return erreurs.filter(e => {
    const cle = `${e.jeu}|${e.question}|${e.bonne}`;
    if (vues.has(cle)) return false;
    vues.add(cle);
    return true;
  });
}
