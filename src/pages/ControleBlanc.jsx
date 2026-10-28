import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { Mascot } from '../components/Mascot';
import { loadLessons } from '../services/historyService';
import { loadChapterContent } from '../services/programmeService';
import { chapterLessonId, PROGRAMME_FALLBACK } from '../utils/programme';
import { agendaLocal, marquerEtape } from '../services/agendaService';
import { recordRevision } from '../services/revisionService';
import { noterErreurs, erreursDe, preparerQuizErreurs } from '../services/erreursService';
import { track } from '../services/statsService';
import { matiereControle, jourEnClair } from '../utils/agenda';
import { planOuvert } from '../utils/planRevision';
import { sujetControle, leconDeLaMatiere, noteSur20, noteEnClair, dureeControle, chrono, MIN_QUESTIONS } from '../utils/controleBlanc';
import { nbsp } from '../utils/typography';
// Les jeux en plein écran partagent leurs styles (fond, boutons) ; l'épreuve reprend ceux du quiz.
import './Flashcards.css';
import './Quiz.css';
import './ControleBlanc.css';

const LETTRES = ['A', 'B', 'C', 'D'];
const majuscule = t => t.charAt(0).toUpperCase() + t.slice(1);
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const deLaMatiere = m => (m.slug === 'autre' ? 'tes leçons' : /^[aeiouyhé]/i.test(m.label) ? `d’${m.label.toLowerCase()}` : `de ${m.label === m.label.toUpperCase() ? m.label : m.label.toLowerCase()}`);
const dureeEnClair = s => {
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m ? `${m} min${r ? ` ${String(r).padStart(2, '0')} s` : ''}` : `${r} s`;
};

const Croix = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
);
const Fleche = ({ sens = 'd' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={sens === 'd' ? 'M5 12h14M13 6l6 6-6 6' : 'M19 12H5M11 6l-6 6 6 6'} /></svg>
);
const Horloge = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9.5 2.5h5" /></svg>
);

/**
 * Mode contrôle (Réviz+, docs/offre-revizplus.md) : un contrôle blanc chronométré sur les
 * chapitres de la matière déjà ouverts. Trois temps : le sujet (ce qui t'attend), l'épreuve
 * (une minute par question, réponses modifiables, aucune correction), puis la note sur 20 et
 * le corrigé. Terminé, il coche l'étape J-1 du plan, compte comme une révision et range les
 * erreurs dans « Refaire mes erreurs ». ?c=<id du contrôle de l'agenda>.
 */
export default function ControleBlanc() {
  const [params] = useSearchParams();
  const { currentUser, hasRevizPlus } = useAuth();
  const navigate = useNavigate();
  const uid = currentUser?.uid ?? null;
  const agenda = useMemo(() => agendaLocal(uid), [uid]);
  const controle = agenda.controles.find(c => c.id === params.get('c')) ?? null;
  const [tirage, setTirage] = useState(0); // « Refaire un contrôle blanc » : nouveau sujet

  if (!controle) {
    return (
      <Cadre onFermer={() => navigate('/agenda')}>
        <div className="cb-carte cb-sujet">
          <span className="cb-emote" aria-hidden="true"><Mascot pose="confused" size={64} alt="" /></span>
          <h1 className="cb-titre">Ce contrôle n’est plus dans ton agenda</h1>
          <p className="cb-txt">Note-le de nouveau dans l’agenda pour faire son contrôle blanc.</p>
          <button type="button" className="cb-btn" onClick={() => navigate('/agenda')}>Ouvrir l’agenda</button>
        </div>
      </Cadre>
    );
  }
  if (!planOuvert(controle, agenda, hasRevizPlus)) {
    return (
      <Cadre onFermer={() => navigate('/agenda')}>
        <div className="cb-carte cb-sujet">
          <span className="cb-emote" aria-hidden="true"><Mascot pose="examen" size={64} alt="" /></span>
          <span className="cb-sur">Contrôle blanc</span>
          <h1 className="cb-titre">Le contrôle blanc fait partie de Réviz+</h1>
          <p className="cb-txt">Ton premier contrôle noté l’a en entier. Pour les suivants, Réviz+ débloque le plan de révision et ses contrôles blancs.</p>
          <button type="button" className="cb-btn" onClick={() => navigate({ pathname: '/reglages', hash: '#abonnement' })}>Voir Réviz+</button>
        </div>
      </Cadre>
    );
  }
  return <Session key={tirage} controle={controle} uid={uid} onRefaire={() => setTirage(t => t + 1)} />;
}

