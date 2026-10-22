import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendParentalConsent, consentErrorMessage } from '../services/consentService';
import { track } from '../services/statsService';
import { EntreeEcran, Champ, Encart, RetourAction, LienTexte, Erreur } from '../components/entree/Entree';
import './ConsentPending.entree.css';

// Écran de l'e-mail du parent pour un <15 ans (handoff Claude Design du 22/10, écran 5).
// Choisi librement pendant les 15 jours pour le donner (« a-fournir », avec « Plus tard ») ;
// imposé quand l'accès est suspendu : délai d'adresse écoulé (« a-demander »), délai de réponse
// écoulé (« sans-reponse »), ou refus du parent (« refuse »). Pendant l'attente de la réponse,
// l'app reste ouverte. Trois familles d'écrans : à fournir (pêche), envoyé (menthe), en pause
// (lavande, jamais punitif).

const jours = n => `${n} jour${n > 1 ? 's' : ''}`;

const ECRANS = {
  'a-fournir': {
    teinte: 'peche', expression: 'fier', geste: 'brasEnLair', champ: true,
    bulle: ['Ton compte est prêt.', 'Plus qu’un petit oui de ton parent.'],
    texte: n => <>Comme tu as moins de 15 ans, un de tes parents doit donner son accord par e-mail. Pas son adresse sous la main ? Commence quand même : <b>il te reste {jours(n)}</b>.</>,
    bouton: 'Envoyer et commencer',
  },
  'a-demander': {
    teinte: 'lavande', expression: 'endormi', champ: true,
    bulle: ['Ton compte est en pause.', 'Tu retrouves tout dès l’envoi.'],
    texte: () => <>Donne l’e-mail d’un de tes parents : <b>tu retrouves tout dès l’envoi</b>.</>,
    bouton: 'Envoyer la demande',
  },
  'sans-reponse': {
    teinte: 'lavande', expression: 'inquiet',
    bulle: ['Ton parent n’a pas encore répondu.', 'Demande-lui de regarder ses e-mails.'],
    encart: email => <>Demande-lui de regarder ses e-mails (et ses spams), ou renvoie la demande à <b>{email}</b>.</>,
    bouton: 'Renvoyer la demande',
  },
  refuse: {
    teinte: 'lavande', expression: 'reflechit',
    bulle: ['Ton parent n’a pas donné son accord.', 'Si c’était une erreur, parles-en avec lui.'],
    texte: () => <>Si c’était une erreur, parles-en avec lui puis renvoie la demande.</>,
    bouton: 'Renvoyer la demande',
  },
  // « Changer d'adresse » alors que la demande est déjà partie (accès ouvert, en attente).
  changer: {
    teinte: 'peche', expression: 'content', champ: true,
    bulle: ['Une autre adresse ?', 'Donne l’e-mail d’un de tes parents.'],
    bouton: 'Envoyer la demande',
  },
};

