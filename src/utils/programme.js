// -------------------------------------------------------
// Réviz — « Mon programme » : réviser sans scan
// Le catalogue des chapitres (titres, notions) et les contenus générés
// sont des fichiers statiques dans public/programme/<classe>/… ; ce
// module ne contient que ce qui est partagé entre pages, services,
// script de génération et tests.
// -------------------------------------------------------

// Classes dont le catalogue est publié (voir public/programme/<slug>/index.json).
export const PROGRAMME_CLASSES = ['3ème']

// Matières de 3e couvertes en premier : les épreuves du brevet, plus la LV1.
// Les noms sont EXACTEMENT ceux attendus par le reste de l'app
// (subjectsLine dans aiPrompts.js, SUBJECT_MAP dans subjects.js) : le
// regroupement de la page Cours, les mascottes et Progrès en dépendent.
export const MATIERES_3E = [
  'Maths', 'Français', 'Histoire', 'Géographie',
  'SVT', 'Physique-Chimie', 'Technologie', 'Anglais',
]

// Identifiant de leçon stable d'un chapitre : la répétition espacée et les
// révisions sont indexées dessus, il ne doit jamais changer entre deux
// ouvertures (ni entre deux régénérations du contenu).
const LESSON_PREFIX = 'prog-'

export function slugify(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// '3ème' → '3eme', 'Terminale' → 'terminale'
export function classeSlug(classe) {
  return slugify(classe)
}

// 'Physique-Chimie' → 'physique-chimie'
export function matiereSlug(matiere) {
  return slugify(matiere)
}

export function hasProgramme(level) {
  return !!level?.classe && PROGRAMME_CLASSES.includes(level.classe)
}

export function chapterLessonId(chapterId) {
  return `${LESSON_PREFIX}${chapterId}`
}

export function isProgrammeLessonId(id) {
  return typeof id === 'string' && id.startsWith(LESSON_PREFIX)
}

export function catalogueUrl(classe) {
  return `/programme/${classeSlug(classe)}/index.json`
}

export function chapterContentUrl(classe, matiere, chapterId) {
  return `/programme/${classeSlug(classe)}/${matiereSlug(matiere)}/${chapterId}.json`
}

/**
 * État d'un chapitre pour l'élève, à partir de ce que l'app sait déjà :
 * - 'nouveau'  : jamais ouvert (pas de leçon correspondante)
 * - 'commence' : ouvert, mais aucune carte revue
 * - 'a-revoir' : des cartes sont dues (ou jamais vues)
 * - 'maitrise' : toutes les cartes revues et aucune due
 * @param {object} args
 * @param {object|null} args.lesson        entrée d'historique (loadLessons) ou null
 * @param {number} args.dueCards           countDueCards(lessonId, total)
 * @param {number} args.reviewedCards      cartes ayant au moins une répétition
 */
export function chapterState({ lesson, dueCards = 0, reviewedCards = 0 }) {
  if (!lesson) return 'nouveau'
  if (reviewedCards === 0) return 'commence'
  if (dueCards > 0) return 'a-revoir'
  return 'maitrise'
}

export const CHAPTER_STATE_LABEL = {
  nouveau:  'À découvrir',
  commence: 'Commencé',
  'a-revoir': 'À revoir',
  maitrise: 'Maîtrisé',
}
