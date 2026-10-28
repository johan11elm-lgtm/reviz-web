// -------------------------------------------------------
// Réviz — Bilan au parent (J+3)
//
// Appelé par le cron quotidien de api/send-parental-consent.js (16 h UTC).
// Un e-mail, une seule fois, au parent dont l'élève (moins de 15 ans) a
// donné l'adresse : ce que son enfant a révisé depuis son arrivée sur Réviz.
// Premier contact avec le parent en dehors du consentement (plan de scaling
// du 27/10, phase 1) : un bilan, sans offre ni publicité, auquel il peut
// répondre (les réponses arrivent chez Johan).
// Règles :
// - compte créé il y a 3 à 15 jours (users/{uid}.createdAt) ;
// - parent qui a donné son accord, ou demande en cours dont le lien est
//   encore valable : le bilan porte alors le bouton d'autorisation. Jamais
//   après un refus, ni une fois l'accès suspendu ;
// - demande au parent partie la veille au plus tôt, pas de relance le même
//   jour : jamais deux e-mails de Réviz au parent dans la journée ;
// - au moins une révision ou une partie du jour depuis l'arrivée, sinon on
//   attend (rien à raconter) ;
// - jamais deux fois (users/{uid}.bilanParentLe), jamais après « Ne plus
//   recevoir de bilan » (users/{uid}.bilansParent = false, lien signé traité
//   par api/track.js).
// Le parent voit les chapitres et les formats, pas les scores : le bilan
// montre l'effort, il ne sert pas à surveiller les notes.
// -------------------------------------------------------
import { consentGate, JOUR_MS, DELAI_REPONSE_MS } from '../src/utils/consent.js'
import { jourParis } from '../src/utils/retour.js'
import { C, POLICE, escapeHtml, prenomPropre, titrePropre, signatureDesabo } from './_rappels.js'

// Fenêtre d'âge du compte : dès J+3, et jusqu'à la fin du délai pour donner
// l'adresse d'un parent (un parent donné tard reçoit son bilan plus tard).
export const AGE_MIN_MS = 3 * JOUR_MS
export const AGE_MAX_MS = 15 * JOUR_MS
const APP = 'https://app.revizapp.fr'
const EXPEDITEUR = 'Réviz <noreply@revizapp.fr>'
// Les réponses des parents arrivent chez Johan (adresse redirigée par ImprovMX).
export const REPONDRE_A = 'johan@revizapp.fr'
export const PORTEE_DESABO = 'bilans-parent'
// Réviz qui prend des notes dans son carnet (servie par l'app).
const MASCOTTE = `${APP}/mascot/pose-6-writing@256.png`
const MAX_CHAPITRES = 5
const LECON_ID_OK = /^[^/]{1,200}$/

export function lienDesaboParent(uid, secret = process.env.CRON_SECRET) {
  const t = signatureDesabo(uid, secret, PORTEE_DESABO)
  return t ? `${APP}/api/track?op=desabonner&qui=parent&uid=${encodeURIComponent(uid)}&t=${t}` : null
}

/**
 * Date en millisecondes. users/{uid}.createdAt est un Timestamp Firestore
 * (serverTimestamp, src/services/userProfileService.js) ; d'anciens comptes
 * gardent un nombre (Date.now()).
 */
export function enMs(v) {
  if (Number.isFinite(v)) return v
  const ms = typeof v?.toMillis === 'function' ? v.toMillis() : NaN
  return Number.isFinite(ms) ? ms : null
}

const FORMATS = { quiz: 'quiz', flashcards: 'flashcards', resume: 'résumé', mindmap: 'carte mentale' }

/**
 * Ce que l'élève a fait entre `depuis` et `maintenant` : jours de révision,
 * chapitres (du plus récent au plus ancien) avec leurs formats, quiz menés
 * jusqu'au bout, parties du jour (users/{uid}.jeux.jours).
 * @param {{ revisions: object[], jeux?: object|null, depuis: number, maintenant: number }} p
 */
