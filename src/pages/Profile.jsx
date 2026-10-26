import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadLessons, syncFromFirestore } from '../services/historyService';
import { loadRevisions, syncRevisionsFromFirestore } from '../services/revisionService';
import { getUserProfile } from '../services/userProfileService';
import { BottomNav } from '../components/BottomNav';
import { LevelSelector } from '../components/LevelSelector';
import { Mascot } from '../components/Mascot';
import { Pantin } from '../components/Pantin';
import { BulleReviz } from '../components/reviz/BulleReviz';
import { computeStreak, computeLevel, computeBadges, XP_PAR_NIVEAU, XP_PAR_LECON } from '../utils/gamification';
import { phaseRevizPlus } from '../utils/revizPlus';
import { DERNIER_JOUR_OFFERT } from '../../api/_lancement.js';
import { TEINTES, varsTeinte } from '../utils/teinteMatiere';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useModalA11y } from '../hooks/useModalA11y';
import { MaSemaine, MaMemoire, MonProgramme } from '../components/moi/MesProgres';
import { hasProgramme, PROGRAMME_FALLBACK } from '../utils/programme';
import '../components/reviz/HerosMatiere.css';
import './Profile.css';

const pluriel = (n, mot, motPluriel = `${mot}s`) => `${n > 1 ? motPluriel : mot}`;
// Pastels des badges, en boucle : fond et tranche (handoff Moi du 21/10).
const PASTELS = [['#E4E0FA', '#C9C2F2'], ['#FFE6D2', '#FFC596'], ['#DCF5E6', '#A8E3C2'], ['#FFD9E4', '#F4B8CB']];
const CLASSES_COLLEGE = ['6ème', '5ème', '4ème', '3ème'];
const classeCourte = c => c?.replace('ème', 'e') ?? '';

const Engrenage = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.12-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.12 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03Z" /></svg>
);
const Coche = ({ taille = 13 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
const Chevron = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
);
const Croix = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
);
const Flamme = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="#C25407" aria-hidden="true"><path d="M12 2c1 3.5 5 5.5 5 11a5 5 0 0 1-10 0c0-2.4 1.1-4 2.3-5.2.2 1.6.9 2.6 1.9 3.2C11 8 11 5 12 2z" /></svg>
);
const CocheEncre = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#1B1A23" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
const Livre = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#1B1A23" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2zM9 4v16" /></svg>
);
const Crayon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20l4-1L19 8l-3-3L5 16zM14 6l3 3" /></svg>
);
const Bulle = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 5h14v10H10l-4 4v-4H5z" /></svg>
);

// Badge le plus proche : le moins d'actions restantes, puis la plus grande part déjà faite.
function prochainBadge(badges) {
  return badges.filter(b => b.locked)
    .sort((a, b) => ((a.target - a.current) - (b.target - b.current)) || (b.current / b.target - a.current / a.target))[0] ?? null;
}
// Ce qu'il reste à faire pour un badge, et où aller.
function conseil(b) {
  const reste = b.target - b.current;
  if (b.id === 'lanceur') return { texte: 'Ouvre ta première leçon pour l’obtenir.', action: 'Ouvrir une leçon', to: '/programme' };
  if (b.id === 'rapide') return { texte: 'Fais ta première révision pour l’obtenir.', action: 'Faire ma première révision', to: '/programme' };
  if (b.id === 'curieux' || b.id === 'precis') return { texte: 'Essaie un autre format pour l’obtenir.', action: 'Essayer un autre format', to: '/programme' };
  if (['regulier', '7jours', 'fidele'].includes(b.id)) return { texte: 'Reviens demain pour l’obtenir.', action: 'Réviser aujourd’hui', to: '/' };
  return { texte: `Encore ${reste} pour l’obtenir.`, action: 'Réviser maintenant', to: '/programme' };
}

