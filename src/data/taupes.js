/**
 * Tape-taupe ! (Réviz Games, 23/10) : les règles et les taupes d'un tour, générées.
 * Une règle (« Que les multiples de 3 ») et une suite de taupes qui sortent des 6 trous, chacune avec
 * une pancarte : un nombre, ou un calcul au dernier tour. On tape celles qui suivent la règle.
 * Calcul mental facile (6e-5e) et sans ambiguïté : nombres entiers positifs, divisions exactes,
 * jamais de 0, et une pancarte est bonne ou mauvaise sans discussion possible.
 * Le contenu n'est pas branché aux leçons.
 */

/**
 * Les trois tours. objectif : bonnes taupes à taper pour gagner ; cadence : secondes entre deux
 * sorties (± 25 %) ; vie : secondes qu'une taupe reste dehors (montée et descente comprises) ;
 * max : taupes dehors en même temps ; doubles : part des sorties où deux taupes surgissent ensemble.
 */
export const TOURS_TAUPE = [
  { duree: 14, objectif: 5, cadence: 0.9, vie: 1.6, max: 2, doubles: 0, sous: 'Tape les bonnes taupes' },
  { duree: 13, objectif: 6, cadence: 0.75, vie: 1.35, max: 3, doubles: 0.15, sous: 'Plus vite !' },
  { duree: 12, objectif: 6, cadence: 0.6, vie: 1.15, max: 3, doubles: 0.25, sous: 'Calcul express !' },
];
export const N_TROUS = 6;
const DEBUT = 0.4; // première sortie, après le départ du chrono
const BATTEMENT = 0.25; // un trou reste vide au moins ce temps entre deux taupes

