// Vercel Serverless Function (Node runtime)
// POST /api/send-parental-consent
// Body: { idToken, parentEmail, childName }
// L'uid est dérivé du token Firebase vérifié — JAMAIS du body.
// Génère un token, le stocke dans Firestore, envoie l'email au parent via Resend.

import { Resend } from 'resend';
import { randomUUID } from 'node:crypto';
import { getDb, getAuthAdmin } from './_firebaseAdmin.js';

export const config = { maxDuration: 30 };

// Un envoi d'email par minute maximum (anti-spam / quota Resend).
const RESEND_THROTTLE_MS = 60 * 1000;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const { idToken, parentEmail, childName } = req.body ?? {};
  if (!idToken) return res.status(401).json({ error: 'UNAUTHORIZED' });
  if (!parentEmail || !childName) return res.status(400).json({ error: 'MISSING_FIELDS' });

  const email = String(parentEmail).trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'INVALID_PARENT_EMAIL' });

  // 1. Authentification : l'uid provient du token vérifié, jamais du body.
  let decoded;
  try {
    decoded = await getAuthAdmin().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  const uid = decoded.uid;

  // 2. Effort raisonnable (art. 8(2) RGPD) : le parent ne peut pas être l'enfant.
  if (decoded.email && decoded.email.toLowerCase() === email.toLowerCase()) {
    return res.status(400).json({ error: 'PARENT_EMAIL_IS_CHILD' });
  }

  try {
    const db = getDb();
    const docRef = db.collection('users').doc(uid)
      .collection('parentalConsent').doc('consent');
    const existing = await docRef.get();

    if (existing.exists) {
      const d = existing.data();
      // Déjà approuvé : ne JAMAIS réinitialiser à 'pending' (anti-lockout), ni renvoyer d'email.
      if (d.status === 'approved') {
        return res.status(200).json({ ok: true, alreadyApproved: true });
      }
      // Throttle anti-spam : un envoi par minute maximum. Uniquement si un
      // email a réellement été envoyé (token présent) — le doc 'pending' posé
      // au signup (AuthContext) n'a pas de token et ne doit pas retarder
      // le tout premier envoi du tunnel d'inscription.
      if (d.token && d.createdAt && Date.now() - d.createdAt < RESEND_THROTTLE_MS) {
        return res.status(429).json({ error: 'RATE_LIMITED' });
      }
    }

    const token = randomUUID();
    await docRef.set({
      parentEmail: email,
      status: 'pending',
      token,
      createdAt: Date.now(),
    });

    const approveUrl = `https://reviz-gamma.vercel.app/api/approve-consent?token=${token}&uid=${uid}`;
    const safeName = escapeHtml(childName);

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Réviz <noreply@reviz-gamma.vercel.app>',
      to: email,
      subject: 'Votre enfant souhaite utiliser Réviz',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h1 style="font-size: 24px; color: #1A1A1A;">Réviz 🌟</h1>
          <p style="color: #444; font-size: 16px; line-height: 1.5;">
            <strong>${safeName}</strong> souhaite créer un compte sur <strong>Réviz</strong>,
            une application d'aide à la révision scolaire par intelligence artificielle.
          </p>
          <p style="color: #444; font-size: 15px; line-height: 1.5;">
            Votre enfant a indiqué avoir moins de 15 ans. Conformément à la réglementation française
            (RGPD et loi Informatique et Libertés), nous avons besoin de votre accord parental avant
            qu'il puisse accéder à l'application.
          </p>
          <div style="background: #F7F7F5; border-radius: 12px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              <strong>Ce que l'application collecte :</strong><br/>
              Prénom, email, leçons scannées (texte uniquement). Aucune photo stockée, aucune pub, aucun partage de données à des tiers sauf pour le fonctionnement du service.
            </p>
          </div>
          <a href="${approveUrl}" style="display: inline-block; background: #1A1A1A; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
            ✓ Donner mon autorisation
          </a>
          <p style="color: #888; font-size: 13px; margin-top: 24px;">
            Ce lien est valable 7 jours. Vous devrez confirmer sur la page qui s'ouvre.<br/>
            Si vous n'avez pas fait cette demande ou si vous refusez, ignorez simplement cet email :
            le compte de votre enfant ne sera pas activé.<br/><br/>
            <a href="https://reviz-gamma.vercel.app/legal/confidentialite" style="color: #888;">Politique de confidentialité</a>
          </p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[send-parental-consent]', err?.message || err);
    return res.status(500).json({ error: 'INTERNAL' });
  }
}
