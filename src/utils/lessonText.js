// Limite de texte acceptée par /api/analyse (api/analyse.js refuse au-delà de
// 15 000 caractères avec TEXT_TOO_LONG — le serveur reste la source de vérité).
// Côté client, on prévient avant l'envoi : au lieu d'une erreur muette, on
// propose d'analyser le début de la leçon et de scanner la suite à part.
export const LESSON_TEXT_MAX = 15000
export const LESSON_TEXT_MAX_LABEL = '15 000'

export function isLessonTextTooLong(text) {
  return typeof text === 'string' && text.length > LESSON_TEXT_MAX
}

// Garde les `max` premiers caractères, coupés de préférence à une fin de
// paragraphe, sinon de phrase, sinon de mot — à condition que la coupure
// tombe dans les 20 % finaux de la fenêtre (sinon on perdrait trop de texte
// pour un bénéfice de forme). Sans aucun espace, coupe net.
export function truncateLessonText(text, max = LESSON_TEXT_MAX) {
  if (typeof text !== 'string' || text.length <= max) return text
  const head = text.slice(0, max)
  const floor = Math.floor(max * 0.8)
  const paragraph = head.lastIndexOf('\n')
  const sentence = Math.max(
    head.lastIndexOf('. '), head.lastIndexOf('.\n'),
    head.lastIndexOf('! '), head.lastIndexOf('? '),
  ) + 1 // on garde la ponctuation
  const word = head.lastIndexOf(' ')
  const cut = [paragraph, sentence, word].find(i => i >= floor)
  return (cut === undefined ? head : head.slice(0, cut)).trimEnd()
}
