import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mascot } from '../components/Mascot';
import { InstallerGuide } from '../components/InstallerApp';
import { useInstallation } from '../hooks/useInstallation';
import { track } from '../services/statsService';
import './Installer.css';

/**
 * Page publique du tutoriel d'installation (app.revizapp.fr/installer) :
 * le lien à donner depuis la landing, TikTok ou une affiche, tant que
 * Réviz n'est pas sur les stores. Sans Firebase côté client.
 */
export default function Installer() {
  const { plateforme, installee } = useInstallation();
  useEffect(() => { track('installer_ouvert', { plateforme }); }, [plateforme]);

  return (
    <div className="app inst-page">
      <nav className="inst-page-nav" aria-label="Navigation">
        <Link to="/" className="inst-page-logo" aria-label="Réviz, accueil">
          <Mascot pose="hello" size={28} priority alt="" aria-hidden="true" />
          <span>réviz</span>
        </Link>
      </nav>

      <div className="inst-page-scroll">
        <main className="inst-page-main">
          <div className="rv-page-intro inst-page-intro">
            <div className="rv-page-intro-text">
              <h1 className="rv-greeting-title rv-page-intro-title">Installer Réviz</h1>
              <p className="rv-greeting-sub rv-page-intro-sub">
                Réviz n'est pas encore sur les stores : elle s'installe depuis ton navigateur,
                puis s'ouvre en plein écran depuis son icône.
              </p>
            </div>
            <Mascot pose="pointing" size={140} priority className="rv-page-intro-mascot" alt="" aria-hidden="true" />
          </div>

          <section className="rv-card inst-page-carte" aria-label="Étapes d'installation">
            {installee
              ? <p className="inst-page-deja">Réviz est déjà installée sur cet appareil : tu l'utilises en ce moment.</p>
              : <InstallerGuide />}
          </section>

          <div className="inst-page-actions">
            <Link to="/" className="rv-btn-cta rv-btn-cta--full">
              <span>Ouvrir Réviz</span>
              <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
