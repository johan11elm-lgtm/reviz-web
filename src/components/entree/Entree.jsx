import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pantin } from '../Pantin';
import { Mascot } from '../Mascot';
import { LogoReviz } from '../skin/Skin';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { fournisseursVisibles } from '../SocialLogin';
import '../reviz/HerosMatiere.css';
import './Entree.css';

/**
 * Parcours d'entrée (handoff Claude Design du 22/10, façon app Nomad le 29/10) : bienvenue, essai,
 * inscription, fin d'inscription, e-mail d'un parent, connexion, vérification, découverte. Mêmes
 * briques partout : une carte blanche avec ce que dit Réviz en titre, la question, puis « ou »,
 * boutons sociaux et liens.
 */

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
);

// Émote de Réviz selon son humeur (les écrans d'entrée n'animent plus le pantin, sauf la bienvenue).
const POSE = { content: 'hello', fier: 'celebration', reflechit: 'thinking', determine: 'pointing', inquiet: 'confused' };

/**
 * Le décor suit un peu la souris (parallaxe : --mx et --my de -1 à 1 sur la zone). Rien au doigt
 * ni si l'élève a demandé moins d'animations.
 */
function useSouris(zone) {
  useEffect(() => {
    const el = zone.current;
    const fin = window.matchMedia?.('(pointer: fine)').matches;
    const calme = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!el || !fin || calme) return undefined;
    let raf = 0, x = 0, y = 0;
    const appliquer = () => { raf = 0; el.style.setProperty('--mx', x.toFixed(3)); el.style.setProperty('--my', y.toFixed(3)); };
    const bouger = ev => {
      x = ev.clientX / window.innerWidth * 2 - 1;
      y = ev.clientY / window.innerHeight * 2 - 1;
      if (!raf) raf = requestAnimationFrame(appliquer);
    };
    window.addEventListener('pointermove', bouger, { passive: true });
    return () => { window.removeEventListener('pointermove', bouger); cancelAnimationFrame(raf); };
  }, [zone]);
}

/** Autocollants autour de la carte (ordinateur), comme les photos inclinées de Nomad : Réviz en
 * émotes, qui bougent un peu avec la souris. */
function Autocollants() {
  const zone = useRef(null);
  useSouris(zone);
  return (
    <div className="en-autocollants" ref={zone} aria-hidden="true">
      <span className="en-colle en-colle--a"><Mascot pose="reading" size={150} alt="" /></span>
      <span className="en-colle en-colle--b"><Mascot pose="celebration" size={150} alt="" /></span>
      <span className="en-colle en-colle--c"><Mascot pose="quiz" size={130} alt="" /></span>
      <span className="en-colle-mot en-colle-mot--a">réviz</span>
      <span className="en-colle-mot en-colle-mot--b">réviz</span>
    </div>
  );
}

/**
 * Écrans d'entrée façon app Nomad (29/10) : fond crème, une carte blanche centrée avec le retour
 * et le logo en tête, ce que dit Réviz en titre (deux graisses) avec son émote, la progression en
 * barre orange, puis le contenu ; des autocollants de Réviz autour sur ordinateur. La bienvenue
 * (taille « grand ») garde le pantin, dans un grand bloc orange comme la photo de leur accueil.
 *
 * @param {'peche'|'lavande'|'menthe'} [teinte]  — gardé pour compatibilité (les blocs sont unis)
 * @param {string[]} bulle                  — ce que dit Réviz (2 lignes au plus) : le titre
 * @param {string} [expression]            — humeur : choisit l'émote
 * @param {string} [geste]                 — geste du pantin (bienvenue)
 * @param {'normal'|'dense'|'grand'|'decouverte'} [taille]
 * @param {Function} [onRetour]            — bouton retour (absent si non fourni)
 * @param {Function} [onPasser]            — « Passer » (découverte)
 * @param {{ n: number, total: number, libelle?: boolean }} [etape] — progression
 * @param {boolean} [logo]                 — bienvenue
 * @param {React.ReactNode} children       — contenu de la carte
 * @param {React.ReactNode} [dessous]      — bas de la carte
 */
