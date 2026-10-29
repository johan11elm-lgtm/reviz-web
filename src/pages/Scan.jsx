import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useModalA11y } from '../hooks/useModalA11y';
import { Mascot } from '../components/Mascot';
import { DecouvrirRevizPlus, ToastPaiementAnnule } from '../components/revizplus/RevizPlusOffre';
import { RevizPlusBadge } from '../components/RevizPlus';
import { BottomNav } from '../components/BottomNav';
import { startAnalysis, startAnalysisFromImage } from '../services/aiService';
import { getScanStatus } from '../services/scanLimitService';
import { LESSON_TEXT_MAX_LABEL, isLessonTextTooLong, truncateLessonText } from '../utils/lessonText';
import { TEINTES, varsTeinte } from '../utils/teinteMatiere';
import '../components/reviz/HerosMatiere.css';
import './Scan.css';

const MIN = 200;
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const nombre = n => n.toLocaleString('fr-FR');

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
);
const Croix = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
);
const Fleche = ({ taille = 18 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
const PetitChevron = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
);
const Appareil = ({ taille = 24 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
);
const Image = ({ taille = 22 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><circle cx="9" cy="9" r="1.8" /><path d="m20 15-4.5-4.5L6 20" /></svg>
);
const Lignes = ({ taille = 22 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h9" /></svg>
);
const SansCamera = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><path d="M3 3l18 18" /></svg>
);

// Conseils de prise de vue : version longue (ordinateur) et courte (sous le viseur).
const CONSEILS = [
  { titre: 'Cadre droit.', texte: 'Le texte horizontal, sans angle.', court: 'Texte horizontal, sans angle.' },
  { titre: 'Bien éclairé.', texte: 'Évite les ombres et les reflets.', court: 'Évite ombres et reflets.' },
  { titre: 'Texte net.', texte: 'Approche-toi jusqu’à ce que les lettres soient lisibles.', court: 'Approche-toi jusqu’à bien lire.' },
  { titre: 'Une leçon à la fois.', texte: 'Pas plusieurs énoncés sur la même photo.', court: 'Pas plusieurs énoncés.' },
];

/** Le quota de la semaine : segments, ou Réviz+ et scans illimités. */
function Quota({ statut, plus, onOffre, grand }) {
  if (plus || !Number.isFinite(statut.remaining)) {
    return (
      <div className="sc-quota sc-quota--plus">
        <RevizPlusBadge />
        <span className="sc-quota-plus-txt"><b>Scans illimités</b>{grand && <span>Scanne autant de leçons que tu veux.</span>}</span>
      </div>
    );
  }
  return (
    <div className="sc-quota">
      {grand && <span className="sc-sur">Cette semaine</span>}
      <b>{statut.remaining > 0 ? `${pluriel(statut.remaining, 'scan')} ${statut.remaining > 1 ? 'restants' : 'restant'} cette semaine` : 'Plus de scan cette semaine'}</b>
      <span className="sc-segments" aria-hidden="true">
        {Array.from({ length: statut.limit }, (_, i) => <i key={i} className={i < statut.remaining ? 'is-reste' : ''} />)}
      </span>
      <button type="button" className="sc-lien" onClick={onOffre}>Illimité avec Réviz+<PetitChevron /></button>
    </div>
  );
}


/**
 * Scanner une leçon (handoff Claude Design du 21/10) : choisir comment donner sa leçon (photo,
 * import, texte collé), viser, vérifier la photo, puis l'analyse part et la fiche du chapitre
 * prend le relais (préparation et erreurs). Quota atteint et mode essai remplacent le choix.
 * Ordinateur : zone de dépôt, texte et conseils côte à côte ; la caméra seulement si elle existe.
 */
export default function Scan() {
  // `?mode=texte` (retour depuis une erreur d'Analyse) : texte collé restauré, pour corriger sans tout recoller.
  const [params] = useSearchParams();
  const restaure = params.get('mode') === 'texte';
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { getUserLevel, isGuest, hasRevizPlus } = useAuth();
  const niveau = getUserLevel();
  const [ecran, setEcran] = useState(restaure && !isDesktop ? 'texte' : 'choix'); // choix | viseur | apercu | texte
  const [texte, setTexte] = useState(() => (restaure && localStorage.getItem('reviz-lesson-text')) || '');
  const [photo, setPhoto] = useState(null);
  const [camera, setCamera] = useState('starting'); // starting | active | denied | none
  const [aCamera, setACamera] = useState(!isDesktop);
  const [depot, setDepot] = useState(false);
  const [offre, setOffre] = useState(false);
  // Retour de Stripe sans payer (api/_checkout.js) : un petit mot, puis l'adresse redevient propre.
  const [annule, setAnnule] = useState(() => params.get('revizplus') === 'annule');
  const fermerAnnule = useCallback(() => setAnnule(false), []);
  useEffect(() => {
    if (params.get('revizplus') === 'annule') window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [niveauManquant, setNiveauManquant] = useState(false);
  const video = useRef(null);
  const flux = useRef(null);
  const fichier = useRef(null);
  const statut = getScanStatus();

  // Ordinateur : la caméra n'est proposée que si le poste en a une.
  useEffect(() => {
    if (!isDesktop) return;
    navigator.mediaDevices?.enumerateDevices?.()
      .then(l => setACamera(l.some(d => d.kind === 'videoinput')))
      .catch(() => {});
  }, [isDesktop]);

  // Le viseur allume la caméra, et l'éteint en le quittant.
  useEffect(() => {
    if (ecran !== 'viseur') return;
    let annule = false;
    setCamera('starting');
    (async () => {
      try {
        let s;
        try { s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); }
        catch (e) { if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') throw e; s = await navigator.mediaDevices.getUserMedia({ video: true }); }
        if (annule) { s.getTracks().forEach(t => t.stop()); return; }
        flux.current = s;
        setCamera('active');
      } catch (e) {
        if (!annule) setCamera(e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError' ? 'denied' : 'none');
      }
    })();
    return () => {
      annule = true;
      flux.current?.getTracks().forEach(t => t.stop());
      flux.current = null;
    };
  }, [ecran]);
  useEffect(() => {
    if (camera === 'active' && video.current && flux.current) video.current.srcObject = flux.current;
  }, [camera]);

  if (isGuest) return <Essai onCompte={() => navigate('/inscription')} onConnexion={() => navigate('/connexion')} onProgramme={() => navigate('/programme')} grand={isDesktop} />;

  const retour = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/cours'));
  const pret = () => {
    if (!niveau?.cycle) { setNiveauManquant(true); return false; }
    return true;
  };
  function declencher() {
    if (camera !== 'active' || !video.current) return;
    const c = document.createElement('canvas');
    c.width = video.current.videoWidth;
    c.height = video.current.videoHeight;
    c.getContext('2d').drawImage(video.current, 0, 0);
    setPhoto(c.toDataURL('image/jpeg', 0.9));
    setEcran('apercu');
  }
  function importer(f) {
    if (!f || !f.type?.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = ev => { setPhoto(ev.target.result); setEcran('apercu'); };
    r.readAsDataURL(f);
  }
  function analyserPhoto() {
    if (!pret()) return;
    localStorage.removeItem('reviz-ai-data');
    localStorage.removeItem('reviz-lesson-text');
    localStorage.setItem('reviz-captured-image', photo);
    startAnalysisFromImage(photo, niveau); // l'appel part tout de suite ; la fiche affiche la préparation
    // La fiche remplace le scan : « Mes leçons » de la fiche ne retombe pas sur le viseur.
    navigate('/analyse', { replace: true, state: { depuisScan: true } });
  }
  const long = isLessonTextTooLong(texte);
  const assez = texte.trim().length >= MIN;
  function analyserTexte() {
    if (!assez || !pret()) return;
    const t = long ? truncateLessonText(texte) : texte;
    localStorage.removeItem('reviz-ai-data');
    localStorage.setItem('reviz-lesson-text', t);
    startAnalysis(t, niveau);
    navigate('/analyse', { replace: true, state: { depuisScan: true } });
  }

  const inputFichier = <input ref={fichier} type="file" accept="image/*" hidden onChange={e => importer(e.target.files?.[0])} />;
  const fenetres = (
    <>
      {offre && <DecouvrirRevizPlus onClose={() => setOffre(false)} />}
      {annule && <ToastPaiementAnnule onClose={fermerAnnule} />}
      {niveauManquant && <NiveauManquant onClose={() => setNiveauManquant(false)} onProfil={() => navigate('/profil')} />}
    </>
  );
  const racine = `app app--no-halo ch-page sc-page${isDesktop ? ' app--large ch-page--large sc-page--large' : ''}`;

  // ── Quota atteint : la carte remplace le choix ──
  if (!statut.canScan && !hasRevizPlus) {
    return (
      <div className={`${racine} sc-page--carte`} style={varsTeinte(TEINTES.peche)}>
        <header className="sn-entete">
          <div className="ch-haut"><button type="button" className="ch-retour" onClick={retour}><Chevron />Mes leçons</button></div>
        </header>
        <Reviz expression="endormi" lignes={['Belle semaine de travail.', 'Je fais une pause jusqu’à lundi.']} grand={isDesktop} />
        <div className="sc-carte sc-carte--etat">
          <h1 className="sc-carte-titre">Tu as utilisé tes scans de la semaine.</h1>
          <p className="sc-carte-txt">Ils reviennent lundi.</p>
          <span className="sc-segments sc-segments--large" aria-hidden="true">{Array.from({ length: statut.limit }, (_, i) => <i key={i} />)}</span>
          <button type="button" className="sc-btn" onClick={() => setOffre(true)}>Scans illimités avec Réviz+</button>
          <button type="button" className="sc-btn sc-btn--creme" onClick={() => navigate('/programme')}>Réviser mon programme en attendant</button>
        </div>
        {fenetres}
      </div>
    );
  }

  // ── Viseur ──
  if (ecran === 'viseur') {
    return (
      <div className={`${racine} sc-page--outil`}>
        <div className="sc-barre">
          <button type="button" className="sc-rond" onClick={() => setEcran('choix')} aria-label="Fermer la caméra"><Croix /></button>
          <h1>Ta leçon en photo</h1>
          {Number.isFinite(statut.remaining) && !hasRevizPlus
            ? <span className="sc-puce"><i />{statut.remaining} {statut.remaining > 1 ? 'restants' : 'restant'}</span>
            : null}
        </div>
        <div className="sc-outil">
          <PetitReviz expression="determine" lignes={['Cadre toute la page.', isDesktop ? 'Tiens la page bien à plat.' : 'Entre les quatre coins.']} />
          <div className={`sc-viseur sc-viseur--${camera}`}>
            <video ref={video} autoPlay playsInline muted className={camera === 'active' ? '' : 'sc-cache'} />
            {camera === 'active' && <span className="sc-coins" aria-hidden="true"><i /><i /><i /><i /></span>}
            {camera === 'starting' && <p className="sc-viseur-etat"><span className="sc-anneau" aria-hidden="true" />J’allume la caméra…</p>}
            {(camera === 'denied' || camera === 'none') && (
              <div className="sc-refus">
                <b>{camera === 'denied' ? 'Accès caméra refusé' : 'Pas de caméra ici'}</b>
                <span>{camera === 'denied'
                  ? 'Pour l’autoriser, ouvre les réglages de ton téléphone (ou de ton navigateur), puis active l’appareil photo pour Réviz. Tu peux aussi importer une photo.'
                  : 'Importe une photo ou colle le texte de ta leçon.'}</span>
                <button type="button" className="sc-btn sc-btn--petit" onClick={() => fichier.current?.click()}>Importer une photo</button>
              </div>
            )}
          </div>
          <ul className="sc-conseils sc-conseils--courts">
            {CONSEILS.map(c => <li key={c.titre}><b>{c.titre}</b><span>{c.court}</span></li>)}
          </ul>
          <div className="sc-declencheur-ligne">
            <button type="button" className="sc-bouton-rond sc-bouton-rond--lavande" onClick={() => fichier.current?.click()} aria-label="Importer une photo"><Image /></button>
            <span className="sc-legende">Importer</span>
            <button type="button" className="sc-declencheur" onClick={declencher} disabled={camera !== 'active'} aria-label="Prendre la photo" />
            <button type="button" className="sc-bouton-rond sc-bouton-rond--menthe" onClick={() => setEcran('texte')} aria-label="Coller le texte"><Lignes /></button>
            <span className="sc-legende">Texte</span>
          </div>
        </div>
        {inputFichier}
        {fenetres}
      </div>
    );
  }

  // ── Aperçu ──
  if (ecran === 'apercu' && photo) {
    return (
      <div className={`${racine} sc-page--outil`}>
        <div className="sc-barre">
          <button type="button" className="sc-rond" onClick={() => setEcran(aCamera ? 'viseur' : 'choix')} aria-label="Retour"><Chevron /></button>
          <h1>Vérifie ta photo</h1>
        </div>
        <div className="sc-outil">
          <div className="sc-photo"><img src={photo} alt="La photo de ta leçon" /></div>
          <PetitReviz expression="reflechit" lignes={['Tout est bien lisible ?', 'Sinon, reprends-la.']} />
          <div className="sc-deux">
            <button type="button" className="sc-btn sc-btn--blanc" onClick={() => { setPhoto(null); setEcran(aCamera ? 'viseur' : 'choix'); }}>Reprendre</button>
            <button type="button" className="sc-btn" onClick={analyserPhoto}>C’est bon, analyse</button>
          </div>
          {Number.isFinite(statut.remaining) && !hasRevizPlus && (
            <p className="sc-note">Ce scan utilise 1 de tes {pluriel(statut.remaining, 'scan')} {statut.remaining > 1 ? 'restants' : 'restant'}.</p>
          )}
        </div>
        {fenetres}
      </div>
    );
  }

  // Le champ du texte collé : compteur, « Assez long », et la limite au-delà de laquelle on coupe.
  const champTexte = (
    <div className={`sc-texte${texte ? ' is-rempli' : ''}`}>
      <textarea
        className="scan-textarea"
        value={texte}
        onChange={e => setTexte(e.target.value)}
        placeholder="Colle ici le texte de ta leçon…"
        aria-label="Texte de ta leçon"
        autoFocus={ecran === 'texte'}
      />
      <div className="sc-texte-pied" aria-live="polite">
        <span>{texte.length ? `${nombre(texte.length)} caractères` : '0 caractère'}{!assez && texte.length > 0 ? ` sur ${MIN}` : ''}</span>
        {long ? <span className="sc-pastille sc-pastille--peche"><i />Analyse du début</span>
          : assez ? <span className="sc-pastille"><i />Assez long</span> : null}
      </div>
      {long && <p className="sc-limite"><b>J’analyse jusqu’ici</b>Ton texte est long : j’analyse les {LESSON_TEXT_MAX_LABEL} premiers caractères.</p>}
    </div>
  );
  const boutonAnalyser = (
    <button type="button" className="sc-btn" disabled={!assez} onClick={analyserTexte}>
      {long ? `Analyser les ${LESSON_TEXT_MAX_LABEL} premiers caractères` : 'Analyser ce texte'}{assez && !long && <Fleche />}
    </button>
  );

  // ── Texte collé (téléphone) ──
  if (ecran === 'texte' && !isDesktop) {
    return (
      <div className={`${racine} sc-page--outil`}>
        <div className="sc-barre">
          <button type="button" className="sc-rond" onClick={() => setEcran('choix')} aria-label="Retour"><Chevron /></button>
          <h1>Coller le texte</h1>
        </div>
        <div className="sc-outil">
          <PetitReviz expression="content" lignes={['Colle ta leçon ici.', `${MIN} caractères au moins.`]} />
          {champTexte}
          {boutonAnalyser}
          <button type="button" className="sc-lien sc-lien--centre" onClick={() => setEcran('viseur')}>Prendre une photo plutôt</button>
        </div>
        {fenetres}
      </div>
    );
  }

  // ── Choix ──
  const quota = <Quota statut={statut} plus={hasRevizPlus} onOffre={() => setOffre(true)} grand={isDesktop} />;
  if (isDesktop) {
    return (
      <div className={racine} style={varsTeinte(TEINTES.peche)}>
        <div className="content sc-defile">
          <header className="sn-entete sn-entete--large">
            <div className="ch-haut"><button type="button" className="ch-retour" onClick={retour}><Chevron />Mes leçons</button></div>
            <div className="sn-entete-grille">
              <div>
                <span className="sn-sur">Nouvelle leçon</span>
                <h1 className="sn-titre">Scanner une leçon</h1>
              </div>
              <Reviz expression="content" lignes={['Une photo de ta leçon.', 'Je m’occupe du reste : résumé, flashcards, quiz et carte mentale.']} grand />
            </div>
          </header>
          <div className="sc-colonnes">
            <section className="sc-carte sc-depot-carte" aria-label="Photo de ta leçon">
              <div
                className={`sc-depot${depot ? ' is-survol' : ''}`}
                onDragOver={e => { e.preventDefault(); setDepot(true); }}
                onDragLeave={() => setDepot(false)}
                onDrop={e => { e.preventDefault(); setDepot(false); importer([...(e.dataTransfer?.files ?? [])].find(f => f.type.startsWith('image/'))); }}
              >
                <span className="sc-depot-rond" aria-hidden="true"><Image taille={26} /></span>
                <b>Glisse la photo de ta leçon ici, ou choisis-la</b>
                <button type="button" className="sc-btn sc-btn--petit" onClick={() => fichier.current?.click()}>Choisir une photo</button>
              </div>
              {aCamera ? (
                <button type="button" className="sc-camera" onClick={() => setEcran('viseur')}><Appareil taille={18} /><b>Ta leçon est devant toi ?</b> Utiliser la caméra<PetitChevron /></button>
              ) : (
                <p className="sc-camera sc-camera--sans"><SansCamera /><b>Pas de caméra ici.</b> Importe une photo ou colle le texte.</p>
              )}
            </section>
            <section className="sc-carte sc-texte-carte" aria-label="Coller le texte">
              <div className="sc-texte-tete">
                <span className="sc-mini-rond sc-mini-rond--menthe" aria-hidden="true"><Lignes taille={20} /></span>
                <span><b>Coller le texte</b><span>Au moins {MIN} caractères.</span></span>
              </div>
              {champTexte}
              <div className="sc-texte-action">{boutonAnalyser}</div>
            </section>
            <aside className="sc-cote">
              <div className="sc-carte sc-carte--petite">{quota}</div>
              <div className="sc-carte sc-carte--petite">
                <span className="sc-sur">Pour un bon scan</span>
                <ol className="sc-conseils">
                  {CONSEILS.map((c, i) => <li key={c.titre}><i>{i + 1}</i><span><b>{c.titre}</b><span>{c.texte}</span></span></li>)}
                </ol>
              </div>
            </aside>
          </div>
        </div>
        {inputFichier}
        {fenetres}
      </div>
    );
  }
  return (
    <div className={racine} style={varsTeinte(TEINTES.peche)}>
      <div className="content sc-defile">
        <header className="sn-entete">
          <div className="ch-haut"><button type="button" className="ch-retour" onClick={retour}><Chevron />Mes leçons</button></div>
          <span className="sn-sur">Nouvelle leçon</span>
          <h1 className="sn-titre">Scanner une leçon</h1>
        </header>
        <Reviz expression="content" lignes={['Une photo de ta leçon.', 'Je m’occupe du reste : résumé, flashcards, quiz et carte mentale.']} />
        <button type="button" className="sc-carte sc-photo-carte" onClick={() => setEcran('viseur')}>
          <span className="sc-mini-rond" aria-hidden="true"><Appareil /></span>
          <span className="sc-carte-txt2"><b>Prendre une photo</b><span>Avec la caméra du téléphone</span></span>
          <span className="sc-go" aria-hidden="true"><Fleche /></span>
        </button>
        <div className="sc-paire">
          <button type="button" className="sc-carte sc-petite-carte" onClick={() => fichier.current?.click()}>
            <span className="sc-mini-rond sc-mini-rond--lavande" aria-hidden="true"><Image /></span>
            <b>Importer une photo</b><span>Depuis ta pellicule</span>
          </button>
          <button type="button" className="sc-carte sc-petite-carte" onClick={() => setEcran('texte')}>
            <span className="sc-mini-rond sc-mini-rond--menthe" aria-hidden="true"><Lignes /></span>
            <b>Coller le texte</b><span>{MIN} caractères minimum</span>
          </button>
        </div>
        <div className="sc-carte sc-quota-carte">{quota}</div>
      </div>
      {inputFichier}
      {fenetres}
      <BottomNav />
    </div>
  );
}

// L'émote de Réviz selon ce qu'il dit (les écrans de l'app Nomad n'ont pas de mascotte qui parle :
// un bloc pêche avec le message et une émote, comme l'accueil et l'agenda, 28/10).
const EMOTE = { content: 'scanphone', endormi: 'sleeping', determine: 'scan', reflechit: 'thinking' };

/** Le message de Réviz dans un bloc pêche, son émote dans le coin. */
function Reviz({ expression, lignes, grand }) {
  return (
    <div className={`sn-bloc${grand ? ' sn-bloc--grand' : ''}`}>
      <p className="sn-bloc-txt">{lignes.join(' ')}</p>
      <span className="sn-bloc-reviz rv-levite" aria-hidden="true"><Mascot pose={EMOTE[expression] ?? 'hello'} size={grand ? 104 : 84} alt="" /></span>
    </div>
  );
}

/** Le conseil de Réviz en petit (viseur, aperçu, texte) : une bande lavande, son émote à gauche. */
function PetitReviz({ expression, lignes }) {
  return (
    <div className="sn-petit">
      <span className="sn-petit-reviz" aria-hidden="true"><Mascot pose={EMOTE[expression] ?? 'hello'} size={44} alt="" /></span>
      <p className="sn-petit-txt">{lignes.join(' ')}</p>
    </div>
  );
}

// Ce que Réviz fait d'une leçon scannée (mode essai sur ordinateur, à côté de la carte du compte).
const FORMATS_ESSAI = [
  { titre: 'Un résumé.', texte: 'L’essentiel du chapitre, avec la méthode et les pièges.' },
  { titre: 'Des flashcards.', texte: 'Elles reviennent au bon moment pour ne rien oublier.' },
  { titre: 'Un quiz.', texte: 'Corrigé question par question, avec ton score.' },
  { titre: 'Une carte mentale.', texte: 'Tout le chapitre d’un coup d’œil.' },
];

/** Mode essai : le scan demande un compte gratuit, sans culpabiliser. */
function Essai({ onCompte, onConnexion, onProgramme, grand }) {
  // Ordinateur : la composition du vrai scan (titre et Réviz en haut, trois colonnes), pas une carte
  // seule au milieu d'un grand vide.
  if (grand) return <EssaiLarge onCompte={onCompte} onConnexion={onConnexion} onProgramme={onProgramme} />;
  return (
    <div className={`app app--no-halo ch-page sc-page sc-page--carte${grand ? ' app--large ch-page--large sc-page--large' : ''}`} style={varsTeinte(TEINTES.peche)}>
      <header className="sn-entete">
        <span className="sn-sur">Nouvelle leçon</span>
        <h1 className="sn-titre">Scanner une leçon</h1>
      </header>
      <Reviz expression="content" lignes={['Donne-moi tes leçons.', 'Il te faut juste un compte gratuit.']} grand={grand} />
      <div className="sc-carte sc-carte--etat">
        <h1 className="sc-carte-titre">Garde tes leçons</h1>
        <p className="sc-carte-txt">Ton compte garde tes leçons scannées, tes flashcards et tes quiz.</p>
        <button type="button" className="sc-btn" onClick={onCompte}>Créer mon compte gratuit</button>
        <button type="button" className="sc-btn sc-btn--creme" onClick={onConnexion}>J’ai déjà un compte</button>
        <p className="sc-note sc-note--gauche">Sans compte, tu peux réviser tout le programme de ta classe. <button type="button" className="sc-lien" onClick={onProgramme}>Voir le programme<PetitChevron /></button></p>
      </div>
    </div>
  );
}

function EssaiLarge({ onCompte, onConnexion, onProgramme }) {
  return (
    <div className="app app--no-halo ch-page sc-page app--large ch-page--large sc-page--large sc-page--essai" style={varsTeinte(TEINTES.peche)}>
      <div className="content sc-defile">
        <header className="sn-entete sn-entete--large">
          <div className="sn-entete-grille">
            <div>
              <span className="sn-sur">Nouvelle leçon</span>
              <h1 className="sn-titre">Scanner une leçon</h1>
            </div>
            <Reviz expression="content" lignes={['Donne-moi tes leçons.', 'Il te faut juste un compte gratuit.']} grand />
          </div>
        </header>
        <div className="sc-colonnes">
          <section className="sc-carte sc-essai-compte" aria-labelledby="sc-essai-titre">
            <h2 id="sc-essai-titre" className="sc-carte-titre">Garde tes leçons</h2>
            <p className="sc-carte-txt">Ton compte garde tes leçons scannées, tes flashcards et tes quiz, sur ton téléphone comme sur l’ordinateur.</p>
            <button type="button" className="sc-btn" onClick={onCompte}>Créer mon compte gratuit</button>
            <button type="button" className="sc-btn sc-btn--creme" onClick={onConnexion}>J’ai déjà un compte</button>
          </section>
          <section className="sc-carte sc-carte--petite sc-essai-formats" aria-labelledby="sc-essai-formats">
            <span id="sc-essai-formats" className="sc-sur">Ce que je fais de ta leçon</span>
            <ol className="sc-conseils">
              {FORMATS_ESSAI.map((f, i) => <li key={f.titre}><i>{i + 1}</i><span><b>{f.titre}</b><span>{f.texte}</span></span></li>)}
            </ol>
          </section>
          <aside className="sc-cote">
            <div className="sc-carte sc-carte--petite">
              <span className="sc-sur">Sans compte</span>
              <p className="sc-carte-txt sc-essai-txt">Tu peux déjà réviser tout le programme de ta classe.</p>
              <button type="button" className="sc-lien" onClick={onProgramme}>Voir le programme<PetitChevron /></button>
            </div>
            <div className="sc-carte sc-carte--petite">
              <span className="sc-sur">Pour un bon scan</span>
              <ol className="sc-conseils">
                {CONSEILS.map((c, i) => <li key={c.titre}><i>{i + 1}</i><span><b>{c.titre}</b><span>{c.texte}</span></span></li>)}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function NiveauManquant({ onClose, onProfil }) {
  const ref = useModalA11y(onClose, true);
  return (
    <div className="sc-voile" onClick={onClose}>
      <div className="sc-feuille sc-feuille--centre" ref={ref} role="dialog" aria-modal="true" aria-labelledby="sc-niveau" onClick={e => e.stopPropagation()}>
        <Mascot pose="thinking" size={110} alt="" aria-hidden="true" />
        <h2 id="sc-niveau">Dis-moi d’abord ta classe</h2>
        <p className="sc-carte-txt">J’adapte tes révisions à ta classe. Ça se règle en 10 secondes.</p>
        <div className="sc-deux">
          <button type="button" className="sc-btn sc-btn--creme" onClick={onClose}>Plus tard</button>
          <button type="button" className="sc-btn" onClick={onProfil}>Aller au profil</button>
        </div>
      </div>
    </div>
  );
}

