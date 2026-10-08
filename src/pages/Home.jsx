import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { UserHeader } from '../components/UserHeader';
import { GuestBanner } from '../components/GuestBanner';
import { HeroCTA } from '../components/HeroCTA';
import { Mascot } from '../components/Mascot';
import { loadLessons, restoreLesson, syncFromFirestore } from '../services/historyService';
import { loadRevisions } from '../services/revisionService';
import { loadCatalogue, matiereProgress } from '../services/programmeService';
import { hasProgramme, PROGRAMME_FALLBACK } from '../utils/programme';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useAuraCompte } from '../hooks/useAuraCompte';
import { countDueCards } from '../services/srsService';
import { getWeeklyChallenges } from '../services/challengeService';
import { computeStreak, computeLevel, computeBadges, XP_PAR_NIVEAU } from '../utils/gamification';
import { subjectMascot } from '../utils/subjects';
import { refreshReminder } from '../services/reminderService';
import { AchievementToast } from '../components/AchievementToast';
import { BattleMascot } from '../components/BattleMascot';
import { BattleAnnonce, annonceBattleVue } from '../components/battle/BattleAnnonce';
import { FlameIcon, TargetIcon, BookOpenIcon, CheckIcon, CircleIcon, FlashcardsIcon, QuizIcon } from '../components/Icons';
import './Home.css';

