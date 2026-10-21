import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { GuestBanner } from '../components/GuestBanner';
import { ConsentBanner } from '../components/ConsentBanner';
import { EmailBanner } from '../components/EmailBanner';
import { Mascot } from '../components/Mascot';
import { Pantin, tempsLettres } from '../components/Pantin';
import { loadLessons, restoreLesson, syncFromFirestore } from '../services/historyService';
import { loadRevisions } from '../services/revisionService';
import { loadCatalogue } from '../services/programmeService';
import { agendaLocal, chargerAgenda } from '../services/agendaService';
import { controlesAVenir, compteARebours, matiereControle } from '../utils/agenda';
import { hasProgramme, PROGRAMME_FALLBACK } from '../utils/programme';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { countDueCards } from '../services/srsService';
import { computeStreak, computeLevel, computeBadges } from '../utils/gamification';
import { subjectMascot } from '../utils/subjects';
import { refreshReminder } from '../services/reminderService';
import { AchievementToast } from '../components/AchievementToast';
import { BattleAnnonce, annonceBattleVue } from '../components/battle/BattleAnnonce';
import { RevizPlusAnnonce, annonceRevizPlusVue } from '../components/RevizPlusAnnonce';
import { ThemeEssai, essaiThemeVu } from '../components/ThemeEssai';
import { useTheme } from '../context/ThemeContext';
import { themeById } from '../utils/themes';
import './Home.css';

/*
 * Accueil (refonte validée du 20/10, « Reviz Valide » sur claude.ai/design) :
 * la mascotte d'abord. Réviz (le pantin D1 animé) et la couleur du héros
 * changent selon la journée de l'élève : contrôle proche, soir sans
 * révision, objectif atteint, ou journée ordinaire.
 */
const HUMEURS = {
  normal:   { bg: '#FFB37A', tint: '#FFC596', dot: '#C9C2F2', bar: 'rgba(255,179,122,.94)', btn: '#C25407', soft: '#FFE6D2', expression: 'content',   entree: 'coucou' },
  controle: { bg: '#FFB37A', tint: '#FFC596', dot: '#C9C2F2', bar: 'rgba(255,179,122,.94)', btn: '#C25407', soft: '#FFE6D2', expression: 'determine', entree: 'coucou' },
  soir:     { bg: '#C9C2F2', tint: '#D8D2F7', dot: '#FFC9A8', bar: 'rgba(201,194,242,.94)', btn: '#5B4FC7', soft: '#E4E0FA', expression: 'endormi' },
  fete:     { bg: '#FFC9A8', tint: '#FFDAC4', dot: '#B9E8C9', bar: 'rgba(255,201,168,.94)', btn: '#137A45', soft: '#DCF5E6', expression: 'fier',      entree: 'saut' },
};

// Pastilles des matières : aplats pastel, dans l'ordre du design.
const PASTELS = ['#FFD7BE', '#E4E0FA', '#FFE6D2', '#DCF5E6', '#FFD9E4', '#E4E0FA'];
const TONS_PLAN = [
  { bg: '#FFE6D2', fg: '#B34400' },
  { bg: '#E4E0FA', fg: '#3D3770' },
  { bg: '#DCF5E6', fg: '#0F6B3A' },
];

const majuscule = s => s.charAt(0).toUpperCase() + s.slice(1);
function jourDans(n) {
  if (n === 0) return "Aujourd'hui";
  const d = new Date();
  d.setDate(d.getDate() + n);
  return majuscule(d.toLocaleDateString('fr-FR', { weekday: 'long' }));
}

const Fleche = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/* Ce que dit Réviz, tapé lettre par lettre au rythme de sa bouche (tempsLettres). Le texte
 * entier est posé dès le départ (lettres à venir invisibles) : la bulle ne change pas de taille.
 * Toucher la bulle lance ce qu'il propose. */
