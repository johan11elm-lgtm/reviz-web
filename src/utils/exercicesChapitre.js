// -------------------------------------------------------
// Réviz — exercices en jeu tirés d'un chapitre (29/10)
// Idée relevée chez BrainQraft : un même cadre pour tous les formats, et des
// formats génériques nourris par les données du chapitre. Ici, rien n'est
// généré par l'IA : tout vient du fichier du chapitre (ou du scan), déjà relu.
//   - carte mentale (4 branches) → 4 coins, Intrus, Trois indices
//   - mots-clés (keyTerms)       → Définition, Paires
//   - points datés « 1801 : … »  → Chronologie, Année
//   - quiz                       → QCM, pour compléter la séance
// Ajoutés le 29/10 : Vrai ou faux (mot et définition, ou date), Phrase à trous
// (un mot-clé retiré d'une phrase du résumé), Mémory (mots et définitions face
// cachée) et Classement (des cartes à glisser entre deux branches).
// Une séance mélange ces formats (10 exercices au plus), dans un ordre tiré
// au sort à partir d'une graine : la même graine redonne la même séance.
// Pilote du 29/10 : un chapitre peut porter un bloc `exercices`, écrit puis
// passé au test à l'aveugle (scripts/exercices/). Ses catégories étanches
// remplacent alors la carte mentale, dont les branches se recoupent, et il
// nourrit six formats de plus : Sélection, Cause ou conséquence, Étiquette,
// Qui suis-je ?, Trouve le nombre et Les étapes.
// -------------------------------------------------------

/** Hasard reproductible (mulberry32). */
export function creerAlea(graine = Date.now()) {
  let h = Math.floor(Number(graine)) | 0
  return () => {
    h = (h + 0x6D2B79F5) | 0
    let t = Math.imul(h ^ (h >>> 15), 1 | h)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const melanger = (liste, alea) => {
  const t = [...liste]
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]]
  }
  return t
}
const tirer = (liste, alea) => liste[Math.floor(alea() * liste.length)]

/** Comparaison sans casse ni accents. */
export const normaliser = s => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
const sansPoint = s => String(s ?? '').trim().replace(/\s*\.$/, '')
const majuscule = s => (s ? s[0].toUpperCase() + s.slice(1) : s)
// Un mot qui commence en minuscule (« lycées ») prend sa majuscule ; « pH », « x² » ou « 3 km » restent tels quels.
const majusculeMot = s => (/^\p{Ll}\p{Ll}/u.test(s) ? majuscule(s) : s)

// ── Données du chapitre ──

/**
 * Les branches utilisables : un nom et au moins 2 éléments, sans élément commun à deux branches.
 * Les catégories relues du bloc `exercices` passent avant la carte mentale.
 * `casse` : la mise en forme des noms et des éléments (majuscule en tête, sauf en maths et en physique).
 */
function branchesDe(ai, casse) {
  const relues = lireExercices(ai?.exercices)?.categories
  const brutes = (relues ?? ai?.mindmap?.branches ?? [])
    .map(b => (relues ? { nom: casse(b.nom), detail: b.detail, elements: b.cartes.map(casse) } : {
      nom: casse(sansPoint(b?.label)),
      detail: sansPoint(b?.detail),
      elements: (b?.children ?? []).map(c => casse(sansPoint(c))).filter(Boolean),
    }))
    .filter(b => b.nom && b.elements.length >= 2)
  const compte = new Map()
  for (const b of brutes) for (const e of b.elements) compte.set(normaliser(e), (compte.get(normaliser(e)) ?? 0) + 1)
  return brutes
    .map(b => ({
      ...b,
      // Un élément présent dans deux branches, ou qui répète le nom de sa branche, rendrait la réponse ambiguë ou évidente.
      elements: b.elements.filter(e => compte.get(normaliser(e)) === 1 && !normaliser(e).includes(normaliser(b.nom))),
    }))
    .filter(b => b.elements.length >= 1)
}

function motsClesDe(ai, casse) {
  const vus = new Set()
  return (ai?.resume?.keyTerms ?? [])
    .map(k => ({ terme: casse(sansPoint(k?.term)), definition: sansPoint(k?.def) }))
    .filter(k => k.terme && k.definition && !vus.has(normaliser(k.terme)) && vus.add(normaliser(k.terme)))
}

// ── Le bloc `exercices` relu (pilote du 29/10) ──

const texte = s => (typeof s === 'string' ? s.trim() : '')
const textes = (l, min, max = Infinity) => (Array.isArray(l) && l.length >= min && l.length <= max && l.every(x => texte(x)) ? l.map(texte) : null)

