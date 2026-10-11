import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GuestWall } from '../components/GuestWall';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { PageIntro } from '../components/PageIntro';
import { CoachConversation, coachPreview } from '../components/CoachChat';
import { Mascot } from '../components/Mascot';
import { SearchIcon } from '../components/Icons';
import { loadLessons } from '../services/historyService';
import { subjectMascot } from '../utils/subjects';
import { isProgrammeLessonId } from '../utils/programme';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useModalA11y } from '../hooks/useModalA11y';
import './Coach.css';

/**
 * Liste des conversations : une par leçon (scannée ou chapitre du
 * programme). Celles où l'élève a déjà écrit remontent, avec l'aperçu du
 * dernier message. Barre latérale sur ordinateur, feuille « Changer de
 * leçon » sur téléphone.
 */
function CoachThreads({ lessons, activeId, onSelect }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const threads = lessons
    .filter(l => !q || `${l.metadata.title} ${l.metadata.subject ?? ''}`.toLowerCase().includes(q))
    .map(l => ({ lesson: l, preview: coachPreview(l.id) }));
  const ongoing = threads.filter(t => t.preview);
  const others = threads.filter(t => !t.preview);

  const renderThread = ({ lesson: l, preview }) => (
    <li key={l.id}>
      <button
        type="button"
        className={`coach-side-item${l.id === activeId ? ' coach-side-item--active' : ''}`}
        aria-current={l.id === activeId ? 'true' : undefined}
        onClick={() => onSelect(l.id)}
      >
        <span className="coach-side-item-avatar" aria-hidden="true">
          <Mascot pose={subjectMascot(l.metadata.subject)} size={36} alt="" />
        </span>
        <span className="coach-side-item-text">
          <span className="coach-side-item-title">{l.metadata.title}</span>
          <span className="coach-side-item-sub">
            {preview
              ? <>{preview.fromCoach ? 'Coach : ' : 'Toi : '}{preview.text}</>
              : <>{l.metadata.subject}{isProgrammeLessonId(l.id) ? ' · programme' : ''}</>}
          </span>
        </span>
        <span className="coach-side-item-arrow" aria-hidden="true">{l.id === activeId ? '✓' : '›'}</span>
      </button>
    </li>
  );

  return (
    <>
      <label className="coach-side-search">
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Chercher une leçon"
          aria-label="Chercher une leçon"
        />
      </label>
      <div className="coach-side-lists">
        {ongoing.length > 0 && (
          <>
            <h2 className="coach-side-label">Tes discussions</h2>
            <ul className="coach-side-list">{ongoing.map(renderThread)}</ul>
          </>
        )}
        {others.length > 0 && (
          <>
            {ongoing.length > 0 && <h2 className="coach-side-label">Tes leçons</h2>}
            <ul className="coach-side-list">{others.map(renderThread)}</ul>
          </>
        )}
        {threads.length === 0 && <p className="coach-side-empty">Aucune leçon trouvée.</p>}
      </div>
    </>
  );
}

/**
 * Téléphone : choix de la leçon dans une feuille, ouverte depuis le titre
 * de la conversation (ou le lien « Changer de leçon » de l'accueil du chat).
 */
function LessonPicker({ lessons, activeId, onSelect, onClose }) {
  const ref = useModalA11y(onClose, true);
  return (
    <div className="coach-overlay" onClick={onClose}>
      <div
        className="coach-sheet coach-picker"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Changer de leçon"
        onClick={e => e.stopPropagation()}
      >
        <div className="coach-picker-head">
          <h2 className="coach-picker-title">Sur quelle leçon&nbsp;?</h2>
          <button type="button" className="coach-close-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="coach-picker-body">
          <CoachThreads lessons={lessons} activeId={activeId} onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}

const ChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
);

/**
 * Page Coach — interface de chat façon assistant IA, à la sauce Réviz.
 * Une conversation par leçon, ouverte directement : la leçon de `?lesson=`,
 * sinon la plus récente. Sur téléphone, on change de leçon en touchant son
 * titre en haut (feuille de choix) ; sur ordinateur, la liste des
 * conversations reste à gauche.
 */
