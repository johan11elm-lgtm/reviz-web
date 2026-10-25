// Helpers partagés des specs e2e — parcours contre l'Emulator Suite Firebase,
// appels IA et endpoints Vercel (/api/*) mockés au niveau de Playwright.
import { expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
// Le texte affiché passe par la typographie (insécables) : on cherche avec la même transformation.
import { nbsp } from '../src/utils/typography.js'

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
  // Demande au parent : on pose dans l'émulateur ce qu'écrit le serveur
  // (email parti, délai de réponse qui démarre), sans envoyer de mail.
  await page.route('**/api/send-parental-consent', async route => {
    const { idToken, parentEmail } = route.request().postDataJSON()
    const jeton = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString())
    const maintenant = String(Date.now())
    await ecrireConsentementEmulateur(jeton.user_id, {
      status: { stringValue: 'pending' },
      parentEmail: { stringValue: parentEmail },
      createdAt: { integerValue: maintenant },
      firstRequestedAt: { integerValue: maintenant },
    })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  })
  // Fin de Battle : la vraie route (firebase-admin) ne tourne pas sous Vite. On
  // répond pour l'élève qui appelle (uid lu dans son jeton d'émulateur) : un
  // compte voit son total, rangé sur son profil comme le ferait le serveur ;
  // un invité anonyme apprend que son aura n'est pas gardée.
  await page.route('**/api/battle-fin', async route => {
    const { idToken } = route.request().postDataJSON()
    const jeton = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString())
    const anonyme = jeton.firebase?.sign_in_provider === 'anonymous'
    if (!anonyme) await rangerAuraEmulateur(jeton.user_id, 130)
    const compte = { [jeton.user_id]: anonyme ? { delta: 0, comptee: false, sansCompte: true } : { delta: 130, aura: 130, comptee: true } }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ compte }) })
  })
  // Ceinture + bretelles : aucun test ne doit jamais atteindre Anthropic.
  await page.route('**/api.anthropic.com/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(MOCK_AI_RESPONSE) }] }) }))
}

