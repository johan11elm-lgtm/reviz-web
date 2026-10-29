// Lien du rappel J+1 (api/_rappels.js, sujetRappel) : l'élève touche le bouton
// du mail, se connecte s'il ne l'est pas sur cet appareil, et arrive là où le
// mail le mène ; la provenance « rappel » accompagne ses événements.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, compteRapide, chapitreThales } from './helpers'

const CAPTURES = process.env.CAPTURES_DIR

// Ce que produit lienChapitre(…, 'rappel') pour Thalès en 3e (chemin seulement).
const LIEN_CHAPITRE = `/essai?${new URLSearchParams({ classe: '3ème', matiere: 'maths', chapitre: 'theoreme-de-thales', via: 'rappel' })}`

/** Les événements envoyés à /api/track (corps JSON). */
function suivreTrack(page) {
  const events = []
  page.on('request', r => {
    if (r.url().includes('/api/track') && r.method() === 'POST') {
      try { events.push(JSON.parse(r.postData() ?? '{}')) } catch { /* corps illisible */ }
    }
  })
  return events
}

/** Appareil où l'élève n'est pas connecté, mais qui ne rejouera pas l'accueil ni les annonces. */
async function appareilSansSession(page, { uid, classe }) {
  await page.goto('/welcome')
  await page.evaluate(({ uid, classe }) => {
    localStorage.setItem(`reviz-level-${uid}`, JSON.stringify({ cycle: 'college', classe, specialites: [] }))
    localStorage.setItem(`reviz-onboarded-${uid}`, '1')
    for (const phase of ['lancement', 'derniers-jours', 'prolonge', 'payant']) {
      for (const ventes of ['', '-ventes']) localStorage.setItem(`reviz-annonce-revizplus-${phase}${ventes}-${uid}`, '1')
    }
    localStorage.setItem(`reviz-annonce-jeux-${uid}`, '1')
    localStorage.setItem('reviz-essai-theme-vu', '1')
  }, { uid, classe })
}

async function seConnecter(page, { email, motDePasse }) {
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(motDePasse)
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

test.describe('Lien du rappel J+1', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)
  })

  test('chapitre, pas connecté sur cet appareil : connexion puis la séance d’exercices du chapitre', async ({ page }) => {
    const compte = await compteRapide(page, { connecte: false })
    await appareilSansSession(page, compte)
    const events = suivreTrack(page)

    await page.goto(LIEN_CHAPITRE)
    await page.getByRole('link', { name: "J'ai déjà un compte, je me connecte" }).click()
    await expect(page).toHaveURL(/\/connexion\?next=/)
    await seConnecter(page, compte)

    // Depuis le 29/10, la séance d'exercices remplace le quiz.
    await expect(page).toHaveURL(/\/exercices/, { timeout: 15_000 })
    await expect(page.getByText(/· 1 sur 10$/)).toBeVisible()
    expect(events.length).toBeGreaterThan(0)
    expect(events.every(e => e.props?.via === 'rappel')).toBe(true)
  })

  test('chapitre, déjà connecté : la séance d’exercices directement', async ({ page }) => {
    await compteRapide(page)
    await page.goto(LIEN_CHAPITRE)
    await expect(page).toHaveURL(/\/exercices/, { timeout: 15_000 })
    await expect(page.getByText(/· 1 sur 10$/)).toBeVisible()
  })

  // Leçon scannée, sans chapitre ni leçon, ou sans rien de connu : pages réservées aux comptes.
  for (const [quoi, chemin] of [['leçon scannée', '/cours'], ['sans chapitre', '/programme'], ['accueil', '/']]) {
    test(`${quoi}, pas connecté sur cet appareil : la connexion, puis ${chemin}`, async ({ page }) => {
      const compte = await compteRapide(page, { connecte: false })
      await appareilSansSession(page, compte)
      const events = suivreTrack(page)

      await page.goto(`${chemin}?via=rappel`)
      await expect(page).toHaveURL(/\/connexion\?next=/)
      const nom = chemin === '/' ? 'accueil' : chemin.slice(1)
      if (CAPTURES) await page.waitForTimeout(2500)
      if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/rappel-${nom}-1-connexion.png` })
      await seConnecter(page, compte)

      await expect(page).not.toHaveURL(/connexion|welcome/, { timeout: 15_000 })
      if (CAPTURES) await page.waitForTimeout(2500)
      if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/rappel-${nom}-2-arrivee.png` })
      expect(new URL(page.url()).pathname).toBe(chemin)
      expect(new URL(page.url()).searchParams.get('via')).toBe('rappel')
      expect(events.length).toBeGreaterThan(0)
      expect(events.every(e => e.props?.via === 'rappel')).toBe(true)
    })
  }

  test('nouveau visiteur sans lien de rappel : toujours l’accueil des nouveaux', async ({ page }) => {
    await page.goto('/cours')
    await expect(page).toHaveURL(/\/welcome$/)
  })
})
