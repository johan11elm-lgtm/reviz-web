import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useModalA11y } from '../hooks/useModalA11y';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { Mascot } from './Mascot';
import { CameraIcon } from './Icons';
import { ajouterControle } from '../services/agendaService';
import { track } from '../services/statsService';
import { MATIERES_CONTROLE, jourIso, ajouterJours, jourCourt, jourEnClair, matiereDuCours } from '../utils/agenda';
import { loadCatalogue } from '../services/programmeService';
import { hasProgramme, isProgrammeLessonId } from '../utils/programme';
import { loadLessons } from '../services/historyService';
import '../pages/Agenda.css';

// Fond et tranche de chaque matière (handoff Agenda du 21/10).
const COULEURS = {
  maths: ['var(--rv-lavande)', 'var(--rv-lavande-bulle)'],
  francais: ['var(--rv-rose)', 'var(--rv-rose-tranche)'],
  histoire: ['var(--rv-peche-pale)', 'var(--rv-peche-bulle)'],
  geographie: ['var(--rv-peche-pale)', 'var(--rv-peche-bulle)'],
  svt: ['var(--rv-menthe)', 'var(--rv-menthe-tranche)'],
  'physique-chimie': ['var(--rv-lavande)', 'var(--rv-lavande-bulle)'],
  technologie: ['var(--rv-menthe)', 'var(--rv-menthe-tranche)'],
  anglais: ['var(--rv-menthe)', 'var(--rv-menthe-tranche)'],
  autre: ['#F3E6DA', '#EADBCB'],
};
export const couleursMatiere = slug => {
  const [fond, tranche] = COULEURS[slug] ?? COULEURS.autre;
  return { fond, tranche };
};

const JOURS_SEMAINE = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// Les prochains jours d'école (sans samedi ni dimanche), à partir de demain.
function prochainsJours(n) {
  const jours = [];
  let j = jourIso();
  while (jours.length < n) {
    j = ajouterJours(j, 1);
    const d = new Date(`${j}T12:00`).getDay();
    if (d !== 0 && d !== 6) jours.push(j);
  }
  return jours;
}

