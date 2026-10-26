import { useNavigate } from 'react-router-dom';
import { PageEtat } from './reviz/PageEtat';

/**
 * Écran affiché en mode essai à la place d'une fonction qui demande un
 * compte (scan, Réviz IA) : les deux passent par des API authentifiées.
 * @param {string} props.action  ce que le compte débloque (« scanner tes leçons »)
 * @param {string} [props.text]  phrase d'explication
 */
export function GuestWall({ action, text }) {
  const navigate = useNavigate();
  return (
    <PageEtat
      teinte="peche"
      sur="Mode essai"
      titre={`Crée ton compte pour ${action}`}
      texte={text ?? "C'est gratuit, et tout ce que tu as révisé en mode essai te suit."}
      expression="content"
      onRetour={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
      actions={[
        { label: 'Créer mon compte gratuit', to: '/inscription' },
        { label: 'Réviser mon programme', to: '/programme' },
      ]}
    />
  );
}
