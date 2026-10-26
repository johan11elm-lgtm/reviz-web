import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pantin } from '../components/Pantin';
import { CheckIcon } from '../components/Icons';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { TEINTES, varsTeinte } from '../utils/teinteMatiere';
import { apiFetch, IS_NATIVE } from '../services/apiClient';
import '../components/reviz/HerosMatiere.css';
import './Avis.css';

// Listes fermées, en miroir de api/avis.js (le serveur ignore le reste).
const PROFILS = [
  { id: 'enseignant', label: 'Enseignant·e' },
  { id: 'eleve',      label: 'Élève' },
  { id: 'parent',     label: 'Parent' },
  { id: 'autre',      label: 'Autre' },
];
const CONSEILS = [
  { id: 'oui',       label: 'Oui' },
  { id: 'peut-etre', label: 'Peut-être' },
  { id: 'non',       label: 'Pas encore' },
];
const DISCIPLINES = [
  'Mathématiques', 'Français', 'Histoire-géographie', 'SVT', 'Physique-chimie', 'Technologie',
  'Langues vivantes', 'Langues anciennes', 'Arts plastiques', 'Éducation musicale', 'EPS',
  'Documentation', 'Vie scolaire', 'Autre',
];
const SOURCES = ['affiche-profs', 'affiche-cdi', 'profil', 'accueil'];

const ERREURS = {
  PROFIL: 'Indiquez qui vous êtes.',
  VIDE: 'Répondez à au moins une question.',
  EMAIL: "Cette adresse e-mail ne semble pas valide.",
};
// Même contrôle que le serveur (api/avis.js) : l'erreur s'affiche avant l'envoi.
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Ordre d'affichage dans le formulaire : la première erreur est annoncée (role="alert").
const ORDRE_ERREURS = ['profil', 'email', 'vide', 'envoi'];
const CHAMP_ERREUR = { PROFIL: 'profil', VIDE: 'vide', EMAIL: 'email' };

function device() {
  if (IS_NATIVE) return 'app';
  try { return window.matchMedia('(min-width: 1024px)').matches ? 'ordinateur' : 'mobile'; }
  catch { return 'mobile'; }
}

/** Erreur sans rouge : pastille « ! » pêche, texte orange. */
function Erreur({ id, alerte, children }) {
  return (
    <p id={id} className="av-erreur" role={alerte ? 'alert' : undefined}>
      <span className="av-erreur-rond" aria-hidden="true">!</span>
      <span>{children}</span>
    </p>
  );
}

/** Groupe de pastilles à choix unique (boutons radio stylés). */
function Choix({ name, legend, options, value, onChange, erreur, alerte }) {
  return (
    <fieldset className="av-champ" aria-describedby={erreur ? `av-err-${name}` : undefined}>
      <legend className="av-label">{legend}</legend>
      <div className="av-choix">
        {options.map(o => (
          <label key={o.id} className={`av-pastille${value === o.id ? ' is-choisie' : ''}`}>
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
            />
            {o.label}
          </label>
        ))}
      </div>
      {erreur && <Erreur id={`av-err-${name}`} alerte={alerte}>{erreur}</Erreur>}
    </fieldset>
  );
}

/**
 * Page publique « Votre avis » (handoff Claude Design du 22/10) : sans compte ni Firebase côté
 * client, pour les enseignants qui arrivent par le QR code de l'affiche comme pour les élèves
 * (lien depuis le profil). L'avis part vers /api/avis. Vouvoiement.
 */
