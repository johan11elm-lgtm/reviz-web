// -------------------------------------------------------
// Réviz — Accord parental : jeton d'autorisation et lien à partager
//
// 1. Jeton d'autorisation. Le lien « Donner mon autorisation » envoyé au parent
//    porte un jeton. Jusqu'au 10/11, ce jeton était rangé tel quel dans
//    users/{uid}/parentalConsent/consent, que l'élève peut lire (règles
//    Firestore : lecture du propriétaire, pour l'affichage) : il pouvait donc
//    reconstruire le lien et s'approuver seul. Le document ne garde plus qu'un
//    `germe` tiré au hasard ; le jeton se recalcule côté serveur (HMAC du germe,
//    clé CRON_SECRET). Les demandes déjà parties (champ `token`) restent
//    valables jusqu'à leur expiration. Sans CRON_SECRET, on retombe sur
//    l'ancien jeton, pour que l'accord reste possible.
//
// 2. Lien à partager. Près de deux élèves de moins de 15 ans sur trois ne
//    donnent jamais l'adresse d'un parent (ils ne la connaissent pas par cœur) :
//    l'élève envoie plutôt un lien à son parent par message. Le parent y saisit
//    lui-même son adresse, puis reçoit l'e-mail d'autorisation habituel : même
//    preuve qu'avant (une adresse qui n'est pas celle de l'élève reçoit le lien
//    et confirme), seul celui qui tape l'adresse change. Le lien est signé (HMAC,
//    CRON_SECRET) avec sa date d'expiration ; rien n'est rangé en base.
// -------------------------------------------------------
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { signatureDesabo, signatureValide } from './_rappels.js'
import { JOUR_MS, DELAI_ADRESSE_MS } from '../src/utils/consent.js'

const APP = 'https://app.revizapp.fr'
const UID_OK = /^[A-Za-z0-9]{10,128}$/

// ── Jeton d'autorisation ────────────────────────────────────────────────────

const porteeJeton = germe => `accord-jeton:${germe}`

/**
 * Une nouvelle demande d'autorisation : les champs à ranger dans le document
 * (jamais le jeton lui-même quand la clé serveur existe) et le jeton à mettre
 * dans le lien.
 * @returns {{ champs: { germe?: string, token: string|null }, jeton: string }}
 */
export function nouvelleDemande(uid, { secret = process.env.CRON_SECRET } = {}) {
  if (secret) {
    const germe = randomBytes(16).toString('hex')
    return { champs: { germe, token: null }, jeton: signatureDesabo(uid, secret, porteeJeton(germe)) }
  }
  const token = randomUUID()
  return { champs: { token }, jeton: token }
}

/** Une demande est-elle partie pour ce document (lien d'autorisation encore valable) ? */
export function demandeEnCours(d) {
  return !!(d && ((typeof d.germe === 'string' && d.germe) || (typeof d.token === 'string' && d.token)))
}

/** Le jeton du lien d'autorisation de ce document (pour le renvoyer), ou null. */
export function jetonDe(uid, d, { secret = process.env.CRON_SECRET } = {}) {
  if (typeof d?.germe === 'string' && d.germe) return signatureDesabo(uid, secret, porteeJeton(d.germe))
  return typeof d?.token === 'string' && d.token ? d.token : null
}

/** Le jeton fourni par le lien est-il celui de ce document ? (comparaison en temps constant) */
export function jetonValide(uid, d, fourni, { secret = process.env.CRON_SECRET } = {}) {
  const attendu = jetonDe(uid, d, { secret })
  if (!attendu || typeof fourni !== 'string') return false
  const a = Buffer.from(attendu)
  const b = Buffer.from(fourni)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** À poser sur le document quand le parent a répondu : le lien ne sert qu'une fois. */
export const JETON_CONSOMME = Object.freeze({ token: null, germe: null })

// ── Lien à partager ─────────────────────────────────────────────────────────

/** Le lien vit autant que le délai pour donner l'adresse (15 jours). */
export const DUREE_PARTAGE_MS = DELAI_ADRESSE_MS
/** Au plus cinq e-mails d'autorisation envoyés depuis les liens partagés d'un élève. */
export const MAX_ENVOIS_LIEN = 5

const porteePartage = exp => `accord-partage:${exp}`

/** Score de quiz à montrer au parent ({ score, total }), validé ; null sinon. */
export function scorePartage(brut) {
  const score = Number(brut?.score)
  const total = Number(brut?.total)
  if (!Number.isInteger(score) || !Number.isInteger(total) || total < 1 || total > 50 || score < 0 || score > total) return null
  return { score, total }
}

/**
 * Le lien que l'élève envoie à son parent (null sans clé serveur).
 * Avec `resultat`, la page montre aussi le score que l'élève voulait partager.
 */
export function lienPartage(uid, { maintenant = Date.now(), secret = process.env.CRON_SECRET, resultat = null } = {}) {
  const exp = Math.floor((maintenant + DUREE_PARTAGE_MS) / 1000)
  const s = signatureDesabo(uid, secret, porteePartage(exp))
  if (!s) return null
  const score = scorePartage(resultat)
  return `${APP}/api/approve-consent?uid=${encodeURIComponent(uid)}&e=${exp}&s=${s}${score ? `&n=${score.score}&t=${score.total}` : ''}`
}

/** Le lien partagé est-il authentique et encore valable ? */
export function partageValide(uid, exp, s, { maintenant = Date.now(), secret = process.env.CRON_SECRET } = {}) {
  if (typeof uid !== 'string' || !UID_OK.test(uid)) return false
  const e = Number(exp)
  if (!Number.isInteger(e) || e * 1000 < maintenant || e * 1000 > maintenant + DUREE_PARTAGE_MS + JOUR_MS) return false
  return signatureValide(uid, s, secret, porteePartage(e))
}
