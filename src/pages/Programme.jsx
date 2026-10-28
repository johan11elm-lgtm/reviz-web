import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { Mascot } from '../components/Mascot';
import { GuestBanner } from '../components/GuestBanner';
import { loadCatalogue, chapterProgress, openChapter } from '../services/programmeService';
import { loadLessons } from '../services/historyService';
import { track } from '../services/statsService';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { subjectMascot } from '../utils/subjects';
import { hasProgramme, PROGRAMME_CLASSES, PROGRAMME_FALLBACK } from '../utils/programme';
import './Programme.css';

/**
 * « Programme », façon onglet « Révisions » de l'app Nomad (29/10) : « Programme de [classe] »,
 * la recherche d'un chapitre, la carte « Ajoute ton cours », les matières en tuiles blanches,
 * puis les chapitres de la matière choisie en liste ; une ligne ouverte montre son détail.
 * Les contenus sont des fichiers statiques partagés (public/programme) : mode essai compris.
 *
 * Une case par chapitre : fait (maîtrisé), en cours (le dernier chapitre ouvert pas encore
 * maîtrisé, sinon le premier à découvrir), commencé ou à travailler (ouvert, pas maîtrisé),
 * à faire.
 */
const court = c => c.replace('ème', 'e');
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const sansAccents = t => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const ETIQUETTE = { done: 'Fait', current: 'En cours', commence: 'Commencé', 'a-revoir': 'À travailler', todo: 'À venir' };
// La case en cours qui n'a encore jamais été ouverte : c'est la prochaine, pas une case « en cours ».
const etiquette = it => (it.statut === 'current' && !it.lesson ? 'Prochain' : ETIQUETTE[it.statut]);
const COULEUR = { done: 'var(--rv-vert-texte)', current: 'var(--rv-orange-texte)', commence: 'var(--rv-orange-texte)', 'a-revoir': 'var(--rv-orange-texte)', todo: 'var(--rv-doux)' };
const ACTION = { done: 'Réviser', current: "C'est parti", commence: 'Reprendre', 'a-revoir': 'Reprendre', todo: 'Découvrir' };

const Coche = ({ taille = 24 }) => (
  <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
const IconeScan = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16" />
  </svg>
);

// Les chapitres d'une matière, avec l'état de chaque case et la progression.
function etatMatiere(m, lessons) {
  const items = m.chapitres.map((ch, i) => {
    const p = chapterProgress(ch, lessons);
    const statut = p.state === 'maitrise' ? 'done' : p.state === 'nouveau' ? 'todo' : p.state;
    return { ch, i, ...p, statut };
  });
  // En cours : le chapitre ouvert le plus récemment et pas encore maîtrisé (l'historique est du
  // plus récent au plus ancien), sinon le premier à découvrir.
  const rang = it => (it.lesson ? lessons.indexOf(it.lesson) : Infinity);
  const ouverts = items.filter(it => it.statut === 'commence' || it.statut === 'a-revoir').sort((a, b) => rang(a) - rang(b));
  const enCours = ouverts[0] ?? items.find(it => it.statut === 'todo') ?? null;
  if (enCours) enCours.statut = 'current';
  const faits = items.filter(it => it.statut === 'done').length;
  const demi = items.filter(it => it.lesson && it.statut !== 'done').length;
  return { ...m, items, enCours, faits, poids: faits + demi / 2, pct: items.length ? Math.round((faits + demi / 2) / items.length * 100) : 0 };
}

