import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

function firebaseErrorFr(code) {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Mot de passe incorrect.';
    case 'auth/invalid-email':      return 'Adresse email invalide.';
    case 'auth/email-already-in-use': return 'Cet email est déjà utilisé.';
    case 'auth/weak-password':      return 'Mot de passe trop court (6 caractères min).';
    case 'auth/too-many-requests':  return 'Trop de tentatives. Réessaie plus tard.';
    default:                        return 'Une erreur est survenue. Réessaie.';
  }
}

export function Drawer({ isOpen, onClose }) {
  const { isDark, toggleTheme } = useTheme();
  const { currentUser, logout, getUserClasse, updateDisplayName, updateUserEmail, updateUserPassword } = useAuth();
  const navigate = useNavigate();

  const prenom   = currentUser?.displayName ?? '';
  const initiale = prenom[0]?.toUpperCase() ?? '?';
  const classe   = getUserClasse();

  // Panneau actif : null | 'profil' | 'email' | 'password'
  const [activePanel, setActivePanel] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');

  // Champs profil
  const [newPrenom, setNewPrenom] = useState('');
  const [newClasse, setNewClasse] = useState('');

  // Champs email
  const [newEmail, setNewEmail]         = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  // Champs mot de passe
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');

  function openPanel(panel) {
    setActivePanel(panel);
    setError('');
    setSuccess('');
    if (panel === 'profil') { setNewPrenom(prenom); setNewClasse(classe); }
    if (panel === 'email')    { setNewEmail(''); setEmailPassword(''); }
    if (panel === 'password') { setCurrentPassword(''); setNewPassword(''); }
  }

  function closePanel() { setActivePanel(null); setError(''); setSuccess(''); }

  async function handleSaveProfil(e) {
    e.preventDefault();
    if (!newPrenom.trim()) return;
    setLoading(true); setError('');
    try {
      await updateDisplayName(newPrenom.trim());
      if (newClasse.trim()) {
        localStorage.setItem(`reviz-classe-${currentUser.uid}`, newClasse.trim());
      }
      setSuccess('Profil mis à jour !');
    } catch (err) {
      setError(firebaseErrorFr(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEmail(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await updateUserEmail(newEmail.trim(), emailPassword);
      setSuccess('Email mis à jour !');
    } catch (err) {
      setError(firebaseErrorFr(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePassword(e) {
    e.preventDefault();
    if (newPassword.length < 6) { setError('Mot de passe trop court (6 caractères min).'); return; }
    setLoading(true); setError('');
    try {
      await updateUserPassword(currentPassword, newPassword);
      setSuccess('Mot de passe mis à jour !');
    } catch (err) {
      setError(firebaseErrorFr(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    onClose();
    await logout();
    navigate('/welcome');
  }

  return (
    <>
      <div
        className={`drawer-overlay${isOpen ? ' open' : ''}`}
        onClick={onClose}
      />
      <div className={`drawer${isOpen ? ' open' : ''}`}>
        {/* Header profil */}
        <div className="drawer-header">
          <div className="drawer-avatar">{initiale}</div>
          <div>
            <div className="drawer-name">{prenom || 'Mon profil'}</div>
            {classe && <div className="drawer-sub">{classe}</div>}
            <div className="drawer-sub">{currentUser?.email}</div>
          </div>
        </div>

        {/* Compte */}
        <div className="drawer-section-label">COMPTE</div>
        <div>
          {/* Modifier le profil */}
          <div className="drawer-item" onClick={() => activePanel === 'profil' ? closePanel() : openPanel('profil')} style={{ cursor: 'pointer' }}>
            <span className="drawer-item-icon">👤</span>
            <span className="drawer-item-label">Modifier le profil</span>
            <span className="drawer-item-arrow">{activePanel === 'profil' ? '∨' : '›'}</span>
          </div>
          {activePanel === 'profil' && (
            <form className="drawer-panel" onSubmit={handleSaveProfil}>
              <input className="drawer-panel-input" placeholder="Prénom" value={newPrenom} onChange={e => setNewPrenom(e.target.value)} autoFocus />
              <input className="drawer-panel-input" placeholder="Classe (ex: 4ème)" value={newClasse} onChange={e => setNewClasse(e.target.value)} />
              {error   && <p className="drawer-panel-error">{error}</p>}
              {success && <p className="drawer-panel-success">{success}</p>}
              <button className="drawer-panel-btn" type="submit" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
            </form>
          )}

          {/* Modifier l'e-mail */}
          <div className="drawer-item" onClick={() => activePanel === 'email' ? closePanel() : openPanel('email')} style={{ cursor: 'pointer' }}>
            <span className="drawer-item-icon">✉️</span>
            <span className="drawer-item-label">Modifier l'e-mail</span>
            <span className="drawer-item-arrow">{activePanel === 'email' ? '∨' : '›'}</span>
          </div>
          {activePanel === 'email' && (
            <form className="drawer-panel" onSubmit={handleSaveEmail}>
              <input className="drawer-panel-input" type="email" placeholder="Nouvel email" value={newEmail} onChange={e => setNewEmail(e.target.value)} autoFocus />
              <input className="drawer-panel-input" type="password" placeholder="Mot de passe actuel" value={emailPassword} onChange={e => setEmailPassword(e.target.value)} />
              {error   && <p className="drawer-panel-error">{error}</p>}
              {success && <p className="drawer-panel-success">{success}</p>}
              <button className="drawer-panel-btn" type="submit" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
            </form>
          )}

          {/* Modifier le mot de passe */}
          <div className="drawer-item" onClick={() => activePanel === 'password' ? closePanel() : openPanel('password')} style={{ cursor: 'pointer' }}>
            <span className="drawer-item-icon">🔑</span>
            <span className="drawer-item-label">Mot de passe</span>
            <span className="drawer-item-arrow">{activePanel === 'password' ? '∨' : '›'}</span>
          </div>
          {activePanel === 'password' && (
            <form className="drawer-panel" onSubmit={handleSavePassword}>
              <input className="drawer-panel-input" type="password" placeholder="Mot de passe actuel" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoFocus />
              <input className="drawer-panel-input" type="password" placeholder="Nouveau mot de passe" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              {error   && <p className="drawer-panel-error">{error}</p>}
              {success && <p className="drawer-panel-success">{success}</p>}
              <button className="drawer-panel-btn" type="submit" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
            </form>
          )}
        </div>

        {/* Notifications */}
        <div className="drawer-section-label">NOTIFICATIONS</div>
        <div>
          <div className="drawer-toggle-row">
            <span className="drawer-toggle-icon">🔔</span>
            <span className="drawer-toggle-label">Rappels de révision</span>
            <label className="toggle-wrap">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="drawer-toggle-row">
            <span className="drawer-toggle-icon">🏆</span>
            <span className="drawer-toggle-label">Résultats de quiz</span>
            <label className="toggle-wrap">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {/* Apparence */}
        <div className="drawer-section-label">APPARENCE</div>
        <div className="drawer-toggle-row">
          <span className="drawer-toggle-icon">🌙</span>
          <span className="drawer-toggle-label">Mode sombre</span>
          <label className="toggle-wrap">
            <input
              type="checkbox"
              checked={isDark}
              onChange={toggleTheme}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        {/* Abonnement */}
        <div className="drawer-section-label">ABONNEMENT</div>
        <div>
          <div className="drawer-item">
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                PLAN ACTUEL · GRATUIT
              </div>
              <span className="premium-chip">✨ Passer à Premium</span>
            </div>
            <span className="drawer-item-arrow">›</span>
          </div>
        </div>

        {/* Informations */}
        <div className="drawer-section-label">INFORMATIONS</div>
        <div>
          <div className="drawer-item" onClick={() => activePanel === 'apropos' ? closePanel() : openPanel('apropos')} style={{ cursor: 'pointer' }}>
            <span className="drawer-item-icon">ℹ️</span>
            <span className="drawer-item-label">À propos</span>
            <span className="drawer-item-arrow">{activePanel === 'apropos' ? '∨' : '›'}</span>
          </div>
          {activePanel === 'apropos' && (
            <div className="drawer-info-panel">
              <div className="drawer-info-logo">réviz ✦</div>
              <p>Réviz t'aide à mieux retenir tes leçons grâce à l'IA. Scanne une leçon et choisis ton format : flashcards, quiz, résumé ou carte mentale.</p>
              <p className="drawer-info-version">Version 1.0.0</p>
            </div>
          )}

          <Link to="/legal/mentions-legales" className="drawer-item" onClick={onClose} style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
            <span className="drawer-item-icon">⚖️</span>
            <span className="drawer-item-label">Mentions légales</span>
            <span className="drawer-item-arrow">›</span>
          </Link>

          <Link to="/legal/confidentialite" className="drawer-item" onClick={onClose} style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
            <span className="drawer-item-icon">📄</span>
            <span className="drawer-item-label">Confidentialité</span>
            <span className="drawer-item-arrow">›</span>
          </Link>

          <Link to="/legal/cgu" className="drawer-item" onClick={onClose} style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
            <span className="drawer-item-icon">📋</span>
            <span className="drawer-item-label">CGU</span>
            <span className="drawer-item-arrow">›</span>
          </Link>
        </div>

        {/* Déconnexion */}
        <div className="drawer-logout" onClick={handleLogout}>
          <span className="drawer-item-icon">🚪</span>
          <span className="drawer-logout-label">Se déconnecter</span>
          <span className="drawer-item-arrow">›</span>
        </div>
      </div>
    </>
  )
}
