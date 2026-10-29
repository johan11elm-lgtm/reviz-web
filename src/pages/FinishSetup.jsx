import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isUnder15 } from '../utils/levels';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { createUserProfile } from '../services/userProfileService';
import { EntreeEcran, Champ, ChampDate, ChoixClasse, CaseCGU, Erreur, LienTexte } from '../components/entree/Entree';

// Fin d'inscription pour les nouveaux comptes sans mot de passe (Google,
// Apple, Microsoft, TikTok) : seulement ce que le fournisseur ne donne pas.
// Étape 1 : date de naissance (et le prénom quand il manque : Apple, e-mail
// masqué). Étape 2 : classe (collège) et CGU. Les moins de 15 ans passent
// ensuite par /consent-pending : e-mail d'un parent maintenant, ou « Plus tard » (15 jours).
// Aussi pour un compte e-mail dont le profil n'a pas été enregistré (essais devenus comptes,
// 26-29/10) : il a déjà accepté les CGU, et sa classe est souvent connue (essai, ce
// navigateur) ; on ne redemande que ce qui manque, en une étape quand c'est possible.
export default function FinishSetup() {
  const { currentUser, setUserLevel, getUserLevel, refreshGate, updateDisplayName, logout } = useAuth();
  const navigate = useNavigate();
  const [etape, setEtape] = useState(1);
  const [birthDate, setBirthDate] = useState('');
  const [prenomSaisi, setPrenomSaisi] = useState('');
  const [level, setLevel] = useState({ cycle: null, classe: null, specialites: [] });
  const [acceptCgu, setAcceptCgu] = useState(false);
  // Erreurs sur place, champ par champ ; effacées dès que l'élève corrige.
  const [erreurs, setErreurs] = useState({});
  const [loading, setLoading] = useState(false);

  if (!currentUser) return <Navigate to="/welcome" replace />;

  const prenom = currentUser.displayName?.split(' ')[0] ?? '';
  const demanderPrenom = !currentUser.displayName;
  const compteEmail = currentUser.providerData?.some(p => p.providerId === 'password') ?? false;
  const demanderCgu = !compteEmail;
  const levelConnu = getUserLevel?.();
  const demanderClasse = !levelConnu?.classe;
  const total = demanderClasse ? 2 : 1;

  function effacer(champ) {
    setErreurs(e => (e[champ] || e.general ? { ...e, [champ]: undefined, general: undefined } : e));
  }

  function erreursEtape1() {
    const e = {};
    if (demanderPrenom && !prenomSaisi.trim()) e.prenom = 'Entre ton prénom.';
    if (!birthDate) e.naissance = 'Entre ta date de naissance.';
    else {
      const d = new Date(birthDate);
      if (isNaN(d.getTime())) e.naissance = 'Date invalide.';
      else if (d > new Date()) e.naissance = 'La date ne peut pas être dans le futur.';
    }
    return e;
  }

  function continuer() {
    const e = erreursEtape1();
    setErreurs(e);
    if (!Object.keys(e).length) setEtape(2);
  }

  async function handleSubmit() {
    const e1 = erreursEtape1();
    if (Object.keys(e1).length) { setErreurs(e1); setEtape(1); return; }
    const e = {};
    if (demanderClasse && !level.classe) e.classe = 'Choisis ta classe.';
    if (demanderCgu && !acceptCgu) e.cgu = 'Tu dois accepter les CGU pour continuer.';
    if (Object.keys(e).length) { setErreurs(e); return; }

    const niveau = demanderClasse ? level : levelConnu;
    setLoading(true); setErreurs({});
    try {
      if (demanderPrenom) await updateDisplayName(prenomSaisi.trim());
      await createUserProfile(currentUser.uid, {
        prenom: demanderPrenom ? prenomSaisi.trim() : currentUser.displayName ?? null,
        email: currentUser.email ?? null,
        birthDate,
        level: niveau,
      });
      const mineur = isUnder15(birthDate);
      // Même trace 'pending' que l'inscription par e-mail : date le début des
      // 15 jours pour donner l'e-mail du parent, et sert aux relances.
      if (mineur) {
        await setDoc(doc(db, 'users', currentUser.uid, 'parentalConsent', 'consent'), {
          status: 'pending',
          createdAt: Date.now(),
        }).catch(() => { /* déjà posée : les règles refusent la réécriture */ });
      }
      setUserLevel(niveau);
      await refreshGate?.();
      navigate(mineur ? '/consent-pending' : '/', { replace: true });
    } catch (err) {
      globalThis.reportError?.(err);
      setErreurs({ general: 'Une erreur est survenue. Réessaie.' });
      setLoading(false);
    }
  }

  // Connecté avec le mauvais compte (celui d'un parent…) : toutes les pages ramènent ici, il faut
  // donc une sortie, comme sur /consent-pending.
  async function deconnecter() {
    await logout();
    navigate('/welcome', { replace: true });
  }

  function retour() {
    setErreurs({});
    setEtape(1);
  }

  const premiere = etape === 1;
  const derniere = etape === total;
  const cgu = <CaseCGU checked={acceptCgu} erreur={erreurs.cgu} onChange={v => { setAcceptCgu(v); effacer('cgu'); }} />;
  // Prénom du fournisseur seulement : la bulle ne change pas à chaque lettre tapée.
  const bulleAccueil = compteEmail
    ? [prenom ? `Content de te revoir, ${prenom}.` : 'Content de te revoir.',
      total === 2 ? 'Il me manque deux infos pour continuer.' : 'Il me manque ta date de naissance.']
    : [prenom ? `Bienvenue, ${prenom}.` : 'Bienvenue.',
      total === 2 ? 'Encore deux questions pour préparer ton programme.' : 'Encore une question avant de commencer.'];
  return (
    <EntreeEcran
      bulle={premiere ? bulleAccueil : ['Quelle classe ?', 'Ton programme suit ta classe.']}
      expression={premiere ? 'fier' : 'content'} geste={premiere ? 'brasEnLair' : undefined}
      onRetour={premiere ? undefined : retour}
      etape={total > 1 ? { n: etape, total } : undefined}
      dessous={<LienTexte avant="Ce n’est pas ton compte ?" onClick={deconnecter}>Me déconnecter</LienTexte>}
    >
      <form className="en-pile" key={etape} noValidate
        onSubmit={e => { e.preventDefault(); if (loading) return; if (!derniere) continuer(); else handleSubmit(); }}>
        {premiere ? (
          <>
            {demanderPrenom && (
              <Champ id="fs-prenom" label="Ton prénom" type="text" placeholder="Lucas" value={prenomSaisi}
                erreur={erreurs.prenom} onChange={e => { setPrenomSaisi(e.target.value); effacer('prenom'); }}
                autoComplete="given-name" maxLength={40} />
            )}
            <p className="en-texte">Quand es-tu né·e ? <b>Pour adapter Réviz à ton âge.</b></p>
            <ChampDate value={birthDate} onChange={v => { setBirthDate(v); effacer('naissance'); }}
              erreur={erreurs.naissance} idPrefix="fs-naissance" />
            {derniere && demanderCgu && cgu}
          </>
        ) : (
          <>
            <ChoixClasse valeur={level.classe} erreur={erreurs.classe}
              onChange={classe => { setLevel({ cycle: 'college', classe, specialites: [] }); effacer('classe'); }} />
            {demanderCgu && cgu}
          </>
        )}
        <Erreur>{erreurs.general}</Erreur>
        <button className="en-btn" type="submit" disabled={loading}>
          {!derniere ? 'Continuer' : loading ? 'Enregistrement…' : compteEmail ? 'Continuer' : 'Terminer'}
        </button>
      </form>
    </EntreeEcran>
  );
}