// Ce qu'écrit api/battle-fin.js sur users/{uid}, posé dans l'émulateur Firestore.
async function rangerAuraEmulateur(uid, aura) {
  const champs = ['aura', 'battles'].map(c => `updateMask.fieldPaths=${c}`).join('&')
  const res = await fetch(`http://127.0.0.1:8080/v1/projects/demo-reviz/databases/(default)/documents/users/${uid}?${champs}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: {
      aura: { integerValue: String(aura) },
      battles: { mapValue: { fields: { jouees: { integerValue: '1' }, gagnees: { integerValue: '1' } } } },
    } }),
  })
  if (!res.ok) throw new Error(`émulateur Firestore : ${res.status} ${await res.text()}`)
}

// Écrit users/{uid}/parentalConsent/consent dans l'émulateur, comme le serveur
// (règles contournées : seul l'admin peut poser un email parent ou un refus).
export async function ecrireConsentementEmulateur(uid, fields) {
  const res = await fetch(`http://127.0.0.1:8080/v1/projects/demo-reviz/databases/(default)/documents/users/${uid}/parentalConsent/consent`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) throw new Error(`émulateur Firestore : ${res.status} ${await res.text()}`)
}

let userCounter = 0
/** Email unique par run pour ne pas collisionner dans l'émulateur Auth. */
export function uniqueEmail(prefix = 'eleve') {
  userCounter += 1
  return `${prefix}-${Date.now()}-${userCounter}@e2e.reviz.test`
}

/**
 * Ce que dit Réviz dans sa bulle (écrans d'entrée, accueil, réglages). Le texte est tapé lettre par
 * lettre à l'écran ; la version complète vit dans un `.rv-bulle-sr`, seul stable à lire en test.
 */
export function bulleReviz(page, texte) {
  return page.locator('.rv-bulle-sr').filter({ hasText: texte })
}

/** « 3ème » → « 3e » : nom des boutons radio du sélecteur de classe. */
export const classeCourte = classe => classe.replace('ème', 'e')

/**
 * Déroule le tunnel d'inscription email/mot de passe (/inscription, une question par écran :
 * prénom, naissance, classe, compte, puis e-mail d'un parent si moins de 15 ans).
 * @param {object} opts
 * @param {string} opts.birthDate  format YYYY-MM-DD (pilote le tunnel <15 ans)
 * @param {string} [opts.parentEmail]  si <15 ans : l'e-mail du parent est saisi à l'étape parent.
 *   Sans lui, le tunnel s'arrête sur l'écran parent (l'élève n'a pas encore choisi « Plus tard »).
 * @param {string} [opts.prenom='Testeur']
 * @param {string} [opts.classe='3ème']  6ème, 5ème, 4ème ou 3ème
 * @returns l'email du compte créé
 */
export async function signup(page, { birthDate, parentEmail, prenom = 'Testeur', classe = '3ème' } = {}) {
  const email = uniqueEmail()
  await page.goto('/inscription')
  await remplirTunnelInscription(page, { birthDate, prenom, classe, email })

  if (parentEmail) {
    // Tunnel mineur : étape parent
    await page.getByLabel('E-mail de ton parent').fill(parentEmail)
    await page.getByRole('button', { name: /Envoyer et commencer/ }).click()
  }

  return email
}

/**
 * Les quatre premiers écrans de /inscription (prénom, naissance, classe, compte), jusqu'au clic
 * sur « Créer mon compte » ; pour un moins de 15 ans, attend ensuite l'écran « parent ».
 * Partagé par signup() et par les specs qui doivent s'arrêter avant/pendant l'étape parent.
 */
export async function remplirTunnelInscription(page, { birthDate, prenom = 'Testeur', classe = '3ème', email, motDePasse = 'motdepasse123' }) {
  // Écran prénom
  await page.getByLabel('Ton prénom').fill(prenom)
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()

  // Écran date de naissance
  await remplirNaissance(page, birthDate)
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()

  // Écran classe : le choix n'avance plus tout seul, il faut « Continuer ».
  await page.getByRole('radio', { name: classeCourte(classe), exact: true }).click()
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()

  // Écran compte
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(motDePasse)
  await page.getByRole('checkbox').check({ force: true })
  await page.getByRole('button', { name: 'Créer mon compte' }).click()

  if (anneesDepuis(birthDate) < 15) {
    await expect(page.getByLabel('E-mail de ton parent')).toBeVisible({ timeout: 15_000 })
  }
}

// Âge en années pleines à la date du jour (même règle que isUnder15).
function anneesDepuis(birthDate) {
  const n = new Date(birthDate)
  const t = new Date()
  let age = t.getFullYear() - n.getFullYear()
  if (t.getMonth() < n.getMonth() || (t.getMonth() === n.getMonth() && t.getDate() < n.getDate())) age -= 1
  return age
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

/**
 * Après signup() d'un majeur : confirme l'email (via l'émulateur), passe la découverte
 * (« Passer » sur l'écran d'accueil de Réviz) et arrive sur l'accueil. Les popups de l'accueil
 * (« Réviz+ offert jusqu'au … », puis « Nouveau : la Battle ») sont fermées, sauf si la spec veut
 * en tester une (garderAnnonce : true pour la Battle, 'revizplus' pour Réviz+).
 */
export async function verifyEmailAndOnboard(page, email, { garderAnnonce = false } = {}) {
  // L'élève entre dès l'inscription : l'accueil l'envoie à la découverte (une fois), et il
  // confirme son email depuis sa boîte mail pendant ce temps.
  await expect(page).toHaveURL(/onboarding/, { timeout: 15_000 })
  await verifyEmailViaEmulator(page, email)
  await passerDecouverte(page)
  if (garderAnnonce === 'revizplus') return
  // Lancement : « Réviz+ offert » passe en premier, la Battle à la visite suivante.
  await fermerAnnonceRevizPlus(page)
  if (garderAnnonce) await page.goto('/')
  else await fermerAnnonceBattle(page)
}

/** Sur /onboarding (découverte de Réviz, trois écrans) : « Passer » mène à l'accueil. */
export async function passerDecouverte(page) {
  await page.getByRole('button', { name: 'Passer' }).click()
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
}

/** Ferme la popup Réviz+ (offert, derniers jours ou grâce) si elle est ouverte (accueil, une fois par élève). */
export async function fermerAnnonceRevizPlus(page) {
  const plusTard = page.getByRole('dialog', { name: /Réviz\+ offert|Réviz\+ est offert|Garde ton Réviz\+/ }).getByRole('button', { name: 'Plus tard' })
  await plusTard.click({ timeout: 5_000 }).catch(() => {})
}

/** Ferme la popup « Nouveau : la Battle » si elle est ouverte (accueil, une fois par élève). */
export async function fermerAnnonceBattle(page) {
  const plusTard = page.getByRole('dialog', { name: 'La Battle' }).getByRole('button', { name: 'Plus tard' })
  await plusTard.click({ timeout: 5_000 }).catch(() => {})
}

/**
 * Ferme, dans l'ordre, toutes les popups d'accueil qui peuvent s'ouvrir sur un compte neuf
 * (Réviz+ offert, puis la Battle). Il n'y a pas d'annonce Réviz Games : la partie du jour est
 * une carte de l'accueil, pas une popup. La carte « Essaie un thème Réviz+ » n'est pas modale.
 */
export async function fermerAnnonces(page) {
  await fermerAnnonceRevizPlus(page)
  await fermerAnnonceBattle(page)
}

// Date de naissance en trois listes (jour, mois, année) : 'AAAA-MM-JJ'.
export async function remplirNaissance(page, date) {
  const [a, m, j] = date.split('-').map(Number)
  await page.getByRole('combobox', { name: 'Jour' }).selectOption(String(j))
  await page.getByRole('combobox', { name: 'Mois' }).selectOption(String(m))
  await page.getByRole('combobox', { name: 'Année' }).selectOption(String(a))
}

// ── Compte prêt à l'emploi, sans passer par l'interface ─────────────────────

const AUTH = 'http://127.0.0.1:9099'
const FIRESTORE = 'http://127.0.0.1:8080/v1/projects/demo-reviz/databases/(default)/documents'

// Valeur JS → valeur Firestore (REST) : chaînes, nombres, booléens, null, tableaux, objets.
// Les entiers deviennent integerValue, les autres nombres doubleValue ; un objet
// { __timestamp: ms } devient un timestampValue.
function versFirestore(v) {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(versFirestore) } }
  if (typeof v === 'object' && '__timestamp' in v) return { timestampValue: new Date(v.__timestamp).toISOString() }
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, versFirestore(x)])) } }
}

