// Réviz sur ordinateur : à partir de 1024 px, barre latérale et colonne
// centrale ; en dessous, rien ne change (capsule du bas). Parcours en mode
// essai, catalogue et chapitre servis par les fixtures.
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mockApiRoutes } from './helpers'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = name => readFileSync(path.join(here, 'fixtures/programme', name), 'utf8')

async function mockProgramme(page) {
  await page.route('**/programme/3eme/index.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: fixture('index.json') }))
  await page.route('**/programme/3eme/maths/theoreme-de-thales.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: fixture('thales.json') }))
}

async function entrerEnEssai(page) {
  await page.goto('/essai')
  await page.getByLabel('Ton prénom').fill('Léa')
  await page.getByRole('button', { name: '3ème', exact: true }).click()
  await page.getByRole('button', { name: /C'est parti/ }).click()
  await expect(page).toHaveURL(/\/programme$/)
}

test.describe('Ordinateur (1280 px)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('barre latérale, colonne centrale, pas de capsule du bas', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)
    await entrerEnEssai(page)

    const sideNav = page.locator('.side-nav')
    await expect(sideNav).toBeVisible()
    await expect(page.locator('.bottom-nav')).toBeHidden()
    await expect(sideNav.getByRole('link', { name: 'Mon programme' })).toBeVisible()
    await page.waitForTimeout(600)
    await page.screenshot({ path: test.info().outputPath('desktop-programme.png') })

    // La colonne de contenu reste lisible
    const box = await page.locator('.programme-content').boundingBox()
    expect(box.width).toBeLessThanOrEqual(1140)

    await page.getByRole('button', { name: /^Maths/ }).click()
    await expect(page).toHaveURL(/\/programme\/maths/)
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('desktop-programme-maths.png') })
    await page.getByRole('button', { name: /Le théorème de Thalès/ }).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: test.info().outputPath('desktop-chemin-fiche.png') })
    await page.getByRole('button', { name: /Le théorème de Thalès/ }).click()

    await page.getByRole('button', { name: /Le théorème de Thalès/ }).click()
    await page.getByRole('button', { name: /chapitre$/ }).click()
    await expect(page).toHaveURL(/\/analyse/)
    // Ouvert depuis Mon programme : c'est cette entrée qui reste allumée
    await expect(page.locator('.side-nav-item--active')).toHaveText(/Mon programme/)
    await expect(page.getByText('À retenir')).toBeVisible()
    await expect(page.getByText('Ton avancement')).toBeVisible()
    await page.waitForTimeout(700)
    await page.screenshot({ path: test.info().outputPath('desktop-analyse.png') })

    await page.getByRole('link', { name: /Quiz/ }).click()
    await expect(page.getByText('Que faut-il pour appliquer le théorème de Thalès ?')).toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('desktop-quiz.png') })

    await page.goto('/resume')
    await expect(page.getByText('Sécantes').first()).toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('desktop-resume.png') })

    await page.goto('/flashcards')
    await page.waitForTimeout(600)
    await page.screenshot({ path: test.info().outputPath('desktop-flashcards.png') })

    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Réviser mon programme' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'À reprendre' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Le théorème de Thalès/ })).toBeVisible()
    // Le mode essai n'est rappelé que dans la barre latérale
    await expect(page.locator('.guest-banner')).toBeHidden()
    await expect(page.locator('.side-nav-note')).toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('desktop-home.png') })

    await page.goto('/cours')
    await expect(page.getByText('Le théorème de Thalès').first()).toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('desktop-cours.png') })

    await page.goto('/progres')
    // Tableau de bord : le programme (une rangée par matière) et la mémoire
    await expect(page.getByRole('heading', { name: 'Mon programme' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Maths : 1 \/ \d+ commencé/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ta mémoire' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Réviser maintenant/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ton activité' })).toBeVisible()
    await page.waitForTimeout(1600)  // fin des animations d'entrée des cartes
    await page.screenshot({ path: test.info().outputPath('desktop-progres.png') })
    // « Réviser maintenant » ouvre les flashcards de la leçon la plus en retard
    await page.getByRole('button', { name: /Réviser maintenant/ }).click()
    await expect(page).toHaveURL(/\/flashcards/)

    await page.goto('/profil')
    // Tous les badges d'un coup, avec ce qu'il faut faire pour les obtenir
    await expect(page.locator('.pf-desk-badges > li')).toHaveCount(18)
    await expect(page.getByText('Prochain badge')).toBeVisible()
    await expect(page.locator('.pf-desk-badges').getByText('3 jours de suite')).toBeVisible()
    await expect(page.getByRole('link', { name: /^Battle/ })).toHaveAttribute('href', '/battle')
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('desktop-profil.png') })
  })
})