function Feuille({ titre, onClose, grand, children }) {
  const ref = useModalA11y(onClose, true);
  return (
    <div className="mo-voile" onClick={onClose}>
      <div className={`mo-feuille${grand ? ' mo-feuille--fenetre' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-label={titre} onClick={e => e.stopPropagation()}>
        {!grand && <span className="mo-poignee" aria-hidden="true" />}
        <button type="button" className="mo-fermer" onClick={onClose} aria-label="Fermer"><Croix /></button>
        {children}
      </div>
    </div>
  );
}

/**
 * Moi (handoff Claude Design du 21/10) : qui est l'élève, où il en est, ce qu'il a gagné. Héros
 * lavande avec Réviz fier, carte du niveau à cheval, chiffres, badges (le prochain mis en avant,
 * détail au toucher), Battle, Réviz+, compte. Débutant et mode essai sans culpabiliser.
 */
export default function Profile() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { currentUser, getUserLevel, setUserLevel, updateDisplayName, isGuest, hasRevizPlus, isPremium } = useAuth();
  const prenom = currentUser?.displayName?.split(' ')[0] ?? '';
  const niveauScolaire = getUserLevel();

  const [lecons, setLecons] = useState(() => loadLessons());
  const [revisions, setRevisions] = useState(() => loadRevisions());
  useEffect(() => {
    syncFromFirestore().then(setLecons);
    syncRevisionsFromFirestore().then(setRevisions);
  }, []);
  // Aura de la Battle : écrite par le serveur sur le profil (api/battle-fin.js).
  const [battle, setBattle] = useState(null);
  useEffect(() => {
    if (isGuest || !currentUser?.uid) return;
    getUserProfile(currentUser.uid)
      .then(p => setBattle({ aura: p?.aura ?? 0, jouees: p?.battles?.jouees ?? 0, gagnees: p?.battles?.gagnees ?? 0 }))
      .catch(() => {});
  }, [isGuest, currentUser?.uid]);

  const serie = computeStreak(revisions, 'revisedAt');
  const { level, xpInLvl, fillPct } = computeLevel(lecons);
  const badges = computeBadges(lecons, revisions, serie, level);
  const obtenus = badges.filter(b => !b.locked).length;
  const prochain = prochainBadge(badges);
  const debutant = lecons.length === 0 && revisions.length === 0;

  const [detail, setDetail] = useState(null);
  const [edition, setEdition] = useState(null); // { prenom, niveau }
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');
  async function enregistrer() {
    if (!edition.prenom.trim()) return;
    setEnregistrement(true); setErreur('');
    try {
      await updateDisplayName(edition.prenom.trim());
      if (edition.niveau?.cycle && edition.niveau?.classe) setUserLevel(edition.niveau);
      setEdition(null);
    } catch { setErreur('Erreur lors de la sauvegarde, réessaie.'); }
    finally { setEnregistrement(false); }
  }

  // Ce que dit Réviz, et sa tête.
  const reste = XP_PAR_NIVEAU - xpInLvl;
  const lignes = debutant
    ? [prenom ? `Bienvenue, ${prenom}.` : 'Bienvenue.', 'Ta première révision te donne un badge.']
    : [`Niveau ${level}, ${isGuest ? 'bien joué' : 'bravo'}.`, `Encore ${reste} XP pour le niveau ${level + 1}.`];
  const pantin = useRef(null);
  const [parle, setParle] = useState(false);
  const texte = lignes.join('\n');
  useEffect(() => { if (parle) pantin.current?.dire(texte); }, [texte, parle]);
  useEffect(() => {
    let t;
    const essai = () => { t = setTimeout(() => (document.hidden ? essai() : setParle(true)), 4000); };
    essai();
    return () => clearTimeout(t);
  }, []);

  // ── Blocs ──
  const identite = (
    <div className="mo-identite">
      <div>
        <span className="mo-sur">Mon profil</span>
        <div className="mo-nom-ligne">
          <h1 className="mo-nom">{prenom || 'Toi'}</h1>
          {niveauScolaire?.classe && <span className="mo-classe">Classe de {classeCourte(niveauScolaire.classe)}</span>}
          {isDesktop && <button type="button" className="mo-reglages" onClick={() => navigate('/reglages')} aria-label="Réglages"><Engrenage /></button>}
        </div>
      </div>
      {!isDesktop && <button type="button" className="mo-reglages" onClick={() => navigate('/reglages')} aria-label="Réglages"><Engrenage /></button>}
    </div>
  );
  const reviz = (
    <div className={`mo-reviz${isDesktop ? ' mo-reviz--cote' : ''}`}>
      <BulleReviz key={texte} lignes={lignes} parle={parle} pointe={isDesktop ? 'droite' : 'bas'} grande={isDesktop} className="mo-bulle" />
      <Pantin ref={pantin} size={isDesktop ? 340 : 206} expression={debutant ? 'content' : 'fier'} entree={debutant ? 'coucou' : 'saut'} repli={null}
        onEntree={() => setParle(true)} onClick={() => pantin.current?.geste('saut')} label="Réviz, ta mascotte" />
    </div>
  );
  const carteNiveau = (
    <div className="mo-carte mo-niveau">
      <div className="mo-niveau-haut">
        <span className="mo-piece" aria-hidden="true">{level}</span>
        <span className="mo-niveau-txt"><b>Niveau {level}</b><span>{reste} XP avant le niveau {level + 1}</span></span>
        <span className="mo-xp">{xpInLvl} / {XP_PAR_NIVEAU} XP</span>
      </div>
      <div className="mo-barre" role="progressbar" aria-label={`${xpInLvl} XP sur ${XP_PAR_NIVEAU} pour passer au niveau ${level + 1}`}
        aria-valuemin={0} aria-valuemax={XP_PAR_NIVEAU} aria-valuenow={xpInLvl}>
        <i style={{ width: `${Math.max(fillPct, 2)}%` }} />
      </div>
      <p className="mo-astuce">+{XP_PAR_LECON} XP par leçon ouverte</p>
    </div>
  );
  const essai = isGuest && (
    <div className="mo-carte mo-essai">
      <Mascot pose="hello" size={40} alt="" aria-hidden="true" />
      <p><b>Mode essai</b> · ta progression est gardée sur cet appareil.</p>
      <button type="button" className="mo-lien" onClick={() => navigate('/inscription')}>Créer mon compte</button>
    </div>
  );
  const chiffres = (
    <div className="mo-chiffres">
      <div className="mo-chiffre mo-chiffre--peche"><span className="mo-chiffre-icone"><Flamme /></span><b>{serie}</b><span>{pluriel(serie, 'jour de suite', 'jours de suite')}</span></div>
      <div className="mo-chiffre mo-chiffre--lavande"><span className="mo-chiffre-icone"><CocheEncre /></span><b>{revisions.length}</b><span>{pluriel(revisions.length, 'révision')}</span></div>
      <div className="mo-chiffre mo-chiffre--menthe"><span className="mo-chiffre-icone"><Livre /></span><b>{lecons.length}</b><span>{pluriel(lecons.length, 'leçon')}</span></div>
    </div>
  );
  // Mes progrès (ancienne page à part, fusionnée dans Moi le 22/10) : la semaine, la mémoire, le programme.
  const classeProgramme = hasProgramme(niveauScolaire) ? niveauScolaire.classe : PROGRAMME_FALLBACK;
  const semaine = <MaSemaine revisions={revisions} />;
  const memoire = <MaMemoire lecons={lecons} />;
  const programme = <MonProgramme classe={classeProgramme} lecons={lecons} />;
  const carteProchain = prochain && (() => {
    const c = conseil(prochain);
    return (
      <div className="mo-prochain">
        <span className="mo-prochain-rond" aria-hidden="true"><Mascot pose={prochain.pose} size={isDesktop ? 84 : 60} alt="" /></span>
        <div className="mo-prochain-txt">
          <span className="mo-sur mo-sur--orange">Prochain badge</span>
          <b>{prochain.label}</b>
          <span>{c.texte}</span>
          <span className="mo-prochain-barre"><span className="mo-minibarre mo-minibarre--large"><i style={{ width: `${Math.round(prochain.current / prochain.target * 100)}%` }} /></span><em>{prochain.current} / {prochain.target}</em></span>
          {isDesktop && <button type="button" className="mo-btn mo-btn--petit" onClick={() => navigate(c.to)}>{c.action}</button>}
        </div>
      </div>
    );
  })();
  const grille = (
    <ul className="mo-badges">
      {badges.map((b, i) => {
        const [fond, tranche] = PASTELS[i % PASTELS.length];
        return (
          <li key={b.id}>
            <button type="button" className={`mo-badge${b.locked ? ' is-verrou' : ''}`} onClick={() => setDetail({ b, i })}
              aria-label={b.locked ? `${b.label} : ${b.hint} (${b.current} / ${b.target})` : `${b.label} : obtenu`}>
              <span className="mo-badge-rond" style={{ background: fond, boxShadow: `0 5px 0 ${tranche}` }} aria-hidden="true">
                <Mascot pose={b.pose} size={isDesktop ? 72 : 64} alt="" />
                {!b.locked && <span className="mo-badge-coche"><Coche /></span>}
              </span>
              <b>{b.label}</b>
              <span className="mo-badge-hint">{b.hint}</span>
              {b.locked && <span className="mo-badge-prog"><span className="mo-minibarre"><i style={{ width: `${Math.round(b.current / b.target * 100)}%` }} /></span>{b.current} / {b.target}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
  const carteBattle = (
    <div className="mo-carte mo-battle">
      {isDesktop && <h2 className="mo-h3">Battle</h2>}
      <div className="mo-battle-haut">
        <span className="mo-battle-rond" aria-hidden="true"><Mascot pose="quiz" size={52} alt="" /></span>
        {battle?.jouees ? (
          <span className="mo-battle-txt"><b>{battle.aura} aura</b><span>{battle.jouees} {pluriel(battle.jouees, 'battle')} · {battle.gagnees} {pluriel(battle.gagnees, 'gagnée')}</span></span>
        ) : (
          <span className="mo-battle-txt mo-battle-txt--vide"><b>Défie quelqu’un</b><span>En direct, sur un chapitre de ton programme</span></span>
        )}
      </div>
      <button type="button" className="mo-btn" onClick={() => navigate('/battle')}>{battle?.jouees ? 'Lancer une battle' : 'Défier quelqu’un'}</button>
    </div>
  );
  const phase = phaseRevizPlus();
  const revizPlus = hasRevizPlus && !isGuest && (
    <button type="button" className="mo-plus" onClick={() => navigate('/reglages')}>
      <Mascot pose="scanphone" size={40} alt="" aria-hidden="true" />
      <span className="mo-plus-txt"><b>Ton Réviz+</b><span>Scans et questions illimités</span></span>
      <span className="mo-plus-fin">{isPremium ? 'Abonnement actif' : phase === 'prolonge' ? 'Offert pendant le lancement' : `Offert jusqu’au ${DERNIER_JOUR_OFFERT}`}</span>
    </button>
  );
  const compte = (
    <ul className="mo-compte">
      {!isGuest && (
        <li><button type="button" onClick={() => { setEdition({ prenom, niveau: niveauScolaire ?? { cycle: null, classe: null, specialites: [], filiere: null } }); setErreur(''); }}>
          <span className="mo-compte-rond mo-compte-rond--lavande"><Crayon /></span><span className="mo-compte-txt"><b>Modifier le profil</b><span>Prénom et classe</span></span><Chevron />
        </button></li>
      )}
      <li><button type="button" onClick={() => navigate('/reglages')}>
        <span className="mo-compte-rond mo-compte-rond--peche"><Engrenage /></span><span className="mo-compte-txt"><b>Réglages</b></span><Chevron />
      </button></li>
      <li><button type="button" onClick={() => navigate('/avis?src=profil')}>
        <span className="mo-compte-rond mo-compte-rond--menthe"><Bulle /></span><span className="mo-compte-txt"><b>Donner mon avis</b></span><Chevron />
      </button></li>
    </ul>
  );
  const enTeteBadges = (
    <div className="mo-section-tete">
      <h2 className="mo-h2">Mes badges</h2>
      <span>{obtenus} sur {badges.length} {pluriel(obtenus, 'obtenu')}</span>
    </div>
  );

  const fenetres = (
    <>
      {detail && (() => {
        const { b, i } = detail;
        const [fond, tranche] = PASTELS[i % PASTELS.length];
        const c = conseil(b);
        return (
          <Feuille titre={b.label} onClose={() => setDetail(null)} grand={isDesktop}>
            <div className="mo-detail">
              <span className={`mo-detail-rond${b.locked ? ' is-verrou' : ''}`} style={{ background: fond, boxShadow: `0 6px 0 ${tranche}` }} aria-hidden="true"><Mascot pose={b.pose} size={130} alt="" /></span>
              <span className="mo-sur mo-sur--doux">Badge {i + 1} sur {badges.length}</span>
              <h2 className="mo-detail-nom">{b.label}</h2>
              <p className="mo-detail-txt">{b.hint}</p>
              {b.locked ? (
                <>
                  <div className="mo-detail-prog">
                    <div className="mo-detail-prog-haut"><b>Ta progression</b><b>{b.current} / {b.target}</b></div>
                    <div className="mo-barre" role="progressbar" aria-label={`${b.label} : ${b.current} sur ${b.target}`} aria-valuemin={0} aria-valuemax={b.target} aria-valuenow={b.current}>
                      <i style={{ width: `${Math.round(b.current / b.target * 100)}%` }} />
                    </div>
                    <span>{c.texte}</span>
                  </div>
                  <button type="button" className="mo-btn" onClick={() => navigate(c.to)}>{c.action}</button>
                </>
              ) : (
                <>
                  <span className="mo-obtenu"><Coche taille={12} />Obtenu</span>
                  <button type="button" className="mo-btn mo-btn--creme" onClick={() => setDetail(null)}>Fermer</button>
                </>
              )}
            </div>
          </Feuille>
        );
      })()}
      {edition && (
        <Feuille titre="Modifier le profil" onClose={() => setEdition(null)} grand={isDesktop}>
          <div className="mo-edition">
            <div className="mo-edition-tete"><span className="mo-edition-rond" aria-hidden="true"><Mascot pose="writing" size={44} alt="" /></span><h2>Modifier le profil</h2></div>
            <label className="mo-champ-titre" htmlFor="mo-prenom">Ton prénom</label>
            <input id="mo-prenom" className="mo-input" value={edition.prenom} maxLength={20} placeholder="Ton prénom"
              onChange={e => setEdition(x => ({ ...x, prenom: e.target.value }))} />
            <span className="mo-champ-titre">Ta classe</span>
            {(edition.niveau?.cycle ?? 'college') === 'college' ? (
              <div className="mo-classes" role="group" aria-label="Ta classe">
                {CLASSES_COLLEGE.map(c => (
                  <button key={c} type="button" className={`mo-classe-choix${edition.niveau?.classe === c ? ' is-choisie' : ''}`} aria-pressed={edition.niveau?.classe === c}
                    onClick={() => setEdition(x => ({ ...x, niveau: { cycle: 'college', classe: c, specialites: [], filiere: null } }))}>{classeCourte(c)}</button>
                ))}
              </div>
            ) : <LevelSelector value={edition.niveau} onChange={v => setEdition(x => ({ ...x, niveau: v }))} />}
            <p className="mo-note">Ton programme suit ta classe. Tes leçons et tes badges restent.</p>
            {erreur && <p className="mo-erreur" role="alert">{erreur}</p>}
            <button type="button" className="mo-btn" onClick={enregistrer} disabled={enregistrement || !edition.prenom.trim()}>{enregistrement ? 'Enregistrement…' : 'Enregistrer'}</button>
            <button type="button" className="mo-lien mo-lien--centre" onClick={() => setEdition(null)}>Annuler</button>
          </div>
        </Feuille>
      )}
    </>
  );
  const deco = (
    <>
      <span className="ch-deco ch-deco--a" aria-hidden="true" />
      <span className="ch-deco ch-deco--b" aria-hidden="true" />
      <span className="ch-point" aria-hidden="true" />
      <span className="ch-grain" aria-hidden="true" />
    </>
  );
  const racine = `app app--no-halo ch-page mo-page${isDesktop ? ' app--large ch-page--large mo-page--large' : ''}`;

  // ── Ordinateur ──
  if (isDesktop) {
    return (
      <div className={racine} style={varsTeinte(TEINTES.lavande)}>
        <div className="content mo-defile">
          <div className="ch-hero mo-hero">
            {deco}
            <div className="mo-hero-grille">
              <div className="mo-hero-gauche">{identite}{carteNiveau}{essai}</div>
              {reviz}
            </div>
          </div>
          <div className="mo-rangee">
            <div className="mo-carte mo-carte--bloc">
              <h2 className="mo-h3">Mes chiffres</h2>
              {chiffres}
            </div>
            {carteBattle}
            <div className="mo-carte mo-carte--bloc">
              <h2 className="mo-h3">Mon compte</h2>
              {compte}
              {revizPlus}
            </div>
          </div>
          <div className="mo-rangee mo-rangee--progres">{semaine}{memoire}{programme}</div>
          <section className="mo-section">
            {enTeteBadges}
            <div className={`mo-badges-zone${prochain ? '' : ' mo-badges-zone--seule'}`}>
              {carteProchain}
              <div className="mo-carte mo-badges-carte">{grille}</div>
            </div>
          </section>
        </div>
        {fenetres}
      </div>
    );
  }

  // ── Téléphone ──
  return (
    <div className={racine} style={varsTeinte(TEINTES.lavande)}>
      <div className="content mo-defile">
        <div className="ch-hero mo-hero">{deco}{identite}{reviz}</div>
        {carteNiveau}
        {essai}
        <section className="mo-section">{chiffres}{semaine}{memoire}</section>
        <section className="mo-section">
          {enTeteBadges}
          {carteProchain}
          {grille}
        </section>
        <section className="mo-section">{programme}</section>
        <section className="mo-section">
          <h2 className="mo-h2">Battle</h2>
          {carteBattle}
          {revizPlus}
        </section>
        <section className="mo-section">
          <h2 className="mo-h2">Mon compte</h2>
          <div className="mo-carte">{compte}</div>
        </section>
      </div>
      {fenetres}
      <BottomNav />
    </div>
  );
}
