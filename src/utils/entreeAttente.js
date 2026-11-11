// -------------------------------------------------------
// Réviz — Réponses de l'entrée données avant le compte (pages/Commencer.jsx, 11/11)
// Depuis le 11/11, plus d'essai sans compte : Réviz pose ses questions d'abord (prénom, classe,
// prochain contrôle, blocage, note visée), puis l'élève crée son compte pour garder son plan,
// comme dans l'app Knowunity. Les réponses attendent ici, sur l'appareil, jusqu'à la création du
// compte ; la découverte (pages/Onboarding.jsx) les range alors sur le compte (agenda, réponses)
// et lance la séance d'accueil. Rien ne part au serveur avant le compte. Oubliées après 7 jours.
// -------------------------------------------------------
import { CLASSES_BY_CYCLE } from './levels.js'

const CLE = 'reviz-entree-attente'
const DUREE_MS = 7 * 24 * 60 * 60 * 1000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function controlePropre(c) {
  if (c === 'aucun') return 'aucun'
  if (!c || typeof c !== 'object' || typeof c.matiere !== 'string' || !DATE_RE.test(c.date ?? '')) return null
  return {
    matiere: c.matiere.slice(0, 40),
    titre: String(c.titre ?? '').slice(0, 80),
    date: c.date,
    chapitres: Array.isArray(c.chapitres) ? c.chapitres.slice(0, 12) : [],
    classe: c.classe ?? null,
    programme: c.programme ?? null,
  }
}

/** Les réponses en attente, ou null (rien, illisible ou trop ancien). */
export function lireEntree(maintenant = Date.now()) {
  try {
    const e = JSON.parse(localStorage.getItem(CLE) || 'null')
    if (!e || typeof e !== 'object' || !Number.isFinite(e.le) || maintenant - e.le > DUREE_MS) return null
    const classe = CLASSES_BY_CYCLE.college.includes(e.classe) ? e.classe : null
    const prenom = typeof e.prenom === 'string' ? e.prenom.trim().slice(0, 30) : ''
    return {
      prenom,
      classe,
      controle: controlePropre(e.controle),
      blocage: typeof e.blocage === 'string' ? e.blocage : null,
      objectif: typeof e.objectif === 'string' ? e.objectif : null,
      fini: e.fini === true,
      le: e.le,
    }
  } catch {
    return null
  }
}

/** Ajoute ou remplace des réponses (l'horodatage repart à chaque réponse). */
export function garderEntree(reponses, maintenant = Date.now()) {
  try {
    const avant = lireEntree(maintenant) ?? {}
    localStorage.setItem(CLE, JSON.stringify({ ...avant, ...reponses, le: maintenant }))
  } catch { /* stockage indisponible : l'inscription redemandera prénom et classe */ }
}

export function oublierEntree() {
  try { localStorage.removeItem(CLE) } catch { /* rien */ }
}

/** Le niveau au format du profil, si la classe est connue. */
export function niveauDeLEntree(entree = lireEntree()) {
  return entree?.classe ? { cycle: 'college', classe: entree.classe, specialites: [] } : null
}
