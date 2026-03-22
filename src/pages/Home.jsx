import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Drawer } from '../components/Drawer';
import { BottomNav } from '../components/BottomNav';
import { ConfirmModal } from '../components/ConfirmModal';
import { loadLessons, restoreLesson, deleteLesson, syncFromFirestore } from '../services/historyService';
import { loadRevisions } from '../services/revisionService';
import { getWeeklyChallenges } from '../services/challengeService';
import { computeStreak, computeLevel, computeBadges, XP_PAR_LECON, XP_PAR_NIVEAU } from '../utils/gamification';
import { subjectColor, subjectEmoji } from '../utils/subjects';
import { AchievementToast } from '../components/AchievementToast';
import './Home.css';

const LogoStar = () => (
  <svg className="logo-star" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M8 0 C8.3 2.8 8.8 4.2 10.2 5.6 11.6 7 13 7.5 16 8 13 8.5 11.6 9 10.2 10.4 8.8 11.8 8.3 13.2 8 16 7.7 13.2 7.2 11.8 5.8 10.4 4.4 9 3 8.5 0 8 3 7.5 4.4 7 5.8 5.6 7.2 4.2 7.7 2.8 8 0Z"
      fill="url(#starGrad)"
    />
    <defs>
      <linearGradient id="starGrad" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFB347" />
        <stop offset="100%" stopColor="#FF6B00" />
      </linearGradient>
    </defs>
  </svg>
);

