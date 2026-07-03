import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from './PageHeader';
import { Mascot } from './Mascot';

/**
 * État vide des pages de format (Flashcards, Quiz, Résumé, Carte mentale)
 * quand aucune leçon n'est chargée (reviz-ai-data absent ou corrompu).
 * Remplace l'ancien repli silencieux sur le mock « Pythagore », trompeur
 * car affiché avec le badge « Généré par IA ».
 */
export function MissingLessonState({ title }) {
  const navigate = useNavigate();
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
            Scanne une leçon pour générer tes supports de révision.
          </p>
          <Link className="rv-btn-cta" to="/scan">
            <span>📸 Scanner une leçon</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