test.describe('Mobile (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('rien ne change : capsule du bas visible, pas de barre latérale', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)
    await entrerEnEssai(page)
    await expect(page.locator('.side-nav')).toBeHidden()
    await expect(page.locator('.bottom-nav')).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('mobile-programme.png') })
    await page.getByRole('button', { name: /^Maths/ }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('mobile-chemin.png') })
    await page.goto('/')
    await expect(page.locator('.home-desk')).toHaveCount(0)
    await expect(page.locator('.guest-banner')).toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('mobile-home.png') })
  })
})

test.describe('Ordinateur (1280 px) — avec un compte', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('accueil en tableau de bord, scanner en deux panneaux, cours avec rail', async ({ page }) => {
    const { signup, verifyEmailAndOnboard } = await import('./helpers')
    await mockApiRoutes(page)
    await mockProgramme(page)
    const email = await signup(page, { birthDate: '2004-03-15' })
    await verifyEmailAndOnboard(page, email)

    await expect(page.locator('.side-nav')).toBeVisible()
    await page.waitForTimeout(600)
    await page.screenshot({ path: test.info().outputPath('desktop-compte-home.png') })

    await page.goto('/scan')
    await expect(page.locator('.scan-panel--photo')).toBeVisible()
    await expect(page.locator('.scan-panel--texte')).toBeVisible()
    await expect(page.getByRole('tab', { name: /Texte/ })).toHaveCount(0)
    await page.waitForTimeout(800)
    await page.screenshot({ path: test.info().outputPath('desktop-compte-scan.png') })

    // Un chapitre ouvert, puis l'accueil et Mes cours composés avec la leçon
    await page.goto('/programme/maths')
    await page.getByRole('button', { name: /Le théorème de Thalès/ }).click()
    await page.getByRole('button', { name: /chapitre$/ }).click()
    await expect(page).toHaveURL(/\/analyse/)
    await page.goto('/')
    await page.waitForTimeout(600)
    await page.screenshot({ path: test.info().outputPath('desktop-compte-home-lecon.png') })
    await page.goto('/cours')
    await expect(page.getByText('Le théorème de Thalès').first()).toBeVisible()
    await page.waitForTimeout(1200)
    await page.screenshot({ path: test.info().outputPath('desktop-compte-cours.png') })
    // Profil d'un compte : l'aura de la Battle, et « Modifier le profil » en
    // fenêtre centrée dans la colonne (plus de feuille collée en bas)
    await page.goto('/profil')
    await expect(page.getByRole('link', { name: /^Battle : 0 aura/ })).toBeVisible()
    await page.getByRole('button', { name: 'Modifier le profil' }).click()
    const fenetre = page.getByRole('complementary', { name: 'Modifier le profil' })
    await expect(fenetre).toBeVisible()
    await page.waitForTimeout(300)
    const box = await fenetre.boundingBox()
    expect(Math.abs(box.x + box.width / 2 - (248 + (1280 - 248) / 2))).toBeLessThan(4)
    expect(box.y).toBeGreaterThan(20)
    expect(box.y + box.height).toBeLessThan(800 - 20)
    await page.screenshot({ path: test.info().outputPath('desktop-compte-profil-modifier.png') })
    await page.getByRole('button', { name: 'Fermer' }).click()
    await expect(fenetre).toBeHidden()

    await page.goto('/coach')
    await expect(page.getByText("Qu'est-ce que tu veux comprendre ?")).toBeVisible()
    await expect(page.locator('.coach-side')).toBeVisible()
    await expect(page.locator('.side-nav').getByRole('link', { name: 'Coach' })).toBeVisible()
    await page.waitForTimeout(600)
    await page.screenshot({ path: test.info().outputPath('desktop-coach.png') })
    // Une réponse simulée du coach (flux SSE comme api/chat.js)
    const reponse = "Bonne question ! Le théorème de Thalès sert à **calculer une longueur** quand deux droites parallèles coupent deux droites sécantes.\n\nPour l'utiliser :\n- vérifie que les droites sont bien **parallèles** ;\n- écris l'égalité des rapports AM/AB = AN/AC = MN/BC ;\n- fais un produit en croix.\n\nTu veux qu'on essaie sur un exemple ?"
    await page.route('**/api/chat', route => route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: ' + JSON.stringify({ meta: { remaining: 9, limit: 10 } }) + '\n\n' + 'data: ' + JSON.stringify({ text: reponse }) + '\n\ndata: [DONE]\n\n',
    }))
    await page.getByLabel('Ta question sur la leçon').fill('À quoi sert le théorème de Thalès ?')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Tu veux qu\'on essaie sur un exemple ?')).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('desktop-coach-conversation.png') })
    await page.goto('/reglages')
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('desktop-compte-reglages.png') })
  })
})