export function resumeActivite({ revisions, jeux = null, depuis, maintenant }) {
  const jours = new Set()
  const chapitres = new Map()
  let quizTermines = 0
  for (const r of revisions) {
    if (!Number.isFinite(r?.revisedAt) || r.revisedAt < depuis || r.revisedAt > maintenant) continue
    jours.add(jourParis(new Date(r.revisedAt)))
    const cle = r.lessonId ?? (r.chapterId ? `prog-${r.chapterId}` : null)
    if (!cle) continue
    const ch = chapitres.get(cle) ?? { lessonId: cle, classe: r.classe ?? null, matiere: r.matiere ?? null, formats: new Set(), quizTermine: false, derniere: 0 }
    if (FORMATS[r.type]) ch.formats.add(r.type)
    // Un quiz n'est enregistré avec son total qu'à la dernière question.
    if (r.type === 'quiz' && Number.isFinite(r.total) && r.total > 0) {
      quizTermines++
      ch.quizTermine = true
    }
    ch.derniere = Math.max(ch.derniere, r.revisedAt)
    chapitres.set(cle, ch)
  }
  const debut = jourParis(new Date(depuis))
  const fin = jourParis(new Date(maintenant))
  const parties = Array.isArray(jeux?.jours) ? jeux.jours.filter(j => typeof j === 'string' && j >= debut && j <= fin).length : 0
  return {
    joursRevision: jours.size,
    chapitres: [...chapitres.values()].sort((a, b) => b.derniere - a.derniere),
    quizTermines,
    parties,
  }
}

const date = (t, options) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', ...options }).format(t)
const nb = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`
const majuscule = s => s.charAt(0).toUpperCase() + s.slice(1)
// « que Léa », mais « qu'Inès ».
const que = nom => (/^[aeiouyàâäéèêëîïôöûü]/i.test(nom) ? `qu'${nom}` : `que ${nom}`)
// « 5ème » → « 5e » ; le reste (« Seconde », « 1ère »…) tel quel.
const classeLisible = c => String(c).replace(/^(\d)ème$/, '$1e')

/**
 * Le mail : sujet et HTML (styles en ligne, tableau : les clients mail n'aiment rien d'autre).
 * @param {{
 *   prenom?: string|null, classe?: string|null, depuis: number, maintenant: number,
 *   resume: ReturnType<typeof resumeActivite>,
 *   autorisation?: { lien: string, jusquau: number }|null, desabo?: string|null,
 * }} p
 *   resume.chapitres[].titre : titre de la leçon, lu dans users/{uid}/lessons.
 */
