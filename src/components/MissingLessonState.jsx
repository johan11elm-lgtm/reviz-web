import { useNavigate } from 'react-router-dom';
import { PageEtat } from './reviz/PageEtat';
import { useAuth } from '../context/AuthContext';

/**
 * État vide des pages de format (Flashcards, Quiz, Résumé, Carte mentale, Analyse)
 * quand aucune leçon n'est chargée (reviz-ai-data absent ou corrompu).
 * Remplace l'ancien repli silencieux sur le mock « Pythagore », trompeur
 * car affiché avec le badge « Généré par IA ».
 */
export function MissingLessonState({ title }) {
  const navigate = useNavigate();
  const isGuest = !!useAuth()?.isGuest;
  const programme = { label: 'Réviser mon programme', to: '/programme' };
  return (
    <PageEtat
      sur={title}
      titre="Aucune leçon chargée"
      texte={isGuest
        ? 'Ouvre un chapitre de ton programme pour réviser.'
        : 'Scanne une leçon ou ouvre un chapitre de ton programme.'}
      expression="surpris"
      onRetour={() => navigate('/')}
      actions={isGuest ? [programme] : [{ label: 'Scanner une leçon', to: '/scan' }, programme]}
    />
  );
}
