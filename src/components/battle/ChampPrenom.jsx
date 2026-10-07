import { PRENOM_MAX } from '../../utils/battle';

/** Prénom de l'élève qui joue sans compte : c'est ce que verra son adversaire. */
export function ChampPrenom({ valeur, onChange }) {
  return (
    <label className="battle-prenom">
      <span className="battle-prenom-label">Ton prénom</span>
      <input
        className="battle-prenom-input"
        value={valeur}
        onChange={e => onChange(e.target.value.slice(0, PRENOM_MAX))}
        placeholder="Lucas"
        autoComplete="given-name"
        maxLength={PRENOM_MAX}
      />
      <span className="battle-prenom-aide">Pas besoin de compte. Ton adversaire verra seulement ce prénom.</span>
    </label>
  );
}