export function mailBilanParent({ prenom = null, classe = null, depuis, maintenant, resume, autorisation = null, desabo = null }) {
  const propre = prenomPropre(prenom)
  const nom = propre ? escapeHtml(propre) : 'votre enfant'
  const Nom = propre ? nom : 'Votre enfant'
  // « lundi » dans la semaine, « le 14 octobre » au-delà.
  const quand = maintenant - depuis < 6 * JOUR_MS ? date(depuis, { weekday: 'long' }) : `le ${date(depuis, { day: 'numeric', month: 'long' })}`
  const arrivee = date(depuis, { weekday: 'long', day: 'numeric', month: 'long' })
  const { chapitres, joursRevision, quizTermines, parties } = resume
  const revise = chapitres.length > 0
  // Le chiffre et son mot restent sur la même ligne (« 3 chapitres »).
  const surligne = txt => `<span style="background:${C.surligneur}; padding:0 5px; border-radius:4px; white-space:nowrap;">${txt}</span>`

  const subject = `Ce ${que(propre ?? 'votre enfant')} ${revise ? 'a révisé' : 'a fait sur Réviz'} depuis ${quand}`
  const titre = revise
    ? `${Nom} a révisé ${surligne(nb(chapitres.length, 'chapitre', 'chapitres'))} depuis ${quand}.`
    : `${Nom} a joué ${surligne(nb(parties, 'partie du jour', 'parties du jour'))} depuis ${quand}.`
  const apercu = revise
    ? [nb(chapitres.length, 'chapitre', 'chapitres'), quizTermines ? nb(quizTermines, 'quiz terminé', 'quiz terminés') : null, nb(joursRevision, 'jour de révision', 'jours de révision')].filter(Boolean).join(', ')
    : 'La partie du jour : un mini-jeu sur le programme, chaque jour.'
  const programme = classe ? `le programme de ${escapeHtml(classeLisible(classe))}` : 'ses cours'

  const p = (txt, extra = '') => `<p style="margin:0 0 14px; font-family:${POLICE}; font-size:16px; line-height:1.55; color:${C.texte};${extra}">${txt}</p>`
  const surtitre = (txt, extra = '') => `<div style="font-family:${POLICE}; font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:${C.muet};${extra}">${txt}</div>`

  const chiffres = [
    [joursRevision, 'jour de révision', 'jours de révision'],
    [chapitres.length, 'chapitre revu', 'chapitres revus'],
    quizTermines || !parties ? [quizTermines, 'quiz terminé', 'quiz terminés'] : [parties, 'partie du jour', 'parties du jour'],
  ]
  const blocChiffres = !revise ? '' : `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px; background:${C.fond}; border-radius:14px;"><tr>
            ${chiffres.map(([n, un, plusieurs]) => `<td width="33%" align="center" style="padding:14px 6px; vertical-align:top;">
              <div style="font-family:${POLICE}; font-size:26px; font-weight:800; line-height:1.1; color:${C.encre};">${n}</div>
              <div style="font-family:${POLICE}; font-size:12px; line-height:1.35; color:${C.second}; margin-top:4px;">${n > 1 ? plusieurs : un}</div>
            </td>`).join('')}
          </tr></table>`

  const ligneChapitre = ch => {
    const t = ch.titre ? escapeHtml(ch.titre) : `Une leçon${ch.matiere ? ` de ${escapeHtml(ch.matiere)}` : ''}`
    const ou = [ch.matiere, ch.classe ? classeLisible(ch.classe) : null].filter(Boolean).map(escapeHtml).join(' · ')
    const faits = Object.keys(FORMATS).filter(f => ch.formats.has(f)).map(f => (f === 'quiz' && ch.quizTermine ? 'quiz terminé' : FORMATS[f]))
    const detail = [ou, faits.length ? majuscule(faits.join(', ')) : null].filter(Boolean).join(' — ')
    return `<tr><td style="padding:12px 0; border-top:1px solid ${C.filet};">
              <div style="font-family:${POLICE}; font-size:15px; line-height:1.4; font-weight:700; color:${C.texte};">${t}</div>
              ${detail ? `<div style="font-family:${POLICE}; font-size:13px; line-height:1.45; color:${C.second}; margin-top:2px;">${detail}</div>` : ''}
            </td></tr>`
  }
  const autres = chapitres.length - MAX_CHAPITRES
  const blocChapitres = !revise ? '' : `
          ${surtitre('Ses chapitres', ' margin:0 0 6px;')}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px;">
            ${chapitres.slice(0, MAX_CHAPITRES).map(ligneChapitre).join('')}
          </table>
          ${autres > 0 ? p(`Et ${nb(autres, 'autre chapitre', 'autres chapitres')}.`, ` font-size:14px; color:${C.second};`) : ''}
          ${parties ? p(`Et ${nb(parties, 'partie du jour', 'parties du jour')}, le mini-jeu quotidien sur le programme.`, ` font-size:14px; color:${C.second};`) : ''}`

  const blocAutorisation = !autorisation ? '' : `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px; border:1.5px solid ${C.encre}; border-radius:14px;"><tr><td style="padding:16px 16px 4px;">
            ${surtitre('Il manque votre accord', ` color:${C.encre};`)}
            ${p(`${Nom} a moins de 15 ans : pour continuer à utiliser Réviz après le ${date(autorisation.jusquau, { weekday: 'long', day: 'numeric', month: 'long' })}, il lui faut l'accord d'un parent. Un clic suffit.`, ' margin:8px 0 14px; font-size:15px;')}
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px;"><tr><td style="background:${C.encre}; border-radius:12px;">
              <a href="${escapeHtml(autorisation.lien)}" style="display:inline-block; padding:14px 24px; font-family:${POLICE}; font-size:15px; font-weight:700; color:#FFFFFF; text-decoration:none;">Donner mon autorisation →</a>
            </td></tr></table>
          </td></tr></table>`

  return {
    subject,
    html: `
<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0; padding:0; background:${C.fond};">
  <div style="display:none; max-height:0; overflow:hidden; color:${C.fond};">${escapeHtml(apercu)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fond}; padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:${C.carte}; border-radius:20px; overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td style="vertical-align:middle;">
              ${surtitre('Réviz · les premiers jours')}
              <h1 style="margin:10px 0 0; font-family:${POLICE}; font-size:24px; line-height:1.25; font-weight:800; color:${C.texte};">${titre}</h1>
            </td>
            <td width="96" style="vertical-align:top; padding-left:12px;">
              <img src="${MASCOTTE}" width="88" height="88" alt="Réviz, le cerveau, qui prend des notes" style="display:block; width:88px; height:auto; border:0;">
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:12px 28px 0;">
          ${p('Bonjour,')}
          ${p(`${Nom} utilise Réviz depuis le ${arrivee} pour réviser ${programme} : des quiz, des flashcards et des résumés, chapitre par chapitre. Voici ses premiers jours.`)}
          ${blocChiffres}
          ${blocChapitres}
          ${blocAutorisation}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 22px;"><tr><td style="background:${C.surligneur}; border-radius:14px; padding:16px;">
            ${surtitre('Le coup de pouce qui marche', ` color:${C.encre};`)}
            ${p(`Demandez-lui de vous expliquer ${revise ? 'un de ces chapitres' : 'un chapitre vu en classe cette semaine'} en deux minutes, à table ou en voiture. Redire avec ses mots ce qu'on vient de revoir, c'est la meilleure révision qui soit.`, ' margin:8px 0 10px; font-size:15px;')}
            ${p('Ensuite, le plus important est de revenir un peu, souvent : trois minutes le lendemain valent mieux qu\'une heure la veille du contrôle.', ' margin:0; font-size:15px;')}
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:0 28px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.filet};"><tr><td style="padding-top:16px;">
            ${p('Une question, une remarque sur Réviz ? Répondez simplement à ce message : c\'est moi qui lis les réponses.', ` margin:0; font-size:14px; color:${C.second};`)}
            ${p('Johan, de Réviz', ` margin:12px 0 0; font-size:14px; font-weight:700; color:${C.encre};`)}
          </td></tr></table>
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;"><tr><td style="padding:16px 20px 0; font-family:${POLICE}; font-size:12px; line-height:1.6; color:${C.muet};">
        Vous recevez ce bilan parce ${que(nom)} a donné votre adresse comme parent sur Réviz. Il n'est envoyé qu'une fois, sans publicité.<br/>
        ${desabo ? `<a href="${escapeHtml(desabo)}" style="color:${C.muet};">Ne plus recevoir de bilan</a> · ` : ''}<a href="${APP}/legal/confidentialite" style="color:${C.muet};">Politique de confidentialité</a> · <a href="${APP}" style="color:${C.muet};">app.revizapp.fr</a>
      </td></tr></table>
    </td></tr>
  </table>
</body></html>`,
  }
}

