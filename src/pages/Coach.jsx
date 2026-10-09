import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
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
import './Coach.css';

/**
 * Liste des conversations : une par leçon (scannée ou chapitre du
 * programme). Celles où l'élève a déjà écrit remontent, avec l'aperçu du
 * dernier message. Barre latérale sur ordinateur, écran d'accueil du coach
 * sur téléphone.
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
        <span className="coach-side-item-arrow" aria-hidden="true">›</span>
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
 * Page Coach — interface de chat façon assistant IA, à la sauce Réviz.
 * Une conversation par leçon. Sur ordinateur, la liste des conversations
 * à gauche et la conversation au centre. Sur téléphone, les deux mêmes
 * écrans l'un après l'autre, comme une messagerie : la liste (onglet Coach
 * de la barre du bas), puis la conversation en plein écran.
 * La leçon vient de `?lesson=<id>` ; sans paramètre, l'ordinateur ouvre la
 * plus récente et le téléphone montre la liste.
 */
export default function Coach() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [params, setParams] = useSearchParams();
  const lessons = useMemo(() => loadLessons(), []);
  const wanted = params.get('lesson');
  const { isGuest } = useAuth();

  // Mode essai : le coach passe par une API authentifiée → compte requis.
  if (isGuest) {
    return <GuestWall pose="coach" action="parler au coach" text="Le coach Réviz demande un compte. C'est gratuit, et tout ce que tu as révisé en mode essai te suit." />;
  }

  const asked = lessons.find(l => l.id === wanted) ?? null;
  const lesson = asked ?? (isDesktop ? lessons[0] ?? null : null);
  // Ordinateur : on remplace (la liste reste à côté) ; téléphone : on empile,
  // le retour ramène à la liste.
  const select = id => setParams({ lesson: id }, { replace: isDesktop });
  const backToList = () => (window.history.state?.idx > 0 ? navigate(-1) : setParams({}, { replace: true }));

  if (lessons.length === 0) {
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

  // Téléphone, sans leçon choisie : la liste des conversations.
  if (!lesson) {
    return (
      <div className="app coach-page coach-page--list">
        <div className="content coach-list-content">
          <PageIntro
            title="Coach Réviz"
            sub="Une conversation par leçon. Je connais tes cours : demande-moi ce que tu veux."
            mascot="coach"
            mascotSize={140}
            className="coach-page-intro"
          />
          <CoachThreads lessons={lessons} activeId={null} onSelect={select} />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="app coach-page coach-page--chat">
      {/* Téléphone : barre de conversation façon messagerie */}
      <header className="coach-chat-bar">
        <button type="button" className="rv-bell-btn coach-chat-back" onClick={backToList} aria-label="Toutes les conversations">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <Mascot pose={subjectMascot(lesson.metadata.subject)} size={38} alt="" aria-hidden="true" />
        <div className="coach-chat-bar-text">
          <h1 className="coach-chat-bar-title">{lesson.metadata.title}</h1>
          <p className="coach-chat-bar-sub">Coach Réviz · {lesson.metadata.subject ?? 'ta leçon'}</p>
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
          />
        </main>
      </div>
    </div>
  );
}
