import { useLocation, useNavigate } from 'react-router-dom';
import { EntreeEcran, LienTexte } from '../components/entree/Entree';
import { CarteEmail } from '../components/CarteEmail';

// Ce que dit Réviz selon ce qui a demandé l'e-mail (state.raison, posé par la page d'avant).
const BULLES = {
  revizplus: ['Vérifie ton e-mail.', 'Ensuite, tu peux prendre Réviz+.'],
  scan: ['Vérifie ton e-mail.', 'Ensuite, tu scannes toutes tes leçons.'],
};

// Vérifie ton e-mail (handoff Claude Design du 22/10, écran 7) : demandé avant de prendre Réviz+, et
// depuis le rappel de l'accueil. Le contenu est la carte d'activation (adresse, messagerie, renvoi,
// correction). « Plus tard » comme la réussite ramènent à la page d'où l'élève vient.
export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const raison = location.state?.raison;

  // Retour à la page précédente (Réviz+, réglages, accueil) ; arrivée directe → accueil.
  function revenir() {
    if (location.key !== 'default') navigate(-1);
    else navigate('/', { replace: true });
  }

  return (
    <EntreeEcran
      bulle={BULLES[raison] ?? ['Vérifie ton e-mail.', 'Un clic sur le lien reçu, et c’est bon.']}
      expression="determine"
      dessous={<LienTexte onClick={revenir}>Plus tard</LienTexte>}
    >
      <CarteEmail raison={raison === 'revizplus' || raison === 'scan' ? raison : 'general'} nu onConfirme={revenir} />
    </EntreeEcran>
  );
}