const melange = liste => {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const auHasard = liste => liste[Math.floor(Math.random() * liste.length)];
const entier = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const plage = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// ── Les règles ──
// Chaque règle sait tirer une pancarte bonne ou mauvaise et dire pourquoi.
// Une pancarte : { texte, valeur, bon } ; valeur est le nombre, ou le résultat du calcul.

function regleParite(pair) {
  const nom = pair ? 'pairs' : 'impairs';
  return {
    id: `parite-${nom}`, texte: `Que les nombres ${nom}`,
    tirer: bon => {
      const v = auHasard(plage(1, 30).filter(n => (n % 2 === 0) === (pair === bon)));
      return { texte: String(v), valeur: v, bon };
    },
    pourquoi: p => p.valeur % 2 === 0 ? `${p.valeur} est pair` : `${p.valeur} est impair`,
  };
}

function regleMultiple(k) {
  const bons = plage(1, Math.floor(50 / k)).map(i => i * k);
  // Les pièges : les voisins des multiples (12 → 11, 13), puis le reste.
  const voisins = [...new Set(bons.flatMap(m => [m - 1, m + 1]))].filter(n => n >= 2 && n <= 50 && n % k);
  return {
    id: `multiple-${k}`, texte: `Que les multiples de ${k}`,
    tirer: bon => {
      const v = bon ? auHasard(bons) : auHasard(voisins);
      return { texte: String(v), valeur: v, bon };
    },
    pourquoi: p => p.valeur % k === 0
      ? `${p.valeur} = ${k} × ${p.valeur / k}`
      : `${p.valeur} n’est pas dans la table de ${k}`,
  };
}

// Les calculs qui font n, faciles de tête : additions de petits nombres (ou avec une dizaine quand n
// est rond), soustractions d'un petit nombre (1 à 5), multiplications des tables de 2, 3, 4, 5 et 10.
// Pas de division.
export function calculsQuiFont(n) {
  const l = [];
  for (let a = 1; a < n; a++) {
    const b = n - a;
    if (Math.max(a, b) <= 10 || (n % 10 === 0 && Math.min(a, b) <= 10 && a !== b)) if (a >= 2 && b >= 2) l.push(`${a} + ${b}`);
  }
  for (let b = 1; b <= 5; b++) l.push(`${n + b} − ${b}`);
  for (const a of [2, 3, 4, 5, 10]) if (n % a === 0 && n / a >= 2 && n / a <= 10) l.push(`${a} × ${n / a}`, `${n / a} × ${a}`);
  return [...new Set(l)];
}
export function valeurCalcul(texte) {
  const [a, op, b] = texte.split(' ');
  const x = Number(a), y = Number(b);
  return op === '+' ? x + y : op === '−' ? x - y : op === '×' ? x * y : x / y;
}

function regleEgal(n) {
  const bons = calculsQuiFont(n);
  // Les pièges : des calculs qui tombent nettement à côté (n ± 2 à n ± 4 : on les écarte d'un coup
  // d'œil, sans compter à l'unité près), et les confusions d'opération (3 + 4 à côté de 3 × 4),
  // jamais égaux à n.
  const presque = [n - 4, n - 3, n - 2, n + 2, n + 3, n + 4].flatMap(calculsQuiFont);
  const confusions = bons.flatMap(c => {
    const [a, op, b] = c.split(' ');
    return op === '×' ? [`${a} + ${b}`] : op === '+' && Number(a) <= 10 && Number(b) <= 10 ? [`${a} × ${b}`] : [];
  });
  const pieges = [...new Set([...presque, ...confusions])].filter(c => valeurCalcul(c) !== n && valeurCalcul(c) > 0);
  return {
    id: `egal-${n}`, texte: `Que les calculs = ${n}`, cible: n,
    tirer: bon => {
      // Les bons : une fois sur deux une multiplication (plus intéressante que a + b).
      const durs = bons.filter(c => c.includes('×'));
      const t = bon ? (durs.length && Math.random() < 0.5 ? auHasard(durs) : auHasard(bons))
        : (confusions.length && Math.random() < 0.35 ? auHasard(confusions.filter(c => valeurCalcul(c) !== n)) : auHasard(pieges));
      return { texte: t, valeur: valeurCalcul(t), bon };
    },
    pourquoi: p => `${p.texte} = ${p.valeur}`,
  };
}

export const REGLES_TAUPE = [
  [regleParite(true), regleParite(false)],
  [3, 4, 5].map(regleMultiple),
  [10, 12, 20].map(regleEgal),
];

/**
 * Un tour de Tape-taupe au niveau 0, 1 ou 2 : la règle (au hasard parmi celles du niveau, ou
 * `regleId`) et les taupes, dans l'ordre de sortie : { id, trou, t, vie, texte, valeur, bon }.
 * Garanties : au moins objectif + 3 bonnes taupes, au plus `max` dehors en même temps, un trou ne
 * ressert qu'une fois vide (plus un battement), jamais deux fois de suite le même trou, jamais deux
 * pancartes pareilles dehors en même temps, la dernière taupe redescendue avant la fin du chrono.
 */
export function tourDeTaupe(niveau, regleId) {
  const t = TOURS_TAUPE[niveau];
  const regles = REGLES_TAUPE[niveau];
  const regle = regles.find(r => r.id === regleId) ?? auHasard(regles);
  const fin = t.duree - t.vie; // dernière sortie possible
  // Les instants de sortie : la cadence, avec un peu d'irrégularité, et parfois deux d'un coup.
  const instants = [];
  for (let s = DEBUT; s <= fin; s += t.cadence * (0.75 + Math.random() * 0.5)) {
    instants.push(Math.floor(s * 100) / 100);
    if (Math.random() < t.doubles && s + 0.08 <= fin) instants.push(Math.floor((s + 0.08) * 100) / 100);
  }
  // Bonnes et mauvaises : un peu plus de bonnes que de mauvaises, au moins objectif + 3.
  const nBons = Math.min(instants.length, Math.max(t.objectif + 3, Math.round(instants.length * 0.55)));
  const bons = melange(instants.map((_, i) => i < nBons));

  const libreA = Array(N_TROUS).fill(0); // instant où chaque trou redevient libre
  const taupes = [];
  let dernierTrou = -1;
  instants.forEach((s, i) => {
    const dehors = taupes.filter(x => x.t + x.vie > s);
    if (dehors.length >= t.max) return;
    const trous = plage(0, N_TROUS - 1).filter(k => libreA[k] <= s && k !== dernierTrou);
    if (!trous.length) return;
    const trou = auHasard(trous);
    // La pancarte : pas la même qu'une taupe encore dehors (on retire jusqu'à en trouver une autre).
    let p = regle.tirer(bons[i]);
    for (let essai = 0; essai < 20 && dehors.some(x => x.texte === p.texte); essai++) p = regle.tirer(bons[i]);
    if (dehors.some(x => x.texte === p.texte)) return;
    taupes.push({ id: taupes.length, trou, t: s, vie: t.vie, ...p });
    libreA[trou] = s + t.vie + BATTEMENT;
    dernierTrou = trou;
  });
  // Une sortie sautée (trous pleins) peut avoir coûté des bonnes : on retourne des mauvaises.
  const manque = t.objectif + 3 - taupes.filter(x => x.bon).length;
  if (manque > 0) {
    melange(taupes.filter(x => !x.bon)).slice(0, manque).forEach(x => {
      const dehors = taupes.filter(y => y !== x && y.t < x.t + x.vie && x.t < y.t + y.vie);
      let p = regle.tirer(true);
      for (let essai = 0; essai < 20 && dehors.some(y => y.texte === p.texte); essai++) p = regle.tirer(true);
      Object.assign(x, p);
    });
  }
  return { regle: { id: regle.id, texte: regle.texte }, taupes, pourquoi: regle.pourquoi };
}
