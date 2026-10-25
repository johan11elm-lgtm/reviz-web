// « Mon programme » : réviser sans scan, en mode essai (prénom + classe) et avec un compte.
// Le catalogue et le chapitre viennent de fixtures servies par Playwright : le parcours ne dépend
// pas des contenus générés dans public/. Chaque parcours tourne à 1280 px (barre du haut) et à
// 390 px (capsule du bas) quand l'écran change de composition.
import { test, expect } from '@playwright/test'
import {
  mockApiRoutes, mockProgramme, compteRapide, entrerEnEssai, ouvrirChapitreDuProgramme,
  jouerQuiz, chapitreThales, lireLeconsEmulateur, lireRevisionsEmulateur, lireProfilEmulateur, sansDebordement, estOrdinateur, fermerAnnonceBattle,
} from './helpers'

const APPAREILS = [
  ['ordinateur', { width: 1280, height: 800 }],
  ['téléphone', { width: 390, height: 844 }],
]

/** Le rappel du mode essai : un bandeau sur téléphone, le lien « Créer mon compte » du menu du haut sur ordinateur. */
async function verifierModeEssai(page) {
  if (estOrdinateur(page)) await expect(page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Créer mon compte' })).toBeVisible()
  else await expect(page.getByRole('status').getByText('Mode essai')).toBeVisible()
}

test.describe('Mon programme', () => {
  for (const [appareil, viewport] of APPAREILS) {
    test(`mode essai : prénom + classe, puis un chapitre de 3e révisé sans compte (${appareil})`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await mockApiRoutes(page)
      await mockProgramme(page)

      // ── Welcome → essai ──
      await page.goto('/welcome')
      await page.getByRole('link', { name: 'Essayer sans compte' }).first().click()
      await expect(page).toHaveURL(/\/essai/)
      await page.getByLabel('Ton prénom').fill('Léa')
      await page.getByRole('radio', { name: '3e', exact: true }).click()
      await page.getByRole('button', { name: /C'est parti/ }).click()

      // ── Programme : matières, rappel du mode essai ──
      await expect(page).toHaveURL(/\/programme$/)
      await expect(page.getByRole('heading', { name: 'Programme', level: 1 })).toBeVisible()
      await verifierModeEssai(page)
      const maths = page.getByRole('radio', { name: /^Maths/ })
      await expect(maths).toBeVisible()
      await expect(maths).toHaveAttribute('aria-checked', 'true') // la première matière est ouverte
      await sansDebordement(page, `programme ${appareil}`)
      await page.screenshot({ path: test.info().outputPath('programme.png') })

      // ── Autre matière puis retour à Maths : les chapitres suivent la matière choisie ──
      await page.getByRole('radio', { name: /^Français/ }).click()
      await expect(page.getByRole('heading', { name: /^Chapitres · Français/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /^Chapitre 1 : L'argumentation/ })).toBeVisible()
      await page.getByRole('radio', { name: /^Maths/ }).click()
      await expect(page.getByRole('heading', { name: /^Chapitres · Maths/ })).toBeVisible()

      // ── Chapitres de maths : un prêt, un « Bientôt » ──
      const trigo = page.getByRole('button', { name: /^Chapitre 2 : Trigonométrie, à venir/ })
      await trigo.evaluate(el => el.scrollIntoView({ block: 'center' }))
      await trigo.click()
      await expect(page.getByRole('heading', { name: 'Trigonométrie', level: 3 })).toBeVisible()
      await expect(page.getByText('Ce chapitre arrive bientôt.')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Bientôt' })).toBeDisabled()
      await page.screenshot({ path: test.info().outputPath('programme-maths.png') })

      // ── Ouvrir un chapitre = la fiche du chapitre, sans Réviz IA en mode essai ──
      await ouvrirChapitreDuProgramme(page)
      await expect(page.getByRole('heading', { name: 'L’essentiel' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Le théorème de Thalès', level: 1 })).toBeVisible()
      const quiz = page.getByRole('link', { name: /^Quiz corrigé/ })
      await expect(quiz).toBeVisible()
      await expect(page.locator('a[href^="/coach"]')).toHaveCount(0)
      await sansDebordement(page, `fiche du chapitre ${appareil}`)
      await page.screenshot({ path: test.info().outputPath('analyse-chapitre.png') })

      // ── Le quiz tourne sur le contenu du chapitre ──
      await quiz.evaluate(el => el.scrollIntoView({ block: 'center' }))
      await quiz.click()
      await expect(page).toHaveURL(/\/quiz/)
      await expect(page.getByRole('heading', { name: 'Que faut-il pour appliquer le théorème de Thalès ?' })).toBeVisible()

      // ── Accueil : le rappel du mode essai, les matières du programme ; le chapitre devient « en cours » ──
      await page.goto('/')
      await expect(page.getByRole('status').getByText('Mode essai')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Maths', exact: true })).toHaveAttribute('href', '/programme?matiere=maths')
      await page.goto('/programme?matiere=maths')
      await expect(page.getByRole('button', { name: /^Chapitre 1 : Le théorème de Thalès, en cours/ })).toBeVisible()

      // ── Le scan demande un compte ──
      await page.goto('/scan')
      await expect(page.getByRole('heading', { name: 'Garde tes leçons' })).toBeVisible()
      await page.screenshot({ path: test.info().outputPath('scan-mode-essai.png') })

      // ── L'inscription repart avec le prénom de l'essai ──
      await page.getByRole('button', { name: /Créer mon compte/ }).first().click()
      await expect(page).toHaveURL(/\/inscription/)
      await expect(page.getByLabel('Ton prénom')).toHaveValue('Léa')
    })

    test(`avec un compte : entrée depuis l’accueil, le chapitre reste dans le programme (${appareil})`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await mockApiRoutes(page)
      await mockProgramme(page)
      const { uid } = await compteRapide(page)

      // Accueil : « Tes matières » → « Tout voir » mène au programme.
      await page.getByRole('link', { name: 'Tout voir' }).click()
      await expect(page).toHaveURL(/\/programme$/)
      await expect(page.getByRole('status').getByText('Mode essai')).toHaveCount(0)
      await expect(page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Créer mon compte' })).toHaveCount(0)

      await ouvrirChapitreDuProgramme(page)
      await expect(page.getByRole('heading', { name: 'Le théorème de Thalès', level: 1 })).toBeVisible()
      // Avec un compte, Réviz IA répond sur le chapitre.
      if (estOrdinateur(page)) await expect(page.getByRole('heading', { name: 'Une question ?' })).toBeVisible()
      else await expect(page.getByRole('link', { name: /Poser une question à Réviz IA/ })).toBeVisible()

      // La synchro Firestore ne doit pas écraser le chapitre qui vient d'être ouvert : il est bien
      // rangé sur le compte, et l'accueil (qui relit les leçons du compte) ne le fait pas disparaître.
      await expect.poll(() => lireLeconsEmulateur(uid), { timeout: 10_000 }).toContain('prog-theoreme-de-thales')
      await page.goto('/')
      await expect(page.locator('a[href^="/jeux"]').first()).toBeVisible()
      await page.goto('/programme?matiere=maths')
      await expect(page.getByRole('button', { name: /^Chapitre 1 : Le théorème de Thalès, en cours/ })).toBeVisible()
      expect(await lireLeconsEmulateur(uid)).toContain('prog-theoreme-de-thales')

      // « Mes leçons » ne garde que les leçons scannées : le chapitre du programme n'y est pas.
      await page.goto('/cours')
      await expect(page.getByText('Ce que Réviz prépare')).toBeVisible()
      await expect(page.getByText('Le théorème de Thalès')).toHaveCount(0)
      await sansDebordement(page, `cours ${appareil}`)
      await page.screenshot({ path: test.info().outputPath('cours-sans-scan.png') })
    })

    // Le parcours demandé de bout en bout : programme → matière → chapitre → fiche → quiz → fin.
    test(`programme → matière → chapitre → fiche → quiz du chapitre joué jusqu’à la fin (${appareil})`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await mockApiRoutes(page)
      await mockProgramme(page)
      const { uid } = await compteRapide(page, { aller: '/programme' })

      await expect(page.getByRole('heading', { name: 'Programme', level: 1 })).toBeVisible()
      await sansDebordement(page, `programme ${appareil}`)
      if (estOrdinateur(page)) {
        await expect(page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Programme' })).toBeVisible()
        await expect(page.locator('.bottom-nav')).toBeHidden()
      } else {
        await expect(page.locator('.bottom-nav')).toBeVisible()
      }

      // Matière → chapitre → fiche du chapitre
      await page.getByRole('radio', { name: /^Maths/ }).click()
      await expect(page.getByRole('heading', { name: /^Chapitres · Maths/ })).toBeVisible()
      await ouvrirChapitreDuProgramme(page)
      await expect(page.getByRole('heading', { name: 'Le théorème de Thalès', level: 1 })).toBeVisible()
      await expect(page.getByText('À découvrir')).toBeVisible()
      await sansDebordement(page, `fiche du chapitre ${appareil}`)

      // Quiz du chapitre, joué jusqu'à l'écran de fin (une erreur, pour voir « À revoir »)
      const quiz = chapitreThales().quiz
      await page.goto('/quiz')
      await sansDebordement(page, `quiz ${appareil}`)
      await jouerQuiz(page, quiz, { bonnes: quiz.length - 1 })
      await expect(page.getByText(new RegExp(`^${quiz.length - 1}\\s*/\\s*${quiz.length}$`)).first()).toBeVisible()
      await expect(page.getByText(/Score enregistré/)).toBeVisible()
      await expect(page.getByRole('heading', { name: 'À revoir' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Refaire le quiz' })).toBeVisible()
      await sansDebordement(page, `fin du quiz ${appareil}`)
      await page.screenshot({ path: test.info().outputPath('quiz-fin.png') })

      // Sur le compte : la révision du quiz, terminée, avec son chapitre, et la première session notée
      // pour le rappel du lendemain.
      await expect.poll(() => lireRevisionsEmulateur(uid), { timeout: 10_000 }).toContainEqual(['quiz', 'theoreme-de-thales', 'programme', true])
      await expect.poll(async () => {
        const p = await lireProfilEmulateur(uid)
        return { chapitre: p?.premiereSession?.chapterId, derniere: !!p?.derniereRevisionAt }
      }, { timeout: 10_000 }).toEqual({ chapitre: 'theoreme-de-thales', derniere: true })

      // De retour sur la fiche du chapitre : le score est inscrit au parcours
      await page.getByRole('button', { name: 'Retour au chapitre' }).click()
      await expect(page).toHaveURL(/\/analyse/)
      await expect(page.getByRole('link', { name: new RegExp(`^Quiz corrigé : ${quiz.length - 1} / ${quiz.length}`) })).toBeVisible()
    })
  }
})

// La fiche d'un chapitre n'a plus de flèche « Retour » dans Programme : on remonte par la capsule
// du bas, le bouton « Programme » de la fiche et l'historique du navigateur.
test.describe('Téléphone (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('le retour depuis une matière puis une fiche remonte jusqu’à l’accueil sans boucler', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)
    await entrerEnEssai(page)
    await page.goto('/')
    await fermerAnnonceBattle(page)
    await page.getByRole('link', { name: 'Tout voir' }).click()
    await expect(page).toHaveURL(/\/programme$/)
    // Changer de matière ne pousse rien dans l'historique
    await page.getByRole('radio', { name: /^Français/ }).click()
    await page.getByRole('radio', { name: /^Maths/ }).click()
    // Fiche du chapitre → bouton « Programme » de la fiche → programme
    await ouvrirChapitreDuProgramme(page)
    await page.getByRole('button', { name: 'Programme', exact: true }).click()
    await expect(page).toHaveURL(/\/programme$/)
    // Le bouton « Programme » de la fiche revient en arrière dans l'historique (il ne l'allonge pas) :
    // le retour du navigateur ne boucle donc pas sur la fiche, il remonte directement à l'accueil.
    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    // La capsule du bas revient au programme et à l'accueil
    await page.locator('.bottom-nav').getByRole('link', { name: 'Programme' }).click()
    await expect(page).toHaveURL(/\/programme$/)
    await page.locator('.bottom-nav').getByRole('link', { name: "Aujourd'hui" }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('la fiche et ses exercices ne se renvoient pas l’élève : exercice → fermer → fiche → Programme', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)
    await entrerEnEssai(page)
    // Pour chaque exercice : la case du parcours, puis son bouton de fermeture.
    for (const [exercice, url, fermer] of [
      [/^Quiz corrigé/, /\/quiz$/, page.getByRole('button', { name: 'Fermer' })],
      [/^Flashcards/, /\/flashcards$/, page.getByRole('button', { name: 'Fermer' })],
      [/^Résumé/, /\/resume$/, page.locator('.rs-retour')],
    ]) {
      await ouvrirChapitreDuProgramme(page)
      await page.getByRole('link', { name: exercice }).first().click()
      await expect(page).toHaveURL(url)
      await fermer.first().click()
      await expect(page).toHaveURL(/\/analyse/)
      // « Programme » revient d'un cran : le programme, et non l'exercice qu'on vient de fermer.
      await page.getByRole('button', { name: 'Programme', exact: true }).click()
      await expect(page).toHaveURL(/\/programme/)
    }
  })

  test('un essai déjà commencé ne repart pas de zéro en repassant par la bienvenue', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)
    await entrerEnEssai(page, { prenom: 'Inès' })
    const essai = await page.evaluate(() => JSON.parse(localStorage.getItem('reviz-guest')).uid)
    // Retour depuis « J'ai déjà un compte », ou lien « Essayer sans compte » : on reprend l'essai.
    await page.goto('/welcome')
    await expect(page).not.toHaveURL(/\/welcome/)
    await page.goto('/essai')
    await expect(page).toHaveURL(/\/programme/)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('reviz-guest')))).toMatchObject({ uid: essai, prenom: 'Inès' })
  })

  test('le détail d’un chapitre reste dans l’écran, de chaque côté du zigzag', async ({ page }) => {
    await mockApiRoutes(page)
    // Huit chapitres prêts : toutes les positions du zigzag.
    const index = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('./fixtures/programme/index.json', import.meta.url), 'utf8'))
    const maths = index.matieres.find(m => m.slug === 'maths')
    maths.chapitres = Array.from({ length: 8 }, (_, i) => ({
      ...maths.chapitres[0], id: `chapitre-${i + 1}`, titre: `Chapitre de test numéro ${i + 1}`, ordre: i + 1,
    }))
    await page.route('**/programme/3eme/index.json', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(index) }))
    await entrerEnEssai(page)
    await page.getByRole('radio', { name: /^Maths/ }).click()
    await expect(page.getByRole('heading', { name: /^Chapitres · Maths/ })).toBeVisible()

    for (let i = 1; i <= 8; i++) {
      const etape = page.getByRole('button', { name: new RegExp(`^Chapitre ${i} : `) })
      // Rond centré à l'écran : caché sous la barre d'onglets, Playwright le recentrerait aussi à
      // l'horizontale (le halo rend .app défilable) et décalerait toute la page, ce qui fausserait la mesure.
      await etape.evaluate(el => el.scrollIntoView({ block: 'center' }))
      await etape.click()
      const titre = page.getByRole('heading', { name: `Chapitre de test numéro ${i}`, level: 3 })
      await expect(titre).toBeVisible()
      const action = page.getByRole('button', { name: /^(C'est parti|Découvrir)$/ })
      for (const [nom, el] of [['titre', titre], ['bouton', action]]) {
        const box = await el.boundingBox()
        expect(box.x, `chapitre ${i}, ${nom}, bord gauche`).toBeGreaterThanOrEqual(16)
        expect(box.x + box.width, `chapitre ${i}, ${nom}, bord droit`).toBeLessThanOrEqual(390 - 16)
      }
      // La case choisie est à l'écran (la route défile : son bord peut dépasser de quelques pixels,
      // pas son centre), et la page ne défile pas de côté.
      const caseBox = await etape.boundingBox()
      expect(caseBox.x + caseBox.width / 2, `chapitre ${i}, centre de la case`).toBeGreaterThan(0)
      expect(caseBox.x + caseBox.width / 2, `chapitre ${i}, centre de la case`).toBeLessThan(390)
      await sansDebordement(page, `chapitre ${i}`)
    }
  })
})
