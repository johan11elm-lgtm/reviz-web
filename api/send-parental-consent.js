// Vercel Serverless Function (Node runtime)
// POST /api/send-parental-consent
// Body: { idToken, parentEmail, childName }
// L'uid est dérivé du token Firebase vérifié — JAMAIS du body.
// Génère un token, le stocke dans Firestore, envoie l'email au parent via Resend.
// L'élève utilise déjà l'app : le parent donne son autorisation depuis l'email.
// Sans autorisation sous 10 jours (src/utils/consent.js), l'accès est suspendu.
//
// GET /api/send-parental-consent (cron Vercel quotidien, voir vercel.json)
// Relance une fois les parents qui n'ont pas répondu au bout de 7 jours. Greffé
// ici plutôt que dans une 13e fonction (limite du plan Vercel Hobby). Seul
// Vercel peut l'appeler : il envoie CRON_SECRET dans l'en-tête Authorization.

import { Resend } from 'resend';
import { randomUUID } from 'node:crypto';
import { getDb, getAuthAdmin } from './_firebaseAdmin.js';
import { DELAI_REPONSE_MS } from '../src/utils/consent.js';

export const config = { maxDuration: 60 };

// Un envoi d'email par minute maximum (anti-spam / quota Resend).
const RESEND_THROTTLE_MS = 60 * 1000;
const JOUR_MS = 24 * 60 * 60 * 1000;
// Relance unique, 3 jours avant la suspension de l'accès.
export const RELANCE_APRES_MS = 7 * JOUR_MS;
const EXPEDITEUR = 'Réviz <noreply@revizapp.fr>';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const lienAutorisation = (token, uid) => `https://app.revizapp.fr/api/approve-consent?token=${token}&uid=${uid}`;

/** Email au parent : première demande, ou relance (avec les jours restants). */
export function mailParent({ prenom, lien, joursRestants = null }) {
  const safeName = escapeHtml(prenom || 'Votre enfant');
  const relance = joursRestants != null;
  const jours = `${joursRestants} jour${joursRestants > 1 ? 's' : ''}`;
  return {
    subject: relance
      ? `Rappel : votre autorisation pour Réviz (plus que ${jours})`
      : 'Votre enfant utilise Réviz : votre autorisation',
    html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h1 style="font-size: 24px; color: #1A1A1A;">Réviz</h1>
          <p style="color: #444; font-size: 16px; line-height: 1.5;">
            ${relance
              ? `<strong>${safeName}</strong> utilise <strong>Réviz</strong>, une application d'aide à la révision pour les collégiens et les lycéens, et attend toujours votre autorisation.`
              : `<strong>${safeName}</strong> vient de commencer à utiliser <strong>Réviz</strong>,
            une application d'aide à la révision pour les collégiens et les lycéens.`}
          </p>
          <p style="color: #444; font-size: 15px; line-height: 1.5;">
            ${relance
              ? `Sans votre autorisation d'ici ${jours}, son accès sera suspendu. Un clic suffit.`
              : `Votre enfant a indiqué avoir moins de 15 ans. La réglementation française
            (RGPD et loi Informatique et Libertés) demande l'autorisation d'un parent.
            Un clic suffit.`}
          </p>
          <div style="background: #F7F7F5; border-radius: 12px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              <strong>Ce que l'application collecte :</strong><br/>
              Prénom, adresse email, date de naissance, classe et leçons scannées (texte uniquement).
            </p>
          </div>
          <a href="${lien}" style="display: inline-block; background: #1A1A1A; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">Donner mon autorisation</a>
          <p style="color: #888; font-size: 13px; margin-top: 24px;">
            ${relance
              ? 'Vous confirmerez sur la page qui s\'ouvre.<br/>'
              : 'Vous confirmerez sur la page qui s\'ouvre. Ce lien est valable 10 jours.<br/>Sans votre autorisation sous 10 jours, l\'accès de votre enfant à Réviz est suspendu.<br/>'}<br/>
            <a href="https://app.revizapp.fr/legal/confidentialite" style="color: #888;">Politique de confidentialité</a>
          </p>
        </div>
      `,
  };
}

/**
 * Relance une fois chaque parent sans réponse depuis RELANCE_APRES_MS, tant que
 * l'accès de l'enfant n'est pas encore suspendu. Le lien de la demande reste
 * valable (10 jours depuis le dernier envoi), on le renvoie tel quel.
 * @returns {Promise<{ relances: number }>}
 */
export async function relancerParents({ db, envoyer, maintenant = Date.now() }) {
  // Pas de filtre côté Firestore : une requête de groupe filtrée demanderait un
  // index à publier. Les demandes en cours se comptent en dizaines.
  const demandes = await db.collectionGroup('parentalConsent').get();
  let relances = 0;
  for (const doc of demandes.docs) {
    const d = doc.data();
    if (d.status !== 'pending' || !d.token || !d.parentEmail || d.relanceLe) continue;
    const age = maintenant - (d.firstRequestedAt ?? d.createdAt ?? maintenant);
    if (age < RELANCE_APRES_MS || age >= DELAI_REPONSE_MS) continue;

    const uid = doc.ref.parent.parent.id;
    const profil = await db.collection('users').doc(uid).get().catch(() => null);
    const mail = mailParent({
      prenom: profil?.exists ? profil.data()?.prenom : null,
      lien: lienAutorisation(d.token, uid),
      joursRestants: Math.ceil((DELAI_REPONSE_MS - age) / JOUR_MS),
    });
    try {
      await envoyer({ from: EXPEDITEUR, to: d.parentEmail, ...mail });
      await doc.ref.update({ relanceLe: maintenant });
      relances++;
    } catch (err) {
      console.error('[relance-parent]', uid, err?.message || err);
    }
  }
  return { relances };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers?.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const resultat = await relancerParents({ db: getDb(), envoyer: m => resend.emails.send(m) });
      return res.status(200).json(resultat);
    } catch (err) {
      console.error('[relance-parent]', err?.message || err);
      return res.status(500).json({ error: 'RELANCE_FAILED' });
    }
  }
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
  // Les invités de la Battle sont des comptes anonymes jetables : ils ne
  // doivent pas pouvoir envoyer d'e-mails.
  if (decoded.firebase?.sign_in_provider === 'anonymous') {
    return res.status(403).json({ error: 'ANONYMOUS' });
  }

  // 2. Effort raisonnable (art. 8(2) RGPD) : le parent ne peut pas être l'enfant.
  if (decoded.email && decoded.email.toLowerCase() === email.toLowerCase()) {
    return res.status(400).json({ error: 'PARENT_EMAIL_IS_CHILD' });
  }

  try {
    const db = getDb();
    const docRef = db.collection('users').doc(uid)
      .collection('parentalConsent').doc('consent');
    const existing = await docRef.get();
    const d = existing.exists ? existing.data() : null;

    if (d) {
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
    const now = Date.now();
    await docRef.set({
      parentEmail: email,
      status: 'pending',
      token,
      createdAt: now,
      // Début du délai de réponse : conservé d'un renvoi à l'autre, sinon
      // chaque renvoi (ou un refus suivi d'un renvoi) rouvrirait le délai.
      firstRequestedAt: d?.firstRequestedAt ?? now,
      // Une seule relance par demande, même si l'élève renvoie entre-temps.
      ...(d?.relanceLe ? { relanceLe: d.relanceLe } : {}),
    });

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: EXPEDITEUR,
      to: email,
      ...mailParent({ prenom: childName, lien: lienAutorisation(token, uid) }),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[send-parental-consent]', err?.message || err);
    return res.status(500).json({ error: 'INTERNAL' });
  }
}
