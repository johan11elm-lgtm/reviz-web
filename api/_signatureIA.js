// -------------------------------------------------------
// Réviz — Signature des réponses de Réviz IA (12/11)
//
// Le partage d'une conversation (api/_partageChat.js) publie ce que l'app envoie. Pour que personne
// ne fasse « dire » n'importe quoi à Réviz IA sur une page publique, api/chat.js signe chaque
// réponse à la fin du flux ({ sig }) ; l'app la garde avec le message, et le partage ne publie
// que les réponses dont la signature correspond (au texte et à l'élève).
// -------------------------------------------------------
import { createHmac, timingSafeEqual } from 'node:crypto'

/** Le texte tel qu'on le signe : sans espaces de bord, blancs fusionnés (l'app ne le retouche pas, mais par prudence). */
const normaliser = texte => String(texte ?? '').trim().replace(/\s+/g, ' ')

export function signerReponse(uid, texte, secret = process.env.CRON_SECRET) {
  if (!secret || !uid) return null
  return createHmac('sha256', secret).update(`reponse-ia:${uid}:${normaliser(texte)}`).digest('base64url')
}

export function reponseSignee(uid, texte, sig, secret = process.env.CRON_SECRET) {
  const attendu = signerReponse(uid, texte, secret)
  if (!attendu || typeof sig !== 'string' || sig.length !== attendu.length) return false
  return timingSafeEqual(Buffer.from(sig), Buffer.from(attendu))
}