export default function Avis() {
  const isDesktop = useIsDesktop();
  const [params] = useSearchParams();
  const source = SOURCES.includes(params.get('src')) ? params.get('src') : 'direct';
  // Les supports papier (affiche salle des profs, demi-page du CDI) visent les enseignants.
  const depuisAffiche = source.startsWith('affiche-');

  // Arrivée par l'affiche de la salle des profs : profil présélectionné.
  const [profil, setProfil] = useState(depuisAffiche ? 'enseignant' : '');
  const [discipline, setDiscipline] = useState('');
  const [conseil, setConseil] = useState('');
  const [plait, setPlait] = useState('');
  const [manque, setManque] = useState('');
  const [autre, setAutre] = useState('');
  const [email, setEmail] = useState('');
  const [citation, setCitation] = useState(false);
  const [signature, setSignature] = useState('');
  const [site, setSite] = useState('');
  const [etat, setEtat] = useState('saisie'); // saisie | envoi | merci
  // Erreurs sous le champ concerné ; « envoi » : réseau ou refus du serveur, près du bouton.
  const [erreurs, setErreurs] = useState({});
  const [alerte, setAlerte] = useState(null);
  const [signalements, setSignalements] = useState(0);

  // Une erreur hors de l'écran (profil, en haut du formulaire) : on l'amène sous les yeux.
  useEffect(() => {
    if (alerte) document.getElementById(`av-err-${alerte}`)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [signalements]);

  const effacer = (...cles) => setErreurs(e => {
    if (!cles.some(c => e[c])) return e;
    const suite = { ...e };
    cles.forEach(c => delete suite[c]);
    return suite;
  });
  const signaler = e => {
    setErreurs(e);
    setAlerte(ORDRE_ERREURS.find(c => e[c]) || null);
    setSignalements(n => n + 1);
  };

  async function envoyer(ev) {
    ev.preventDefault();
    const e = {};
    if (!profil) e.profil = ERREURS.PROFIL;
    if (email.trim() && !EMAIL_OK.test(email.trim())) e.email = ERREURS.EMAIL;
    if (!conseil && !plait.trim() && !manque.trim() && !autre.trim()) e.vide = ERREURS.VIDE;
    signaler(e);
    if (Object.keys(e).length) return;
    setEtat('envoi');
    try {
      const res = await apiFetch('/api/avis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profil, discipline: profil === 'enseignant' ? discipline : '', conseil,
          plait, manque, autre, email, site, source, device: device(),
          citation: citation && Boolean(plait.trim()), signature: citation ? signature : '',
        }),
      });
      if (res.ok) return setEtat('merci');
      const data = await res.json().catch(() => ({}));
      const champ = CHAMP_ERREUR[data.error];
      signaler(champ ? { [champ]: ERREURS[data.error] } : { envoi: "L'envoi n'a pas abouti. Réessayez dans un instant." });
    } catch {
      signaler({ envoi: "Pas de connexion pour l'instant. Votre texte est gardé : réessayez dans un instant." });
    }
    setEtat('saisie');
  }

  const merci = etat === 'merci';
  const racine = `app app--no-halo ch-page av-page${merci ? ' av-page--merci' : ''}${isDesktop ? ' app--large ch-page--large av-page--large' : ''}`;

  const barre = (
    <div className="av-barre">
      <Link to="/" className="av-logo" aria-label="Réviz, accueil">Réviz</Link>
      {!merci && (depuisAffiche
        ? <Link to="/profs" className="av-barre-lien">Découvrir l'appli</Link>
        : <Link to="/essai" className="av-barre-lien">Essayer sans compte</Link>)}
    </div>
  );
  const titres = (
    <div className="av-titres">
      {depuisAffiche && <span className="av-sur">Pour les enseignants</span>}
      <h1 className="av-titre">Votre avis</h1>
    </div>
  );
  const decor = (
    <>
      <span className="ch-grain" aria-hidden="true" />
      <span className="av-deco av-deco--a" aria-hidden="true" />
      <span className="av-deco av-deco--b" aria-hidden="true" />
    </>
  );

  if (merci) {
    const boutons = (
      <div className="av-merci-boutons">
        {depuisAffiche ? (
          <>
            <Link to="/profs" className="av-btn">Découvrir l'appli</Link>
            <Link to="/essai" className="av-btn av-btn--blanc">Essayer Réviz sans compte</Link>
          </>
        ) : (
          <Link to="/essai" className="av-btn">Essayer Réviz sans compte</Link>
        )}
      </div>
    );
    const fete = (
      <div className="av-fete" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => <i key={i} className={`av-confetti av-confetti--${i + 1}`} />)}
        <Pantin key="merci" expression="fier" entree="brasEnLair" size={isDesktop ? 400 : 250} repli={null} />
      </div>
    );
    return (
      <div className={racine} style={varsTeinte(TEINTES.lavande)}>
        <div className="content av-defile">
          <header className="ch-hero av-hero">
            {decor}
            {barre}
            <div className="av-merci-corps">
              <div className="av-merci-textes">
                {titres}
                <div className="av-bulle" aria-live="polite">
                  <h2 className="av-bulle-titre">Merci, c'est bien arrivé.</h2>
                  <p className="av-bulle-sous">
                    {email.trim()
                      ? 'Vous aurez une réponse à l’adresse indiquée.'
                      : 'Votre avis sera lu avec attention.'}
                  </p>
                </div>
                {isDesktop && boutons}
              </div>
              {fete}
            </div>
          </header>
          {!isDesktop && <main className="av-merci-bas">{boutons}</main>}
        </div>
      </div>
    );
  }

  const aide = (
    <aside className="av-aide" aria-labelledby="av-aide-titre">
      <h2 id="av-aide-titre" className="av-aide-titre">Ce qui aide le plus</h2>
      <ul>
        <li>Une erreur repérée dans un chapitre de votre matière</li>
        <li>Ce qui manque pour que vous le conseilliez à vos élèves</li>
        <li>Ce qui gêne à l'usage, sur ordinateur ou sur téléphone</li>
      </ul>
      <p className="av-aide-note">
        Les chapitres sont rédigés avec l'aide de l'IA à partir des programmes officiels, de la 6e à la 3e, et
        pas encore tous relus par des enseignants.
      </p>
    </aside>
  );
  const reviz = <Pantin key="saisie" expression="content" size={isDesktop ? 250 : 128} repli={null} className="av-reviz" />;
  const erreurBas = erreurs.vide || erreurs.envoi;
  const cleBas = erreurs.vide ? 'vide' : 'envoi';

  const formulaire = (
    <form className="av-carte av-form" onSubmit={envoyer} noValidate>
      <Choix
        name="profil" legend="Vous êtes" options={PROFILS} value={profil}
        onChange={v => { setProfil(v); effacer('profil'); }}
        erreur={erreurs.profil} alerte={alerte === 'profil'}
      />

      {profil === 'enseignant' && (
        <div className="av-champ">
          <label className="av-label" htmlFor="av-discipline">Votre matière ou fonction</label>
          <select
            id="av-discipline"
            className="av-input av-select"
            value={discipline}
            onChange={e => setDiscipline(e.target.value)}
          >
            <option value="">Choisir (facultatif)</option>
            {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      )}

      <Choix
        name="conseil"
        legend="Conseilleriez-vous Réviz à un élève ?"
        options={CONSEILS}
        value={conseil}
        onChange={v => { setConseil(v); effacer('vide'); }}
      />

      <div className="av-champ">
        <label className="av-label" htmlFor="av-plait">Ce qui vous plaît</label>
        <textarea
          id="av-plait"
          className="av-input av-textarea"
          rows={3}
          maxLength={2000}
          value={plait}
          onChange={e => { setPlait(e.target.value); effacer('vide'); }}
        />
      </div>

      <div className="av-champ">
        <label className="av-label" htmlFor="av-manque">Ce qui manque, ou une erreur repérée</label>
        <textarea
          id="av-manque"
          className="av-input av-textarea"
          rows={3}
          maxLength={2000}
          placeholder="Par exemple : en 4e, chapitre « Les fractions », la question 3 du quiz…"
          value={manque}
          onChange={e => { setManque(e.target.value); effacer('vide'); }}
        />
      </div>

      <div className="av-champ">
        <label className="av-label" htmlFor="av-autre">Autre chose ?</label>
        <textarea
          id="av-autre"
          className="av-input av-textarea av-textarea--court"
          rows={2}
          maxLength={2000}
          value={autre}
          onChange={e => { setAutre(e.target.value); effacer('vide'); }}
        />
      </div>

      <div className={`av-champ${erreurs.email ? ' is-erreur' : ''}`}>
        <label className="av-label" htmlFor="av-email">Votre e-mail (facultatif)</label>
        <input
          id="av-email"
          className="av-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={200}
          value={email}
          aria-invalid={erreurs.email ? true : undefined}
          aria-describedby={`${erreurs.email ? 'av-err-email ' : ''}av-email-aide`}
          onChange={e => { setEmail(e.target.value); effacer('email', 'envoi'); }}
        />
        {erreurs.email && <Erreur id="av-err-email" alerte={alerte === 'email'}>{erreurs.email}</Erreur>}
        <p id="av-email-aide" className="av-aide-champ">Seulement pour vous répondre. Rien d'autre n'en est fait.</p>
      </div>

      {plait.trim() && (
        <div className="av-accord">
          <label className="av-case">
            <input type="checkbox" checked={citation} onChange={e => setCitation(e.target.checked)} />
            <span className="av-case-boite" aria-hidden="true"><CheckIcon /></span>
            <span className="av-case-texte">J'accepte que « ce qui me plaît » soit cité sur revizapp.fr</span>
          </label>
          {citation && (
            <div className="av-champ av-champ--signature">
              <label className="av-label" htmlFor="av-signature">Signature (facultatif)</label>
              <input
                id="av-signature"
                className="av-input"
                type="text"
                maxLength={60}
                placeholder="Par exemple : Mme D., professeure de SVT"
                value={signature}
                onChange={e => setSignature(e.target.value)}
              />
            </div>
          )}
          <p className="av-aide-champ av-accord-note">
            Rien n'est publié sans cet accord. Retrait à tout moment sur simple demande à{' '}
            <a href="mailto:contact@revizapp.fr">contact@revizapp.fr</a>.
          </p>
        </div>
      )}

      {/* Champ piège : invisible pour les humains, rempli par les robots. */}
      <div className="av-piege" aria-hidden="true">
        <label htmlFor="av-site">Site web</label>
        <input id="av-site" type="text" tabIndex={-1} autoComplete="off" value={site} onChange={e => setSite(e.target.value)} />
      </div>

      <div className="av-envoi">
        <button type="submit" className="av-btn av-btn--envoyer" disabled={etat === 'envoi'}>
          {etat === 'envoi' ? 'Envoi…' : 'Envoyer mon avis'}
        </button>
        {erreurBas && <Erreur id={`av-err-${cleBas}`} alerte={alerte === cleBas}>{erreurBas}</Erreur>}
      </div>
      <p className="av-legal">
        Aucun compte demandé, aucun suivi. <Link to="/legal/confidentialite">Confidentialité</Link>
      </p>
    </form>
  );

  return (
    <div className={racine} style={varsTeinte(TEINTES.lavande)}>
      <div className="content av-defile">
        <header className="ch-hero av-hero">
          {decor}
          {barre}
          <div className="av-hero-corps">
            {titres}
            {!isDesktop && reviz}
          </div>
        </header>
        {isDesktop ? (
          <main className="av-grille">
            {formulaire}
            <div className="av-cote">{reviz}{aide}</div>
          </main>
        ) : (
          <main className="av-colonne">{aide}{formulaire}</main>
        )}
      </div>
    </div>
  );
}
