import { describe, it, expect, vi, afterEach } from 'vitest'
import { lienPronoteValide, lireIcal, coursPronote } from '../_pronote.js'

const LIEN = 'https://0130000x.index-education.net/pronote/ical/mesinformations.ics?icalsecurise=ABC123'

describe('lienPronoteValide', () => {
  it('accepte un lien Pronote et convertit webcal://', () => {
    expect(lienPronoteValide(LIEN)).toBe(LIEN)
    expect(lienPronoteValide(LIEN.replace('https://', 'webcal://'))).toBe(LIEN)
    expect(lienPronoteValide(`  ${LIEN}  `)).toBe(LIEN)
  })

  it('refuse tout autre hôte, protocole ou chemin', () => {
    expect(lienPronoteValide('https://evil.com/pronote/ical/x.ics')).toBeNull()
    expect(lienPronoteValide('https://index-education.net.evil.com/ical/x.ics')).toBeNull()
    expect(lienPronoteValide('http://0130000x.index-education.net/pronote/ical/x.ics')).toBeNull()
    expect(lienPronoteValide('https://0130000x.index-education.net/pronote/eleve.html')).toBeNull()
    expect(lienPronoteValide('https://a:b@0130000x.index-education.net/pronote/ical/x.ics')).toBeNull()
    expect(lienPronoteValide('https://0130000x.index-education.net:8443/pronote/ical/x.ics')).toBeNull()
    expect(lienPronoteValide('pas un lien')).toBeNull()
    expect(lienPronoteValide(undefined)).toBeNull()
  })
})

const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'DTSTART;TZID=Europe/Paris:20261013T100000',
  'DTEND;TZID=Europe/Paris:20261013T110000',
  'SUMMARY:HISTOIRE-GEOGRAPHIE - MOREAU C.',
  'LOCATION:206',
  'END:VEVENT',
  'BEGIN:VEVENT',
  // Heure UTC (8 h Z = 10 h à Paris en octobre)
  'DTSTART:20261012T070000Z',
  'DTEND:20261012T080000Z',
  'SUMMARY:MATHEMATIQUES - PROFESSEUR M.\\, groupe A',
  ' (suite)',
  'LOCATION:207',
  'STATUS:CANCELLED',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'SUMMARY:Sans date',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

describe('lireIcal', () => {
  it('lit les cours, triés, en heure de Paris', () => {
    const cours = lireIcal(ICS)
    expect(cours).toHaveLength(2)
    expect(cours[0]).toEqual({
      debut: '2026-10-12T09:00',
      fin: '2026-10-12T10:00',
      titre: 'MATHEMATIQUES - PROFESSEUR M., groupe A(suite)',
      salle: '207',
      annule: true,
    })
    expect(cours[1]).toMatchObject({ debut: '2026-10-13T10:00', titre: 'HISTOIRE-GEOGRAPHIE - MOREAU C.', annule: false })
  })

  it('ne casse pas sur un fichier vide ou invalide', () => {
    expect(lireIcal('')).toEqual([])
    expect(lireIcal('<html>404</html>')).toEqual([])
  })
})

describe('coursPronote', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('filtre les cours sur la période demandée', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(ICS, { status: 200 })))
    const cours = await coursPronote(LIEN, { du: '2026-10-13', au: '2026-10-20' })
    expect(cours.map(c => c.debut)).toEqual(['2026-10-13T10:00'])
  })

  it('signale un lien expiré ou invalide', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Erreur 404</html>', { status: 200 })))
    await expect(coursPronote(LIEN)).rejects.toThrow('LIEN_EXPIRE')
    await expect(coursPronote('https://evil.com/ical/x.ics')).rejects.toThrow('LIEN_INVALIDE')
  })
})