function Bulle({ texte, parle, sortie, onClick, label }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!parle) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setN(texte.length); return; }
    const temps = tempsLettres(texte);
    const t0 = performance.now();
    let id;
    const tic = () => {
      const t = (performance.now() - t0) / 1000;
      let i = 0;
      while (i < temps.length && temps[i] <= t) i++;
      setN(i);
      if (i < temps.length) id = requestAnimationFrame(tic);
    };
    id = requestAnimationFrame(tic);
    return () => cancelAnimationFrame(id);
  }, [texte, parle]);
  const lettres = [...texte];
  return (
    <div className={`hm-bulle-parole${parle && !sortie ? ' hm-bulle-parole--la' : ''}`}>
      <button type="button" className="hm-bulle-txt" onClick={onClick} aria-label={`${texte} ${label}`} tabIndex={parle ? 0 : -1}>
        <span className="hm-bulle-mots" aria-hidden="true">
          {lettres.slice(0, n).join('')}
          <span className="hm-bulle-reste">{lettres.slice(n).join('')}</span>
        </span>
        <span className="hm-bulle-go" aria-hidden="true"><Fleche /></span>
      </button>
    </div>
  );
}

const Flamme = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="#FF8A3D" aria-hidden="true">
    <path d="M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.2 1-3.8 2.2-5 .2 1.6 1 2.6 2 3 0-3.3.4-6 .8-9z" />
  </svg>
);

function useProchainControle(currentUser) {
  const uid = currentUser?.uid;
  const [agenda, setAgenda] = useState(() => agendaLocal(uid));
  useEffect(() => {
    let vivant = true;
    const relire = () => { if (vivant) setAgenda(agendaLocal(uid)); };
    window.addEventListener('reviz-agenda', relire);
    chargerAgenda(currentUser).then(a => { if (vivant) setAgenda(a); });
    return () => { vivant = false; window.removeEventListener('reviz-agenda', relire); };
  }, [uid, currentUser]);
  const prochain = controlesAVenir(agenda.controles)[0];
  if (!prochain) return null;
  // Au-delà de 14 jours, le contrôle reste dans l'Agenda, pas sur l'accueil.
  const jours = Math.round((new Date(`${prochain.date}T00:00`) - new Date(new Date().toDateString())) / 86_400_000);
  if (jours > 14) return null;
  return { ...prochain, jours, quand: compteARebours(prochain.date), m: matiereControle(prochain.matiere) };
}

