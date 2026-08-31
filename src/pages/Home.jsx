import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Drawer } from '../components/Drawer';
import { BottomNav } from '../components/BottomNav';
import { PageHeader } from '../components/PageHeader';
import { HeroCTA } from '../components/HeroCTA';
import { Mascot } from '../components/Mascot';
import { loadLessons, restoreLesson, syncFromFirestore } from '../services/historyService';
import { loadRevisions } from '../services/revisionService';
import { countDueCards } from '../services/srsService';
import { getWeeklyChallenges } from '../services/challengeService';
import { computeStreak, computeLevel, computeBadges, XP_PAR_NIVEAU } from '../utils/gamification';
import { subjectMascot } from '../utils/subjects';
import { refreshReminder } from '../services/reminderService';
import { AchievementToast } from '../components/AchievementToast';
import { CoachChat, CoachEntryCard } from '../components/CoachChat';
import './Home.css';

const FlashcardsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="6" y="3" width="14" height="18" rx="2.5" transform="rotate(6 13 12)" />
    <rect x="4" y="5" width="14" height="18" rx="2.5" />
  </svg>
);

const QuizIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.2a2.5 2.5 0 0 1 4.9.5c0 1.7-2.4 1.8-2.4 3.3" />
    <circle cx="12" cy="16.5" r="0.6" fill="currentColor" />
  </svg>
);

// Phrases mascotte pour la carte Reprendre, rotation stable par jour
const RESUME_PHRASES = [
  "On reprend là où tu t'es arrêté·e ? T'étais bien parti·e.",
  "Allez, on finit ça. Tu y étais presque.",
  "Tu peux boucler ce chapitre tant que c'est frais.",
  "Et si on continuait ? Plus que quelques minutes.",
  "Reprends pendant que c'est encore bien en tête.",
];

function getResumePhrase() {
  const hash = Math.floor(Date.now() / 86400000);
  return RESUME_PHRASES[hash % RESUME_PHRASES.length];
}