/** Un texte avec un seul passage entre crochets → { avant, passage, apres }, sinon null. */
export function lirePassage(t) {
  const m = texte(t).match(/^([^[\]]*)\[([^[\]]+)\]([^[\]]*)$/)
  return m ? { avant: m[1], passage: m[2], apres: m[3] } : null
}

/**
 * Le bloc `exercices` d'un chapitre, débarrassé de tout élément mal formé (il pourrait casser
 * un format). null s'il n'a pas au moins 2 catégories utilisables.
 * Format décrit dans scripts/exercices/consignes-ecriture.md.
 */
export function lireExercices(ex) {
  if (!ex || typeof ex !== 'object') return null
  const vues = new Set()
  const categories = (Array.isArray(ex.categories) ? ex.categories : [])
    .map(c => ({ nom: sansPoint(texte(c?.nom)), detail: sansPoint(texte(c?.detail)), cartes: (textes(c?.cartes, 1) ?? []).map(sansPoint) }))
    .map(c => ({ ...c, cartes: c.cartes.filter(t => !vues.has(normaliser(t)) && vues.add(normaliser(t))) }))
    .filter(c => c.nom && c.cartes.length >= 2)
  if (categories.length < 2) return null
  const liste = cle => (Array.isArray(ex[cle]) ? ex[cle] : [])
  return {
    categories,
    causes: liste('causes')
      .filter(c => texte(c?.fait) && texte(c?.carte) && ['cause', 'consequence'].includes(c?.role))
      .map(c => ({ fait: sansPoint(texte(c.fait)), carte: sansPoint(texte(c.carte)), role: c.role, explication: texte(c.explication) })),
    etiquettes: liste('etiquettes')
      .filter(e => texte(e?.consigne) && lirePassage(e?.texte) && textes(e?.choix, 2, 4) && Number.isInteger(e?.bonne) && e.bonne >= 0 && e.bonne < e.choix.length)
      .map(e => ({ consigne: texte(e.consigne), texte: texte(e.texte), choix: textes(e.choix, 2), bonne: e.bonne, explication: texte(e.explication) })),
    devinettes: liste('devinettes')
      .filter(d => texte(d?.reponse) && textes(d?.indices, 2, 4))
      // Un indice qui contient la réponse la donnerait.
      .filter(d => !d.indices.some(i => normaliser(i).includes(normaliser(sansArticle(d.reponse)))))
      .map(d => ({ reponse: texte(d.reponse), acceptees: textes(d.acceptees, 0) ?? [], indices: textes(d.indices, 2), explication: texte(d.explication) })),
    calculs: liste('calculs')
      .filter(c => texte(c?.question) && Number.isFinite(c?.reponse))
      .map(c => ({ question: texte(c.question), reponse: c.reponse, unite: texte(c.unite), tolerance: Math.max(0, Number(c.tolerance) || 0), explication: texte(c.explication) })),
    etapes: liste('etapes')
      .filter(s => texte(s?.titre) && textes(s?.etapes, 3, 6))
      .map(s => ({ titre: sansPoint(texte(s.titre)), etapes: textes(s.etapes, 3).map(sansPoint) })),
  }
}

