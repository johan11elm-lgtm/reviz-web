import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useContexteBattle } from '../hooks/useBattle';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { creerBattle } from '../services/battleService';
import { loadCatalogue, loadChapterContent } from '../services/programmeService';
import { getUserProfile } from '../services/userProfileService';
import { track } from '../services/statsService';
import { BattleMascot } from '../components/BattleMascot';
import { BulleReviz } from '../components/reviz/BulleReviz';
import { BottomNav } from '../components/BottomNav';
import { ChampPrenom } from '../components/battle/ChampPrenom';
import { prenomInvite, retenirPrenomInvite } from '../services/battleConnexion';
import { AURA, CHRONO_MS, LONGUEUR_CODE, ROUNDS, nettoyerPrenom, normaliserCode } from '../utils/battle';
import { hasProgramme, PROGRAMME_FALLBACK } from '../utils/programme';
import { teinteMatiere, TEINTES } from '../utils/teinteMatiere';
import './Battle.css';

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
);
const PASTEL = new Map([[TEINTES.lavande, '#E4E0FA'], [TEINTES.peche, '#FFE6D2'], [TEINTES.menthe, '#DCF5E6'], [TEINTES.rose, '#FFD9E4']]);
const pastel = matiere => PASTEL.get(teinteMatiere(matiere)) ?? '#FFE6D2';

/**
 * /battle : l'accueil (lancer une battle en choisissant un chapitre, rejoindre avec un code,
 * son aura, les règles en bref), ou — avec ?classe&matiere&chapitre — l'ouverture du salon.
 * Ouvert à tous : sans compte, l'élève joue en invité avec son prénom.
 */
export default function BattleAccueil() {
  const [params] = useSearchParams();
  const chapitre = params.get('chapitre')
    ? { classe: params.get('classe'), matiere: params.get('matiere'), id: params.get('chapitre') }
    : null;
  return chapitre ? <Creation chapitre={chapitre} /> : <Accueil />;
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
      <div className="app app--no-halo bt-page bt-page--centre">
        <form className="bt-carte bt-carte--prenom"
          onSubmit={e => { e.preventDefault(); const p = nettoyerPrenom(saisie); if (p) { retenirPrenomInvite(p); setPrenom(p); } }}>
          <ChampPrenom valeur={saisie} onChange={setSaisie} />
          <button type="submit" className="bt-btn" disabled={!nettoyerPrenom(saisie)}>Ouvrir le salon</button>
        </form>
      </div>
    );
  }
  return (
    <div className="app app--no-halo bt-page bt-page--centre">
      {erreur || ctx === null ? (
        <div className="bt-vide">
          <BattleMascot pose="moinsaura" size={150} alt="" aria-hidden="true" />
          <h1>Le salon n’a pas pu être créé</h1>
          <p>Vérifie ta connexion et réessaie.</p>
          <button type="button" className="bt-btn" onClick={() => navigate(0)}>Réessayer</button>
        </div>
      ) : <p className="bt-chargement" role="status"><span className="bt-anneau" aria-hidden="true" />Ouverture du salon…</p>}
    </div>
  );
}