function formatDate(ts) {
  const d = new Date(ts), now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// Sous-titre du greeting : d'abord l'information utile (cartes dues,
// objectif, série), sinon une phrase calme selon le moment. Ton sobre —
// pas de blague forcée. Rotation stable par jour (pas de variance render-to-render).
const SUB_POOLS = {
  done: [
    "Objectif du jour atteint.",
    "C'est fait pour aujourd'hui.",
    'La séance du jour est bouclée.',
  ],
  morning: [
    'Quelques cartes pour bien commencer la journée.',
    'Une séance courte, et la journée est lancée.',
    'Le matin, quelques minutes suffisent.',
  ],
  afternoon: [
    'Cinq minutes suffisent pour avancer.',
    'Une petite séance avant ce soir ?',
    'Le bon moment pour revoir une leçon.',
  ],
  evening: [
    'Une dernière révision avant de dormir ?',
    'Le soir, une courte séance suffit.',
    'Revoir ses cartes le soir aide à retenir.',
  ],
};

/**
 * Ordinateur : les matières du programme en tuiles compactes sur l'accueil
 * (même catalogue et même progression que la page Mon programme).
 */
function HomeProgramme({ classe }) {
  const navigate = useNavigate();
  const [catalogue, setCatalogue] = useState(null);
  const lessons = useMemo(() => loadLessons(), []);

  useEffect(() => {
    let alive = true;
    loadCatalogue(classe).then(c => { if (alive) setCatalogue(c); }).catch(() => {});
    return () => { alive = false; };
  }, [classe]);

  if (!catalogue) return null;
  const total = catalogue.matieres.reduce((n, m) => n + m.chapitres.length, 0);

  return (
    <section className="home-desk-section" aria-labelledby="home-desk-programme">
      <div className="home-desk-head">
        <h2 id="home-desk-programme" className="home-desk-title">Mon programme</h2>
        <Link to="/programme" className="home-desk-more">{classe} · {total} chapitres ›</Link>
      </div>
      <div className="home-desk-matieres">
        {catalogue.matieres.map(m => {
          const p = matiereProgress(m, lessons);
          const pct = p.total ? Math.round((p.commences / p.total) * 100) : 0;
          const meta = p.commences
            ? `${p.commences} commencé${p.commences > 1 ? 's' : ''} sur ${p.total}`
            : `${p.total} chapitres`;
          return (
            <button
              key={m.slug}
              type="button"
              className="rv-card rv-card--link home-desk-matiere"
              onClick={() => navigate(`/programme/${m.slug}`)}
              aria-label={`${m.matiere} : ${meta}`}
            >
              <Mascot pose={subjectMascot(m.matiere)} size={44} alt="" aria-hidden="true" />
              <span className="home-desk-matiere-text">
                <span className="home-desk-matiere-name">{m.matiere}</span>
                <span className="home-desk-matiere-meta">{meta}</span>
                <span className="rv-bar rv-bar--neutral-bg home-desk-matiere-bar" aria-hidden="true">
                  <span className="rv-bar-fill rv-bar-fill--orange" style={{ width: `${pct}%` }} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function pickStable(pool, dayHash) {
  return pool[dayHash % pool.length];
}

function getGreetingSub({ dueCards, streak, todayRevisions, dailyGoal }) {
  const dayHash = Math.floor(Date.now() / 86400000);
  const h = new Date().getHours();

  if (dailyGoal > 0 && todayRevisions >= dailyGoal) return pickStable(SUB_POOLS.done, dayHash);
  if (dueCards > 0) return dueCards === 1 ? '1 carte à revoir aujourd\'hui.' : `${dueCards} cartes à revoir aujourd'hui.`;
  if (streak >= 2) return `${streak} jours de suite. Continue comme ça.`;
  if (todayRevisions > 0) return 'Tu as déjà révisé aujourd\'hui, bien joué.';
  if (h < 12)  return pickStable(SUB_POOLS.morning, dayHash);
  if (h < 18)  return pickStable(SUB_POOLS.afternoon, dayHash);
  return pickStable(SUB_POOLS.evening, dayHash);
}

export default function Home() {
  const { currentUser, isPremium, isGuest, getUserLevel } = useAuth();
  const prenom = currentUser?.displayName ?? 'toi';

  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  // Aura de la Battle dans l'en-tête, dès la première partie comptée.
  const auraCompte = useAuraCompte(isGuest ? null : currentUser?.uid);
  const aura = auraCompte && (auraCompte.jouees > 0 || auraCompte.aura > 0) ? auraCompte.aura : undefined;
  const [allLessons, setAllLessons] = useState(() => loadLessons());
  const [challenges] = useState(() => getWeeklyChallenges());
  const [newBadge, setNewBadge] = useState(null);
  // Popup « Nouveau : la Battle », une fois par élève (compte ou mode essai).
  const [annonceBattle, setAnnonceBattle] = useState(() => !!currentUser?.uid && !annonceBattleVue(currentUser.uid));

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

  // Dérivés gamification mémoïsés : sans useMemo, chaque render (toast de
  // badge, ouverture du coach…) re-parcourait toutes les leçons + relisait
  // le JSON des révisions depuis localStorage.
  // Série basée sur les RÉVISIONS (pas les scans) — même règle que Progres.
  const streak = useMemo(() => computeStreak(loadRevisions(), 'revisedAt'), [allLessons]);
  const { level, xpInLvl, fillPct } = useMemo(() => computeLevel(allLessons), [allLessons]);
  const lastLesson = allLessons[0] ?? null;

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
  // Cartes dues toutes leçons confondues (même règle que le rappel quotidien).
  const dueCards = useMemo(() => allLessons.reduce(
    (sum, l) => sum + countDueCards(l.id, l.flashcardsCount ?? l.aiData?.flashcards?.length ?? 0),
    0
  ), [allLessons]);
  const greetingSub = getGreetingSub({ dueCards, streak, todayRevisions, dailyGoal });

  const greeting = (
    <div className="rv-greeting home-greeting">
      <h2 className="rv-greeting-title">Envie de réviser ?</h2>
      <p className="rv-greeting-sub">{greetingSub}</p>
    </div>
  );

  // Sur ordinateur, « Reprendre » passe dans la rangée À reprendre.
  const hero = (
    <HeroCTA
      to={isGuest ? '/programme' : '/scan'}
      tone="violet"
      mascot={isGuest ? 'reading' : new Date().getHours() >= 19 ? 'soir' : 'scanphone'}
      title={isGuest ? 'Révise ton programme' : 'Scanne une leçon'}
      sub={!isDesktop ? undefined : isGuest
        ? 'Les chapitres de ta classe, prêts à réviser : résumé, flashcards, quiz et carte mentale.'
        : 'Une photo ou un texte, et Réviz prépare ton résumé, tes flashcards, ton quiz et ta carte mentale.'}
      action="Commencer"
      overlap
      ariaLabel={isGuest ? 'Réviser mon programme' : 'Scanner une leçon'}
      secondary={!isDesktop && lastLesson ? {
        icon: <BookOpenIcon />,
        label: 'Reprendre',
        title: lastLesson.metadata.title,
        onClick: () => { restoreLesson(lastLesson.id); navigate('/analyse'); },
        ariaLabel: `Reprendre la leçon ${lastLesson.metadata.title}`,
      } : undefined}
      className="home-cta"
    />
  );

  // Série + objectif du jour — compact : le niveau et l'XP sont dans l'en-tête.
  const statsCard = (
    <Link
      to="/progres"
      className="rv-card rv-card--link home-progress-card"
      aria-label="Voir mes progrès"
    >
      <div className="home-stats">
        <div className="home-stat">
          <span className="rv-icon-square rv-icon-square--orange" aria-hidden="true"><FlameIcon /></span>
          <div className="home-stat-text">
            <span className="home-stat-value">{streak} <small>{streak === 1 ? 'jour' : 'jours'}</small></span>
            <span className="home-stat-label">de suite</span>
          </div>
        </div>
        <div className="home-stat-sep" aria-hidden="true" />
        <div className="home-stat">
          <span className="rv-icon-square rv-icon-square--violet" aria-hidden="true"><TargetIcon /></span>
          <div className="home-stat-text">
            <span className="home-stat-value">{todayRevisions} <small>/ {dailyGoal}</small></span>
            <span className="home-stat-label">cartes aujourd'hui</span>
          </div>
          {goalReached && <span className="home-stat-check" aria-label="objectif atteint"><CheckIcon /></span>}
        </div>
      </div>
    </Link>
  );

  const challengesCard = (
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
            <span className="home-challenge-name">{c.completed ? <CheckIcon /> : <CircleIcon />} {c.title}</span>
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
  );

  const recentLessons = allLessons.slice(0, 3);
  const programmeClasse = hasProgramme(getUserLevel()) ? getUserLevel().classe : PROGRAMME_FALLBACK;

  const battleCard = (
    <Link to="/battle" className="rv-card rv-card--link home-programme-card home-battle-card" aria-label="Battle : défier quelqu'un en direct">
      <BattleMascot pose="garde" size={52} alt="" aria-hidden="true" className="home-programme-mascot" />
      <div className="home-programme-text">
        <span className="home-programme-title">Battle</span>
        <span className="home-programme-sub">Défie quelqu'un en direct sur un chapitre</span>
      </div>
      <span className="home-programme-arrow" aria-hidden="true">›</span>
    </Link>
  );

  return (
    <div className="app home-page">
      {/* Le toast attend que la popup Battle soit fermée : deux calques en même temps se chevauchaient */}
      {newBadge && !annonceBattle && (
        <AchievementToast badge={newBadge} onDone={() => setNewBadge(null)} />
      )}
      {annonceBattle && <BattleAnnonce uid={currentUser.uid} onClose={() => setAnnonceBattle(false)} />}

      <UserHeader
        prenom={prenom}
        level={level}
        xpInLvl={xpInLvl}
        fillPct={fillPct}
        aura={aura}
        isPremium={isPremium}
        onCoach={isGuest ? undefined : () => navigate(lastLesson ? `/coach?lesson=${lastLesson.id}` : '/coach')}
      />

      {/* Ordinateur : tableau de bord. Le bandeau d'essai vit dans la barre
          latérale ; la dernière leçon devient une rangée « À reprendre » et
          Mon programme des tuiles par matière. */}
      {isDesktop ? (
        <div className="content home-desk">
          {greeting}

          <div className="home-desk-top">
            {hero}
            <div className="home-desk-side">
              {statsCard}
              {challengesCard}
              {battleCard}
            </div>
          </div>

          {recentLessons.length > 0 && (
            <section className="home-desk-section" aria-labelledby="home-desk-recent">
              <div className="home-desk-head">
                <h2 id="home-desk-recent" className="home-desk-title">À reprendre</h2>
                <Link to="/cours" className="home-desk-more">Mes cours ›</Link>
              </div>
              <div className="home-desk-recent">
                {recentLessons.map(l => {
                  const due = countDueCards(l.id, l.flashcardsCount ?? l.aiData?.flashcards?.length ?? 0);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      className="rv-card rv-card--link home-desk-lesson"
                      onClick={() => { restoreLesson(l.id); navigate('/analyse'); }}
                      aria-label={`Reprendre la leçon ${l.metadata.title}`}
                    >
                      <Mascot pose={subjectMascot(l.metadata.subject)} size={64} alt="" aria-hidden="true" className="home-desk-lesson-mascot" />
                      <span className="home-desk-lesson-text">
                        <span className="home-desk-lesson-meta">{l.metadata.subject} · {formatDate(l.scannedAt)}</span>
                        <span className="home-desk-lesson-title">{l.metadata.title}</span>
                        <span className={`rv-pill rv-pill--${due > 0 ? 'orange' : 'green'} home-desk-lesson-pill`}>
                          {due > 0 ? `${due} carte${due > 1 ? 's' : ''} à revoir` : 'À jour'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <HomeProgramme classe={programmeClasse} />
        </div>
      ) : (
        <div className="content">

          <GuestBanner />

          {greeting}

          {hero}

          {statsCard}

          {/* Réviser sans scan : les chapitres du programme de sa classe. En mode
              essai, le héros pointe déjà dessus. */}
          {!isGuest && (
            <Link to="/programme" className="rv-card rv-card--link home-programme-card" aria-label="Réviser mon programme">
              <Mascot pose="reading" size={52} alt="" aria-hidden="true" className="home-programme-mascot" />
              <div className="home-programme-text">
                <span className="home-programme-title">Mon programme</span>
                <span className="home-programme-sub">
                  {getUserLevel()?.classe ? `${getUserLevel().classe} · ` : ''}révise chapitre par chapitre, sans scanner
                </span>
              </div>
              <span className="home-programme-arrow" aria-hidden="true">›</span>
            </Link>
          )}

          {battleCard}

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
                  <div className="home-featured-label">Ta dernière leçon</div>
                  <div className="home-featured-title">{lastLesson.metadata.title}</div>
                  <div className="home-featured-subject">
                    {lastLesson.metadata.subject} · {formatDate(lastLesson.scannedAt)}
                  </div>
                </div>
              </div>
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
                    {/* Coach de révision — le contexte est la dernière leçon scannée */}
                    <button
                      className="rv-btn-action"
                      onClick={() => navigate(`/coach?lesson=${lastLesson.id}`)}
                    >
                      <span className="rv-icon-square rv-icon-square--green">
                        <Mascot pose="coach" size={26} alt="" aria-hidden="true" />
                      </span>
                      <span className="rv-btn-action-text">
                        <span className="rv-btn-action-label">Coach</span>
                        <span className="rv-btn-action-sub">Un doute ?</span>
                      </span>
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {challengesCard}

        </div>
      )}

      <BottomNav />
    </div>
  );
}
