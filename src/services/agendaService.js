// -------------------------------------------------------
// Réviz — Agenda : lien Pronote, contrôles, cours de la semaine
//
// Stockage : champ `agenda` du document users/{uid} (les règles Firestore
// laissent le propriétaire le modifier), copié dans localStorage pour un
// affichage immédiat (accueil, hors ligne). En mode essai : localStorage
// seulement, la clé suit l'élève à la création du compte (guestService).
//   agenda = { pronote: string|null, controles: [{ id, matiere, titre, date }] }
// Les cours ne sont jamais stockés en ligne : relus depuis Pronote, mis en
// cache sur l'appareil.
// -------------------------------------------------------
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebaseConfig'
import { apiFetch } from './apiClient'
import { planifierRappelsControles } from './reminderService'
import { controlesAVenir, jourIso } from '../utils/agenda'
import { coursDemo, estLienDemo } from '../utils/edtDemo'

const cleAgenda = uid => `reviz-agenda-${uid}`
const cleCours = uid => `reviz-agenda-cours-${uid}`
const VIDE = { pronote: null, controles: [] }

function lireLocal(cle, defaut) {
  try { return JSON.parse(localStorage.getItem(cle) || 'null') ?? defaut } catch { return defaut }
}
function ecrireLocal(cle, valeur) {
  try { localStorage.setItem(cle, JSON.stringify(valeur)) } catch { /* stockage indispo */ }
  window.dispatchEvent(new Event('reviz-agenda'))
}

function normaliser(a) {
  return {
    pronote: typeof a?.pronote === 'string' ? a.pronote : null,
    controles: Array.isArray(a?.controles) ? a.controles.filter(c => c?.id && c?.date) : [],
  }
}

/** Agenda en cache (synchrone, pour un premier affichage sans attente). */
export function agendaLocal(uid) {
  return uid ? normaliser(lireLocal(cleAgenda(uid), VIDE)) : VIDE
}

/** Agenda à jour depuis Firestore (le cache local sert si le réseau manque). */
export async function chargerAgenda(user) {
  const local = agendaLocal(user?.uid)
  if (!user || user.isGuest) return local
  try {
    const snap = await getDoc(doc(db, 'users', user.uid))
    const distant = snap.exists() ? snap.data()?.agenda : null
    // Contrôles saisis en mode essai, compte tout juste créé : on les garde.
    const agenda = distant ? normaliser(distant) : local
    if (!distant && (local.controles.length || local.pronote)) await enregistrer(user, agenda)
    ecrireLocal(cleAgenda(user.uid), agenda)
    return agenda
  } catch {
    return local
  }
}

async function enregistrer(user, agenda) {
  ecrireLocal(cleAgenda(user.uid), agenda)
  planifierRappelsControles(controlesAVenir(agenda.controles)).catch(() => {})
  if (!user.isGuest) await setDoc(doc(db, 'users', user.uid), { agenda }, { merge: true })
  return agenda
}

export async function ajouterControle(user, { matiere, titre, date }) {
  const agenda = agendaLocal(user.uid)
  const controle = {
    id: `c${Date.now().toString(36)}`,
    matiere,
    titre: String(titre ?? '').trim().slice(0, 80),
    date,
  }
  // On ne garde pas les contrôles passés depuis plus d'un mois.
  const limite = jourIso(new Date(Date.now() - 31 * 86_400_000))
  const controles = [...agenda.controles.filter(c => c.date >= limite), controle]
  return enregistrer(user, { ...agenda, controles })
}

export async function supprimerControle(user, id) {
  const agenda = agendaLocal(user.uid)
  return enregistrer(user, { ...agenda, controles: agenda.controles.filter(c => c.id !== id) })
}

export async function relierPronote(user, lien) {
  const agenda = agendaLocal(user.uid)
  return enregistrer(user, { ...agenda, pronote: lien })
}

export async function delierPronote(user) {
  try { localStorage.removeItem(cleCours(user.uid)) } catch { /* rien */ }
  return enregistrer(user, { ...agendaLocal(user.uid), pronote: null })
}

/** Cours en cache pour la période (affichage immédiat, hors ligne). */
export function coursEnCache(uid) {
  return lireLocal(cleCours(uid), null)
}

/**
 * Cours de Pronote entre `du` et `au` (« AAAA-MM-JJ »), via /api/auth
 * (le navigateur ne peut pas lire le lien lui-même).
 * @throws {Error} LIEN_INVALIDE | LIEN_EXPIRE | PRONOTE_INDISPONIBLE | UNAUTHORIZED | NETWORK_ERROR
 */
export async function chargerCours(user, lien, { du, au }) {
  if (estLienDemo(lien)) {
    const cours = coursDemo({ du, au })
    ecrireLocal(cleCours(user.uid), { du, au, cours, le: Date.now() })
    return cours
  }
  const idToken = await auth.currentUser?.getIdToken().catch(() => null)
  if (!idToken) throw new Error('UNAUTHORIZED')
  let res
  try {
    res = await apiFetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edt', idToken, lien, du, au }),
    })
  } catch {
    throw new Error('NETWORK_ERROR')
  }
  const corps = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(corps.error || 'PRONOTE_INDISPONIBLE')
  const cours = Array.isArray(corps.cours) ? corps.cours : []
  ecrireLocal(cleCours(user.uid), { du, au, cours, le: Date.now() })
  return cours
}

export function messageErreurPronote(code) {
  switch (code) {
    case 'LIEN_INVALIDE': return "Ce lien n'est pas un lien Pronote. Copie l'adresse donnée dans Export au format ICal."
    case 'LIEN_EXPIRE': return 'Pronote ne reconnaît plus ce lien. Copie-le à nouveau depuis Pronote.'
    case 'NETWORK_ERROR': return 'Pas de connexion. Réessaie dans un instant.'
    default: return 'Pronote ne répond pas pour le moment. Réessaie plus tard.'
  }
}
