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
 * `casse` : la mise en forme des noms et des éléments (majuscule en tête, sauf en maths et en physique).
 */
function branchesDe(ai, casse) {
  const brutes = (ai?.mindmap?.branches ?? [])
    .map(b => ({
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

function definition(motsCles, alea, id, deja) {
  const libres = motsCles.filter(k => !deja.has(k.terme))
  if (!libres.length || motsCles.length < 2) return null
  const k = tirer(libres, alea)
  deja.add(k.terme)
  const leurre = tirer(motsCles.filter(x => x !== k), alea)
  const choix = melanger([k.terme, leurre.terme], alea)
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
  // Un sigle (« BBC ») garde ses capitales.
  const commeLaPhrase = mot => (/^\p{Ll}/u.test(forme) ? (/^\p{Lu}\p{Ll}/u.test(mot) ? mot[0].toLowerCase() + mot.slice(1) : mot) : majuscule(mot))
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
  const casse = /math|physique/i.test(ai?.metadata?.subject ?? '') ? s => s : majusculeMot
  const branches = melanger(branchesDe(ai, casse), alea)
  const motsCles = motsClesDe(ai, casse)
  const dates = datesDe(ai)
  const branchesPrises = new Set()
  const termesPris = new Set()
  const anneesPrises = new Set()
  let n = 0
  const id = t => `${t}-${n++}`

  // Les formats datés sont rares (surtout l'histoire) : ils passent en premier quand le chapitre en a.
  const dates2 = [chronologie(dates, alea, id('ordre')), annee(dates, alea, id('annee'), anneesPrises)]
  // Paires et Mémory font travailler la même chose : l'un ou l'autre dans une séance.
  const motDef = alea() < 0.5 ? paires(motsCles, alea, id('paires')) : memory(motsCles, alea, id('memory'))
  const autres = melanger([
    coins(branches, alea, id('coins'), branchesPrises),
    intrus(branches, alea, id('intrus'), branchesPrises),
    indices(branches, alea, id('indices'), branchesPrises),
    classement(branches, alea, id('classement'), branchesPrises),
    definition(motsCles, alea, id('definition'), termesPris),
    vraiFaux(motsCles, dates, alea, id('vraifaux')),
    phrase(ai, motsCles, alea, id('phrase')),
    motDef,
  ].filter(Boolean), alea)
  // 8 formats au plus, puis le quiz du chapitre complète jusqu'au nombre voulu (2 questions au moins).
  const exercices = [...dates2.filter(Boolean), ...autres].slice(0, nombre - 2)
  const questions = melanger(ai?.quiz ?? [], alea).map(q => qcm(q, id('qcm'))).filter(Boolean)
  exercices.push(...questions.slice(0, nombre - exercices.length))
  if (exercices.length < 4) return []
  return espacer(melanger(exercices, alea))
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
