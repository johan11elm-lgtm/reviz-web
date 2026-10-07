import { PRENOM_MAX } from '../../utils/battle';

/** Nom de l'élève qui joue sans compte (prénom ou surnom) : c'est ce que verra son adversaire. */
export function ChampPrenom({ valeur, onChange }) {
  return (
    <label className="battle-prenom">
      <span className="battle-prenom-label">Ton prénom ou un surnom</span>
      <input
        className="battle-prenom-input"
        value={valeur}
        onChange={e => onChange(e.target.value.slice(0, PRENOM_MAX))}
        placeholder="Lucas"
        autoComplete="nickname"
        maxLength={PRENOM_MAX}
      />
      <span className="battle-prenom-aide">Pas besoin de compte. Ton adversaire verra seulement ce nom.</span>
    </label>
  );
}
