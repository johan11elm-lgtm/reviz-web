import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { emailEnAttente, oublierEmailEnAttente } from '../services/emailEnAttente';
import { auth } from '../services/firebaseConfig';
import { mesurer } from '../services/mesure';
import { suggererEmail, adresseExemple, boiteMail } from '../utils/adresseEmail';
import { MailIcon } from './Icons';
import './CarteEmail.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Ce que l'e-mail débloque, selon l'endroit où l'élève a été arrêté.
const RAISONS = {
  ia: { titre: 'Confirme ton e-mail pour parler à Réviz IA', sous: 'Un clic sur le lien reçu, et tu peux lui poser ta question.' },
  scan: { titre: 'Confirme ton e-mail pour scanner la suite', sous: 'Ta leçon d’essai est faite. Un clic sur le lien reçu, et tu scannes les suivantes.' },
  revizplus: { titre: 'Confirme ton e-mail pour prendre Réviz+', sous: 'Un clic sur le lien reçu, et tu peux continuer.' },
  general: { titre: 'Confirme ton e-mail', sous: 'Il débloque Réviz IA et le scan de tes leçons.' },
};

/**
 * Vrai pour un compte e-mail + mot de passe pas encore confirmé : Réviz IA, le scan (après
 * l'essai) et Réviz+ l'attendent (api/_compteVerifie.js). Google, Apple, Microsoft et TikTok
 * sont confirmés d'office.
 */
export function useEmailAConfirmer() {
  const { currentUser, isGuest } = useAuth() ?? {};
  return !!currentUser && !isGuest && !currentUser.emailVerified
    && !!currentUser.providerData?.some(p => p.providerId === 'password');
}

/**
 * Carte d'activation de l'e-mail, posée là où l'e-mail bloque (Réviz IA, scan, Réviz+) : à quelle
 * adresse le lien est parti, ouvrir sa messagerie, renvoyer, et corriger une adresse mal tapée
 * (une sur cinq, octobre 2026). Revient de la messagerie → on revérifie tout seul.
 * @param {'ia'|'scan'|'revizplus'|'general'} raison  ce que l'e-mail débloque ici
 * @param {boolean} [nu]           sans le cadre ni le titre (la page a déjà les siens)
 * @param {() => void} [onConfirme] e-mail confirmé (jeton déjà rafraîchi)
 * @param {string} [note]          une ligne de plus sous le texte (« Ta question t'attend »)
 */
