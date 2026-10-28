// Réviz IA sur téléphone (390 px) : la conversation reste utilisable après une réponse (Johan, 24/10 :
// après la première réponse, plus rien ne répondait sauf le défilement), le fil défile jusqu'à la fin
// d'une longue réponse, et la fin ne passe pas sous la barre de saisie. Sans leçon, Réviz IA en agent :
// ses cartes se valident d'un toucher (docs/plan-reviz-ia-agent.md, étape 2).
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, compteRapide, ouvrirChapitreDuProgramme } from './helpers'
import { jourEnClair, ajouterJours, jourIso } from '../src/utils/agenda.js'

const LONGUE = Array.from({ length: 24 }, (_, i) => `- Étape ${i + 1} : une ligne de plan de révision assez longue pour passer à la ligne.`).join('\n')
  + '\n\nDERNIÈRE LIGNE DE LA RÉPONSE'

// Réponse de /api/chat : le quota, puis les événements donnés (texte, outil, carte).
function repondreAvec(page, evenements) {
  return page.route('**/api/chat', route => route.fulfill({
    status: 200,
    contentType: 'text/event-stream',
    body: [{ meta: { remaining: 9, limit: 10 } }, ...evenements].map(e => `data: ${JSON.stringify(e)}\n\n`).join('') + 'data: [DONE]\n\n',
  }))
}
const repondre = (page, texte) => repondreAvec(page, [{ text: texte }])

test.describe('Réviz IA — téléphone (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('après une longue réponse : on lit jusqu’au bout, on peut redemander et quitter', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)
    await compteRapide(page, { prenom: 'Léa' })
    await page.goto('/programme?matiere=maths')
    await ouvrirChapitreDuProgramme(page)
    await page.goto('/coach')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Salut Léa.')

    await repondre(page, LONGUE)
    // /coach sans ?lesson : Réviz IA sur toutes les matières (« Ta question à Réviz IA »).
    await page.getByLabel(/^Ta question/).fill('Prépare-moi un plan de révision')
    await page.getByRole('button', { name: 'Envoyer la question' }).click()
    const fin = page.getByText('DERNIÈRE LIGNE DE LA RÉPONSE')
    await expect(fin).toBeVisible({ timeout: 10_000 })

    // La fin de la réponse est au-dessus de la barre de saisie (rien n'est caché dessous).
    const champ = page.locator('.ia-champ-cadre')
    await expect.poll(async () => (await fin.boundingBox()).y + (await fin.boundingBox()).height <= (await champ.boundingBox()).y).toBe(true)

    // Clavier ouvert (simulé : Chromium n'a pas de clavier à l'écran) : la page prend la zone visible
    // laissée par le clavier, et la barre de saisie tient dedans, juste au-dessus.
    await page.evaluate(() => {
      const p = document.querySelector('.ia-page')
      p.style.setProperty('--ia-hauteur', '400px'); p.setAttribute('data-clavier', '')
    })
    await expect.poll(async () => { const b = await champ.boundingBox(); return b.y + b.height <= 400 && b.y > 200 }).toBe(true)
    await page.screenshot({ path: test.info().outputPath('coach-clavier-ouvert.png') })
    await page.evaluate(() => {
      const p = document.querySelector('.ia-page')
      p.style.setProperty('--ia-hauteur', `${innerHeight}px`); p.removeAttribute('data-clavier')
    })

    // Toujours utilisable : une deuxième question part et reçoit sa réponse.
    await repondre(page, 'Deuxième réponse de Réviz.')
    const saisie = page.getByLabel(/^Ta question/)
    await saisie.tap()
    await saisie.fill('Et le jour 3 ?')
    await page.getByRole('button', { name: 'Envoyer la question' }).tap()
    await expect(page.getByText('Deuxième réponse de Réviz.')).toBeVisible({ timeout: 10_000 })

    // Et on peut quitter par le bouton Retour.
    await page.getByRole('button', { name: 'Retour' }).tap()
    await expect(page).not.toHaveURL(/\/coach/)
  })

  test('sans leçon : la carte de contrôle se valide d’un toucher et le contrôle part dans l’agenda', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)
    const { uid } = await compteRapide(page, { prenom: 'Léa', classe: '4ème' })
    const date = ajouterJours(jourIso(), 7)
    const carte = {
      type: 'controle', matiere: 'svt', date, jour: jourEnClair(date), titre: 'Le volcanisme',
      chapitres: [{ id: 'volcanisme', titre: 'Le volcanisme' }], classe: '4ème', programme: 'SVT', resume: 'contrôle de SVT',
    }
    await repondreAvec(page, [
      { outil: 'Je regarde ton agenda…' },
      { text: 'Je te le note : touche **Ajouter**, ton plan de révision suivra.' },
      { carte },
    ])
    await page.goto('/coach')
    await page.getByLabel('Ta question à Réviz IA').fill('contrôle de svt dans une semaine sur les volcans')
    await page.getByRole('button', { name: 'Envoyer la question' }).tap()

    await expect(page.getByText('Contrôle de SVT')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(`${jourEnClair(date)[0].toUpperCase()}${jourEnClair(date).slice(1)} · Le volcanisme`)).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('coach-agent-carte.png') })
    await page.getByRole('button', { name: /^Ajouter à l’agenda : Contrôle de SVT/ }).tap()
    await expect(page.getByRole('link', { name: 'Ajouté · voir mon plan' })).toBeVisible()

    const agenda = await page.evaluate(u => JSON.parse(localStorage.getItem(`reviz-agenda-${u}`)), uid)
    expect(agenda.controles).toEqual([expect.objectContaining({ matiere: 'svt', date, titre: 'Le volcanisme', chapitres: carte.chapitres, programme: 'SVT' })])

    await page.getByRole('link', { name: 'Ajouté · voir mon plan' }).tap()
    await expect(page).toHaveURL(/\/agenda/)
    await expect(page.getByText('Le volcanisme').first()).toBeVisible()
  })
})
