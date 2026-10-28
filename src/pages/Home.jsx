import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav, EtoileIA } from '../components/BottomNav';
import { GuestBanner } from '../components/GuestBanner';
import { ConsentBanner } from '../components/ConsentBanner';
import { EmailBanner } from '../components/EmailBanner';
import { PushBanner } from '../components/PushBanner';
import { Mascot } from '../components/Mascot';
import { estInstallee } from '../utils/installation';
import { Pantin } from '../components/Pantin';
import { loadLessons, restoreLesson, syncFromFirestore } from '../services/historyService';
import { loadRevisions } from '../services/revisionService';
import { loadCatalogue } from '../services/programmeService';
import { agendaLocal, chargerAgenda } from '../services/agendaService';
import { controlesAVenir, compteARebours, matiereControle, joursEntre, jourIso } from '../utils/agenda';
import { planRevision } from '../utils/planRevision';
import { marquerEtape } from '../services/agendaService';
import { cibleRevision, cibleQuizErreurs } from '../services/controleChapitres';
import { hasProgramme, PROGRAMME_FALLBACK } from '../utils/programme';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { countDueCards } from '../services/srsService';
import { detailSerie, computeLevel, computeBadges } from '../utils/gamification';
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
  const [caseChoisie, setCaseChoisie] = useState(null);
  const pantin = useRef(null);
  const hero = useRef(null);
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
  // Série avec gel automatique : un jour manqué par semaine ne la casse pas (utils/gamification).
  const { serie: streak, gels } = useMemo(() => detailSerie([...loadRevisions(), ...jourJeux.jours.map(j => ({ revisedAt: `${j}T12:00:00` }))], 'revisedAt', { gel: true }), [allLessons, jourJeux]);
  const { level, xpTotal } = useMemo(() => computeLevel(allLessons), [allLessons]);
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
    // J-1 : le contrôle blanc (mode contrôle) ; il coche l'étape une fois la copie rendue.
    if (id === 'blanc') { navigate(`/controle?c=${controle.id}`); return; }
    await marquerEtape(currentUser, controle.id, id).catch(() => {});
    // J-3 : les questions ratées des chapitres du contrôle ; J-5 : la fiche du chapitre à travailler.
    if (id === 'quiz') navigate(await cibleQuizErreurs(currentUser?.uid, controle));
    else navigate(await cibleRevision(controle));
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
  const style = { '--hm-bg': h.bg, '--hm-tint': h.tint, '--hm-dot': h.dot, '--hm-btn': h.btn, '--hm-soft': h.soft, '--hm-btn-texte': h.btnTexte, '--rv-accent': h.btn };
  const court = (t, max = 24) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);
  const lancerProgramme = () => navigate('/programme');
  const lancerScan = () => navigate('/scan');
  const prenom = String(currentUser?.displayName ?? '').trim().split(/\s+/)[0];

  // « On fait quoi aujourd'hui ? Démarre en un clic » (comme l'accueil de l'app Nomad) : un quiz,
  // préparer un contrôle (le plan de révision de l'agenda), réviser avec son cours.
  const raccourcis = [
    { id: 'quiz', pose: 'quiz', titre: 'Fais un quiz', sous: lastLesson?.metadata?.title ? court(lastLesson.metadata.title, 36) : 'Sur un chapitre de ton programme', go: lancerQuiz },
    controle
      ? { id: 'plan', pose: 'examen', titre: 'Mon plan de révision', sous: `${controle.m.label} ${controle.quand}`, go: () => navigate('/agenda') }
      : { id: 'plan', pose: 'examen', titre: 'Prépare un contrôle', sous: 'Ton plan jusqu’au jour J', go: () => navigate('/agenda') },
    isGuest
      ? { id: 'programme', pose: 'reading', titre: 'Révise ton programme', sous: `Tout le programme de ${classe}`, go: lancerProgramme }
      : { id: 'scan', pose: 'scanphone', titre: 'Révise avec ton cours', sous: 'Prends ta leçon en photo', go: lancerScan },
  ];
  const Fleche = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  );
  const blocRaccourcis = (
    <div className="nm-lignes" role="group" aria-label="Démarre en un clic">
      {raccourcis.map(r => (
        <button key={r.id} type="button" className="nm-ligne" onClick={r.go}>
          <span className="nm-ligne-icone"><Mascot pose={r.pose} size={isDesktop ? 46 : 42} alt="" aria-hidden="true" /></span>
          <span className="nm-ligne-txt">
            <span className="nm-ligne-titre">{r.titre}</span>
            <span className="nm-ligne-sous">{r.sous}</span>
          </span>
          <span className="nm-ligne-fleche"><Fleche /></span>
        </button>
      ))}
    </div>
  );

  const serie = streak > 0 && (
    <span className="hm-serie" aria-label={`${streak} jour${streak > 1 ? 's' : ''} de suite${gels.length ? ', série protégée par un jour gelé' : ''}`}
      title={gels.length ? 'Un jour manqué cette semaine : ta série est protégée (un jour par semaine).' : undefined}>
      <Flamme />{streak}{isDesktop ? ` jour${streak > 1 ? 's' : ''}` : ''}
      {gels.length > 0 && <span className="hm-serie-gel">protégée</span>}
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

  const stats = (
    <ul className="nm-stats" aria-label="Tes chiffres">
      <li><span className="nm-stat-ico nm-stat-ico--xp" aria-hidden="true">XP</span><b>{xpTotal}</b><small>Points d’expérience</small></li>
      <li><span className="nm-stat-ico" aria-hidden="true"><Flamme /></span><b>{streak}</b><small>{gels.length ? 'jours, série protégée' : 'jours de suite'}</small></li>
      <li><span className="nm-stat-ico nm-stat-ico--niveau" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="5.5" /><path d="m9 13.5-1.5 7.5 4.5-2.5 4.5 2.5-1.5-7.5" /></svg>
      </span><b>{level}</b><small>Niveau</small></li>
    </ul>
  );
  const tete = !isDesktop && (
    <header className="nm-tete">
      <Link to="/" className="nm-tete-logo" aria-label="Réviz"><img src="/logo/pastille.png" width="44" height="44" alt="" /></Link>
      {/* En mode essai, le bandeau juste dessous propose déjà de créer son compte. */}
      {!isGuest && !hasRevizPlus ? <Link to={{ pathname: '/reglages', hash: '#abonnement' }} className="nm-abo">S’abonner <span>Réviz+</span></Link> : <span />}
      <Link to="/profil" className="nm-tete-avatar" aria-label={`Mon profil${prenom ? `, ${prenom}` : ''}`}><Mascot pose="hello" size={34} alt="" /></Link>
    </header>
  );
  const salut = (
    <div className="nm-salut">
      <h1 className="nm-hello"><span className="nm-hello-reviz" aria-hidden="true"><Mascot pose="hello" size={isDesktop ? 58 : 48} alt="" /></span>{prenom ? `Salut ${prenom} !` : 'Salut !'}</h1>
      {!isDesktop && stats}
    </div>
  );
  const recherche = (
    <Link to="/programme" className="nm-recherche">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      On révise quoi aujourd’hui ?
    </Link>
  );
  // Les bulles : ce qu'on vient faire (scanner sa leçon, réviser le programme, défier un ami).
  // L'agenda a déjà son onglet et sa carte « Tes prochains contrôles » : pas de doublon ici.
  const ronds = (
    <nav className="nm-ronds" aria-label="Aller vite">
      {[
        { to: '/scan', pose: 'scanphone', label: 'Scanner' },
        { to: '/programme', pose: 'reading', label: 'Réviser' },
        { to: '/battle', pose: 'fire', label: 'Défier' },
      ].map(r => (
        <Link key={r.to} to={r.to} className="nm-rond">
          <span className="nm-rond-icone"><Mascot pose={r.pose} size={isDesktop ? 58 : 52} alt="" aria-hidden="true" /></span>
          <span className="nm-rond-label">{r.label}</span>
        </Link>
      ))}
    </nav>
  );
  const blocDuJour = (
    <section className="nm-bloc" aria-labelledby="nm-bloc-titre" ref={hero}>
      <div className="nm-bloc-tete">
        <h2 id="nm-bloc-titre" className="nm-bloc-titre">On fait quoi aujourd’hui ?</h2>
        <p className="nm-bloc-sous">Démarre en un clic</p>
      </div>
      <div className="nm-bloc-reviz">
        <Pantin ref={pantin} size={isDesktop ? 190 : 118} expression={h.expression} entree="coucou" repli={null} onClick={sauter} label="Réviz, ta mascotte" />
      </div>
      {blocRaccourcis}
    </section>
  );
  const aLaUne = (
    <section className="nm-une" aria-labelledby="nm-une-titre">
      <h2 id="nm-une-titre" className="nm-titre-barre">À la une</h2>
      <div className="nm-une-cartes">
        {carteJeux}
        {carteBattle}
        {carteSimulateur}
      </div>
    </section>
  );
  // Colonne de droite (ordinateur), comme l'app Nomad : les chiffres, le prochain contrôle, les indispensables.
  const rail = isDesktop && (
    <aside className="nm-rail" aria-label="En un coup d’œil">
      <div className="nm-rail-carte">{stats}</div>
      <section className="nm-rail-section" aria-labelledby="nm-rail-ctrl">
        <h2 id="nm-rail-ctrl" className="nm-rail-titre">Tes prochains contrôles</h2>
        <div className="nm-rail-carte nm-rail-ctrl">
          {controle ? (
            <>
              <span className="nm-rail-ctrl-ico"><Mascot pose={subjectMascot(controle.m.label)} size={40} alt="" aria-hidden="true" /></span>
              <span className="nm-rail-ctrl-txt"><b>{`Contrôle de ${controle.m.label.toLowerCase()}`}</b><span>{majuscule(controle.quand)}{controle.titre ? ` · ${controle.titre}` : ''}</span></span>
              <Link to="/agenda" className="nm-rail-btn">Voir le plan</Link>
            </>
          ) : (
            <>
              <span className="nm-rail-ctrl-ico"><Mascot pose="examen" size={40} alt="" aria-hidden="true" /></span>
              <span className="nm-rail-ctrl-txt"><b>Aucun contrôle noté</b><span>Note-le : Réviz prépare ton plan de révision.</span></span>
              <Link to="/agenda" className="nm-rail-btn">Ajouter un contrôle</Link>
            </>
          )}
        </div>
      </section>
      <section className="nm-rail-section" aria-labelledby="nm-rail-indis">
        <h2 id="nm-rail-indis" className="nm-rail-titre">Tes indispensables</h2>
        <div className="nm-rail-carte nm-indis">
          {[
            !isGuest && { to: '/coach', etoile: true, label: 'Réviz IA' },
            { to: '/cours', pose: 'writing', label: 'Mes cours' },
            classe === '3ème' && { to: '/simulateur-brevet', pose: 'graduation', label: 'Simulateur' },
            { to: '/jeux?depuis=accueil', pose: 'celebration', label: 'Jeux' },
            !estInstallee() && { to: '/installer', pose: 'pointing', label: 'Installer' },
          ].filter(Boolean).slice(0, 4).map(r => (
            <Link key={r.to} to={r.to} className="nm-indis-item">
              <span className="nm-indis-rond">{r.etoile ? <EtoileIA id="rv-ia-indis" size={26} /> : <Mascot pose={r.pose} size={40} alt="" aria-hidden="true" />}</span>
              <span>{r.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );

  return (
    <div className={`app app--no-halo home-page nm-page${isDesktop ? ' app--large nm-page--large' : ''}`} style={style}>
      {newBadge && !annonceJeux && <AchievementToast badge={newBadge} onDone={() => setNewBadge(null)} />}
      {annonceRevizPlus && <RevizPlusAnnonce uid={currentUser.uid} onClose={() => setAnnonceRevizPlus(false)} />}
      {annonceJeux && <JeuxAnnonce uid={currentUser.uid} onClose={() => setAnnonceJeux(false)} />}

      <div className="content nm-defile">
        {tete}
        <div className="nm-grille">
          <div className="nm-principal">
            {rappels}
            {salut}
            {recherche}
            {ronds}
            {blocDuJour}
            {montrerEssai && <ThemeEssai onClose={() => setEssaiTheme(false)} />}
            <div className="nm-carte">{chemin}</div>
            <div className="nm-carte">{carteMatieres}</div>
            {aLaUne}
          </div>
          {rail}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
