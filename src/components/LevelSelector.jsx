import {
  CYCLES,
  CLASSES_BY_CYCLE,
  SPECIALITES_LYCEE,
  FILIERES_SUP,
  needsSpecialites,
  needsFiliere,
} from '../utils/levels';
import './LevelSelector.css';

export function LevelSelector({ value, onChange, compact = false }) {
  const level = value || { cycle: null, classe: null, specialites: [], filiere: null };

  function setCycle(cycle) {
    onChange({ cycle, classe: null, specialites: [], filiere: null });
  }

  function setClasse(classe) {
    onChange({ ...level, classe, specialites: [], filiere: null });
  }

  function toggleSpecialite(spec) {
    const current = level.specialites ?? [];
    const next = current.includes(spec)
      ? current.filter(s => s !== spec)
      : [...current, spec];
    onChange({ ...level, specialites: next });
  }

  function setFiliere(filiere) {
    onChange({ ...level, filiere });
  }

  return (
    <div className={`level-selector${compact ? ' level-selector--compact' : ''}`}>
      {/* Étape 1 : cycle */}
      <div className="level-section">
        <div className="level-section-label">Cycle</div>
        <div className="level-cycle-grid">
          {CYCLES.map(c => (
            <button
              type="button"
              key={c.id}
              className={`level-cycle-btn${level.cycle === c.id ? ' active' : ''}`}
              onClick={() => setCycle(c.id)}
            >
              <span className="level-cycle-emoji">{c.emoji}</span>
              <span className="level-cycle-label">{c.label}</span>
              {!compact && <span className="level-cycle-desc">{c.desc}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Étape 2 : classe */}
      {level.cycle && (
        <div className="level-section">
          <div className="level-section-label">Classe</div>
          <div className="level-classe-grid">
            {CLASSES_BY_CYCLE[level.cycle].map(c => (
              <button
                type="button"
                key={c}
                className={`level-classe-btn${level.classe === c ? ' active' : ''}`}
                onClick={() => setClasse(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Étape 3a : spécialités lycée */}
      {needsSpecialites(level) && (
        <div className="level-section">
          <div className="level-section-label">
            Spécialités <span className="level-section-hint">(plusieurs possibles)</span>
          </div>
          <div className="level-chips-grid">
            {SPECIALITES_LYCEE.map(s => {
              const active = level.specialites?.includes(s);
              return (
                <button
                  type="button"
                  key={s}
                  className={`level-chip${active ? ' active' : ''}`}
                  onClick={() => toggleSpecialite(s)}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Étape 3b : filière supérieur */}
      {needsFiliere(level) && (
        <div className="level-section">
          <div className="level-section-label">Filière</div>
          <div className="level-chips-grid">
            {FILIERES_SUP.map(f => (
              <button
                type="button"
                key={f}
                className={`level-chip${level.filiere === f ? ' active' : ''}`}
                onClick={() => setFiliere(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
