// Mode dyslexie (comme l'option d'accessibilité de Nomad) : police OpenDyslexic (public/fonts,
// licence OFL) et plus d'espace sur les écrans où l'on lit (fiche, résumé, quiz, flashcards,
// Réviz IA). Préférence de l'appareil, posée en classe sur <html> (styles/global.css).
const CLE = 'reviz-lecture-dys'

export function lectureDysActive() {
  try { return localStorage.getItem(CLE) === '1' } catch { return false }
}

export function appliquerLecture(actif) {
  try { actif ? localStorage.setItem(CLE, '1') : localStorage.removeItem(CLE) } catch { /* stockage indispo */ }
  document.documentElement.classList.toggle('lecture-dys', actif)
}
