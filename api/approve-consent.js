// Vercel Serverless Function (Node runtime)
// GET  /api/approve-consent?token=xxx&uid=yyy → page de confirmation (NE MUTE RIEN)
// POST /api/approve-consent (form: token, uid)  → approuve réellement le consentement
//
// La mutation est volontairement réservée au POST : les scanners de liens / proxys
// de sécurité / prévisualisations d'email font des GET automatiques et pourraient
// sinon "approuver" le consentement à la place du parent (invalide juridiquement).

import { timingSafeEqual } from 'node:crypto';
import { getDb } from './_firebaseAdmin.js';

export const config = { maxDuration: 30 };

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { token, uid } = req.query ?? {};
    if (!token || !uid) {
      return res.status(400).send(page('Lien invalide', 'Ce lien est incomplet ou invalide.'));
    }
    // Aucune mutation sur GET : on affiche une page de confirmation (bouton → POST).
    return res.status(200).send(confirmPage(token, uid));
  }

  if (req.method === 'POST') {
    const { token, uid } = req.body ?? {};
    if (!token || !uid) {
      return res.status(400).send(page('Lien invalide', 'Ce lien est incomplet ou invalide.'));
    }

    try {
      const db = getDb();
      const docRef = db.collection('users').doc(uid)
        .collection('parentalConsent').doc('consent');
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).send(page('Lien expiré', 'Ce lien n\'est plus valide.'));
      }
      const data = doc.data();

      if (data.status === 'approved') {
        return res.status(200).send(page('Déjà confirmé ✓', 'Le compte de votre enfant est déjà activé. Il peut se connecter à Réviz.'));
      }
      // Token absent (déjà consommé) ou différent → refus, en temps constant.
      if (!data.token || !safeEqual(data.token, token)) {
        return res.status(403).send(page('Lien invalide', 'Ce lien n\'est pas valide ou a déjà été utilisé.'));
      }
      if (data.createdAt && Date.now() - data.createdAt > TOKEN_TTL_MS) {
        return res.status(410).send(page('Lien expiré', 'Ce lien a expiré. Votre enfant peut en renvoyer un nouveau depuis l\'application.'));
      }

      // Approbation + invalidation du token (usage unique).
      await docRef.update({ status: 'approved', approvedAt: Date.now(), token: null });
      return res.status(200).send(page('Compte activé ✓', 'Merci ! Le compte de votre enfant est maintenant activé. Il peut se connecter à Réviz.'));
    } catch (err) {
      console.error('[approve-consent]', err?.message || err);
      return res.status(500).send(page('Erreur', 'Une erreur est survenue. Réessayez plus tard.'));
    }
  }

  return res.status(405).send(page('Action non autorisée', 'Cette action n\'est pas autorisée.'));
}

// --- Pages HTML autonomes -------------------------------------------------

const STYLE = `body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F7F7F5;padding:16px;}
.card{background:#fff;border-radius:16px;padding:32px;max-width:440px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);}
h1{font-size:22px;color:#1A1A1A;margin:0 0 12px;}
p{color:#555;font-size:15px;line-height:1.5;margin:0 0 16px;}
.small{color:#999;font-size:13px;}
button{background:#1A1A1A;color:#fff;border:0;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;cursor:pointer;width:100%;}
a{color:#1A1A1A;font-weight:600;}`;

function confirmPage(token, uid) {
  const t = escapeHtml(token), u = escapeHtml(uid);
  return `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Autorisation parentale — Réviz</title>
<style>${STYLE}</style></head>
<body><div class="card">
<h1>Réviz 🌟</h1>
<p>Votre enfant souhaite utiliser <strong>Réviz</strong>, une application d'aide à la révision scolaire. Pour activer son compte, confirmez votre autorisation ci-dessous.</p>
<form method="POST" action="/api/approve-consent">
<input type="hidden" name="token" value="${t}">
<input type="hidden" name="uid" value="${u}">
<button type="submit">✓ J'autorise l'inscription</button>
</form>
<p class="small" style="margin-top:16px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cette page : aucun compte ne sera activé.</p>
</div></body></html>`;
}

function page(title, message) {
  return `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${escapeHtml(title)} — Réviz</title>
<style>${STYLE}</style></head>
<body><div class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>
<a href="https://reviz-gamma.vercel.app">← Retour à Réviz</a></div></body></html>`;
}
