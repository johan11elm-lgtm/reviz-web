// Réviz sur ordinateur : à partir de 1024 px, le menu passe en haut (capsule en verre + bouton
// Réviz IA rond) et chaque page se compose pour la largeur ; en dessous, la capsule du bas.
// Parcours en mode essai (catalogue et chapitre servis par les fixtures), puis avec un compte.
import { test, expect } from '@playwright/test'
import {
  mockApiRoutes, mockProgramme, entrerEnEssai, ouvrirChapitreDuProgramme, compteRapide,
  sansDebordement, estOrdinateur, ouvrirSaisieTexte,
} from './helpers'

const APPAREILS = [
  ['ordinateur', { width: 1280, height: 800 }],
  ['téléphone', { width: 390, height: 844 }],
]

const menuHaut = page => page.getByRole('navigation', { name: 'Menu principal' })

test.describe('Ordinateur (1280 px)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('menu du haut, colonne centrale, pas de capsule du bas', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)
    await entrerEnEssai(page)

    // Le menu est en haut à droite : quatre entrées, « Créer mon compte » (mode essai), pas de Réviz IA.
    await expect(page.locator('.nav-haut')).toBeVisible()
    await expect(page.locator('.bottom-nav')).toBeHidden()
    for (const nom of ["Aujourd'hui", 'Programme', 'Agenda', 'Moi']) {
      await expect(menuHaut(page).getByRole('link', { name: nom, exact: true })).toBeVisible()
    }
    await expect(menuHaut(page).getByRole('link', { name: 'Programme', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(menuHaut(page).getByRole('link', { name: 'Créer mon compte' })).toBeVisible()
    await expect(menuHaut(page).getByRole('link', { name: 'Réviz IA' })).toHaveCount(0)
    await sansDebordement(page, 'programme')
    await page.screenshot({ path: test.info().outputPath('desktop-programme.png') })

    // Le programme se compose pour la largeur : les matières à gauche, la route des chapitres à droite
    // (sur téléphone, l'une sous l'autre).
    const matieres = await page.getByRole('region', { name: 'Mes matières' }).boundingBox()
    const chapitres = await page.getByRole('region', { name: /^Chapitres/ }).boundingBox()
    expect(chapitres.x).toBeGreaterThanOrEqual(matieres.x + matieres.width)
    expect(chapitres.width).toBeGreaterThan(matieres.width)
    expect(chapitres.x + chapitres.width).toBeLessThanOrEqual(1280)

    await page.getByRole('radio', { name: /^Maths/ }).click()
    const thales = page.getByRole('button', { name: /^Chapitre 1 : Le théorème de Thalès/ })
    await thales.click()
    await expect(page.getByRole('heading', { name: 'Le théorème de Thalès', level: 3 })).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('desktop-chemin-fiche.png') })

    await ouvrirChapitreDuProgramme(page)
    // Ouvert depuis le Programme : c'est cette entrée qui reste allumée
    await expect(menuHaut(page).getByRole('link', { name: 'Programme', exact: true })).toHaveClass(/nav-haut-onglet--actif/)
    await expect(page.getByRole('heading', { name: 'L’essentiel' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ton parcours' })).toBeVisible()
    await expect(page.getByText('À découvrir')).toBeVisible()
    await sansDebordement(page, 'fiche du chapitre')
    await page.screenshot({ path: test.info().outputPath('desktop-analyse.png') })

    // Quiz et flashcards : jeux plein écran, sans menu
    await page.getByRole('link', { name: /^Quiz corrigé/ }).click()
    await expect(page.getByRole('heading', { name: 'Que faut-il pour appliquer le théorème de Thalès ?' })).toBeVisible()
    await expect(page.locator('.nav-haut')).toBeHidden()
    await sansDebordement(page, 'quiz')
    await page.screenshot({ path: test.info().outputPath('desktop-quiz.png') })

    await page.goto('/resume')
    await expect(page.getByRole('heading', { name: 'À retenir' })).toBeVisible()
    await expect(page.getByText('Sécantes').first()).toBeVisible()
    await sansDebordement(page, 'résumé')
    await page.screenshot({ path: test.info().outputPath('desktop-resume.png') })

    await page.goto('/flashcards')
    await expect(page.getByText('Que faut-il pour appliquer le théorème de Thalès ?').first()).toBeVisible()
    await sansDebordement(page, 'flashcards')
    await page.screenshot({ path: test.info().outputPath('desktop-flashcards.png') })

    // Accueil du mode essai : le rappel, le plan, les matières du programme et la partie du jour
    await page.goto('/')
    await expect(page.getByRole('status').getByText('Mode essai')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tes matières' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Maths', exact: true })).toHaveAttribute('href', '/programme?matiere=maths')
    await sansDebordement(page, 'accueil')
    await page.screenshot({ path: test.info().outputPath('desktop-home.png') })

    // Mes leçons : le mode essai propose de créer un compte pour scanner
    await page.goto('/cours')
    await expect(page.getByText('Garde tes leçons')).toBeVisible()
    await sansDebordement(page, 'cours')
    await page.screenshot({ path: test.info().outputPath('desktop-cours.png') })

    // Moi : les progrès ont rejoint le profil (/progres y renvoie) — programme, mémoire, semaine, badges
    await page.goto('/progres')
    await expect(page).toHaveURL(/\/profil$/)
    await expect(page.getByRole('heading', { name: 'Mon programme' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Maths : 1 \/ \d+ commencé/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ma mémoire' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ma semaine' })).toBeVisible()
    await page.waitForTimeout(1600) // fin des animations d'entrée des cartes, pour la capture seulement
    await page.screenshot({ path: test.info().outputPath('desktop-profil-progres.png') })
    // « Réviser maintenant » ouvre les flashcards de la leçon la plus en retard
    await page.getByRole('button', { name: /Réviser maintenant/ }).click()
    await expect(page).toHaveURL(/\/flashcards/)

    await page.goto('/profil')
    // Tous les badges d'un coup, avec ce qu'il faut faire pour les obtenir
    await expect(page.getByRole('heading', { name: 'Mes badges' })).toBeVisible()
    await expect(page.getByText(/sur 18 obtenu/)).toBeVisible()
    await expect(page.getByText('Prochain badge')).toBeVisible()
    await expect(page.getByRole('button', { name: /3 jours de suite/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Défier quelqu’un' })).toBeVisible()
    await sansDebordement(page, 'profil')
    await page.screenshot({ path: test.info().outputPath('desktop-profil.png') })
  })
})

test.describe('Mobile (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('rien ne change : capsule du bas visible, pas de menu du haut', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)
    await entrerEnEssai(page)
    await expect(page.locator('.nav-haut')).toBeHidden()
    await expect(page.locator('.bottom-nav')).toBeVisible()
    await expect(page.locator('.bottom-nav').getByRole('link', { name: 'Programme' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('status').getByText('Mode essai')).toBeVisible()
    await sansDebordement(page, 'programme')
    await page.screenshot({ path: test.info().outputPath('mobile-programme.png') })
    await page.getByRole('radio', { name: /^Maths/ }).click()
    await expect(page.getByRole('heading', { name: /^Chapitres · Maths/ })).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('mobile-chemin.png') })
    await page.goto('/')
    await expect(page.locator('.nav-haut')).toBeHidden()
    await expect(page.getByRole('status').getByText('Mode essai')).toBeVisible()
    await sansDebordement(page, 'accueil')
    await page.screenshot({ path: test.info().outputPath('mobile-home.png') })
  })
})

