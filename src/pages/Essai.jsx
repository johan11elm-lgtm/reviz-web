import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { PageIntro } from '../components/PageIntro';
import { Mascot } from '../components/Mascot';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { CYCLES, CLASSES_BY_CYCLE } from '../utils/levels';
import { CLASSES_DECOUVERTE, startDecouverte, stopDecouverte } from '../services/decouverteService';
import { loadCatalogue, openChapter } from '../services/programmeService';
import './Inscription.css'; // auth-desk : même composition que la connexion
import './Essai.css';

/**
 * Mode essai (« sans compte ») : prénom + classe, et l'élève révise son
 * programme tout de suite. Pensé pour le CDI : un poste partagé, pas de
 * cahier, pas d'adresse mail sous la main. La progression reste dans le
 * navigateur et suit l'élève s'il crée un compte plus tard.
 */
export default function Essai() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { loginAsGuest, currentUser, isGuest } = useAuth();
  // Enseignant arrivé par /profs (affiche) : la classe est déjà choisie,
  // on ouvre directement son programme en mode découverte, sans formulaire.
  const classeProf = params.get('prof') && CLASSES_DECOUVERTE.includes(params.get('classe'))
    ? params.get('classe') : null;
  // Élève arrivé depuis une fiche publique de la landing (`?classe=3ème&matiere=maths`) :
  // sa classe est déjà cochée et, après le prénom, on ouvre directement la matière.
  const classeFiche = !classeProf && CLASSES_BY_CYCLE.college.includes(params.get('classe'))
    ? params.get('classe') : null;
  const matiereFiche = /^[a-z0-9-]{1,40}$/.test(params.get('matiere') ?? '') ? params.get('matiere') : null;
  // … et avec le chapitre de la fiche (`&chapitre=angles-et-triangles`), le prénom
  // suffit : on ouvre directement le quiz de ce chapitre.
  const chapitreFiche = classeFiche && matiereFiche && /^[a-z0-9-]{1,80}$/.test(params.get('chapitre') ?? '')
    ? params.get('chapitre') : null;
  // undefined : catalogue en cours de lecture ; null : chapitre introuvable.
  const [chapitre, setChapitre] = useState(chapitreFiche ? undefined : null);
  const [ouverture, setOuverture] = useState(false);
  const ouvert = useRef(false);
  const [prenom, setPrenom] = useState('');
  const [cycle, setCycle] = useState('college');
  const [classe, setClasse] = useState(classeFiche);
  const [error, setError] = useState('');
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!chapitreFiche) return;
    let alive = true;
    loadCatalogue(classeFiche)
      .then(c => {
        const m = c.matieres.find(x => x.slug === matiereFiche);
        const ch = m?.chapitres.find(x => x.id === chapitreFiche && x.pret);
        if (alive) setChapitre(ch ? { matiere: m.matiere, ch } : null);
      })
      .catch(() => { if (alive) setChapitre(null); });
    return () => { alive = false; };
  }, [chapitreFiche, classeFiche, matiereFiche]);

  // Charge le chapitre comme le fait Mon programme, puis lance le quiz.
  // En cas d'échec (réseau), la liste des chapitres de la matière.
  function ouvrirChapitre() {
    if (ouvert.current) return;
    ouvert.current = true;
    setOuverture(true);
    openChapter(classeFiche, chapitre.matiere, chapitre.ch)
      .then(() => navigate('/quiz', { replace: true }))
      .catch(() => navigate(`/programme?matiere=${matiereFiche}`, { replace: true }));
  }

  // Déjà connecté (compte, ou essai déjà commencé) et venu d'une fiche : le
  // quiz du chapitre directement. Un vrai compte sans chapitre : l'accueil.
  useEffect(() => {
    if (!currentUser || ouvert.current) return;
    if (chapitreFiche && chapitre === undefined) return;
    if (chapitre) ouvrirChapitre();
    else if (!isGuest) navigate('/', { replace: true });
    // ouvrirChapitre ne dépend que de ces valeurs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isGuest, chapitre, chapitreFiche, navigate]);

  useEffect(() => {
    if (!classeProf || (currentUser && !isGuest)) return;
    startDecouverte();
    loginAsGuest({ prenom: 'Prof', level: { cycle: 'college', classe: classeProf, specialites: [] } });
    navigate('/programme', { replace: true });
    // Une seule fois, à l'arrivée sur la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(e) {
    e.preventDefault();
    const p = prenom.trim();
    if (!p) { setError('Entre ton prénom.'); return; }
    if (!classe) { setError('Choisis ta classe.'); return; }
    stopDecouverte();
    loginAsGuest({ prenom: p, level: { cycle, classe, specialites: [] } });
    if (chapitre && classe === classeFiche) ouvrirChapitre();
    else navigate(matiereFiche ? `/programme?matiere=${matiereFiche}` : '/programme', { replace: true });
  }

  // Redirection automatique en cours ou à venir (effet ci-dessus) : rien à remplir.
  const redirige = currentUser && !prenom && ((chapitreFiche && chapitre !== null) || !isGuest);
  if (classeProf || redirige) return <div className="app essai-page" />;

  // Venu d'une fiche avec un chapitre trouvé : seulement le prénom, la classe est connue.
  const quiz = chapitre ? chapitre.ch : null;
  const titre = quiz ? 'Teste-toi sur ce chapitre' : 'Essayer sans compte';

  const champs = (
    <>
      <label className="essai-label" htmlFor="essai-prenom">Ton prénom</label>
      <input
        id="essai-prenom"
        className="essai-input"
        type="text"
        value={prenom}
        onChange={e => { setPrenom(e.target.value); setError(''); }}
        placeholder="Lucas"
        maxLength={30}
        autoComplete="given-name"
        autoFocus
      />

      {!quiz && <>
      <div className="essai-label" id="essai-classe-label">Ta classe</div>
      <div className="essai-cycles" role="tablist" aria-label="Collège ou lycée">
        {/* Mon programme ne couvre que la 6e à la 3e : le lycée est annoncé, pas encore ouvert. */}
        {CYCLES.map(c => {
          const bientot = c.id === 'lycee';
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={cycle === c.id}
              disabled={bientot}
              className={`essai-cycle${cycle === c.id ? ' essai-cycle--active' : ''}${bientot ? ' essai-cycle--bientot' : ''}`}
              onClick={() => { setCycle(c.id); setClasse(null); setError(''); }}
            >
              {c.label}
              {bientot && <span className="essai-cycle-bientot">à venir</span>}
            </button>
          );
        })}
      </div>
      <div className="essai-classes" role="group" aria-labelledby="essai-classe-label">
        {CLASSES_BY_CYCLE[cycle].map(k => (
          <button
            key={k}
            type="button"
            aria-pressed={classe === k}
            className={`essai-classe${classe === k ? ' essai-classe--active' : ''}`}
            onClick={() => { setClasse(k); setError(''); }}
          >
            {k}
          </button>
        ))}
      </div>
      </>}

      {error && <p className="essai-error" role="alert">{error}</p>}

      <button type="submit" className="rv-btn-cta rv-btn-cta--full essai-submit" disabled={ouverture}>
        <span>{ouverture ? 'Ouverture du quiz…' : quiz ? 'Lancer le quiz' : "C'est parti"}</span>
        <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
      </button>
      <p className="essai-hint">
        Ta progression reste sur cet appareil. Crée un compte quand tu veux pour la retrouver partout.
      </p>
      <Link to="/inscription" className="essai-link">Je préfère créer mon compte</Link>
    </>
  );

  // Ordinateur : la même composition que la connexion (auth-desk, desktop.css).
  if (isDesktop) {
    return (
      <div className="app essai-page auth-desk-page">
        <div className="auth-desk">
          <div className="auth-desk-intro">
            <Link to="/welcome" className="auth-back" aria-label="Retour">←</Link>
            <span className="auth-desk-mascot"><Mascot pose="hello" size={132} alt="" aria-hidden="true" /></span>
            <h1 className="signup-question">{titre}</h1>
            <p className="signup-hint">
              {quiz
                ? <><strong>{quiz.titre}</strong> ({classeFiche}) : {quiz.quiz} questions corrigées une à une. Ton prénom, et c'est parti.</>
                : 'Ton prénom, ta classe, et tu révises ton programme tout de suite.'}
            </p>
            <ul className="auth-desk-why">
              <li><strong>Tout le programme</strong> de ta classe, chapitre par chapitre : résumés, flashcards, quiz.</li>
              <li><strong>Pas d'adresse mail</strong> à donner : ta progression reste sur cet appareil.</li>
              <li>Tu crées un compte <strong>quand tu veux</strong>, et tu gardes ce que tu as déjà révisé.</li>
            </ul>
          </div>
          <form className="auth-desk-card essai-carte" onSubmit={submit} noValidate>
            {champs}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app essai-page">
      <PageHeader variant="back" onBack={() => navigate('/welcome')} />
      <PageIntro
        title={titre}
        sub={quiz
          ? `${quiz.titre} (${classeFiche}) : ${quiz.quiz} questions corrigées une à une.`
          : 'Ton prénom, ta classe, et tu révises ton programme.'}
        mascot="hello"
        mascotSize={140}
      />

      <form className="content essai-content" onSubmit={submit} noValidate>
        {champs}
      </form>
    </div>
  );
}
