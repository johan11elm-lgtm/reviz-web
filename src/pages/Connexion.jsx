import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { erreurConnexionSociale } from '../components/SocialLogin';
import { EntreeEcran, Champ, ChampMotDePasse, RetourAction, Ou, BoutonsSociaux, LienTexte } from '../components/entree/Entree';
import { revenir } from '../utils/navigation';

function firebaseErrorFr(code) {
  switch (code) {
    case 'auth/invalid-email':      return 'Adresse e-mail invalide.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'E-mail ou mot de passe incorrect.';
    case 'auth/too-many-requests':  return 'Trop de tentatives. Réessaie dans un moment.';
    default:                        return 'Une erreur est survenue. Réessaie.';
  }
}

export default function Connexion() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState('');
  const [resetSent, setResetSent] = useState(false);

  const { login, loginWithProvider, loginWithCustomToken, resetPassword } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(firebaseErrorFr(err.code));
    } finally {
      setLoading(false);
    }
  }

  // Retour de la connexion TikTok : /api/auth renvoie ici avec un jeton
  // Firebase dans le fragment (#tiktok=…), jamais envoyé au serveur.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('tiktok');
    const echec = params.has('tiktok_erreur');
    if (!token && !echec) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (echec) { setError('Connexion TikTok impossible. Réessaie.'); return; }
    setLoading(true);
    loginWithCustomToken(token)
      .then(() => navigate('/', { replace: true }))
      .catch(() => { setError('Connexion TikTok impossible. Réessaie.'); setLoading(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleProvider(id) {
    setError('');
    setLoading(true);
    try {
      const user = await loginWithProvider(id);
      if (!user) return; // redirection en cours (TikTok)
      navigate('/', { replace: true });
    } catch (err) {
      const msg = erreurConnexionSociale(err);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!email) { setError('Entre ton e-mail pour recevoir le lien.'); return; }
    try {
      await resetPassword(email);
      setResetSent(true);
      setError('');
    } catch (err) {
      setError(firebaseErrorFr(err.code));
    }
  }

  const oublie = <button type="button" onClick={handleReset}>Mot de passe oublié ?</button>;
  return (
    <EntreeEcran
      bulle={['Content de te revoir.', 'Tes leçons t’attendent.']}
      expression="content" geste="coucou" taille="dense"
      onRetour={() => revenir(navigate, '/welcome')}
      dessous={(
        <>
          <Ou />
          <BoutonsSociaux onLogin={handleProvider} disabled={!!loading} />
          <LienTexte avant="Pas encore de compte ?" to="/inscription">Créer un compte</LienTexte>
        </>
      )}
    >
      <form className="en-pile" onSubmit={handleSubmit} noValidate>
        <Champ id="connexion-email" label="E-mail" type="email" placeholder="lucas@exemple.com" value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }} autoComplete="email" required />
        <ChampMotDePasse id="connexion-password" lien={oublie} value={password} erreur={error}
          onChange={e => { setPassword(e.target.value); setError(''); }} autoComplete="current-password" required />
        {resetSent && <RetourAction>E-mail envoyé. Regarde aussi dans les spams.</RetourAction>}
        <button className="en-btn" type="submit" disabled={!!loading}>{loading ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    </EntreeEcran>
  );
}
