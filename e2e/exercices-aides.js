// Aides des e2e des exercices en jeu (29/10) : jouer un exercice avec sa bonne réponse, et une séance
// entière. Partagées par exercices.spec.js, premiere-revision.spec.js et parent-montre.spec.js : depuis
// le 29/10, la séance d'exercices remplace le quiz (la première révision de l'inscription comprise).
import { expect } from '@playwright/test'
import { ecrireNombre } from '../src/utils/exercicesChapitre.js'
import { nbsp } from '../src/utils/typography.js'
import { estOrdinateur } from './helpers'

export const NOMS = {
  coins: '4 coins', intrus: 'Intrus', indices: 'Trois indices', definition: 'Définition', paires: 'Paires', ordre: 'Chronologie', annee: 'Année', qcm: 'Quiz', vraifaux: 'Vrai ou faux', phrase: 'Phrase à trous', memory: 'Mémory', classement: 'Classement',
  selection: 'Sélection', cause: 'Cause ou conséquence', etiquette: 'Étiquette', devinette: 'Qui suis-je ?', calcul: 'Trouve le nombre', etapes: 'Les étapes',
}
export const exact = t => new RegExp(`^${nbsp(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}$`)
// Les formats qui se valident seuls (pas de bouton « Valider »).
export const SANS_VALIDER = ['paires', 'memory', 'classement', 'vraifaux']

/** Glisse une carte vers la gauche ou la droite, à la souris (les mêmes événements que le doigt). */
export async function glisserCarte(page, carte, cote) {
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
export async function jouer(page, ex, { juste = true, glisser = false, ordinateur = false } = {}) {
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

/** Joue une séance jusqu'à l'écran de fin. `faux` : l'index d'un QCM à rater exprès (-1 : tout juste). */
export async function jouerSeance(page, seance, { faux = -1 } = {}) {
  for (const [i, ex] of seance.entries()) {
    await expect(page.getByText(`${NOMS[ex.type]} · ${i + 1} sur ${seance.length}`)).toBeVisible()
    await jouer(page, ex, { juste: i !== faux, glisser: !estOrdinateur(page), ordinateur: estOrdinateur(page) })
    if (!SANS_VALIDER.includes(ex.type)) await page.getByRole('button', { name: 'Valider' }).click()
    await page.locator('.qz-correction').getByRole('button', { name: i === seance.length - 1 ? /Voir mon score/ : /Exercice suivant/ }).click()
  }
  await expect(page.getByText('Séance terminée')).toBeVisible()
}
