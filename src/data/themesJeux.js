/**
 * Thèmes faciles de Réviz Games (22/10) : les bases du collège, sans lien avec une leçon. Un tour =
 * un thème, et toutes ses paires suivent la même règle (« Table de 7 », « Capitales ») : on comprend
 * en une seconde ce qu'on cherche. Chaque thème donne `n` paires tirées au hasard ; les tables sont
 * fabriquées par le code, les autres viennent d'une petite banque écrite à la main (niveau 5e).
 */
const melange = liste => {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const tirer = (banque, n) => melange(banque).slice(0, n).map(([a, b]) => ({ a, b }));

// Réviz lance : la question s'écrit au tableau, les réponses pendent sous les paniers. Le côté le
// plus court de chaque paire va sur les étiquettes : sens 'ab' (a au tableau, b au panier) ou 'ba'.
// aide : petite ligne à la craie sous la question ; question : mise en forme du tableau.

export const THEMES_JEUX = [
  {
    id: 'tables', matiere: 'Maths',
    lancer: { sens: 'ab', question: a => `${a} = ?` },
    // Une table au hasard (3 à 9) et des multiplicateurs distincts : résultats tous différents.
    preparer: n => {
      const t = 3 + Math.floor(Math.random() * 7);
      return { titre: `Table de ${t} !`, paires: melange([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, n).map(m => ({ a: `${t} × ${m}`, b: String(t * m) })) };
    },
  },
  {
    id: 'animaux', matiere: 'Anglais', titre: 'Animals !',
    lancer: { sens: 'ab', aide: 'En français ?' },
    banque: [['dog', 'chien'], ['cat', 'chat'], ['horse', 'cheval'], ['bird', 'oiseau'], ['cow', 'vache'], ['sheep', 'mouton'],
      ['pig', 'cochon'], ['mouse', 'souris'], ['rabbit', 'lapin'], ['fish', 'poisson'], ['duck', 'canard'], ['bear', 'ours'],
      ['frog', 'grenouille'], ['snake', 'serpent']],
  },
  {
    id: 'contraires', matiere: 'Français', titre: 'Les contraires !',
    lancer: { sens: 'ab', aide: 'Son contraire ?' },
    banque: [['grand', 'petit'], ['chaud', 'froid'], ['rapide', 'lent'], ['jour', 'nuit'], ['haut', 'bas'], ['lourd', 'léger'],
      ['vrai', 'faux'], ['ouvert', 'fermé'], ['plein', 'vide'], ['propre', 'sale'], ['gagner', 'perdre'], ['entrer', 'sortir'],
      ['monter', 'descendre'], ['toujours', 'jamais']],
  },
  {
    id: 'capitales', matiere: 'Géographie', titre: 'Les capitales !',
    lancer: { sens: 'ab', aide: 'Sa capitale ?' },
    banque: [['France', 'Paris'], ['Italie', 'Rome'], ['Espagne', 'Madrid'], ['Allemagne', 'Berlin'], ['Portugal', 'Lisbonne'],
      ['Belgique', 'Bruxelles'], ['Royaume-Uni', 'Londres'], ['Grèce', 'Athènes'], ['Pays-Bas', 'Amsterdam'], ['Autriche', 'Vienne'],
      ['Pologne', 'Varsovie'], ['Irlande', 'Dublin'], ['Suède', 'Stockholm'], ['Suisse', 'Berne']],
  },
  {
    id: 'dates', matiere: 'Histoire', titre: 'Les grandes dates !',
    lancer: { sens: 'ba', aide: 'En quelle année ?' },
    banque: [['1789', 'Révolution française'], ['1492', 'Colomb en Amérique'], ['800', 'Charlemagne empereur'], ['1515', 'Marignan'],
      ['1914', 'Grande Guerre'], ['1945', 'Fin de la guerre 39-45'], ['1969', 'Un homme sur la Lune'], ['1804', 'Napoléon empereur'],
      ['52 av. J.-C.', 'Alésia'], ['1848', "Fin de l'esclavage"]],
  },
  {
    id: 'sciences', matiere: 'SVT', titre: 'Sciences !',
    lancer: { sens: 'ba', aide: 'Ça va avec quoi ?' },
    banque: [['H₂O', 'Eau'], ['CO₂', 'Dioxyde de carbone'], ['O₂', 'Dioxygène'], ['Cœur', 'Pompe le sang'], ['Poumons', 'Respirer'],
      ['Estomac', 'Digérer'], ['Soleil', 'Une étoile'], ['Lune', 'Un satellite'], ['0 °C', "L'eau gèle"], ['100 °C', "L'eau bout"]],
  },
];

/** Un tour : { theme, titre, matiere, paires: [{ a, b }] } pour un thème donné. */
export function tourDeTheme(theme, n = 3) {
  if (theme.preparer) return { theme: theme.id, matiere: theme.matiere, ...theme.preparer(n) };
  return { theme: theme.id, matiere: theme.matiere, titre: theme.titre, paires: tirer(theme.banque, n) };
}

/**
 * Un tour de Réviz lance : n questions { question, reponse, choix } (nChoix réponses mélangées : la
 * bonne et des leurres pris dans le même thème, de préférence de la même forme, chiffres avec chiffres).
 */
export function tourDeLancer(theme, n = 6, nChoix = 2) {
  const { titre, paires } = theme.preparer ? theme.preparer(8) : { titre: theme.titre, paires: tirer(theme.banque, theme.banque.length) };
  const { sens, aide, question = q => q } = theme.lancer;
  const cotes = paires.map(p => (sens === 'ab' ? [p.a, p.b] : [p.b, p.a]));
  const forme = t => /[\d₀-₉]/.test(t);
  return {
    theme: theme.id, matiere: theme.matiere, titre, aide,
    questions: cotes.slice(0, n).map(([q, r], k) => {
      const autres = melange(cotes.map(c => c[1]).filter(x => x !== r));
      const leurres = [...autres.filter(x => forme(x) === forme(r)), ...autres.filter(x => forme(x) !== forme(r))].slice(0, nChoix - 1);
      return { question: question(q), texte: q, reponse: r, choix: melange([r, ...leurres]), paire: paires[k] };
    }),
  };
}

/** Trois thèmes différents, dans un ordre au hasard. */
export const themesDePartie = (n = 3) => melange(THEMES_JEUX).slice(0, n);