export function CarteEmail({ raison = 'general', nu = false, onConfirme, note, className = '' }) {
  const { currentUser, resendVerificationEmail, corrigerEmail, actualiserCompte } = useAuth();
  const [enAttente, setEnAttente] = useState(() => emailEnAttente(currentUser?.uid));
  const adresse = enAttente ?? currentUser?.email ?? '';
  const boite = boiteMail(adresse);
  // Faute de frappe repérée dans l'adresse du lien (« gmial.com ») : la correction en un toucher.
  const faute = suggererEmail(adresse);

  const [renvoi, setRenvoi] = useState('');      // '' | 'envoi' | 'envoye'
  const [verif, setVerif] = useState('');        // '' | 'verif' | 'pas-encore'
  const [corriger, setCorriger] = useState(false);
  const [nouvelle, setNouvelle] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [besoinMdp, setBesoinMdp] = useState(false);
  const [erreur, setErreur] = useState('');
  const [envoiCorrection, setEnvoiCorrection] = useState(false);
  const [corrigee, setCorrigee] = useState(false);
  const confirme = useRef(onConfirme);
  confirme.current = onConfirme;

  useEffect(() => { mesurer('email_carte', { raison, action: 'vue' }); }, [raison]);

  // Relit le compte : true si l'e-mail est confirmé (le serveur lit le jeton, on le rafraîchit).
  async function relire() {
    // Adresse changée par le lien : Firebase peut fermer la session (reload échoue). L'aiguillage
    // des pages (App.jsx) mène alors à la connexion, la nouvelle adresse déjà remplie.
    try { await auth.currentUser?.reload(); } catch { return false; }
    if (!auth.currentUser?.emailVerified) return false;
    await auth.currentUser.getIdToken(true);
    oublierEmailEnAttente();
    mesurer('email_verifie', { raison });
    actualiserCompte?.();
    confirme.current?.();
    return true;
  }

  useEffect(() => {
    async function revoir() {
      if (document.visibilityState === 'visible') await relire().catch(() => {});
    }
    revoir();
    document.addEventListener('visibilitychange', revoir);
    return () => document.removeEventListener('visibilitychange', revoir);
  }, []);

  async function jaiConfirme() {
    setVerif('verif');
    const ok = await relire().catch(() => false);
    setVerif(ok ? '' : 'pas-encore');
  }

  // vers : l'adresse corrigée en attente, dont on renvoie le lien (null : l'adresse du compte).
  async function renvoyer(vers = enAttente) {
    setRenvoi('envoi');
    mesurer('email_carte', { raison, action: 'renvoi' });
    try {
      // Après une correction, c'est le lien vers la nouvelle adresse qu'on renvoie.
      if (vers) await corrigerEmail(vers);
      else await resendVerificationEmail();
      setRenvoi('envoye');
      setTimeout(() => setRenvoi(''), 5000);
    } catch (err) {
      setRenvoi('');
      if (err?.code === 'auth/requires-recent-login') {
        setCorriger(true);
        setNouvelle(vers);
        setBesoinMdp(true);
        setErreur('Pour renvoyer le lien, entre ton mot de passe Réviz.');
      } else {
        setErreur('L’e-mail n’est pas parti. Réessaie dans une minute.');
      }
    }
  }

  const suggestion = suggererEmail(nouvelle);

  async function envoyerCorrection(e) {
    e.preventDefault();
    const valeur = nouvelle.trim();
    setErreur('');
    if (!EMAIL_RE.test(valeur)) return setErreur('Cette adresse n’est pas complète.');
    if (adresseExemple(valeur)) return setErreur('C’est une adresse d’exemple : mets la tienne.');
    if (valeur.toLowerCase() === adresse.toLowerCase()) return setErreur('C’est déjà cette adresse. Renvoie plutôt le lien.');
    // Retour à l'adresse du compte (après une correction) : son lien de confirmation repart.
    if (valeur.toLowerCase() === currentUser?.email?.toLowerCase()) {
      oublierEmailEnAttente();
      setEnAttente(null);
      setCorriger(false);
      setNouvelle('');
      return renvoyer(null);
    }
    if (besoinMdp && !motDePasse) return setErreur('Entre ton mot de passe Réviz.');
    setEnvoiCorrection(true);
    try {
      await corrigerEmail(valeur, besoinMdp ? motDePasse : undefined);
      mesurer('email_carte', { raison, action: 'correction' });
      setEnAttente(valeur);
      setCorrigee(true);
      setCorriger(false);
      setNouvelle('');
      setMotDePasse('');
      setBesoinMdp(false);
    } catch (err) {
      if (err?.code === 'auth/requires-recent-login') {
        setBesoinMdp(true);
        setErreur('Pour changer d’adresse, entre ton mot de passe Réviz.');
      } else if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setErreur('Mot de passe incorrect. Réessaie.');
      } else if (err?.code === 'auth/invalid-email') {
        setErreur('Cette adresse n’est pas valide.');
      } else if (err?.code === 'auth/too-many-requests') {
        setErreur('Trop d’essais d’un coup. Réessaie dans quelques minutes.');
      } else {
        setErreur('Ça n’est pas passé. Vérifie ta connexion et réessaie.');
      }
    } finally {
      setEnvoiCorrection(false);
    }
  }

  const { titre, sous } = RAISONS[raison] ?? RAISONS.general;
  const corps = (
    <>
      <div className="ce-adresse">
        <span className="ce-adresse-libelle">{corrigee ? 'Nouveau lien envoyé à' : 'Lien envoyé à'}</span>
        <b className="ce-adresse-mail">{adresse}</b>
        {enAttente && <span className="ce-adresse-note">Clique sur le lien reçu à cette adresse : elle remplacera l’ancienne et ton compte sera confirmé.</span>}
        {faute && !corriger && (
          <span className="ce-adresse-faute">
            Faute de frappe ? <button type="button" onClick={() => { setCorriger(true); setNouvelle(faute); setErreur(''); mesurer('email_carte', { raison, action: 'faute' }); }}>Corriger en {faute}</button>
          </span>
        )}
      </div>

      {corriger ? (
        <form className="ce-corriger" onSubmit={envoyerCorrection} noValidate>
          <label className="ce-label" htmlFor={`ce-nouvelle-${raison}`}>Ta bonne adresse</label>
          <input id={`ce-nouvelle-${raison}`} className="ce-input" type="email" value={nouvelle} autoFocus
            onChange={ev => { setNouvelle(ev.target.value); setErreur(''); }}
            autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="ton adresse e-mail" />
          {suggestion && (
            <p className="ce-suggestion">Tu voulais dire <button type="button" onClick={() => setNouvelle(suggestion)}>{suggestion}</button> ?</p>
          )}
          {besoinMdp && (
            <>
              <label className="ce-label" htmlFor={`ce-mdp-${raison}`}>Ton mot de passe Réviz</label>
              <input id={`ce-mdp-${raison}`} className="ce-input" type="password" value={motDePasse}
                onChange={ev => { setMotDePasse(ev.target.value); setErreur(''); }} autoComplete="current-password" />
            </>
          )}
          {erreur && <p className="ce-erreur" role="alert">{erreur}</p>}
          <button type="submit" className="ce-btn" disabled={envoiCorrection || !nouvelle.trim()}>
            {envoiCorrection ? 'Envoi…' : 'Envoyer le lien à cette adresse'}
          </button>
          <button type="button" className="ce-lien" onClick={() => { setCorriger(false); setErreur(''); }}>Annuler</button>
        </form>
      ) : (
        <>
          <div className="ce-actions">
            {boite && (
              <a className="ce-btn" href={boite.url} target="_blank" rel="noreferrer"
                onClick={() => mesurer('email_carte', { raison, action: 'boite' })}>
                Ouvrir {boite.nom}
              </a>
            )}
            <button type="button" className={boite ? 'ce-btn ce-btn--blanc' : 'ce-btn'} onClick={jaiConfirme} disabled={verif === 'verif'}>
              {verif === 'verif' ? 'Vérification…' : 'J’ai confirmé mon e-mail'}
            </button>
          </div>
          {verif === 'pas-encore' && (
            <p className="ce-retour" role="status">Pas encore confirmé. Clique sur le lien dans l’e-mail (regarde aussi dans les spams), puis reviens ici.</p>
          )}
          {erreur && <p className="ce-erreur" role="alert">{erreur}</p>}
          <div className="ce-liens">
            <button type="button" className="ce-lien" onClick={() => renvoyer()} disabled={renvoi !== ''}>
              {renvoi === 'envoi' ? 'Envoi…' : renvoi === 'envoye' ? 'E-mail renvoyé' : 'Renvoyer l’e-mail'}
            </button>
            <button type="button" className="ce-lien" onClick={() => { setCorriger(true); setErreur(''); mesurer('email_carte', { raison, action: 'corriger' }); }}>
              Pas la bonne adresse ? Corriger
            </button>
          </div>
        </>
      )}
    </>
  );

  if (nu) return <div className={`ce ce--nu ${className}`.trim()}>{corps}</div>;
  return (
    <section className={`ce ce--carte ${className}`.trim()} aria-label="Confirmer ton e-mail">
      <div className="ce-tete">
        <span className="ce-rond" aria-hidden="true"><MailIcon /></span>
        <span className="ce-tete-txt">
          <b>{titre}</b>
          <span>{sous}</span>
          {note && <span className="ce-note">{note}</span>}
        </span>
      </div>
      {corps}
    </section>
  );
}
