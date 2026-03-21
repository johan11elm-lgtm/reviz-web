// Vercel Serverless Function
// POST /api/send-parental-consent
// Body: { uid, parentEmail, childName }
// Génère un token, le stocke dans Firestore, envoie l'email au parent via Resend

import { Resend } from 'resend';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin init (singleton)
function getDb() {
  if (!getApps().length) {
    const credential = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL);
    initializeApp({ credential: cert(credential) });
  }
  return getFirestore();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { uid, parentEmail, childName } = req.body ?? {};
  if (!uid || !parentEmail || !childName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const token = crypto.randomUUID();
  const approveUrl = `https://reviz-gamma.vercel.app/api/approve-consent?token=${token}&uid=${uid}`;

  try {
    // Store in Firestore
    const db = getDb();
    await db.collection('users').doc(uid)
      .collection('parentalConsent').doc('consent')
      .set({
        parentEmail,
        status: 'pending',
        token,
        createdAt: Date.now(),
      });

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Réviz <noreply@reviz-gamma.vercel.app>',
      to: parentEmail,
      subject: `Votre enfant souhaite utiliser Réviz`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h1 style="font-size: 24px; color: #1A1A1A;">Réviz 🌟</h1>
          <p style="color: #444; font-size: 16px; line-height: 1.5;">
            <strong>${childName}</strong> souhaite créer un compte sur <strong>Réviz</strong>,
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
            ✓ J'autorise l'inscription
          </a>
          <p style="color: #888; font-size: 13px; margin-top: 24px;">
            Si vous n'avez pas fait cette demande ou si vous refusez, ignorez simplement cet email.
            Le compte de votre enfant ne sera pas activé.<br/><br/>
            <a href="https://reviz-gamma.vercel.app/legal/confidentialite" style="color: #888;">Politique de confidentialité</a>
          </p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[send-parental-consent]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
