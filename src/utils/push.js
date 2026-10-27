// -------------------------------------------------------
// Réviz — Notifications web (push) : ce que partagent l'app et le serveur
//
// L'élève active les rappels (accueil ou Réglages) ; son navigateur donne un
// abonnement que le serveur garde dans users/{uid}/push/{id}. Chaque jour à
// 17 h (cron de api/send-parental-consent.js), au plus une notification, et
// seulement s'il n'a pas encore révisé ce jour-là (api/_push.js).
// -------------------------------------------------------
import { lienChapitre } from './retour.js'
import { intituleControle } from './agenda.js'

// Clé publique VAPID (la clé privée n'existe que sur Vercel : VAPID_PRIVATE_KEY).
export const VAPID_PUBLIC_KEY = 'BFPemzHzTsZsn4Kdqqd07dWxbb2mPjNspMm0OC63KRzeF0s6QCVzU3PE3wwscPpajOfCtlQa0ZIDq3gxJuDY8rw'

// Heure du rappel, telle qu'affichée à l'élève (le cron part à 16 h UTC).
export const HEURE_RAPPEL = '17 h'

// Après ce nombre de notifications d'affilée sans que l'élève revienne, on se
// tait jusqu'à son prochain retour : un rappel ignoré trois fois n'aide plus.
export const MAX_SANS_RETOUR = 3

const APP = 'https://app.revizapp.fr'

/** Jours de suite de la partie du jour, en finissant `jusqua` (AAAA-MM-JJ). */
export function serieJusqua(jours, jusqua) {
  const set = new Set(Array.isArray(jours) ? jours : [])
  let n = 0
  let t = Date.parse(`${jusqua}T12:00:00Z`)
  while (set.has(new Date(t).toISOString().slice(0, 10))) { n++; t -= 864e5 }
  return n
}

function titreCourt(s, max = 60) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

/**
 * La notification du jour, par ordre de priorité :
 * 1. un contrôle noté pour demain ;
 * 2. la série de la partie du jour, faite hier mais pas encore aujourd'hui ;
 * 3. le dernier chapitre ouvert (quiz direct) ;
 * 4. la partie du jour.
 * Jamais de reproche ni d'urgence inventée : une proposition courte.
 * @param {{ agenda?: object, jeux?: object, lecon?: object|null, hier: string, demain: string }} p
 * @returns {{ title: string, body: string, url: string, tag: string }}
 */
export function notifDuJour({ agenda = null, jeux = null, lecon = null, hier, demain }) {
  const controle = (Array.isArray(agenda?.controles) ? agenda.controles : []).find(c => c?.date === demain)
  if (controle) {
    return {
      title: `${intituleControle(controle)} demain`,
      body: controle.titre ? `${titreCourt(controle.titre)}. Dix minutes ce soir, et c'est dans la boîte.` : 'Dix minutes de révision ce soir, et c\'est dans la boîte.',
      url: `${APP}/agenda?via=push`,
      tag: 'reviz-controle',
    }
  }
  const serie = serieJusqua(jeux?.jours, hier)
  if (serie >= 2) {
    return {
      title: `${serie} jours de suite`,
      body: 'La partie du jour t\'attend : 90 secondes pour passer à un jour de plus.',
      url: `${APP}/jeux?via=push`,
      tag: 'reviz-serie',
    }
  }
  const lien = lecon ? lienChapitre({ ...lecon, chapterId: lecon.chapterId }, 'push') : null
  const titre = lecon?.metadata?.title ?? lecon?.titre
  if (lien && titre) {
    return {
      title: 'Ton chapitre t\'attend',
      body: `${titreCourt(titre)} : cinq minutes de quiz pour vérifier que c'est resté.`,
      url: lien,
      tag: 'reviz-chapitre',
    }
  }
  return {
    title: 'La partie du jour est prête',
    body: 'Six mini-jeux de 15 secondes, la même partie pour tout le monde.',
    url: `${APP}/jeux?via=push`,
    tag: 'reviz-jeux',
  }
}
