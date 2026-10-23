/**
 * Réviz se trompe ? (23/10) : Réviz, présentateur de jeu télé, affirme une phrase ; vrai ou faux au
 * buzzer. Les affirmations sont fabriquées à partir des banques des thèmes faciles (themesJeux.js) :
 * une vraie reprend une paire telle quelle (« La capitale de l'Italie, c'est Rome ! »), une fausse
 * échange la réponse avec celle d'un autre élément du même thème (« …c'est Paris ! »). Une phrase
 * courte et naturelle par thème ; quand une paire n'a pas de gabarit écrit (banque modifiée), une
 * phrase générique prend le relais. Environ la moitié des affirmations sont vraies.
 */
import { THEMES_JEUX } from './themesJeux';

const melange = liste => {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const minuscule = t => t.charAt(0).toLowerCase() + t.slice(1);
// Typographie française : espaces insécables dans les guillemets et devant « ! » (le guillemet ou le
// point d'exclamation ne se retrouvent jamais seuls en bout de ligne dans la bulle).

// « de la France », « du Portugal », « des Pays-Bas » : le pays avec son article.
export const DE_PAYS = {
  France: 'de la France', Italie: "de l'Italie", Espagne: "de l'Espagne", Allemagne: "de l'Allemagne", Portugal: 'du Portugal',
  Belgique: 'de la Belgique', 'Royaume-Uni': 'du Royaume-Uni', Grèce: 'de la Grèce', 'Pays-Bas': 'des Pays-Bas',
  Autriche: "de l'Autriche", Pologne: 'de la Pologne', Irlande: "de l'Irlande", Suède: 'de la Suède', Suisse: 'de la Suisse',
};
// Les grandes dates : une phrase par événement, la date à la fin.
const EVENEMENTS = {
  'Révolution française': 'La Révolution française éclate en', 'Colomb en Amérique': 'Colomb arrive en Amérique en',
  'Charlemagne empereur': 'Charlemagne devient empereur en', Marignan: 'La bataille de Marignan a lieu en',
  'Grande Guerre': 'La Grande Guerre commence en', 'Fin de la guerre 39-45': 'La Seconde Guerre mondiale finit en',
  'Un homme sur la Lune': 'Un homme marche sur la Lune en', 'Napoléon empereur': 'Napoléon devient empereur en',
  Alésia: "La bataille d'Alésia a lieu en", "Fin de l'esclavage": "L'esclavage est aboli en France en",
};
// Sciences : la banque mélange formules, organes, astres et températures. Une fausse n'échange
// qu'à l'intérieur d'une même famille (« Le cœur sert à digérer ! », pas « …sert à une étoile »).
const SCIENCES = {
  'H₂O': { famille: 'formule', dit: r => `H₂O, c'est la formule ${r}\u00a0!`, r: "de l'eau" },
  'CO₂': { famille: 'formule', dit: r => `CO₂, c'est la formule ${r}\u00a0!`, r: 'du dioxyde de carbone' },
  'O₂': { famille: 'formule', dit: r => `O₂, c'est la formule ${r}\u00a0!`, r: 'du dioxygène' },
  Cœur: { famille: 'organe', dit: r => `Le cœur sert à ${r}\u00a0!`, r: 'pomper le sang' },
  Poumons: { famille: 'organe', dit: r => `Les poumons servent à ${r}\u00a0!`, r: 'respirer' },
  Estomac: { famille: 'organe', dit: r => `L'estomac sert à ${r}\u00a0!`, r: 'digérer' },
  Soleil: { famille: 'astre', dit: r => `Le Soleil est ${r}\u00a0!`, r: 'une étoile' },
  Lune: { famille: 'astre', dit: r => `La Lune est ${r}\u00a0!`, r: 'un satellite' },
  '0 °C': { famille: 'eau', dit: r => `À 0 °C, l'eau ${r}\u00a0!`, r: 'gèle' },
  '100 °C': { famille: 'eau', dit: r => `À 100 °C, l'eau ${r}\u00a0!`, r: 'bout' },
};

/**
 * Gabarits par thème. paires(theme, n) : { titre, paires } avec au moins n paires { a, b } ; dire(p, reponse) : la phrase
 * avec la réponse donnée ; reponse(p) : la bonne réponse ; famille(p) : les fausses réponses se
 * prennent d'abord dans la même famille (même nature de mot) ; leurre(p) : fausses réponses écrites
 * à la main (tables) ; corrige(p) : la correction, pour le récap.
 */
const GABARITS = {
  capitales: {
    dire: (p, r) => `La capitale ${DE_PAYS[p.a] ?? `de ${p.a}`}, c'est ${r}\u00a0!`,
  },
  contraires: {
    dire: (p, r) => `Le contraire de «\u00a0${p.a}\u00a0», c'est «\u00a0${r}\u00a0»\u00a0!`,
    // Un verbe contre un verbe, un adjectif contre un adjectif : « monter », c'est « sortir » !
    famille: p => (/(er|ir|re)$/.test(p.a) && p.a !== 'propre' ? 'verbe' : ['jour', 'toujours'].includes(p.a) ? 'autre' : 'adjectif'),
  },
  animaux: {
    dire: (p, r) => `En anglais, «\u00a0${p.a}\u00a0» veut dire «\u00a0${r}\u00a0»\u00a0!`,
  },
  dates: {
    // La banque est date -> événement : ici la phrase porte l'événement, la réponse est la date.
    reponse: p => p.a,
    dire: (p, r) => (EVENEMENTS[p.b] ? `${EVENEMENTS[p.b]} ${r}\u00a0!` : `${p.b} : c'est en ${r}\u00a0!`),
  },
  sciences: {
    reponse: p => SCIENCES[p.a]?.r ?? minuscule(p.b),
    dire: (p, r) => (SCIENCES[p.a] ? SCIENCES[p.a].dit(r) : `${p.a} : ${r}\u00a0!`),
    famille: p => SCIENCES[p.a]?.famille,
  },
  tables: {
    // 7 × 8 = 63 : le résultat d'une case voisine de la même table, l'erreur qu'on fait vraiment.
    paires: (theme, n) => theme.preparer(Math.min(n, 8)),
    dire: (p, r) => `${p.a} = ${r}\u00a0!`,
    leurre: p => {
      const [t, m] = p.a.split(' × ').map(Number);
      return melange([m - 1, m + 1]).filter(k => k >= 1 && k <= 10).map(k => String(t * k));
    },
    corrige: p => `${p.a} = ${p.b}`,
  },
};

const PAR_DEFAUT = {
  reponse: p => p.b,
  dire: (p, r) => `${p.a}, c'est ${r}\u00a0!`,
  famille: () => null,
  paires: theme => ({ titre: theme.titre, paires: theme.banque.map(([a, b]) => ({ a, b })) }),
};

/**
 * Un tour de « Réviz se trompe ? » sur un thème : n affirmations { texte, vrai, correction } ; la
 * phrase est aussi donnée en morceaux (avant + dit + apres, bonne : la vraie réponse) pour barrer
 * la mauvaise réponse dans la bulle et écrire la bonne à côté.
 * Paires toutes différentes ; la moitié vraies (une de plus, au hasard, si n est impair), et jamais
 * plus de deux réponses identiques d'affilée (sinon on joue en tapant toujours le même buzzer).
 */
export function tourDeBuzzer(theme, n = 4) {
  const g = { ...PAR_DEFAUT, ...GABARITS[theme.id] };
  const { titre, paires: toutes } = g.paires(theme, n);
  const choisies = melange(toutes).slice(0, n);
  const nVraies = Math.floor(n / 2) + (n % 2 && Math.random() < 0.5 ? 1 : 0);
  let verdicts;
  do verdicts = melange(choisies.map((_, i) => i < nVraies));
  while (verdicts.some((v, i) => i >= 2 && v === verdicts[i - 1] && v === verdicts[i - 2]));
  const corrige = g.corrige ?? (p => g.dire(p, g.reponse(p)).replace(/\u00a0!$/, ''));
  const deja = new Set();
  const affirmations = choisies.map((p, i) => {
    const bonne = g.reponse(p);
    const vrai = verdicts[i];
    // Fausse réponse : un autre élément du thème (même famille d'abord), jamais deux fois la même
    // dans un tour ; sans leurre possible, l'affirmation reste vraie.
    const leurres = g.leurre ? g.leurre(p) : [
      ...melange(toutes.filter(x => g.famille(x) === g.famille(p))), ...melange(toutes),
    ].map(g.reponse);
    const fausse = vrai ? null : leurres.find(r => r !== bonne && !deja.has(r)) ?? null;
    if (fausse) deja.add(fausse);
    const dit = fausse ?? bonne;
    const [avant, apres = ''] = g.dire(p, '\u0001').split('\u0001');
    return { texte: g.dire(p, dit), vrai: !fausse, correction: corrige(p), avant, dit, bonne, apres, paire: p };
  });
  return { theme: theme.id, matiere: theme.matiere, titre, affirmations };
}

/** Le thème par son identifiant (tests, liens directs). */
export const themeJeux = id => THEMES_JEUX.find(t => t.id === id);
