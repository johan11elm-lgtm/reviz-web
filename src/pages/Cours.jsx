import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { Mascot } from '../components/Mascot';
import { RevizPlusSheet, RevizPlusBadge } from '../components/RevizPlus';
import { loadLessons, restoreLesson, deleteLesson, syncFromFirestore } from '../services/historyService';
import { loadRevisions, syncRevisionsFromFirestore } from '../services/revisionService';
import { getScanStatus } from '../services/scanLimitService';
import { SUBJECT_MAP, subjectKey, subjectMascot } from '../utils/subjects';
import { TEINTES, teinteMatiere, varsTeinte } from '../utils/teinteMatiere';
import { avancementLecon } from '../utils/avancementLecon';
import { useIsDesktop } from '../hooks/useMediaQuery';
import '../components/reviz/HerosMatiere.css';
import './Cours.css';
import { revenir } from '../utils/navigation';
import { ACHAT_DANS_L_APP } from '../utils/achat';

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

// Pastel et tranche de chaque matière (handoff Mes leçons du 21/10).
const PASTELS = new Map([
  [TEINTES.lavande, { pastel: 'var(--rv-lavande)', fonce: 'var(--rv-lavande-bulle)', pointille: 'var(--rv-lavande-pointille)' }],
  [TEINTES.peche, { pastel: 'var(--rv-peche-pale)', fonce: 'var(--rv-peche-bulle)', pointille: 'var(--rv-peche-pointille)' }],
  [TEINTES.rose, { pastel: 'var(--rv-rose)', fonce: 'var(--rv-rose-tranche)', pointille: 'var(--rv-rose-pointille)' }],
  [TEINTES.menthe, { pastel: 'var(--rv-menthe)', fonce: 'var(--rv-menthe-tranche)', pointille: 'var(--rv-menthe-pointille)' }],
]);
const couleurs = matiere => PASTELS.get(teinteMatiere(matiere)) ?? PASTELS.get(TEINTES.peche);

const dateCourte = ts => new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
function ilYa(ts) {
  const jours = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / 86400000);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return 'hier';
  if (jours < 7) return `il y a ${jours} jours`;
  return `le ${dateCourte(ts)}`;
}