export default function Home() {
  const { currentUser, isGuest, getUserLevel, hasRevizPlus, revizPlusOffert } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [allLessons, setAllLessons] = useState(() => loadLessons());
  const [newBadge, setNewBadge] = useState(null);
  const [annonceRevizPlus, setAnnonceRevizPlus] = useState(() => revizPlusOffert && !isGuest && !!currentUser?.uid && !annonceRevizPlusVue(currentUser.uid));
  const [annonceBattle, setAnnonceBattle] = useState(() => !annonceRevizPlus && !!currentUser?.uid && !annonceBattleVue(currentUser.uid));
  const { theme } = useTheme();
  const [essaiTheme, setEssaiTheme] = useState(() => !essaiThemeVu());
  const montrerEssai = essaiTheme && hasRevizPlus && !isGuest && !themeById(theme)?.premium;
  const [compact, setCompact] = useState(0);
  const [parle, setParle] = useState(false);
  const [tour, setTour] = useState(0);
  const [sortie, setSortie] = useState(false);
  const [caseChoisie, setCaseChoisie] = useState(null);
  const pantin = useRef(null);
  const hero = useRef(null);
  const heroVu = useRef(true);
  const controle = useProchainControle(currentUser);

  useEffect(() => {
    const onboardedKey = `reviz-onboarded-${currentUser?.uid}`;
    if (currentUser && !localStorage.getItem(onboardedKey)) {
      navigate('/onboarding');
      return;
    }
    syncFromFirestore().then(lessons => {
      setAllLessons(lessons);
      // App native : re-planifie le rappel quotidien avec un texte à jour.
      const due = lessons.reduce(
        (sum, l) => sum + countDueCards(l.id, l.flashcardsCount ?? l.aiData?.flashcards?.length ?? 0),
        0
      );
      refreshReminder(due);
    });
  }, []);

  const streak = useMemo(() => computeStreak(loadRevisions(), 'revisedAt'), [allLessons]);
  const { level } = useMemo(() => computeLevel(allLessons), [allLessons]);
  const lastLesson = allLessons[0] ?? null;
  const dailyGoal = parseInt(localStorage.getItem(`reviz-daily-goal-${currentUser?.uid}`) || '3');
  const todayRevisions = useMemo(() => loadRevisions().filter(r =>
    new Date(r.revisedAt).toDateString() === new Date().toDateString()
  ).length, [allLessons]);
  const goalReached = dailyGoal > 0 && todayRevisions >= dailyGoal;
  const dueCards = useMemo(() => allLessons.reduce(
    (sum, l) => sum + countDueCards(l.id, l.flashcardsCount ?? l.aiData?.flashcards?.length ?? 0),
    0
  ), [allLessons]);

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

  const classe = hasProgramme(getUserLevel()) ? getUserLevel().classe : PROGRAMME_FALLBACK;
  const [catalogue, setCatalogue] = useState(null);
  useEffect(() => {
    let vivant = true;
    loadCatalogue(classe).then(c => { if (vivant) setCatalogue(c); }).catch(() => {});
    return () => { vivant = false; };
  }, [classe]);

  // ── L'humeur du jour ──
  const heure = new Date().getHours();
  // En développement, ?humeur=soir|fete|controle|normal force l'humeur du héros.
  const forcee = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('humeur') : null;
  const humeurId = HUMEURS[forcee] && (forcee !== 'controle' || controle) ? forcee
    : goalReached ? 'fete'
    : heure >= 20 && todayRevisions === 0 && streak > 0 ? 'soir'
    : controle ? 'controle'
    : 'normal';
  const h = HUMEURS[humeurId];

  const fcLast = lastLesson ? countDueCards(lastLesson.id, lastLesson.flashcardsCount ?? 0) : 0;
  const ouvrirCartes = () => {
    if (lastLesson) { restoreLesson(lastLesson.id); navigate('/flashcards'); }
    else navigate('/programme');
  };
  const cibleControle = controle && controle.matiere !== 'autre' ? `/programme/${controle.matiere}` : '/programme';

  let dit, sous, cta, action;
  if (humeurId === 'fete') {
    dit = 'Objectif du jour atteint !';
    sous = `${todayRevisions} révision${todayRevisions > 1 ? 's' : ''}${streak > 1 ? ` · ${streak} jours de suite` : ''}`;
    cta = 'Lancer une Battle bonus';
    action = () => navigate('/battle');
  } else if (humeurId === 'soir') {
    dit = 'Je m’endors… Une carte et dodo ?';
    sous = streak > 0 ? `2 minutes pour garder tes ${streak} jour${streak > 1 ? 's' : ''}` : '2 minutes, et au lit';
    cta = 'Réveiller Réviz · 1 carte';
    action = ouvrirCartes;
  } else if (humeurId === 'controle') {
    dit = `${controle.m.label} ${controle.quand}. On s'y met ${heure >= 17 ? 'ce soir' : "aujourd'hui"} ?`;
    sous = controle.titre || (dueCards > 0 ? `${dueCards} carte${dueCards > 1 ? 's' : ''} à travailler` : 'Résumé, flashcards et quiz du chapitre');
    cta = 'Réviser avec Réviz';
    action = () => navigate(cibleControle);
  } else {
    dit = 'Envie de réviser ?';
    if (dueCards > 0) {
      sous = `${dueCards} carte${dueCards > 1 ? 's' : ''} à travailler aujourd'hui`;
      cta = 'Réviser mes cartes';
      action = ouvrirCartes;
    } else {
      sous = isGuest ? 'Les chapitres de ta classe, prêts à réviser' : 'Une photo de ta leçon, et Réviz prépare tout';
      cta = isGuest ? 'Réviser mon programme' : 'Scanner une leçon';
      action = () => navigate(isGuest ? '/programme' : '/scan');
    }
  }
  // Lien secondaire : scanner, sauf si c'est déjà l'action principale.
  const secondaire = cta === 'Scanner une leçon' ? { to: '/programme', label: 'réviser mon programme' }
    : isGuest ? null : { to: '/scan', label: 'scanner une leçon' };

  // ── Ton plan : trois étapes jusqu'au contrôle, ou les trois de la journée ──
  const plan = useMemo(() => {
    const ecart = controle ? Math.max(1, controle.jours) : 3;
    const jour = i => (controle ? jourDans(Math.min(i, ecart - 1)) : ['Maintenant', 'Ensuite', 'Pour finir'][i]);
    const cartes = dueCards > 0 ? `${dueCards} carte${dueCards > 1 ? 's' : ''}` : 'les flashcards';
    const quiz = lastLesson?.quizCount ? `${lastLesson.quizCount} questions` : 'Pour te tester';
    const chapitre = controle?.titre ? `${controle.titre} · ` : '';
    return [
      { quoi: `Résumé + ${cartes}`, meta: `${chapitre}Environ 6 min`, done: todayRevisions > 0, pose: 'flashcard' },
      { quoi: 'Quiz corrigé', meta: quiz, done: goalReached, pose: 'quiz' },
      { quoi: "Battle d'entraînement", meta: 'Contre un ami', done: false, pose: 'fire' },
    ].map((p, i) => ({ ...p, jour: jour(i), titre: `${jour(i)} · ${p.quoi}`, ton: TONS_PLAN[i] }));
  }, [controle, dueCards, lastLesson, todayRevisions, goalReached]);
  // L'étape à faire maintenant : la première pas encore faite. C'est elle qui lance l'action du jour.
  const enCours = Math.max(0, plan.findIndex(p => !p.done));
  // Le chemin (téléphone) : les trois étapes, puis le contrôle au bout s'il y en a un.
  const lancerQuiz = () => {
    if (lastLesson) { restoreLesson(lastLesson.id); navigate('/quiz'); }
    else navigate(cibleControle);
  };
  const cases = [
    ...plan.map((p, i) => ({ ...p, go: i === enCours ? action : [action, lancerQuiz, () => navigate('/battle')][i] })),
    controle && {
      jour: jourDans(controle.jours), quoi: `Contrôle de ${controle.m.label.toLowerCase()}`, meta: controle.titre || 'Le jour J',
      pose: 'examen', arrivee: true, go: () => navigate('/agenda'), label: "Voir l'agenda",
    },
  ].filter(Boolean);
  const choisie = caseChoisie ?? enCours;
  const detail = cases[choisie];
  const titrePlan = controle
    ? `Ton plan pour ${controle.jours <= 1 ? controle.quand : jourDans(controle.jours).toLowerCase()}`
    : 'Ton plan du jour';

  const matieres = (catalogue?.matieres ?? []).slice(0, 6).map((m, i) => ({
    slug: m.slug, nom: m.matiere, pose: subjectMascot(m.matiere), bg: PASTELS[i % PASTELS.length],
  }));
  const sujetBattle = lastLesson?.metadata?.title;
  const dateTxt = majuscule(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));

  const sauter = () => pantin.current?.geste('saut');
  // Réviz tombe dans le héros une fois chargé, puis parle (et fait son geste d'humeur).
  // Distance de chute en unités du pantin (2148 pour sa taille) : il part au-dessus du héros.
  const TAILLE_PANTIN = 226;
  const entreeMobile = useMemo(() => [{ nom: 'chute', depuis: Math.round(2148 * 420 / TAILLE_PANTIN) }], []);
  const aterri = () => {
    setParle(true);
    pantin.current?.dire(dit);
    if (h.entree) pantin.current?.geste(h.entree);
  };
  // Si le moteur ne charge pas, la bulle s'affiche quand même.
  useEffect(() => {
    const t = setTimeout(() => setParle(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // ── Ce que Réviz propose, à tour de rôle : la phrase du jour d'abord, puis le reste de l'app.
  // Chaque proposition a sa pose (humeur ou réaction du moteur), parfois un geste, et son action.
  // Pas de réaction dont l'effet flotte au-dessus de la tête (ampoule, point d'interrogation) :
  // la bulle le cacherait.
  const court = (t, max = 24) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);
  const titreLecon = lastLesson?.metadata?.title;
  const suggestions = [
    { texte: dit, label: cta, action, expr: h.expression },
    titreLecon && (fcLast > 0
      ? { texte: `Tes cartes de « ${court(titreLecon)} » t'attendent.`, label: 'Réviser mes cartes', action: ouvrirCartes, expr: 'content', geste: 'coucou' }
      : { texte: `Un petit quiz sur « ${court(titreLecon)} » ?`, label: 'Lancer le quiz', expr: 'emerveille',
          action: () => { restoreLesson(lastLesson.id); navigate('/quiz'); } }),
    { texte: 'Une question sur ton cours ? Demande-moi.', label: 'Parler à Réviz IA', action: () => navigate('/coach'), expr: 'reflechit' },
    humeurId !== 'fete' && { texte: 'Prêt à défier un ami en Battle ?', label: 'Lancer une Battle', action: () => navigate('/battle'), expr: 'determine', geste: 'brasEnLair' },
    !isGuest && cta !== 'Scanner une leçon' && { texte: 'Une leçon à apprendre ? Prends-la en photo.', label: 'Scanner une leçon', action: () => navigate('/scan'), expr: 'content', geste: 'coucou' },
    !controle && { texte: 'Un contrôle bientôt ? Dis-moi quand.', label: "Ouvrir l'agenda", action: () => navigate('/agenda'), expr: 'content', geste: 'gratterTete' },
  ].filter(Boolean);
  const sugg = suggestions[tour % suggestions.length];

  // Le héros hors de l'écran ou l'onglet caché : Réviz attend avant de changer de phrase.
  useEffect(() => {
    if (!hero.current || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(([v]) => { heroVu.current = v.isIntersecting; });
    obs.observe(hero.current);
    return () => obs.disconnect();
  }, [isDesktop]);

  useEffect(() => {
    // Sur ordinateur, pas de bulle : Réviz garde la phrase du jour.
    if (!parle || isDesktop) return;
    // La première phrase est dite à l'atterrissage (aterri) ; les suivantes ici, avec leur pose.
    if (tour > 0) {
      pantin.current?.expression(sugg.expr);
      if (sugg.geste) pantin.current?.geste(sugg.geste);
      pantin.current?.dire(sugg.texte);
    }
    const temps = tempsLettres(sugg.texte);
    let t1, t2;
    const suivante = () => {
      if (document.hidden || !heroVu.current) { t1 = setTimeout(suivante, 1500); return; }
      setSortie(true);
      t2 = setTimeout(() => { setSortie(false); setTour(t => t + 1); }, 220);
    };
    // Le temps de dire la phrase, puis de la lire.
    t1 = setTimeout(suivante, (temps[temps.length - 1] || 0) * 1000 + 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [parle, tour, isDesktop]);
  const style = { '--hm-bg': h.bg, '--hm-tint': h.tint, '--hm-dot': h.dot, '--hm-bar': h.bar, '--hm-btn': h.btn, '--hm-soft': h.soft };

  const serie = streak > 0 && (
    <span className="hm-serie" aria-label={`${streak} jour${streak > 1 ? 's' : ''} de suite`}>
      <Flamme />{streak}{isDesktop ? ` jour${streak > 1 ? 's' : ''}` : ''}
    </span>
  );

  const parole = (
    <div className="hm-parole" key={humeurId}>
      <h1 className="hm-dit">{dit}</h1>
      <p className="hm-sous">{sous}</p>
    </div>
  );

  const actions = (
    <div className="hm-actions">
      <button type="button" className="hm-cta" onClick={action}>{cta}</button>
      {secondaire && (
        <span className="hm-ou">ou <Link to={secondaire.to}>{secondaire.label}</Link></span>
      )}
    </div>
  );

  const carteplan = (
    <section className="hm-bloc" aria-labelledby="hm-plan">
      <h2 id="hm-plan" className="hm-titre">{goalReached ? 'Bravo, étape 1 faite' : titrePlan}</h2>
      <ol className="hm-plan">
        {plan.map((p, i) => (
          <li key={i} className="hm-etape">
            <span
              className="hm-etape-num"
              style={p.done ? { background: '#34C77B', color: '#fff' } : { background: p.ton.bg, color: p.ton.fg }}
              aria-label={p.done ? 'fait' : `étape ${i + 1}`}
            >{p.done ? '✓' : i + 1}</span>
            <span className="hm-etape-txt">
              <span className="hm-etape-titre">{p.titre}</span>
              <span className="hm-etape-meta">{p.meta}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );

  // Téléphone : le plan en chemin, façon plateau de jeu. Une case par jour, la case du jour
  // en grand ; toucher une case montre son détail en dessous, avec de quoi la lancer.
  const chemin = (
    <section className="hm-chemin-bloc" aria-labelledby="hm-chemin">
      <h2 id="hm-chemin" className="hm-titre">{goalReached ? 'Bravo, étape 1 faite' : titrePlan}</h2>
      <ol className="hm-chemin" style={{ '--n': cases.length }}>
        {cases.map((c, i) => (
          <li key={i}>
            <button
              type="button"
              className={`hm-case${i === enCours ? ' hm-case--maintenant' : ''}${i === choisie ? ' hm-case--choisie' : ''}${c.done ? ' hm-case--faite' : ''}${c.arrivee ? ' hm-case--arrivee' : ''}`}
              onClick={() => setCaseChoisie(i)}
              aria-pressed={i === choisie}
              aria-label={`${c.jour} : ${c.quoi}${c.done ? ', fait' : ''}`}
            >
              <span className="hm-case-rond" style={c.ton ? { background: c.ton.bg } : undefined}>
                <Mascot pose={c.pose} size={i === enCours ? 66 : 52} alt="" aria-hidden="true" />
                {c.done && <span className="hm-case-coche" aria-hidden="true">✓</span>}
              </span>
              <span className="hm-case-jour">{c.jour}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="hm-chemin-detail" style={{ '--pointe': `${((choisie + 0.5) / cases.length) * 100}%` }}>
        <span className="hm-chemin-txt">
          <span className="hm-chemin-quoi">{detail.quoi}</span>
          <span className="hm-chemin-meta">{detail.meta}</span>
        </span>
        {detail.done
          ? <span className="hm-chemin-fait">Fait</span>
          : <button type="button" className="hm-chemin-go" onClick={detail.go}>{detail.label || (choisie === enCours ? "C'est parti" : 'Lancer')}</button>}
      </div>
    </section>
  );

  const carteMatieres = matieres.length > 0 && (
    <section className="hm-bloc hm-bloc--matieres" aria-labelledby="hm-matieres">
      <div className="hm-tete">
        <h2 id="hm-matieres" className="hm-titre">Tes matières</h2>
        <Link to="/programme" className="hm-voir">Tout voir</Link>
      </div>
      <div className="hm-matieres">
        {matieres.map(m => (
          <Link key={m.slug} to={`/programme/${m.slug}`} className="hm-matiere">
            <span className="hm-matiere-rond" style={{ background: m.bg }}>
              <Mascot pose={m.pose} size={isDesktop ? 54 : 64} alt="" aria-hidden="true" />
            </span>
            <span className="hm-matiere-nom">{m.nom}</span>
          </Link>
        ))}
      </div>
    </section>
  );

  const carteBattle = (
    <Link to="/battle" className="hm-battle">
      <span className="hm-grain" aria-hidden="true" />
      <span className="hm-battle-rond" aria-hidden="true" />
      <Mascot pose="fire" size={isDesktop ? 170 : 130} alt="" aria-hidden="true" className="hm-battle-mascotte" />
      <span className="hm-battle-txt">
        <span className="hm-battle-titre">Battle</span>
        <span className="hm-battle-sous">
          {sujetBattle ? `Défie un ami sur ${sujetBattle}. 5 questions, 15 s.` : 'Défie un ami en direct sur un chapitre. 5 questions, 15 s.'}
        </span>
        <span className="hm-battle-btn">Envoyer un code</span>
      </span>
    </Link>
  );

  const rappels = (
    <div className="home-rappels hm-rappels">
      {!isDesktop && <GuestBanner />}
      <ConsentBanner />
      <EmailBanner />
    </div>
  );

  return (
    <div className="app app--no-halo home-page" style={style}>
      {newBadge && !annonceBattle && <AchievementToast badge={newBadge} onDone={() => setNewBadge(null)} />}
      {annonceRevizPlus && <RevizPlusAnnonce uid={currentUser.uid} onClose={() => setAnnonceRevizPlus(false)} />}
      {annonceBattle && <BattleAnnonce uid={currentUser.uid} onClose={() => setAnnonceBattle(false)} />}

      {isDesktop ? (
        <div className="content hm-desk">
          <div className="hm-hero hm-hero--desk">
            <span className="hm-bulle hm-bulle--a" aria-hidden="true" />
            <span className="hm-bulle hm-bulle--b" aria-hidden="true" />
            <span className="hm-point" aria-hidden="true" />
            <span className="hm-grain" aria-hidden="true" />
            <span className="hm-ombre" aria-hidden="true" />
            <Pantin
              ref={pantin}
              size={440}
              expression={h.expression}
              entree={h.entree}
              repli="hello"
              className="hm-pantin"
              onClick={sauter}
              label="Réviz, ta mascotte"
            />
            <div className="hm-hero-txt">
              <div className="hm-hero-haut">
                <span className="hm-date">{dateTxt}</span>
                {serie}
              </div>
              {parole}
              <div className="hm-flex" />
              {actions}
            </div>
          </div>
          {rappels}
          {montrerEssai && <ThemeEssai onClose={() => setEssaiTheme(false)} />}
          <div className="hm-grille">
            <div className="hm-carte">{carteplan}</div>
            <div className="hm-carte">{carteMatieres}</div>
            {carteBattle}
          </div>
        </div>
      ) : (
        <div
          className="content hm-mobile"
          onScroll={e => {
            // La barre du haut arrive quand le héros a presque fini de passer dessous.
            const fin = (hero.current?.offsetHeight ?? 400) - 90;
            setCompact(Math.min(1, Math.max(0, (e.currentTarget.scrollTop - fin) / 30)));
          }}
        >
          <div className="hm-hero" ref={hero}>
            <span className="hm-bulle hm-bulle--a" aria-hidden="true" />
            <span className="hm-bulle hm-bulle--b" aria-hidden="true" />
            <span className="hm-point" aria-hidden="true" />
            <span className="hm-grain" aria-hidden="true" />
            <span className="hm-ombre" aria-hidden="true" />
            <div className="hm-pantin-place">
              <Pantin
                ref={pantin}
                size={TAILLE_PANTIN}
                expression={h.expression}
                entree={entreeMobile}
                onEntree={aterri}
                repli={null}
                onClick={sauter}
                label="Réviz, ta mascotte"
              />
            </div>
            <div className="hm-hero-haut">
              <div className="hm-hero-titres">
                <span className="hm-date">{dateTxt}</span>
                <span className="hm-auj">Aujourd'hui</span>
              </div>
              {serie}
            </div>
            <h1 className="sr-only">{dit}</h1>
            <Bulle key={`${humeurId}-${tour}`} texte={sugg.texte} parle={parle} sortie={sortie} onClick={sugg.action} label={sugg.label} />
          </div>
          <div className="hm-pad hm-pad--chemin">{chemin}</div>
          {rappels}
          {montrerEssai && <div className="hm-pad"><ThemeEssai onClose={() => setEssaiTheme(false)} /></div>}
          <div className="hm-pad hm-pad--droite">{carteMatieres}</div>
          <div className="hm-pad hm-pad--bas">{carteBattle}</div>
        </div>
      )}
      {!isDesktop && <div className="hm-barre" style={{ opacity: compact }} aria-hidden="true">Aujourd'hui</div>}

      <BottomNav />
    </div>
  );
}
