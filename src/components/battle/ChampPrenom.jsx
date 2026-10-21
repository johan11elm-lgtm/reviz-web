import { PRENOM_MAX } from '../../utils/battle';

/** Nom de l'élève qui joue sans compte (prénom ou surnom) : c'est ce que verra son adversaire. */
export function ChampPrenom({ valeur, onChange }) {
  return (
    <label className="bt-prenom">
      <span className="bt-prenom-label">Ton prénom</span>
      <input
        className="bt-prenom-input"
        value={valeur}
        onChange={e => onChange(e.target.value.slice(0, PRENOM_MAX))}
        placeholder="Léa"
        autoComplete="nickname"
        maxLength={PRENOM_MAX}
      />
      <span className="bt-prenom-aide">Tu joues sans compte. Ton aura s’affiche pendant la partie, mais n’est pas gardée.</span>
    </label>
  );
}