/** Titres des chapitres affichés, lus dans users/{uid}/lessons (sinon : « Une leçon de … »). */
export async function avecTitres(ref, chapitres) {
  return Promise.all(chapitres.slice(0, MAX_CHAPITRES).map(async ch => {
    if (!LECON_ID_OK.test(ch.lessonId)) return ch
    const lecon = await ref.collection('lessons').doc(ch.lessonId).get().catch(() => null)
    const l = lecon?.exists ? lecon.data() ?? {} : {}
    return {
      ...ch,
      titre: titrePropre(l.metadata?.title),
      matiere: ch.matiere ?? titrePropre(l.matiere ?? l.metadata?.subject),
      classe: ch.classe ?? l.classe ?? null,
    }
  })).then(premiers => [...premiers, ...chapitres.slice(MAX_CHAPITRES)])
}

/**
 * Parcourt les demandes d'autorisation parentale et envoie le bilan à ceux qui y ont droit.
 * @param {{
 *   db, envoyer, lienAutorisation: (token:string, uid:string) => string,
 *   auth?: { getUser }|null, maintenant?: number, secret?: string, journal?: (m:string)=>void,
 * }} p
 *   envoyer : ({ from, to, replyTo, subject, html, headers }) => Promise ; une réponse
 *   { error } de Resend compte comme un échec (pas de marque, nouvel essai demain).
 *   auth (firebase-admin) écarte les comptes supprimés ou désactivés.
 * @returns {Promise<{ bilansParent: number }>}
 */
