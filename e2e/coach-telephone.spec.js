// Réviz IA sur téléphone (390 px) : la conversation reste utilisable après une réponse (Johan, 24/10 :
// après la première réponse, plus rien ne répondait sauf le défilement), le fil défile jusqu'à la fin
// d'une longue réponse, et la fin ne passe pas sous la barre de saisie.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, compteRapide, ouvrirChapitreDuProgramme } from './helpers'

const LONGUE = Array.from({ length: 24 }, (_, i) => `- Étape ${i + 1} : une ligne de plan de révision assez longue pour passer à la ligne.`).join('\n')
  + '\n\nDERNIÈRE LIGNE DE LA RÉPONSE'

function repondre(page, texte) {
  return page.route('**/api/chat', route => route.fulfill({
    status: 200,
    contentType: 'text/event-stream',
    body: 'data: ' + JSON.stringify({ meta: { remaining: 9, limit: 10 } }) + '\n\n' + 'data: ' + JSON.stringify({ text: texte }) + '\n\ndata: [DONE]\n\n',
  }))
}

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
    await page.getByLabel('Ta question sur la leçon').fill('Prépare-moi un plan de révision')
    await page.getByRole('button', { name: 'Envoyer la question' }).click()
    const fin = page.getByText('DERNIÈRE LIGNE DE LA RÉPONSE')
    await expect(fin).toBeVisible({ timeout: 10_000 })

    // La fin de la réponse est au-dessus de la barre de saisie (rien n'est caché dessous).
    const champ = page.locator('.ia-champ-cadre')
    await expect.poll(async () => (await fin.boundingBox()).y + (await fin.boundingBox()).height <= (await champ.boundingBox()).y).toBe(true)

    // Toujours utilisable : une deuxième question part et reçoit sa réponse.
    await repondre(page, 'Deuxième réponse de Réviz.')
    const saisie = page.getByLabel('Ta question sur la leçon')
    await saisie.tap()
    await saisie.fill('Et le jour 3 ?')
    await page.getByRole('button', { name: 'Envoyer la question' }).tap()
    await expect(page.getByText('Deuxième réponse de Réviz.')).toBeVisible({ timeout: 10_000 })

    // Et on peut quitter par le bouton Retour.
    await page.getByRole('button', { name: 'Retour' }).tap()
    await expect(page).not.toHaveURL(/\/coach/)
  })
})
