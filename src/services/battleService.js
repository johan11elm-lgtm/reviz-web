// -------------------------------------------------------
// Réviz — Service Battle (Firebase Realtime Database)
//
// La partie en cours vit dans battles/{code}. Les règles d'accès sont dans
// database.rules.json, les règles du jeu dans utils/battle.js. Chaque fonction
// reçoit le contexte { db, uid } (battleConnexion.js dans l'app, l'émulateur
// dans les tests). N'est importé que par les pages de la Battle, chargées à la
// demande : firebase/database reste hors du bundle principal.
// -------------------------------------------------------
import {
  ref, get, set, update, remove, onValue, onDisconnect, serverTimestamp,
} from 'firebase/database'
import {
  DECOMPTE_MS, genererCode, normaliserCode, nettoyerPrenom, nouveauSalon, tirerQuestions,
} from '../utils/battle'

const TENTATIVES_CODE = 6

const salonRef = (db, code, chemin = '') => ref(db, `battles/${code}${chemin ? '/' + chemin : ''}`)
// Écriture : « PERMISSION_DENIED: Permission denied » ; lecture : « Permission denied ».
const refusee = err => /permission/i.test(err?.code ?? '') || /permission[ _]denied/i.test(err?.message ?? '')

/** Erreur lisible par l'interface : err.raison ∈ prenom | code | introuvable | complet | codes */
function erreurBattle(raison, message) {
  const err = new Error(message)
  err.raison = raison
  return err
}

/**
 * L'hôte ouvre un salon sur un chapitre et reçoit le code à partager.
 * @param {{ db, uid }} ctx
 * @param {{ prenom: string, chapitre: { classe, matiere, id }, nbQuestions: number, random?: () => number }} options
 * @returns {Promise<string>} le code du salon
 */
export async function creerBattle({ db, uid }, { prenom, chapitre, nbQuestions, random = Math.random }) {
  const nom = nettoyerPrenom(prenom)
  if (!nom) throw erreurBattle('prenom', 'Prénom manquant')
  const questions = tirerQuestions(nbQuestions, random)
  for (let i = 0; i < TENTATIVES_CODE; i++) {
    const code = genererCode(random)
    try {
      // Les règles refusent d'écraser un salon existant : on retente un autre code.
      await set(salonRef(db, code), { ...nouveauSalon({ uid, prenom: nom, chapitre, questions }), creeLe: serverTimestamp() })
    } catch (err) {
      if (refusee(err)) continue
      throw err
    }
    await onDisconnect(salonRef(db, code, 'hote/present')).set(false)
    return code
  }
  throw erreurBattle('codes', 'Aucun code libre trouvé')
}

/** Le salon, s'il est lisible par cet élève (joueur, ou salon qui attend un invité). */
export async function lireSalon({ db }, code) {
  try {
    const snap = await get(salonRef(db, code))
    return snap.exists() ? snap.val() : null
  } catch (err) {
    if (refusee(err)) return null
    throw err
  }
}

/**
 * L'invité rejoint un salon avec le code reçu.
 * @returns {Promise<{ code: string, salon: object }>}
 */
export async function rejoindreBattle(ctx, saisie, prenom) {
  const { db, uid } = ctx
  const code = normaliserCode(saisie)
  if (!code) throw erreurBattle('code', 'Code invalide')
  const nom = nettoyerPrenom(prenom)
  if (!nom) throw erreurBattle('prenom', 'Prénom manquant')
  const salon = await lireSalon(ctx, code)
  if (!salon) throw erreurBattle('introuvable', 'Salon introuvable')
  if (salon.invite?.uid === uid) return { code, salon }
  if (salon.hote.uid === uid) return { code, salon }
  if (salon.etat !== 'salon' || salon.invite) throw erreurBattle('complet', 'Partie déjà commencée')
  try {
    await set(salonRef(db, code, 'invite'), { uid, prenom: nom, present: true })
  } catch (err) {
    // Quelqu'un a pris la place entre la lecture et l'écriture.
    if (refusee(err)) throw erreurBattle('complet', 'Partie déjà commencée')
    throw err
  }
  await onDisconnect(salonRef(db, code, 'invite/present')).set(false)
  return { code, salon: await lireSalon(ctx, code) }
}