function formatDate(ts) {
  const d = new Date(ts), now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// Pool de phrases casual/fun, rotation stable par jour (pas de variance render-to-render)
const MOTIVATION_POOLS = {
  done: [
    'Boucle bouclée. Le reste, c\'est du bonus.',
    'Mission du jour validée. Tu fais bien.',
    'Carton plein. Repos mérité.',
    'Ton futur toi te remercie.',
    'Objectif atteint — tu gères !',
  ],
  streakStrong: [
    'jours d\'affilée, t\'es un robot.',
    'jours de suite, on garde le rythme ?',
    'jours non-stop, t\'es chaud.',
    'jours consécutifs, respect.',
  ],
  streakSmall: [
    'On garde le rythme ?',
    'T\'es bien parti, continue.',
    'Tu chauffes, c\'est bon signe.',
    'Encore un effort, ça paie.',
  ],
  morning: [
    'Allez, on s\'y met ?',
    'Petit échauffement du matin ?',
    'Le matin, ton cerveau est au top.',
    'On commence la journée fort ?',
    'Café + révisions = combo gagnant.',
  ],
  afternoon: [
    'Une petite séance avant le goûter ?',
    'Ton cerveau te dit merci d\'avance.',
    '5 minutes, et déjà plus malin.',
    'On se concentre cinq minutes ?',
    'Une petite révision, juste une ?',
  ],
  evening: [
    'Petite révision avant Netflix ?',
    'On finit la journée en beauté ?',
    'Un dernier effort avant la nuit ?',
    'Le soir, ça rentre tout seul.',
    'Pyjama + flashcards, le combo.',
  ],
};

function pickStable(pool, dayHash) {
  return pool[dayHash % pool.length];
}

function getMotivation(streak, todayRevisions, dailyGoal) {
  const dayHash = Math.floor(Date.now() / 86400000);
  const h = new Date().getHours();

  if (todayRevisions >= dailyGoal && dailyGoal > 0) {
    return pickStable(MOTIVATION_POOLS.done, dayHash);
  }
  if (streak >= 5) {
    return `${streak} ${pickStable(MOTIVATION_POOLS.streakStrong, dayHash)}`;
  }
  if (streak >= 1 && todayRevisions > 0) {
    return pickStable(MOTIVATION_POOLS.streakSmall, dayHash);
  }
  if (h < 12)  return pickStable(MOTIVATION_POOLS.morning, dayHash);
  if (h < 18)  return pickStable(MOTIVATION_POOLS.afternoon, dayHash);
  return pickStable(MOTIVATION_POOLS.evening, dayHash);
}

export default function Home() {
  const { currentUser } = useAuth();
  const prenom = currentUser?.displayName ?? 'toi';

  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const [allLessons, setAllLessons] = useState(() => loadLessons());
  const [challenges] = useState(() => getWeeklyChallenges());
  const [newBadge, setNewBadge] = useState(null);
  const [coachOpen, setCoachOpen] = useState(false);

  useEffect(() => {
    const onboardedKey = `reviz-onboarded-${currentUser?.uid}`;
    if (currentUser && !localStorage.getItem(onboardedKey)) {
      navigate('/onboarding');
      return;
    }
    syncFromFirestore().then(lessons => {
      setAllLessons(lessons);
      // App native : re-planifie le rappel quotidien avec un texte à jour
      // (nombre de cartes dues). No-op sur web ou si le rappel est désactivé.
      const due = lessons.reduce(
        (sum, l) => sum + countDueCards(l.id, l.flashcardsCount ?? l.aiData?.flashcards?.length ?? 0),
        0
      );
      refreshReminder(due);
    });
  }, []);

  // Dérivés gamification mémoïsés : sans useMemo, chaque render (ouverture du
  // drawer, toast de badge…) re-parcourait toutes les leçons + relisait le
  // JSON des révisions depuis localStorage.
  const streak = useMemo(() => computeStreak(allLessons), [allLessons]);
  const { level, xpInLvl, fillPct } = useMemo(() => computeLevel(allLessons), [allLessons]);
  const lastLesson = allLessons[0] ?? null;

  const streakDots = Array.from({ length: 5 }, (_, i) => i < Math.min(5, streak));

  const dailyGoal = parseInt(localStorage.getItem(`reviz-daily-goal-${currentUser?.uid}`) || '3');
  const todayRevisions = useMemo(() => loadRevisions().filter(r =>
    new Date(r.revisedAt).toDateString() === new Date().toDateString()
  ).length, [allLessons]);

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

  const remaining = dailyGoal - todayRevisions;
  const goalReached = todayRevisions >= dailyGoal;

  return (
    <div className="app home-page">
      {newBadge && (
        <AchievementToast badge={newBadge} onDone={() => setNewBadge(null)} />
      )}

      <PageHeader variant="brand" onBell={() => setDrawerOpen(true)} />

      <div className="content">

        <div className="rv-greeting home-greeting">
          <h2 className="rv-greeting-title">
            Hey {prenom}<span className="rv-greeting-wave" aria-hidden="true">👋</span>
          </h2>
          <p className="rv-greeting-sub">{getMotivation(streak, todayRevisions, dailyGoal)}</p>
        </div>

        <HeroCTA
          to="/scan"
          tone="violet"
          mascot={new Date().getHours() >= 19 ? 'soir' : 'scanphone'}
          eyebrow="📸 Nouvelle leçon"
          title="Scanne une nouvelle leçon"
          sub="Photo ou texte — l'IA fait le reste."
          action="Commencer"
          className="home-cta"
        />

        <Link
          to="/progres"
          className="rv-card rv-card--link home-progress-card"
          aria-label="Voir mes progrès"
        >
          <div className="rv-stat-row">
            <div className="rv-stat-block">
              <div className="rv-stat-block-header">
                <span className="rv-stat-block-emoji" aria-hidden="true">⭐</span>
                <span className="rv-stat-label">Niveau</span>
              </div>
              <div className="rv-stat-value rv-stat-value--xl">{level}</div>
              <div className="rv-bar" aria-hidden="true">
                <div
                  className="rv-bar-fill rv-bar-fill--violet"
                  style={{ width: fillPct + '%' }}
                />
              </div>
              <div className="rv-stat-sub">{xpInLvl} / {XP_PAR_NIVEAU} XP</div>
            </div>
            <div className="rv-stat-separator" aria-hidden="true" />
            <div className="rv-stat-block">
              <div className="rv-stat-block-header">
                <span className="rv-stat-block-emoji" aria-hidden="true">🔥</span>
                <span className="rv-stat-label">Série</span>
              </div>
              <div className="rv-stat-value rv-stat-value--xl">{streak}</div>
              <div className="rv-dots" aria-hidden="true">
                {streakDots.map((on, i) => (
                  <span key={i} className={`rv-dot${on ? ' rv-dot--on' : ''}`} />
                ))}
              </div>
              <div className="rv-stat-sub">{streak === 1 ? 'jour de suite' : 'jours de suite'}</div>
            </div>
          </div>
          <div className="rv-card-footer">
            <span className="rv-card-footer-icon" aria-hidden="true">🎯</span>
            <span className="rv-card-footer-text">
              Objectif du jour : <strong>{todayRevisions} / {dailyGoal}</strong> cartes
              {goalReached
                ? <span className="rv-card-footer-check" aria-label="atteint">✓</span>
                : <span className="rv-card-footer-remain"> · {remaining} restant{remaining > 1 ? 'es' : 'e'}</span>}
            </span>
          </div>
        </Link>

        {lastLesson && (
          <div className="rv-card rv-card--padded home-featured-card">
            <div className="home-featured-top">
              <Mascot
                pose={subjectMascot(lastLesson.metadata.subject)}
                size={128}
                glow
                priority
                className="home-featured-mascot"
                alt=""
                aria-hidden="true"
              />
              <div className="home-featured-info">
                <div className="home-featured-label">Reprendre</div>
                <div className="home-featured-title">{lastLesson.metadata.title}</div>
                <div className="home-featured-subject">
                  {lastLesson.metadata.subject} · {formatDate(lastLesson.scannedAt)}
                </div>
              </div>
            </div>
            <p className="rv-speech-bubble home-featured-phrase">{getResumePhrase()}</p>
            <button
              className="rv-btn-cta rv-btn-cta--full"
              onClick={() => { restoreLesson(lastLesson.id); navigate('/analyse'); }}
            >
              <span>Continuer</span>
              <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
            </button>
            {(() => {
              const fcTotal = lastLesson.flashcardsCount ?? 0;
              const fcDue   = fcTotal > 0 ? countDueCards(lastLesson.id, fcTotal) : 0;
              const qzTotal = lastLesson.quizCount ?? 0;
              return (
                <div className="rv-btn-action-row home-featured-actions">
                  {fcTotal > 0 && (
                    <button
                      className="rv-btn-action"
                      onClick={() => { restoreLesson(lastLesson.id); navigate('/flashcards'); }}
                    >
                      <span className="rv-icon-square rv-icon-square--violet"><FlashcardsIcon /></span>
                      <span className="rv-btn-action-text">
                        <span className="rv-btn-action-label">Flashcards</span>
                        <span className="rv-btn-action-sub">
                          {fcDue > 0 ? `${fcDue} à revoir` : `${fcTotal} carte${fcTotal > 1 ? 's' : ''}`}
                        </span>
                      </span>
                      {fcDue > 0 && <span className="rv-notif-dot" aria-hidden="true" />}
                    </button>
                  )}
                  {qzTotal > 0 && (
                    <button
                      className="rv-btn-action"
                      onClick={() => { restoreLesson(lastLesson.id); navigate('/quiz'); }}
                    >
                      <span className="rv-icon-square rv-icon-square--orange"><QuizIcon /></span>
                      <span className="rv-btn-action-text">
                        <span className="rv-btn-action-label">Quiz</span>
                        <span className="rv-btn-action-sub">{qzTotal} question{qzTotal > 1 ? 's' : ''}</span>
                      </span>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Coach de révision — sur la Home, le contexte est la dernière leçon scannée */}
        {lastLesson && (
          <CoachEntryCard
            onClick={() => setCoachOpen(true)}
            desc={`Pose-moi tes questions sur « ${lastLesson.metadata.title} »`}
          />
        )}

        <div className="rv-card rv-card--padded home-challenges-card">
          <div className="home-challenges-header">
            <span className="home-challenges-title">Défis de la semaine</span>
            <span className="home-challenges-count">
              {challenges.challenges?.filter(c => c.completed).length ?? 0}/3
            </span>
          </div>
          {challenges.challenges?.map(c => (
            <div key={c.id} className={`home-challenge-row${c.completed ? ' completed' : ''}`}>
              <div className="home-challenge-info">
                <span className="home-challenge-name">{c.completed ? '✓' : '○'} {c.title}</span>
                <span className="home-challenge-desc">{c.description}</span>
              </div>
              <div className="home-challenge-progress">
                <div className="rv-bar home-challenge-bar">
                  <div
                    className="rv-bar-fill rv-bar-fill--gradient"
                    style={{ width: Math.min(100, Math.round(c.current / c.target * 100)) + '%' }}
                  />
                </div>
                <span className="home-challenge-count">{c.current}/{c.target}</span>
              </div>
            </div>
          ))}
        </div>

      </div>

      <BottomNav active="home" />
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {coachOpen && lastLesson && (
        <CoachChat
          isOpen
          onClose={() => setCoachOpen(false)}
          lessonId={lastLesson.id}
          lessonTitle={lastLesson.metadata.title}
        />
      )}
    </div>
  );
}