async function appelEmulateur(url, options, contexte) {
  const res = await fetch(url, options)
  const texte = await res.text()
  if (!res.ok) throw new Error(`émulateur (${contexte}) : ${res.status} ${texte}`)
  return texte ? JSON.parse(texte) : {}
}

/** Écrit (fusionne) des champs du profil users/{uid} dans l'émulateur Firestore, règles contournées. */
export async function ecrireProfilEmulateur(uid, champs) {
  const masque = Object.keys(champs).map(c => `updateMask.fieldPaths=${encodeURIComponent(c)}`).join('&')
  await appelEmulateur(`${FIRESTORE}/users/${uid}?${masque}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(champs).map(([k, v]) => [k, versFirestore(v)])) }),
  }, `profil ${uid}`)
}

/** Lit users/{uid} dans l'émulateur Firestore : l'objet des champs (valeurs Firestore en JS simple), ou null. */
export async function lireProfilEmulateur(uid) {
  const res = await fetch(`${FIRESTORE}/users/${uid}`, { headers: { Authorization: 'Bearer owner' } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`émulateur (lecture profil ${uid}) : ${res.status} ${await res.text()}`)
  const { fields = {} } = await res.json()
  const depuis = v => {
    if ('stringValue' in v) return v.stringValue
    if ('integerValue' in v) return Number(v.integerValue)
    if ('doubleValue' in v) return v.doubleValue
    if ('booleanValue' in v) return v.booleanValue
    if ('timestampValue' in v) return v.timestampValue
    if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(depuis)
    if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, depuis(x)]))
    return null
  }
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, depuis(v)]))
}

/**
 * Crée un compte élève complet SANS passer par l'interface, puis le connecte par /connexion.
 * Pour que les specs qui ne testent pas l'entrée de l'app démarrent vite (une seconde, pas vingt).
 *
 * Ce qui est fait, dans l'ordre :
 *  1. Auth (émulateur) : `accounts:signUp` (e-mail + mot de passe + prénom), puis `accounts:update`
 *     avec `Authorization: Bearer owner` pour marquer l'e-mail comme vérifié (désactivable).
 *  2. Firestore (émulateur) : `users/{uid}` avec les champs d'un vrai compte après l'inscription
 *     (createUserProfile) : prenom, email, birthDate, level { cycle: 'college', classe, specialites: [] },
 *     plan: 'free', createdAt. Pour un moins de 15 ans, `users/{uid}/parentalConsent/consent`
 *     (voir `consentement`).
 *  3. Navigateur : /connexion, puis dans le localStorage les mémos par élève que la vraie
 *     inscription et l'accueil posent (niveau `reviz-level-{uid}`, découverte passée
 *     `reviz-onboarded-{uid}`, popups Réviz+ et Battle déjà vues, carte « Essaie un thème »
 *     vue), puis connexion avec le formulaire, et arrivée sur l'accueil (ou `aller`).
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} [opts]
 * @param {string} [opts.prenom='Testeur']
 * @param {string} [opts.classe='3ème']        6ème, 5ème, 4ème ou 3ème
 * @param {string} [opts.birthDate='2009-05-01'] majeur au sens « plus de 15 ans » ; mettre une date <15 ans pour un mineur
 * @param {string} [opts.email]                par défaut uniqueEmail()
 * @param {string} [opts.motDePasse='motdepasse123']
 * @param {boolean} [opts.emailVerifie=true]   false : le rappel « Confirme ton e-mail » reste à l'accueil
 * @param {boolean} [opts.onboarde=true]       false : l'accueil renvoie vers la découverte (/onboarding)
 * @param {boolean} [opts.annoncesVues=true]   false : les popups Réviz+ / Battle s'ouvriront sur l'accueil
 * @param {object|null} [opts.consentement]    mineur : champs Firestore (valeurs JS) du doc parentalConsent/consent.
 *   Défaut pour un <15 ans : { status: 'pending', parentEmail: 'parent@famille.test', createdAt, firstRequestedAt } = accès ouvert
 *   en attendant le parent. `null` : pas de doc.
 * @param {object} [opts.profil]               champs en plus sur users/{uid} (aura, jeux, plan: 'premium'…)
 * @param {Record<string,string|null>} [opts.stockage]  clés localStorage en plus, posées avant la connexion
 *   (une valeur `null` retire la clé : ex. { 'reviz-essai-theme-vu': null } pour revoir la carte « Essaie un thème »)
 * @param {boolean} [opts.connecte=true]       false : crée seulement le compte (pas de navigation)
 * @param {string|null} [opts.aller='/']       page où atterrir après la connexion (null : reste où l'on arrive)
 * @returns {Promise<{ uid:string, email:string, motDePasse:string, prenom:string, classe:string, idToken:string }>}
 */
export async function compteRapide(page, {
  prenom = 'Testeur', classe = '3ème', birthDate = '2009-05-01', email = uniqueEmail('rapide'),
  motDePasse = 'motdepasse123', emailVerifie = true, onboarde = true, annoncesVues = true,
  consentement, profil = {}, stockage = {}, connecte = true, aller = '/',
} = {}) {
  const compte = await appelEmulateur(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: motDePasse, displayName: prenom, returnSecureToken: true }),
  }, 'signUp')
  const uid = compte.localId

  if (emailVerifie) {
    await appelEmulateur(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/demo-reviz/accounts:update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ localId: uid, emailVerified: true }),
    }, 'emailVerified')
  }

  const level = { cycle: 'college', classe, specialites: [] }
  await ecrireProfilEmulateur(uid, {
    prenom, email, birthDate, level, plan: 'free', createdAt: { __timestamp: Date.now() }, ...profil,
  })

  const mineur = anneesDepuis(birthDate) < 15
  const doc = consentement === undefined && mineur
    ? { status: 'pending', parentEmail: 'parent@famille.test', createdAt: Date.now(), firstRequestedAt: Date.now() }
    : consentement
  if (doc) await ecrireConsentementEmulateur(uid, Object.fromEntries(Object.entries(doc).map(([k, v]) => [k, versFirestore(v)])))

  if (connecte) {
    // Le localStorage est par origine : on charge une page de l'app d'abord.
    await page.goto('/connexion')
    await page.evaluate(({ uid, level, onboarde, annoncesVues, stockage }) => {
      localStorage.setItem(`reviz-level-${uid}`, JSON.stringify(level))
      if (onboarde) localStorage.setItem(`reviz-onboarded-${uid}`, '1')
      if (annoncesVues) {
        // Une clé par période (lancement, derniers jours, prolongé) et par état des ventes.
        for (const phase of ['lancement', 'derniers-jours', 'prolonge', 'payant']) {
          for (const ventes of ['', '-ventes']) localStorage.setItem(`reviz-annonce-revizplus-${phase}${ventes}-${uid}`, '1')
        }
        localStorage.setItem(`reviz-annonce-battle-${uid}`, '1')
        localStorage.setItem('reviz-essai-theme-vu', '1')
      }
      for (const [k, v] of Object.entries(stockage)) {
        if (v === null) localStorage.removeItem(k)
        else localStorage.setItem(k, v)
      }
    }, { uid, level, onboarde, annoncesVues, stockage })

    await page.getByLabel('E-mail', { exact: true }).fill(email)
    await page.getByLabel('Mot de passe', { exact: true }).fill(motDePasse)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page).not.toHaveURL(/connexion/, { timeout: 15_000 })
    if (aller && aller !== '/') await page.goto(aller)
  }

  return { uid, email, motDePasse, prenom, classe, idToken: compte.idToken }
}

// ── Scanner : saisie du texte (lot B1) ──────────────────────────────────────

/** Ordinateur = écran d'au moins 1024 px (même seuil que useIsDesktop). */
export function estOrdinateur(page) {
  return (page.viewportSize()?.width ?? 0) >= 1024
}

/**
 * Sur /scan, rend le champ « Texte de ta leçon » prêt à remplir : sur ordinateur il est déjà là
 * (deux panneaux), sur téléphone il faut d'abord « Coller le texte ». Renvoie le champ.
 */
export async function ouvrirSaisieTexte(page) {
  if (!estOrdinateur(page)) await page.getByRole('button', { name: /Coller le texte/ }).click()
  const champ = page.getByLabel('Texte de ta leçon')
  await expect(champ).toBeVisible()
  return champ
}

/** Pas de débordement horizontal : la page ne défile pas de côté. */
export async function sansDebordement(page, contexte = '') {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
  expect(sw, `débordement horizontal ${contexte}`.trim()).toBeLessThanOrEqual(iw)
}

// ── Mon programme : catalogue et chapitre servis par des fixtures (lot B1) ───

const dossierFixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/programme')
const fixture = nom => readFileSync(path.join(dossierFixtures, nom), 'utf8')

/**
 * Sert le catalogue de 3e (Maths : « Le théorème de Thalès » prêt + « Trigonométrie » bientôt ;
 * Français : « L'argumentation » bientôt) et le chapitre Thalès (6 flashcards, quiz de 5 questions)
 * depuis e2e/fixtures/programme : le parcours ne dépend pas des contenus générés dans public/.
 */
export async function mockProgramme(page) {
  await page.route('**/programme/3eme/index.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: fixture('index.json') }))
  await page.route('**/programme/3eme/maths/theoreme-de-thales.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: fixture('thales.json') }))
}

/** Le contenu du chapitre Thalès des fixtures (pour lire ses questions, bonnes réponses, etc.). */
export function chapitreThales() {
  return JSON.parse(fixture('thales.json'))
}

/** Mode essai : /essai, prénom + classe, puis « C'est parti » → /programme. */
export async function entrerEnEssai(page, { prenom = 'Léa', classe = '3ème' } = {}) {
  await page.goto('/essai')
  await page.getByLabel('Ton prénom').fill(prenom)
  await page.getByRole('radio', { name: classeCourte(classe), exact: true }).click()
  await page.getByRole('button', { name: /C'est parti/ }).click()
  await expect(page).toHaveURL(/\/programme$/)
}

/**
 * Sur /programme : ouvre la fiche du chapitre (case choisie → bouton d'action du détail) puis
 * arrive sur la fiche du chapitre (/analyse). `titre` : le chapitre, par son titre.
 */
export async function ouvrirChapitreDuProgramme(page, { titre = 'Le théorème de Thalès', matiere = 'Maths' } = {}) {
  await page.getByRole('radio', { name: new RegExp(`^${matiere}`) }).click()
  const caseChapitre = page.getByRole('button', { name: new RegExp(`^Chapitre \\d+ : ${titre}`) })
  await caseChapitre.evaluate(el => el.scrollIntoView({ block: 'center' }))
  await caseChapitre.click()
  await expect(page.getByRole('heading', { name: titre, level: 3 })).toBeVisible()
  await page.getByRole('button', { name: /^(C'est parti|Reprendre|Réviser|Découvrir)$/ }).click()
  await expect(page).toHaveURL(/\/analyse/)
}

/**
 * Joue un quiz jusqu'à l'écran de fin. `bonnes` : nombre de bonnes réponses voulues (les premières
 * questions sont justes, les suivantes fausses) ; par défaut, tout juste. Renvoie le nombre de questions.
 */
export async function jouerQuiz(page, questions, { bonnes = questions.length } = {}) {
  for (const [i, q] of questions.entries()) {
    await expect(page.getByRole('heading', { name: nbsp(q.question) })).toBeVisible()
    const voulue = i < bonnes ? q.correct : (q.correct + 1) % q.choices.length
    await page.getByRole('button', { name: new RegExp(`^[A-D] : ${q.choices[voulue].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click()
    await page.getByRole('button', { name: /Question suivante|Voir mon score/ }).click()
  }
  await expect(page.getByText('Quiz terminé')).toBeVisible()
  return questions.length
}

/** Les ids des leçons rangées dans users/{uid}/lessons de l'émulateur Firestore (la synchro a eu lieu). */
export async function lireLeconsEmulateur(uid) {
  const res = await fetch(`${FIRESTORE}/users/${uid}/lessons`, { headers: { Authorization: 'Bearer owner' } })
  if (!res.ok) throw new Error(`émulateur (lecture leçons ${uid}) : ${res.status} ${await res.text()}`)
  const { documents = [] } = await res.json()
  return documents.map(d => d.name.split('/').pop())
}

/** Les révisions rangées dans users/{uid}/revisions de l'émulateur Firestore : [type, chapterId, source, terminée]. */
export async function lireRevisionsEmulateur(uid) {
  const res = await fetch(`${FIRESTORE}/users/${uid}/revisions`, { headers: { Authorization: 'Bearer owner' } })
  if (!res.ok) throw new Error(`émulateur (lecture révisions ${uid}) : ${res.status} ${await res.text()}`)
  const { documents = [] } = await res.json()
  return documents.map(({ fields: f }) => [f.type?.stringValue, f.chapterId?.stringValue, f.source?.stringValue, 'termineAt' in f])
}

// ── Horloge figée : l'offre de lancement dépend de la date (lot B1) ─────────

// L'offre de lancement change le 26/10/2026 à minuit, heure de Paris (api/_lancement.js : FIN_LANCEMENT).
// Les trois moments que voit un élève, avec ce qui s'affiche à chacun (src/utils/revizPlus.js : phaseRevizPlus) :
export const MOMENTS = {
  // Réviz+ offert, tarif fondateur à réserver : phase « lancement » (jusqu'à 3 jours avant la fin).
  lancement: { iso: '2026-10-20T10:00:00Z', libelle: 'mardi 20 octobre 2026, 12 h à Paris' },
  // Les 3 derniers jours offerts : phase « derniers-jours » (les Réglages comptent les jours restants).
  derniersJours: { iso: '2026-10-24T10:00:00Z', libelle: 'samedi 24 octobre 2026, 12 h à Paris' },
  // La rentrée du lundi 2/11 : l'offre est finie, Réviz+ est payant (phase « payant »), plus de tarif fondateur.
  rentree: { iso: '2026-11-02T08:00:00Z', libelle: 'lundi 2 novembre 2026, 9 h à Paris' },
}

/**
 * Fige l'heure du navigateur (Date.now et new Date) ; les minuteries continuent de tourner. À appeler
 * avant d'ouvrir l'app (avant compteRapide) : l'app lit la date au chargement (LANCEMENT_OFFERT).
 * Le jeton de l'émulateur Auth reste accepté : il n'est jamais vérifié côté navigateur.
 */
export async function figerHeure(page, moment) {
  await page.clock.setFixedTime(new Date(moment.iso))
}
