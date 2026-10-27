// -------------------------------------------------------
// Réviz — Notifications web (push), côté app
//
// Le rappel de 17 h (api/_push.js) passe par le navigateur : l'élève l'active
// depuis l'accueil ou Réglages, le navigateur demande l'autorisation, puis
// l'abonnement part au serveur (/api/track?op=push). L'app iPhone native garde
// ses notifications locales (reminderService.js) : rien ici ne la concerne.
// Sur iPhone, Safari n'accepte les notifications que pour Réviz installée sur
// l'écran d'accueil (iOS 16.4 et plus).
// -------------------------------------------------------
import { auth } from './firebaseConfig'
import { apiFetch, IS_NATIVE } from './apiClient'
import { mesurer } from './mesure'
import { VAPID_PUBLIC_KEY } from '../utils/push'

const CLE_SYNCHRO = 'reviz-push-synchro'

function estIOS() {
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

function installee() {
  try { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true }
  catch { return false }
}

/**
 * Où en sont les notifications web sur cet appareil :
 * - 'indisponible' : app native, ou navigateur sans notifications ;
 * - 'installer'    : iPhone, Réviz pas encore sur l'écran d'accueil ;
 * - 'refusees'     : l'élève a refusé (seul le navigateur peut les rouvrir) ;
 * - 'proposables'  : pas encore demandé ;
 * - 'autorisees'   : autorisées (abonné ou à réabonner).
 */
export function etatPush() {
  if (IS_NATIVE) return 'indisponible'
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return 'indisponible'
  if (estIOS() && !installee()) return 'installer'
  if (!('PushManager' in window) || !('Notification' in window)) return 'indisponible'
  if (Notification.permission === 'denied') return 'refusees'
  if (Notification.permission === 'granted') return 'autorisees'
  return 'proposables'
}

function cleServeur() {
  const b64 = VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/')
  const brut = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(brut, c => c.charCodeAt(0))
}

async function enregistrement() {
  // Le service worker est enregistré au démarrage (main.jsx) ; on attend qu'il soit prêt.
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, rejeter) => setTimeout(() => rejeter(new Error('SW_ABSENT')), 8000)),
  ])
}

async function envoyer(corps) {
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) throw new Error('UNAUTHORIZED')
  const res = await apiFetch('/api/track?op=push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, ...corps }),
  })
  if (!res.ok) throw new Error(`API_${res.status}`)
}

/** L'abonnement de ce navigateur, créé s'il n'existe pas encore. */
async function abonnementCourant() {
  const reg = await enregistrement()
  return (await reg.pushManager.getSubscription())
    ?? reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleServeur() })
}

/**
 * Active le rappel de 17 h : demande l'autorisation si besoin, abonne le
 * navigateur et prévient le serveur.
 * @param {string} [emplacement]  d'où vient la demande, pour la mesure ('accueil', 'reglages')
 * @returns {Promise<{ ok: boolean, raison?: 'refusees'|'installer'|'indisponible'|'erreur' }>}
 */
export async function activerPush(emplacement = 'reglages') {
  const etat = etatPush()
  if (etat === 'indisponible' || etat === 'installer' || etat === 'refusees') return { ok: false, raison: etat }
  try {
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (permission !== 'granted') {
      mesurer('push_refusees', { emplacement })
      return { ok: false, raison: 'refusees' }
    }
    const abonnement = await abonnementCourant()
    await envoyer({ abonnement: abonnement.toJSON() })
    try { localStorage.setItem(CLE_SYNCHRO, new Date().toISOString().slice(0, 10)) } catch { /* rien */ }
    mesurer('push_activees', { emplacement })
    return { ok: true }
  } catch {
    return { ok: false, raison: 'erreur' }
  }
}

/** Coupe le rappel sur ce navigateur (abonnement retiré des deux côtés). */
export async function desactiverPush() {
  try {
    const reg = await enregistrement()
    const abonnement = await reg.pushManager.getSubscription()
    if (!abonnement) return
    await envoyer({ endpoint: abonnement.endpoint, retirer: true }).catch(() => {})
    await abonnement.unsubscribe()
  } catch { /* rien à retirer */ }
}

/** Le rappel est-il actif sur ce navigateur ? */
export async function pushActif() {
  if (etatPush() !== 'autorisees') return false
  try { return !!(await (await enregistrement()).pushManager.getSubscription()) }
  catch { return false }
}

/**
 * À l'ouverture de l'app, une fois par jour : renvoie l'abonnement au serveur
 * (le navigateur peut le renouveler sans prévenir). Jamais de demande ici.
 */
export async function resynchroniserPush() {
  if (etatPush() !== 'autorisees' || !auth.currentUser || auth.currentUser.isAnonymous) return
  const jour = new Date().toISOString().slice(0, 10)
  try { if (localStorage.getItem(CLE_SYNCHRO) === jour) return } catch { return }
  try {
    const abonnement = await (await enregistrement()).pushManager.getSubscription()
    if (!abonnement) return
    await envoyer({ abonnement: abonnement.toJSON() })
    localStorage.setItem(CLE_SYNCHRO, jour)
  } catch { /* on réessaiera à la prochaine ouverture */ }
}
