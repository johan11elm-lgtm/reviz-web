import { useEffect, useRef, useState } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';
import { useInstallation } from '../hooks/useInstallation';
import { installerDirectement } from '../utils/installation';
import { track } from '../services/statsService';
import { Mascot } from './Mascot';
import {
  ShareIcon, PlusSquareIcon, DotsVerticalIcon, DotsIcon, InstallIcon, CheckIcon, XIcon,
} from './Icons';
import './InstallerApp.css';

/** Adresse à taper dans le navigateur, montrée telle quelle dans les étapes. */
const ADRESSE = 'app.revizapp.fr';

const ONGLETS = [
  { id: 'ios', label: 'iPhone, iPad' },
  { id: 'android', label: 'Android' },
  { id: 'ordinateur', label: 'Ordinateur' },
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

/** Carte d'état (menthe : installée ; pêche : navigateur intégré) avec son rond à tranche. */
export function CarteEtat({ teinte, rond, role, children, className = '' }) {
  return (
    <div className={`inst-etat inst-etat--${teinte} ${className}`} role={role}>
      <span className="inst-etat-rond" aria-hidden="true">{rond}</span>
      <div className="inst-etat-texte">{children}</div>
    </div>
  );
}

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
  // Navigateur intégré d'une autre app (TikTok…) : rien à installer d'ici, on l'explique seul.
  const bloque = Boolean(integre) && plateforme !== 'ordinateur';

  if (installee) {
    return (
      <div className="inst-guide">
        <CarteEtat teinte="menthe" rond={<CheckIcon />} role="status">
          <b className="inst-etat-titre">Réviz est installée.</b>
          <span className="inst-etat-vert">Retrouve-la avec tes applis.</span>
        </CarteEtat>
      </div>
    );
  }

  if (bloque) {
    return (
      <div className="inst-guide">
        <CarteEtat teinte="peche" rond={<DotsIcon />} role="note">
          <p className="inst-etat-phrase">
            <b>Tu es dans le navigateur de {integre} : il ne peut pas installer d'app.</b>{' '}
            <span>Touche <Touche Icone={DotsIcon} /> puis « Ouvrir dans le navigateur », et reviens ici.</span>
          </p>
        </CarteEtat>
      </div>
    );
  }

  return (
    <div className="inst-guide">
      <div className="inst-onglets" role="tablist" aria-label="Ton appareil">
        {ONGLETS.map(({ id, label }) => (
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
            {label}
          </button>
        ))}
      </div>

      {directIci && (
        <div className="inst-direct">
          <button type="button" className="inst-btn" onClick={installer}>Installer Réviz</button>
          <p className="inst-ou"><span>ou</span></p>
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

/** Texte d'introduction, commun à la popup et à la page /installer. */
export const INTRO_INSTALLER = "Réviz n'est pas encore sur les stores : elle s'installe depuis ton navigateur. Ensuite, elle s'ouvre en plein écran depuis son icône.";

/**
 * Popup « Installer Réviz » : feuille du bas sur téléphone (glissable vers le bas),
 * fenêtre centrée de 540 px sur ordinateur. Fermeture : voile, Échap, croix ou « Fermer ».
 */
export function InstallerModal({ onClose }) {
  const ref = useModalA11y(onClose);
  const { plateforme } = useInstallation();
  useEffect(() => { track('installer_ouvert', { plateforme }); }, [plateforme]);

  // Glisser la poignée vers le bas referme la feuille (au-delà de 90 px).
  const depart = useRef(null);
  const [decale, setDecale] = useState(0);
  const poser = e => {
    depart.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const glisser = e => {
    if (depart.current === null) return;
    setDecale(Math.max(0, e.clientY - depart.current));
  };
  const lacher = () => {
    if (depart.current === null) return;
    depart.current = null;
    if (decale > 90) onClose();
    else setDecale(0);
  };

  return (
    <div className="inst-fond" onClick={onClose}>
      <div
        className={`inst-carte${decale ? ' is-glisse' : ''}`}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inst-titre"
        style={decale ? { transform: `translateY(${decale}px)` } : undefined}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="inst-poignee"
          aria-hidden="true"
          onPointerDown={poser}
          onPointerMove={glisser}
          onPointerUp={lacher}
          onPointerCancel={lacher}
        ><span /></div>
        <div className="inst-tete">
          <h2 className="inst-titre" id="inst-titre">Installer Réviz</h2>
          <span className="inst-tete-reviz">
            <Mascot pose="scan" size={104} priority alt="" aria-hidden="true" />
          </span>
        </div>
        <p className="inst-sous">{INTRO_INSTALLER}</p>
        <div className="inst-boite">
          <InstallerGuide />
        </div>
        <div className="inst-pied">
          <button type="button" className="inst-btn inst-btn--blanc inst-fermer" onClick={onClose}>
            Fermer
          </button>
        </div>
        {/* Croix (ordinateur) : en dernier dans le DOM, le focus d'ouverture va aux onglets. */}
        <button type="button" className="inst-croix" onClick={onClose} aria-label="Fermer la fenêtre">
          <XIcon />
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
