import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Pantin } from '../components/Pantin';
import { InstallerGuide, CarteEtat, INTRO_INSTALLER } from '../components/InstallerApp';
import { CheckIcon } from '../components/Icons';
import { useInstallation } from '../hooks/useInstallation';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { track } from '../services/statsService';
import '../components/reviz/HerosMatiere.css';
import './Installer.css';

/**
 * Page publique du tutoriel d'installation (app.revizapp.fr/installer) :
 * le lien à donner depuis la landing, TikTok ou une affiche, tant que
 * Réviz n'est pas sur les stores. Sans Firebase côté client.
 * Handoff Claude Design du 22/10 : héros menthe à grain, Réviz à droite du titre,
 * puis le même contenu que la popup (sans « Fermer »).
 */
export default function Installer() {
  const { plateforme, installee } = useInstallation();
  const isDesktop = useIsDesktop();
  const pantin = useRef(null);
  useEffect(() => { track('installer_ouvert', { plateforme }); }, [plateforme]);

  return (
    <div className={`app app--no-halo app--large inst-page${isDesktop ? ' inst-page--large' : ''}`}>
      <div className="inst-page-defile">
        <header className="inst-hero">
          <div className="inst-hero-fond" aria-hidden="true">
            <span className="inst-hero-bulle" />
            <span className="inst-hero-point" />
            <span className="ch-grain" />
          </div>
          <Link to="/" className="inst-page-logo" aria-label="Réviz, accueil">Réviz</Link>
          <div className="inst-hero-corps">
            <h1 className="inst-page-titre">Installer Réviz</h1>
            <p className="inst-page-sous">{INTRO_INSTALLER}</p>
            <div className="inst-page-reviz">
              <Pantin
                ref={pantin}
                size={isDesktop ? 340 : 150}
                expression="content"
                entree={installee ? 'saut' : 'coucou'}
                repli={null}
                label="Réviz, ta mascotte"
                onClick={() => pantin.current?.geste('coucou')}
              />
            </div>
          </div>
        </header>

        <main className="inst-page-main">
          <section className="inst-page-carte" aria-label={installee ? 'Réviz est installée' : "Étapes d'installation"}>
            {installee ? (
              <div className="inst-page-deja">
                <CarteEtat teinte="menthe" rond={<CheckIcon />}>
                  <p className="inst-etat-phrase">
                    Réviz est déjà installée sur cet appareil : <span className="inst-etat-vert">tu l'utilises en ce moment.</span>
                  </p>
                </CarteEtat>
                <Link to="/" className="inst-btn">Ouvrir Réviz</Link>
              </div>
            ) : (
              <InstallerGuide />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
