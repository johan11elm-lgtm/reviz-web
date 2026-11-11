// -------------------------------------------------------
// Réviz — Plan brevet prêt à l'emploi (11/11, repris de Knowunity : REA-KNOWUNITY-2026-11-11.md)
//
// Pour un élève de 3e : les chapitres des matières des écrits du brevet, répartis semaine par
// semaine jusqu'au 7 juin 2027 (les deux dernières semaines restent pour les plans de révision
// des épreuves, qui se font dans l'agenda : J-5, J-3, J-1). L'ordre suit l'année (périodes T1,
// T2, T3, puis le rang du chapitre), les matières alternent. Le plan part du lundi où l'élève l'a
// ouvert la première fois (gardé sur l'appareil) : un chapitre pas fait d'une semaine passée reste
// « à rattraper ».
// Écrits 2027 (note de service du 11/09/2026, reprise sur revizapp.fr/brevet/dates) : jeudi 24 juin
// français, vendredi 25 juin histoire-géographie et EMC, lundi 28 juin sciences puis maths.
// Pas de brevet blanc dans l'app : il se fait sur papier (décision de Johan, 11/11).
// -------------------------------------------------------
import { ajouterJours, joursEntre, lundiDe, jourIso } from './agenda.js'
import { chapterLessonId } from './programme.js'

export const ECRITS_BREVET = [
  { id: 'francais', date: '2027-06-24', matiere: 'francais', titre: 'Brevet : français', epreuve: 'Français', horaire: '8 h - 11 h 15' },
  { id: 'histoire', date: '2027-06-25', matiere: 'histoire', titre: 'Brevet : histoire-géo et EMC', epreuve: 'Histoire-géo et EMC', horaire: '8 h - 10 h' },
  { id: 'sciences', date: '2027-06-28', matiere: 'physique-chimie', titre: 'Brevet : sciences', epreuve: 'Sciences', horaire: '8 h - 9 h' },
  { id: 'maths', date: '2027-06-28', matiere: 'maths', titre: 'Brevet : mathématiques', epreuve: 'Mathématiques', horaire: '10 h - 12 h' },
]
export const PREMIER_ECRIT = ECRITS_BREVET[0].date
/** Lundi de la dernière semaine du plan de chapitres. */
export const DERNIERE_SEMAINE = '2027-06-07'
/** Matières des écrits, dans l'ordre où elles alternent (l'EMC n'a pas de chapitres à part). */
export const MATIERES_BREVET = ['maths', 'francais', 'histoire', 'physique-chimie', 'geographie', 'svt', 'technologie']
const PERIODES = { T1: 1, T2: 2, T3: 3 }

/** Les chapitres prêts des matières du brevet, dans l'ordre de l'année. */
export function chapitresBrevet(catalogue) {
  const liste = []
  for (const slug of MATIERES_BREVET) {
    const m = catalogue?.matieres?.find(x => x.slug === slug)
    for (const ch of m?.chapitres ?? []) {
      if (ch?.pret) liste.push({ slug, matiere: m.matiere, ch })
    }
  }
  const rang = c => [PERIODES[c.ch.periode] ?? 2, Number.isFinite(c.ch.ordre) ? c.ch.ordre : 99, MATIERES_BREVET.indexOf(c.slug)]
  return liste.sort((a, b) => {
    const [x, y] = [rang(a), rang(b)]
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
  })
}

/**
 * Les semaines du plan, de `debut` (un jour quelconque : on part de son lundi) au 7 juin 2027.
 * @returns {{ debut: string, chapitres: { slug, matiere, ch }[] }[]}
 */
export function semainesBrevet(catalogue, debut = jourIso()) {
  const liste = chapitresBrevet(catalogue)
  const premier = lundiDe(debut)
  const n = Math.max(1, Math.floor(joursEntre(premier, DERNIERE_SEMAINE) / 7) + 1)
  const semaines = Array.from({ length: n }, (_, i) => ({ debut: ajouterJours(premier, 7 * i), chapitres: [] }))
  liste.forEach((c, i) => semaines[Math.floor((i * n) / liste.length)].chapitres.push(c))
  return semaines
}

/** Un chapitre est « fait » dès qu'une séance (exercices, quiz, flashcards) l'a travaillé. */
export function chapitresFaits(revisions = []) {
  return new Set(revisions.map(r => r?.lessonId).filter(Boolean))
}
export const estFait = (faits, c) => faits.has(chapterLessonId(c.ch.id))

/**
 * Où en est l'élève : la semaine en cours, ce qu'il reste à rattraper des semaines passées, le total.
 */
export function etatPlanBrevet(semaines, faits, aujourdhui = jourIso()) {
  const lundi = lundiDe(aujourdhui)
  let enCours = 0
  semaines.forEach((s, i) => { if (s.debut <= lundi) enCours = i })
  const passees = semaines.filter(s => s.debut < semaines[enCours].debut)
  const aRattraper = passees.flatMap(s => s.chapitres).filter(c => !estFait(faits, c))
  const tous = semaines.flatMap(s => s.chapitres)
  return { enCours, semaine: semaines[enCours], aRattraper, faits: tous.filter(c => estFait(faits, c)).length, total: tous.length }
}

// Le lundi de départ, gardé sur l'appareil (le plan ne glisse pas d'une semaine à l'autre).
const cle = uid => `reviz-plan-brevet-${uid}`
export function debutPlanBrevet(uid, aujourdhui = jourIso()) {
  try {
    const d = JSON.parse(localStorage.getItem(cle(uid)) || 'null')
    if (typeof d?.debut === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.debut) && d.debut <= aujourdhui) return d.debut
    const debut = lundiDe(aujourdhui)
    localStorage.setItem(cle(uid), JSON.stringify({ debut }))
    return debut
  } catch {
    return lundiDe(aujourdhui)
  }
}
