import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { PageIntro } from '../components/PageIntro';
import { CoachConversation } from '../components/CoachChat';
import { Mascot } from '../components/Mascot';
import { loadLessons } from '../services/historyService';
import './Coach.css';

/**
 * Page Coach — même ouverture que les autres écrans (titre, sous-titre,
 * mascotte coach), puis la conversation plein écran. La leçon vient de
 * `?lesson=<id>` (Home, Analyse), sinon la dernière scannée. Les formats
 * de révision gardent le bottom sheet pour une question sans quitter l'exercice.
 */
export default function Coach() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lessons = useMemo(() => loadLessons(), []);
  const wanted = params.get('lesson');
  const lesson = lessons.find(l => l.id === wanted) ?? lessons[0] ?? null;

  return (
    <div className="app coach-page">
      <PageHeader
        variant="back"
        onBack={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
      />

      <PageIntro
        title="Coach Réviz"
        sub={lesson ? `À propos de « ${lesson.metadata.title} »` : 'Scanne une leçon pour lui poser tes questions.'}
        mascot="coach"
        mascotSize={140}
        className="coach-page-intro"
      />

      {lesson ? (
        <CoachConversation lessonId={lesson.id} className="coach-page-body" />
      ) : (
        <div className="coach-page-empty">
          <Mascot pose="scanphone" size={140} alt="" aria-hidden="true" />
          <p className="coach-page-empty-text">Le coach répond à partir d'une leçon scannée.</p>
          <Link className="rv-btn-cta rv-btn-cta--center" to="/scan">Scanner une leçon</Link>
        </div>
      )}
    </div>
  );
}
