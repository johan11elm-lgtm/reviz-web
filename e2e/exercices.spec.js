// Exercices en jeu (29/10) : depuis la fiche du chapitre Thalès (fixture), une séance complète de
// 10 exercices tous formats mélangés, en mode essai, à 1280 px et à 390 px. La séance est tirée
// avec une graine fixe (?graine=42) : le test calcule les mêmes exercices et leurs bonnes réponses.
// Une réponse fausse exprès (le premier QCM), le reste juste ; puis le score sur la fiche. Sur
// téléphone, Vrai ou faux et Classement se jouent en glissant la carte.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, entrerEnEssai, ouvrirChapitreDuProgramme, chapitreThales, sansDebordement, estOrdinateur } from './helpers'
import { construireSeance } from '../src/utils/exercicesChapitre.js'
import { nbsp } from '../src/utils/typography.js'

const APPAREILS = [
  ['ordinateur', { width: 1280, height: 800 }],
  ['téléphone', { width: 390, height: 844 }],
]
const NOMS = { coins: '4 coins', intrus: 'Intrus', indices: 'Trois indices', definition: 'Définition', paires: 'Paires', ordre: 'Chronologie', annee: 'Année', qcm: 'Quiz', vraifaux: 'Vrai ou faux', phrase: 'Phrase à trous', memory: 'Mémory', classement: 'Classement' }
const exact = t => new RegExp(`^${nbsp(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}$`)
// Les formats qui se valident seuls (pas de bouton « Valider »).
const SANS_VALIDER = ['paires', 'memory', 'classement', 'vraifaux']

/** Glisse une carte vers la gauche ou la droite, à la souris (les mêmes événements que le doigt). */
async function glisserCarte(page, carte, cote) {
  const b = await carte.boundingBox()
  const x = b.x + b.width / 2, y = b.y + b.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + (cote === 'droite' ? 160 : -160), y, { steps: 8 })
  await page.mouse.up()
}

/**
 * Joue un exercice jusqu'à la correction. `juste` : seulement pour le QCM (une réponse fausse exprès).
 * `glisser` : Vrai ou faux et Classement au doigt plutôt qu'aux boutons ; 4 coins glissé sur ordinateur.
 */
async function jouer(page, ex, { juste = true, glisser = false, ordinateur = false } = {}) {
  switch (ex.type) {
    case 'coins': {
      const coin = page.getByRole('button', { name: exact(ex.coins[ex.bonne]) })
      if (ordinateur) await page.locator('.ex-carte-coin').dragTo(coin)
      else await coin.click()
      await expect(coin).toHaveAttribute('aria-pressed', 'true')
      break
    }
    case 'intrus':
      await page.getByRole('button', { name: exact(ex.cartes[ex.bonne]) }).click()
      await expect(page.locator('.ex-carte-tag')).toHaveText('Intrus')
      break
    case 'indices':
      await page.getByRole('button', { name: exact(ex.choix[ex.bonne]) }).click()
      await expect(page.locator('.ex-arbre-tete')).toHaveText(nbsp(ex.choix[ex.bonne]))
      break
    case 'definition':
      await page.getByRole('button', { name: exact(ex.choix[ex.bonne]) }).click()
      break
    case 'qcm':
      await page.getByRole('button', { name: exact(ex.choix[juste ? ex.bonne : (ex.bonne + 1) % ex.choix.length]) }).click()
      break
    case 'paires':
      for (const p of ex.paires) {
        await page.getByRole('button', { name: exact(p.terme) }).click()
        await page.getByRole('button', { name: exact(p.definition) }).click()
      }
      break
    case 'ordre':
      for (const k of ex.bonOrdre) await page.getByRole('button', { name: ex.evenements[k].texte, exact: true }).click()
      break
    case 'annee':
      await page.getByRole('slider', { name: 'Année' }).fill(String(ex.annee))
      break
    case 'vraifaux':
      if (glisser) await glisserCarte(page, page.locator('.ex-vf-carte'), ex.vrai ? 'droite' : 'gauche')
      else await page.getByRole('button', { name: ex.vrai ? 'Vrai' : 'Faux', exact: true }).click()
      break
    case 'phrase':
      await page.getByRole('button', { name: exact(ex.mots[ex.bonne]) }).click()
      await expect(page.locator('.ex-trou')).toHaveText(ex.mots[ex.bonne])
      break
    case 'memory':
      for (const p of [0, 1, 2]) {
        for (const i of ex.cartes.map((c, k) => (c.paire === p ? k : -1)).filter(k => k >= 0)) await page.locator('.ex-memo').nth(i).click()
        await expect(page.locator('.ex-memo.is-trouvee')).toHaveCount(2 * (p + 1))
      }
      break
    case 'classement':
      for (const [k, c] of ex.cartes.entries()) {
        await expect(page.locator('.ex-cl-compte')).toHaveText(`Carte ${k + 1} sur 4`)
        if (glisser) await glisserCarte(page, page.locator('.ex-cl-carte'), c.dossier ? 'droite' : 'gauche')
        else await page.getByRole('button', { name: exact(ex.dossiers[c.dossier]) }).click()
        await expect(page.locator('.ex-cl-rangees li')).toHaveCount(k + 1)
      }
      break
  }
}