/** « Le Code civil » → « Code civil » ; « l'Empire » → « Empire ». */
const sansArticle = s => String(s ?? '').trim().replace(/^(?:(?:le|la|les|un|une|des|du|the|a|an)\s+|l['’]\s*)/i, '')

/** Distance d'édition, pour pardonner une faute de frappe. */
function distance(a, b) {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let diag = d[0]
    d[0] = i
    for (let j = 1; j <= b.length; j++) {
      const haut = d[j]
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = haut
    }
  }
  return d[b.length]
}

/**
 * La réponse tapée à un « Qui suis-je ? » : sans casse, accents, article ni tiret, et une faute de
 * frappe pardonnée au-delà de 5 lettres.
 */
export function reponseAcceptee(saisie, { reponse, acceptees = [] }) {
  const net = s => normaliser(sansArticle(s)).replace(/[-'’.]/g, ' ').replace(/\s+/g, ' ').trim()
  const tape = net(saisie)
  if (!tape) return false
  return [reponse, ...acceptees].map(net).some(r => r === tape || (r.length > 5 && distance(r, tape) <= 1))
}

/** « 12,5 », « −3 » ou « 1 200 » → nombre ; null si ce n'est pas un nombre. */
export function lireNombre(saisie) {
  const s = String(saisie ?? '').replace(/[\s  ]/g, '').replace(/[−–]/g, '-').replace(',', '.')
  return /^-?\d+(?:\.\d+)?$/.test(s) ? Number(s) : null
}

/** Un nombre écrit à la française : 12,5 ; −3. */
export const ecrireNombre = n => String(n).replace('-', '−').replace('.', ',')

const MOIS = 'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre'
const DATE_SEULE = new RegExp(`^(?:(?:1er|\\d{1,2})\\s+(?:${MOIS})\\s+)?(\\d{1,4})(\\s+av\\.?\\s*J\\.?-?C\\.?)?(?:\\s*\\([^)]*\\))?$`, 'i')

/**
 * Un point de l'essentiel de la forme « 9 novembre 1799 (18 brumaire) : coup d'État » →
 * { annee: 1799, date: '9 novembre 1799', evenement: 'coup d'État' }. null sinon.
 */
export function lirePointDate(point) {
  const i = String(point ?? '').indexOf(' : ')
  if (i < 1) return null
  const gauche = point.slice(0, i).trim()
  const evenement = majuscule(sansPoint(point.slice(i + 3)))
  const m = gauche.match(DATE_SEULE)
  if (!m || !evenement) return null
  const annee = Number(m[1]) * (m[2] ? -1 : 1)
  if (!Number.isFinite(annee) || annee === 0 || annee > 2100) return null
  return { annee, date: gauche.replace(/\s*\([^)]*\)\s*$/, ''), evenement }
}

function datesDe(ai) {
  const vues = new Set()
  return (ai?.resume?.keyPoints ?? []).map(lirePointDate).filter(d => d && !vues.has(d.annee) && vues.add(d.annee))
}

const libelleAnnee = a => (a < 0 ? `${-a} av. J.-C.` : String(a))

// ── Les formats ──

/** Une branche pas encore utilisée par un autre exercice de la séance, si possible. */
function tirerBranche(liste, alea, prises) {
  const libres = liste.filter(b => !prises.has(b.nom))
  const b = tirer(libres.length ? libres : liste, alea)
  prises.add(b.nom)
  return b
}

function coins(branches, alea, id, prises) {
  if (branches.length < 4) return null
  const quatre = branches.slice(0, 4)
  const b = tirerBranche(quatre, alea, prises)
  const carte = tirer(b.elements, alea)
  const ordre = melanger(quatre, alea)
  return {
    id, type: 'coins', pose: 'pointing',
    consigne: 'Range la carte dans le bon coin',
    bulle: 'Dans quelle partie du chapitre va cette carte ?',
    carte,
    coins: ordre.map(x => x.nom),
    bonne: ordre.indexOf(b),
    explication: `« ${carte} » fait partie de « ${b.nom} ».${b.detail ? ` ${b.detail}.` : ''}`,
    aRetenir: { question: carte, bonne: b.nom },
  }
}

function intrus(branches, alea, id, prises) {
  const pleines = branches.filter(b => b.elements.length >= 3)
  if (!pleines.length || branches.length < 2) return null
  const theme = tirerBranche(pleines, alea, prises)
  const autre = tirer(branches.filter(b => b !== theme), alea)
  const intru = tirer(autre.elements, alea)
  const cartes = melanger([...melanger(theme.elements, alea).slice(0, 3), intru], alea)
  return {
    id, type: 'intrus', pose: 'search',
    consigne: 'Trouve l’intrus',
    bulle: `Trois cartes parlent de « ${theme.nom} ». Laquelle n’a rien à faire là ?`,
    theme: theme.nom,
    cartes,
    bonne: cartes.indexOf(intru),
    explication: `« ${intru} » vient de « ${autre.nom} », pas de « ${theme.nom} ».`,
    aRetenir: { question: `L’intrus parmi « ${theme.nom} »`, bonne: intru },
  }
}

function indices(branches, alea, id, prises) {
  const pleines = branches.filter(b => b.elements.length >= 3)
  if (!pleines.length || branches.length < 3) return null
  const b = tirerBranche(pleines, alea, prises)
  const leurres = melanger(branches.filter(x => x !== b), alea).slice(0, 2)
  const choix = melanger([b, ...leurres], alea)
  return {
    id, type: 'indices', pose: 'thinking',
    consigne: 'Quel thème relie ces trois indices ?',
    bulle: 'Lis les trois indices, puis choisis ce qui les relie.',
    indices: melanger(b.elements, alea).slice(0, 3),
    choix: choix.map(x => x.nom),
    bonne: choix.indexOf(b),
    explication: b.detail ? `${b.nom} : ${b.detail}.` : `Ces trois indices font partie de « ${b.nom} ».`,
    aRetenir: { question: 'Le thème des trois indices', bonne: b.nom },
  }
}

/** La définition sans le mot à trouver (sinon la réponse s'y lit). */
function masquer(definition, terme) {
  const mots = terme.split(/[\s'’-]+/).filter(m => m.length > 3)
  let texte = definition
  for (const m of [terme, ...mots]) {
    const motif = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    texte = texte.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${motif}\\p{L}*`, 'giu'), '$1…')
  }
  return texte
}

/** `nbChoix` : 3 mots en séance quand le chapitre en a assez (à 2, la réponse se devinait trop souvent), 2 en Battle. */
function definition(motsCles, alea, id, deja, nbChoix = 2) {
  const libres = motsCles.filter(k => !deja.has(k.terme))
  if (!libres.length || motsCles.length < 2) return null
  const k = tirer(libres, alea)
  deja.add(k.terme)
  const leurres = nbChoix > 2 && motsCles.length > 2
    ? melanger(motsCles.filter(x => x !== k), alea).slice(0, nbChoix - 1)
    : [tirer(motsCles.filter(x => x !== k), alea)]
  const choix = melanger([k.terme, ...leurres.map(x => x.terme)], alea)
  return {
    id, type: 'definition', pose: 'reading',
    consigne: 'Quel mot correspond à cette définition ?',
    bulle: masquer(k.definition, k.terme),
    choix,
    bonne: choix.indexOf(k.terme),
    explication: `${k.terme} : ${k.definition}.`,
    aRetenir: { question: k.definition, bonne: k.terme },
  }
}

function paires(motsCles, alea, id) {
  if (motsCles.length < 3) return null
  const trois = melanger(motsCles, alea).slice(0, 3)
  return {
    id, type: 'paires', pose: 'flashcard',
    consigne: 'Associe chaque mot à sa définition',
    bulle: 'Touche un mot, puis sa définition.',
    paires: trois.map(k => ({ terme: k.terme, definition: k.definition })),
    ordreTermes: melanger([0, 1, 2], alea),
    ordreDefinitions: melanger([0, 1, 2], alea),
    explication: trois.map(k => `${k.terme} : ${k.definition}.`).join(' '),
    aRetenir: { question: 'Les paires mot · définition', bonne: trois.map(k => k.terme).join(', ') },
  }
}

function chronologie(dates, alea, id) {
  if (dates.length < 3) return null
  const choisies = melanger(dates, alea).slice(0, Math.min(4, dates.length))
  const triees = [...choisies].sort((a, b) => a.annee - b.annee)
  return {
    id, type: 'ordre', pose: 'histgeo',
    consigne: 'Remets dans l’ordre',
    bulle: 'Touche les événements du plus ancien au plus récent.',
    evenements: choisies.map(d => ({ texte: d.evenement, date: d.date })),
    bonOrdre: triees.map(d => choisies.indexOf(d)),
    explication: `Du plus ancien au plus récent : ${triees.map(d => libelleAnnee(d.annee)).join(', ')}.`,
    aRetenir: { question: 'L’ordre des événements', bonne: triees.map(d => `${libelleAnnee(d.annee)}, ${d.evenement}`).join(' ; ') },
  }
}

function annee(dates, alea, id, deja) {
  // Une frise de 60 ans : au-delà (Antiquité), le curseur deviendrait trop fin. La chronologie s'en charge.
  const libres = dates.filter(d => d.annee >= 1000 && !deja.has(d.annee))
  if (!libres.length) return null
  const d = tirer(libres, alea)
  deja.add(d.annee)
  const avant = 10 + Math.floor(alea() * 41)
  const min = Math.floor((d.annee - avant) / 5) * 5
  return {
    id, type: 'annee', pose: 'examen',
    consigne: 'En quelle année ?',
    bulle: d.evenement,
    annee: d.annee,
    min,
    max: Math.min(min + 60, Math.max(new Date().getFullYear(), d.annee + 1)),
    explication: `${d.date} : ${d.evenement}.`,
    aRetenir: { question: d.evenement, bonne: String(d.annee) },
  }
}

function vraiFaux(motsCles, dates, alea, id) {
  // Une date une fois sur trois quand le chapitre en a, sinon un mot et une définition.
  if (dates.length >= 2 && alea() < 0.34) {
    const d = tirer(dates, alea)
    const vrai = alea() < 0.5
    const autre = tirer(dates.filter(x => x !== d), alea)
    const annee = vrai ? d.annee : autre.annee
    return {
      id, type: 'vraifaux', pose: 'thinking',
      consigne: 'Vrai ou faux ?',
      bulle: 'Glisse la carte : à droite si c’est vrai, à gauche si c’est faux.',
      titre: libelleAnnee(annee),
      affirmation: d.evenement,
      vrai,
      explication: vrai ? `Vrai : ${d.date} : ${d.evenement}.` : `Faux : c’était en ${libelleAnnee(d.annee)} (${d.date} : ${d.evenement}).`,
      aRetenir: { question: `${libelleAnnee(annee)} : ${d.evenement}`, bonne: vrai ? 'Vrai' : 'Faux' },
    }
  }
  if (motsCles.length < 2) return null
  const k = tirer(motsCles, alea)
  const vrai = alea() < 0.5
  const autre = tirer(motsCles.filter(x => x !== k), alea)
  const definition = vrai ? k.definition : autre.definition
  return {
    id, type: 'vraifaux', pose: 'thinking',
    consigne: 'Vrai ou faux ?',
    bulle: 'Glisse la carte : à droite si c’est vrai, à gauche si c’est faux.',
    titre: k.terme,
    affirmation: definition,
    vrai,
    explication: vrai ? `Vrai : ${k.terme} : ${k.definition}.` : `Faux : c’est la définition de « ${autre.terme} ». ${k.terme} : ${k.definition}.`,
    aRetenir: { question: `${k.terme} : ${definition}`, bonne: vrai ? 'Vrai' : 'Faux' },
  }
}

/** Le mot-clé dans une phrase, une seule fois et en mot entier : { index, longueur } ou null. */
function trouverMot(phrase, terme) {
  const motif = terme.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${motif})(?=[^\\p{L}\\p{N}]|$)`, 'giu')
  const trouves = [...phrase.matchAll(re)]
  if (trouves.length !== 1) return null
  const m = trouves[0]
  return { index: m.index + m[1].length, longueur: m[2].length }
}

function phrase(ai, motsCles, alea, id) {
  if (motsCles.length < 3) return null
  const textes = [
    ...(ai?.resume?.keyPoints ?? []),
    ...(ai?.resume?.sections ?? []).flatMap(x => String(x?.content ?? '').split(/(?<=[.!?])\s+/)),
  ].map(t => String(t).trim()).filter(t => t.length >= 25 && t.length <= 170)
  const candidats = []
  for (const t of textes) for (const k of motsCles) {
    const m = k.terme.length > 3 ? trouverMot(t, k.terme) : null
    if (m) candidats.push({ t, k, m })
  }
  if (!candidats.length) return null
  const { t, k, m } = tirer(candidats, alea)
  // Les mots proposés prennent la casse du mot dans la phrase (« will » en milieu de phrase, « Unless » en tête).
  const forme = t.slice(m.index, m.index + m.longueur)
  // Un sigle (« BBC ») et un nom propre de plusieurs mots (« Nobel Peace Prize ») gardent leurs capitales.
  const nomPropre = mot => /\s\p{Lu}/u.test(mot)
  const commeLaPhrase = mot => (/^\p{Ll}/u.test(forme) ? (/^\p{Lu}\p{Ll}/u.test(mot) && !nomPropre(mot) ? mot[0].toLowerCase() + mot.slice(1) : mot) : majuscule(mot))
  const reponse = forme
  const mots = melanger([reponse, ...melanger(motsCles.filter(x => x !== k), alea).slice(0, 2).map(x => commeLaPhrase(x.terme))], alea)
  const avant = t.slice(0, m.index)
  const apres = t.slice(m.index + m.longueur)
  return {
    id, type: 'phrase', pose: 'writing',
    consigne: 'Complète la phrase',
    bulle: 'Touche le mot qui manque.',
    avant, apres, mots,
    bonne: mots.indexOf(reponse),
    explication: `${k.terme} : ${k.definition}.`,
    aRetenir: { question: `${avant}…${apres}`, bonne: reponse },
  }
}

/** Mémory : 3 mots et leurs définitions, face cachée. Réussi en 3 erreurs au plus. */
function memory(motsCles, alea, id) {
  if (motsCles.length < 3) return null
  const trois = melanger(motsCles, alea).slice(0, 3)
  return {
    id, type: 'memory', pose: 'flashcard',
    consigne: 'Mémory',
    bulle: 'Retourne deux cartes : un mot et sa définition.',
    cartes: melanger(trois.flatMap((k, i) => [{ paire: i, cote: 'mot', texte: k.terme }, { paire: i, cote: 'definition', texte: k.definition }]), alea),
    erreursPermises: 3,
    explication: trois.map(k => `${k.terme} : ${k.definition}.`).join(' '),
    aRetenir: { question: 'Le mémory mot · définition', bonne: trois.map(k => k.terme).join(', ') },
  }
}

/** Classement : 4 cartes de deux branches, à glisser à gauche ou à droite. */
function classement(branches, alea, id, prises) {
  const pleines = branches.filter(b => b.elements.length >= 2)
  if (pleines.length < 2) return null
  const a = tirerBranche(pleines, alea, prises)
  const b = tirerBranche(pleines.filter(x => x !== a), alea, prises)
  const cartes = melanger([
    ...melanger(a.elements, alea).slice(0, 2).map(texte => ({ texte, dossier: 0 })),
    ...melanger(b.elements, alea).slice(0, 2).map(texte => ({ texte, dossier: 1 })),
  ], alea)
  return {
    id, type: 'classement', pose: 'pointing',
    consigne: 'Range chaque carte',
    bulle: `À gauche « ${a.nom} », à droite « ${b.nom} ».`,
    dossiers: [a.nom, b.nom],
    cartes,
    explication: [a, b].map(x => `${x.nom} : ${cartes.filter(c => c.dossier === (x === a ? 0 : 1)).map(c => c.texte).join(', ')}.`).join(' '),
    aRetenir: { question: `${a.nom} ou ${b.nom}`, bonne: cartes.map(c => `${c.texte} → ${c.dossier ? b.nom : a.nom}`).join(' ; ') },
  }
}

// ── Les formats nourris par le bloc `exercices` relu ──

/** Sélection : 6 cartes, toucher les 2 ou 3 qui vont dans une catégorie. Seulement avec des catégories relues. */
function selection(branches, alea, id, prises) {
  const pleines = branches.filter(b => b.elements.length >= 3)
  if (!pleines.length || branches.length < 3) return null
  const b = tirerBranche(pleines, alea, prises)
  const nb = alea() < 0.5 ? 2 : 3
  const bonnes = melanger(b.elements, alea).slice(0, nb)
  const autres = melanger(branches.filter(x => x !== b).flatMap(x => x.elements), alea).slice(0, 6 - nb)
  const cartes = melanger([...bonnes.map(t => ({ texte: t, bonne: true })), ...autres.map(t => ({ texte: t, bonne: false }))], alea)
  return {
    id, type: 'selection', pose: 'search',
    consigne: 'Touche toutes les bonnes cartes',
    bulle: `Quelles cartes vont dans « ${b.nom} » ?`,
    theme: b.nom,
    cartes,
    // « Bonne réponse » donne déjà les cartes : l'explication dit ce que la catégorie rassemble.
    explication: b.detail ? `${b.nom} : ${b.detail}.` : '',
    aRetenir: { question: `Les cartes de « ${b.nom} »`, bonne: bonnes.join(', ') },
  }
}

/** « la chute de l'Empire » → « à la chute de l'Empire » ; « les pertes » → « aux pertes » ; « le blocus » → « au blocus ». */
export function parRapportA(fait) {
  const f = String(fait ?? '').trim()
  const m = f.match(/^(le|les)\s+(.*)$/i)
  return m ? `${m[1].toLowerCase() === 'le' ? 'au' : 'aux'} ${m[2]}` : `à ${f}`
}

function causeOuConsequence(causes, alea, id) {
  if (!causes.length) return null
  const c = tirer(causes, alea)
  const choix = ['Cause', 'Conséquence']
  return {
    id, type: 'cause', pose: 'thinking',
    consigne: 'Cause ou conséquence ?',
    // Le fait est déjà écrit au-dessus de la carte : la bulle rappelle ce qui distingue les deux.
    bulle: 'Une cause provoque le fait, une conséquence en découle. Et cette carte ?',
    fait: c.fait,
    parRapport: `Par rapport ${parRapportA(c.fait)}`,
    carte: majuscule(c.carte),
    choix,
    bonne: c.role === 'cause' ? 0 : 1,
    explication: c.explication,
    aRetenir: { question: `${majuscule(c.carte)} (par rapport ${parRapportA(c.fait)})`, bonne: choix[c.role === 'cause' ? 0 : 1] },
  }
}

function etiquette(etiquettes, alea, id) {
  if (!etiquettes.length) return null
  const e = tirer(etiquettes, alea)
  const { avant, passage, apres } = lirePassage(e.texte)
  const ordre = melanger(e.choix.map((_, i) => i), alea)
  return {
    id, type: 'etiquette', pose: 'pointing',
    consigne: e.consigne,
    bulle: 'Touche l’étiquette qui convient au passage en couleur.',
    avant, passage, apres,
    choix: ordre.map(i => e.choix[i]),
    bonne: ordre.indexOf(e.bonne),
    explication: e.explication,
    aRetenir: { question: `${e.consigne} « ${passage} »`, bonne: e.choix[e.bonne] },
  }
}

function devinette(devinettes, alea, id) {
  if (!devinettes.length) return null
  const d = tirer(devinettes, alea)
  return {
    id, type: 'devinette', pose: 'hello',
    consigne: 'Qui suis-je ?',
    bulle: 'Lis l’indice, puis tape ta réponse. Besoin d’aide ? Demande un autre indice.',
    indices: d.indices,
    reponse: d.reponse,
    acceptees: d.acceptees,
    explication: d.explication,
    aRetenir: { question: d.indices.join(' '), bonne: d.reponse },
  }
}

function calcul(calculs, alea, id, deja) {
  const libres = calculs.filter(c => !deja.has(c.question))
  if (!libres.length) return null
  const c = tirer(libres, alea)
  deja.add(c.question)
  const bonne = `${ecrireNombre(c.reponse)}${c.unite ? ` ${c.unite}` : ''}`
  return {
    id, type: 'calcul', pose: 'maths',
    consigne: 'Trouve le nombre',
    bulle: c.question,
    reponse: c.reponse,
    unite: c.unite,
    tolerance: c.tolerance,
    explication: c.explication,
    aRetenir: { question: c.question, bonne },
  }
}

/** Les étapes d'une méthode ou d'un processus, à remettre dans l'ordre (même écran que la chronologie). */
function etapesDansLOrdre(suites, alea, id) {
  if (!suites.length) return null
  const s = tirer(suites, alea)
  const ordre = melanger(s.etapes.map((_, i) => i), alea)
  return {
    id, type: 'etapes', pose: 'writing',
    consigne: 'Remets les étapes dans l’ordre',
    bulle: `${s.titre} : touche les étapes de la première à la dernière.`,
    evenements: ordre.map(i => ({ texte: s.etapes[i] })),
    bonOrdre: s.etapes.map((_, i) => ordre.indexOf(i)),
    // La correction montre déjà le bon rang de chaque étape, et « Bonne réponse » la suite entière.
    explication: '',
    aRetenir: { question: s.titre, bonne: s.etapes.join(' → ') },
  }
}

function qcm(q, id) {
  if (!q?.question || !Array.isArray(q.choices) || q.choices.length < 2 || !Number.isInteger(q.correct) || !q.choices[q.correct]) return null
  return {
    id, type: 'qcm', pose: 'quiz',
    consigne: 'Choisis la bonne réponse',
    bulle: q.question,
    choix: q.choices,
    bonne: q.correct,
    explication: q.explanation ?? '',
    aRetenir: { question: q.question, bonne: q.choices[q.correct] },
  }
}

/**
 * La séance d'un chapitre : 10 exercices au plus, mélangés, sans deux formats identiques d'affilée
 * quand c'est possible. Liste vide si le chapitre n'a pas de quoi nourrir au moins 4 exercices.
 * @param {object} ai — contenu du chapitre (flashcards, quiz, resume, mindmap)
 * @param {{ graine?: number, nombre?: number }} [options]
 */
export function construireSeance(ai, { graine = Date.now(), nombre = 10 } = {}) {
  const alea = creerAlea(graine)
  // En maths et en physique, « x² » ou « cos » ne prennent pas de majuscule.
  const scientifique = /math|physique/i.test(ai?.metadata?.subject ?? '')
  const casse = scientifique ? s => s : majusculeMot
  const branches = melanger(branchesDe(ai, casse), alea)
  const motsCles = motsClesDe(ai, casse)
  const dates = datesDe(ai)
  const relues = lireExercices(ai?.exercices)
  const branchesPrises = new Set()
  const termesPris = new Set()
  const anneesPrises = new Set()
  const calculsPris = new Set()
  let n = 0
  const id = t => `${t}-${n++}`

  // Les formats du bloc relu passent en premier (4 au plus) : ce sont les seuls à faire calculer,
  // étiqueter ou deviner. En maths et en physique, deux calculs à chaque séance.
  const calculs = relues ? [calcul(relues.calculs, alea, id('calcul'), calculsPris), scientifique ? calcul(relues.calculs, alea, id('calcul'), calculsPris) : null] : []
  const relus = relues ? [
    ...(scientifique ? calculs : []),
    ...melanger([
      scientifique ? null : calculs[0],
      causeOuConsequence(relues.causes, alea, id('cause')),
      etiquette(relues.etiquettes, alea, id('etiquette')),
      devinette(relues.devinettes, alea, id('devinette')),
      etapesDansLOrdre(relues.etapes, alea, id('etapes')),
    ].filter(Boolean), alea),
  ].filter(Boolean).slice(0, 4) : []
  // Les formats datés sont rares (surtout l'histoire) : ils passent ensuite quand le chapitre en a.
  const dates2 = [chronologie(dates, alea, id('ordre')), annee(dates, alea, id('annee'), anneesPrises)]
  // Paires et Mémory font travailler la même chose : l'un ou l'autre dans une séance.
  const motDef = alea() < 0.5 ? paires(motsCles, alea, id('paires')) : memory(motsCles, alea, id('memory'))
  const autres = melanger([
    coins(branches, alea, id('coins'), branchesPrises),
    intrus(branches, alea, id('intrus'), branchesPrises),
    indices(branches, alea, id('indices'), branchesPrises),
    classement(branches, alea, id('classement'), branchesPrises),
    // La sélection mélange les cartes de toutes les catégories : sans catégories étanches, elle serait ambiguë.
    relues ? selection(branches, alea, id('selection'), branchesPrises) : null,
    definition(motsCles, alea, id('definition'), termesPris, 3),
    vraiFaux(motsCles, dates, alea, id('vraifaux')),
    phrase(ai, motsCles, alea, id('phrase')),
    motDef,
  ].filter(Boolean), alea)
  // 8 formats au plus, puis le quiz du chapitre complète jusqu'au nombre voulu (2 questions au moins).
  const exercices = [...relus, ...dates2.filter(Boolean), ...autres].slice(0, nombre - 2)
  const questions = melanger(ai?.quiz ?? [], alea).map(q => qcm(q, id('qcm'))).filter(Boolean)
  exercices.push(...questions.slice(0, nombre - exercices.length))
  if (exercices.length < 4) return []
  return espacer(melanger(exercices, alea))
}

// ── La Battle en mini-jeux (29/10) ──
// Chaque round est un mini-jeu à réponse unique (une case parmi 4 au plus) : la réponse tient
// dans le champ `choix` (0 à 3) que les règles de la base temps réel acceptent déjà. Les deux
// téléphones et le serveur tirent les mêmes mini-jeux à partir des questions du salon.

/** Les formats d'une Battle : une seule réponse, assez courts pour le chrono de 15 s. */
export const FORMATS_DUEL = ['coins', 'intrus', 'indices', 'definition', 'vraifaux', 'phrase']

/** La graine d'une Battle, tirée des numéros de questions du salon. */
export function graineDuel(questions = []) {
  let h = 7
  for (const q of questions) h = (Math.imul(h, 31) + Number(q) + 1) | 0
  return h
}

/** La réponse d'un mini-jeu de Battle, en numéro de case (Vrai ou faux : 1 = vrai). */
export const bonneReponseDuel = ex => (ex.type === 'vraifaux' ? (ex.vrai ? 1 : 0) : ex.bonne)
/** Le nombre de cases d'un mini-jeu de Battle. */
export function nbChoixDuel(ex) {
  if (ex.type === 'coins' || ex.type === 'intrus') return 4
  if (ex.type === 'vraifaux') return 2
  if (ex.type === 'qcm') return ex.choix.length
  return ex.choix?.length ?? ex.mots?.length ?? 0
}

/**
 * Les mini-jeux d'une Battle, un par round (5 + la mort subite) : chaque format une fois, dans un
 * ordre tiré au sort, puis les questions du quiz du salon pour compléter.
 * @param {object} ai — contenu du chapitre (sa matière dans metadata.subject)
 * @param {number[]} questions — numéros de questions du quiz tirés à la création du salon
 * @param {number} [nombre]
 */
export function construireDuel(ai, questions = [], nombre = 6) {
  const alea = creerAlea(graineDuel(questions))
  const casse = /math|physique/i.test(ai?.metadata?.subject ?? '') ? s => s : majusculeMot
  const branches = melanger(branchesDe(ai, casse), alea)
  const motsCles = motsClesDe(ai, casse)
  const dates = datesDe(ai)
  const prises = new Set()
  let n = 0
  const id = t => `${t}-${n++}`
  const jeux = melanger([
    coins(branches, alea, id('coins'), prises),
    intrus(branches, alea, id('intrus'), prises),
    indices(branches, alea, id('indices'), prises),
    definition(motsCles, alea, id('definition'), new Set()),
    vraiFaux(motsCles, dates, alea, id('vraifaux')),
    phrase(ai, motsCles, alea, id('phrase')),
  ].filter(Boolean), alea)
  const quiz = questions.map(i => qcm(ai?.quiz?.[i], id('qcm'))).filter(Boolean)
  return [...jeux, ...quiz].filter(e => nbChoixDuel(e) >= 2 && nbChoixDuel(e) <= 4).slice(0, nombre)
}

/**
 * Évite deux exercices du même format d'affilée, en gardant l'ordre tiré au sort autant que possible :
 * on prend le premier exercice d'un autre format que le précédent, sauf quand un format occupe plus
 * de la moitié de ce qui reste (il faut alors le placer tout de suite).
 */
function espacer(liste) {
  const reste = [...liste]
  const resultat = []
  while (reste.length) {
    const avant = resultat.at(-1)?.type
    const compte = {}
    for (const e of reste) compte[e.type] = (compte[e.type] ?? 0) + 1
    const autres = reste.filter(e => e.type !== avant)
    const candidats = autres.length ? autres : reste
    const pressant = candidats.find(e => compte[e.type] * 2 > reste.length)
    const choisi = pressant ?? candidats[0]
    resultat.push(choisi)
    reste.splice(reste.indexOf(choisi), 1)
  }
  return resultat
}