function formatDate(ts) {
  const d = new Date(ts), now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getGreetingTime() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function getMotivation(streak) {
  if (streak === 0) return 'Prêt pour une nouvelle session ? 🚀';
  if (streak === 1) return "C'est parti ! Reviens demain pour ton streak 🔥";
  if (streak < 5)  return `${streak} jours d'affilée, continue comme ça ! 💪`;
  if (streak < 10) return `${streak} jours de suite, tu assures ! 🔥`;
  return `${streak} jours consécutifs, tu es en feu ! 🏆`;
}

export default function Home() {
  const { currentUser } = useAuth();
  const prenom   = currentUser?.displayName ?? 'toi';
  const initiale = prenom[0]?.toUpperCase() ?? '?';

  const [drawerOpen, setDrawerOpen]         = useState(false);
  const navigate = useNavigate();
  const [allLessons, setAllLessons]         = useState(() => loadLessons());
  const [recentLessons, setRecentLessons]   = useState(() => loadLessons().slice(0, 3));
  const [lessonToDelete, setLessonToDelete] = useState(null);
  const [challenges, setChallenges]         = useState(() => getWeeklyChallenges());
  const [newBadge, setNewBadge]             = useState(null);

  useEffect(() => {
    const onboardedKey = `reviz-onboarded-${currentUser?.uid}`;
    if (currentUser && !localStorage.getItem(onboardedKey)) {
      navigate('/onboarding');
      return;
    }
    syncFromFirestore().then(lessons => {
      setAllLessons(lessons);
      setRecentLessons(lessons.slice(0, 3));
    });
  }, []);

  function handleDelete(id) {
    deleteLesson(id);
    const updated = loadLessons();
    setAllLessons(updated);
    setRecentLessons(updated.slice(0, 3));
  }

  const streak     = computeStreak(allLessons);
  const { level, xpInLvl, fillPct } = computeLevel(allLessons);
  const lastLesson = recentLessons[0] ?? null;

  // Daily goal
  const dailyGoal = parseInt(localStorage.getItem(`reviz-daily-goal-${currentUser?.uid}`) || '3');
  const todayRevisions = loadRevisions().filter(r =>
    new Date(r.revisedAt).toDateString() === new Date().toDateString()
  ).length;
  const goalProgress = Math.min(100, Math.round(todayRevisions / dailyGoal * 100));

  // Badge celebrations
  useEffect(() => {
    if (!currentUser) return;
    const revisions = loadRevisions();
    const badges = computeBadges(allLessons, revisions, streak, level);
    const unlockedIds = badges.filter(b => !b.locked).map(b => b.id);
    const seenKey = `reviz-seen-badges-${currentUser.uid}`;
    const seen = JSON.parse(localStorage.getItem(seenKey) || '[]');
    const newOnes = unlockedIds.filter(id => !seen.includes(id));
    if (newOnes.length > 0) {
      localStorage.setItem(seenKey, JSON.stringify(unlockedIds));
      const badge = badges.find(b => b.id === newOnes[0]);
      if (badge) setNewBadge(badge);
    }
  }, [allLessons, streak, level, currentUser]);

  return (
    <div className="app">
      {newBadge && (
        <AchievementToast badge={newBadge} onDone={() => setNewBadge(null)} />
      )}
      {/* Header */}
      <div className="header">
        <span className="header-logo">réviz <LogoStar /></span>
        <div className="header-avatar" onClick={() => setDrawerOpen(true)} role="button" tabIndex={0} aria-label="Ouvrir le menu">{initiale}</div>
      </div>

      <div className="content">

        {/* Greeting */}
        <div className="greeting">
          <h1>{getGreetingTime()}, {prenom} 👋</h1>
          <p>{getMotivation(streak)}</p>
          <div className="daily-goal-indicator">
            <div className="daily-goal-bar">
              <div className="daily-goal-fill" style={{ width: goalProgress + '%' }} />
            </div>
            <span className="daily-goal-text">
              {todayRevisions >= dailyGoal ? '✓ Objectif atteint !' : `${todayRevisions}/${dailyGoal} révisions aujourd'hui`}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card stat-card--level">
            <div className="stat-label">Niveau</div>
            <div className="stat-value-big">⭐ {level}</div>
            <div className="xp-bar"><div className="xp-fill" style={{ width: fillPct + '%' }} /></div>
            <div className="xp-legend">{xpInLvl} / {XP_PAR_NIVEAU} XP</div>
          </div>
          <div className="stat-card stat-card--streak">
            <div className="stat-label">Streak</div>
            <div className="stat-value-big">🔥 {streak}</div>
            <div className="stat-sub">{streak === 1 ? 'jour de suite' : 'jours de suite'}</div>
          </div>
        </div>

        {/* CTA Scanner */}
        <Link to="/scan" className={`cta-scanner${lastLesson ? ' cta-scanner--compact' : ''}`}>
          {lastLesson ? (
            <>
              <span>📸 Scanner une nouvelle leçon</span>
              <span className="cta-arrow">→</span>
            </>
          ) : (
            <>
              <div className="cta-text">
                <h2>Scanner une leçon</h2>
                <p>Photo ou texte — l'IA fait le reste</p>
              </div>
              <div className="cta-icon">📸</div>
            </>
          )}
        </Link>

        {/* Carte "Reprendre" — si une leçon existe */}
        {lastLesson && (
          <div className="featured-card">
            <div className="featured-top">
              <div className={`featured-icon ${subjectColor(lastLesson.metadata.subject)}`}>
                {subjectEmoji(lastLesson.metadata.subject)}
              </div>
              <div className="featured-info">
                <div className="featured-label">Reprendre</div>
                <div className="featured-title">{lastLesson.metadata.title}</div>
                <div className="featured-subject">{lastLesson.metadata.subject} · {formatDate(lastLesson.scannedAt)}</div>
              </div>
            </div>
            <div className="featured-actions">
              <button className="featured-btn" onClick={() => { restoreLesson(lastLesson.id); navigate('/flashcards'); }}>
                🃏 Flashcards
              </button>
              <button className="featured-btn" onClick={() => { restoreLesson(lastLesson.id); navigate('/quiz'); }}>
                ❓ Quiz
              </button>
              <button className="featured-btn featured-btn--ghost" onClick={() => { restoreLesson(lastLesson.id); navigate('/analyse'); }}>
                Voir tout
              </button>
            </div>
          </div>
        )}

        {/* Défis de la semaine */}
        <div className="challenges-card">
          <div className="challenges-header">
            <span className="challenges-title">Défis de la semaine</span>
            <span className="challenges-count">{challenges.challenges?.filter(c => c.completed).length ?? 0}/3</span>
          </div>
          {challenges.challenges?.map(c => (
            <div key={c.id} className={`challenge-row${c.completed ? ' completed' : ''}`}>
              <div className="challenge-info">
                <span className="challenge-name">{c.completed ? '✓' : '○'} {c.title}</span>
                <span className="challenge-desc">{c.description}</span>
              </div>
              <div className="challenge-progress">
                <div className="challenge-bar">
                  <div className="challenge-fill" style={{ width: Math.min(100, Math.round(c.current / c.target * 100)) + '%' }} />
                </div>
                <span className="challenge-count">{c.current}/{c.target}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Récemment scannées */}
        {recentLessons.length > 0 && (
          <>
            <div className="section-title">Récemment scannées</div>
            <div className="recent-list">
              {recentLessons.map(lesson => (
                <div
                  key={lesson.id}
                  className="recent-card"
                  onClick={() => { restoreLesson(lesson.id); navigate('/analyse'); }}
                >
                  <div className={`recent-icon ${subjectColor(lesson.metadata.subject)}`}>
                    {subjectEmoji(lesson.metadata.subject)}
                  </div>
                  <div className="recent-info">
                    <div className="recent-subject">{lesson.metadata.subject}</div>
                    <div className="recent-title">{lesson.metadata.title}</div>
                    <div className="recent-tags">
                      {lesson.flashcardsCount > 0 && <span className="tag">🃏 Flashcards</span>}
                      {lesson.quizCount > 0       && <span className="tag">❓ Quiz</span>}
                      <span className="tag">📝 Résumé</span>
                    </div>
                  </div>
                  <div className="recent-actions">
                    <span className="recent-date">{formatDate(lesson.scannedAt)}</span>
                    <button
                      className="delete-btn"
                      onClick={e => { e.stopPropagation(); setLessonToDelete(lesson); }}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* État vide */}
        {recentLessons.length === 0 && (
          <div className="empty-recent">
            <span>📚</span>
            <p>Scanne ta première leçon<br/>pour commencer à réviser</p>
          </div>
        )}

      </div>

      <BottomNav active="home" />
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {lessonToDelete && (
        <ConfirmModal
          lessonTitle={lessonToDelete.metadata.title}
          onConfirm={() => { handleDelete(lessonToDelete.id); setLessonToDelete(null); }}
          onCancel={() => setLessonToDelete(null)}
        />
      )}
    </div>
  );
}
