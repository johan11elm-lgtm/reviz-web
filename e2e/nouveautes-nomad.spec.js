// Les nouveautés du 28/10 (comparatif Nomad, priorité 1) : le plan de révision d'un contrôle,
// le simulateur de notes du brevet et l'espace parent. Téléphone et ordinateur.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, entrerEnEssai, sansDebordement, compteRapide, lireProfilEmulateur, ouvrirChapitreDuProgramme, chapitreThales, jouerQuiz } from './helpers'
import { jourEnClair } from '../src/utils/agenda.js'

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

    test('l’élève coupe l’espace parent et ses liens ; le parent voit que l’accès est en pause', async ({ page }) => {
      await mockApiRoutes(page)
      const { uid } = await compteRapide(page, { prenom: 'Léa', aller: '/reglages' })
      const carte = page.getByRole('region', { name: 'Espace parent' })
      const inter = carte.getByRole('checkbox', { name: 'Laisser mes parents voir mes révisions' })
      await inter.evaluate(el => el.scrollIntoView({ block: 'center' }))
      await expect(inter).toBeChecked()
      await inter.click({ force: true })
      await expect(inter).not.toBeChecked()
      await expect.poll(async () => (await lireProfilEmulateur(uid))?.espaceParent).toBe(false)
      await carte.getByRole('button', { name: 'Couper les liens déjà envoyés' }).click()
      await expect(carte.getByText('Les liens déjà envoyés ne s’ouvrent plus.', { exact: false })).toBeVisible()
      await expect.poll(async () => (await lireProfilEmulateur(uid))?.espaceParentVersion).toBe(1)
      await sansDebordement(page, `réglages ${appareil}`)

      // Côté parent : le serveur répond « coupé »
      await page.route('**/api/track?op=parent*', route => route.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"LIEN_COUPE"}' }))
      await page.goto(`/parent?u=abcdefghij1234&e=${Math.floor(Date.now() / 1000) + 86400}&v=0&t=x`)
      await expect(page.getByRole('heading', { name: 'L’accès est en pause' })).toBeVisible()
    })

    test('les erreurs d’un quiz se refont seules, puis disparaissent', async ({ page }) => {
      await mockApiRoutes(page)
      await mockProgramme(page)
      await entrerEnEssai(page)
      await ouvrirChapitreDuProgramme(page)
      const quiz = chapitreThales().quiz
      await page.goto('/quiz')
      await jouerQuiz(page, quiz, { bonnes: quiz.length - 2 })
      await page.getByRole('button', { name: 'Refaire mes erreurs' }).click()
      // Seulement les deux questions ratées
      await expect(page.getByText(/Question 1 sur 2/)).toBeVisible()
      await jouerQuiz(page, quiz.slice(-2))
      await expect(page.getByRole('button', { name: 'Refaire le quiz' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Refaire mes erreurs' })).toHaveCount(0)
    })

    test('le contrôle blanc : sujet chronométré, note sur 20, corrigé, étape J-1 cochée', async ({ page }) => {
      await mockApiRoutes(page)
      await mockProgramme(page)
      await entrerEnEssai(page)
      await ouvrirChapitreDuProgramme(page)
      const quiz = chapitreThales().quiz
      // Contrôle de maths demain : le contrôle blanc (J-1), c'est aujourd'hui.
      await page.evaluate(({ date, cree }) => {
        const g = JSON.parse(localStorage.getItem('reviz-guest'))
        localStorage.setItem(`reviz-agenda-${g.uid}`, JSON.stringify({ pronote: null, controles: [{ id: 'c1', matiere: 'maths', titre: 'Thalès', date, cree }], planOffert: 'c1' }))
      }, { date: jour(1), cree: jour(0) })
      await page.goto('/agenda')
      const plan = page.getByRole('region', { name: /^Plan de révision/ })
      await plan.locator('.pr-etape', { hasText: 'Contrôle blanc' }).getByRole('button', { name: 'C’est parti' }).click()
      await expect(page).toHaveURL(/\/controle\?c=c1$/)

      // Le sujet : les questions du chapitre ouvert, une minute chacune.
      await expect(page.getByRole('heading', { level: 1, name: 'Maths · Thalès' })).toBeVisible()
      await expect(page.getByText(`${quiz.length} questions`)).toBeVisible()
      await expect(page.getByText(`${quiz.length} minutes`)).toBeVisible()
      await sansDebordement(page, `sujet du contrôle blanc ${appareil}`)
      await page.getByRole('button', { name: /Commencer le contrôle/ }).click()
      await expect(page.getByRole('timer')).toBeVisible()

      // L'épreuve, sans correction : deux erreurs, puis la copie rendue.
      const plat = t => String(t).replace(/[\s\u00a0\u202f]+/g, ' ').trim()
      for (let i = 0; i < quiz.length; i++) {
        const enonce = plat(await page.locator('.qz-question').innerText())
        const q = quiz.find(x => plat(x.question) === enonce)
        expect(q, `question « ${enonce} »`).toBeTruthy()
        const voulue = i < quiz.length - 2 ? q.correct : (q.correct + 1) % q.choices.length
        await page.getByRole('radio').nth(voulue).click()
        await expect(page.getByRole('radio').nth(voulue)).toHaveAttribute('aria-checked', 'true')
        await expect(page.locator('.qz-correction')).toHaveCount(0)
        await page.getByRole('button', { name: i < quiz.length - 1 ? /Suivante/ : 'Rendre ma copie' }).click()
      }
      const note = String(Math.round(((quiz.length - 2) / quiz.length) * 40) / 2).replace('.', ',')
      await expect(page.getByRole('region', { name: `Ta note : ${note} sur 20` })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Le corrigé' })).toBeVisible()
      await expect(page.locator('.cb-question')).toHaveCount(quiz.length)
      await expect(page.locator('.cb-question.is-faux')).toHaveCount(2)
      await sansDebordement(page, `note du contrôle blanc ${appareil}`)

      // Les deux erreurs attendent dans « Refaire mes erreurs », et l'étape J-1 est cochée.
      await page.getByRole('button', { name: 'Refaire mes erreurs' }).click()
      await expect(page).toHaveURL(/\/quiz\?erreurs=1$/)
      await expect(page.getByText(/Question 1 sur 2/)).toBeVisible()
      await page.goto('/agenda')
      await expect(plan.locator('.pr-etape--faite', { hasText: 'Contrôle blanc' })).toBeVisible()
    })

    test('noter un contrôle avec ses chapitres : le contrôle blanc et « Réviser » portent dessus', async ({ page }) => {
      await mockApiRoutes(page)
      await mockProgramme(page)
      await entrerEnEssai(page, { aller: null })
      const quiz = chapitreThales().quiz
      await page.goto('/agenda')
      await page.getByRole('button', { name: 'Ajouter un contrôle' }).first().click()
      const feuille = page.getByRole('dialog', { name: 'Ajouter un contrôle' })
      // L'étape des chapitres se voit avant même le choix de la matière.
      await expect(feuille.getByText(/Choisis la matière : ses chapitres s’affichent ici/)).toBeVisible()
      await feuille.getByRole('button', { name: 'Maths', exact: true }).click()
      // Les chapitres de la matière, à cocher : Thalès, jamais ouvert.
      const thales = feuille.getByRole('checkbox', { name: 'Le théorème de Thalès' })
      await thales.click()
      await expect(thales).toHaveAttribute('aria-checked', 'true')
      if (viewport.width >= 1024) await feuille.getByRole('button', { name: jourEnClair(jour(1)), exact: true }).click()
      else await feuille.getByRole('button', { name: /^Demain/ }).click()
      await sansDebordement(page, `ajout d’un contrôle ${appareil}`)
      await feuille.getByRole('button', { name: 'Ajouter', exact: true }).click()

      // Sans intitulé, le contrôle prend le nom du chapitre ; le chapitre est sur sa carte.
      await expect(page.getByText('Maths · Le théorème de Thalès')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Le théorème de Thalès', exact: true })).toBeVisible()

      // Le contrôle blanc porte sur le chapitre coché, même jamais ouvert.
      await page.getByRole('button', { name: 'Contrôle blanc', exact: true }).click()
      await expect(page).toHaveURL(/\/controle\?c=/)
      await expect(page.getByText(`${quiz.length} questions`)).toBeVisible()
      await expect(page.getByText('sur 1 chapitre du contrôle')).toBeVisible()

      // « Réviser » ouvre la fiche du chapitre du contrôle.
      await page.goto('/agenda')
      await page.getByRole('button', { name: /^Réviser/ }).click()
      await expect(page).toHaveURL(/\/analyse/)
      await expect(page.getByRole('heading', { level: 1, name: 'Le théorème de Thalès' })).toBeVisible()
    })

    test('le mode dyslexie change la police des écrans de lecture, et reste choisi', async ({ page }) => {
      await mockApiRoutes(page)
      await mockProgramme(page)
      await entrerEnEssai(page, { aller: '/reglages' })
      const inter = page.getByRole('checkbox', { name: 'Activer le mode dyslexie' })
      await inter.evaluate(el => el.scrollIntoView({ block: 'center' }))
      await inter.click({ force: true })
      await expect(page.locator('html')).toHaveClass(/lecture-dys/)
      await page.reload()
      await expect(page.locator('html')).toHaveClass(/lecture-dys/)
    })
  })
}
