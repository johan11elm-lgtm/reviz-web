import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isUnder15 } from '../utils/levels';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { createUserProfile } from '../services/userProfileService';
import { EntreeEcran, Champ, ChampDate, ChoixClasse, CaseCGU, Erreur } from '../components/entree/Entree';

// Fin d'inscription pour les nouveaux comptes sans mot de passe (Google,
// Apple, Microsoft, TikTok) : seulement ce que le fournisseur ne donne pas.
// Étape 1 : date de naissance (et le prénom quand il manque : Apple, e-mail
// masqué). Étape 2 : classe (collège) et CGU. Les moins de 15 ans passent
// ensuite par /consent-pending : e-mail d'un parent maintenant, ou « Plus tard » (15 jours).
export default function FinishSetup() {
  const { currentUser, setUserLevel, refreshGate, updateDisplayName } = useAuth();
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
    if (!level.classe) e.classe = 'Choisis ta classe.';
    if (!acceptCgu) e.cgu = 'Tu dois accepter les CGU pour continuer.';
    if (Object.keys(e).length) { setErreurs(e); return; }

    setLoading(true); setErreurs({});
    try {
      if (demanderPrenom) await updateDisplayName(prenomSaisi.trim());
      await createUserProfile(currentUser.uid, {
        prenom: demanderPrenom ? prenomSaisi.trim() : currentUser.displayName ?? null,
        email: currentUser.email ?? null,
        birthDate,
        level,
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
      setUserLevel(level);
      await refreshGate?.();
      navigate(mineur ? '/consent-pending' : '/', { replace: true });
    } catch {
      setErreurs({ general: 'Une erreur est survenue. Réessaie.' });
      setLoading(false);
    }
  }

  function retour() {
    setErreurs({});
    setEtape(1);
  }

  const premiere = etape === 1;
  return (
    <EntreeEcran
      bulle={premiere
        // Prénom du fournisseur seulement : la bulle ne change pas à chaque lettre tapée.
        ? [prenom ? `Bienvenue, ${prenom}.` : 'Bienvenue.','Encore deux questions pour préparer ton programme.']
        : ['Quelle classe ?', 'Ton programme suit ta classe.']}
      expression={premiere ? 'fier' : 'content'} geste={premiere ? 'brasEnLair' : undefined}
      onRetour={premiere ? undefined : retour}
      etape={{ n: etape, total: 2 }}
    >
      <form className="en-pile" key={etape} noValidate
        onSubmit={e => { e.preventDefault(); if (loading) return; if (premiere) continuer(); else handleSubmit(); }}>
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
          </>
        ) : (
          <>
            <ChoixClasse valeur={level.classe} erreur={erreurs.classe}
              onChange={classe => { setLevel({ cycle: 'college', classe, specialites: [] }); effacer('classe'); }} />
            <CaseCGU checked={acceptCgu} erreur={erreurs.cgu} onChange={v => { setAcceptCgu(v); effacer('cgu'); }} />
          </>
        )}
        <Erreur>{erreurs.general}</Erreur>
        <button className="en-btn" type="submit" disabled={loading}>
          {premiere ? 'Continuer' : loading ? 'Enregistrement…' : 'Terminer'}
        </button>
      </form>
    </EntreeEcran>
  );
}
