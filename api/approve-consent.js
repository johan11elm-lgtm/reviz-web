// Vercel Serverless Function (Node runtime)
// GET  /api/approve-consent?token=xxx&uid=yyy → page de confirmation (NE MUTE RIEN)
// POST /api/approve-consent (form: token, uid, decision) → enregistre l'autorisation
//   decision = 'accepter' (défaut) | 'refuser'. Le refus n'est plus proposé au
//   parent (il lui suffit d'ignorer l'email) mais reste géré : il suspend l'accès.
//
// La mutation est volontairement réservée au POST : les scanners de liens / proxys
// de sécurité / prévisualisations d'email font des GET automatiques et pourraient
// sinon "approuver" le consentement à la place du parent (invalide juridiquement).
//
// Lien partagé par l'élève (api/_accordParent.js), quand il ne connaît pas l'adresse
// de son parent :
// GET  /api/approve-consent?uid=yyy&e=<expiration>&s=<signature>[&n=<score>&t=<total>]
//   → page où le parent saisit lui-même son adresse (NE MUTE RIEN non plus : les
//   messageries ouvrent le lien pour en faire un aperçu).
// POST /api/approve-consent (form: uid, e, s, parentEmail[, n, t]) → enregistre la
//   demande et envoie au parent l'e-mail d'autorisation habituel : c'est toujours
//   le clic dans cet e-mail qui vaut accord.

import { Resend } from 'resend';
import { getDb, getAuthAdmin } from './_firebaseAdmin.js';
import { jetonValide, JETON_CONSOMME, partageValide, scorePartage, demandeEnCours } from './_accordParent.js';
import { enregistrerDemande, prenomPourEmail } from './send-parental-consent.js';

export const config = { maxDuration: 30 };

const TOKEN_TTL_MS = 10 * 24 * 60 * 60 * 1000; // 10 jours, = délai de réponse (src/utils/consent.js)
const EMAIL_RE = /^\S+@\S+\.\S+$/;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** j•••@exemple.fr : rappeler une adresse sans l'afficher en entier. */
const masquer = e => String(e).replace(/^(.)[^@]*(@.*)$/, '$1•••$2');

const docConsent = (db, uid) => db.collection('users').doc(uid).collection('parentalConsent').doc('consent');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { token, uid, e, s } = req.query ?? {};
    if (!token && uid && e && s) return pagePartage(req, res);
    if (!token || !uid) {
      return res.status(400).send(page('Lien invalide', 'Ce lien est incomplet ou invalide.'));
    }
    // Aucune mutation sur GET : on affiche une page de confirmation (bouton → POST).
    return res.status(200).send(confirmPage(token, uid));
  }

  if (req.method === 'POST') {
    const { token, uid } = req.body ?? {};
    if (!token && uid && req.body?.e && req.body?.s) return envoiPartage(req, res);
    const refus = req.body?.decision === 'refuser';
    if (!token || !uid) {
      return res.status(400).send(page('Lien invalide', 'Ce lien est incomplet ou invalide.'));
    }

    try {
      const db = getDb();
      const docRef = docConsent(db, uid);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).send(page('Lien expiré', 'Ce lien n\'est plus valide.'));
      }
      const data = doc.data();

      if (data.status === 'approved') {
        return res.status(200).send(page('Déjà accepté', 'Vous avez déjà donné votre accord : votre enfant peut utiliser Réviz.'));
      }
      if (data.status === 'refused') {
        return res.status(200).send(page('Refus enregistré', 'Vous avez déjà refusé : l\'accès de votre enfant à Réviz est suspendu.'));
      }
      // Jeton absent (déjà consommé) ou différent → refus, en temps constant.
      if (!jetonValide(uid, data, token)) {
        return res.status(403).send(page('Lien invalide', 'Ce lien n\'est pas valide ou a déjà été utilisé.'));
      }
      if (data.createdAt && Date.now() - data.createdAt > TOKEN_TTL_MS) {
        return res.status(410).send(page('Lien expiré', 'Ce lien a expiré. Votre enfant peut en renvoyer un nouveau depuis l\'application.'));
      }

      // Décision + invalidation du jeton (usage unique).
      if (refus) {
        await docRef.update({ status: 'refused', refusedAt: Date.now(), ...JETON_CONSOMME });
        return res.status(200).send(page('Refus enregistré', 'C\'est noté : l\'accès de votre enfant à Réviz est suspendu. Si vous changez d\'avis, il pourra vous renvoyer une demande depuis l\'application.'));
      }
      await docRef.update({ status: 'approved', approvedAt: Date.now(), ...JETON_CONSOMME });
      return res.status(200).send(page('Merci !', 'Votre accord est enregistré : votre enfant peut continuer à utiliser Réviz.'));
    } catch (err) {
      console.error('[approve-consent]', err?.message || err);
      return res.status(500).send(page('Erreur', 'Une erreur est survenue. Réessayez plus tard.'));
    }
  }

  return res.status(405).send(page('Action non autorisée', 'Cette action n\'est pas autorisée.'));
}

