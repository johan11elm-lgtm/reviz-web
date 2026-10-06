import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { GuestWall } from '../components/GuestWall';
import { useAuth } from '../context/AuthContext';
import { PageIntro } from '../components/PageIntro';
import { CoachConversation } from '../components/CoachChat';
import { Mascot } from '../components/Mascot';
import { SearchIcon } from '../components/Icons';
import { loadLessons } from '../services/historyService';
import { subjectMascot } from '../utils/subjects';
import { isProgrammeLessonId } from '../utils/programme';
import './Coach.css';

/**
 * Page Coach — interface de chat façon assistant IA, à la sauce Réviz.
 * Une conversation par leçon (scannée ou chapitre du programme) : sur
 * ordinateur, la liste des leçons à gauche et la conversation au centre ;
 * sur téléphone, un sélecteur de leçon en haut. La leçon vient de
 * `?lesson=<id>`, sinon la plus récente.
 */
export default function Coach() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const lessons = useMemo(() => loadLessons(), []);
  const wanted = params.get('lesson');
  const lesson = lessons.find(l => l.id === wanted) ?? lessons[0] ?? null;
  const { isGuest } = useAuth();
  const [query, setQuery] = useState('');

  // Mode essai : le coach passe par une API authentifiée → compte requis.
  if (isGuest) {
    return <GuestWall action="parler au coach" text="Le coach Réviz demande un compte. C'est gratuit, et tout ce que tu as révisé en mode essai te suit." />;
  }

  const select = id => setParams({ lesson: id }, { replace: true });
  const q = query.trim().toLowerCase();
  const visible = q
    ? lessons.filter(l => `${l.metadata.title} ${l.metadata.subject}`.toLowerCase().includes(q))
    : lessons;

  return (
    <div className="app coach-page">
      <PageHeader
        variant="back"
        onBack={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
      />

      <PageIntro
        title="Coach Réviz"
        sub={lesson ? `À propos de « ${lesson.metadata.title} »` : 'Ouvre une leçon pour lui poser tes questions.'}
        mascot="coach"
        mascotSize={140}
        className="coach-page-intro"
      />

      {lesson ? (
        <div className="coach-layout">
          {/* Leçons = conversations (liste à gauche sur ordinateur) */}
          <aside className="coach-side" aria-label="Tes leçons">
            <div className="coach-side-head">
              <Mascot pose="coach" size={40} alt="" aria-hidden="true" />
              <div>
                <div className="coach-side-title">Coach Réviz</div>
                <div className="coach-side-sub">Une conversation par leçon</div>
              </div>
            </div>
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
            <ul className="coach-side-list">
              {visible.map(l => (
                <li key={l.id}>
                  <button
                    type="button"
                    className={`coach-side-item${l.id === lesson.id ? ' coach-side-item--active' : ''}`}
                    aria-current={l.id === lesson.id ? 'true' : undefined}
                    onClick={() => select(l.id)}
                  >
                    <Mascot pose={subjectMascot(l.metadata.subject)} size={32} alt="" aria-hidden="true" />
                    <span className="coach-side-item-text">
                      <span className="coach-side-item-title">{l.metadata.title}</span>
                      <span className="coach-side-item-sub">
                        {l.metadata.subject}{isProgrammeLessonId(l.id) ? ' · programme' : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {visible.length === 0 && <li className="coach-side-empty">Aucune leçon trouvée.</li>}
            </ul>
          </aside>

          <main className="coach-main">
            {/* Téléphone : choix de la leçon */}
            <label className="coach-lesson-select">
              <span className="coach-lesson-select-label">Leçon</span>
              <select value={lesson.id} onChange={e => select(e.target.value)} aria-label="Choisir la leçon">
                {lessons.map(l => <option key={l.id} value={l.id}>{l.metadata.title}</option>)}
              </select>
            </label>
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
      ) : (
        <div className="coach-page-empty">
          <Mascot pose="coach" size={150} glow alt="" aria-hidden="true" />
          <p className="coach-page-empty-text">Le coach répond à partir d'une leçon : scanne la tienne, ou ouvre un chapitre de ton programme.</p>
          <div className="coach-page-empty-actions">
            <Link className="rv-btn-cta rv-btn-cta--center" to="/programme">Ouvrir mon programme</Link>
            <Link className="rv-btn-cta rv-btn-cta--ghost rv-btn-cta--center" to="/scan">Scanner une leçon</Link>
          </div>
        </div>
      )}
    </div>
  );
}