export default function ConsentPending() {
  const { state } = useLocation();
  const { currentUser, consentBlocked, consent, refreshGate, logout } = useAuth();
  const navigate = useNavigate();
  const [parentEmail, setParentEmail] = useState(state?.parentEmail ?? consent?.parentEmail ?? '');
  const [sent, setSent]         = useState(false);
  const [changer, setChanger]   = useState(false); // « Changer d'adresse » : réaffiche le champ
  const [loading, setLoading]   = useState(false);
  const [checking, setChecking] = useState(false);
  const [erreur, setErreur]     = useState('');
  const [attente, setAttente]   = useState(false); // « Toujours en attente… » après vérification
  // Après un envoi, on montre la confirmation : l'élève entre en cliquant « Commencer à réviser ».
  const confirmer = useRef(false);

  const prenom = currentUser?.displayName ?? '';
  const statut = consent?.status ?? 'a-demander';
  const joursRestants = consent?.joursRestants ?? 15;
  const accesOuvert = !!currentUser && !consentBlocked;
  // Pendant les 15 jours, cet écran est un choix : pas de redirection auto.
  const plusTardPossible = statut === 'a-fournir';

  // L'e-mail du parent arrive avec le gate (Firestore) : pré-remplit le champ.
  useEffect(() => {
    if (consent?.parentEmail) setParentEmail(e => e || consent.parentEmail);
  }, [consent?.parentEmail]);

  // Accès rouvert (e-mail parti, parent qui accepte) → on entre.
  useEffect(() => {
    if (confirmer.current) return;
    if (currentUser && !consentBlocked && consent?.status !== 'a-fournir') navigate('/', { replace: true });
  }, [currentUser, consentBlocked, consent?.status, navigate]);

  function plusTard() {
    track('consent_plus_tard');
    navigate('/', { replace: true });
  }

  async function handleSend() {
    if (!/^\S+@\S+\.\S+$/.test(parentEmail.trim())) { setErreur('Adresse e-mail invalide.'); return; }
    setLoading(true); setErreur(''); setAttente(false);
    try {
      await sendParentalConsent(parentEmail.trim(), prenom);
      track('consent_envoye');
      confirmer.current = true;
      setSent(true); setChanger(false);
      // Premier envoi : l'accès s'ouvre (« Commencer à réviser » apparaît).
      await refreshGate?.();
    } catch (err) {
      setErreur(consentErrorMessage(err.message));
    } finally { setLoading(false); }
  }

  async function handleCheck() {
    setChecking(true); setErreur(''); setAttente(false);
    // Le parent a accepté : la redirection automatique reprend la main.
    confirmer.current = false;
    try { await refreshGate?.(); } finally { setChecking(false); }
    // Le useEffect ci-dessus redirige automatiquement si l'accès est rouvert.
    setAttente(true);
  }

  async function handleLogout() {
    await logout();
    navigate('/welcome', { replace: true });
  }

  function changerAdresse() {
    setSent(false); setChanger(true); setErreur(''); setAttente(false);
  }

  const deconnexion = <LienTexte onClick={handleLogout}>Se déconnecter</LienTexte>;
  const verifier = (classe) => (
    <button type="button" className={classe} onClick={handleCheck} disabled={checking}>
      {checking ? 'Vérification…' : 'Il a accepté : vérifier'}
    </button>
  );

  // ── Envoyé (héros menthe) ──
  if (sent) {
    return (
      <EntreeEcran
        teinte="menthe" expression="content"
        bulle={['Un e-mail est parti.', 'Dès qu’il aura accepté, c’est réglé.']}
        dessous={(
          <>
            <LienTexte onClick={changerAdresse}>Changer d’adresse</LienTexte>
            {!accesOuvert && deconnexion}
          </>
        )}
      >
        <Encart icone="coche" teinte="menthe">
          Un e-mail est parti à <b>{parentEmail.trim()}</b>. Dès qu’il aura accepté, c’est réglé.
        </Encart>
        {accesOuvert
          ? <button type="button" className="en-btn" onClick={() => navigate('/', { replace: true })}>Commencer à réviser</button>
          : verifier('en-btn')}
        {attente && !accesOuvert && <RetourAction ok={false}>Toujours en attente de l’accord de ton parent.</RetourAction>}
        <Erreur>{erreur}</Erreur>
      </EntreeEcran>
    );
  }

  // ── À fournir (pêche) / en pause (lavande) ──
  // « en-attente » n'arrive ici qu'après « Changer d'adresse » (sinon l'accès ouvert redirige).
  const cle = statut !== 'changer' && ECRANS[statut] ? statut : statut === 'en-attente' ? 'changer' : 'a-demander';
  const ecran = ECRANS[cle];
  // Sans adresse connue (ou pour la changer), le champ revient aussi sur « sans réponse » / « refus ».
  const avecChamp = ecran.champ || changer || !parentEmail.trim();
  const peutChanger = !avecChamp;
  const relance = cle === 'sans-reponse' || cle === 'refuse';

  return (
    <EntreeEcran
      teinte={ecran.teinte} expression={ecran.expression} geste={ecran.geste}
      bulle={ecran.bulle} taille={avecChamp ? 'dense' : 'normal'}
      dessous={(
        <>
          {plusTardPossible && (
            <button type="button" className="en-btn-second" onClick={plusTard}>
              Plus tard, je commence à réviser
              <small>Il te reste {jours(joursRestants)}</small>
            </button>
          )}
          {peutChanger && <LienTexte onClick={changerAdresse}>Changer d’adresse</LienTexte>}
          {deconnexion}
        </>
      )}
    >
      <form className="en-pile" noValidate onSubmit={e => { e.preventDefault(); handleSend(); }}>
        {ecran.texte && <p className="en-texte cp-texte">{ecran.texte(joursRestants)}</p>}
        {ecran.encart && !avecChamp && <Encart icone="enveloppe" teinte="lavande">{ecran.encart(parentEmail.trim())}</Encart>}
        {avecChamp ? (
          <Champ id="consent-parent-email" label="E-mail de ton parent" type="email" placeholder="parent@exemple.com"
            value={parentEmail} erreur={erreur} autoComplete="email"
            onChange={e => { setParentEmail(e.target.value); setErreur(''); }} />
        ) : <Erreur>{erreur}</Erreur>}
        <button className="en-btn" type="submit" disabled={loading || !parentEmail.trim()}>
          {loading ? 'Envoi…' : ecran.bouton}
        </button>
        {relance && verifier('en-btn-second')}
        {attente && <RetourAction ok={false}>Toujours en attente de l’accord de ton parent.</RetourAction>}
      </form>
    </EntreeEcran>
  );
}