// --- Lien partagé par l'élève ----------------------------------------------

const LIEN_PERIME = 'Ce lien n\'est plus valable. Votre enfant peut vous en envoyer un nouveau depuis l\'application.';

/** Prénom de l'élève (nettoyé) et état de sa demande, pour la page du lien. */
async function lireEleve(db, uid) {
  const [profil, consent] = await Promise.all([
    db.collection('users').doc(uid).get().catch(() => null),
    docConsent(db, uid).get(),
  ]);
  return {
    prenom: prenomPourEmail(profil?.exists ? profil.data()?.prenom : null),
    consent: consent.exists ? consent.data() : null,
  };
}

async function pagePartage(req, res) {
  const { uid, e, s, n, t } = req.query;
  if (!partageValide(uid, e, s)) return res.status(410).send(page('Lien expiré', LIEN_PERIME));
  try {
    const { prenom, consent } = await lireEleve(getDb(), uid);
    if (consent?.status === 'approved') {
      return res.status(200).send(page('Déjà accepté', 'Vous avez déjà donné votre accord : votre enfant peut utiliser Réviz.'));
    }
    return res.status(200).send(formulairePartage({ uid, e, s, prenom, consent, score: scorePartage({ score: n, total: t }) }));
  } catch (err) {
    console.error('[approve-consent:partage]', err?.message || err);
    return res.status(500).send(page('Erreur', 'Une erreur est survenue. Réessayez plus tard.'));
  }
}