export async function envoyerBilansParent({ db, envoyer, lienAutorisation, auth = null, maintenant = Date.now(), secret = process.env.CRON_SECRET, journal = m => console.error(m) }) {
  // Pas de filtre côté Firestore (même raison que relancerParents : pas d'index à publier).
  const demandes = await db.collectionGroup('parentalConsent').get()
  let bilansParent = 0
  for (const doc of demandes.docs) {
    const d = doc.data()
    if (!d.parentEmail || (d.status !== 'approved' && d.status !== 'pending')) continue
    const derniereDemande = d.createdAt ?? d.firstRequestedAt
    if (!derniereDemande || maintenant - derniereDemande < JOUR_MS) continue
    if (d.relanceLe && maintenant - d.relanceLe < JOUR_MS) continue
    const gate = consentGate({ under15: true, consent: d, now: maintenant })
    if (gate.blocked) continue
    const enAttente = d.status === 'pending'
    if (enAttente && !d.token) continue

    const uid = doc.ref.parent.parent.id
    try {
      const ref = db.collection('users').doc(uid)
      const profil = await ref.get()
      if (!profil.exists) continue
      const u = profil.data() ?? {}
      if (u.bilanParentLe || u.bilansParent === false) continue
      const depuis = enMs(u.createdAt)
      if (depuis == null) continue
      const age = maintenant - depuis
      if (age < AGE_MIN_MS || age >= AGE_MAX_MS) continue
      if (auth?.getUser) {
        const compte = await auth.getUser(uid).catch(() => null)
        if (!compte || compte.disabled) continue
      }

      const revs = await ref.collection('revisions').where('revisedAt', '>=', depuis).get()
      const resume = resumeActivite({ revisions: revs.docs.map(r => r.data()), jeux: u.jeux, depuis, maintenant })
      if (!resume.chapitres.length && !resume.parties) continue
      resume.chapitres = await avecTitres(ref, resume.chapitres)

      const desabo = lienDesaboParent(uid, secret)
      const mail = mailBilanParent({
        prenom: u.prenom, classe: u.level?.classe ?? null, depuis, maintenant, resume, desabo,
        autorisation: enAttente
          ? { lien: lienAutorisation(d.token, uid), jusquau: (d.firstRequestedAt ?? d.createdAt) + DELAI_REPONSE_MS }
          : null,
      })
      const r = await envoyer({
        from: EXPEDITEUR, to: d.parentEmail, replyTo: REPONDRE_A, ...mail,
        ...(desabo ? { headers: { 'List-Unsubscribe': `<${desabo}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
      })
      if (r?.error) throw new Error(r.error.message || 'envoi refusé')
      await ref.update({ bilanParentLe: maintenant })
      bilansParent++
    } catch (err) {
      journal(`[bilan-parent] ${uid} : ${err?.message || err}`)
    }
  }
  return { bilansParent }
}
