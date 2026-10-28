import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { GuestBanner } from '../components/GuestBanner';
import { ConsentBanner } from '../components/ConsentBanner';
import { EmailBanner } from '../components/EmailBanner';
import { PushBanner } from '../components/PushBanner';
import { Mascot } from '../components/Mascot';
import { Pantin, tempsLettres } from '../components/Pantin';
import { BulleReviz } from '../components/reviz/BulleReviz';
import { loadLessons, restoreLesson, syncFromFirestore } from '../services/historyService';
import { loadRevisions } from '../services/revisionService';
import { loadCatalogue } from '../services/programmeService';
import { agendaLocal, chargerAgenda } from '../services/agendaService';
import { controlesAVenir, compteARebours, matiereControle, joursEntre, jourIso } from '../utils/agenda';
import { planRevision } from '../utils/planRevision';
import { marquerEtape } from '../services/agendaService';
import { hasProgramme, PROGRAMME_FALLBACK } from '../utils/programme';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { countDueCards } from '../services/srsService';
import { computeStreak, computeLevel, computeBadges } from '../utils/gamification';
import { subjectMascot } from '../utils/subjects';
import { refreshReminder } from '../services/reminderService';
import { AchievementToast } from '../components/AchievementToast';
import { JeuxAnnonce, annonceJeuxVue } from '../components/jeux/JeuxAnnonce';
import { RevizPlusAnnonce, annonceRevizPlusVue } from '../components/RevizPlusAnnonce';
import { ThemeEssai, essaiThemeVu } from '../components/ThemeEssai';
import { useTheme } from '../context/ThemeContext';
import { themeById } from '../utils/themes';
import { etatDuJour, synchroniserStats } from '../services/partieDuJourService';
import { battleFaiteAujourdhui } from '../services/battleDuJour';
import './Home.css';

/*
 * Accueil (refonte validée du 20/10, « Reviz Valide » sur claude.ai/design) :
 * la mascotte d'abord. Réviz (le pantin D1 animé) et la couleur du héros
 * changent selon la journée de l'élève : contrôle proche, soir sans
 * révision, objectif atteint, ou journée ordinaire.
 */
const HUMEURS = {
  normal:   { bg: 'var(--sk-lavande)', tint: '#DCD6F7', dot: 'var(--rv-peche-clair)', bar: 'color-mix(in srgb, var(--rv-peche) 94%, transparent)', btn: 'var(--rv-orange)', btnTexte: '#FF9A55', soft: 'var(--rv-peche-pale)', expression: 'content',   entree: 'coucou' },
  controle: { bg: 'var(--sk-peche)', tint: '#FFD6B8', dot: 'var(--rv-lavande-bulle)', bar: 'color-mix(in srgb, var(--rv-peche) 94%, transparent)', btn: 'var(--rv-orange)', btnTexte: '#FF9A55', soft: 'var(--rv-peche-pale)', expression: 'determine', entree: 'coucou' },
  soir:     { bg: 'var(--sk-ciel)', tint: '#CBDDFA', dot: 'var(--rv-peche-rose)', bar: 'color-mix(in srgb, var(--rv-lavande-bulle) 94%, transparent)', btn: 'var(--rv-lavande-vif)', btnTexte: '#B3AAF5', soft: 'var(--rv-lavande)', expression: 'endormi' },
  fete:     { bg: 'var(--sk-menthe)', tint: '#C8EBD5', dot: 'var(--rv-peche-clair)', bar: 'color-mix(in srgb, var(--rv-peche-rose) 94%, transparent)', btn: '#137A45', btnTexte: '#6BDA9B', soft: 'var(--rv-menthe)', expression: 'fier',      entree: 'saut' },
};

// Pastilles des matières : aplats pastel, dans l'ordre du design.
const PASTELS = ['var(--rv-peche-clair)', 'var(--rv-lavande)', 'var(--rv-peche-pale)', 'var(--rv-menthe)', 'var(--rv-rose)', 'var(--rv-lavande)'];
const TONS_PLAN = [
  { bg: 'var(--rv-peche-pale)', fg: 'var(--rv-peche-encre)' },
  { bg: 'var(--rv-lavande)', fg: 'var(--rv-lavande-encre)' },
  { bg: 'var(--rv-menthe)', fg: 'var(--rv-menthe-encre)' },
];