export function EntreeEcran({ teinte = 'peche', bulle, expression = 'content', geste, taille = 'normal', onRetour, onPasser, etape, logo = false, children, dessous }) {
  const isDesktop = useIsDesktop();
  const [l1, ...suite] = bulle;
  const titre = (
    <h1 className="en-titre">
      {/* La phrase entière pour les lecteurs d'écran ; à l'écran, deux graisses. */}
      <span className="en-titre-sr rv-bulle-sr">{bulle.join(' ')}</span>
      <span className="en-titre-fort" aria-hidden="true">{l1}</span>
      {suite.length > 0 && <span className="en-titre-leger" aria-hidden="true">{suite.join(' ')}</span>}
    </h1>
  );
  const tete = (
    <div className="en-tete">
      <span className="en-tete-gauche">
        {onRetour && <button type="button" className="en-retour" onClick={onRetour} aria-label="Retour"><Chevron /></button>}
      </span>
      <LogoReviz className="en-tete-logo" />
      <span className="en-tete-droite">{onPasser && <button type="button" className="en-passer" onClick={onPasser}>Passer</button>}</span>
    </div>
  );
  const progression = etape && (
    <div className="en-progression">
      <Progression {...etape} />
      {etape.libelle !== false && <span className="en-sur">Étape {etape.n} sur {etape.total}</span>}
    </div>
  );

  // Bienvenue : le texte et les boutons, et le pantin dans un grand bloc orange.
  if (logo) return <Bienvenue {...{ titre, expression, geste, isDesktop, children, dessous }} />;

  return (
    <div className={`app app--no-halo en-page en-nomad en--${teinte} en--${taille}${isDesktop ? ' app--large en-nomad--large' : ''}`}>
      <div className="content en-defile">
        {isDesktop && <Autocollants />}
        <div className="en-carte">
          {tete}
          {progression}
          <div className="en-titre-ligne">
            {titre}
            <span className="en-titre-emote" aria-hidden="true"><Mascot pose={POSE[expression] ?? 'hello'} size={isDesktop ? 64 : 56} alt="" /></span>
          </div>
          {children}
          {dessous && <div className="en-dessous">{dessous}</div>}
        </div>
      </div>
    </div>
  );
}

