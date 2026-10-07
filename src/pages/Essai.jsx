import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { PageIntro } from '../components/PageIntro';
import { CYCLES, CLASSES_BY_CYCLE } from '../utils/levels';
import { CLASSES_DECOUVERTE, startDecouverte, stopDecouverte } from '../services/decouverteService';
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
  const [prenom, setPrenom] = useState('');
  const [cycle, setCycle] = useState('college');
  const [classe, setClasse] = useState(null);
  const [error, setError] = useState('');

  // Déjà connecté avec un vrai compte : rien à essayer, direction l'accueil.
  useEffect(() => {
    if (currentUser && !isGuest) navigate('/', { replace: true });
  }, [currentUser, isGuest, navigate]);

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
    navigate('/programme', { replace: true });
  }

  if (classeProf) return <div className="app essai-page" />;

  return (
    <div className="app essai-page">
      <PageHeader variant="back" onBack={() => navigate('/welcome')} />
      <PageIntro
        title="Essayer sans compte"
        sub="Ton prénom, ta classe, et tu révises ton programme."
        mascot="hello"
        mascotSize={140}
      />

      <form className="content essai-content" onSubmit={submit} noValidate>
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

        {error && <p className="essai-error" role="alert">{error}</p>}

        <button type="submit" className="rv-btn-cta rv-btn-cta--full essai-submit">
          <span>C'est parti</span>
          <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
        </button>
        <p className="essai-hint">
          Ta progression reste sur cet appareil. Crée un compte quand tu veux pour la retrouver partout.
        </p>
        <Link to="/inscription" className="essai-link">Je préfère créer mon compte</Link>
      </form>
    </div>
  );
}
