import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLigue } from '../hooks/useLigue';
import { NOMS_LIGUES } from '../utils/ligue';
import { nbsp } from '../utils/typography';
import './LigneLigue.css';

/** « montée à 2 places », « en zone de montée », « Zone de descente » : la place, en bref. */
function enBref({ rang, zones, ligue }) {
  if (zones?.montee && rang <= zones.montee) return 'en zone de montée';
  if (zones?.descente && rang >= zones.descente) return 'zone de descente';
  if (zones?.montee) { const n = rang - zones.montee; return n === 1 ? 'montée à 1 place' : `montée à ${n} places`; }
  return ligue === 'or' ? 'la meilleure ligue' : '';
}

/**
 * Accueil (11/11) : la ligue de la semaine en une ligne (« Ligue Bronze · 5e sur 9 · montée à
 * 2 places »), qui mène à « Moi ». Rien tant que l'élève n'y est pas entré, ni s'il s'en
 * est retiré. Avec un compte seulement.
 */
export function LigneLigue() {
  const { currentUser, isGuest } = useAuth() ?? {};
  const [etat] = useLigue(currentUser?.uid, { actif: !isGuest });
  if (isGuest || !etat.ligue) return null;
  const bref = enBref(etat);
  return (
    <Link to="/profil" className={`ll ll--${etat.ligue}`} aria-label={`Ta ligue ${NOMS_LIGUES[etat.ligue]} : ${etat.rang}e sur ${etat.total}${bref ? `, ${bref}` : ''}. Voir le classement`}>
      <span className="ll-point" aria-hidden="true" />
      <b>{`Ligue ${NOMS_LIGUES[etat.ligue]}`}</b>
      <span>{nbsp(` · ${etat.rang}e sur ${etat.total}${bref ? ` · ${bref}` : ''}`)}</span>
    </Link>
  );
}