const majuscule = s => s.charAt(0).toUpperCase() + s.slice(1);
function jourDans(n) {
  if (n === 0) return "Aujourd'hui";
  const d = new Date();
  d.setDate(d.getDate() + n);
  return majuscule(d.toLocaleDateString('fr-FR', { weekday: 'long' }));
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
  // Annonce de la sortie : Réviz Games (celle de la Battle, du 22/10, n'est plus montrée).
  const [annonceJeux, setAnnonceJeux] = useState(() => !annonceRevizPlus && !!currentUser?.uid && !annonceJeuxVue(currentUser.uid));
  const { theme, isDark } = useTheme();
  const [essaiTheme, setEssaiTheme] = useState(() => !essaiThemeVu());
  // Les thèmes Réviz+ sont des thèmes clairs : pas d'invitation à les essayer en sombre.
  const montrerEssai = essaiTheme && hasRevizPlus && !isGuest && !isDark && !themeById(theme)?.premium;
  const [compact, setCompact] = useState(0);
  const [parle, setParle] = useState(false);
  const [tour, setTour] = useState(0);
  const [sortie, setSortie] = useState(false);
  const [caseChoisie, setCaseChoisie] = useState(null);
  const pantin = useRef(null);
  const hero = useRef(null);
  const heroVu = useRef(true);
  const survol = useRef(false);
  const controle = useProchainControle(currentUser);

  useEffect(() => {
    const onboardedKey = `reviz-onboarded-${currentUser?.uid}`;
    if (currentUser && !localStorage.getItem(onboardedKey)) {
      // En remplaçant l'accueil : un retour depuis la présentation ne retombe pas sur l'accueil, qui
      // l'y renverrait aussitôt.
      navigate('/onboarding', { replace: true });
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

  // La partie du jour des Réviz Games compte aussi pour la série (jouer, c'est réviser).
  const uidJeux = currentUser?.uid ?? null;
  const [jourJeux, setJourJeux] = useState(() => etatDuJour(uidJeux));
  useEffect(() => {
    // Reprend la série et le score d'un autre appareil sans passer par /jeux (aucune autre lecture de
    // users/{uid} ici : AuthContext ne garde pas le champ jeux).
    let vivant = true;
    setJourJeux(etatDuJour(uidJeux));
    synchroniserStats(uidJeux).then(() => { if (vivant) setJourJeux(etatDuJour(uidJeux)); });
    // Un accueil resté ouvert après minuit : au retour au premier plan on recalcule le jour.
    const maj = () => { if (document.visibilityState === 'visible') setJourJeux(etatDuJour(uidJeux)); };
    document.addEventListener('visibilitychange', maj);
    return () => { vivant = false; document.removeEventListener('visibilitychange', maj); };
  }, [uidJeux]);
  const streak = useMemo(() => computeStreak([...loadRevisions(), ...jourJeux.jours.map(j => ({ revisedAt: `${j}T12:00:00` }))], 'revisedAt'), [allLessons, jourJeux]);
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
  const cibleControle = controle && controle.matiere !== 'autre' ? `/programme?matiere=${controle.matiere}` : '/programme';

  // ditLignes : la phrase du jour découpée pour la bulle (une idée par ligne) ; dit : d'un bloc.
  let ditLignes, cta, action;
  if (humeurId === 'fete') {
    ditLignes = ['Objectif du jour atteint !', 'On fête ça ?'];
    cta = 'Lancer une Battle bonus';
    action = () => navigate('/battle');
  } else if (humeurId === 'soir') {
    ditLignes = ['Je m’endors…', 'Une carte et dodo ?'];
    cta = 'Réveiller Réviz · 1 carte';
    action = ouvrirCartes;
  } else if (humeurId === 'controle') {
    ditLignes = [`${controle.m.label} ${controle.quand}.`, `On s'y met ${heure >= 17 ? 'ce soir' : "aujourd'hui"} ?`];
    cta = 'Réviser avec Réviz';
    action = () => navigate(cibleControle);
  } else {
    ditLignes = ['Envie de réviser ?'];
    if (dueCards > 0) {
      cta = 'Réviser mes cartes';
      action = ouvrirCartes;
    } else {
      cta = isGuest ? 'Réviser mon programme' : 'Scanner une leçon';
      action = () => navigate(isGuest ? '/programme' : '/scan');
    }
  }
  const dit = ditLignes.join(' ');

  // ── Ton plan : trois étapes jusqu'au contrôle, ou les trois de la journée ──
  const plan = useMemo(() => {
    // Un contrôle noté : les étapes de son plan de révision (J-5 flashcards, J-3 quiz, J-1 contrôle
    // blanc), chacune à son jour ; une étape manquée revient aujourd'hui.
    if (controle) {
      const auj = jourIso();
      return planRevision(controle, auj).map((e, i) => {
        const jour = jourDans(Math.max(0, joursEntre(auj, e.jour)));
        return { id: e.id, quoi: e.quoi, meta: e.retard ? `À rattraper · ${e.detail}` : e.detail, done: Boolean(e.fait), pose: e.pose, jour, titre: `${jour} · ${e.quoi}`, ton: TONS_PLAN[i] };
      });
    }
    const ecart = controle ? Math.max(1, controle.jours) : 3;
    const jour = i => (controle ? jourDans(Math.min(i, ecart - 1)) : ['Maintenant', 'Ensuite', 'Pour finir'][i]);
    const cartes = dueCards > 0 ? `${dueCards} carte${dueCards > 1 ? 's' : ''}` : 'les flashcards';
    const quiz = lastLesson?.quizCount ? `${lastLesson.quizCount} questions` : 'Pour te tester';
    const chapitre = controle?.titre ? `${controle.titre} · ` : '';
    return [
      { quoi: `Résumé + ${cartes}`, meta: `${chapitre}Environ 6 min`, done: todayRevisions > 0, pose: 'flashcard' },
      { quoi: 'Quiz corrigé', meta: quiz, done: goalReached, pose: 'quiz' },
      { quoi: "Battle d'entraînement", meta: 'Contre un ami', done: battleFaiteAujourdhui(), pose: 'fire' },
    ].map((p, i) => ({ ...p, jour: jour(i), titre: `${jour(i)} · ${p.quoi}`, ton: TONS_PLAN[i] }));
  }, [controle, dueCards, lastLesson, todayRevisions, goalReached]);
  // L'étape à faire maintenant : la première pas encore faite.
  const enCours = Math.max(0, plan.findIndex(p => !p.done));
  // Un contrôle noté : son programme d'abord ; sinon les cartes de la dernière leçon, ou le programme.
  const lancerCartes = () => (controle || !lastLesson ? navigate(cibleControle) : ouvrirCartes());
  const lancerQuiz = () => {
    if (lastLesson) { restoreLesson(lastLesson.id); navigate('/quiz'); }
    else navigate(cibleControle);
  };
  // Une étape du plan lancée compte comme faite aujourd'hui, puis on va réviser la matière.
  const lancerEtape = async id => {
    await marquerEtape(currentUser, controle.id, id).catch(() => {});
    navigate(cibleControle);
  };
  // Le chemin (téléphone) : les trois étapes, puis le contrôle au bout s'il y en a un.
  const cases = [
    // Chaque étape fait ce qu'elle annonce (pas l'action du héros, qui peut être « Scanner une leçon ») :
    // les cartes de la dernière leçon (ou le programme du contrôle), le quiz, la Battle.
    ...plan.map((p, i) => ({ ...p, go: controle ? () => lancerEtape(p.id) : [lancerCartes, lancerQuiz, () => navigate('/battle')][i] })),
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
  const TAILLE_PANTIN = isDesktop ? 400 : 226;
  const entree = useMemo(() => [{ nom: 'chute', depuis: Math.round(2148 * (isDesktop ? 520 : 420) / TAILLE_PANTIN) }], [isDesktop, TAILLE_PANTIN]);
  const aterri = () => {
    setParle(true);
    pantin.current?.dire(ditLignes.join('\n'));
    if (h.entree) pantin.current?.geste(h.entree);
  };
  // Si le moteur ne charge pas, la bulle s'affiche quand même. Onglet en arrière-plan : les
  // animations sont gelées, Réviz n'a pas encore pu tomber ; on attend que la page soit visible.
  useEffect(() => {
    let t;
    const essai = () => { t = setTimeout(() => (document.hidden ? essai() : setParle(true)), 4000); };
    essai();
    return () => clearTimeout(t);
  }, []);

  // ── Ce que Réviz propose, à tour de rôle : la phrase du jour d'abord, puis le reste de l'app.
  // Chaque proposition a sa pose (humeur ou réaction du moteur), parfois un geste, son action et sa
  // carte : depuis l'accueil, on peut aller partout.
  // Pas de réaction dont l'effet flotte au-dessus de la tête (ampoule, point d'interrogation) :
  // la bulle le cacherait.
  const court = (t, max = 24) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);
  const titreLecon = lastLesson?.metadata?.title;
  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
  const avecCompte = isGuest ? 'Avec un compte gratuit' : null;
  const lancerProgramme = () => navigate('/programme');
  const lancerScan = () => navigate('/scan');

  // La carte de la phrase du jour : ce que lance l'action principale (id : pour ne pas la reproposer).
  const carteDuJour = humeurId === 'fete'
    ? { id: 'battle', pose: 'fire', fond: 'var(--rv-lavande)', titre: 'Battle bonus', sous: 'Objectif atteint, on joue ?' }
    : humeurId === 'soir'
      ? { id: 'cartes', pose: 'soir', fond: 'var(--rv-lavande)', titre: 'Une flashcard', sous: '2 minutes, et au lit' }
      : humeurId === 'controle'
        ? { id: 'controle', pose: subjectMascot(controle.m.label), fond: 'var(--rv-peche-pale)', titre: `Contrôle de ${controle.m.label.toLowerCase()}`,
            sous: `${majuscule(controle.quand)}${controle.titre ? ` · ${controle.titre}` : ''}` }
        : cta === 'Réviser mes cartes'
          ? { id: 'cartes', pose: 'flashcard', fond: 'var(--rv-peche-pale)', titre: 'Mes cartes du jour', sous: `${pluriel(dueCards, 'carte')} à revoir` }
          : cta === 'Scanner une leçon'
            ? { id: 'scan', pose: 'scanphone', fond: 'var(--rv-menthe)', titre: 'Scanner une leçon', sous: 'Résumé, flashcards et quiz' }
            : { id: 'programme', pose: 'reading', fond: 'var(--rv-peche-pale)', titre: 'Mon programme', sous: 'Les chapitres de ta classe' };

  const suggestions = [
    { lignes: ditLignes, label: cta, action, expr: h.expression, carte: carteDuJour },
    !jourJeux.faite && { lignes: ['La partie du jour est prête.', '6 mini-jeux, 2 minutes.'], label: 'Jouer', action: () => navigate('/jeux?depuis=suggestion'), expr: 'emerveille', geste: 'brasEnLair',
      carte: { id: 'jeux', pose: 'celebration', fond: '#FFE3C7', titre: 'Partie du jour', sous: 'Réviz Games · 6 mini-jeux' } },
    titreLecon && (fcLast > 0
      ? { lignes: ['Tes cartes t’attendent.', 'On les revoit ?'], label: 'Réviser mes cartes', action: ouvrirCartes, expr: 'content', geste: 'coucou',
          carte: { id: 'cartes', pose: 'flashcard', fond: 'var(--rv-peche-pale)', titre: 'Flashcards', sous: `${pluriel(fcLast, 'carte')} à revoir · ${court(titreLecon, 20)}` } }
      : { lignes: ['Un petit quiz ?', 'Pour voir où tu en es.'], label: 'Lancer le quiz', expr: 'emerveille',
          action: () => { restoreLesson(lastLesson.id); navigate('/quiz'); },
          carte: { id: 'quiz', pose: 'quiz', fond: 'var(--rv-lavande)', titre: 'Quiz corrigé', sous: court(titreLecon, 32) } }),
    { lignes: ['Un autre chapitre ?', 'Tout ton programme est là.'], label: 'Réviser mon programme', action: lancerProgramme, expr: 'content', geste: 'coucou',
      carte: { id: 'programme', pose: 'reading', fond: 'var(--rv-peche-pale)', titre: 'Réviser', sous: `Tout le programme de ${classe}` } },
    { lignes: ['Une leçon à apprendre ?', 'Prends-la en photo.'], label: 'Scanner une leçon', action: lancerScan, expr: 'emerveille',
      carte: { id: 'scan', pose: 'scanphone', fond: 'var(--rv-menthe)', titre: 'Scanner une leçon', sous: avecCompte || 'Résumé, flashcards et quiz' } },
    { lignes: ['Une question ?', 'Je t’explique ton cours.'], label: 'Parler à Réviz IA', action: () => navigate('/coach'), expr: 'reflechit',
      carte: { id: 'ia', pose: 'coach', fond: 'var(--rv-rose)', titre: 'Réviz IA', sous: avecCompte || 'Je t’explique, avec des exemples' } },
    { lignes: ['Prêt pour une Battle ?', 'Défie un ami en direct.'], label: 'Lancer une Battle', action: () => navigate('/battle'), expr: 'determine', geste: 'brasEnLair',
      carte: { id: 'battle', pose: 'fire', fond: 'var(--rv-lavande)', titre: 'Battle', sous: '5 questions, 15 s, contre un ami' } },
    !isGuest && allLessons.length > 0 && {
      lignes: [allLessons.length > 1 ? 'Tes leçons scannées ?' : 'Ta leçon scannée ?', allLessons.length > 1 ? 'Elles sont toutes ici.' : 'Elle est rangée ici.'], label: 'Voir mes leçons',
      action: () => navigate('/cours'), expr: 'fier',
      carte: { id: 'cours', pose: 'writing', fond: 'var(--rv-menthe)', titre: 'Mes leçons', sous: `${pluriel(allLessons.length, 'leçon')} scannée${allLessons.length > 1 ? 's' : ''}` } },
    { lignes: controle ? ['Un autre contrôle ?', 'Note-le dans l’agenda.'] : ['Un contrôle bientôt ?', 'Dis-moi quand.'], label: "Ouvrir l'agenda",
      action: () => navigate('/agenda'), expr: 'content', geste: 'gratterTete',
      carte: { id: 'agenda', pose: 'thinking', fond: 'var(--rv-peche-pale)', titre: 'Agenda', sous: 'Tes contrôles et leurs plans' } },
  ].filter((p, i) => p && (i === 0 || p.carte.id !== carteDuJour.id));
  const sugg = suggestions[tour % suggestions.length];

  // « Démarre en un clic » (grammaire Nomad, 28/10) : trois raccourcis fixes sous la bulle. L'action du
  // jour, la préparation d'un contrôle (le plan de révision de l'agenda), puis le programme ou le scan.
  const raccourcis = [
    { ...carteDuJour, go: action },
    controle && carteDuJour.id !== 'controle'
      ? { id: 'plan', pose: 'examen', fond: 'var(--sk-peche)', titre: 'Mon plan de révision', sous: `${controle.m.label} ${controle.quand}`, go: () => navigate('/agenda') }
      : { id: 'plan', pose: 'examen', fond: 'var(--sk-peche)', titre: 'Préparer un contrôle', sous: 'Ton plan jusqu’au jour J', go: () => navigate('/agenda') },
    carteDuJour.id === 'programme'
      ? { id: 'scan', pose: 'scanphone', fond: 'var(--sk-menthe)', titre: 'Scanner une leçon', sous: avecCompte || 'Résumé, flashcards et quiz', go: lancerScan }
      : { id: 'programme', pose: 'reading', fond: 'var(--sk-lavande)', titre: 'Mon programme', sous: `Tout le programme de ${classe}`, go: lancerProgramme },
  ];
  const blocRaccourcis = (
    <div className="hm-raccourcis" role="group" aria-label="Démarre en un clic">
      {raccourcis.map(r => (
        <button key={r.id} type="button" className="hm-raccourci" onClick={r.go}>
          <span className="hm-raccourci-rond" style={{ background: r.fond }}>
            <Mascot pose={r.pose} size={isDesktop ? 54 : 48} alt="" aria-hidden="true" />
          </span>
          <span className="hm-raccourci-txt">
            <span className="hm-raccourci-titre">{r.titre}</span>
            <span className="hm-raccourci-sous">{r.sous}</span>
          </span>
          <span className="hm-raccourci-fleche" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
        </button>
      ))}
    </div>
  );
  const texteSugg = sugg.lignes.join('\n');

  // Le héros hors de l'écran ou l'onglet caché : Réviz attend avant de changer de phrase.
  useEffect(() => {
    if (!hero.current || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(([v]) => { heroVu.current = v.isIntersecting; });
    obs.observe(hero.current);
    return () => obs.disconnect();
  }, [isDesktop]);

  useEffect(() => {
    if (!parle) return;
    // La première phrase est dite à l'atterrissage (aterri) ; les suivantes ici, avec leur pose.
    if (tour > 0) {
      pantin.current?.expression(sugg.expr);
      if (sugg.geste) pantin.current?.geste(sugg.geste);
      pantin.current?.dire(texteSugg);
    }
    const temps = tempsLettres(texteSugg);
    let t1, t2;
    const suivante = () => {
      // Héros hors de l'écran, onglet caché ou souris dessus (ordinateur) : il attend.
      if (document.hidden || !heroVu.current || survol.current) { t1 = setTimeout(suivante, 1500); return; }
      setSortie(true);
      t2 = setTimeout(() => { setSortie(false); setTour(t => t + 1); }, 220);
    };
    // Le temps de dire la phrase, puis de la lire.
    t1 = setTimeout(suivante, (temps[temps.length - 1] || 0) * 1000 + 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [parle, tour]);
  // Ordinateur : les points sous la carte mènent directement à une proposition.
  const allerA = i => {
    const n = suggestions.length, ici = tour % n;
    if (i === ici) return;
    setSortie(false);
    setTour(t => t - ici + i + (i < ici ? n : 0));
  };
  const style = { '--hm-bg': h.bg, '--hm-tint': h.tint, '--hm-dot': h.dot, '--hm-bar': h.bar, '--hm-btn': h.btn, '--hm-soft': h.soft, '--hm-btn-texte': h.btnTexte, '--rv-accent': h.btn };

  const serie = streak > 0 && (
    <span className="hm-serie" aria-label={`${streak} jour${streak > 1 ? 's' : ''} de suite`}>
      <Flamme />{streak}{isDesktop ? ` jour${streak > 1 ? 's' : ''}` : ''}
    </span>
  );

  // Le plan en chemin, façon plateau de jeu. Une case par jour, la case du jour
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
                <Mascot pose={c.pose} size={i === enCours ? (isDesktop ? 74 : 66) : (isDesktop ? 58 : 52)} alt="" aria-hidden="true" />
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
          <Link key={m.slug} to={`/programme?matiere=${m.slug}`} className="hm-matiere">
            <span className="hm-matiere-rond" style={{ background: m.bg }}>
              <Mascot pose={m.pose} size={44} alt="" aria-hidden="true" />
            </span>
            <span className="hm-matiere-nom">{m.nom}</span>
          </Link>
        ))}
      </div>
    </section>
  );

  // Réviz Games : la partie du jour, avec la série et le record (la même partie pour tout le monde).
  const carteJeux = (
    <Link to="/jeux?depuis=accueil" className={`hm-jeux${jourJeux.faite ? ' hm-jeux--faite' : ''}`}>
      <img className="hm-jeux-image" src="/jeux/hub/partie-du-jour.webp" alt="" />
      <span className="hm-jeux-voile" aria-hidden="true" />
      <span className="hm-jeux-txt">
        <span className="hm-jeux-surtitre">Réviz Games</span>
        <span className="hm-jeux-titre">La partie du jour</span>
        <span className="hm-jeux-sous">
          {jourJeux.faite
            ? `Faite !${jourJeux.score != null ? ` ${jourJeux.score.toLocaleString('fr-FR')} points.` : ''} Reviens demain, ou fais une Partie rapide.`
            : '6 mini-jeux de 15 secondes, la même partie pour tout le monde.'}
        </span>
        <span className="hm-jeux-btn">{jourJeux.faite ? 'Voir les jeux' : 'Jouer'}</span>
      </span>
    </Link>
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

  // 3e : le simulateur de notes du brevet (40 % contrôle continu, 60 % épreuves).
  const carteSimulateur = classe === '3ème' && (
    <Link to="/simulateur-brevet" className="hm-simu">
      <Mascot pose="graduation" size={isDesktop ? 104 : 84} alt="" aria-hidden="true" className="hm-simu-mascotte" />
      <span className="hm-simu-txt">
        <span className="hm-simu-sur">Brevet 2027</span>
        <span className="hm-simu-titre">Simule ta note</span>
        <span className="hm-simu-sous">Ce qu’il te faut aux épreuves pour chaque mention.</span>
      </span>
    </Link>
  );

  const rappels = (
    <div className="hm-rappels">
      <GuestBanner />
      <ConsentBanner />
      <EmailBanner />
      <PushBanner />
    </div>
  );

  return (
    <div className={`app app--no-halo home-page${isDesktop ? ' app--large' : ''}`} style={style}>
      {newBadge && !annonceJeux && <AchievementToast badge={newBadge} onDone={() => setNewBadge(null)} />}
      {annonceRevizPlus && <RevizPlusAnnonce uid={currentUser.uid} onClose={() => setAnnonceRevizPlus(false)} />}
      {annonceJeux && <JeuxAnnonce uid={currentUser.uid} onClose={() => setAnnonceJeux(false)} />}

      {isDesktop ? (
        <div className="content hm-desk">
          <div
            className="hm-hero hm-hero--desk"
            ref={hero}
            onMouseEnter={() => { survol.current = true; }}
            onMouseLeave={() => { survol.current = false; }}
          >
            <span className="hm-bulle hm-bulle--a" aria-hidden="true" />
            <span className="hm-bulle hm-bulle--b" aria-hidden="true" />
            <span className="hm-point" aria-hidden="true" />
            <span className="hm-grain" aria-hidden="true" />
            {/* Bloc de couleur (28/10) : à gauche le titre, la bulle de Réviz et les raccourcis ;
                à droite Réviz, vers qui pointe la bulle. */}
            <div className="hm-scene">
              <div className="hm-hero-txt">
                <div className="hm-hero-haut">
                  <span className="hm-date">{dateTxt}</span>
                  <div className="hm-hero-titres">
                    <span className="hm-auj">Aujourd'hui</span>
                    {serie}
                  </div>
                </div>
                <h1 className="sr-only">{dit}</h1>
                <BulleReviz key={`${humeurId}-${tour}`} lignes={sugg.lignes} parle={parle} sortie={sortie} onClick={sugg.action} label={sugg.label}
                  pointe="droite" grande className="hm-bulle-parole" />
                <div className="hm-points" role="group" aria-label="Ce que Réviz propose">
                  {suggestions.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`hm-point-sugg${i === tour % suggestions.length ? ' hm-point-sugg--la' : ''}`}
                      onClick={() => allerA(i)}
                      aria-label={p.carte.titre}
                      aria-current={i === tour % suggestions.length}
                    />
                  ))}
                </div>
                {blocRaccourcis}
              </div>
              <Pantin
                ref={pantin}
                size={TAILLE_PANTIN}
                expression={h.expression}
                entree={entree}
                onEntree={aterri}
                repli={null}
                className="hm-pantin"
                onClick={sauter}
                label="Réviz, ta mascotte"
              />
            </div>
          </div>
          {rappels}
          {montrerEssai && <div className="hm-essai-desk"><ThemeEssai onClose={() => setEssaiTheme(false)} /></div>}
          <div className="hm-grille">
            <div className="hm-carte hm-carte--chemin">{chemin}</div>
            <div className="hm-carte">{carteMatieres}</div>
            {carteJeux}
            {carteBattle}
            {carteSimulateur}
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
                entree={entree}
                onEntree={aterri}
                repli={null}
                onClick={sauter}
                label="Réviz, ta mascotte"
              />
            </div>
            {/* Bandeau (essai, e-mail, accord parental) : tout en haut, dans l'aplat du héros. */}
            {rappels}
            <div className="hm-hero-haut">
              <div className="hm-hero-titres">
                <span className="hm-date">{dateTxt}</span>
                <span className="hm-auj">Aujourd'hui</span>
              </div>
              {serie}
            </div>
            <h1 className="sr-only">{dit}</h1>
            <BulleReviz key={`${humeurId}-${tour}`} lignes={sugg.lignes} parle={parle} sortie={sortie} onClick={sugg.action} label={sugg.label} className="hm-bulle-parole" />
          </div>
          <div className="hm-pad hm-pad--raccourcis">{blocRaccourcis}</div>
          <div className="hm-pad hm-pad--chemin">{chemin}</div>
          <div className="hm-pad">{carteJeux}</div>
          {carteSimulateur && <div className="hm-pad">{carteSimulateur}</div>}
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
