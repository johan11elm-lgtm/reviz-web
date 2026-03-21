// -------------------------------------------------------
// Réviz — Programme officiel Brevet des collèges 3ème
// -------------------------------------------------------

export const BREVET_PROGRAM = [
  {
    subject: 'maths',
    label: 'Mathématiques',
    themes: [
      { id: 'maths-1', label: 'Nombres et calculs',              keywords: ['fraction','puissance','racine','calcul','entier','décimal','relatif'] },
      { id: 'maths-2', label: 'Statistiques et probabilités',    keywords: ['statistique','probabilité','moyenne','médiane','fréquence','fluctuation'] },
      { id: 'maths-3', label: 'Proportionnalité',                keywords: ['proportion','pourcentage','taux','échelle','ratio'] },
      { id: 'maths-4', label: 'Géométrie (Pythagore, Thalès)',   keywords: ['pythagore','thalès','géométrie','trigonométrie','triangle','angle','cercle'] },
      { id: 'maths-5', label: 'Fonctions et repérage',           keywords: ['fonction','repère','coordonnée','linéaire','affine','graphique','tableau de valeurs'] },
      { id: 'maths-6', label: 'Aires et volumes',                keywords: ['aire','volume','périmètre','solide','cylindre','cône','sphère','prisme'] },
    ],
  },
  {
    subject: 'français',
    label: 'Français',
    themes: [
      { id: 'fr-1', label: 'Textes narratifs et littéraires',    keywords: ['roman','récit','narration','nouvelle','personnage','narrateur','incipit'] },
      { id: 'fr-2', label: 'Textes argumentatifs',               keywords: ['argument','opinion','débat','thèse','discours','essai','plaidoyer'] },
      { id: 'fr-3', label: 'Poésie et théâtre',                  keywords: ['poésie','poème','théâtre','vers','strophe','rime','acte','scène'] },
      { id: 'fr-4', label: 'Grammaire et conjugaison',           keywords: ['grammaire','conjugaison','verbe','accord','subjonctif','conditionnel','proposition'] },
      { id: 'fr-5', label: 'Orthographe et lexique',             keywords: ['orthographe','lexique','vocabulaire','homophones','préfixe','suffixe','étymologie'] },
    ],
  },
  {
    subject: 'histoire',
    label: 'Histoire',
    themes: [
      { id: 'hist-1', label: 'La Première Guerre mondiale',      keywords: ['première guerre','14-18','ww1','grande guerre','tranchées','armistice','verdun'] },
      { id: 'hist-2', label: 'Les régimes totalitaires',         keywords: ['totalitaire','nazisme','stalinisme','fascisme','hitler','mussolini','staline'] },
      { id: 'hist-3', label: 'La Seconde Guerre mondiale',       keywords: ['seconde guerre','39-45','ww2','résistance','shoah','débarquement','libération'] },
      { id: 'hist-4', label: 'La Guerre froide',                 keywords: ['guerre froide','urss','usa','bloc','berlin','otan','pacte de varsovie'] },
      { id: 'hist-5', label: 'La décolonisation',                keywords: ['décolonisation','indépendance','colonie','algérie','vietnam','afrique'] },
      { id: 'hist-6', label: 'La Ve République',                 keywords: ['ve république','de gaulle','constitution','élection','référendum','parlement'] },
    ],
  },
  {
    subject: 'géo',
    label: 'Géographie',
    themes: [
      { id: 'geo-1', label: 'La mondialisation',                 keywords: ['mondialisation','échanges','commerce mondial','flux','multinationale','fmi'] },
      { id: 'geo-2', label: 'Les espaces de production',         keywords: ['production','industrie','agriculture','économie','zone industrielle','littoral'] },
      { id: 'geo-3', label: 'La France dans le monde',           keywords: ['france','territoire','dom-tom','outre-mer','francophonie','puissance'] },
      { id: 'geo-4', label: 'Villes et urbanisation',            keywords: ['ville','urbain','métropole','urbanisation','banlieue','mégapole','étalement'] },
    ],
  },
  {
    subject: 'svt',
    label: 'SVT',
    themes: [
      { id: 'svt-1', label: 'Génétique et évolution',            keywords: ['génétique','adn','évolution','mutation','chromosome','allèle','hérédité'] },
      { id: 'svt-2', label: 'Corps humain et santé',             keywords: ['corps','santé','système','organe','digestion','immunité','neurone','respiration'] },
      { id: 'svt-3', label: 'Écosystèmes',                       keywords: ['écosystème','biodiversité','chaîne alimentaire','environnement','biome','décomposeur'] },
      { id: 'svt-4', label: 'La Terre et l\'univers',            keywords: ['terre','univers','tectonique','volcan','séisme','roche','minéral','planète'] },
    ],
  },
  {
    subject: 'physique',
    label: 'Physique-Chimie',
    themes: [
      { id: 'phy-1', label: 'Matière et transformations',        keywords: ['atome','molécule','réaction','chimie','matière','ion','tableau périodique','mélange'] },
      { id: 'phy-2', label: 'Mouvements et forces',              keywords: ['force','mouvement','vitesse','newton','poids','gravité','vecteur','inertie'] },
      { id: 'phy-3', label: 'Énergie',                           keywords: ['énergie','électricité','puissance','circuit','tension','courant','résistance'] },
      { id: 'phy-4', label: 'Ondes et signaux',                  keywords: ['onde','son','lumière','signal','optique','fréquence','spectre','réfraction'] },
    ],
  },
  {
    subject: 'anglais',
    label: 'Anglais',
    themes: [
      { id: 'ang-1', label: 'Compréhension écrite',              keywords: ['reading','compréhension','texte anglais','comprehension'] },
      { id: 'ang-2', label: 'Expression écrite',                 keywords: ['writing','rédaction','lettre','essay','email','english'] },
      { id: 'ang-3', label: 'Grammaire anglaise',                keywords: ['grammar','tense','past','present','conditional','modal','reported speech'] },
    ],
  },
];

export const TOTAL_THEMES = BREVET_PROGRAM.reduce((sum, cat) => sum + cat.themes.length, 0);
