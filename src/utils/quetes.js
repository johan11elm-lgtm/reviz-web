// -------------------------------------------------------
// Réviz — les quêtes (29/10)
// Idée relevée chez BrainQraft : une quête du jour (nouvelle à minuit) et trois
// quêtes de la semaine (nouvelles le lundi), dont la récompense se récupère à
// la main. La progression se lit dans les révisions de la période : rien à
// compter à part, et elle suit l'élève d'un appareil à l'autre. Seules les
// récompenses récupérées sont gardées (services/quetesService.js).
// -------------------------------------------------------
import { jourParis } from './retour.js'

/** Ce que mesure une quête, à partir des révisions de la période. */
const MESURES = {
  bonnes: rs => rs.reduce((s, r) => s + (Number.isFinite(r.bonnes) ? r.bonnes
    : ['quiz', 'exercices', 'controle'].includes(r.type) && Number.isFinite(r.score) ? r.score : 0), 0),
  exercices: rs => rs.filter(r => r.type === 'exercices' && r.total).length,
  quiz: rs => rs.filter(r => r.type === 'quiz' && r.total).length,
  cartes: rs => rs.reduce((s, r) => s + (r.type === 'flashcards' && Number.isFinite(r.cartes) ? r.cartes : 0), 0),
  combo: rs => rs.reduce((m, r) => Math.max(m, Number.isFinite(r.comboMax) ? r.comboMax : 0), 0),
  chapitres: rs => new Set(rs.map(r => r.lessonId).filter(Boolean)).size,
  xp: rs => rs.reduce((s, r) => s + (Number.isFinite(r.xp) ? r.xp : 0), 0),
  jours: rs => new Set(rs.map(r => jourParis(r.revisedAt))).size,
}

export const QUETES_DU_JOUR = [
  { id: 'bonnes15', titre: 'Donne 15 bonnes réponses', mesure: 'bonnes', cible: 15, xp: 50 },
  { id: 'exercices1', titre: 'Termine une séance d’exercices en jeu', mesure: 'exercices', cible: 1, xp: 50 },
  { id: 'combo5', titre: 'Enchaîne 5 bonnes réponses', mesure: 'combo', cible: 5, xp: 50 },
  { id: 'chapitres2', titre: 'Révise 2 chapitres', mesure: 'chapitres', cible: 2, xp: 50 },
  { id: 'xp100', titre: 'Gagne 100 XP en révisant', mesure: 'xp', cible: 100, xp: 40 },
  { id: 'quiz1', titre: 'Termine un quiz', mesure: 'quiz', cible: 1, xp: 40 },
  { id: 'cartes10', titre: 'Revois 10 flashcards', mesure: 'cartes', cible: 10, xp: 40 },
]

export const QUETES_DE_LA_SEMAINE = [
  { id: 'jours4', titre: 'Révise 4 jours cette semaine', mesure: 'jours', cible: 4, xp: 150 },
  { id: 'exercices3', titre: 'Termine 3 séances d’exercices', mesure: 'exercices', cible: 3, xp: 150 },
  { id: 'bonnes60', titre: 'Donne 60 bonnes réponses', mesure: 'bonnes', cible: 60, xp: 150 },
  { id: 'chapitres5', titre: 'Révise 5 chapitres différents', mesure: 'chapitres', cible: 5, xp: 150 },
  { id: 'combo10', titre: 'Enchaîne 10 bonnes réponses', mesure: 'combo', cible: 10, xp: 150 },
  { id: 'quiz4', titre: 'Termine 4 quiz', mesure: 'quiz', cible: 4, xp: 120 },
  { id: 'xp500', titre: 'Gagne 500 XP en révisant', mesure: 'xp', cible: 500, xp: 150 },
]

function hachage(texte) {
  let h = 2166136261
  for (let i = 0; i < texte.length; i++) h = Math.imul(h ^ texte.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Le lundi de la semaine d'un jour AAAA-MM-JJ. */
export function lundiDe(jour) {
  const t = Date.parse(`${jour}T00:00:00Z`)
  const j = (new Date(t).getUTCDay() + 6) % 7
  return new Date(t - j * 864e5).toISOString().slice(0, 10)
}

/** Heures et minutes avant minuit à Paris. */
function avantMinuit(maintenant) {
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(maintenant)
  const h = Number(parts.find(p => p.type === 'hour')?.value ?? 0)
  const m = Number(parts.find(p => p.type === 'minute')?.value ?? 0)
  const reste = 24 * 60 - (h * 60 + m)
  return { heures: Math.floor(reste / 60), minutes: reste % 60 }
}

function etat(def, periode, revisions, reclamees) {
  const cle = `${periode}:${def.id}`
  const progression = Math.min(def.cible, MESURES[def.mesure](revisions))
  return { ...def, cle, progression, faite: progression >= def.cible, recuperee: cle in (reclamees ?? {}) }
}

/**
 * Les quêtes du moment et leur avancement.
 * @param {object[]} revisions — toutes les révisions de l'élève
 * @param {Record<string, number>} reclamees — récompenses déjà récupérées, par clé
 * @param {number} [maintenant]
 */
export function quetesDuMoment(revisions = [], reclamees = {}, maintenant = Date.now()) {
  const jour = jourParis(maintenant)
  const lundi = lundiDe(jour)
  const duJour = revisions.filter(r => r?.revisedAt && jourParis(r.revisedAt) === jour)
  const deLaSemaine = revisions.filter(r => r?.revisedAt && lundiDe(jourParis(r.revisedAt)) === lundi)
  const quoti = QUETES_DU_JOUR[hachage(`jour-${jour}`) % QUETES_DU_JOUR.length]
  const pool = [...QUETES_DE_LA_SEMAINE]
  const semaine = []
  let h = hachage(`semaine-${lundi}`)
  for (let i = 0; i < 3; i++) { semaine.push(pool.splice(h % pool.length, 1)[0]); h = Math.floor(h / 7) + 13 }
  const finSemaine = 7 - ((new Date(`${jour}T00:00:00Z`).getUTCDay() + 6) % 7) // jours restants, aujourd'hui compris
  return {
    jour: etat(quoti, `j${jour}`, duJour, reclamees),
    semaine: semaine.map(d => etat(d, `s${lundi}`, deLaSemaine, reclamees)),
    renouvellement: { jour: avantMinuit(maintenant), semaine: finSemaine },
  }
}

/** Les récompenses prêtes à récupérer. */
export const aRecuperer = q => [q.jour, ...q.semaine].filter(x => x.faite && !x.recuperee)

/** Le total des XP de quêtes récupérées. */
export const xpDesQuetes = reclamees => Object.values(reclamees ?? {}).reduce((s, x) => s + (Number.isFinite(x) ? x : 0), 0)
