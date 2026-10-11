// -------------------------------------------------------
// Réviz — Emploi du temps Pronote (lien iCal de l'élève)
// Pronote n'exporte en iCal que l'emploi du temps (Mes données › Compte ›
// Export au format ICal). Le navigateur ne peut pas lire ce lien (pas de
// CORS) : /api/auth le récupère pour l'élève et renvoie des cours en JSON.
// Le lien contient un jeton secret : on ne le journalise jamais.
// -------------------------------------------------------

// Pronote est hébergé chez Index Education (<code>.index-education.net).
// Liste fermée : le serveur ne va chercher rien d'autre (pas de SSRF).
const HOTES_AUTORISES = /^[a-z0-9-]+\.index-education\.net$/i
const TAILLE_MAX = 2_000_000
const DELAI_MS = 10_000

/** Lien iCal Pronote valide, normalisé (webcal:// → https://), ou null. */
export function lienPronoteValide(brut) {
  if (typeof brut !== 'string') return null
  let url
  try {
    url = new URL(brut.trim().replace(/^webcal:\/\//i, 'https://'))
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
  if (!HOTES_AUTORISES.test(url.hostname)) return null
  if (!/\/ical\//i.test(url.pathname)) return null
  return url.toString()
}

// --- Lecture du format iCalendar (RFC 5545), juste ce qu'il faut ---

function deplier(texte) {
  // Une ligne qui commence par une espace ou une tabulation continue la précédente.
  return texte.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n')
}

function desechapper(v) {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim()
}

// Heure de Paris d'un instant UTC, au format « AAAA-MM-JJTHH:MM ».
function heureDeParis(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(x => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

// DTSTART/DTEND → heure locale de l'établissement (« AAAA-MM-JJTHH:MM »).
// Les heures en UTC (suffixe Z) sont ramenées à l'heure de Paris ; les
// heures avec TZID ou « flottantes » sont déjà locales.
function lireDate(valeur) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})\d{0,2}(Z)?)?$/.exec(valeur)
  if (!m) return null
  const [, a, mo, j, h = '00', mi = '00', z] = m
  if (z) return heureDeParis(new Date(Date.UTC(+a, +mo - 1, +j, +h, +mi)))
  return `${a}-${mo}-${j}T${h}:${mi}`
}

/**
 * Cours d'un fichier iCal, triés par début.
 * @returns {{ debut: string, fin: string, titre: string, salle: string, annule: boolean }[]}
 */
export function lireIcal(texte) {
  const cours = []
  let ev = null
  for (const ligne of deplier(String(texte))) {
    if (ligne === 'BEGIN:VEVENT') { ev = {}; continue }
    if (ligne === 'END:VEVENT') {
      if (ev?.debut && ev?.fin) {
        cours.push({
          debut: ev.debut,
          fin: ev.fin,
          titre: ev.titre ?? '',
          salle: ev.salle ?? '',
          annule: ev.annule === true,
        })
      }
      ev = null
      continue
    }
    if (!ev) continue
    const i = ligne.indexOf(':')
    if (i < 0) continue
    const nom = ligne.slice(0, i).split(';')[0].toUpperCase()
    const valeur = ligne.slice(i + 1)
    if (nom === 'DTSTART') ev.debut = lireDate(valeur)
    else if (nom === 'DTEND') ev.fin = lireDate(valeur)
    else if (nom === 'SUMMARY') ev.titre = desechapper(valeur)
    else if (nom === 'LOCATION') ev.salle = desechapper(valeur)
    else if (nom === 'STATUS') ev.annule = /CANCELLED/i.test(valeur)
  }
  return cours.sort((x, y) => x.debut.localeCompare(y.debut))
}

/** Va chercher le lien et renvoie les cours entre `du` et `au` (« AAAA-MM-JJ », inclus). */
export async function coursPronote(lien, { du, au } = {}) {
  const url = lienPronoteValide(lien)
  if (!url) throw new Error('LIEN_INVALIDE')
  const res = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(DELAI_MS),
    headers: { Accept: 'text/calendar' },
  })
  if (!res.ok) throw new Error(res.status === 404 ? 'LIEN_EXPIRE' : 'PRONOTE_INDISPONIBLE')
  const texte = await res.text()
  if (texte.length > TAILLE_MAX) throw new Error('PRONOTE_INDISPONIBLE')
  if (!texte.includes('BEGIN:VCALENDAR')) throw new Error('LIEN_EXPIRE')
  return lireIcal(texte).filter(c =>
    (!du || c.debut.slice(0, 10) >= du) && (!au || c.debut.slice(0, 10) <= au))
}
