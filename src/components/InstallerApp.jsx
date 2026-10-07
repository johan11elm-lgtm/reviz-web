import { useEffect, useState } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';
import { useInstallation } from '../hooks/useInstallation';
import { installerDirectement } from '../utils/installation';
import { track } from '../services/statsService';
import { Mascot } from './Mascot';
import {
  ShareIcon, PlusSquareIcon, DotsVerticalIcon, DotsIcon, InstallIcon,
  PhoneIcon, MonitorIcon, ExternalIcon, CheckIcon,
} from './Icons';
import './InstallerApp.css';

/** Adresse à taper dans le navigateur, montrée telle quelle dans les étapes. */
const ADRESSE = 'app.revizapp.fr';

const ONGLETS = [
  { id: 'ios', label: 'iPhone, iPad', Icone: PhoneIcon },
  { id: 'android', label: 'Android', Icone: PhoneIcon },
  { id: 'ordinateur', label: 'Ordinateur', Icone: MonitorIcon },
];

/** Bouton du navigateur à toucher, dessiné comme à l'écran. */
const Touche = ({ Icone, children }) => (
  <span className="inst-touche">
    {Icone && <Icone />}
    {children && <span>{children}</span>}
  </span>
);

const ETAPES = {
  ios: [
    { titre: <>Ouvre <strong>{ADRESSE}</strong> dans Safari</>, detail: 'Chrome marche aussi sur un iPhone récent.' },
    { titre: <>Touche <Touche Icone={ShareIcon}>Partager</Touche></>, detail: <>En bas de l'écran sur iPhone, en haut sur iPad. Si tu ne le vois pas, touche d'abord <Touche Icone={DotsIcon} />.</> },
    { titre: <>Choisis <Touche Icone={PlusSquareIcon}>Sur l'écran d'accueil</Touche></>, detail: 'Fais défiler la liste si besoin.' },
    { titre: <>Touche <strong>Ajouter</strong></>, detail: "L'icône Réviz arrive sur ton écran d'accueil. Ouvre-la et connecte-toi une fois." },
  ],
  android: [
    { titre: <>Ouvre <strong>{ADRESSE}</strong> dans Chrome</>, detail: null },
    { titre: <>Touche <Touche Icone={DotsVerticalIcon} /> en haut à droite</>, detail: null },
    { titre: <>Choisis <strong>Installer l'application</strong></>, detail: "Selon ton téléphone : « Ajouter à l'écran d'accueil »." },
    { titre: <>Confirme avec <strong>Installer</strong></>, detail: 'Réviz rejoint tes autres applis.' },
  ],
  ordinateur: [
    { titre: <>Ouvre <strong>{ADRESSE}</strong> dans Chrome ou Edge</>, detail: null },
    { titre: <>Clique sur <Touche Icone={InstallIcon} /> au bout de la barre d'adresse</>, detail: <>Sinon, ouvre le menu <Touche Icone={DotsVerticalIcon} /> (Chrome) ou <Touche Icone={DotsIcon} /> (Edge) et cherche « Installer ».</> },
    { titre: <>Clique sur <strong>Installer</strong></>, detail: 'Réviz s’ouvre dans sa propre fenêtre et rejoint tes applications.' },
  ],
};

const NOTES = {
  ordinateur: 'Sur Mac avec Safari : menu Fichier, puis « Ajouter au Dock ».',
};

/**
 * Tutoriel d'installation (popup et page /installer) : l'onglet de
 * l'appareil de l'élève est ouvert d'office, et Chrome / Edge permettent
 * d'installer en un geste quand ils ont proposé l'installation.
 */
export function InstallerGuide() {
  const { plateforme, integre, directe } = useInstallation();
  const [onglet, setOnglet] = useState(plateforme);
  const [installee, setInstallee] = useState(false);

  const installer = async () => {
    if (await installerDirectement()) setInstallee(true);
  };

  // Le bouton direct n'a de sens que sur l'appareil qu'on est en train d'utiliser.
  const directIci = directe && onglet === plateforme && onglet !== 'ios';

  return (
    <div className="inst-guide">
      {integre && plateforme !== 'ordinateur' && (
        <p className="inst-alerte" role="note">
          <ExternalIcon />
          <span>
            Tu es dans le navigateur de {integre} : il ne peut pas installer d'app.
            Touche <Touche Icone={DotsIcon} /> puis « Ouvrir dans le navigateur », et reviens ici.
          </span>
        </p>
      )}

      <div className="inst-onglets" role="tablist" aria-label="Ton appareil">
        {ONGLETS.map(({ id, label, Icone }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`inst-onglet-${id}`}
            aria-selected={onglet === id}
            aria-controls="inst-etapes"
            className={`inst-onglet${onglet === id ? ' inst-onglet--actif' : ''}`}
            onClick={() => setOnglet(id)}
          >
            <Icone /> {label}
          </button>
        ))}
      </div>

      {installee ? (
        <p className="inst-fait" role="status"><CheckIcon /> Réviz est installée. Retrouve-la avec tes applis.</p>
      ) : directIci && (
        <div className="inst-direct">
          <button type="button" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--center" onClick={installer}>
            <InstallIcon />
            <span>Installer Réviz</span>
          </button>
          <p className="inst-direct-ou">ou à la main :</p>
        </div>
      )}

      <ol className="inst-etapes" id="inst-etapes" role="tabpanel" aria-labelledby={`inst-onglet-${onglet}`}>
        {ETAPES[onglet].map((e, i) => (
          <li key={i} className="inst-etape">
            <span className="inst-num" aria-hidden="true">{i + 1}</span>
            <span className="inst-etape-texte">
              <span className="inst-etape-titre">{e.titre}</span>
              {e.detail && <span className="inst-etape-detail">{e.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
      {NOTES[onglet] && <p className="inst-note">{NOTES[onglet]}</p>}
    </div>
  );
}

/** Popup « Installer Réviz », même gabarit que l'annonce de la Battle. */
export function InstallerModal({ onClose }) {
  const ref = useModalA11y(onClose);
  const { plateforme } = useInstallation();
  useEffect(() => { track('installer_ouvert', { plateforme }); }, [plateforme]);

  return (
    <div className="inst-fond" onClick={onClose}>
      <div
        className="inst-carte"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inst-titre"
        onClick={e => e.stopPropagation()}
      >
        <Mascot pose="pointing" size={96} priority alt="" aria-hidden="true" />
        <h2 className="inst-titre" id="inst-titre">Installer Réviz</h2>
        <p className="inst-sous">
          Réviz n'est pas encore sur les stores : elle s'installe depuis ton navigateur.
          Ensuite, elle s'ouvre en plein écran depuis son icône.
        </p>
        <InstallerGuide />
        <button type="button" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost rv-btn-cta--center inst-fermer" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}

/**
 * Bouton qui ouvre la popup. Rien n'est affiché dans l'app iOS native ni
 * dans l'app déjà installée : il n'y a plus rien à installer.
 */
export function BoutonInstaller({ className = '', children = "Installer l'app" }) {
  const { aProposer } = useInstallation();
  const [ouvert, setOuvert] = useState(false);
  if (!aProposer) return null;
  return (
    <>
      <button type="button" className={className} onClick={() => setOuvert(true)}>
        <InstallIcon />
        <span>{children}</span>
      </button>
      {ouvert && <InstallerModal onClose={() => setOuvert(false)} />}
    </>
  );
}
