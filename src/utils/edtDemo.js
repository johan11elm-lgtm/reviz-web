// -------------------------------------------------------
// Réviz — Emploi du temps de démonstration
// Lien caché à coller à la place du lien Pronote : l'agenda affiche une
// semaine type de 4e, générée sur l'appareil (aucun appel au serveur).
// Sert à voir l'agenda rempli sans compte Pronote (démos, captures).
// Titres et salles au format de l'export iCal de Pronote.
// -------------------------------------------------------
import { ajouterJours } from './agenda'

export const LIEN_DEMO = 'demo:reviz'

export const estLienDemo = lien => String(lien ?? '').trim().toLowerCase() === LIEN_DEMO

// [début, fin, titre Pronote, salle], du lundi (0) au vendredi (4).
const SEMAINE = [
  [
    ['08:00', '09:00', 'MATHEMATIQUES - M. LEROY', '204'],
    ['09:00', '10:00', 'FRANCAIS - MME MARTIN', '112'],
    ['10:15', '11:15', 'HISTOIRE-GEOGRAPHIE - M. MOREAU', '108'],
    ['11:15', '12:15', 'ANGLAIS LV1 - MME DUBOIS', '215'],
    ['13:30', '15:30', 'EDUCATION PHYSIQUE ET SPORTIVE - M. GARCIA', 'Gymnase'],
    ['15:45', '16:45', 'TECHNOLOGIE - M. FONTAINE', 'Atelier techno'],
  ],
  [
    ['08:00', '09:00', 'SCIENCES DE LA VIE ET DE LA TERRE - MME PETIT', 'Labo 1'],
    ['09:00', '10:00', 'MATHEMATIQUES - M. LEROY', '204'],
    ['10:15', '11:15', 'ESPAGNOL LV2 - MME LOPEZ', '217'],
    ['11:15', '12:15', 'FRANCAIS - MME MARTIN', '112'],
    ['13:30', '14:30', 'PHYSIQUE-CHIMIE - M. BERNARD', 'Labo 2'],
    ['14:30', '15:30', 'EDUCATION MUSICALE - MME ROUX', 'Salle de musique'],
    ['15:45', '16:45', 'HISTOIRE-GEOGRAPHIE - M. MOREAU', '108'],
  ],
  [
    ['08:00', '09:00', 'ANGLAIS LV1 - MME DUBOIS', '215'],
    ['09:00', '10:00', 'FRANCAIS - MME MARTIN', '112'],
    ['10:15', '11:15', 'MATHEMATIQUES - M. LEROY', '204'],
    ['11:15', '12:15', 'ARTS PLASTIQUES - MME FAURE', 'Salle d\'arts'],
  ],
  [
    ['08:00', '09:00', 'HISTOIRE-GEOGRAPHIE - M. MOREAU', '108'],
    ['09:00', '10:00', 'PHYSIQUE-CHIMIE - M. BERNARD', 'Labo 2'],
    ['10:15', '11:15', 'FRANCAIS - MME MARTIN', '112'],
    ['11:15', '12:15', 'ESPAGNOL LV2 - MME LOPEZ', '217'],
    ['13:30', '14:30', 'MATHEMATIQUES - M. LEROY', '204'],
    ['14:30', '15:30', 'SCIENCES DE LA VIE ET DE LA TERRE - MME PETIT', 'Labo 1', true],
    ['15:45', '16:45', 'VIE DE CLASSE - MME MARTIN', '112'],
  ],
  [
    ['08:00', '10:00', 'EDUCATION PHYSIQUE ET SPORTIVE - M. GARCIA', 'Gymnase'],
    ['10:15', '11:15', 'ANGLAIS LV1 - MME DUBOIS', '215'],
    ['11:15', '12:15', 'MATHEMATIQUES - M. LEROY', '204'],
    ['13:30', '14:30', 'FRANCAIS - MME MARTIN', '112'],
    ['14:30', '15:30', 'ENSEIGNEMENT MORAL ET CIVIQUE - M. MOREAU', '108'],
    ['15:45', '16:45', 'TECHNOLOGIE - M. FONTAINE', 'Atelier techno'],
  ],
]

/** Cours de la semaine type entre `du` et `au` (« AAAA-MM-JJ », `du` = un lundi). */
export function coursDemo({ du, au }) {
  const cours = []
  SEMAINE.forEach((journee, i) => {
    const jour = ajouterJours(du, i)
    if (au && jour > au) return
    for (const [debut, fin, titre, salle, annule = false] of journee) {
      cours.push({ debut: `${jour}T${debut}`, fin: `${jour}T${fin}`, titre, salle, annule })
    }
  })
  return cours
}
