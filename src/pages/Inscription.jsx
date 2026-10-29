import { useState, useMemo, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { erreurConnexionSociale } from '../components/SocialLogin';
import { isUnder15 } from '../utils/levels';
import { readGuest } from '../services/guestService';
import { sendParentalConsent, consentErrorMessage } from '../services/consentService';
import { track } from '../services/statsService';
import { suggererEmail, adresseExemple } from '../utils/adresseEmail';
import {
  EntreeEcran, Champ, ChampMotDePasse, ChampDate, ChoixClasse, CaseCGU,
  Encart, Ou, BoutonsSociaux, LienTexte, Erreur,
} from '../components/entree/Entree';

// Erreur Firebase → champ concerné et message.
function firebaseErreur(code) {
  switch (code) {
    case 'auth/email-already-in-use': return { email: 'Cet e-mail est déjà utilisé.', emailPris: true };
    case 'auth/invalid-email':        return { email: 'Adresse e-mail invalide.' };
    case 'auth/weak-password':        return { password: '6 caractères au moins.' };
    default:                          return { general: 'Une erreur est survenue. Réessaie.' };
  }
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// « Tu voulais dire lea@gmail.com ? » sous le champ (une adresse sur cinq était mal tapée, 10/2026).
function suggestion(email, onChoisir) {
  const s = suggererEmail(email);
  if (!s) return null;
  return <>Tu voulais dire <button type="button" className="en-suggestion" onClick={() => onChoisir(s)}>{s}</button> ?</>;
}

// Attente maximale de la relecture du gate avant de passer à la suite.
const ATTENTE_GATE_MS = 2000;

// Ce que dit Réviz à chaque étape, et comment il se tient.
const ECRAN = {
  prenom:    { expression: 'content',   geste: 'coucou',    taille: 'normal' },
  birthdate: { expression: 'reflechit',                     taille: 'normal' },
  classe:    { expression: 'content',                       taille: 'normal' },
  account:   { expression: 'determine',                     taille: 'dense' },
  parent:    { expression: 'fier',      geste: 'brasEnLair', taille: 'dense' },
};

export default function Inscription() {
  const [prenom, setPrenom]               = useState(() => readGuest()?.prenom ?? '');
  const [birthDate, setBirthDate]         = useState('');
  const [level, setLevel]                 = useState(() => {
    // Un élève en mode essai arrive avec sa classe déjà connue.
    const g = readGuest()?.level;
    return g?.cycle && g?.classe
      ? { cycle: g.cycle, classe: g.classe, specialites: g.specialites ?? [] }
      : { cycle: null, classe: null, specialites: [] };
  });
  // Classe donnée en mode essai : on ne la redemande jamais (handoff, § 7).
  const [classeConnue]                    = useState(() => !!level.classe);
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [acceptCgu, setAcceptCgu]         = useState(false);
  const [parentEmail, setParentEmail]     = useState('');
  // Erreurs sur place, champ par champ ; effacées dès que l'élève corrige.
  const [erreurs, setErreurs]             = useState({});
  const [loading, setLoading]             = useState(false);
  const [compteCree, setCompteCree]       = useState(false);
  const [plusTardEnCours, setPlusTardEnCours] = useState(false);

  const { signup, loginWithProvider, refreshGate, currentUser, isGuest } = useAuth();
  // Compte déjà ouvert en arrivant ici (page rechargée en plein tunnel,
  // retour arrière) : refaire le tunnel créerait un second compte (19/10).
  const [dejaInscrit] = useState(() => !!currentUser && !isGuest);
  const navigate                          = useNavigate();
  const location                          = useLocation();
  const [params, setParams]               = useSearchParams();

  // L'étape vit dans l'URL (?etape=2) : chaque étape est une entrée
  // d'historique, donc le retour d'Android (geste ou bouton) revient à
  // l'étape précédente au lieu de renvoyer sur /welcome en perdant tout.
  const stepIdx = Math.max(0, Number(params.get('etape')) || 0);
  function goTo(i, { replace = false } = {}) {
    setParams(i > 0 ? { etape: String(i) } : {}, { replace });
  }

  // Une question par écran : prénom, naissance, classe (sauf si connue),
  // compte, puis l'e-mail d'un parent pour les moins de 15 ans.
  const steps = useMemo(() => {
    const base = ['prenom', 'birthdate'];
    if (!classeConnue) base.push('classe');
    base.push('account');
    if (isUnder15(birthDate)) base.push('parent');
    return base;
  }, [classeConnue, birthDate]);

  // Les réponses ne vivent qu'en mémoire : arrivé au milieu du tunnel sans
  // elles (page rechargée, lien partagé), on repart du début.
  // Idem si une étape précédente n'est pas remplie (sinon on pourrait créer
  // un compte sans date de naissance, donc sans accord parental).
  useEffect(() => {
    if (dejaInscrit) return;
    const manquante = steps.slice(0, stepIdx).findIndex(id => validate(id));
    if (manquante >= 0) goTo(manquante, { replace: true });
    else if (stepIdx >= steps.length) goTo(steps.length - 1, { replace: true });
  }, [steps, stepIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compte déjà créé (moins de 15 ans) : revenir en arrière recréerait le
  // compte (« e-mail déjà utilisé »). On reste sur l'étape parent.
  useEffect(() => {
    if (dejaInscrit) return;
    const iParent = steps.indexOf('parent');
    if (compteCree && iParent >= 0 && stepIdx !== iParent) goTo(iParent, { replace: true });
  }, [compteCree, stepIdx, steps]); // eslint-disable-line react-hooks/exhaustive-deps

  // Les erreurs d'une étape ne suivent pas l'élève sur la suivante (y compris
  // par le retour du téléphone, qui passe par l'historique).
  const [etapePrec, setEtapePrec] = useState(stepIdx);
  if (etapePrec !== stepIdx) {
    setEtapePrec(stepIdx);
    setErreurs({});
  }

  const stepId = steps[stepIdx];

  function goNext({ replace = false } = {}) {
    setErreurs({});
    goTo(Math.min(stepIdx + 1, steps.length - 1), { replace });
  }
  function goPrev() {
    setErreurs({});
    // Même chemin que le retour du téléphone. Arrivé directement sur
    // /inscription (pas d'historique dans l'app) : accueil, sans empiler.
    if (location.key !== 'default') navigate(-1);
    else if (stepIdx > 0) goTo(stepIdx - 1, { replace: true });
    else navigate('/welcome', { replace: true });
  }

  // Toutes les erreurs d'une étape, par champ (l'écran compte peut en
  // montrer plusieurs à la fois : e-mail et CGU).
  function erreursEtape(id) {
    const e = {};
    switch (id) {
      case 'prenom':
        if (!prenom.trim()) e.prenom = 'Entre ton prénom.';
        break;
      case 'birthdate': {
        if (!birthDate) { e.naissance = 'Entre ta date de naissance.'; break; }
        const d = new Date(birthDate);
        if (isNaN(d.getTime())) e.naissance = 'Date invalide.';
        else if (d > new Date()) e.naissance = 'La date ne peut pas être dans le futur.';
        else if (d < new Date('1950-01-01')) e.naissance = 'Date invalide.';
        break;
      }
      case 'classe':
        if (!level.classe) e.classe = 'Choisis ta classe.';
        break;
      case 'account':
        if (!email.trim()) e.email = 'Entre ton e-mail.';
        else if (!EMAIL_RE.test(email.trim())) e.email = 'Adresse e-mail invalide.';
        // L'exemple recopié (« exemple.com », « exmenple.com ») : le lien de confirmation n'arriverait jamais.
        else if (adresseExemple(email)) e.email = 'C’est une adresse d’exemple : mets la tienne, on t’y envoie un lien.';
        if (password.length < 6) e.password = '6 caractères au moins.';
        if (!acceptCgu) e.cgu = 'Tu dois accepter les CGU pour continuer.';
        break;
      case 'parent':
        if (!parentEmail.trim()) e.parent = 'Entre l’e-mail de ton parent.';
        else if (!EMAIL_RE.test(parentEmail.trim())) e.parent = 'Adresse e-mail invalide.';
        else if (adresseExemple(parentEmail)) e.parent = 'C’est une adresse d’exemple : mets celle de ton parent.';
        // Le serveur refuse aussi (PARENT_EMAIL_IS_CHILD) — on échoue tôt ici
        // avec un message clair plutôt qu'après l'aller-retour API.
        else if (parentEmail.trim().toLowerCase() === email.trim().toLowerCase()) {
          e.parent = 'Entre l’e-mail de ton parent, pas le tien.';
        }
        break;
      default:
    }
    return e;
  }
  function validate(id) {
    return Object.values(erreursEtape(id))[0] ?? null;
  }
  // L'élève corrige un champ : son erreur (et l'erreur générale) s'efface.
  function effacer(...champs) {
    setErreurs(e => {
      if (!champs.some(c => e[c]) && !e.general) return e;
      const n = { ...e, general: undefined };
      champs.forEach(c => { n[c] = undefined; });
      return n;
    });
  }

  // La suite ne dépend pas de la relecture du gate (le statut est déjà
  // calculé, et l'accueil se recale tout seul) : sur Safari iOS, une lecture
  // Firestore peut rester sans réponse, et l'élève restait bloqué ici (19/10).
  function rafraichirGate() {
    const relecture = Promise.resolve(refreshGate?.()).catch(() => {});
    return Promise.race([relecture, new Promise(r => setTimeout(r, ATTENTE_GATE_MS))]);
  }

  async function handlePrimary() {
    const e = erreursEtape(stepId);
    if (Object.keys(e).length) { setErreurs(e); return; }

    // Étape 'account' : on crée le compte Firebase + profil Firestore
    if (stepId === 'account') {
      setLoading(true);
      try {
        await signup(prenom.trim(), email.trim(), password, level, birthDate);
        await rafraichirGate();
        if (isUnder15(birthDate)) {
          setCompteCree(true);
          goNext({ replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } catch (err) {
        setErreurs(firebaseErreur(err.code));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Étape 'parent' : on prévient le parent, l'élève entre aussitôt dans
    // l'app (le parent accepte ou refuse depuis l'e-mail).
    if (stepId === 'parent') {
      setLoading(true);
      try {
        await sendParentalConsent(parentEmail.trim(), prenom);
        track('consent_envoye');
        await rafraichirGate();
        navigate('/', { replace: true });
      } catch (err) {
        setErreurs({ parent: consentErrorMessage(err.message).replace(/\bemail\b/g, 'e-mail') });
      } finally {
        setLoading(false);
      }
      return;
    }

    goNext();
  }

  // « Plus tard » : le compte existe déjà, l'élève entre dans l'app et a
  // 15 jours pour donner l'e-mail d'un parent (bandeau, relances par e-mail).
  async function plusTard() {
    setErreurs({});
    setLoading(true);
    setPlusTardEnCours(true);
    track('consent_plus_tard');
    await rafraichirGate();
    navigate('/', { replace: true });
  }

  async function handleProvider(id) {
    setErreurs({});
    setLoading(true);
    try {
      const user = await loginWithProvider(id);
      if (!user) return; // redirection en cours (TikTok)
      navigate('/');
    } catch (err) {
      const msg = erreurConnexionSociale(err);
      if (msg) setErreurs({ general: msg });
    } finally {
      setLoading(false);
    }
  }

  function choisirClasse(classe) {
    // Collège seulement : le niveau s'enregistre comme avant, cycle 'college'.
    setLevel({ cycle: 'college', classe, specialites: [], filiere: null });
    effacer('classe');
  }

  if (dejaInscrit) {
    return <Navigate to="/" replace />;
  }

  const primaryLabel = (() => {
    if (loading && stepId === 'account') return 'Création…';
    if (loading && stepId === 'parent' && !plusTardEnCours) return 'Envoi…';
    if (stepId === 'account') return 'Créer mon compte';
    if (stepId === 'parent')  return 'Envoyer et commencer';
    return 'Continuer';
  })();

  const lienConnexion = <LienTexte avant="Déjà un compte ?" to="/connexion">Se connecter</LienTexte>;

  // Chaque étape : ce que dit Réviz, la question (dans la carte) et ce qui
  // vient dessous.
  const etape = (() => {
    switch (stepId) {
      case 'prenom': return {
        bulle: ['Quel est ton prénom ?', 'On l’utilise pour te dire bonjour.'],
        corps: (
          <Champ id="signup-prenom" label="Ton prénom" type="text" placeholder="Lucas" value={prenom}
            erreur={erreurs.prenom} onChange={e => { setPrenom(e.target.value); effacer('prenom'); }}
            autoComplete="given-name" enterKeyHint="next" autoFocus />
        ),
        dessous: (
          <>
            <Ou />
            <BoutonsSociaux onLogin={handleProvider} disabled={loading} />
            {lienConnexion}
          </>
        ),
      };
      case 'birthdate': return {
        bulle: ['Quand es-tu né·e ?', 'Pour adapter Réviz à ton âge.'],
        corps: (
          <ChampDate value={birthDate} onChange={v => { setBirthDate(v); effacer('naissance'); }}
            erreur={erreurs.naissance} idPrefix="signup-naissance" />
        ),
      };
      case 'classe': return {
        bulle: ['Quelle classe ?', 'Ton programme suit ta classe.'],
        corps: <ChoixClasse valeur={level.classe} onChange={choisirClasse} erreur={erreurs.classe} />,
      };
      case 'account': return {
        bulle: ['Crée ton compte', `Dernière étape, ${prenom.trim()}.`],
        corps: (
          <>
            <Champ id="signup-email" label="E-mail" type="email" placeholder="ton adresse e-mail" value={email}
              erreur={erreurs.email} onChange={e => { setEmail(e.target.value); effacer('email', 'emailPris'); }}
              aide={!erreurs.email && suggestion(email, v => { setEmail(v); effacer('email', 'emailPris'); })}
              autoComplete="email" autoCapitalize="none" enterKeyHint="next"
              onKeyDown={e => {
                // Entrée sur l'e-mail : on passe au mot de passe, sans valider.
                if (e.key === 'Enter') { e.preventDefault(); document.getElementById('signup-password')?.focus(); }
              }} />
            <ChampMotDePasse id="signup-password" value={password} erreur={erreurs.password}
              aide={erreurs.password ? null : '6 caractères au moins. Invente-le : ce n’est pas celui de ta messagerie.'}
              onChange={e => { setPassword(e.target.value); effacer('password'); }}
              autoComplete="new-password" enterKeyHint="done" />
            <CaseCGU checked={acceptCgu} erreur={erreurs.cgu}
              onChange={v => { setAcceptCgu(v); effacer('cgu'); }} />
          </>
        ),
        dessous: (isUnder15(birthDate) || erreurs.emailPris) && (
          <>
            {isUnder15(birthDate) && (
              <Encart icone="horloge">
                Tu pourras réviser tout de suite. <b>Il faudra juste l’e-mail d’un de tes parents</b>, maintenant ou dans les 15 jours.
              </Encart>
            )}
            {erreurs.emailPris && lienConnexion}
          </>
        ),
      };
      // Un élève sur cinq s'arrêtait ici (25/10) : le champ prenait le focus, le clavier d'Android
      // cachait « Plus tard » et il ne voyait qu'une demande d'e-mail de ses parents. Plus de focus
      // automatique, et « Plus tard » juste sous l'envoi, dans la carte, toujours visible.
      case 'parent': return {
        bulle: ['Ton compte est prêt.', 'Tu peux réviser tout de suite.'],
        corps: (
          <>
            <p className="en-texte">
              Comme tu as moins de 15 ans, un parent doit dire oui par e-mail. Donne son adresse maintenant,
              ou <b>dans les 15 jours</b>.
            </p>
            <Champ id="signup-parent-email" label="E-mail de ton parent" type="email" placeholder="l’adresse de ton parent"
              value={parentEmail} erreur={erreurs.parent}
              aide={!erreurs.parent && suggestion(parentEmail, v => { setParentEmail(v); effacer('parent'); })}
              onChange={e => { setParentEmail(e.target.value); effacer('parent'); }}
              autoComplete="email" autoCapitalize="none" enterKeyHint="send" />
          </>
        ),
        apres: (
          <button type="button" className="en-btn-second" onClick={plusTard} disabled={loading}>
            {plusTardEnCours ? 'Un instant…' : 'Plus tard, je révise d’abord'}
            <small>Il te reste 15 jours</small>
          </button>
        ),
      };
      default: return null;
    }
  })();

  if (!etape) return null;
  const pose = ECRAN[stepId];

  return (
    <EntreeEcran
      bulle={etape.bulle}
      expression={pose.expression} geste={pose.geste} taille={pose.taille}
      // Pas de retour une fois le compte créé (écran parent).
      onRetour={stepId === 'parent' ? undefined : goPrev}
      // Tant que l'âge n'est pas connu, on compte l'étape parent : le total ne baisse qu'à 15 ans ou plus.
      etape={{ n: stepIdx + 1, total: steps.length + (birthDate ? 0 : 1) }}
      dessous={etape.dessous || undefined}
    >
      {/* Formulaire : la touche Entrée / « Suivant » du clavier valide
          l'étape, même quand le clavier cache le bouton. */}
      <form className="en-pile" key={stepId} noValidate onSubmit={e => { e.preventDefault(); if (!loading) handlePrimary(); }}>
        {etape.corps}
        <Erreur>{erreurs.general}</Erreur>
        <button className="en-btn" type="submit" disabled={loading}>{primaryLabel}</button>
        {etape.apres}
      </form>
    </EntreeEcran>
  );
}
