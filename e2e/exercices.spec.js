// Exercices en jeu (29/10) : depuis la fiche du chapitre Thalès (fixture), une séance complète de
// 10 exercices tous formats mélangés, en mode essai, à 1280 px et à 390 px. La séance est tirée
// avec une graine fixe (?graine=42) : le test calcule les mêmes exercices et leurs bonnes réponses.
// Une réponse fausse exprès (le premier QCM), le reste juste ; puis le score sur la fiche. Sur
// téléphone, Vrai ou faux et Classement se jouent en glissant la carte.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, entrerEnEssai, ouvrirChapitreDuProgramme, chapitreThales, sansDebordement, estOrdinateur } from './helpers'
import { construireSeance, ecrireNombre } from '../src/utils/exercicesChapitre.js'
import { nbsp } from '../src/utils/typography.js'

const APPAREILS = [
  ['ordinateur', { width: 1280, height: 800 }],
  ['téléphone', { width: 390, height: 844 }],
]
const NOMS = {
  coins: '4 coins', intrus: 'Intrus', indices: 'Trois indices', definition: 'Définition', paires: 'Paires', ordre: 'Chronologie', annee: 'Année', qcm: 'Quiz', vraifaux: 'Vrai ou faux', phrase: 'Phrase à trous', memory: 'Mémory', classement: 'Classement',
  selection: 'Sélection', cause: 'Cause ou conséquence', etiquette: 'Étiquette', devinette: 'Qui suis-je ?', calcul: 'Trouve le nombre', etapes: 'Les étapes',
}
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
    case 'etapes':
      for (const k of ex.bonOrdre) await page.getByRole('button', { name: ex.evenements[k].texte, exact: true }).click()
      break
    case 'selection':
      for (const c of ex.cartes.filter(x => x.bonne)) await page.getByRole('button', { name: exact(c.texte) }).click()
      await expect(page.locator('.ex-carte.is-choisi')).toHaveCount(ex.cartes.filter(x => x.bonne).length)
      break
    case 'cause':
    case 'etiquette':
      await page.getByRole('button', { name: exact(ex.choix[ex.bonne]) }).click()
      break
    case 'devinette':
      await page.getByRole('textbox', { name: 'Ta réponse' }).fill(ex.reponse)
      break
    case 'calcul':
      // Au pavé : les chiffres, la virgule, puis le signe.
      for (const t of ecrireNombre(Math.abs(ex.reponse))) await page.getByRole('button', { name: t === ',' ? 'Virgule' : t, exact: true }).click()
      if (ex.reponse < 0) await page.getByRole('button', { name: 'Changer le signe' }).click()
      await expect(page.locator('.ex-calcul-valeur span')).toHaveText(ecrireNombre(ex.reponse))
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