export default function Coach() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [params, setParams] = useSearchParams();
  const lessons = useMemo(() => loadLessons(), []);
  const [picking, setPicking] = useState(false);
  const wanted = params.get('lesson');
  const { isGuest } = useAuth();

  // Mode essai : le coach passe par une API authentifiée → compte requis.
  if (isGuest) {
    return <GuestWall pose="coach" action="parler au coach" text="Le coach Réviz demande un compte. C'est gratuit, et tout ce que tu as révisé en mode essai te suit." />;
  }

  const lesson = lessons.find(l => l.id === wanted) ?? lessons[0] ?? null;
  const select = id => { setParams({ lesson: id }, { replace: true }); setPicking(false); };
  const back = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'));

  if (!lesson) {
    return (
      <div className="app coach-page">
        <PageIntro title="Coach Réviz" sub="Ouvre une leçon pour lui poser tes questions." mascot="coach" mascotSize={140} className="coach-page-intro" />
        <div className="coach-page-empty">
          <p className="coach-page-empty-text">Le coach répond à partir d'une leçon : scanne la tienne, ou ouvre un chapitre de ton programme.</p>
          <div className="coach-page-empty-actions">
            <Link className="rv-btn-cta rv-btn-cta--center" to="/programme">Ouvrir mon programme</Link>
            <Link className="rv-btn-cta rv-btn-cta--ghost rv-btn-cta--center" to="/scan">Scanner une leçon</Link>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const canSwitch = lessons.length > 1;

  return (
    <div className="app coach-page coach-page--chat">
      {/* Téléphone : barre de conversation ; le titre de la leçon ouvre le choix */}
      <header className="coach-chat-bar">
        <button type="button" className="rv-bell-btn coach-chat-back" onClick={back} aria-label="Retour">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="coach-topic">
          <span className="coach-topic-avatar" aria-hidden="true">
            <Mascot pose={subjectMascot(lesson.metadata.subject)} size={34} alt="" />
          </span>
          <div className="coach-topic-text">
            <h1 className="coach-topic-title">{lesson.metadata.title}</h1>
            <span className="coach-topic-sub">Coach Réviz · {lesson.metadata.subject ?? 'ta leçon'}</span>
          </div>
          {canSwitch && (
            <>
              <span className="coach-topic-chevron" aria-hidden="true"><ChevronDown /></span>
              {/* Toute la rangée est cliquable : le bouton la recouvre. */}
              <button type="button" className="coach-topic-hit" onClick={() => setPicking(true)} aria-haspopup="dialog">
                <span className="coach-topic-hit-label">Changer de leçon</span>
              </button>
            </>
          )}
        </div>
      </header>

      <div className="coach-layout">
        <aside className="coach-side" aria-label="Tes conversations">
          <div className="coach-side-head">
            <Mascot pose="coach" size={40} alt="" aria-hidden="true" />
            <div>
              <div className="coach-side-title">Coach Réviz</div>
              <div className="coach-side-sub">Une conversation par leçon</div>
            </div>
          </div>
          <CoachThreads lessons={lessons} activeId={lesson.id} onSelect={select} />
        </aside>

        <main className="coach-main">
          <div className="coach-main-head">
            <Mascot pose={subjectMascot(lesson.metadata.subject)} size={36} alt="" aria-hidden="true" />
            <div className="coach-main-head-text">
              <div className="coach-main-head-title">{lesson.metadata.title}</div>
              <div className="coach-main-head-sub">{lesson.metadata.subject} · le coach connaît cette leçon</div>
            </div>
          </div>
          <CoachConversation
            key={lesson.id}
            lessonId={lesson.id}
            lessonTitle={lesson.metadata.title}
            variant="page"
            className="coach-page-body"
            onChangeLesson={canSwitch && !isDesktop ? () => setPicking(true) : undefined}
          />
        </main>
      </div>

      {picking && !isDesktop && (
        <LessonPicker lessons={lessons} activeId={lesson.id} onSelect={select} onClose={() => setPicking(false)} />
      )}
    </div>
  );
}
