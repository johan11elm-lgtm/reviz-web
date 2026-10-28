// Les nouveautés du 28/10 (comparatif Nomad, priorité 1) : le plan de révision d'un contrôle,
// le simulateur de notes du brevet et l'espace parent. Téléphone et ordinateur.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, entrerEnEssai, sansDebordement } from './helpers'

const APPAREILS = [
  ['ordinateur', { width: 1280, height: 800 }],
  ['téléphone', { width: 390, height: 844 }],
]
const jour = n => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

for (const [appareil, viewport] of APPAREILS) {
  test.describe(`Nouveautés (${appareil})`, () => {
    test.use({ viewport })

    test('un contrôle noté a son plan de révision, sur l’agenda et l’accueil', async ({ page }) => {
      await mockApiRoutes(page)
      await mockProgramme(page)
      await entrerEnEssai(page, { aller: null })
      // Contrôle de maths dans 6 jours, noté aujourd'hui : flashcards demain (J-5).
      await page.evaluate(({ date, cree }) => {
        const g = JSON.parse(localStorage.getItem('reviz-guest'))
        localStorage.setItem(`reviz-agenda-${g.uid}`, JSON.stringify({ pronote: null, controles: [{ id: 'c1', matiere: 'maths', titre: 'Thalès', date, cree }], planOffert: 'c1' }))
      }, { date: jour(6), cree: jour(0) })
      await page.goto('/agenda')
      const plan = page.getByRole('region', { name: /^Plan de révision : En bonne voie$/ })
      await expect(plan).toBeVisible()
      await expect(plan.getByText('Flashcards')).toBeVisible()
      await expect(plan.getByText('Quiz sur les points ratés')).toBeVisible()
      await expect(plan.getByText('Contrôle blanc')).toBeVisible()
      await expect(plan.getByText(/^Demain/)).toBeVisible()
      await sansDebordement(page, `agenda ${appareil}`)

      // L'accueil suit le plan : « Ton plan pour … » et un raccourci vers lui.
      await page.goto('/')
      await expect(page.getByRole('heading', { name: /^Ton plan pour/ })).toBeVisible()
      await expect(page.getByRole('group', { name: 'Démarre en un clic' }).getByRole('button', { name: /Mon plan de révision|Contrôle de maths/ })).toBeVisible()
    })

    test('le simulateur du brevet calcule la note, la mention et ce qu’il faut aux épreuves', async ({ page }) => {
      await mockApiRoutes(page)
      await mockProgramme(page)
      await entrerEnEssai(page, { aller: null })
      await page.getByRole('link', { name: /Simule ta note/ }).click()
      await expect(page).toHaveURL(/\/simulateur-brevet$/)
      await page.getByLabel('Ta moyenne générale de 3e').fill('13')
      const resultat = page.locator('.sb-resultat')
      await expect(resultat.getByText('Avoir le brevet')).toBeVisible()
      await expect(resultat).toContainText('8 / 20')
      await expect(resultat).toContainText('14,7 / 20')
      for (const [l, v] of [['Français', '11'], ['Mathématiques', '14,5'], ['Histoire-géographie', '12'], ['Enseignement moral et civique', '15'], ['Sciences', '9'], ['Oral', '16']]) {
        await page.getByLabel(l, { exact: true }).fill(v)
      }
      await expect(resultat).toContainText('12,8')
      await expect(resultat).toContainText('Assez bien')
      await sansDebordement(page, `simulateur ${appareil}`)
    })

    test('l’espace parent montre les révisions, sans les notes ; un lien expiré le dit', async ({ page }) => {
      await page.route('**/api/track?op=parent*', route => {
        const t = new URL(route.request().url()).searchParams.get('t')
        if (t !== 'bon') return route.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"LIEN_INVALIDE"}' })
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          prenom: 'Léa', classe: '3ème', depuis: jour(-30), jours: [jour(-1), jour(-2)], joursRevision: 2, quizTermines: 1, parties: 0,
          chapitres: [{ titre: 'Le théorème de Thalès', matiere: 'Maths', formats: ['quiz', 'flashcards'], quizTermine: true, derniere: Date.now() }],
          controles: [{ matiere: 'Maths', titre: 'Thalès', date: jour(4), etat: 'En bonne voie', etapesFaites: 1, etapes: 3 }],
          revizPlus: false,
        }) })
      })
      const exp = Math.floor(Date.now() / 1000) + 86400
      await page.goto(`/parent?u=abcdefghij1234&e=${exp}&t=bon`)
      await expect(page.getByRole('heading', { name: 'Les révisions de Léa', level: 1 })).toBeVisible()
      await expect(page.getByText('Le théorème de Thalès')).toBeVisible()
      await expect(page.getByText('En bonne voie')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Voir l’offre' })).toBeVisible()
      await sansDebordement(page, `espace parent ${appareil}`)

      await page.goto(`/parent?u=abcdefghij1234&e=${exp}&t=mauvais`)
      await expect(page.getByRole('heading', { name: 'Ce lien n’est plus valable' })).toBeVisible()
    })
  })
}