// L'accueil d'un compte, à chaque largeur : la partie du jour (Réviz Games), le programme, la Battle.
test.describe('Accueil avec un compte', () => {
  for (const [appareil, viewport] of APPAREILS) {
    test(`carte Réviz Games, entrée vers le programme, Battle (${appareil})`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await mockApiRoutes(page)
      await mockProgramme(page)
      await compteRapide(page, { prenom: 'Léa' })

      // Le menu : en haut avec le bouton Réviz IA (ordinateur), capsule du bas sinon. Pas de rappel de mode essai.
      if (estOrdinateur(page)) {
        await expect(page.locator('.nav-haut')).toBeVisible()
        await expect(page.locator('.bottom-nav')).toBeHidden()
        await expect(menuHaut(page).getByRole('link', { name: 'Réviz IA' })).toBeVisible()
      } else {
        await expect(page.locator('.bottom-nav')).toBeVisible()
        await expect(page.locator('.nav-haut')).toBeHidden()
        await expect(page.locator('.bottom-nav').getByRole('link', { name: 'Réviz IA' })).toBeVisible()
      }
      await expect(page.getByRole('status').getByText('Mode essai')).toHaveCount(0)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeAttached() // la phrase du jour (lue par les lecteurs d'écran)
      await expect(page.getByRole('heading', { name: 'Ton plan du jour' })).toBeVisible()

      // Réviz Games : la partie du jour est une carte de l'accueil, qui mène au hub
      const jeux = page.getByRole('link', { name: /Réviz Games.*La partie du jour/ })
      await jeux.evaluate(el => el.scrollIntoView({ block: 'center' }))
      await expect(jeux).toBeVisible()
      await expect(jeux).toContainText('6 mini-jeux')
      await sansDebordement(page, `accueil ${appareil}`)
      await page.screenshot({ path: test.info().outputPath(`accueil-${appareil}.png`) })

      // La Battle : la carte mène à /battle
      const battle = page.getByRole('link', { name: /^Battle/ })
      await battle.evaluate(el => el.scrollIntoView({ block: 'center' }))
      await expect(battle).toHaveAttribute('href', '/battle')

      // Entrée vers le programme : les matières, puis « Tout voir »
      await expect(page.getByRole('heading', { name: 'Tes matières' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Maths', exact: true })).toHaveAttribute('href', '/programme?matiere=maths')
      const toutVoir = page.getByRole('link', { name: 'Tout voir' })
      await toutVoir.evaluate(el => el.scrollIntoView({ block: 'center' }))
      await toutVoir.click()
      await expect(page).toHaveURL(/\/programme$/)

      // Retour à l'accueil, puis la carte Réviz Games mène à /jeux
      await page.goto('/')
      const carteJeux = page.getByRole('link', { name: /Réviz Games.*La partie du jour/ })
      await carteJeux.evaluate(el => el.scrollIntoView({ block: 'center' }))
      await carteJeux.click()
      await expect(page).toHaveURL(/\/jeux/)
      await expect(page.getByRole('heading', { name: /On joue/ })).toBeVisible()
      await sansDebordement(page, `hub des jeux ${appareil}`)

      // Le prénom n'est plus dit sur l'accueil : il vit sur le profil et dans Réviz IA.
      await page.goto('/profil')
      await expect(page.getByRole('heading', { name: 'Léa', level: 1 })).toBeVisible()
    })
  }
})

test.describe('Ordinateur (1280 px) — avec un compte', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('accueil en tableau de bord, scanner en deux panneaux, profil, Réviz IA', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)
    await compteRapide(page, { prenom: 'Léa' })

    await expect(page.locator('.nav-haut')).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('desktop-compte-home.png') })

    // Scanner : les deux panneaux côte à côte, pas d'onglets
    await page.goto('/scan')
    await expect(page.getByRole('button', { name: 'Choisir une photo' })).toBeVisible()
    await ouvrirSaisieTexte(page)
    await expect(page.getByRole('tab')).toHaveCount(0)
    await sansDebordement(page, 'scan')
    await page.screenshot({ path: test.info().outputPath('desktop-compte-scan.png') })

    // Un chapitre ouvert, puis l'accueil et Mes cours composés avec la leçon
    await page.goto('/programme?matiere=maths')
    await ouvrirChapitreDuProgramme(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Ton plan du jour' })).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('desktop-compte-home-lecon.png') })
    await page.goto('/cours')
    await expect(page.getByRole('heading', { name: 'Mes leçons scannées' })).toBeVisible()
    await sansDebordement(page, 'cours')
    await page.screenshot({ path: test.info().outputPath('desktop-compte-cours.png') })

    // Profil d'un compte : « Modifier le profil » en fenêtre centrée dans la page (plus de feuille collée en bas)
    await page.goto('/profil')
    await expect(page.getByRole('button', { name: 'Défier quelqu’un' })).toBeVisible()
    await page.getByRole('button', { name: 'Modifier le profil' }).click()
    const fenetre = page.getByRole('dialog', { name: 'Modifier le profil' })
    await expect(fenetre).toBeVisible()
    await fenetre.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)))
    const box = await fenetre.boundingBox()
    expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThan(4)
    expect(box.y).toBeGreaterThan(20)
    expect(box.y + box.height).toBeLessThan(800 - 20)
    await page.screenshot({ path: test.info().outputPath('desktop-compte-profil-modifier.png') })
    await fenetre.getByRole('button', { name: 'Fermer' }).click()
    await expect(fenetre).toBeHidden()

    // Réviz IA : accueil « Salut Léa », colonne des discussions, menu du haut
    await menuHaut(page).getByRole('link', { name: 'Réviz IA' }).click()
    await expect(page).toHaveURL(/\/coach/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Salut Léa.')
    await expect(page.getByRole('complementary', { name: 'Tes conversations' })).toBeVisible()
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
    await page.screenshot({ path: test.info().outputPath('desktop-coach-conversation.png') })

    await page.goto('/reglages')
    await expect(page.getByRole('heading', { name: 'Réglages' }).first()).toBeVisible()
    await sansDebordement(page, 'réglages')
    await page.screenshot({ path: test.info().outputPath('desktop-compte-reglages.png') })
  })
})
