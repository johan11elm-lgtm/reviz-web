// Helpers partagés des specs e2e — parcours contre l'Emulator Suite Firebase,
// appels IA et endpoints Vercel (/api/*) mockés au niveau de Playwright.
import { expect } from '@playwright/test'

// Payload IA valide au sens de aiService._parseResult (4 branches, correct:int…).
// Quiz volontairement court (3 questions) pour un parcours de fin rapide.
export const MOCK_AI_RESPONSE = {
  metadata: {
    title: 'La photosynthèse',
    subject: 'SVT',
    excerpt: 'Comment les plantes fabriquent leur matière organique à partir de lumière.',
  },
  flashcards: [
    { front: 'Où se déroule la photosynthèse ?', back: 'Dans les chloroplastes des cellules végétales.' },
    { front: 'Quels sont les deux réactifs de la photosynthèse ?', back: 'Le dioxyde de carbone (CO₂) et l\'eau (H₂O).' },
    { front: 'Quel gaz est rejeté par la photosynthèse ?', back: 'Le dioxygène (O₂).' },
  ],
  quiz: [
    { question: 'Quel pigment capte la lumière ?', choices: ['La chlorophylle', 'La mélanine', 'L\'hémoglobine', 'Le carotène'], correct: 0, explanation: 'La chlorophylle donne aussi leur couleur verte aux feuilles.' },
    { question: 'La photosynthèse produit…', choices: ['Du CO₂', 'Du glucose et de l\'O₂', 'De l\'azote', 'De l\'eau uniquement'], correct: 1, explanation: 'Glucose (matière organique) + dioxygène rejeté.' },
    { question: 'Quand la photosynthèse a-t-elle lieu ?', choices: ['La nuit', 'En présence de lumière', 'En hiver seulement', 'Sous terre'], correct: 1, explanation: 'La lumière est la source d\'énergie du processus.' },
  ],
  resume: {
    intro: 'La photosynthèse permet aux végétaux de produire leur matière organique.',
    keyPoints: ['Se déroule dans les chloroplastes', 'Nécessite lumière, CO₂ et eau', 'Produit glucose et O₂'],
    sections: [
      { title: '1. Le principe', content: 'Les végétaux captent la lumière grâce à la chlorophylle.', formula: null, formulaCaption: null },
      { title: '2. L\'équation', content: 'CO₂ + H₂O → glucose + O₂ en présence de lumière.', formula: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂', formulaCaption: 'Équation bilan de la photosynthèse' },
    ],
    keyTerms: [
      { term: 'Chloroplaste', def: 'Organite où se déroule la photosynthèse.' },
      { term: 'Chlorophylle', def: 'Pigment vert qui capte la lumière.' },
      { term: 'Autotrophe', def: 'Organisme qui produit sa propre matière organique.' },
    ],
  },
  mindmap: {
    branches: [
      { id: 'principe', label: 'Principe', emoji: '☀️', detail: 'Convertir la lumière en matière organique.', children: ['Lumière', 'Chlorophylle'], position: 'top-left' },
      { id: 'reactifs', label: 'Réactifs', emoji: '💧', detail: 'CO₂ et eau sont indispensables.', children: ['CO₂', 'H₂O'], position: 'top-right' },
      { id: 'produits', label: 'Produits', emoji: '🍬', detail: 'Glucose et dioxygène.', children: ['Glucose', 'O₂'], position: 'bottom-left' },
      { id: 'lieu', label: 'Lieu', emoji: '🌿', detail: 'Les chloroplastes des feuilles.', children: ['Chloroplastes', 'Feuilles'], position: 'bottom-right' },
    ],
  },
}

/** Mocke les endpoints serverless Vercel absents du dev server Vite. */
export async function mockApiRoutes(page) {
  await page.route('**/api/analyse', route =>
    route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: JSON.stringify(MOCK_AI_RESPONSE) }))
  await page.route('**/api/analyse-image', route =>
    route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: JSON.stringify(MOCK_AI_RESPONSE) }))
  await page.route('**/api/send-parental-consent', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }))
  // Ceinture + bretelles : aucun test ne doit jamais atteindre Anthropic.
  await page.route('**/api.anthropic.com/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(MOCK_AI_RESPONSE) }] }) }))
}

let userCounter = 0
/** Email unique par run pour ne pas collisionner dans l'émulateur Auth. */
export function uniqueEmail(prefix = 'eleve') {
  userCounter += 1
  return `${prefix}-${Date.now()}-${userCounter}@e2e.reviz.test`
}

/**
 * Déroule le tunnel d'inscription email/mot de passe.
 * @param {object} opts
 * @param {string} opts.birthDate  format YYYY-MM-DD (pilote le tunnel <15 ans)
 * @param {string} [opts.parentEmail]  requis si <15 ans
 * @returns l'email du compte créé
 */
export async function signup(page, { birthDate, parentEmail } = {}) {
  const email = uniqueEmail()
  await page.goto('/inscription')

  // Étape prénom
  await page.getByPlaceholder('Lucas').fill('Testeur')
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()

  // Étape date de naissance
  await page.locator('input[type="date"]').fill(birthDate)
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()

  // Étape cycle (le clic avance automatiquement) puis classe
  await page.getByRole('button', { name: /Collège/ }).click()
  await page.getByRole('button', { name: '3ème', exact: true }).click()

  // Étape compte
  await page.locator('#signup-email').fill(email)
  await page.locator('input[type="password"]').fill('motdepasse123')
  await page.locator('input[type="checkbox"]').check()
  await page.getByRole('button', { name: 'Créer mon compte' }).click()

  if (parentEmail) {
    // Tunnel mineur : étape parent
    await expect(page.getByPlaceholder('parent@exemple.com')).toBeVisible({ timeout: 15_000 })
    await page.getByPlaceholder('parent@exemple.com').fill(parentEmail)
    await page.getByRole('button', { name: /Envoyer la demande/ }).click()
  }

  return email
}

/**
 * Vérifie réellement l'email via l'émulateur Auth (qui capture les liens de
 * vérification envoyés), comme un élève qui clique dans sa boîte mail.
 */
export async function verifyEmailViaEmulator(page, email) {
  const res = await page.request.get('http://127.0.0.1:9099/emulator/v1/projects/demo-reviz/oobCodes')
  const { oobCodes = [] } = await res.json()
  const code = oobCodes.filter(c => c.email === email && c.requestType === 'VERIFY_EMAIL').pop()
  if (!code) throw new Error(`Aucun lien de vérification capturé pour ${email}`)
  await page.request.get(code.oobLink)
}

/** Vérifie l'email (via émulateur) puis passe l'onboarding (compte majeur). */
export async function verifyEmailAndOnboard(page, email) {
  await expect(page).toHaveURL(/verify-email/, { timeout: 15_000 })
  await verifyEmailViaEmulator(page, email)
  await page.getByRole('button', { name: /J'ai confirmé mon email/ }).click()
  await expect(page).toHaveURL(/onboarding/, { timeout: 15_000 })
  await page.getByRole('button', { name: 'Passer' }).click()
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
}
