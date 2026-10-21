// Compte de test de la refonte, dans l'émulateur Firebase local (projet demo-reviz :
// rien ne sort de la machine). À utiliser avec le serveur « reviz-refonte-emulateur »
// (http://localhost:5389) et l'émulateur lancé (npx firebase emulators:start --only
// auth,firestore,database --project demo-reviz).
//
//   Email : lea.refonte@reviz.test
//   Mot de passe : Test-11efe1a6
//
// Le compte se crée par l'inscription de l'app (prénom Johan, né le 12/03/2010, collège, 4ème). Ce script lui
// ajoute ensuite 6 leçons scannées et des révisions dans Firestore :
//   node scripts/compte-test-emulateur.mjs
// L'avancement des cartes (SRS) reste dans le navigateur : il est posé à part.
const EMAIL = 'lea.refonte@reviz.test'
const AUTH = 'http://127.0.0.1:9099'
const FS = 'http://127.0.0.1:8080/v1/projects/demo-reviz/databases/(default)/documents'
const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }

const comptes = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/demo-reviz/accounts:query`, { method: 'POST', headers: owner, body: '{}' }).then(r => r.json())
const uid = comptes.userInfo?.find(u => u.email === EMAIL)?.localId
if (!uid) { console.error('Compte introuvable : crée-le d’abord par /inscription.'); process.exit(1) }

// Valeur JS → valeur Firestore REST.
const v = x => x === null ? { nullValue: null }
  : Array.isArray(x) ? { arrayValue: { values: x.map(v) } }
  : typeof x === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, v(y)])) } }
  : typeof x === 'boolean' ? { booleanValue: x }
  : typeof x === 'number' ? (Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x })
  : { stringValue: String(x) }
const ecrire = (chemin, obj) => fetch(`${FS}/${chemin}`, { method: 'PATCH', headers: owner, body: JSON.stringify({ fields: v(obj).mapValue.fields }) })
  .then(r => { if (!r.ok) throw new Error(`${chemin} : ${r.status}`) })

const J = 86400000, now = Date.now()
const cartes = n => Array.from({ length: n }, (_, i) => ({ front: `Question ${i + 1}`, back: `Réponse ${i + 1}` }))
const quiz = n => Array.from({ length: n }, (_, i) => ({ question: `Question ${i + 1} ?`, choices: ['A', 'B', 'C', 'D'], correct: 0, explanation: 'Parce que.' }))
const L = (id, subject, title, jours, fc) => ({
  id, scannedAt: now - jours * J, source: 'scan', metadata: { title, subject, excerpt: title },
  flashcardsCount: fc, quizCount: 5,
  aiData: {
    metadata: { title, subject }, flashcards: cartes(fc), quiz: quiz(5),
    resume: { intro: `L'essentiel de « ${title} ».`, keyPoints: ['Premier point clé.', 'Deuxième point clé.'], sections: [], methode: null, pieges: [], keyTerms: [] },
    mindmap: { branches: [{ label: 'Définition', detail: 'Ce que dit la leçon.', children: ['Idée 1', 'Idée 2'] }, { label: 'Exemples', detail: 'Pour s’entraîner.', children: ['Exemple 1', 'Exemple 2'] }] },
  },
})
const lecons = [
  L('t-puissances', 'Maths', 'Puissances et notation scientifique', 7, 8),
  L('t-revolution', 'Histoire-géo', 'La Révolution française, 1789-1799', 7, 6),
  L('t-empire', 'Histoire-géo', "L'Empire napoléonien", 12, 8),
  L('t-horla', 'Français', 'Le récit fantastique : Le Horla', 14, 4),
  L('t-pythagore', 'Maths', 'Théorème de Pythagore', 19, 4),
  L('t-reproduction', 'SVT', 'La reproduction humaine', 21, 6),
]
const revisions = [
  { id: 't-r1', type: 'flashcards', lessonId: 't-puissances', revisedAt: now - J },
  { id: 't-r2', type: 'resume', lessonId: 't-puissances', revisedAt: now - 2 * J },
  { id: 't-r3', type: 'quiz', lessonId: 't-pythagore', revisedAt: now - 5 * J, score: 5, total: 5 },
  { id: 't-r4', type: 'quiz', lessonId: 't-horla', revisedAt: now - 6 * J, score: 4, total: 5 },
  { id: 't-r5', type: 'resume', lessonId: 't-empire', revisedAt: now - 8 * J },
  { id: 't-r6', type: 'resume', lessonId: 't-reproduction', revisedAt: now - 10 * J },
]
for (const l of lecons) await ecrire(`users/${uid}/lessons/${l.id}`, l)
for (const r of revisions) await ecrire(`users/${uid}/revisions/${r.id}`, r)
console.log(`ok : ${lecons.length} leçons et ${revisions.length} révisions pour ${uid}`)