test.describe('Exercices en jeu', () => {
  for (const [appareil, viewport] of APPAREILS) {
    test(`une séance de 10 exercices depuis la fiche du chapitre (${appareil})`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await mockApiRoutes(page)
      await mockProgramme(page)
      await entrerEnEssai(page)
      await ouvrirChapitreDuProgramme(page)

      // ── La fiche propose les exercices ──
      const carte = page.getByRole('link', { name: /^Exercices en jeu : 4 coins, intrus, paires/ })
      await expect(carte).toBeVisible()
      await carte.click()
      await expect(page).toHaveURL(/\/exercices$/)
      await expect(page.getByText(/· 1 sur 10$/)).toBeVisible()

      // ── La séance tirée avec la graine 42, rejouée par le test ──
      await page.goto('/exercices?graine=42')
      const seance = construireSeance(chapitreThales(), { graine: 42 })
      expect(seance).toHaveLength(10)
      const fauxExpres = seance.findIndex(e => e.type === 'qcm')
      const vus = new Set()

      for (const [i, ex] of seance.entries()) {
        await expect(page.getByText(`${NOMS[ex.type]} · ${i + 1} sur 10`)).toBeVisible()
        await expect(page.getByRole('heading', { level: 1, name: exact(ex.consigne) })).toBeVisible()
        const juste = i !== fauxExpres
        await jouer(page, ex, { juste, glisser: !estOrdinateur(page), ordinateur: estOrdinateur(page) })
        if (!vus.has(ex.type)) {
          await sansDebordement(page, `${ex.type} ${appareil}`)
          await page.screenshot({ path: test.info().outputPath(`${String(i + 1).padStart(2, '0')}-${ex.type}.png`), animations: 'disabled' })
        }
        if (!SANS_VALIDER.includes(ex.type)) await page.getByRole('button', { name: 'Valider' }).click()
        const correction = page.locator('.qz-correction')
        await expect(correction).toBeVisible()
        await expect(correction).toHaveClass(juste ? /is-juste/ : /is-faux/)
        if (!juste) await expect(correction).toContainText(`Bonne réponse : ${nbsp(ex.aRetenir.bonne)}`)
        if (!vus.has(ex.type)) {
          await page.screenshot({ path: test.info().outputPath(`${String(i + 1).padStart(2, '0')}-${ex.type}-corrige.png`), animations: 'disabled' })
          vus.add(ex.type)
        }
        await correction.getByRole('button', { name: i === 9 ? /Voir mon score/ : /Exercice suivant/ }).click()
      }

      // ── Fin : le score, l'exercice à revoir, enregistré pour la fiche ──
      await expect(page.getByText('Séance terminée')).toBeVisible()
      await expect(page.locator('.qz-score-grand')).toHaveText('9 / 10')
      const revoir = page.getByRole('region', { name: 'À revoir' })
      await expect(revoir.locator('.qz-erreur')).toHaveCount(1)
      await expect(revoir).toContainText(`Exercice ${fauxExpres + 1} · Quiz`)
      await sansDebordement(page, `fin ${appareil}`)
      await page.screenshot({ path: test.info().outputPath('fin.png'), fullPage: true, animations: 'disabled' })
      const revisions = await page.evaluate(() => Object.entries(localStorage).filter(([k]) => k.includes('revision')).flatMap(([, v]) => { try { return JSON.parse(v) } catch { return [] } }))
      expect(revisions.find(r => r.type === 'exercices')).toMatchObject({ score: 9, total: 10 })

      await page.getByRole('button', { name: 'Retour au chapitre' }).click()
      await expect(page).toHaveURL(/\/analyse/)
      await expect(page.getByRole('link', { name: /^Exercices en jeu : 9 \/ 10 à la dernière séance, fait$/ })).toBeVisible()
    })
  }

  // Le chapitre Thalès n'a pas de dates : on lui en donne pour jouer la Chronologie et l'Année.
  for (const [appareil, viewport] of APPAREILS) {
    test(`chronologie et année sur un chapitre daté (${appareil})`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await mockApiRoutes(page)
      const date = {
        ...chapitreThales(),
        resume: { ...chapitreThales().resume, keyPoints: ['1637 : Descartes publie la Géométrie', '1781 : Herschel découvre Uranus', '9 juin 1702 : premier journal quotidien anglais', '1609 : Galilée pointe sa lunette'] },
      }
      await mockProgramme(page)
      await page.route('**/programme/3eme/maths/theoreme-de-thales.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(date) }))
      await entrerEnEssai(page)
      await ouvrirChapitreDuProgramme(page)
      // Une graine dont la séance contient les deux formats datés.
      const graine = Array.from({ length: 200 }, (_, k) => k + 1).find(g => {
        const types = construireSeance(date, { graine: g }).map(e => e.type)
        return types.includes('ordre') && types.includes('annee')
      })
      await page.goto(`/exercices?graine=${graine}`)
      const seance = construireSeance(date, { graine })
      for (const [i, ex] of seance.entries()) {
        await expect(page.getByText(`${NOMS[ex.type]} · ${i + 1} sur 10`)).toBeVisible()
        if (ex.type === 'ordre') {
          // Une erreur d'abord, effacée, puis le bon ordre.
          await page.getByRole('button', { name: ex.evenements[ex.bonOrdre[1]].texte, exact: true }).click()
          await expect(page.getByRole('button', { name: `${ex.evenements[ex.bonOrdre[1]].texte}, placé en 1` })).toBeVisible()
          await page.getByRole('button', { name: 'Tout effacer' }).click()
          for (const k of ex.bonOrdre) await page.getByRole('button', { name: ex.evenements[k].texte, exact: true }).click()
          await page.screenshot({ path: test.info().outputPath('ordre.png'), animations: 'disabled' })
          await page.getByRole('button', { name: 'Valider' }).click()
          await expect(page.locator('.qz-correction')).toHaveClass(/is-juste/)
          await expect(page.locator('.ex-evenement-date')).toHaveCount(ex.evenements.length)
          await page.screenshot({ path: test.info().outputPath('ordre-corrige.png'), animations: 'disabled' })
        } else if (ex.type === 'annee') {
          await expect(page.getByRole('button', { name: 'Valider' })).toBeDisabled() // tant que le curseur n'a pas bougé
          // Un an trop tard, au curseur puis au bouton − : juste.
          await page.getByRole('slider', { name: 'Année' }).fill(String(ex.annee + 1))
          await page.getByRole('button', { name: 'Une année de moins' }).click()
          await expect(page.locator('.ex-annee-valeur')).toHaveText(String(ex.annee))
          await page.screenshot({ path: test.info().outputPath('annee.png'), animations: 'disabled' })
          await page.getByRole('button', { name: 'Valider' }).click()
          await expect(page.locator('.qz-correction')).toHaveClass(/is-juste/)
          await page.screenshot({ path: test.info().outputPath('annee-corrige.png'), animations: 'disabled' })
        } else {
          await jouer(page, ex)
          if (!SANS_VALIDER.includes(ex.type)) await page.getByRole('button', { name: 'Valider' }).click()
        }
        await sansDebordement(page, `${ex.type} ${appareil}`)
        await page.locator('.qz-correction').getByRole('button', { name: /Exercice suivant|Voir mon score/ }).click()
      }
      await expect(page.getByText('Séance terminée')).toBeVisible()
    })
  }

  test('une nouvelle séance repart de zéro avec d’autres exercices', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockApiRoutes(page)
    await mockProgramme(page)
    await entrerEnEssai(page)
    await ouvrirChapitreDuProgramme(page)
    await page.goto('/exercices?graine=7')
    const seance = construireSeance(chapitreThales(), { graine: 7 })
    for (const ex of seance) {
      await jouer(page, ex)
      if (!SANS_VALIDER.includes(ex.type)) await page.getByRole('button', { name: 'Valider' }).click()
      await page.locator('.qz-correction').getByRole('button', { name: /Exercice suivant|Voir mon score/ }).click()
    }
    await expect(page.getByText('Séance terminée')).toBeVisible()
    await page.getByRole('button', { name: 'Nouvelle séance' }).click()
    await expect(page.getByText(/· 1 sur 10$/)).toBeVisible()
    await expect(page.locator('.qn-barre i')).toHaveAttribute('style', /width: 3%/)
  })
})