function Cadre({ onFermer, haut, children, large }) {
  const isDesktop = useIsDesktop();
  return (
    <div className={`app app--no-halo fc-page qz-page qn-page cb-page${isDesktop ? ' app--large fc-page--large qn-page--large' : ''}${large ? ' cb-page--large' : ''}`}>
      <div className="qn-ecran cb-ecran">
        <div className="qn-haut cb-haut">
          <button type="button" className={`fc-fermer${isDesktop ? ' fc-fermer--pilule' : ''}`} onClick={onFermer} aria-label="Quitter le contrôle blanc">
            <Croix />{isDesktop && 'Quitter'}
          </button>
          {haut}
        </div>
        {children}
      </div>
    </div>
  );
}

function Session({ controle, uid, onRefaire }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isDesktop = useIsDesktop();
  const m = matiereControle(controle.matiere);
  // Les leçons du sujet : celles des chapitres choisis pour le contrôle (rouverts depuis le
  // programme s'ils n'ont jamais été ouverts), sinon les chapitres de la matière déjà ouverts.
  const [lecons, setLecons] = useState(null);
  const [duControle, setDuControle] = useState(false);
  useEffect(() => {
    let vivant = true;
    const historique = loadLessons();
    const deLaMatiere = historique.filter(l => leconDeLaMatiere(l, m.slug));
    const chs = controle.chapitres ?? [];
    if (!chs.length) { setLecons(deLaMatiere); return undefined; }
    Promise.all(chs.map(async ch => {
      const deja = historique.find(l => l.id === chapterLessonId(ch.id));
      if (deja) return deja;
      const aiData = await loadChapterContent(controle.classe ?? PROGRAMME_FALLBACK, controle.programme ?? m.slug, ch.id).catch(() => null);
      return aiData && { id: chapterLessonId(ch.id), metadata: { title: ch.titre, subject: controle.programme ?? m.label }, aiData };
    })).then(ls => {
      if (!vivant) return;
      const prets = ls.filter(l => l?.aiData?.quiz?.length);
      setDuControle(prets.length > 0);
      setLecons(prets.length ? prets : deLaMatiere);
    });
    return () => { vivant = false; };
  }, [controle, m.slug, m.label]);
  const { questions, chapitres } = useMemo(() => {
    if (!lecons) return { questions: [], chapitres: [] };
    const ratees = new Set(lecons.flatMap(l => erreursDe(uid, l.id)));
    return sujetControle({ lecons, matiere: duControle ? null : m.slug, ratees });
  }, [lecons, duControle, m.slug, uid]);
  const duree = dureeControle(questions.length);

  const [phase, setPhase] = useState('sujet'); // sujet | epreuve | fin
  const [idx, setIdx] = useState(0);
  const [reponses, setReponses] = useState([]);
  useEffect(() => { setReponses(questions.map(() => null)); }, [questions]);
  const [reste, setReste] = useState(duree);
  const [tempsPasse, setTempsPasse] = useState(0);
  const debut = useRef(0);
  const rendue = useRef(false);

  const nom = `Contrôle ${deLaMatiere(m)}`;
  const titre = [m.slug === 'autre' ? 'Contrôle' : m.label, controle.titre].filter(Boolean).join(' · ');

  const rendre = useCallback(() => {
    if (rendue.current) return;
    rendue.current = true;
    const passe = Math.min(duree, (Date.now() - debut.current) / 1000);
    const justes = reponses.filter((r, i) => r === questions[i].correct).length;
    const note = noteSur20(justes, questions.length);
    // Les erreurs vont à leur leçon : « Refaire mes erreurs » et l'étape J-3 les retrouvent.
    for (const id of new Set(questions.map(q => q.lessonId))) {
      const ks = questions.map((q, i) => (q.lessonId === id ? i : -1)).filter(i => i >= 0);
      noterErreurs(uid, id, ks.map(i => questions[i]), ks.map(i => reponses[i]));
    }
    recordRevision('controle', { lessonId: null, matiere: m.slug, score: justes, total: questions.length, note });
    if (currentUser) marquerEtape(currentUser, controle.id, 'blanc').catch(() => {});
    track('controle_blanc_termine', { matiere: m.slug, note, total: questions.length, secondes: Math.round(passe) });
    setTempsPasse(passe);
    setPhase('fin');
  }, [controle.id, currentUser, duree, m.slug, questions, reponses, uid]);

  // Le chrono : à zéro, la copie part telle quelle.
  useEffect(() => {
    if (phase !== 'epreuve') return undefined;
    const t = setInterval(() => {
      const r = duree - (Date.now() - debut.current) / 1000;
      setReste(r);
      if (r <= 0) rendre();
    }, 250);
    return () => clearInterval(t);
  }, [phase, duree, rendre]);

  function commencer() {
    debut.current = Date.now();
    setReste(duree);
    setPhase('epreuve');
    track('controle_blanc_commence', { matiere: m.slug, total: questions.length });
  }
  const choisir = i => setReponses(rs => rs.map((r, k) => (k === idx ? i : r)));
  const derniere = idx === questions.length - 1;
  const nbRepondues = reponses.filter(r => r !== null).length;

  // Clavier (ordinateur) : 1-4 ou A-D pour choisir, flèches pour passer d'une question à l'autre.
  useEffect(() => {
    if (phase !== 'epreuve') return undefined;
    function onKey(e) {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const i = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }[String(e.key).toLowerCase()];
      if (i !== undefined && i < questions[idx].choices.length) { e.preventDefault(); choisir(i); }
      else if (e.key === 'ArrowRight' && !derniere) setIdx(k => k + 1);
      else if (e.key === 'ArrowLeft' && idx > 0) setIdx(k => k - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const fermer = () => navigate('/agenda');

  // ── Le sujet ──
  if (phase === 'sujet' && !lecons) {
    return (
      <Cadre onFermer={fermer}>
        <div className="cb-carte cb-sujet" role="status">
          <span className="cb-emote" aria-hidden="true"><Mascot pose="writing" size={64} alt="" /></span>
          <span className="cb-sur">Contrôle blanc</span>
          <h1 className="cb-titre">{titre}</h1>
          <p className="cb-txt">Réviz prépare ton sujet…</p>
        </div>
      </Cadre>
    );
  }
  if (phase === 'sujet') {
    const assez = questions.length >= MIN_QUESTIONS;
    return (
      <Cadre onFermer={fermer}>
        <div className="cb-carte cb-sujet">
          <span className="cb-emote" aria-hidden="true"><Mascot pose="examen" size={isDesktop ? 76 : 64} alt="" /></span>
          <span className="cb-sur">Contrôle blanc</span>
          <h1 className="cb-titre">{titre}</h1>
          <p className="cb-date">{nom} · {majuscule(jourEnClair(controle.date))}</p>
          {assez ? (
            <>
              <ul className="cb-regles">
                <li><b>{pluriel(questions.length, 'question')}</b><span>sur {duControle ? `${pluriel(chapitres.length, 'chapitre')} du contrôle` : `${pluriel(chapitres.length, 'chapitre')} que tu as ouverts`}</span></li>
                <li><b>{Math.round(duree / 60)} minutes</b><span>le chrono tourne, comme le jour J</span></li>
                <li><b>Pas de correction</b><span>pendant l’épreuve : tu peux changer tes réponses</span></li>
                <li><b>Une note sur 20</b><span>puis le corrigé de chaque question</span></li>
              </ul>
              {chapitres.length > 0 && (
                <div className="cb-chapitres" aria-label="Chapitres du sujet">
                  {chapitres.map(ch => <span key={ch} className="cb-chapitre">{ch}</span>)}
                </div>
              )}
              <button type="button" className="cb-btn" onClick={commencer}>Commencer le contrôle<Fleche /></button>
            </>
          ) : (
            <>
              <p className="cb-txt">Pour un contrôle blanc {deLaMatiere(m)}, ouvre d’abord au moins un chapitre {deLaMatiere(m)} dans le programme : le sujet est fait de ses questions.</p>
              <button type="button" className="cb-btn" onClick={() => navigate(m.slug === 'autre' ? '/programme' : `/programme?matiere=${m.slug}`)}>Ouvrir le programme<Fleche /></button>
            </>
          )}
        </div>
      </Cadre>
    );
  }

  // ── La note et le corrigé ──
  if (phase === 'fin') {
    const justes = reponses.filter((r, i) => r === questions[i].correct).length;
    const note = noteSur20(justes, questions.length);
    const erreurs = questions.filter((q, i) => reponses[i] !== q.correct).length;
    const message = note >= 16 ? 'Tu es prêt pour le jour J.' : note >= 10 ? 'C’est solide. Revois tes erreurs ce soir.' : 'On revoit les erreurs ensemble, tu vas y arriver.';
    const refaireErreurs = () => {
      if (preparerQuizErreurs(uid, m.slug)) navigate('/quiz?erreurs=1');
      else navigate(m.slug === 'autre' ? '/programme' : `/programme?matiere=${m.slug}`);
    };
    return (
      <Cadre onFermer={fermer} large>
        <div className="cb-fin">
          <section className="cb-carte cb-note" aria-label={`Ta note : ${noteEnClair(note)} sur 20`}>
            <span className="cb-emote" aria-hidden="true"><Mascot pose={note >= 16 ? 'trophy' : note >= 10 ? 'pointing' : 'confused'} size={isDesktop ? 88 : 72} alt="" /></span>
            <span className="cb-sur">Contrôle blanc terminé</span>
            <span className="cb-note-chiffre" aria-hidden="true">{noteEnClair(note)}<small>/20</small></span>
            <p className="cb-note-detail">{justes} {justes > 1 ? 'bonnes réponses' : 'bonne réponse'} sur {questions.length} · {dureeEnClair(tempsPasse)}</p>
            <p className="cb-txt">{message}</p>
            <div className="cb-actions">
              {erreurs > 0 && <button type="button" className="cb-btn" onClick={refaireErreurs}>Refaire mes erreurs</button>}
              <button type="button" className="cb-btn cb-btn--second" onClick={onRefaire}>Refaire un contrôle blanc</button>
              <button type="button" className="cb-lien" onClick={fermer}>Retour à l’agenda</button>
            </div>
          </section>
          <section className="cb-corrige" aria-labelledby="cb-corrige-titre">
            <h2 id="cb-corrige-titre" className="cb-h2">Le corrigé</h2>
            <ol className="cb-corrige-liste">
              {questions.map((q, i) => {
                const r = reponses[i], ok = r === q.correct;
                return (
                  <li key={q.question} className={`cb-carte cb-question${ok ? ' is-juste' : ' is-faux'}`}>
                    <span className="cb-question-num">Question {i + 1}{q.chapitre ? ` · ${q.chapitre}` : ''}</span>
                    <p className="cb-question-txt">{nbsp(q.question)}</p>
                    <div className="cb-pastilles">
                      <span className={`qz-pill ${ok ? 'qz-pill--juste' : 'qz-pill--faux'}`}>{r === null ? 'Pas de réponse' : `Ta réponse : ${q.choices[r]}`}</span>
                      {!ok && <span className="qz-pill qz-pill--juste">Bonne réponse : {q.choices[q.correct]}</span>}
                    </div>
                    {q.explanation && <p className="cb-question-corr">{nbsp(q.explanation)}</p>}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </Cadre>
    );
  }

  // ── L'épreuve ──
  const q = questions[idx];
  const presque = reste <= 60;
  return (
    <Cadre onFermer={fermer} haut={(
      <>
        <span className="qn-barre" aria-hidden="true"><i style={{ width: `${Math.max(nbRepondues / questions.length * 100, 3)}%` }} /></span>
        <span className={`cb-chrono${presque ? ' is-presque' : ''}`} role="timer" aria-label={`Temps restant : ${chrono(reste)}`}><Horloge />{chrono(reste)}</span>
      </>
    )}>
      <div className="qn-tete">
        <span className="qn-tete-titre">Contrôle blanc · {titre}</span>
        <span className="qn-tete-compte" aria-live="polite">Question {idx + 1} sur {questions.length}</span>
      </div>
      <div className="qn-question-carte">
        <h1 className="qz-question">{nbsp(q.question)}</h1>
      </div>
      <div className="qz-choix" role="radiogroup" aria-label="Réponses">
        {q.choices.map((c, i) => (
          <button key={i} type="button" role="radio" aria-checked={reponses[idx] === i}
            className={`qz-choix-btn${reponses[idx] === i ? ' is-choisi' : ''}`} onClick={() => choisir(i)}>
            <span className="qz-lettre" aria-hidden="true">{LETTRES[i]}</span>
            <span className="qz-choix-txt">{nbsp(c)}</span>
          </button>
        ))}
      </div>
      <nav className="cb-points" aria-label="Questions du contrôle">
        {questions.map((_, i) => (
          <button key={i} type="button" className={`cb-point${i === idx ? ' is-ici' : ''}${reponses[i] !== null ? ' is-repondu' : ''}`}
            onClick={() => setIdx(i)} aria-label={`Question ${i + 1}${reponses[i] !== null ? ', répondue' : ''}`} aria-current={i === idx ? 'step' : undefined}>
            {i + 1}
          </button>
        ))}
      </nav>
      <div className="cb-nav">
        <button type="button" className="cb-btn cb-btn--second" onClick={() => setIdx(k => k - 1)} disabled={idx === 0}><Fleche sens="g" />Précédente</button>
        {derniere
          ? <button type="button" className="cb-btn" onClick={rendre}>Rendre ma copie</button>
          : <button type="button" className="cb-btn" onClick={() => setIdx(k => k + 1)}>Suivante<Fleche /></button>}
      </div>
      {derniere && nbRepondues < questions.length && (
        <p className="cb-note-bas">{questions.length - nbRepondues > 1
          ? `${questions.length - nbRepondues} questions sans réponse : elles compteront comme fausses.`
          : '1 question sans réponse : elle comptera comme fausse.'}</p>
      )}
    </Cadre>
  );
}
