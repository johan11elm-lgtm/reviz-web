import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { PageIntro } from '../components/PageIntro';
import { CYCLES, CLASSES_BY_CYCLE } from '../utils/levels';
import './Essai.css';

/**
 * Mode essai (« sans compte ») : prénom + classe, et l'élève révise son
 * programme tout de suite. Pensé pour le CDI : un poste partagé, pas de
 * cahier, pas d'adresse mail sous la main. La progression reste dans le
 * navigateur et suit l'élève s'il crée un compte plus tard.
 */
export default function Essai() {
  const navigate = useNavigate();
  const { loginAsGuest, currentUser, isGuest } = useAuth();
  const [prenom, setPrenom] = useState('');
  const [cycle, setCycle] = useState('college');
  const [classe, setClasse] = useState(null);
  const [error, setError] = useState('');

  // Déjà connecté avec un vrai compte : rien à essayer, direction l'accueil.
  useEffect(() => {
    if (currentUser && !isGuest) navigate('/', { replace: true });
  }, [currentUser, isGuest, navigate]);

  function submit(e) {
    e.preventDefault();
    const p = prenom.trim();
    if (!p) { setError('Entre ton prénom.'); return; }
    if (!classe) { setError('Choisis ta classe.'); return; }
    loginAsGuest({ prenom: p, level: { cycle, classe, specialites: [] } });
    navigate('/programme', { replace: true });
  }

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
          {CYCLES.map(c => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={cycle === c.id}
              className={`essai-cycle${cycle === c.id ? ' essai-cycle--active' : ''}`}
              onClick={() => { setCycle(c.id); setClasse(null); setError(''); }}
            >
              {c.label}
            </button>
          ))}
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
