import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pantin } from '../Pantin';
import { BulleReviz } from '../reviz/BulleReviz';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { fournisseursVisibles } from '../SocialLogin';
import '../reviz/HerosMatiere.css';
import './Entree.css';

/**
 * Parcours d'entrée (handoff Claude Design du 22/10) : bienvenue, essai, inscription, fin
 * d'inscription, e-mail d'un parent, connexion, vérification, découverte. Mêmes briques partout :
 * héros pastel avec Réviz qui parle, une carte avec la question, puis « ou », boutons sociaux et liens.
 * Téléphone : héros en haut, carte à cheval. Ordinateur : héros à gauche, carte à droite.
 */

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
);

// Taille de Réviz selon l'écran (téléphone / ordinateur).
const TAILLES = { normal: [150, 320], dense: [96, 320], grand: [230, 380], decouverte: [270, 380] };

/**
 * @param {'peche'|'lavande'|'menthe'} [teinte]
 * @param {string[]} bulle                  — ce que dit Réviz (2 lignes au plus)
 * @param {string} [expression]            — humeur du Pantin
 * @param {string} [geste]                 — geste joué quand il change (et à l'arrivée)
 * @param {'normal'|'dense'|'grand'|'decouverte'} [taille]
 * @param {Function} [onRetour]            — bouton retour (absent si non fourni)
 * @param {Function} [onPasser]            — « Passer » (découverte)
 * @param {{ n: number, total: number, libelle?: boolean }} [etape] — progression en points
 * @param {boolean} [logo]                 — logotype « Réviz » (bienvenue)
 * @param {React.ReactNode} children       — contenu de la carte
 * @param {React.ReactNode} [dessous]      — sous la carte (téléphone) / en bas de la carte (ordinateur)
 */
export function EntreeEcran({ teinte = 'peche', bulle, expression = 'content', geste, taille = 'normal', onRetour, onPasser, etape, logo = false, children, dessous }) {
  const isDesktop = useIsDesktop();
  const pantin = useRef(null);
  const [parle, setParle] = useState(false);
  const texte = bulle.join('\n');
  useEffect(() => { if (parle) pantin.current?.dire(texte); }, [texte, parle]);
  useEffect(() => {
    let t;
    const essai = () => { t = setTimeout(() => (document.hidden ? essai() : setParle(true)), 3000); };
    essai();
    return () => clearTimeout(t);
  }, []);
  const premierGeste = useRef(geste);
  useEffect(() => {
    if (geste && geste !== premierGeste.current) pantin.current?.geste(geste);
    premierGeste.current = null;
  }, [geste]);

  const [tTel, tOrdi] = TAILLES[taille] ?? TAILLES.normal;
  const points = etape && <Progression {...etape} />;
  const barre = (onRetour || onPasser || (!isDesktop && etape)) && (
    <div className="en-barre">
      <span>{onRetour && <button type="button" className="en-retour" onClick={onRetour} aria-label="Retour"><Chevron />{isDesktop && 'Retour'}</button>}</span>
      <span className="en-barre-centre">{!isDesktop && etape && (
        <>{etape.libelle !== false && <span className="en-sur">Étape {etape.n} sur {etape.total}</span>}{points}</>
      )}</span>
      <span className="en-barre-droite">{onPasser && <button type="button" className="en-passer" onClick={onPasser}>Passer</button>}</span>
    </div>
  );
  const reviz = (
    <div className="en-reviz">
      <BulleReviz key={texte} lignes={bulle} parle={parle} grande={isDesktop} className="en-bulle" />
      <Pantin ref={pantin} size={isDesktop ? tOrdi : tTel} expression={expression} entree={geste ?? 'saut'} repli={null}
        onEntree={() => setParle(true)} onClick={() => pantin.current?.geste('saut')} label="Réviz, ta mascotte" />
    </div>
  );
  const deco = (
    <>
      <span className="en-deco en-deco--a" aria-hidden="true" />
      <span className="en-deco en-deco--b" aria-hidden="true" />
      <span className="en-point" aria-hidden="true" />
      <span className="ch-grain" aria-hidden="true" />
    </>
  );

  if (isDesktop) {
    return (
      <div className={`app app--no-halo app--large en-page en-page--large en--${teinte}`}>
        <div className="en-hero">
          {deco}
          <span className="en-logo">Réviz</span>
          {reviz}
        </div>
        <div className="en-droite">
          {barre}
          <div className="en-carte">
            {etape && (
              <div className="en-carte-tete">
                {etape.libelle !== false ? <span className="en-sur">Étape {etape.n} sur {etape.total}</span> : <span className="en-sur">{etape.n} sur {etape.total}</span>}
                {points}
              </div>
            )}
            {children}
            {dessous && <div className="en-dessous">{dessous}</div>}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`app app--no-halo en-page en--${teinte} en--${taille}`}>
      <div className="content en-defile">
        <div className="en-hero">
          {deco}
          {barre}
          {logo && <span className="en-logo">Réviz</span>}
          {reviz}
        </div>
        <div className="en-carte">{children}</div>
        {dessous && <div className="en-dessous">{dessous}</div>}
      </div>
    </div>
  );
}

export function Progression({ n, total }) {
  return (
    <span className="en-points" role="img" aria-label={`Étape ${n} sur ${total}`}>
      {Array.from({ length: total }, (_, i) => <i key={i} className={i + 1 < n ? 'is-fait' : i + 1 === n ? 'is-courant' : ''} />)}
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
