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

export const THEMES_JEUX = [
  {
    id: 'tables', matiere: 'Maths',
    // Une table au hasard (3 à 9) et des multiplicateurs distincts : résultats tous différents.
    preparer: n => {
      const t = 3 + Math.floor(Math.random() * 7);
      return { titre: `Table de ${t} !`, paires: melange([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, n).map(m => ({ a: `${t} × ${m}`, b: String(t * m) })) };
    },
  },
  {
    id: 'animaux', matiere: 'Anglais', titre: 'Animals !',
    banque: [['dog', 'chien'], ['cat', 'chat'], ['horse', 'cheval'], ['bird', 'oiseau'], ['cow', 'vache'], ['sheep', 'mouton'],
      ['pig', 'cochon'], ['mouse', 'souris'], ['rabbit', 'lapin'], ['fish', 'poisson'], ['duck', 'canard'], ['bear', 'ours'],
      ['frog', 'grenouille'], ['snake', 'serpent']],
  },
  {
    id: 'contraires', matiere: 'Français', titre: 'Les contraires !',
    banque: [['grand', 'petit'], ['chaud', 'froid'], ['rapide', 'lent'], ['jour', 'nuit'], ['haut', 'bas'], ['lourd', 'léger'],
      ['vrai', 'faux'], ['ouvert', 'fermé'], ['plein', 'vide'], ['propre', 'sale'], ['gagner', 'perdre'], ['entrer', 'sortir'],
      ['monter', 'descendre'], ['toujours', 'jamais']],
  },
  {
    id: 'capitales', matiere: 'Géographie', titre: 'Les capitales !',
    banque: [['France', 'Paris'], ['Italie', 'Rome'], ['Espagne', 'Madrid'], ['Allemagne', 'Berlin'], ['Portugal', 'Lisbonne'],
      ['Belgique', 'Bruxelles'], ['Royaume-Uni', 'Londres'], ['Grèce', 'Athènes'], ['Pays-Bas', 'Amsterdam'], ['Autriche', 'Vienne'],
      ['Pologne', 'Varsovie'], ['Irlande', 'Dublin'], ['Suède', 'Stockholm'], ['Suisse', 'Berne']],
  },
  {
    id: 'dates', matiere: 'Histoire', titre: 'Les grandes dates !',
    banque: [['1789', 'Révolution française'], ['1492', 'Colomb en Amérique'], ['800', 'Charlemagne empereur'], ['1515', 'Marignan'],
      ['1914', 'Grande Guerre'], ['1945', 'Fin de la guerre 39-45'], ['1969', 'Un homme sur la Lune'], ['1804', 'Napoléon empereur'],
      ['52 av. J.-C.', 'Alésia'], ['1848', "Fin de l'esclavage"]],
  },
  {
    id: 'sciences', matiere: 'SVT', titre: 'Sciences !',
    banque: [['H₂O', 'Eau'], ['CO₂', 'Dioxyde de carbone'], ['O₂', 'Dioxygène'], ['Cœur', 'Pompe le sang'], ['Poumons', 'Respirer'],
      ['Estomac', 'Digérer'], ['Soleil', 'Une étoile'], ['Lune', 'Un satellite'], ['0 °C', "L'eau gèle"], ['100 °C', "L'eau bout"]],
  },
];

/** Un tour : { theme, titre, matiere, paires: [{ a, b }] } pour un thème donné. */
export function tourDeTheme(theme, n = 3) {
  if (theme.preparer) return { theme: theme.id, matiere: theme.matiere, ...theme.preparer(n) };
  return { theme: theme.id, matiere: theme.matiere, titre: theme.titre, paires: tirer(theme.banque, n) };
}

/** Trois thèmes différents, dans un ordre au hasard. */
export const themesDePartie = (n = 3) => melange(THEMES_JEUX).slice(0, n);
