import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/firebaseConfig';
import { mesurer } from '../services/mesure';
import { EntreeEcran, Encart, RetourAction, LienTexte } from '../components/entree/Entree';

// Vérifie ton e-mail (handoff Claude Design du 22/10, écran 7) : demandé avant de scanner ou de
// prendre Réviz+. « Plus tard » comme la réussite ramènent à la page d'où l'élève vient.
export default function VerifyEmail() {
  const { currentUser, resendVerificationEmail } = useAuth();
  const [sent, setSent]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet]     = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Retour à la page précédente (scan, Réviz+, réglages) ; arrivée directe → accueil.
  function revenir() {
    if (location.key !== 'default') navigate(-1);
    else navigate('/', { replace: true });
  }

  async function handleResend() {
    setLoading(true);
    try {
      await resendVerificationEmail();
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue() {
    setChecking(true);
    setNotYet(false);
    try {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        // Force un nouveau idToken : le claim email_verified est vérifié
        // côté serveur (scan, paiement), il doit être à jour dans le token.
        await auth.currentUser.getIdToken(true);
        mesurer('email_verifie');
        revenir();
      } else {
        setNotYet(true);
        setTimeout(() => setNotYet(false), 5000);
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <EntreeEcran
      bulle={['Vérifie ton e-mail.', 'Un clic sur le lien reçu, et c’est bon.']}
      expression="determine"
      dessous={<LienTexte onClick={revenir}>Plus tard</LienTexte>}
    >
      <Encart icone="enveloppe" teinte="peche">
        Lien envoyé à <b>{currentUser?.email}</b>. Pense à regarder dans les spams.
      </Encart>
      <button type="button" className="en-btn" onClick={handleContinue} disabled={checking}>
        {checking ? 'Vérification…' : 'J’ai confirmé mon e-mail'}
      </button>
      {notYet && <RetourAction ok={false}>Pas encore confirmé. Clique sur le lien dans l’e-mail, puis reviens ici.</RetourAction>}
      <button type="button" className="en-btn-second" onClick={handleResend} disabled={loading || sent}>
        {loading ? 'Envoi…' : 'Renvoyer l’e-mail'}
      </button>
      {sent && <RetourAction>E-mail renvoyé</RetourAction>}
    </EntreeEcran>
  );
}
