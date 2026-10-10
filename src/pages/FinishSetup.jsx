import { Mascot } from '../components/Mascot';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CYCLES, CLASSES_BY_CYCLE, SPECIALITES_LYCEE, needsSpecialites } from '../utils/levels';
import { createUserProfile } from '../services/userProfileService';
import './Inscription.css';

// Écran de complétion de profil pour les nouveaux comptes sans mot de passe
// (Google, Apple, Microsoft, TikTok) : collecte date de naissance + niveau,
// et le prénom quand le fournisseur ne l'a pas transmis (Apple, e-mail masqué). Le gate redirige ensuite les <15 ans
// vers /consent-pending (consentement parental) automatiquement.
export default function FinishSetup() {
  const { currentUser, setUserLevel, refreshGate, updateDisplayName } = useAuth();
  const navigate = useNavigate();
  const [birthDate, setBirthDate] = useState('');
  const [prenomSaisi, setPrenomSaisi] = useState('');
  const [level, setLevel] = useState({ cycle: null, classe: null, specialites: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!currentUser) return <Navigate to="/welcome" replace />;

  const prenom = currentUser.displayName?.split(' ')[0] ?? '';
  const demanderPrenom = !currentUser.displayName;

  function pickCycle(cycleId) {
    setLevel({ cycle: cycleId, classe: null, specialites: [] });
    setError('');
  }
  function toggleSpec(spec) {
    setLevel(l => {
      const cur = l.specialites ?? [];
      return { ...l, specialites: cur.includes(spec) ? cur.filter(s => s !== spec) : [...cur, spec] };
    });
  }

  async function handleSubmit() {
    if (demanderPrenom && !prenomSaisi.trim()) return setError('Entre ton prénom.');
    if (!birthDate) return setError('Entre ta date de naissance.');
    const d = new Date(birthDate);
    if (isNaN(d.getTime()) || d > new Date()) return setError('Date invalide.');
    if (!level.cycle) return setError('Choisis ton cycle.');
    if (!level.classe) return setError('Choisis ta classe.');

    setLoading(true); setError('');
    try {
      if (demanderPrenom) await updateDisplayName(prenomSaisi.trim());
      await createUserProfile(currentUser.uid, {
        prenom: demanderPrenom ? prenomSaisi.trim() : currentUser.displayName ?? null,
        email: currentUser.email ?? null,
        birthDate,
        level,
      });
      setUserLevel(level);
      await refreshGate?.();
      // Le gate redirige les <15 ans vers /consent-pending automatiquement.
      navigate('/', { replace: true });
    } catch {
      setError('Une erreur est survenue. Réessaie.');
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <div className="auth-content signup-content" style={{ overflowY: 'auto' }}>
        <h1 className="signup-question">{prenom ? `Bienvenue ${prenom}` : 'Bienvenue'}</h1>
        <p className="signup-hint">Encore quelques infos pour calibrer Réviz à ton profil.</p>

        {demanderPrenom && (
          <div className="auth-field">
            <label className="auth-label" htmlFor="fs-prenom">Ton prénom</label>
            <input
              id="fs-prenom"
              className="auth-input"
              type="text"
              autoComplete="given-name"
              value={prenomSaisi}
              onChange={e => setPrenomSaisi(e.target.value)}
              maxLength={40}
            />
          </div>
        )}

        <div className="auth-field">
          <label className="auth-label" htmlFor="fs-birthdate">Ta date de naissance</label>
          <div className={`auth-date${birthDate ? '' : ' auth-date--empty'}`} data-placeholder="JJ / MM / AAAA">
            <input
              id="fs-birthdate"
              className="auth-input"
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <label className="auth-label" style={{ marginTop: 8 }}>Ton cycle</label>
        <div className="signup-card-stack">
          {CYCLES.map(c => (
            <button
              type="button"
              key={c.id}
              className={`signup-card${level.cycle === c.id ? ' active' : ''}`}
              onClick={() => pickCycle(c.id)}
            >
              <span className="signup-card-emoji"><Mascot pose={c.pose} size={40} alt="" aria-hidden="true" /></span>
              <span className="signup-card-body">
                <span className="signup-card-label">{c.label}</span>
                <span className="signup-card-desc">{c.desc}</span>
              </span>
            </button>
          ))}
        </div>

        {level.cycle && (
          <>
            <label className="auth-label" style={{ marginTop: 8 }}>Ta classe</label>
            <div className="signup-card-grid">
              {(CLASSES_BY_CYCLE[level.cycle] ?? []).map(c => (
                <button
                  type="button"
                  key={c}
                  className={`signup-card-sm${level.classe === c ? ' active' : ''}`}
                  onClick={() => { setLevel(l => ({ ...l, classe: c })); setError(''); }}
                >
                  {c}
                </button>
              ))}
            </div>
          </>
        )}

        {needsSpecialites(level) && (
          <>
            <label className="auth-label" style={{ marginTop: 8 }}>Tes spécialités</label>
            <div className="signup-chips">
              {SPECIALITES_LYCEE.map(s => (
                <button
                  type="button"
                  key={s}
                  className={`signup-chip${level.specialites?.includes(s) ? ' active' : ''}`}
                  onClick={() => toggleSpec(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="auth-error">{error}</p>
      </div>

      <div className="signup-footer">
        <button className="auth-btn signup-primary" type="button" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Enregistrement...' : 'Continuer'}
        </button>
      </div>
    </div>
  );
}