/** Suit le salon en direct. @returns {() => void} pour arrêter */
export function ecouterBattle({ db }, code, rappel, enErreur = () => {}) {
  return onValue(salonRef(db, code), snap => rappel(snap.val()), enErreur)
}

/** Décalage entre l'horloge du téléphone et celle du serveur, en direct. */
export function ecouterHorloge({ db }, rappel) {
  return onValue(ref(db, '.info/serverTimeOffset'), snap => rappel(snap.val() ?? 0))
}

/**
 * Tient la présence du joueur à jour : vraie tant qu'il est connecté, fausse
 * dès que la connexion tombe (le serveur l'écrit pour lui), vraie à nouveau
 * quand elle revient.
 * @param {'hote'|'invite'} role
 */
export function tenirPresence({ db }, code, role) {
  const presence = salonRef(db, code, `${role}/present`)
  return onValue(ref(db, '.info/connected'), async snap => {
    if (snap.val() !== true) return
    try {
      await onDisconnect(presence).set(false)
      await set(presence, true)
    } catch { /* salon supprimé entre-temps */ }
  })
}

/** Le joueur quitte l'écran : il est absent (l'autre gagnera par forfait s'il ne revient pas). */
export function marquerAbsent({ db }, code, role) {
  return set(salonRef(db, code, `${role}/present`), false)
}

/** L'hôte lance la partie : décompte, puis round 1. `maintenant` : horloge serveur. */
export function lancerPartie({ db }, code, maintenant) {
  return update(salonRef(db, code), { etat: 'jeu', round: 1, 'rounds/1/debut': maintenant + DECOMPTE_MS })
}

/** Le joueur répond au round n. ms : temps mesuré par le téléphone depuis l'affichage de la question. */
export function repondre({ db, uid }, code, n, { choix, ms }) {
  return set(salonRef(db, code, `rounds/${n}/reponses/${uid}`), { choix, ms: Math.round(ms) })
}

/** L'hôte applique l'étape calculée par prochaineEtape() (utils/battle.js). */
export function avancer({ db }, code, etape) {
  if (etape?.type === 'round') {
    return update(salonRef(db, code), { round: etape.n, [`rounds/${etape.n}/debut`]: etape.debut })
  }
  if (etape?.type === 'fin') return set(salonRef(db, code, 'etat'), 'fin')
  return Promise.resolve()
}

/** Un joueur constate le départ de l'autre (présence fausse depuis RETOUR_MS). */
export function declarerAbandon({ db }, code, uidParti) {
  return update(salonRef(db, code), { etat: 'abandon', abandonPar: uidParti })
}

/**
 * Revanche : l'hôte ouvre un nouveau salon sur le même chapitre et l'annonce
 * dans l'ancien, où l'invité le voit et le rejoint.
 * @returns {Promise<string>} le code du nouveau salon
 */
export async function lancerRevanche(ctx, code, salon, { prenom, nbQuestions, random }) {
  const nouveau = await creerBattle(ctx, { prenom, chapitre: salon.chapitre, nbQuestions, random })
  await set(salonRef(ctx.db, code, 'revanche'), nouveau)
  return nouveau
}

/** Quitter : l'hôte ferme le salon qui attend encore ; sinon on se déclare absent. */
export async function quitterBattle({ db, uid }, code, salon) {
  const role = salon?.hote?.uid === uid ? 'hote' : 'invite'
  await onDisconnect(salonRef(db, code, `${role}/present`)).cancel()
  if (role === 'hote' && salon?.etat === 'salon') return remove(salonRef(db, code))
  return set(salonRef(db, code, `${role}/present`), false)
}
