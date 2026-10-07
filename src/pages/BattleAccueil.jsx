import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useContexteBattle } from '../hooks/useBattle';
import { creerBattle } from '../services/battleService';
import { loadChapterContent } from '../services/programmeService';
import { track } from '../services/statsService';
import { PageHeader } from '../components/PageHeader';
import { BattleMascot } from '../components/BattleMascot';
import { BattleRegles } from '../components/battle/BattleRegles';
import { BottomNav } from '../components/BottomNav';
import { ChampPrenom } from '../components/battle/ChampPrenom';
import { prenomInvite, retenirPrenomInvite } from '../services/battleConnexion';
import { LONGUEUR_CODE, nettoyerPrenom, normaliserCode } from '../utils/battle';
import { nbsp } from '../utils/typography';
import './Battle.css';

/**
 * /battle : rejoindre avec un code, ou — avec ?classe&matiere&chapitre, depuis
 * un chapitre de Mon programme — ouvrir un salon et y aller. Ouvert à tous :
 * sans compte, l'élève joue en invité avec son prénom.
 */
export default function BattleAccueil() {
  const [params] = useSearchParams();
  const chapitre = params.get('chapitre')
    ? { classe: params.get('classe'), matiere: params.get('matiere'), id: params.get('chapitre') }
    : null;
  return chapitre ? <Creation chapitre={chapitre} /> : <Rejoindre />;
}

function Creation({ chapitre }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const ctx = useContexteBattle();
  const prenomConnu = currentUser?.displayName || '';
  const [saisie, setSaisie] = useState(() => prenomConnu || prenomInvite());
  // Sans compte ni prénom retenu, on le demande avant d'ouvrir le salon.
  const [prenom, setPrenom] = useState(() => nettoyerPrenom(prenomConnu || prenomInvite()));
  const [erreur, setErreur] = useState(false);
  const lance = useRef(false);

  useEffect(() => {
    if (!ctx || !prenom || lance.current) return;
    lance.current = true;
    loadChapterContent(chapitre.classe, chapitre.matiere, chapitre.id)
      .then(data => creerBattle(ctx, { prenom, chapitre, nbQuestions: data.quiz.length }))
      .then(code => {
        track('battle_creee', { classe: chapitre.classe, matiere: chapitre.matiere, joueur: ctx.avecCompte ? 'compte' : 'invite' });
        navigate(`/battle/${code}`, { replace: true });
      })
      .catch(() => setErreur(true));
  }, [ctx, prenom, chapitre, navigate]);

  if (!prenom && !erreur) {
    return (
      <div className="app battle-page">
        <PageHeader variant="back" />
        <form
          className="content battle-content"
          onSubmit={e => { e.preventDefault(); const p = nettoyerPrenom(saisie); if (p) { retenirPrenomInvite(p); setPrenom(p); } }}
        >
          <ChampPrenom valeur={saisie} onChange={setSaisie} />
          <button type="submit" className="rv-btn-cta rv-btn-cta--full" disabled={!nettoyerPrenom(saisie)}>
            <span>Ouvrir le salon</span>
            <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app battle-page">
      <PageHeader variant="back" />
      <div className="content battle-content">
        {erreur || ctx === null ? (
          <div className="rv-empty-state battle-vide">
            <BattleMascot pose="moinsaura" size={140} className="rv-empty-state-mascot" alt="" aria-hidden="true" />
            <h2 className="rv-empty-state-title">Le salon n’a pas pu être créé</h2>
            <p className="rv-empty-state-sub">Vérifie ta connexion et réessaie.</p>
            <button type="button" className="rv-btn-cta" onClick={() => navigate(0)}>Réessayer</button>
          </div>
        ) : (
          <div className="battle-chargement" role="status"><span className="battle-spinner" aria-hidden="true" />Ouverture du salon…</div>
        )}
      </div>
    </div>
  );
}

function Rejoindre() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [saisie, setSaisie] = useState('');
  const [erreur, setErreur] = useState(false);
  const code = normaliserCode(saisie);

  function valider(e) {
    e.preventDefault();
    if (!code) { setErreur(true); return; }
    navigate(`/battle/${code}`);
  }

  return (
    <div className="app battle-page">
      <PageHeader variant="back" onBack={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))} />
      <div className="rv-page-intro">
        <div className="rv-page-intro-text">
          <h1 className="rv-greeting-title rv-page-intro-title">Battle</h1>
          <p className="rv-greeting-sub rv-page-intro-sub">Défie quelqu’un en direct sur un chapitre de ton programme.</p>
        </div>
        <BattleMascot pose="garde" size={140} priority className="rv-page-intro-mascot" alt="" aria-hidden="true" />
      </div>

      <div className="content battle-content battle-accueil">
        <form className="rv-card rv-card--padded battle-rejoindre" onSubmit={valider} noValidate>
          <label className="battle-rejoindre-label" htmlFor="battle-code">Rejoindre avec un code</label>
          <input
            id="battle-code"
            className="battle-rejoindre-input"
            value={saisie}
            onChange={e => { setSaisie(e.target.value.toUpperCase().slice(0, LONGUEUR_CODE + 1)); setErreur(false); }}
            placeholder="K7RM"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            aria-invalid={erreur || undefined}
            aria-describedby={erreur ? 'battle-code-erreur' : undefined}
          />
          {erreur && <p id="battle-code-erreur" className="battle-erreur" role="alert">Un code fait 4 caractères, sans O, 0, I ni 1.</p>}
          <button type="submit" className="rv-btn-cta rv-btn-cta--full" disabled={!saisie.trim()}>
            <span>Rejoindre</span>
            <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
          </button>
        </form>

        <div className="rv-card rv-card--padded battle-lancer">
          <h2 className="battle-lancer-titre">Lancer une battle</h2>
          <p className="battle-lancer-texte">{nbsp('Choisis un chapitre dans Mon programme, puis « Lancer une battle ».')}</p>
          {/* Sans compte, le programme passe par le mode essai (prénom + classe). */}
          <Link className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost" to={currentUser ? '/programme' : '/essai'}>
            <span>Choisir un chapitre</span>
            <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
          </Link>
        </div>

        <BattleRegles partage />
      </div>
      {currentUser && <BottomNav />}
    </div>
  );
}
