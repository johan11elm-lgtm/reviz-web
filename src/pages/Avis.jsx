import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mascot } from '../components/Mascot';
import { apiFetch, IS_NATIVE } from '../services/apiClient';
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

function device() {
  if (IS_NATIVE) return 'app';
  try { return window.matchMedia('(min-width: 1024px)').matches ? 'ordinateur' : 'mobile'; }
  catch { return 'mobile'; }
}

/** Groupe de pastilles à choix unique (boutons radio stylés). */
function Choix({ name, legend, options, value, onChange }) {
  return (
    <fieldset className="avis-field">
      <legend className="avis-label">{legend}</legend>
      <div className="avis-choix">
        {options.map(o => (
          <label key={o.id} className={`avis-pastille${value === o.id ? ' avis-pastille--on' : ''}`}>
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
    </fieldset>
  );
}

/**
 * Page publique « Votre avis » : sans compte ni Firebase côté client, pour
 * les enseignants qui arrivent par le QR code de l'affiche comme pour les
 * élèves (lien depuis le profil). L'avis part vers /api/avis.
 */
export default function Avis() {
  const [params] = useSearchParams();
  const source = SOURCES.includes(params.get('src')) ? params.get('src') : 'direct';

  // Arrivée par l'affiche de la salle des profs : profil présélectionné.
  const [profil, setProfil] = useState(source === 'affiche-profs' ? 'enseignant' : '');
  const [discipline, setDiscipline] = useState('');
  const [conseil, setConseil] = useState('');
  const [plait, setPlait] = useState('');
  const [manque, setManque] = useState('');
  const [autre, setAutre] = useState('');
  const [email, setEmail] = useState('');
  const [site, setSite] = useState('');
  const [etat, setEtat] = useState('saisie'); // saisie | envoi | merci
  const [erreur, setErreur] = useState('');

  async function envoyer(e) {
    e.preventDefault();
    if (!profil) return setErreur(ERREURS.PROFIL);
    if (!conseil && !plait.trim() && !manque.trim() && !autre.trim()) return setErreur(ERREURS.VIDE);
    setErreur('');
    setEtat('envoi');
    try {
      const res = await apiFetch('/api/avis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profil, discipline: profil === 'enseignant' ? discipline : '', conseil,
          plait, manque, autre, email, site, source, device: device(),
        }),
      });
      if (res.ok) return setEtat('merci');
      const data = await res.json().catch(() => ({}));
      setErreur(ERREURS[data.error] || "L'envoi n'a pas abouti. Réessayez dans un instant.");
    } catch {
      setErreur("Pas de connexion pour l'instant. Votre texte est gardé : réessayez dans un instant.");
    }
    setEtat('saisie');
  }

  return (
    <div className="app avis-page">
      <nav className="avis-nav" aria-label="Navigation">
        <Link to="/" className="avis-logo" aria-label="Réviz, accueil">
          <Mascot pose="hello" size={28} priority alt="" aria-hidden="true" />
          <span>réviz</span>
        </Link>
        {source === 'affiche-profs'
          ? <Link to="/profs" className="avis-nav-link">Découvrir l'appli</Link>
          : <Link to="/essai" className="avis-nav-link">Essayer sans compte</Link>}
      </nav>

      <div className="avis-scroll">
        <main className="avis-layout">
          <section className="avis-intro">
            <div className="rv-page-intro avis-page-intro">
              <div className="rv-page-intro-text">
                <h1 className="rv-greeting-title rv-page-intro-title">Votre avis</h1>
                <p className="rv-greeting-sub rv-page-intro-sub">
                  Deux minutes, sans compte. Chaque avis est lu et sert à corriger ou améliorer Réviz.
                </p>
              </div>
              <Mascot pose="writing" size={140} priority className="rv-page-intro-mascot" alt="" aria-hidden="true" />
            </div>

            {etat !== 'merci' && <div className="avis-aide">
              <p className="avis-aide-titre">Ce qui aide le plus</p>
              <ul>
                <li>Une erreur repérée dans un chapitre de votre matière</li>
                <li>Ce qui manque pour que vous le conseilliez à vos élèves</li>
                <li>Ce qui gêne à l'usage, sur ordinateur ou sur téléphone</li>
              </ul>
              <p className="avis-aide-note">
                Les chapitres sont rédigés avec l'aide de l'IA à partir des programmes officiels, de la 6e à la 3e, et
                pas encore tous relus par des enseignants.
              </p>
            </div>}
          </section>

          {etat === 'merci' ? (
            <section className="rv-card avis-card avis-merci" aria-live="polite">
              <Mascot pose="celebration" size={132} alt="" aria-hidden="true" />
              <h2 className="avis-merci-titre">Merci, c'est bien arrivé.</h2>
              <p className="avis-merci-sub">
                {email.trim()
                  ? 'Vous aurez une réponse à l’adresse indiquée.'
                  : 'Votre avis sera lu avec attention.'}
              </p>
              {source === 'affiche-profs'
                ? <Link to="/profs" className="rv-btn-cta rv-btn-cta--center avis-merci-cta">Découvrir l'appli</Link>
                : <Link to="/essai" className="rv-btn-cta rv-btn-cta--center avis-merci-cta">Essayer Réviz sans compte</Link>}
            </section>
          ) : (
            <form className="rv-card avis-card avis-form" onSubmit={envoyer} noValidate>
              <Choix name="profil" legend="Vous êtes" options={PROFILS} value={profil} onChange={v => { setProfil(v); setErreur(''); }} />

              {profil === 'enseignant' && (
                <div className="avis-field">
                  <label className="avis-label" htmlFor="avis-discipline">Votre matière ou fonction</label>
                  <select
                    id="avis-discipline"
                    className="avis-input avis-select"
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
                onChange={v => { setConseil(v); setErreur(''); }}
              />

              <div className="avis-field">
                <label className="avis-label" htmlFor="avis-plait">Ce qui vous plaît</label>
                <textarea
                  id="avis-plait"
                  className="avis-input avis-textarea"
                  rows={3}
                  maxLength={2000}
                  value={plait}
                  onChange={e => setPlait(e.target.value)}
                />
              </div>

              <div className="avis-field">
                <label className="avis-label" htmlFor="avis-manque">Ce qui manque, ou une erreur repérée</label>
                <textarea
                  id="avis-manque"
                  className="avis-input avis-textarea"
                  rows={4}
                  maxLength={2000}
                  placeholder="Par exemple : en 4e, chapitre « Les fractions », la question 3 du quiz…"
                  value={manque}
                  onChange={e => setManque(e.target.value)}
                />
              </div>

              <div className="avis-field">
                <label className="avis-label" htmlFor="avis-autre">Autre chose ?</label>
                <textarea
                  id="avis-autre"
                  className="avis-input avis-textarea"
                  rows={3}
                  maxLength={2000}
                  placeholder="Une idée, une question, une remarque…"
                  value={autre}
                  onChange={e => setAutre(e.target.value)}
                />
              </div>

              <div className="avis-field">
                <label className="avis-label" htmlFor="avis-email">Votre e-mail <span>(facultatif)</span></label>
                <input
                  id="avis-email"
                  className="avis-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={200}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <p className="avis-hint">Seulement pour vous répondre. Rien d'autre n'en est fait.</p>
              </div>

              {/* Champ piège : invisible pour les humains, rempli par les robots. */}
              <div className="avis-piege" aria-hidden="true">
                <label htmlFor="avis-site">Site web</label>
                <input id="avis-site" type="text" tabIndex={-1} autoComplete="off" value={site} onChange={e => setSite(e.target.value)} />
              </div>

              {erreur && <p className="avis-erreur" role="alert">{erreur}</p>}

              <button type="submit" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--center" disabled={etat === 'envoi'}>
                {etat === 'envoi' ? 'Envoi…' : 'Envoyer mon avis'}
              </button>
              <p className="avis-legal">
                Aucun compte demandé, aucun suivi. <Link to="/legal/confidentialite">Confidentialité</Link>
              </p>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