// Recherche insensible aux accents et à la casse ; renvoie [avant, trouvé, après] ou null.
const plat = c => c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
function trouver(titre, q) {
  if (!q) return [titre, '', ''];
  const chars = [...titre];
  const norm = chars.map(c => plat(c).slice(0, 1) || c).join('');
  const i = norm.indexOf([...q].map(c => plat(c).slice(0, 1) || c).join(''));
  if (i < 0) return null;
  const n = [...q].length;
  return [chars.slice(0, i).join(''), chars.slice(i, i + n).join(''), chars.slice(i + n).join('')];
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
);
const Plus = ({ taille = 22 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
);
const Loupe = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
const Croix = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
);
const Points = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
);
const Corbeille = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
);
const Fleche = ({ taille = 18 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
const Coche = ({ taille = 11 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
const Grille = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></svg>
);

const NOMS_ETAPES = ['Résumé', 'Flashcards', 'Quiz'];
/** Les 3 cases du parcours Résumé → Flashcards → Quiz. */
function Cases({ etapes, grand = false, pointille }) {
  return (
    <span className={`le-cases${grand ? ' le-cases--grand' : ''}`} role="img"
      aria-label={etapes.map((s, i) => `${NOMS_ETAPES[i]} ${s === 'fait' ? 'fait' : s === 'cours' ? 'en cours' : 'à faire'}`).join(', ')}>
      {etapes.map((s, i) => (
        <span key={i} className="le-cases-pas">
          {grand && i > 0 && <i className="le-cases-trait" style={{ borderColor: pointille }} />}
          <span className={`le-case le-case--${s}`}>{grand && s === 'fait' && <Coche />}</span>
        </span>
      ))}
    </span>
  );
}
const Pastille = ({ a }) => <span className={`le-pastille le-pastille--${a.etat === 'encours' && a.aRevoir > 0 ? 'travailler' : a.etat}`}><i />{a.pastille}</span>;

const FORMATS = [
  { nom: 'Résumé', meta: '5 min de lecture', pose: 'reading', fond: 'var(--rv-lavande)' },
  { nom: 'Flashcards', meta: '8 cartes', pose: 'flashcard', fond: 'var(--rv-peche-pale)' },
  { nom: 'Quiz corrigé', meta: '7 questions', pose: 'quiz', fond: 'var(--rv-menthe)' },
  { nom: 'Carte mentale', meta: "Vue d'ensemble", pose: 'thinking', fond: 'var(--rv-rose)' },
];

/**
 * Mes leçons scannées (handoff Claude Design du 21/10) : héros pêche avec Réviz, carte « Scanner
 * une leçon » et son quota, « À reprendre », puis les leçons par matière avec recherche, filtre,
 * état, parcours en 3 cases et suppression confirmée. État vide et mode essai.
 */
export default function Cours() {
  const navigate = useNavigate();
  const { isGuest } = useAuth();
  const isDesktop = useIsDesktop();
  const [toutes, setToutes] = useState(() => loadLessons());
  const [revisions, setRevisions] = useState(() => loadRevisions());
  const [synchro, setSynchro] = useState(true);
  const [q, setQ] = useState('');
  const [filtre, setFiltre] = useState('all');
  const [menu, setMenu] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);
  const [offre, setOffre] = useState(false);

  useEffect(() => {
    // Les révisions (dernière ouverture, résumé lu, quiz fait) arrivent avec les leçons.
    Promise.all([syncFromFirestore().then(setToutes), syncRevisionsFromFirestore().then(setRevisions)])
      .finally(() => setSynchro(false));
  }, []);

  // Les leçons scannées (ou collées), de la plus récente à la plus ancienne ; chacune avec son avancement.
  const lecons = useMemo(() => {
    return toutes
      .filter(l => l.source !== 'programme')
      .sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt))
      .map(l => ({ ...l, matiere: l.metadata.subject || 'Autre', titre: l.metadata.title, av: avancementLecon(l, revisions) }));
  }, [toutes, revisions]);
  const ordre = Object.keys(SUBJECT_MAP);
  const matieres = useMemo(() => {
    const m = new Map();
    lecons.forEach(l => {
      const id = subjectKey(l.matiere) ?? l.matiere.toLowerCase();
      if (!m.has(id)) m.set(id, { id, nom: l.matiere, pose: subjectMascot(l.matiere), ...couleurs(l.matiere), lecons: [] });
      m.get(id).lecons.push(l);
    });
    return [...m.values()].sort((a, b) => (ordre.indexOf(a.id) + 1 || 99) - (ordre.indexOf(b.id) + 1 || 99));
  }, [lecons]); // eslint-disable-line react-hooks/exhaustive-deps

  const recherche = q.trim();
  const groupes = matieres
    .filter(m => filtre === 'all' || m.id === filtre)
    .map(m => ({ ...m, visibles: m.lecons.map(l => ({ ...l, morceaux: trouver(l.titre, recherche) })).filter(l => l.morceaux) }))
    .filter(m => m.visibles.length);
  const nbTrouvees = groupes.reduce((s, m) => s + m.visibles.length, 0);
  const aTravailler = lecons.reduce((s, l) => s + l.av.aRevoir, 0);
  const aLecons = lecons.length > 0;
  const chargement = synchro && !aLecons && !isGuest;

  // À reprendre : la dernière leçon ouverte (sinon la dernière scannée), hors recherche et filtre.
  const reprendre = useMemo(() => {
    const ouverte = [...lecons].filter(l => l.av.ouverteLe).sort((a, b) => b.av.ouverteLe - a.av.ouverteLe)[0];
    return ouverte ?? lecons[0] ?? null;
  }, [lecons]);
  const voirReprendre = reprendre && !recherche && filtre === 'all';

  const scan = getScanStatus();
  const illimite = !Number.isFinite(scan.remaining);

  // Ce que dit Réviz.
  const lignes = isGuest ? ['Tes cours deviennent des révisions.', 'Il te faut juste un compte gratuit.']
    : !aLecons ? ['Aucune leçon pour l’instant.', 'Scanne ton cours, je prépare le reste.']
    : [`${pluriel(lecons.length, 'leçon')} ${lecons.length > 1 ? 'scannées' : 'scannée'}.`,
       aTravailler ? `${pluriel(aTravailler, 'carte')} ${aTravailler > 1 ? 't’attendent' : 't’attend'} aujourd’hui.` : 'Tout est à jour, bravo.'];

  function ouvrir(l) { restoreLesson(l.id); navigate('/analyse'); }
  function reprendreLecon(l) { restoreLesson(l.id); navigate(l.av.etat === 'decouvrir' ? '/resume' : l.av.step.to); }
  function supprimer() {
    deleteLesson(aSupprimer.id);
    setToutes(loadLessons());
    setASupprimer(null);
    setFiltre(f => (matieres.find(m => m.id === f)?.lecons.length > 1 ? f : 'all'));
  }
  useEffect(() => {
    if (!aSupprimer && menu === null) return;
    const echap = e => { if (e.key === 'Escape') { setASupprimer(null); setMenu(null); } };
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [aSupprimer, menu]);

  // ── Blocs ──
  const surtitre = isGuest ? 'Mode essai' : aLecons ? `${pluriel(lecons.length, 'leçon')} · ${pluriel(matieres.length, 'matière')}` : 'Bibliothèque';
  // Façon app Nomad (28/10) : pas de mascotte qui parle, son message dans un bloc pêche avec une émote.
  const reviz = (
    <div className="lc-bloc">
      <p className="lc-bloc-txt">{lignes.join(' ')}</p>
      <span className="lc-bloc-reviz rv-levite" aria-hidden="true"><Mascot pose={aLecons ? 'reading' : 'scanphone'} size={isDesktop ? 100 : 80} alt="" /></span>
    </div>
  );
  const quota = illimite ? (
    <div className="le-quota le-quota--illimite">
      <RevizPlusBadge />
      <span className="le-quota-txt">Scans illimités</span>
    </div>
  ) : (
    <div className="le-quota">
      <span className="le-quota-segments" aria-hidden="true">
        {Array.from({ length: scan.limit }, (_, i) => <i key={i} className={i < scan.used ? 'is-pris' : ''} />)}
      </span>
      <span className="le-quota-txt">{scan.remaining > 0 ? `${pluriel(scan.remaining, 'scan')} ${scan.remaining > 1 ? 'restants' : 'restant'}${isDesktop ? ' cette semaine' : ''}` : 'Plus de scan cette semaine'}</span>
      {ACHAT_DANS_L_APP && <button type="button" className="le-quota-plus" onClick={() => setOffre(true)}>Illimité avec Réviz+</button>}
    </div>
  );
  const carteScan = isGuest ? (
    <div className="le-carte le-carte--scan le-carte--essai">
      <div className="le-scan-haut">
        <span className="le-scan-rond" aria-hidden="true"><Mascot pose="scanphone" size={isDesktop ? 68 : 60} alt="" /></span>
        <span className="le-scan-txt">
          <b>Garde tes leçons</b>
          <span>Pour scanner, il faut un compte. Il est gratuit.</span>
        </span>
      </div>
      <button type="button" className="le-btn le-btn--orange" onClick={() => navigate('/inscription')}>Créer mon compte gratuit</button>
      <p className="le-essai-note">Tu peux continuer à explorer l’appli sans compte.</p>
    </div>
  ) : (
    <div className="le-carte le-carte--scan">
      <button type="button" className="le-scan-haut le-scan-bouton" onClick={() => navigate('/scan')}>
        <span className="le-scan-rond" aria-hidden="true"><Mascot pose="scanphone" size={isDesktop ? 68 : 60} alt="" /></span>
        <span className="le-scan-txt">
          <b>Scanner une leçon</b>
          <span>Photo ou texte collé</span>
        </span>
        <span className="le-scan-plus" aria-hidden="true"><Plus taille={isDesktop ? 24 : 22} /></span>
      </button>
      {quota}
    </div>
  );
  const carteReprendre = voirReprendre && (() => {
    const c = couleurs(reprendre.matiere);
    const quand = reprendre.av.ouverteLe ? `ouverte ${ilYa(reprendre.av.ouverteLe)}` : `scannée ${ilYa(reprendre.scannedAt)}`;
    return (
      <div className="le-reprendre rv-ilot" style={{ '--le-pastel': c.pastel, '--le-fonce': c.fonce }}>
        <div className="le-reprendre-haut">
          <span className="le-rond-matiere" aria-hidden="true"><Mascot pose={subjectMascot(reprendre.matiere)} size={isDesktop ? 56 : 48} alt="" /></span>
          <span className="le-reprendre-txt">
            <span className="le-reprendre-sur">{isDesktop ? 'À reprendre · ' : ''}{reprendre.matiere} · {quand}</span>
            <span className="le-reprendre-titre">{reprendre.titre}</span>
          </span>
        </div>
        <div className="le-reprendre-bas">
          <span className="le-reprendre-etat">
            <Cases etapes={reprendre.av.etapes} grand pointille={c.pointille} />
            <span className="le-reprendre-pastille">{isDesktop && reprendre.av.etat !== 'decouvrir' ? `${NOMS_ETAPES[Math.max(0, reprendre.av.etapes.indexOf('cours'))]} · ` : ''}{reprendre.av.pastille}</span>
          </span>
          <button type="button" className="le-btn le-btn--orange le-btn--petit" onClick={() => reprendreLecon(reprendre)}>
            Reprendre<Fleche />
          </button>
        </div>
      </div>
    );
  })();

  const champ = (
    <div className={`le-recherche${recherche ? ' is-rempli' : ''}`}>
      <Loupe />
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={isDesktop ? 'Chercher une leçon par son titre' : 'Chercher une leçon'} aria-label="Chercher une leçon" />
      {q && (isDesktop
        ? <button type="button" className="le-effacer-txt" onClick={() => setQ('')}>Effacer</button>
        : <button type="button" className="le-effacer" onClick={() => setQ('')} aria-label="Effacer la recherche"><Croix /></button>)}
    </div>
  );
  const ligneResultat = recherche && (
    <p className="le-resultat" role="status">{pluriel(nbTrouvees, 'résultat')} pour « {recherche} »</p>
  );
  const titreLecon = l => <>{l.morceaux[0]}{l.morceaux[1] && <mark>{l.morceaux[1]}</mark>}{l.morceaux[2]}</>;
  const menuLecon = l => (
    <>
      <button type="button" className={`le-points${menu === l.id ? ' is-ouvert' : ''}`} aria-label={`Options de ${l.titre}`} aria-expanded={menu === l.id}
        onClick={e => { e.stopPropagation(); setMenu(m => (m === l.id ? null : l.id)); }}><Points /></button>
      {menu === l.id && (
        <button type="button" className="le-menu" onClick={e => { e.stopPropagation(); setMenu(null); setASupprimer(l); }}>
          <Corbeille />{isDesktop ? 'Supprimer la leçon' : 'Supprimer'}
        </button>
      )}
    </>
  );
  const listeGroupes = groupes.map(m => (
    <section key={m.id} className="le-groupe" style={{ '--le-pastel': m.pastel, '--le-fonce': m.fonce }}>
      <div className="le-groupe-tete">
        <span className="le-rond-matiere le-rond-matiere--petit" aria-hidden="true"><Mascot pose={m.pose} size={isDesktop ? 40 : 36} alt="" /></span>
        <h3>{m.nom}</h3>
        <span className="le-groupe-nb">{pluriel(m.visibles.length, 'leçon')}</span>
      </div>
      {isDesktop ? (
        <ul className="le-grille">
          {m.visibles.map((l, i) => (
            <li key={l.id} className="le-tuile">
              <button type="button" className="le-tuile-ouvrir" onClick={() => ouvrir(l)} aria-label={`Ouvrir ${l.titre}`} />
              <span className="le-miniature" style={{ transform: `rotate(${i % 2 ? 3 : -3}deg)` }} aria-hidden="true"><i /><i /><i /><i /></span>
              {menuLecon(l)}
              <span className="le-tuile-titre">{titreLecon(l)}</span>
              <span className="le-date">Scannée le {dateCourte(l.scannedAt)}</span>
              <span className="le-tuile-bas"><Pastille a={l.av} /><Cases etapes={l.av.etapes} /></span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="le-liste">
          {m.visibles.map(l => (
            <li key={l.id} className="le-ligne">
              <button type="button" className="le-ligne-ouvrir" onClick={() => ouvrir(l)}>
                <span className="le-ligne-titre">{titreLecon(l)}</span>
                <span className="le-date">Scannée le {dateCourte(l.scannedAt)}</span>
                <span className="le-ligne-etat"><Pastille a={l.av} /><Cases etapes={l.av.etapes} /></span>
              </button>
              {menuLecon(l)}
            </li>
          ))}
        </ul>
      )}
    </section>
  ));
  const aucun = (
    <div className="le-aucun">
      <b>Aucune leçon ne correspond.</b>
      <span>Essaie un autre mot, ou change de matière.</span>
    </div>
  );
  const exemple = (
    <section className="le-exemple">
      <h2 className="le-h2">Ce que Réviz prépare</h2>
      <p className="le-exemple-sous">Exemple avec une leçon de SVT, « Le cycle de l’eau ».</p>
      <div className="le-exemple-carte">
        <div className="le-exemple-haut">
          <span className="le-miniature le-miniature--exemple" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="le-exemple-fleche" aria-hidden="true"><Fleche taille={22} /></span>
          <p>Une photo de ton cahier suffit. Réviz en tire 4 façons de réviser.</p>
        </div>
        <ul className="le-formats">
          {FORMATS.map(f => (
            <li key={f.nom}>
              <span className="le-format-rond" style={{ background: f.fond }} aria-hidden="true"><Mascot pose={f.pose} size={isDesktop ? 56 : 40} alt="" /></span>
              <span><b>{f.nom}</b><span>{f.meta}</span></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
  const squelette = (
    <div className="le-squelette" role="status" aria-label="Synchronisation de tes leçons…">
      <div className="rv-skeleton rv-skeleton--title" />
      <div className="le-squelette-carte" />
      <div className="le-squelette-carte" />
    </div>
  );
  const fenetre = aSupprimer && (
    <>
      <div className="le-voile" onClick={() => setASupprimer(null)} aria-hidden="true" />
      <div className="le-dialogue" role="dialog" aria-modal="true" aria-labelledby="le-dialogue-titre">
        <h2 id="le-dialogue-titre">Supprimer cette leçon ?</h2>
        <p className="le-dialogue-lecon">« {aSupprimer.titre} »</p>
        <p className="le-dialogue-txt">Le résumé, les flashcards, le quiz et la carte mentale de cette leçon seront supprimés.</p>
        <div className="le-dialogue-btns">
          <button type="button" className="le-btn le-btn--creme" onClick={() => setASupprimer(null)} autoFocus>Annuler</button>
          <button type="button" className="le-btn le-btn--orange" onClick={supprimer}>Supprimer</button>
        </div>
      </div>
    </>
  );
  const fermeMenu = menu !== null && <div className="le-attrape" onClick={() => setMenu(null)} aria-hidden="true" />;
  const retour = <button type="button" className="ch-retour" onClick={() => revenir(navigate, '/programme')}><Chevron />Programme</button>;
  const racine = `app app--no-halo ch-page le-page${isDesktop ? ' app--large ch-page--large le-page--large' : ''}`;

  // ── Ordinateur ──
  if (isDesktop) {
    return (
      <div className={racine} style={varsTeinte(TEINTES.peche)}>
        <div className="content le-defile">
          <header className="lc-entete lc-entete--large">
            <div className="ch-haut">{retour}</div>
            <div className="lc-entete-grille">
              <div>
                <span className="lc-sur">{surtitre}</span>
                <h1 className="lc-titre">Mes leçons scannées</h1>
              </div>
              {reviz}
            </div>
          </header>
          <div className={`le-cartes${carteReprendre ? '' : ' le-cartes--seule'}`}>
            {carteScan}
            {carteReprendre}
          </div>
          {chargement ? <div className="le-corps">{squelette}</div> : aLecons ? (
            <div className="le-corps le-corps--deux">
              <aside className="le-matieres">
                <h2 className="le-matieres-titre">Matières</h2>
                <ul>
                  {[{ id: 'all', nom: 'Toutes', n: lecons.length }, ...matieres.map(m => ({ ...m, n: m.lecons.length }))].map(m => (
                    <li key={m.id}>
                      <button type="button" className={`le-matiere${filtre === m.id ? ' is-active' : ''}`} aria-pressed={filtre === m.id} onClick={() => setFiltre(m.id)}>
                        <span className="le-matiere-rond" style={{ background: m.pastel ?? 'var(--rv-fond)' }} aria-hidden="true">
                          {m.id === 'all' ? <Grille /> : <Mascot pose={m.pose} size={36} alt="" />}
                        </span>
                        <span className="le-matiere-nom">{m.nom}</span>
                        <span className="le-matiere-n">{m.n}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
              <div className="le-droite">
                <div className="le-recherche-ligne">{champ}{ligneResultat}</div>
                {groupes.length ? listeGroupes : aucun}
              </div>
            </div>
          ) : <div className="le-corps">{exemple}</div>}
        </div>
        {fermeMenu}
        {fenetre}
        {offre && <RevizPlusSheet onClose={() => setOffre(false)} />}
      </div>
    );
  }

  // ── Téléphone ──
  return (
    <div className={racine} style={varsTeinte(TEINTES.peche)}>
      <div className="content le-defile">
        <header className="lc-entete">
          <div className="ch-haut">{retour}</div>
          <span className="lc-sur">{surtitre}</span>
          <h1 className="lc-titre">Mes leçons</h1>
        </header>
        {reviz}
        {carteScan}
        {chargement ? squelette : aLecons ? (
          <>
            {carteReprendre && (
              <section className="le-section">
                <h2 className="le-h2">À reprendre</h2>
                {carteReprendre}
              </section>
            )}
            <section className="le-section">
              <div className="le-section-tete">
                <h2 className="le-h2 le-h2--grand">Toutes mes leçons</h2>
                <span>{pluriel(lecons.length, 'leçon')}</span>
              </div>
              {champ}
              {matieres.length > 1 && (
                <div className="le-filtres" role="group" aria-label="Filtrer par matière">
                  {[{ id: 'all', nom: 'Toutes', n: lecons.length }, ...matieres.map(m => ({ ...m, n: m.lecons.length }))].map(m => (
                    <button key={m.id} type="button" className={`le-filtre${filtre === m.id ? ' is-active' : ''}${m.pastel ? ' le-filtre--rond' : ''}`}
                      aria-pressed={filtre === m.id} onClick={() => setFiltre(m.id)}>
                      {m.pastel && <i style={{ background: m.pastel }} />}{m.nom}<span>{m.n}</span>
                    </button>
                  ))}
                </div>
              )}
              {ligneResultat}
              {groupes.length ? listeGroupes : aucun}
            </section>
          </>
        ) : exemple}
      </div>
      {fermeMenu}
      {fenetre}
      {offre && <RevizPlusSheet onClose={() => setOffre(false)} />}
      <BottomNav />
    </div>
  );
}
