// Exercices en jeu (29/10) : depuis la fiche du chapitre Thalès (fixture), une séance complète de
// 10 exercices tous formats mélangés, en mode essai, à 1280 px et à 390 px. La séance est tirée
// avec une graine fixe (?graine=42) : le test calcule les mêmes exercices et leurs bonnes réponses.
// Une réponse fausse exprès (le premier QCM), le reste juste ; puis le score sur la fiche. Sur
// téléphone, Vrai ou faux et Classement se jouent en glissant la carte.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, entrerEnEssai, ouvrirChapitreDuProgramme, chapitreThales, sansDebordement, estOrdinateur } from './helpers'
import { construireSeance } from '../src/utils/exercicesChapitre.js'
import { nbsp } from '../src/utils/typography.js'
import { NOMS, exact, SANS_VALIDER, jouer } from './exercices-aides'

const APPAREILS = [
  ['ordinateur', { width: 1280, height: 800 }],
  ['téléphone', { width: 390, height: 844 }],
]

test.describe('Exercices en jeu', () => {
  for (const [appareil, viewport] of APPAREILS) {
    test(`une séance de 10 exercices depuis la fiche du chapitre (${appareil})`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await mockApiRoutes(page)
      await mockProgramme(page)
      await entrerEnEssai(page)
      await ouvrirChapitreDuProgramme(page)

      // ── La fiche propose les exercices, en dernière étape du parcours (à la place du quiz) ──
      await expect(page.getByRole('link', { name: /^Quiz corrigé/ })).toHaveCount(0)
      const carte = page.getByRole('link', { name: /^Exercices en jeu : 10 exercices, quiz compris/ })
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
      // La question du quiz ratée dans la séance se refait seule, dans le quiz des erreurs.
      const erreurs = page.getByRole('link', { name: 'Refaire mes erreurs : 1 question ratée' })
      await expect(erreurs).toHaveAttribute('href', '/quiz?erreurs=1')
      await erreurs.click()
      await expect(page.getByText(nbsp(seance[fauxExpres].bulle))).toBeVisible()
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

  test('l’ancien lien du quiz ouvre la séance', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockApiRoutes(page)
    await mockProgramme(page)
    await entrerEnEssai(page)
    await ouvrirChapitreDuProgramme(page)
    await page.goto('/quiz')
    await expect(page).toHaveURL(/\/exercices$/)
    await expect(page.getByText(/· 1 sur 10$/)).toBeVisible()
  })

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

  // Pilote du 29/10 : un bloc `exercices` relu nourrit six formats de plus. Chacun est joué juste,
  // sauf Qui suis-je ? (une mauvaise réponse d'abord, qui fait apparaître un indice de plus) et
  // Trouve le nombre (un chiffre en trop, effacé au pavé).
  const RELU = {
    version: 1,
    categories: [
      { nom: 'Les hypothèses', detail: 'Ce qu’il faut vérifier avant d’appliquer le théorème', cartes: ['Les points A, M, B sont alignés', 'Les points A, N, C sont alignés', 'Les droites (MN) et (BC) sont parallèles', 'Deux triangles emboîtés'] },
      { nom: 'La conclusion', detail: 'Ce que donne le théorème', cartes: ['AM/AB = AN/AC = MN/BC', 'L’égalité des trois rapports', 'Un produit en croix pour finir'] },
      { nom: 'La réciproque', detail: 'Pour prouver que deux droites sont parallèles', cartes: ['Comparer AM/AB et AN/AC', 'Des rapports égaux donc des droites parallèles', 'Les points dans le même ordre'] },
      { nom: 'L’agrandissement', detail: 'Les longueurs multipliées par un même nombre', cartes: ['Un coefficient supérieur à 1', 'Les angles sont conservés', 'Les longueurs sont proportionnelles'] },
    ],
    causes: [{ fait: 'l’égalité AM/AB = AN/AC', carte: 'Les droites (MN) et (BC) sont parallèles', role: 'cause', explication: 'Le parallélisme permet d’appliquer le théorème.' }],
    etiquettes: [{ consigne: 'Quel est le rôle de la phrase en couleur ?', texte: '[Les droites (MN) et (BC) sont parallèles], donc AM/AB = AN/AC.', choix: ['Hypothèse', 'Conclusion', 'Propriété'], bonne: 0, explication: 'C’est une donnée de l’énoncé : une hypothèse.' }],
    devinettes: [{ reponse: 'Thalès', acceptees: ['Thalès de Milet'], indices: ['Je suis un savant grec.', 'J’aurais mesuré la hauteur d’une pyramide.', 'Un théorème sur les droites parallèles porte mon nom.'], explication: 'Thalès de Milet, VIe siècle av. J.-C.' }],
    calculs: [{ question: 'AM = 3 cm, AB = 6 cm, AC = 8 cm et (MN) // (BC). Combien mesure AN ?', reponse: 4, unite: 'cm', tolerance: 0, explication: 'AN = AC × AM ÷ AB = 8 × 3 ÷ 6 = 4 cm.' }],
    etapes: [{ titre: 'Rédiger avec le théorème de Thalès', etapes: ['Citer les points alignés', 'Citer les droites parallèles', 'Écrire l’égalité des rapports', 'Calculer la longueur cherchée'] }],
  }
  test('les formats du bloc relu (téléphone)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockApiRoutes(page)
    const relu = { ...chapitreThales(), exercices: RELU }
    await mockProgramme(page)
    await page.route('**/programme/3eme/maths/theoreme-de-thales.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(relu) }))
    await entrerEnEssai(page)
    await ouvrirChapitreDuProgramme(page)
    // Quelques séances qui, à elles toutes, passent par les six formats (en maths, deux calculs par séance).
    const NOUVEAUX = ['selection', 'cause', 'etiquette', 'devinette', 'calcul', 'etapes']
    const types = g => new Set(construireSeance(relu, { graine: g }).map(e => e.type))
    const graines = []
    const restants = new Set(NOUVEAUX)
    for (let g = 1; g <= 300 && restants.size; g++) {
      const t = types(g)
      if ([...restants].filter(x => t.has(x)).length >= Math.min(3, restants.size)) { graines.push(g); for (const x of t) restants.delete(x) }
    }
    expect(restants.size).toBe(0)
    const vus = new Set()
    for (const graine of graines) {
      await page.goto(`/exercices?graine=${graine}`)
      const seance = construireSeance(relu, { graine })
      for (const [i, ex] of seance.entries()) {
        await expect(page.getByText(`${NOMS[ex.type]} · ${i + 1} sur 10`)).toBeVisible()
        const premiere = NOUVEAUX.includes(ex.type) && !vus.has(ex.type)
        if (ex.type === 'devinette' && premiere) {
          await expect(page.locator('.ex-devinette li')).toHaveCount(1)
          await page.getByRole('textbox', { name: 'Ta réponse' }).fill('Pythagore')
          await page.getByRole('textbox', { name: 'Ta réponse' }).press('Enter')
          await expect(page.getByText('Pas tout à fait. Voici un autre indice.')).toBeVisible()
          await expect(page.locator('.ex-devinette li')).toHaveCount(2)
          // Sans accent ni majuscule : accepté.
          await page.getByRole('textbox', { name: 'Ta réponse' }).fill('thales')
        } else if (ex.type === 'calcul' && premiere) {
          await page.getByRole('button', { name: '7', exact: true }).click()
          await page.getByRole('button', { name: 'Effacer' }).click()
          await jouer(page, ex)
        } else {
          await jouer(page, ex)
        }
        if (premiere) {
          await sansDebordement(page, `${ex.type} téléphone`)
          await page.screenshot({ path: test.info().outputPath(`relu-${ex.type}.png`), animations: 'disabled' })
        }
        if (!SANS_VALIDER.includes(ex.type)) await page.getByRole('button', { name: 'Valider' }).click()
        const correction = page.locator('.qz-correction')
        await expect(correction).toHaveClass(/is-juste/)
        if (ex.type === 'devinette' && premiere) await expect(correction).toContainText('Trouvé avec 2 indices')
        if (premiere) {
          await page.screenshot({ path: test.info().outputPath(`relu-${ex.type}-corrige.png`), animations: 'disabled' })
          vus.add(ex.type)
        }
        await correction.getByRole('button', { name: /Exercice suivant|Voir mon score/ }).click()
      }
      await expect(page.getByText('Séance terminée')).toBeVisible()
      await expect(page.locator('.qz-score-grand')).toHaveText('10 / 10')
    }
    expect([...vus].sort()).toEqual([...NOUVEAUX].sort())
  })
})