function Accueil() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { currentUser, getUserLevel } = useAuth();
  const niveau = getUserLevel?.();
  const classe = hasProgramme(niveau) ? niveau.classe : PROGRAMME_FALLBACK;

  // L'aura, écrite par le serveur sur le profil (api/battle-fin.js).
  const [aura, setAura] = useState(null);
  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserProfile(currentUser.uid)
      .then(p => setAura({ total: p?.aura ?? 0, jouees: p?.battles?.jouees ?? 0, gagnees: p?.battles?.gagnees ?? 0 }))
      .catch(() => {});
  }, [currentUser?.uid]);

  // Lancer : une matière, puis un chapitre prêt.
  const [catalogue, setCatalogue] = useState(null);
  const [erreurCatalogue, setErreurCatalogue] = useState(false);
  useEffect(() => {
    let vivant = true;
    loadCatalogue(classe).then(c => { if (vivant) setCatalogue(c); }).catch(() => { if (vivant) setErreurCatalogue(true); });
    return () => { vivant = false; };
  }, [classe]);
  const matieres = useMemo(() => (catalogue?.matieres ?? []).filter(m => m.chapitres.some(c => c.pret)), [catalogue]);
  const [matiere, setMatiere] = useState(null);
  const m = matieres.find(x => x.slug === matiere) ?? matieres[0];
  const [chapitre, setChapitre] = useState(null);
  const chapitres = (m?.chapitres ?? []).filter(c => c.pret);
  const choisi = chapitres.find(c => c.id === chapitre) ?? null;
  function creer() {
    if (!choisi) return;
    const q = new URLSearchParams({ classe, matiere: m.matiere, chapitre: choisi.id });
    navigate(`/battle?${q}`);
  }

  // Rejoindre : le code à 4 caractères.
  const [saisie, setSaisie] = useState('');
  const [erreur, setErreur] = useState(false);
  const code = normaliserCode(saisie);
  function rejoindre(e) {
    e.preventDefault();
    if (!code) { setErreur(true); return; }
    navigate(`/battle/${code}`);
  }

  const lancer = (
    <section className="bt-carte bt-lancer" aria-labelledby="bt-lancer">
      <h2 id="bt-lancer" className="bt-h2">Lancer une battle</h2>
      <p className="bt-txt">Choisis un chapitre de ton programme.</p>
      {erreurCatalogue ? <p className="bt-txt" role="alert">Le programme ne se charge pas. Vérifie ta connexion.</p> : !catalogue ? (
        <p className="bt-chargement" role="status"><span className="bt-anneau" aria-hidden="true" />Chargement du programme…</p>
      ) : (
        <>
          <div className="bt-matieres" role="group" aria-label="Matière">
            {matieres.map(x => (
              <button key={x.slug} type="button" className={`bt-matiere${x.slug === m?.slug ? ' is-choisie' : ''}`} aria-pressed={x.slug === m?.slug}
                onClick={() => { setMatiere(x.slug); setChapitre(null); }}>
                <i style={{ background: pastel(x.matiere) }} aria-hidden="true" />{x.matiere}
              </button>
            ))}
          </div>
          <ul className="bt-chapitres">
            {chapitres.map(c => (
              <li key={c.id}>
                <button type="button" className={`bt-chapitre${c.id === choisi?.id ? ' is-choisi' : ''}`} aria-pressed={c.id === choisi?.id}
                  style={c.id === choisi?.id ? { background: pastel(m.matiere) } : undefined} onClick={() => setChapitre(c.id)}>
                  <span className="bt-radio" aria-hidden="true" />{c.titre}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="bt-btn" onClick={creer} disabled={!choisi}>Créer le salon</button>
        </>
      )}
    </section>
  );
  const rejoindreCarte = (
    <form className="bt-carte bt-rejoindre" onSubmit={rejoindre} noValidate aria-labelledby="bt-rejoindre">
      <h2 id="bt-rejoindre" className="bt-h2">Rejoindre une battle</h2>
      <p className="bt-txt">Tape le code que ton ami t’a donné.</p>
      <label className="bt-code-saisie">
        <span className="bt-cache">Code de la battle</span>
        <input value={saisie} onChange={e => { setSaisie(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LONGUEUR_CODE)); setErreur(false); }}
          autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} inputMode="text" maxLength={LONGUEUR_CODE}
          aria-invalid={erreur || undefined} aria-describedby={erreur ? 'bt-code-erreur' : undefined} />
        <span className="bt-cases" aria-hidden="true">
          {Array.from({ length: LONGUEUR_CODE }, (_, i) => <i key={i} className={saisie[i] ? 'is-rempli' : i === saisie.length ? 'is-focus' : ''}>{saisie[i] ?? ''}</i>)}
        </span>
      </label>
      {erreur && <p id="bt-code-erreur" className="bt-erreur" role="alert">Un code fait 4 caractères, sans O, 0, I ni 1.</p>}
      <button type="submit" className="bt-btn" disabled={saisie.length < LONGUEUR_CODE}>Rejoindre</button>
    </form>
  );
  const regles = (
    <section className="bt-carte bt-regles" aria-labelledby="bt-regles">
      <h2 id="bt-regles" className="bt-h2">Les règles en bref</h2>
      <ul>
        <li><b className="is-plus">+{AURA.roundGagne}</b>si tu réponds juste le plus vite</li>
        <li><b>0</b>si juste, mais plus lent</li>
        <li><b className="is-moins">−{Math.abs(AURA.erreur)}</b>si faux</li>
      </ul>
      <p className="bt-txt">{ROUNDS} rounds, {CHRONO_MS / 1000} secondes par question. Être lent ne coûte rien : seule l’erreur fait perdre de l’aura.</p>
    </section>
  );

  return (
    <div className={`app app--no-halo bt-page${isDesktop ? ' app--large bt-page--large' : ''}`}>
      <div className="content bt-defile">
        <div className="bt-hero">
          <span className="bt-hero-moitie bt-hero-moitie--g" aria-hidden="true" />
          <span className="bt-hero-moitie bt-hero-moitie--d" aria-hidden="true" />
          <div className="bt-hero-haut">
            <button type="button" className="bt-retour" onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}><Chevron />Aujourd’hui</button>
          </div>
          <div className="bt-hero-titre">
            <div>
              <span className="bt-sur">Duel de révision</span>
              <h1 className="bt-titre">Battle</h1>
            </div>
            <BulleReviz lignes={['Toi contre un ami.', 'Même question, même moment.']} pointe="gauche" className="bt-bulle" />
          </div>
          <div className="bt-face" aria-hidden="true">
            <BattleMascot pose="garde" couleur="encre" size={isDesktop ? 210 : 150} priority alt="" />
            <span className="bt-vs">VS</span>
            <BattleMascot pose="garde" couleur="rouge" size={isDesktop ? 210 : 150} priority alt="" />
          </div>
        </div>
        {aura && (
          <div className="bt-carte bt-aura">
            <span className="bt-aura-rond" aria-hidden="true"><BattleMascot pose="aura" couleur="encre" size={60} alt="" /></span>
            <span><b>{aura.total} aura</b><span>{aura.jouees} {aura.jouees > 1 ? 'battles' : 'battle'} · {aura.gagnees} {aura.gagnees > 1 ? 'gagnées' : 'gagnée'}</span></span>
          </div>
        )}
        <div className="bt-colonnes">
          {lancer}
          <div className="bt-colonne">{rejoindreCarte}{regles}</div>
        </div>
      </div>
      {currentUser && <BottomNav />}
    </div>
  );
}
