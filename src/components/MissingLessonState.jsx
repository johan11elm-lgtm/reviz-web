import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from './PageHeader';
import { Mascot } from './Mascot';
import { useAuth } from '../context/AuthContext';

/**
 * État vide des pages de format (Flashcards, Quiz, Résumé, Carte mentale)
 * quand aucune leçon n'est chargée (reviz-ai-data absent ou corrompu).
 * Remplace l'ancien repli silencieux sur le mock « Pythagore », trompeur
 * car affiché avec le badge « Généré par IA ».
 */
export function MissingLessonState({ title }) {
  const navigate = useNavigate();
  const isGuest = !!useAuth()?.isGuest;
  return (
    <div className="app">
      <PageHeader variant="back" title={title} onBack={() => navigate('/')} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="rv-empty-state">
          <Mascot
            pose="search"
            size={140}
            className="rv-empty-state-mascot"
            alt=""
            aria-hidden="true"
          />
          <h2 className="rv-empty-state-title">Aucune leçon chargée</h2>
          <p className="rv-empty-state-sub">
            {isGuest
              ? 'Ouvre un chapitre de ton programme pour réviser.'
              : 'Scanne une leçon ou ouvre un chapitre de ton programme.'}
          </p>
          {!isGuest && (
            <Link className="rv-btn-cta" to="/scan">
              <span>Scanner une leçon</span>
            </Link>
          )}
          <Link className={`rv-btn-cta${isGuest ? '' : ' rv-btn-cta--ghost'}`} to="/programme" style={{ marginTop: isGuest ? 0 : 10 }}>
            <span>Réviser mon programme</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
