// -------------------------------------------------------
// Réviz — première révision guidée, juste après la découverte
// Moins de la moitié des moins de 15 ans révisaient après l'inscription
// (26/10) : la découverte finissait sur la liste des matières. On lance
// directement un quiz court sur le chapitre du moment de sa classe.
// -------------------------------------------------------

// Un quiz d'une minute : 5 questions.
export const NB_QUESTIONS_PREMIERE = 5

// La matière où l'on commence (la plus révisée), sinon la première du catalogue.
const MATIERE_PREFEREE = 'Maths'

// Bornes des trimestres (mois de 0 à 11, jour inclus). L'été compte comme le
// début du T1 : un élève qui s'inscrit en août révise la rentrée.
const TRIMESTRES = [
  { periode: 'T1', debut: [8, 1], fin: [11, 20] },
  { periode: 'T2', debut: [0, 1], fin: [2, 31] },
  { periode: 'T3', debut: [3, 1], fin: [5, 30] },
]

/** Trimestre en cours et part déjà écoulée (0 à 1). */
export function trimestreDuJour(date = new Date()) {
  const an = date.getFullYear()
  for (const t of TRIMESTRES) {
    const debut = new Date(an, t.debut[0], t.debut[1])
    const fin = new Date(an, t.fin[0], t.fin[1], 23, 59)
    if (date >= debut && date <= fin) {
      return { periode: t.periode, avance: (date - debut) / (fin - debut) }
    }
  }
  // Vacances de Noël : fin du T1. Été : tout début du T1.
  return date.getMonth() === 11 ? { periode: 'T1', avance: 1 } : { periode: 'T1', avance: 0 }
}

/**
 * Chapitre du moment dans un catalogue de classe : dans la matière préférée,
 * parmi les chapitres du trimestre en cours, celui qui correspond à
 * l'avancée du trimestre (fin octobre = milieu du T1).
 * @returns {{ matiere: string, chapitre: object } | null}
 */
export function chapitreDuMoment(catalogue, date = new Date()) {
  const matieres = (catalogue?.matieres ?? []).filter(m => m.chapitres?.length)
  const entree = matieres.find(m => m.matiere === MATIERE_PREFEREE) ?? matieres[0]
  if (!entree) return null
  const tous = [...entree.chapitres].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
  const { periode, avance } = trimestreDuJour(date)
  const duTrimestre = tous.filter(c => c.periode === periode)
  const liste = duTrimestre.length ? duTrimestre : tous
  const i = Math.min(liste.length - 1, Math.floor(avance * liste.length))
  return { matiere: entree.matiere, chapitre: liste[i] }
}

/** Les questions du quiz court : les premières du chapitre. */
export function questionsPremiere(quiz) {
  return Array.isArray(quiz) ? quiz.slice(0, NB_QUESTIONS_PREMIERE) : quiz
}
