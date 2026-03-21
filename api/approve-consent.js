// Vercel Serverless Function
// GET /api/approve-consent?token=xxx&uid=yyy
// Le parent clique sur ce lien depuis son email → active le compte

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getDb() {
  if (!getApps().length) {
    const credential = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL);
    initializeApp({ credential: cert(credential) });
  }
  return getFirestore();
}

export default async function handler(req, res) {
  const { token, uid } = req.query ?? {};

  if (!token || !uid) {
    return res.status(400).send(errorPage('Lien invalide', 'Ce lien est incomplet ou invalide.'));
  }

  try {
    const db = getDb();
    const docRef = db.collection('users').doc(uid).collection('parentalConsent').doc('consent');
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).send(errorPage('Lien expiré', 'Ce lien n\'est plus valide.'));
    }

    const data = doc.data();

    if (data.token !== token) {
      return res.status(403).send(errorPage('Lien invalide', 'Ce lien n\'est pas valide.'));
    }

    if (data.status === 'approved') {
      return res.redirect(302, 'https://reviz-gamma.vercel.app/connexion?consent=already-approved');
    }

    // Approve
    await docRef.update({ status: 'approved', approvedAt: Date.now() });

    return res.redirect(302, 'https://reviz-gamma.vercel.app/connexion?consent=approved');
  } catch (err) {
    console.error('[approve-consent]', err);
    return res.status(500).send(errorPage('Erreur', 'Une erreur est survenue. Réessaie plus tard.'));
  }
}

function errorPage(title, message) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>${title} — Réviz</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F7F7F5;}
.card{background:white;border-radius:16px;padding:32px;max-width:400px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.1);}
h1{font-size:20px;color:#1A1A1A;}p{color:#666;font-size:15px;}
a{color:#1A1A1A;font-weight:600;}</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p>
<a href="https://reviz-gamma.vercel.app">← Retour à Réviz</a></div></body></html>`;
}