/** Bienvenue : le texte et les boutons, Réviz dans un grand bloc orange qui bouge un peu avec la souris. */
function Bienvenue({ titre, expression, geste, isDesktop, children, dessous }) {
  const zone = useRef(null);
  useSouris(zone);
  return (
    <div ref={zone} className={`app app--no-halo en-page en-nomad en-nomad--bienvenue${isDesktop ? ' app--large en-nomad--large' : ''}`}>
      <div className="content en-defile">
        <div className="en-bienvenue">
          <div className="en-bienvenue-texte">
            <LogoReviz className="en-bienvenue-logo" />
            {titre}
            <div className="en-pile en-bienvenue-actions">{children}</div>
            {dessous && <div className="en-dessous">{dessous}</div>}
          </div>
          <div className="en-bienvenue-image" aria-hidden="true">
            <Pantin size={isDesktop ? 360 : 230} expression={expression} entree={geste ?? 'coucou'} repli={null} label="Réviz, ta mascotte" />
            <span className="en-colle-mot en-colle-mot--bienvenue">réviz</span>
            <span className="en-note-colle"><b>6e → 3e</b>tout le programme</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Progression({ n, total }) {
  return (
    <span className="en-points" role="img" aria-label={`Étape ${n} sur ${total}`}>
      <i style={{ width: `${Math.round(n / total * 100)}%` }} />
    </span>
  );
}

const IconeErreur = () => <span className="en-erreur-rond" aria-hidden="true">!</span>;

/** Ligne d'erreur sous un champ (ou d'un écran). */
export function Erreur({ children, id }) {
  if (!children) return null;
  return <p className="en-erreur" id={id} role="alert"><IconeErreur />{children}</p>;
}

/** Retour d'action centré : « E-mail renvoyé » (ok) ou « Pas encore confirmé » (à faire). */
export function RetourAction({ ok = true, children }) {
  if (!children) return null;
  return (
    <p className={`en-retour-action${ok ? ' is-ok' : ''}`} role="status">
      <span aria-hidden="true">{ok ? <Coche /> : '!'}</span>{children}
    </p>
  );
}

const Coche = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

/** Champ texte avec libellé au-dessus, erreur dessous, lien optionnel à droite du libellé. */
export function Champ({ id, label, erreur, lien, aide, className = '', ...props }) {
  return (
    <div className={`en-champ${erreur ? ' is-erreur' : ''} ${className}`.trim()}>
      <div className="en-champ-tete"><label htmlFor={id}>{label}</label>{lien}</div>
      <input id={id} className="en-input" aria-invalid={erreur ? true : undefined} aria-describedby={erreur ? `${id}-erreur` : undefined} {...props} />
      {aide && <p className="en-aide">{aide}</p>}
      <Erreur id={`${id}-erreur`}>{erreur}</Erreur>
    </div>
  );
}

/** Mot de passe avec « Afficher » / « Masquer » dans le champ. */
export function ChampMotDePasse({ id, label = 'Mot de passe', erreur, lien, aide, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`en-champ${erreur ? ' is-erreur' : ''}`}>
      <div className="en-champ-tete"><label htmlFor={id}>{label}</label>{lien}</div>
      <div className="en-mdp">
        <input id={id} className="en-input" type={visible ? 'text' : 'password'} aria-invalid={erreur ? true : undefined} aria-describedby={erreur ? `${id}-erreur` : undefined} {...props} />
        <button type="button" className="en-afficher" onClick={() => setVisible(v => !v)} aria-pressed={visible}>{visible ? 'Masquer' : 'Afficher'}</button>
      </div>
      {aide && <p className="en-aide">{aide}</p>}
      <Erreur id={`${id}-erreur`}>{erreur}</Erreur>
    </div>
  );
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const ANNEE_COURANTE = new Date().getFullYear();
// Des plus jeunes (6 ans) aux plus âgés : les collégiens trouvent leur année en haut.
const ANNEES = Array.from({ length: ANNEE_COURANTE - 6 - 1950 + 1 }, (_, i) => ANNEE_COURANTE - 6 - i);
const deux = n => String(n).padStart(2, '0');

/**
 * Date de naissance en trois listes natives (jour, mois, année), habillées en cases.
 * value / onChange : 'AAAA-MM-JJ', ou '' tant que les trois ne sont pas choisis.
 */
export function ChampDate({ value, onChange, erreur, idPrefix = 'naissance' }) {
  const [initJ, initM, initA] = value ? value.split('-').reverse() : ['', '', ''];
  const [jour, setJour]   = useState(initJ ? String(Number(initJ)) : '');
  const [mois, setMois]   = useState(initM ? String(Number(initM)) : '');
  const [annee, setAnnee] = useState(initA ?? '');
  function maj(j, m, a) {
    setJour(j); setMois(m); setAnnee(a);
    if (!j || !m || !a) { onChange(''); return; }
    // 31 février → dernier jour du mois, plutôt qu'une date invalide.
    const dernier = new Date(Number(a), Number(m), 0).getDate();
    const jj = Math.min(Number(j), dernier);
    if (jj !== Number(j)) setJour(String(jj));
    onChange(`${a}-${deux(m)}-${deux(jj)}`);
  }
  const caseDate = (cle, libelle, val, options, onC) => (
    <label className={`en-date-case en-date-case--${cle}`}>
      <span className="en-date-libelle">{libelle}</span>
      <span className="en-date-valeur">{options.find(o => o[0] === val)?.[1] ?? '–'}</span>
      <select id={`${idPrefix}-${cle}`} aria-label={libelle} value={val} onChange={e => onC(e.target.value)}>
        <option value="" disabled>{libelle}</option>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
      <Chevron />
    </label>
  );
  return (
    <div className={`en-champ${erreur ? ' is-erreur' : ''}`}>
      <div className="en-date" role="group" aria-label="Ta date de naissance">
        {caseDate('jour', 'Jour', jour, Array.from({ length: 31 }, (_, i) => [String(i + 1), String(i + 1)]), v => maj(v, mois, annee))}
        {caseDate('mois', 'Mois', mois, MOIS.map((m, i) => [String(i + 1), m[0].toUpperCase() + m.slice(1)]), v => maj(jour, v, annee))}
        {caseDate('annee', 'Année', annee, ANNEES.map(a => [String(a), String(a)]), v => maj(jour, mois, v))}
      </div>
      <Erreur id={`${idPrefix}-erreur`}>{erreur}</Erreur>
    </div>
  );
}

export const CLASSES_COLLEGE = ['6ème', '5ème', '4ème', '3ème'];
const TEINTE_CLASSE = { '6ème': 'lavande', '5ème': 'peche', '4ème': 'menthe', '3ème': 'rose' };

/** Le seul sélecteur de classe du parcours : 6e 5e 4e 3e, chacun dans son pastel. Pas de lycée. */
export function ChoixClasse({ valeur, onChange, erreur, label = 'Ta classe' }) {
  return (
    <div className={`en-champ${erreur ? ' is-erreur' : ''}`}>
      <div className="en-classes" role="radiogroup" aria-label={label}>
        {CLASSES_COLLEGE.map(c => (
          <button key={c} type="button" role="radio" aria-checked={valeur === c}
            className={`en-classe en-classe--${TEINTE_CLASSE[c]}${valeur === c ? ' is-choisie' : ''}`}
            onClick={() => onChange(c)}>{c.replace('ème', 'e')}</button>
        ))}
      </div>
      <Erreur id="classe-erreur">{erreur}</Erreur>
    </div>
  );
}

/** Case « J'accepte les CGU et la politique de confidentialité ». */
export function CaseCGU({ checked, onChange, erreur }) {
  return (
    <div className={`en-champ${erreur ? ' is-erreur' : ''}`}>
      <label className="en-case">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="en-case-boite" aria-hidden="true"><Coche /></span>
        <span>J’accepte les <a href="/legal/cgu" target="_blank" rel="noreferrer">CGU</a> et la <a href="/legal/confidentialite" target="_blank" rel="noreferrer">politique de confidentialité</a></span>
      </label>
      <Erreur id="cgu-erreur">{erreur}</Erreur>
    </div>
  );
}

const ICONES = {
  horloge: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>,
  enveloppe: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5.5" width="17" height="13" rx="3" /><path d="M4.5 7.5l7.5 5.5 7.5-5.5" /></svg>,
  coche: <Coche />,
};

/** Encart d'info : pastille blanche avec icône, texte (mots clés en gras). */
export function Encart({ icone = 'horloge', teinte = 'lavande', children }) {
  return (
    <div className={`en-encart en-encart--${teinte}`}>
      <span className="en-encart-rond" aria-hidden="true">{ICONES[icone]}</span>
      <p>{children}</p>
    </div>
  );
}

export function Ou() {
  return <div className="en-ou" aria-hidden="true"><span>ou</span></div>;
}

/** Boutons sociaux, identiques partout : grille 2 × 2. */
export function BoutonsSociaux({ onLogin, disabled }) {
  return (
    <div className="en-sociaux">
      {fournisseursVisibles().map(({ id, label, Logo }) => (
        <button key={id} type="button" className="en-social" onClick={() => onLogin(id)} disabled={disabled} aria-label={label}>
          <Logo /><span aria-hidden="true">{label.replace('Continuer avec ', '')}</span>
        </button>
      ))}
    </div>
  );
}

/** Lien centré précédé d'un texte : « Déjà un compte ? Se connecter ». */
export function LienTexte({ avant, to, onClick, children }) {
  return (
    <p className="en-lien-texte">
      {avant && <>{avant} </>}
      {to ? <Link to={to}>{children}</Link> : <button type="button" onClick={onClick}>{children}</button>}
    </p>
  );
}
