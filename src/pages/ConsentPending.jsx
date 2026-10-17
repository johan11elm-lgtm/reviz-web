import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendParentalConsent, consentErrorMessage } from '../services/consentService';
import { track } from '../services/statsService';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { Mascot } from '../components/Mascot';
import './Inscription.css';
import './ConsentPending.css';

// Écran de l'email du parent pour un <15 ans. Choisi librement pendant les
// 15 jours pour le donner (« a-fournir », avec « Plus tard ») ; imposé quand
// l'accès est suspendu : délai d'adresse écoulé, délai de réponse écoulé, ou
// refus du parent. Pendant l'attente de la réponse, l'app reste ouverte.
const TEXTES = {
  'a-fournir': {
    titre: 'Une dernière chose',
    intro: (jours) => `Comme tu as moins de 15 ans, un de tes parents doit donner son accord par email. Pas son adresse sous la main ? Commence quand même : il te reste ${jours} jour${jours > 1 ? 's' : ''} pour la donner.`,
    bouton: 'Envoyer et commencer',
    pose: 'retour',
  },
  'a-demander': {
    titre: 'Ton compte est en pause',
    intro: 'Les 15 jours pour donner l\'email d\'un de tes parents sont passés. Donne-le maintenant : tu retrouves tout dès l\'envoi.',
    bouton: 'Envoyer et reprendre',
    pose: 'retour',
  },
  'sans-reponse': {
    titre: 'Ton parent n\'a pas encore répondu',
    intro: 'Sans son accord, ton accès est en pause. Demande-lui de regarder ses emails (et ses spams), ou renvoie la demande.',
    bouton: 'Renvoyer la demande',
    pose: 'thinking',
  },
  refuse: {
    titre: 'Ton parent n\'a pas donné son accord',
    intro: 'Ton accès à Réviz est en pause. Si c\'était une erreur, parles-en avec lui puis renvoie la demande.',
    bouton: 'Renvoyer la demande',
    pose: 'confused',
  },
};

// Ce qui se passe ensuite, dit simplement (colonne de gauche sur ordinateur).
const ETAPES = [
  <>Ton parent reçoit un <strong>email de Réviz</strong> avec un bouton pour accepter.</>,
  <>Tant qu'il n'a pas répondu, <strong>tu révises normalement</strong>, pendant 10 jours.</>,
];

export default function ConsentPending() {
  const { state } = useLocation();
  const { currentUser, consentBlocked, consent, refreshGate, logout } = useAuth();
  const navigate = useNavigate();
  const [parentEmail, setParentEmail] = useState(state?.parentEmail ?? consent?.parentEmail ?? '');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg]         = useState('');

  const prenom = currentUser?.displayName ?? '';
  const statut = consent?.status ?? 'a-demander';
  const textes = TEXTES[statut] ?? TEXTES['a-demander'];
  const intro = typeof textes.intro === 'function' ? textes.intro(consent?.joursRestants ?? 15) : textes.intro;
  // Pendant les 15 jours, cet écran est un choix : pas de redirection auto.
  const plusTardPossible = statut === 'a-fournir';

  // L'email du parent arrive avec le gate (Firestore) : pré-remplit le champ.
  useEffect(() => {
    if (consent?.parentEmail) setParentEmail(e => e || consent.parentEmail);
  }, [consent?.parentEmail]);

  // Accès rouvert (email parti, parent qui accepte) → on entre.
  useEffect(() => {
    if (currentUser && !consentBlocked && consent?.status !== 'a-fournir') navigate('/', { replace: true });
  }, [currentUser, consentBlocked, consent?.status, navigate]);

  function plusTard() {
    track('consent_plus_tard');
    navigate('/', { replace: true });
  }

  async function handleSend() {
    if (!/^\S+@\S+\.\S+$/.test(parentEmail.trim())) { setMsg('Adresse email invalide.'); return; }
    setLoading(true); setMsg('');
    try {
      await sendParentalConsent(parentEmail.trim(), prenom);
      track('consent_envoye');
      setSent(true);
      // Premier envoi : l'accès s'ouvre, le useEffect ci-dessus redirige.
      await refreshGate?.();
    } catch (err) {
      setMsg(consentErrorMessage(err.message));
    } finally { setLoading(false); }
  }

  async function handleCheck() {
    setChecking(true); setMsg('');
    try { await refreshGate?.(); } finally { setChecking(false); }
    // Le useEffect ci-dessus redirige automatiquement si l'accès est rouvert.
    setMsg('Toujours en attente de l\'accord de ton parent.');
  }

  async function handleLogout() {
    await logout();
    navigate('/welcome', { replace: true });
  }

  const isDesktop = useIsDesktop();

  const champ = !sent && (
    <div className="auth-field">
      <label className="auth-label" htmlFor="consent-parent-email">Email de ton parent</label>
      <input
        id="consent-parent-email"
        className="auth-input"
        type="email"
        placeholder="parent@exemple.com"
        value={parentEmail}
        onChange={e => setParentEmail(e.target.value)}
        autoComplete="email"
      />
    </div>
  );

  const envoye = sent && (
    <p className="cp-envoye">
      Un email est parti à <strong>{parentEmail}</strong>. Dès qu'il aura accepté, ton accès reprendra.
    </p>
  );

  const actions = (
    <>
      {msg && <p className="cp-msg" role="status">{msg}</p>}
      {!sent ? (
        <button className="auth-btn" onClick={handleSend} disabled={loading || !parentEmail}>
          {loading ? 'Envoi…' : textes.bouton}
        </button>
      ) : (
        <button className="auth-btn" onClick={handleCheck} disabled={checking}>
          {checking ? 'Vérification…' : 'Il a accepté : vérifier'}
        </button>
      )}
      {plusTardPossible && !sent && (
        <button type="button" className="auth-btn-plus-tard" onClick={plusTard}>
          Plus tard, je commence à réviser →
          <small>Il te reste {consent?.joursRestants ?? 15} jour{(consent?.joursRestants ?? 15) > 1 ? 's' : ''} pour donner l'email</small>
        </button>
      )}
      <button type="button" className="cp-deconnexion" onClick={handleLogout}>
        Se déconnecter
      </button>
    </>
  );

  // Ordinateur : la même composition que l'inscription (auth-desk, desktop.css).
  if (isDesktop) {
    return (
      <div className="app auth-desk-page">
        <div className="auth-desk">
          <div className="auth-desk-intro">
            <span className="auth-desk-mascot"><Mascot pose={textes.pose} size={132} alt="" aria-hidden="true" /></span>
            <h1 className="signup-question">{textes.titre}</h1>
            <p className="signup-hint">{intro}</p>
            {(statut === 'a-demander' || statut === 'a-fournir') && (
              <ul className="auth-desk-why">
                {ETAPES.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
          <form className="auth-desk-card" noValidate onSubmit={e => { e.preventDefault(); if (!sent) handleSend(); }}>
            {champ}
            {envoye}
            {actions}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app cp-page">
      <div className="auth-content signup-content cp-content">
        <Mascot pose={textes.pose} size={112} className="cp-mascot" alt="" aria-hidden="true" />
        <h1 className="signup-question">{textes.titre}</h1>
        <p className="signup-hint">{intro}</p>
        {champ}
        {envoye}
      </div>
      <div className="signup-footer">
        {actions}
      </div>
    </div>
  );
}
