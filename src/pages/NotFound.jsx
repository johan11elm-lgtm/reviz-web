import { PageEtat } from '../components/reviz/PageEtat';

/** Page introuvable (handoff Claude Design du 22/10) : héros lavande avec grain, Réviz inquiet. */
export default function NotFound() {
  return (
    <PageEtat
      className="pe-page--seule"
      sur="Erreur 404"
      titre="Page introuvable"
      texte="Cette page n'existe pas ou a changé d'adresse."
      expression="inquiet"
      actions={[{ label: "Retour à l'accueil", to: '/' }]}
    />
  );
}