/** Calendrier d'un mois : jours passés grisés, week-end atténué. */
function Calendrier({ valeur, onChange }) {
  const auj = jourIso();
  const [mois, setMois] = useState(() => (valeur || auj).slice(0, 7));
  const [a, m] = mois.split('-').map(Number);
  const premier = new Date(a, m - 1, 1);
  const decalage = (premier.getDay() + 6) % 7;
  const nb = new Date(a, m, 0).getDate();
  const cases = [...Array(decalage).fill(null), ...Array.from({ length: nb }, (_, i) => `${mois}-${String(i + 1).padStart(2, '0')}`)];
  const changer = d => {
    const x = new Date(a, m - 1 + d, 1);
    setMois(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`);
  };
  return (
    <div className="ag-cal">
      <div className="ag-cal-tete">
        <button type="button" onClick={() => changer(-1)} disabled={mois <= auj.slice(0, 7)} aria-label="Mois précédent">‹</button>
        <b>{MOIS[m - 1]} {a}</b>
        <button type="button" onClick={() => changer(1)} aria-label="Mois suivant">›</button>
      </div>
      <div className="ag-cal-grille">
        {JOURS_SEMAINE.map((j, i) => <span key={i} className="ag-cal-nom">{j}</span>)}
        {cases.map((j, i) => j ? (
          <button key={j} type="button" className={`ag-cal-jour${j === valeur ? ' is-choisi' : ''}${i % 7 > 4 ? ' is-weekend' : ''}${j === auj ? ' is-auj' : ''}`}
            disabled={j < auj} onClick={() => onChange(j)} aria-label={jourEnClair(j)} aria-pressed={j === valeur}>{Number(j.slice(8))}</button>
        ) : <span key={i} />)}
      </div>
    </div>
  );
}

/**
 * « Ajouter un contrôle » (handoff Agenda du 21/10) : la matière en pastilles, la date en tuiles
 * (« Demain » et les prochains jours d'école, puis « Autre date » et le calendrier), l'intitulé
 * facultatif. Feuille du bas sur téléphone, fenêtre à deux colonnes sur ordinateur. `initial`
 * peut pré-remplir matière et date (cours touché dans l'emploi du temps).
 */
/** Les cours que l'élève a scannés dans cette matière (les chapitres ouverts depuis le programme à part). */
function coursScannes(matiere) {
  return loadLessons().filter(l => {
    if (isProgrammeLessonId(l.id) || !l.aiData) return false;
    const m = matiereDuCours(l.metadata?.subject ?? '') ?? matiereDuCours(l.matiere ?? '');
    return matiere === 'autre' ? !m || m === 'autre' : m === matiere;
  });
}

const scanneLe = t => (t ? `Scanné le ${new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : 'Cours scanné');

function LigneChapitre({ coche, onClick, marque, nom, sous }) {
  return (
    <li>
      <button type="button" role="checkbox" aria-checked={coche} className={`ag-chapitre${coche ? ' is-coche' : ''}`} onClick={onClick}>
        <span className="ag-chapitre-case" aria-hidden="true">{coche && (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        )}</span>
        {marque}
        <span className="ag-chapitre-nom">{nom}{sous && <span className="ag-chapitre-sous">{sous}</span>}</span>
      </button>
    </li>
  );
}

/**
 * Ce qui tombe au contrôle, comme l'assistant d'évaluation de l'app Nomad : les cours que l'élève a
 * scannés dans la matière, puis les chapitres du programme de sa classe. Il en coche au moins un
 * (sinon le plan le ferait réviser ce qui n'est pas au contrôle). L'étape se voit dès l'ouverture
 * (« choisis la matière ») ; sur téléphone, la feuille descend jusqu'à la liste quand elle arrive.
 * Sans rien à cocher (« Autre » sans cours scanné, catalogue indisponible), l'intitulé devient
 * obligatoire. `classe` nulle (lycée, classe inconnue) : pas de programme à proposer — surtout pas
 * celui de 3e montré ailleurs par défaut —, seulement les cours scannés. `onChoix` reçoit le nombre
 * de choix possibles (null tant qu'on charge).
 */
function ChoixChapitres({ classe, matiere, choisis, onChange, onChoix, defiler }) {
  const [etat, setEtat] = useState({ pour: null, chapitres: [], programme: null });
  const titre = useRef(null);
  const scans = useMemo(() => (matiere ? coursScannes(matiere) : []), [matiere]);
  useEffect(() => {
    if (!matiere || matiere === 'autre' || !classe) return undefined;
    let vivant = true;
    loadCatalogue(classe)
      .then(c => {
        const m = c?.matieres?.find(x => x.slug === matiere);
        if (vivant) setEtat({ pour: matiere, chapitres: m?.chapitres ?? [], programme: m?.matiere ?? null });
      })
      .catch(() => { if (vivant) setEtat({ pour: matiere, chapitres: [], programme: null }); });
    return () => { vivant = false; };
  }, [classe, matiere]);
  const sansProgramme = matiere === 'autre' || !classe;
  const charge = sansProgramme || (Boolean(matiere) && etat.pour === matiere);
  const programme = !sansProgramme && etat.pour === matiere ? etat.chapitres : [];
  const nbChoix = charge ? programme.length + scans.length : null;
  useEffect(() => { onChoix?.(nbChoix); }, [nbChoix, onChoix]);
  useEffect(() => {
    if (!nbChoix || !defiler) return;
    const doux = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    titre.current?.scrollIntoView?.({ block: 'start', behavior: doux ? 'smooth' : 'auto' });
  }, [nbChoix, matiere, defiler]);

  const entete = <span className="ag-champ-titre" ref={titre}>Chapitres du contrôle</span>;
  let mot = null;
  if (!matiere) mot = 'Choisis la matière : ses chapitres et tes cours scannés s’affichent ici, tu coches ce qui tombe.';
  else if (!charge) mot = 'Chargement des chapitres…';
  else if (!nbChoix) mot = matiere === 'autre'
    ? 'Pas de chapitres pour « Autre », ni de cours scanné : écris le sujet dans l’intitulé.'
    : !classe
      ? 'Pas encore le programme de ta classe dans Réviz : écris le sujet dans l’intitulé, ou scanne ton cours pour le cocher ici.'
      : 'Pas encore de chapitres pour cette matière : écris le sujet dans l’intitulé.';
  if (mot) return <>{entete}<p className="ag-chapitres-vide" role="status">{mot}</p></>;

  const estCoche = id => choisis.some(c => c.id === id);
  const basculer = ch => {
    onChange(estCoche(ch.id) ? choisis.filter(c => c.id !== ch.id) : [...choisis, ch], !sansProgramme && etat.pour === matiere ? etat.programme : null);
  };
  const deuxListes = scans.length > 0 && programme.length > 0;
  return (
    <>
      {entete}
      <p className="ag-champ-aide">Coche ce qui tombe : ton plan et ton contrôle blanc porteront dessus, et seulement dessus.</p>
      {scans.length > 0 && (
        <>
          {deuxListes && <span className="ag-groupe">Tes cours scannés</span>}
          <ul className="ag-chapitres ag-chapitres--scans" aria-label="Tes cours scannés">
            {scans.map(l => (
              <LigneChapitre key={l.id} coche={estCoche(l.id)} onClick={() => basculer({ id: l.id, titre: l.metadata?.title ?? 'Cours scanné', scan: true })}
                marque={<span className="ag-chapitre-scan" aria-hidden="true"><CameraIcon /></span>}
                nom={l.metadata?.title ?? 'Cours scanné'} sous={scanneLe(l.scannedAt)} />
            ))}
          </ul>
        </>
      )}
      {programme.length > 0 && (
        <>
          {deuxListes && <span className="ag-groupe">Programme de {classe.replace('ème', 'e')}</span>}
          <ul className="ag-chapitres" aria-label="Chapitres du programme">
            {programme.map((ch, i) => (
              <LigneChapitre key={ch.id} coche={estCoche(ch.id)} onClick={() => basculer({ id: ch.id, titre: ch.titre })}
                marque={<span className="ag-chapitre-num" aria-hidden="true">{i + 1}</span>} nom={ch.titre} />
            ))}
          </ul>
        </>
      )}
      {!scans.length && <p className="ag-chapitres-astuce">Ton cours est en photo ? Scanne-le : il s’ajoutera ici pour tes prochains contrôles.</p>}
    </>
  );
}

export function AjoutControle({ initial = {}, onClose, onSaved }) {
  const { currentUser, getUserLevel } = useAuth();
  const niveau = getUserLevel?.();
  // Sans programme pour sa classe (lycée), on ne lui propose pas celui de 3e : ses cours scannés seulement.
  const classe = hasProgramme(niveau) ? niveau.classe : null;
  const [chapitres, setChapitres] = useState([]);
  const [programme, setProgramme] = useState(null);
  const isDesktop = useIsDesktop();
  const ref = useModalA11y(onClose);
  const tuiles = prochainsJours(4);
  const dateInitiale = initial.date && initial.date >= jourIso() ? initial.date : null;
  const [matiere, setMatiere] = useState(initial.matiere ?? null);
  const [date, setDate] = useState(dateInitiale);
  const [calendrier, setCalendrier] = useState(isDesktop || (dateInitiale && !tuiles.includes(dateInitiale)));
  const [titre, setTitre] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [nbChoix, setNbChoix] = useState(null);
  const demain = ajouterJours(jourIso(), 1);
  // Ce qui manque pour noter le contrôle : il faut savoir sur quoi il porte (un chapitre coché,
  // ou l'intitulé quand il n'y a rien à cocher).
  const manque = !matiere ? 'Choisis la matière.'
    : nbChoix === null ? 'Chargement des chapitres…'
      : nbChoix > 0 && !chapitres.length ? 'Coche au moins un chapitre du contrôle.'
        : nbChoix === 0 && !titre.trim() ? 'Écris sur quoi porte le contrôle.'
          : !date ? 'Choisis la date.' : null;

  async function enregistrer(e) {
    e.preventDefault();
    if (manque) return;
    setEnvoi(true);
    setErreur('');
    try {
      const agenda = await ajouterControle(currentUser, { matiere, titre: titre.trim(), date, chapitres, classe, programme });
      track('agenda_controle_ajoute', { matiere, chapitres: chapitres.length });
      onSaved(agenda);
    } catch {
      setErreur('Le contrôle n’a pas pu être enregistré. Réessaie.');
      setEnvoi(false);
    }
  }

  const formulaire = (
    <>
      <span className="ag-champ-titre">Matière</span>
      <div className="ag-matieres">
        {MATIERES_CONTROLE.map(x => {
          const choisie = matiere === x.slug;
          return (
            <button key={x.slug} type="button" className={`ag-matiere${choisie ? ' is-choisie' : ''}`} aria-pressed={choisie} onClick={() => { if (x.slug !== matiere) setChapitres([]); setMatiere(x.slug); }}>
              <span className="ag-matiere-rond" aria-hidden="true"><Mascot pose={x.mascot} size={30} alt="" /></span>
              {x.slug === 'autre' ? 'Autre' : x.label}
            </button>
          );
        })}
      </div>
      <ChoixChapitres classe={classe} matiere={matiere} choisis={chapitres} defiler={!isDesktop} onChoix={setNbChoix} onChange={(c, p) => { setChapitres(c); setProgramme(p); }} />
      <span className="ag-champ-titre">Date</span>
      {!isDesktop && (
        <div className="ag-dates">
          {tuiles.map(j => (
            <button key={j} type="button" className={`ag-date-tuile${date === j ? ' is-choisie' : ''}`} aria-pressed={date === j} onClick={() => { setDate(j); setCalendrier(false); }}>
              <span>{j === demain ? 'Demain' : jourCourt(j).replace('.', '').replace(/^./, c => c.toUpperCase())}</span>
              <b>{Number(j.slice(8))}</b>
            </button>
          ))}
          <button type="button" className={`ag-date-tuile ag-date-tuile--autre${calendrier ? ' is-choisie' : ''}`} aria-pressed={calendrier} onClick={() => setCalendrier(true)}>Autre date</button>
        </div>
      )}
      {calendrier && !isDesktop && <Calendrier valeur={date} onChange={setDate} />}
      {date && <p className="ag-date-choisie">{jourEnClair(date).replace(/^./, c => c.toUpperCase())}</p>}
      <label className="ag-champ-titre" htmlFor="ajout-intitule">Intitulé {nbChoix !== 0 && <span>facultatif</span>}</label>
      <input id="ajout-intitule" className="ag-input" type="text" maxLength={80} placeholder={nbChoix === 0 ? 'Sur quoi porte le contrôle' : chapitres.length ? 'Pris sur les chapitres cochés' : 'Chapitre ou sujet'} value={titre} onChange={e => setTitre(e.target.value)} />
      {erreur && <p className="ag-erreur" role="alert">{erreur}</p>}
    </>
  );

  // Portail : la fenêtre passe au-dessus de la barre du haut, comme l'offre Réviz+.
  return createPortal(
    <div className="ag-voile" onClick={onClose}>
      <form className={`ag-feuille${isDesktop ? ' ag-feuille--fenetre' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby="ajout-controle-titre"
        onClick={e => e.stopPropagation()} onSubmit={enregistrer} noValidate>
        {!isDesktop && <span className="ag-poignee" aria-hidden="true" />}
        <div className="ag-feuille-tete">
          <h2 id="ajout-controle-titre">Ajouter un contrôle</h2>
          <button type="button" className="ag-fermer" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {isDesktop ? (
          <div className="ag-feuille-deux">
            <div>{formulaire}</div>
            <Calendrier valeur={date} onChange={setDate} />
          </div>
        ) : formulaire}
        <div className="ag-feuille-pied">
          {matiere && manque && nbChoix !== null && <p className="ag-manque" role="status">{manque}</p>}
          {isDesktop && <button type="button" className="ag-btn ag-btn--creme" onClick={onClose}>Annuler</button>}
          <button type="submit" className="ag-btn" disabled={envoi || Boolean(manque)}>{envoi ? 'Enregistrement…' : 'Ajouter'}</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
