// -------------------------------------------------------
// Réviz — Agenda : emploi du temps Pronote et contrôles (fonctions pures)
// Les dates sont des chaînes locales « AAAA-MM-JJ » (jour) ou
// « AAAA-MM-JJTHH:MM » (cours) : pas d'objet Date stocké, pas de fuseau.
// -------------------------------------------------------

/** Matières d'un contrôle : celles de Mon programme (le bouton « Réviser » y mène). */
export const MATIERES_CONTROLE = [
  { slug: 'maths', label: 'Maths', mascot: 'maths' },
  { slug: 'francais', label: 'Français', mascot: 'francais' },
  { slug: 'histoire', label: 'Histoire', mascot: 'histgeo' },
  { slug: 'geographie', label: 'Géographie', mascot: 'geo' },
  { slug: 'svt', label: 'SVT', mascot: 'svt' },
  { slug: 'physique-chimie', label: 'Physique-chimie', mascot: 'physique' },
  { slug: 'technologie', label: 'Technologie', mascot: 'technonsi' },
  { slug: 'anglais', label: 'Anglais', mascot: 'langues' },
  { slug: 'autre', label: 'Autre matière', mascot: 'reading' },
]

export function matiereControle(slug) {
  return MATIERES_CONTROLE.find(m => m.slug === slug) ?? MATIERES_CONTROLE.at(-1)
}

const sansAccents = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Titre d'un cours Pronote (« MATHEMATIQUES - M. DUPONT », « HISTOIRE-GEOGRAPHIE »…)
// → matière de Mon programme. Ordre : du plus précis au plus général.
const REGLES_MATIERE = [
  // EPS d'abord : « éducation physique » n'est pas de la physique-chimie.
  [/education physique|\beps\b|sportive/, null],
  [/physique|chimie/, 'physique-chimie'],
  [/sciences? de la vie|\bsvt\b/, 'svt'],
  [/math/, 'maths'],
  [/francais|lettres/, 'francais'],
  [/histoire/, 'histoire'],
  [/geographie|\bgeo\b/, 'geographie'],
  [/techno/, 'technologie'],
  [/anglais|\blv1\b/, 'anglais'],
]

/** Matière de Mon programme d'un cours, ou null (EPS, musique, vie de classe…). */
export function matiereDuCours(titre) {
  // Le nom du professeur suit souvent « - » : on ne regarde que la matière.
  const t = sansAccents(String(titre ?? '').split(/\s[-–]\s/)[0])
  const regle = REGLES_MATIERE.find(([re]) => re.test(t))
  return regle ? regle[1] : null
}

// Pronote écrit souvent les matières en capitales sans accents : on rend
// les accents des mots courants et on abrège les intitulés à rallonge.
const NOMS_COURTS = [
  [/^education physique et sportive$/, 'EPS'],
  [/^sciences de la vie et de la terre$/, 'SVT'],
  [/^enseignement moral et civique$/, 'EMC'],
]
const ACCENTS = {
  francais: 'français', mathematiques: 'mathématiques', geographie: 'géographie',
  education: 'éducation', 'physique-chimie': 'physique-chimie', etude: 'étude',
  lv1: 'LV1', lv2: 'LV2', emc: 'EMC', eps: 'EPS', svt: 'SVT', epi: 'EPI', ap: 'AP',
}

/** Nom lisible d'un cours : « HISTOIRE-GEOGRAPHIE - MOREAU C. » → « Histoire-géographie ». */
export function nomDuCours(titre) {
  const brut = String(titre ?? '').split(/\s[-–]\s/)[0].trim()
  if (!brut) return 'Cours'
  if (brut !== brut.toUpperCase()) return brut
  const bas = brut.toLowerCase()
  const court = NOMS_COURTS.find(([re]) => re.test(sansAccents(bas)))
  if (court) return court[1]
  const accentue = bas.replace(/[a-zà-ÿ0-9]+/g, mot => ACCENTS[mot] ?? mot)
  return accentue.charAt(0).toUpperCase() + accentue.slice(1)
}

/** Professeur ou détail après le premier « - » du titre, s'il y en a. */
export function detailDuCours(titre) {
  return String(titre ?? '').split(/\s[-–]\s/).slice(1).join(' - ').trim()
}

// --- Jours ---

const pad = n => String(n).padStart(2, '0')

/** Jour local « AAAA-MM-JJ » d'une Date. */
export function jourIso(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function versDate(jour) {
  const [a, m, j] = jour.split('-').map(Number)
  return new Date(a, m - 1, j)
}

export function ajouterJours(jour, n) {
  const d = versDate(jour)
  d.setDate(d.getDate() + n)
  return jourIso(d)
}

/** Lundi de la semaine d'un jour (le dimanche appartient à la semaine qui finit). */
export function lundiDe(jour) {
  const d = versDate(jour)
  const decalage = (d.getDay() + 6) % 7
  return ajouterJours(jour, -decalage)
}

/** Jours d'école d'une semaine (lundi → vendredi, samedi s'il y a cours). */
export function joursDeLaSemaine(lundi, cours = []) {
  const jours = [0, 1, 2, 3, 4].map(i => ajouterJours(lundi, i))
  const samedi = ajouterJours(lundi, 5)
  if (cours.some(c => c.debut.startsWith(samedi))) jours.push(samedi)
  return jours
}

/** Nombre de jours entre deux jours « AAAA-MM-JJ » (positif si `a` est après `depuis`). */
export function joursEntre(depuis, a) {
  return Math.round((versDate(a) - versDate(depuis)) / 86_400_000)
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** « lundi 13 octobre » */
export function jourEnClair(jour) {
  const d = versDate(jour)
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`
}

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

/** « oct. » */
export function moisCourt(jour) {
  return MOIS_COURTS[versDate(jour).getMonth()]
}

/** « lun. » */
export function jourCourt(jour) {
  return `${JOURS[versDate(jour).getDay()].slice(0, 3)}.`
}

export function heure(debut) {
  return debut.slice(11, 16).replace(':', 'h')
}

// --- Contrôles ---

/** Contrôles d'aujourd'hui et à venir, du plus proche au plus lointain. */
export function controlesAVenir(controles = [], aujourdhui = jourIso()) {
  return controles
    .filter(c => c?.date >= aujourdhui)
    .sort((x, y) => x.date.localeCompare(y.date))
}

/** « aujourd'hui », « demain », « dans 3 jours », « dans 2 semaines » */
export function compteARebours(date, aujourdhui = jourIso()) {
  const n = joursEntre(aujourdhui, date)
  if (n <= 0) return "aujourd'hui"
  if (n === 1) return 'demain'
  if (n < 14) return `dans ${n} jours`
  return `dans ${Math.round(n / 7)} semaines`
}

/** Intitulé d'un contrôle : « Contrôle de maths », « Contrôle d'anglais ». */
export function intituleControle(c) {
  const m = matiereControle(c?.matiere)
  if (m.slug === 'autre') return 'Contrôle'
  const nom = m.label.toLowerCase()
  return /^[aeiouyh]/.test(sansAccents(nom)) ? `Contrôle d'${nom}` : `Contrôle de ${nom}`
}