export default function Programme() {
  const navigate = useNavigate();
  const { getUserLevel, isGuest } = useAuth();
  const isDesktop = useIsDesktop();
  const level = getUserLevel();
  // Classe de l'élève si son programme est publié, sinon la 3e (lycée). Il peut parcourir une
  // autre classe sans changer la sienne.
  const classeEleve = hasProgramme(level) ? level.classe : PROGRAMME_FALLBACK;
  const [classe, setClasse] = useState(classeEleve);
  const autreClasse = !!level?.classe && !hasProgramme(level);
  const [choix, setChoix] = useState(false);

  const [catalogue, setCatalogue] = useState(null);
  const [error, setError] = useState(null);
  const lessons = useMemo(() => loadLessons(), []);
  // ?matiere=maths (agenda, accueil, lien d'une ancienne adresse) : la matière ouverte d'emblée.
  const [params] = useSearchParams();
  const [slug, setSlug] = useState(() => params.get('matiere'));
  const [caseChoisie, setCaseChoisie] = useState(null);
  const [ouverture, setOuverture] = useState(null); // id du chapitre en cours d'ouverture
  const [erreurChapitre, setErreurChapitre] = useState(false);
  const [recherche, setRecherche] = useState('');

  useEffect(() => { track('programme_ouvert', { classe }); }, [classe]);

  useEffect(() => {
    let alive = true;
    setCatalogue(null);
    setError(null);
    loadCatalogue(classe)
      .then(c => { if (alive) setCatalogue(c); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [classe]);

  const matieres = useMemo(() => (catalogue?.matieres ?? []).map(m => etatMatiere(m, lessons)), [catalogue, lessons]);
  // Matière ouverte par défaut : celle du dernier chapitre ouvert dans cette classe.
  const parDefaut = useMemo(() => {
    const l = lessons.find(x => x.source === 'programme' && (!x.classe || x.classe === classe) && x.matiere);
    return matieres.find(m => m.matiere === l?.matiere)?.slug ?? matieres[0]?.slug ?? null;
  }, [lessons, matieres, classe]);
  const matiere = matieres.find(m => m.slug === (slug ?? parDefaut)) ?? null;
  const totalChapitres = matieres.reduce((n, m) => n + m.items.length, 0);
  const pctProgramme = totalChapitres ? Math.round(matieres.reduce((n, m) => n + m.poids, 0) / totalChapitres * 100) : 0;
  const scannees = lessons.filter(l => l.source !== 'programme').length;

  const choisie = matiere ? Math.min(caseChoisie ?? matiere.enCours?.i ?? 0, matiere.items.length - 1) : 0;

  const choisirMatiere = s => { setSlug(s); setCaseChoisie(null); setErreurChapitre(false); };
  const choisirCase = i => { setCaseChoisie(i); setErreurChapitre(false); };

  async function lancer(it, m = matiere) {
    if (!it?.ch.pret || ouverture) return;
    setOuverture(it.ch.id);
    setErreurChapitre(false);
    try {
      await openChapter(classe, m.matiere, it.ch);
      navigate('/analyse');
    } catch {
      setErreurChapitre(true);
      setOuverture(null);
    }
  }

  // Recherche d'un chapitre dans toutes les matières de la classe (comme la barre de Nomad).
  const q = sansAccents(recherche.trim());
  const resultats = q.length >= 2
    ? matieres.flatMap(m => m.items.filter(it => sansAccents(it.ch.titre).includes(q)).map(it => ({ m, it }))).slice(0, 12)
    : [];

  const pastilleClasse = (
    <div className="prg-choix">
      <button type="button" className="prg-classe" aria-expanded={choix} aria-haspopup="listbox" onClick={() => setChoix(v => !v)}
        aria-label={`Classe de ${court(classe)}, changer de classe`}>
        {court(classe)}
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {choix && (
        <ul className="prg-choix-liste" role="listbox" aria-label="Classe">
          {PROGRAMME_CLASSES.map(c => (
            <li key={c} role="option" aria-selected={c === classe}>
              <button type="button" onClick={() => { setClasse(c); setSlug(null); setCaseChoisie(null); setChoix(false); }}>
                {c}{c === classeEleve ? ' · ta classe' : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  // En-tête façon onglet « Révisions » de Nomad : « Programme de [3e] », la recherche,
  // puis la carte encre « Ajoute ton cours » (le scan).
  const entete = (
    <header className="pn-entete">
      <div className="pn-titre-ligne">
        <h1 className="pn-titre">Programme de</h1>
        {pastilleClasse}
      </div>
      <div className="pn-recherche-zone">
        <label className="pn-recherche">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input type="search" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="On révise quoi aujourd’hui ?" aria-label="Chercher un chapitre" />
        </label>
        {resultats.length > 0 && (
          <ul className="pn-resultats" aria-label="Chapitres trouvés">
            {resultats.map(({ m, it }) => (
              <li key={`${m.slug}-${it.ch.id}`}>
                <button type="button" className="pn-resultat" onClick={() => lancer(it, m)} disabled={!it.ch.pret}>
                  <span className="pn-resultat-ico"><Mascot pose={subjectMascot(m.matiere)} size={34} alt="" aria-hidden="true" /></span>
                  <span className="pn-resultat-txt"><b>{it.ch.titre}</b><span>{m.matiere} · chapitre {it.i + 1}{it.ch.pret ? '' : ' · bientôt'}</span></span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {q.length >= 2 && !resultats.length && <p className="pn-rien">Aucun chapitre ne correspond en {court(classe)}.</p>}
      </div>
      <button type="button" className="pn-encre" onClick={() => navigate(isGuest ? '/scan' : '/cours')}>
        <span className="pn-encre-reviz"><Mascot pose="scanphone" size={isDesktop ? 72 : 64} alt="" aria-hidden="true" /></span>
        <span className="pn-encre-txt">
          <b>Ajoute ton cours</b>
          <span>{isGuest ? 'Prends ta leçon en photo, avec un compte gratuit' : scannees ? `${pluriel(scannees, 'leçon scannée')} · on te crée ton parcours de révision` : 'On te crée ton parcours de révision personnalisé'}</span>
        </span>
        <span className="pn-encre-fleche" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg></span>
      </button>
    </header>
  );

  const blocMatieres = (
    <section className="prg-bloc pn-matieres-bloc" aria-labelledby="prg-matieres">
      <div className="prg-tete">
        <h2 id="prg-matieres" className="pn-h2">Mes matières</h2>
        {catalogue && <span className="prg-compte">{pctProgramme} % du programme</span>}
      </div>
      <div className="pn-tuiles" role="radiogroup" aria-label="Matière">
        {!catalogue && [0, 1, 2, 3].map(i => <span key={i} className="pn-tuile pn-tuile--vide" aria-hidden="true" />)}
        {matieres.map(m => (
          <Tuile key={m.slug} m={m} on={m.slug === matiere?.slug} onClick={() => choisirMatiere(m.slug)} />
        ))}
      </div>
    </section>
  );

  const blocChapitres = matiere && (
    <section className="prg-bloc prg-bloc--chapitres pn-chapitres-bloc" aria-labelledby="prg-chapitres">
      <div className="prg-tete">
        <h2 id="prg-chapitres" className="pn-h2">Chapitres · {matiere.matiere}</h2>
        <span className="prg-compte">{matiere.faits} / {matiere.items.length}</span>
      </div>
      <ol className="pn-liste">
        {matiere.items.map((it, i) => {
          const st = it.statut, sel = i === choisie;
          return (
            <li key={it.ch.id} className={`pn-chap pn-chap--${st}${sel ? ' pn-chap--ouvert' : ''}`}>
              <button type="button" className="pn-chap-ligne" onClick={() => choisirCase(i)} aria-expanded={sel}
                aria-label={`Chapitre ${i + 1} : ${it.ch.titre}, ${etiquette(it).toLowerCase()}`}>
                <span className="pn-chap-rond" aria-hidden="true">
                  {st === 'done' ? <Coche taille={16} /> : st === 'current' ? <Mascot pose={subjectMascot(matiere.matiere)} size={34} alt="" /> : i + 1}
                </span>
                <span className="pn-chap-txt" aria-hidden="true">
                  <span className="pn-chap-nom">{it.ch.titre}</span>
                  <span className="pn-chap-etat" style={{ color: COULEUR[st] }}>{st === 'todo' && !it.ch.pret ? 'Bientôt' : etiquette(it)}</span>
                </span>
                <svg className="pn-chap-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              {sel && (
                <Detail
                  it={it}
                  ouverture={ouverture === it.ch.id}
                  erreur={erreurChapitre}
                  grand={isDesktop}
                  onLancer={() => lancer(it)}
                  onScanner={() => navigate('/scan')}
                />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );

  return (
    <div className={`app app--no-halo prg-page pn-page${isDesktop ? ' app--large prg-page--large pn-page--large' : ''}`}>
      <div className="content prg-defile pn-defile">
        <div className="pn-cadre">
          {entete}
          {isGuest && !isDesktop && <GuestBanner className="pn-essai" />}
          {autreClasse && classe === classeEleve && (
            <p className="prg-note">Le programme de {level.classe} arrive bientôt. En attendant, voici celui de {classe}.</p>
          )}
          {error ? (
            <div className="rv-empty-state prg-erreur">
              <Mascot pose="confused" size={140} className="rv-empty-state-mascot" alt="" aria-hidden="true" />
              <h2 className="rv-empty-state-title">Programme indisponible</h2>
              <p className="rv-empty-state-sub">Impossible de charger les chapitres pour le moment. Vérifie ta connexion et réessaie.</p>
              <button type="button" className="rv-btn-cta" onClick={() => navigate(0)}>Réessayer</button>
            </div>
          ) : (
            <div className="pn-grille">
              {blocMatieres}
              {blocChapitres}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

/** Une matière, en tuile blanche comme chez Nomad : l'émote, le nom, l'avancement. */
function Tuile({ m, on, onClick }) {
  return (
    <button type="button" role="radio" aria-checked={on} className={`pn-tuile${on ? ' pn-tuile--on' : ''}`} onClick={onClick}
      aria-label={`${m.matiere} : ${m.faits} sur ${m.items.length} chapitres faits`}>
      <span className="pn-tuile-ico"><Mascot pose={subjectMascot(m.matiere)} size={44} alt="" aria-hidden="true" /></span>
      <span className="pn-tuile-txt">
        <span className="pn-tuile-nom">{m.matiere}</span>
        <span className="pn-tuile-pct">{m.pct} %</span>
      </span>
    </button>
  );
}

/** Le détail du chapitre ouvert, sous sa ligne : contenu, cartes à revoir, de quoi le lancer. */
function Detail({ it, ouverture, erreur, grand, onLancer, onScanner }) {
  const st = it.statut;
  // Cartes à revoir : seulement une fois les flashcards commencées (sinon toutes comptent).
  const aRevoir = it.state === 'a-revoir' ? it.dueCards : 0;
  const contenu = it.ch.pret
    ? `${it.ch.flashcards} flashcards · quiz de ${it.ch.quiz} questions · résumé et carte mentale`
    : 'Ce chapitre arrive bientôt.';
  return (
    <div className={`prg-detail${grand ? ' prg-detail--grand' : ''}`}>
      {/* Le nom est déjà sur la ligne : ce titre sert aux lecteurs d'écran. */}
      <h3 className="prg-detail-nom">{it.ch.titre}</h3>
      <p className="prg-detail-contenu">{erreur ? 'Impossible d’ouvrir ce chapitre pour le moment. Réessaie.' : contenu}</p>
      {aRevoir > 0 && !erreur && <p className="prg-detail-revoir">{pluriel(aRevoir, 'carte')} à revoir</p>}
      <div className="prg-detail-actions">
        <button type="button" className="prg-go" onClick={onLancer} disabled={!it.ch.pret || ouverture}>
          {!it.ch.pret ? 'Bientôt' : ouverture ? 'Ouverture…' : ACTION[st]}
        </button>
        <button type="button" className="prg-scanner" onClick={onScanner}>
          <IconeScan />{grand ? 'Scanner une leçon' : 'Scanner'}
        </button>
      </div>
    </div>
  );
}