async function envoiPartage(req, res) {
  const { uid, e, s, n, t } = req.body;
  if (!partageValide(uid, e, s)) return res.status(410).send(page('Lien expiré', LIEN_PERIME));
  const email = String(req.body.parentEmail ?? '').trim();
  const score = scorePartage({ score: n, total: t });
  try {
    const db = getDb();
    const { prenom, consent } = await lireEleve(db, uid);
    const refaire = erreur => res.status(400).send(formulairePartage({ uid, e, s, prenom, consent, score, erreur, saisie: email }));
    if (!EMAIL_RE.test(email) || email.length > 254) return refaire('Cette adresse e-mail ne semble pas valide.');
    // Effort raisonnable (art. 8(2) RGPD) : le parent ne peut pas être l'enfant.
    const eleve = await getAuthAdmin().getUser(uid).catch(() => null);
    if (!eleve) return res.status(404).send(page('Lien expiré', LIEN_PERIME));
    if (eleve.email && eleve.email.toLowerCase() === email.toLowerCase()) {
      return refaire('C\'est l\'adresse du compte de votre enfant. Indiquez la vôtre.');
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const r = await enregistrerDemande({ db, uid, email, prenom, resultat: score, envoyer: m => resend.emails.send(m), viaLien: true });
    if (r.alreadyApproved) {
      return res.status(200).send(page('Déjà accepté', 'Vous avez déjà donné votre accord : votre enfant peut utiliser Réviz.'));
    }
    if (r.rateLimited) {
      return res.status(429).send(page('Un instant', 'Un e-mail vient déjà de partir. Regardez dans votre boîte (et vos indésirables), ou réessayez dans une minute.'));
    }
    if (r.tropDEnvois) {
      return res.status(429).send(page('Trop de demandes', 'Plusieurs e-mails sont déjà partis depuis ce lien. Votre enfant peut vous renvoyer une demande depuis l\'application.'));
    }
    return res.status(200).send(page('C\'est envoyé',
      `Ouvrez l'e-mail que nous venons d'envoyer à ${email} (pensez aux indésirables) et touchez « Donner mon autorisation ». C'est ce qui vaut accord.`,
      { retour: false }));
  } catch (err) {
    console.error('[approve-consent:partage]', err?.message || err);
    return res.status(500).send(page('Erreur', 'Une erreur est survenue. Réessayez plus tard.'));
  }
}

// --- Pages HTML autonomes -------------------------------------------------

const STYLE = `body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F7F7F5;padding:16px;}
.card{background:#fff;border-radius:16px;padding:32px;max-width:440px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);}
h1{font-size:22px;color:#1A1A1A;margin:0 0 12px;}
p{color:#555;font-size:15px;line-height:1.5;margin:0 0 16px;}
.small{color:#999;font-size:13px;}
button{background:#1A1A1A;color:#fff;border:0;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;cursor:pointer;width:100%;margin:0 0 10px;}
a{color:#1A1A1A;font-weight:600;}
label{display:block;text-align:left;font-size:14px;font-weight:600;color:#1A1A1A;margin:0 0 6px;}
input[type=email]{box-sizing:border-box;width:100%;padding:13px 14px;border:1.5px solid #D5D3CE;border-radius:10px;font-size:16px;margin:0 0 12px;font-family:inherit;}
input[type=email]:focus{outline:3px solid #FFD2B0;border-color:#1A1A1A;}
.score{background:#FFE6D2;border-radius:14px;padding:14px 16px;margin:0 0 16px;}
.score b{display:block;font-size:26px;color:#1B1A23;}
.score span{font-size:14px;color:#444;}
.erreur{color:#B3261E;font-size:14px;text-align:left;margin:-4px 0 12px;}
.info{background:#F7F7F5;border-radius:12px;padding:12px 14px;text-align:left;font-size:13px;color:#666;margin:6px 0 0;}`;

function confirmPage(token, uid) {
  const t = escapeHtml(token), u = escapeHtml(uid);
  return `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Autorisation parentale — Réviz</title>
<style>${STYLE}</style></head>
<body><div class="card">
<h1>Réviz</h1>
<p>Votre enfant utilise <strong>Réviz</strong>, une application d'aide à la révision scolaire. Confirmez votre autorisation pour qu'il continue à l'utiliser.</p>
<form method="POST" action="/api/approve-consent">
<input type="hidden" name="token" value="${t}">
<input type="hidden" name="uid" value="${u}">
<button type="submit" name="decision" value="accepter">Donner mon autorisation</button>
</form>
<p class="small" style="margin-top:6px;">Sans votre autorisation sous 10 jours, l'accès de votre enfant à Réviz est suspendu.</p>
</div></body></html>`;
}

/**
 * La page du lien partagé : qui demande, pourquoi, et un seul champ (l'adresse du parent).
 * Le titre et la description servent aussi à l'aperçu du lien dans la messagerie.
 */
function formulairePartage({ uid, e, s, prenom, consent, score, erreur = '', saisie = '' }) {
  const nom = escapeHtml(prenom || 'Votre enfant');
  const dejaParti = demandeEnCours(consent) && consent?.parentEmail;
  const cache = (k, v) => `<input type="hidden" name="${k}" value="${escapeHtml(v)}">`;
  return `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Réviz : votre accord pour les révisions de votre enfant</title>
<meta property="og:title" content="Réviz : votre accord pour les révisions de votre enfant">
<meta property="og:description" content="Votre enfant révise ses cours avec Réviz. Avant 15 ans, il faut l'accord d'un parent : une minute suffit.">
<meta property="og:image" content="https://app.revizapp.fr/icon-512.png">
<style>${STYLE}</style></head>
<body><div class="card">
<h1>${prenom ? `${nom} a besoin de votre accord` : 'Votre enfant a besoin de votre accord'}</h1>
${score ? `<div class="score"><span>${nom} voulait vous montrer ça</span><b>${score.score} / ${score.total}</b><span>à son dernier quiz sur Réviz.</span></div>` : ''}
<p>${nom} révise ses cours avec <strong>Réviz</strong>, une application d'aide à la révision pour les collégiens. Avant 15 ans, la loi demande l'accord d'un parent.</p>
${dejaParti ? `<p class="small">Une demande est déjà partie à ${escapeHtml(masquer(consent.parentEmail))}. Regardez dans vos e-mails (et vos indésirables), ou renvoyez-la ci-dessous.</p>` : ''}
<form method="POST" action="/api/approve-consent">
${cache('uid', uid)}${cache('e', e)}${cache('s', s)}${score ? cache('n', score.score) + cache('t', score.total) : ''}
<label for="parentEmail">Votre adresse e-mail</label>
<input id="parentEmail" type="email" name="parentEmail" required autocomplete="email" inputmode="email" placeholder="votre adresse e-mail" value="${escapeHtml(saisie)}">
${erreur ? `<p class="erreur" role="alert">${escapeHtml(erreur)}</p>` : ''}
<button type="submit">Recevoir le lien d'accord</button>
</form>
<p class="small">Vous recevez tout de suite un e-mail avec le bouton « Donner mon autorisation ».</p>
<p class="info"><strong>Ce que l'application collecte :</strong> prénom, adresse e-mail, date de naissance, classe et leçons scannées (texte uniquement). Sans publicité.<br>
<a href="https://app.revizapp.fr/legal/confidentialite">Politique de confidentialité</a></p>
</div></body></html>`;
}

function page(title, message, { retour = true } = {}) {
  return `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${escapeHtml(title)} — Réviz</title>
<style>${STYLE}</style></head>
<body><div class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>
${retour ? '<a href="https://app.revizapp.fr">← Retour à Réviz</a>' : ''}</div></body></html>`;
}
