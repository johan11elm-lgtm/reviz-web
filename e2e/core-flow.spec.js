// Parcours cœur : inscription → découverte → scan (IA mockée) → 4 formats →
// quiz complet → feedback élève. Tourne contre l'Emulator Suite Firebase, à 1280 px (barre du
// haut, deux panneaux au scan) et à 390 px (capsule du bas, « Coller le texte » en écran dédié).
import { test, expect } from '@playwright/test'
import {
  mockApiRoutes, mockProgramme, compteRapide, chapitreThales, signup, verifyEmailAndOnboard, ouvrirSaisieTexte,
  sansDebordement, estOrdinateur, jouerQuiz, MOCK_AI_RESPONSE,
} from './helpers'
// Le texte affiché passe par la typographie (insécables, « a-t-elle » insécable)
import { nbsp } from '../src/utils/typography.js'

const APPAREILS = [
  ['ordinateur', { width: 1280, height: 800 }],
  ['téléphone', { width: 390, height: 844 }],
]

test.describe('Parcours cœur : inscription → scan → révision', () => {
  for (const [appareil, viewport] of APPAREILS) {
    test(`un élève s'inscrit, vérifie son email, scanne une leçon et révise sur les 4 formats (${appareil})`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await mockApiRoutes(page)

      // ── Inscription (majeur : pas de tunnel parental) + vraie vérif d'email + découverte ──
      const email = await signup(page, { birthDate: '2004-03-15' })
      await verifyEmailAndOnboard(page, email)

      // ── Home : l'accueil est rendu (la partie du jour est une carte de l'accueil) ──
      await expect(page.locator('a[href^="/jeux"]').first()).toBeVisible()
      await sansDebordement(page, `accueil ${appareil}`)
      // L'accueil ne dit plus le prénom : il vit sur le profil (et dans le coach).
      await page.goto('/profil')
      // (Le menu du haut, caché sur téléphone, porte aussi le prénom : on regarde la page.)
      await expect(page.locator('.app').getByText('Testeur').first()).toBeVisible()

      // ── Scan en mode texte ──
      await page.goto('/scan')
      const champ = await ouvrirSaisieTexte(page)
      await champ.fill(
        'La photosynthèse est le processus par lequel les végétaux chlorophylliens '
        + 'fabriquent leur matière organique à partir de CO2, d\'eau et de lumière. '
        + 'Elle se déroule dans les chloroplastes et rejette du dioxygène.'
      )
      await page.getByRole('button', { name: /Analyser ce texte/ }).click()

      // ── Analyse : la fiche du chapitre s'affiche avec la leçon générée (IA mockée) ──
      // On attend un point clé GÉNÉRÉ (le texte brut de la leçon est visible dès l'écran de préparation).
      await expect(page).toHaveURL(/analyse/)
      await expect(page.getByText(MOCK_AI_RESPONSE.resume.keyPoints[0], { exact: true })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByRole('heading', { name: MOCK_AI_RESPONSE.metadata.title })).toBeVisible()
      await sansDebordement(page, `fiche ${appareil}`)

      // Juste après le scan, « Mes leçons » mène aux leçons scannées, pas au viseur du scan (la fiche a
      // remplacé le scan dans l'historique).
      await page.locator('.ch-retour').filter({ hasText: 'Mes leçons' }).first().click()
      await expect(page).toHaveURL(/\/cours$/)

      // ── Résumé ──
      await page.goto('/resume')
      await expect(page.getByText('Chloroplaste').first()).toBeVisible()

      // ── Flashcards : le recto de la 1ère carte est celui de la leçon ──
      await page.goto('/flashcards')
      await expect(page.getByText(nbsp(MOCK_AI_RESPONSE.flashcards[0].front)).first()).toBeVisible()

      // ── Carte mentale : les 4 branches générées sont là ──
      await page.goto('/mindmap')
      for (const branch of MOCK_AI_RESPONSE.mindmap.branches) {
        await expect(page.getByRole('button', { name: new RegExp(branch.label) })).toBeVisible()
      }
      await sansDebordement(page, `carte mentale ${appareil}`)

      // ── Quiz complet (3 questions mockées) ──
      await page.goto('/quiz')
      await jouerQuiz(page, MOCK_AI_RESPONSE.quiz)

      // ── Écran de fin : score parfait, enregistré ──
      await expect(page.getByText('Quiz terminé')).toBeVisible()
      await expect(page.getByText(/^3\s*\/\s*3$/).first()).toBeVisible()
      await expect(page.getByText(/Score enregistré/)).toBeVisible()
      await sansDebordement(page, `fin du quiz ${appareil}`)

      // ── Feedback élève (« Ce quiz t'a aidé ? ») : seulement sur l'écran de fin du téléphone ──
      if (!estOrdinateur(page)) {
        await page.getByRole('button', { name: 'Oui, utile' }).click()
        await expect(page.getByText(/Merci pour ton retour/)).toBeVisible()
      }
    })
  }

  // L'écran de fin du quiz sur ordinateur n'avait pas « Ce quiz t'a aidé ? » (bug trouvé le 23/10,
  // corrigé dans src/pages/Quiz.jsx : FormatFeedback aussi dans la colonne de droite).
  test('le feedback du quiz est aussi proposé sur ordinateur', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await mockApiRoutes(page)
    await mockProgramme(page)
    await compteRapide(page, { aller: '/programme' })
    await page.goto('/programme?matiere=maths')
    await page.getByRole('button', { name: /^Chapitre 1 : Le théorème de Thalès/ }).click()
    await page.getByRole('button', { name: /^(C'est parti|Découvrir)$/ }).click()
    await expect(page).toHaveURL(/\/analyse/)
    await page.goto('/quiz')
    await jouerQuiz(page, chapitreThales().quiz)
    // Attendu : « Ce quiz t'a aidé ? » avec « Oui, utile » puis « Merci pour ton retour ». Obtenu : rien.
    await page.getByRole('button', { name: 'Oui, utile' }).click()
    await expect(page.getByText(/Merci pour ton retour/)).toBeVisible()
  })
})
