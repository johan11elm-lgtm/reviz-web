import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { Mascot } from '../components/Mascot';
import { GuestBanner } from '../components/GuestBanner';
import { Pantin } from '../components/Pantin';
import { BulleReviz } from '../components/reviz/BulleReviz';
import { CarteFonction } from '../components/reviz/CarteFonction';
import { loadCatalogue, chapterProgress, openChapter } from '../services/programmeService';
import { loadLessons } from '../services/historyService';
import { track } from '../services/statsService';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { subjectMascot } from '../utils/subjects';
import { hasProgramme, PROGRAMME_CLASSES, PROGRAMME_FALLBACK } from '../utils/programme';
import './Programme.css';

/**
 * « Programme » (handoff Claude Design du 21/10) : Réviz qui dit où en est la matière, les
 * leçons scannées, les matières en anneaux de progression, puis les chapitres de la matière
 * choisie sur une route en vague, façon plateau de jeu, avec le détail de la case choisie.
 * Les contenus sont des fichiers statiques partagés (public/programme) : mode essai compris.
 *
 * Une case par chapitre : fait (maîtrisé), en cours (le dernier chapitre ouvert pas encore
 * maîtrisé, sinon le premier à découvrir), commencé ou à travailler (ouvert, pas maîtrisé),
 * à faire. Le trophée « Fin de l'année » ferme la route.
 */
const court = c => c.replace('ème', 'e');
const majuscule = s => s.charAt(0).toUpperCase() + s.slice(1);
const minuscule = s => s.charAt(0).toLowerCase() + s.slice(1);
const enMatiere = m => (m === m.toUpperCase() ? `en ${m}` : `en ${m.toLowerCase()}`);
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

const ETIQUETTE = { done: 'Fait', current: 'En cours', commence: 'Commencé', 'a-revoir': 'À travailler', todo: 'À venir' };
// La case en cours qui n'a encore jamais été ouverte : c'est la prochaine, pas une case « en cours ».
const etiquette = it => (it.statut === 'current' && !it.lesson ? 'Prochain' : ETIQUETTE[it.statut]);
const COULEUR = { done: '#1F8A52', current: '#C25407', commence: '#C25407', 'a-revoir': '#C25407', todo: '#6E675B' };
const ACTION = { done: 'Réviser', current: "C'est parti", commence: 'Reprendre', 'a-revoir': 'Reprendre', todo: 'Découvrir' };

const Coche = ({ taille = 24 }) => (
  <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
const IconeScan = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16" />
  </svg>
);

// Les chapitres d'une matière, avec l'état de chaque case et la progression.
function etatMatiere(m, lessons) {
  const items = m.chapitres.map((ch, i) => {
    const p = chapterProgress(ch, lessons);
    const statut = p.state === 'maitrise' ? 'done' : p.state === 'nouveau' ? 'todo' : p.state;
    return { ch, i, ...p, statut };
  });
  // En cours : le chapitre ouvert le plus récemment et pas encore maîtrisé (l'historique est du
  // plus récent au plus ancien), sinon le premier à découvrir.
  const rang = it => (it.lesson ? lessons.indexOf(it.lesson) : Infinity);
  const ouverts = items.filter(it => it.statut === 'commence' || it.statut === 'a-revoir').sort((a, b) => rang(a) - rang(b));
  const enCours = ouverts[0] ?? items.find(it => it.statut === 'todo') ?? null;
  if (enCours) enCours.statut = 'current';
  const faits = items.filter(it => it.statut === 'done').length;
  const demi = items.filter(it => it.lesson && it.statut !== 'done').length;
  return { ...m, items, enCours, faits, poids: faits + demi / 2, pct: items.length ? Math.round((faits + demi / 2) / items.length * 100) : 0 };
}

export default function Programme() {
  const navigate = useNavigate();
  const { getUserLevel, isGuest } = useAuth();
  const isDesktop = useIsDesktop();
  const level = getUserLevel();
  // Classe de l'élève si son programme est publié, sinon la 3e (lycée). Il peut parcourir une
  // autre classe sans changer la sienne.
  const classeEleve = hasProgramme(level) ? level.classe : PROGRAMME_FALLBACK;
  const [classe, setClasse] = useState(classeEleve);
  const autreClasse = !!level?.classe && !hasProgramme(level);
  const [choix, setChoix] = useState(false);

  const [catalogue, setCatalogue] = useState(null);
  const [error, setError] = useState(null);
  const lessons = useMemo(() => loadLessons(), []);
  const [slug, setSlug] = useState(null);
  const [caseChoisie, setCaseChoisie] = useState(null);
  const [ouverture, setOuverture] = useState(null); // id du chapitre en cours d'ouverture
  const [erreurChapitre, setErreurChapitre] = useState(false);
  const [parle, setParle] = useState(false);
  const pantin = useRef(null);

  useEffect(() => { track('programme_ouvert', { classe }); }, [classe]);

  useEffect(() => {
    let alive = true;
    setCatalogue(null);
    setError(null);
    loadCatalogue(classe)
      .then(c => { if (alive) setCatalogue(c); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [classe]);

  const matieres = useMemo(() => (catalogue?.matieres ?? []).map(m => etatMatiere(m, lessons)), [catalogue, lessons]);
  // Matière ouverte par défaut : celle du dernier chapitre ouvert dans cette classe.
  const parDefaut = useMemo(() => {
    const l = lessons.find(x => x.source === 'programme' && (!x.classe || x.classe === classe) && x.matiere);
    return matieres.find(m => m.matiere === l?.matiere)?.slug ?? matieres[0]?.slug ?? null;
  }, [lessons, matieres, classe]);
  const matiere = matieres.find(m => m.slug === (slug ?? parDefaut)) ?? null;
  const totalChapitres = matieres.reduce((n, m) => n + m.items.length, 0);
  const pctProgramme = totalChapitres ? Math.round(matieres.reduce((n, m) => n + m.poids, 0) / totalChapitres * 100) : 0;
  const scannees = lessons.filter(l => l.source !== 'programme').length;

  const choisie = matiere ? Math.min(caseChoisie ?? matiere.enCours?.i ?? 0, matiere.items.length - 1) : 0;
  const detail = matiere?.items[choisie] ?? null;

  const choisirMatiere = s => { setSlug(s); setCaseChoisie(null); setErreurChapitre(false); };
  const choisirCase = i => { setCaseChoisie(i); setErreurChapitre(false); };

  // Ce que dit Réviz : où en est la matière, et le prochain chapitre.
  const lignes = useMemo(() => {
    if (!matiere) return ['Je cherche ton programme…'];
    const n = matiere.items.length, en = enMatiere(matiere.matiere);
    if (matiere.faits === n) return [`Tout est fait ${en}.`, 'On révise pour garder ça ?'];
    // Les titres du programme sont souvent longs : au-delà d'une ligne, Réviz donne le numéro.
    const titre = matiere.enCours.ch.titre;
    const prochain = titre.length <= 28 ? minuscule(titre) : `le chapitre ${matiere.enCours.i + 1}`;
    if (matiere.faits === 0 && !matiere.enCours.lesson) return [`${pluriel(n, 'chapitre')} ${en}.`, matiere.enCours.i === 0 ? 'On commence par le premier ?' : `On commence par ${prochain} ?`];
    return [`${matiere.faits} ${matiere.faits > 1 ? 'chapitres' : 'chapitre'} sur ${n} ${en}.`, `Prochain : ${prochain}.`];
  }, [matiere]);
  const texte = lignes.join('\n');
  useEffect(() => {
    if (parle) pantin.current?.dire(texte);
  }, [texte, parle]);
  // Si le moteur de Réviz ne charge pas, la bulle s'affiche quand même (page visible seulement).
  useEffect(() => {
    let t;
    const essai = () => { t = setTimeout(() => (document.hidden ? essai() : setParle(true)), 4000); };
    essai();
    return () => clearTimeout(t);
  }, []);

  async function lancer(it) {
    if (!it?.ch.pret || ouverture) return;
    setOuverture(it.ch.id);
    setErreurChapitre(false);
    try {
      await openChapter(classe, matiere.matiere, it.ch);
      navigate('/analyse');
    } catch {
      setErreurChapitre(true);
      setOuverture(null);
    }
  }

  const dateTxt = majuscule(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
  const pastilleClasse = (
    <div className="prg-choix">
      <button type="button" className="prg-classe" aria-expanded={choix} aria-haspopup="listbox" onClick={() => setChoix(v => !v)}>
        Classe de {court(classe)}
      </button>
      {choix && (
        <ul className="prg-choix-liste" role="listbox" aria-label="Classe">
          {PROGRAMME_CLASSES.map(c => (
            <li key={c} role="option" aria-selected={c === classe}>
              <button type="button" onClick={() => { setClasse(c); setSlug(null); setCaseChoisie(null); setChoix(false); }}>
                {c}{c === classeEleve ? ' · ta classe' : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const hero = (
    <div className="prg-hero">
      <span className="prg-grain" aria-hidden="true" />
      <span className="prg-deco prg-deco--a" aria-hidden="true" />
      <span className="prg-deco prg-deco--b" aria-hidden="true" />
      <span className="prg-deco prg-deco--c" aria-hidden="true" />
      <span className="prg-deco prg-deco--d" aria-hidden="true" />
      <span className="prg-point" aria-hidden="true" />
      <div className="prg-hero-haut">
        <span className="prg-date">{dateTxt}</span>
        <div className="prg-hero-titre">
          <h1 className="prg-titre">Programme</h1>
          {pastilleClasse}
        </div>
      </div>
      <div className="prg-reviz">
        <BulleReviz key={`${classe}-${matiere?.slug}`} lignes={lignes} parle={parle} className="prg-bulle" />
        <Pantin
          ref={pantin}
          size={isDesktop ? 170 : 140}
          expression="reflechit"
          repli="thinking"
          onEntree={() => setParle(true)}
          onClick={() => pantin.current?.geste('saut')}
          label="Réviz, ta mascotte"
          className="prg-pantin"
        />
      </div>
    </div>
  );

  const carteScans = (
    <div className="prg-scans-place">
      <CarteFonction
        carte={{
          pose: 'scanphone', fond: '#FFE6D2', titre: 'Mes leçons scannées',
          sous: isGuest ? 'Avec un compte gratuit' : scannees ? `${pluriel(scannees, 'leçon')}, prêtes à réviser` : 'Une photo de ton cahier, et Réviz prépare tout',
        }}
        grande={isDesktop}
        className="prg-scans"
        onClick={() => navigate(isGuest ? '/scan' : '/cours')}
      />
    </div>
  );

  const blocMatieres = (
    <section className="prg-bloc" aria-labelledby="prg-matieres">
      <div className="prg-tete">
        <h2 id="prg-matieres" className="prg-titre2">Mes matières</h2>
        {catalogue && <span className="prg-compte">{pctProgramme} % du programme</span>}
      </div>
      <div className="prg-matieres" role="radiogroup" aria-label="Matière">
        {!catalogue && [0, 1, 2, 3, 4].map(i => <span key={i} className="prg-matiere prg-matiere--vide" aria-hidden="true"><span className="prg-anneau" /></span>)}
        {matieres.map(m => (
          <Anneau key={m.slug} m={m} on={m.slug === matiere?.slug} grand={isDesktop} onClick={() => choisirMatiere(m.slug)} />
        ))}
      </div>
    </section>
  );

  const blocChapitres = matiere && (
    <section className="prg-bloc prg-bloc--chapitres" aria-labelledby="prg-chapitres">
      <div className="prg-tete">
        <h2 id="prg-chapitres" className="prg-titre2">Chapitres · {matiere.matiere}</h2>
        <span className="prg-compte">{matiere.faits} / {matiere.items.length}</span>
      </div>
      <Vague
        matiere={matiere}
        choisie={choisie}
        onChoisir={choisirCase}
        grand={isDesktop}
        detail={detail && (
          <Detail
            it={detail}
            ouverture={ouverture === detail.ch.id}
            erreur={erreurChapitre}
            grand={isDesktop}
            onLancer={() => lancer(detail)}
            onScanner={() => navigate('/scan')}
          />
        )}
      />
    </section>
  );

  return (
    <div className={`app app--no-halo prg-page${isDesktop ? ' app--large prg-page--large' : ''}`}>
      <div className="content prg-defile">
        {hero}
        {carteScans}
        {isGuest && !isDesktop && <div className="prg-pad"><GuestBanner /></div>}
        {autreClasse && classe === classeEleve && (
          <p className="prg-note">Le programme de {level.classe} arrive bientôt. En attendant, voici celui de {classe}.</p>
        )}
        {error ? (
          <div className="rv-empty-state prg-erreur">
            <Mascot pose="confused" size={140} className="rv-empty-state-mascot" alt="" aria-hidden="true" />
            <h2 className="rv-empty-state-title">Programme indisponible</h2>
            <p className="rv-empty-state-sub">Impossible de charger les chapitres pour le moment. Vérifie ta connexion et réessaie.</p>
            <button type="button" className="rv-btn-cta" onClick={() => navigate(0)}>Réessayer</button>
          </div>
        ) : (
          <div className="prg-grille">
            {blocMatieres}
            {blocChapitres}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

/** Une matière : anneau de progression, mascotte au centre, nom et pourcentage. */
function Anneau({ m, on, grand, onClick }) {
  const r = 35, C = 2 * Math.PI * r;
  const taille = grand ? 88 : 76;
  return (
    <button type="button" role="radio" aria-checked={on} className={`prg-matiere${on ? ' prg-matiere--on' : ''}`} onClick={onClick}
      aria-label={`${m.matiere} : ${m.faits} sur ${m.items.length} chapitres faits`}>
      <span className="prg-anneau" style={{ width: taille, height: taille }}>
        <svg viewBox="0 0 76 76" width={taille} height={taille} aria-hidden="true">
          <circle cx="38" cy="38" r={r} fill="none" stroke="#EADBCB" strokeWidth="4" />
          {m.pct > 0 && (
            <circle cx="38" cy="38" r={r} fill="none" stroke={m.pct === 100 ? '#34C77B' : '#C25407'} strokeWidth="4"
              strokeLinecap="round" strokeDasharray={`${(m.pct / 100) * C} ${C}`} />
          )}
        </svg>
        <span className="prg-anneau-rond">
          <Mascot pose={subjectMascot(m.matiere)} size={grand ? 72 : 62} alt="" aria-hidden="true" />
        </span>
      </span>
      <span className="prg-matiere-nom">{m.matiere}</span>
      <span className="prg-matiere-pct">{m.pct} %</span>
    </button>
  );
}

// Courbe qui passe par chaque point, points de contrôle à mi-chemin en x.
function courbe(pts) {
  if (!pts.length) return '';
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], m = (x0 + x1) / 2;
    d += ` C${m} ${y0} ${m} ${y1} ${x1} ${y1}`;
  }
  return d;
}

/**
 * Les chapitres sur une route en vague, puis le détail de la case choisie. Sur téléphone la
 * route défile ; sur ordinateur elle tient en entier quand la place suffit (sinon elle défile
 * aussi), et la bulle de détail pointe vers la case choisie.
 */
function Vague({ matiere, choisie, onChoisir, grand, detail }) {
  const piste = useRef(null);
  const [largeur, setLargeur] = useState(0);
  const [defile, setDefile] = useState(0);
  const n = matiere.items.length;

  useLayoutEffect(() => {
    const el = piste.current;
    if (!el) return;
    const mesure = () => setLargeur(el.clientWidth);
    mesure();
    const ro = new ResizeObserver(mesure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const D = grand
    ? { h: 250, haut: 64, bas: 142, debut: 60, route: 34, fait: 60, cours: 88, choix: 66, rondCours: 74, label: 120 }
    : { h: 236, haut: 58, bas: 136, debut: 46, route: 30, fait: 56, cours: 80, choix: 62, rondCours: 66, label: 108 };
  const marge = grand ? 0 : 20;
  // Écart entre deux cases : tout tient dans la largeur si possible (ordinateur), sinon 118 px.
  const tient = grand && n > 1 ? (largeur - D.debut - 80 - 90) / (n - 1) : 0;
  const ecart = grand && tient >= 110 ? Math.min(150, tient) : 118;
  const largeurPiste = D.debut + (n - 1) * ecart + 140;
  const pts = matiere.items.map((_, i) => [D.debut + i * ecart, i % 2 ? D.bas : D.haut]);
  const trophee = [largeurPiste - 60, (D.haut + D.bas) / 2];
  const dernierOuvert = matiere.items.reduce((a, it, i) => (it.statut !== 'todo' ? i : a), -1);
  const routeFaite = dernierOuvert > 0 ? courbe(pts.slice(0, dernierOuvert + 1)) : '';
  const route = courbe([...pts, trophee]);

  // À l'ouverture et au changement de matière : la case en cours au milieu de l'écran.
  useEffect(() => {
    const el = piste.current;
    if (!el || !matiere.enCours) return;
    el.scrollLeft = Math.max(0, pts[matiere.enCours.i][0] + marge - el.clientWidth / 2);
    setDefile(el.scrollLeft);
  }, [matiere.slug, ecart]);

  const pointe = pts[choisie] ? pts[choisie][0] + marge - defile : 0;

  return (
    <>
      <div className="prg-piste" ref={piste} style={{ height: D.h }} onScroll={e => setDefile(e.currentTarget.scrollLeft)}>
        <div className="prg-piste-int" style={{ width: largeurPiste, height: D.h, margin: `0 ${marge}px` }}>
          <svg width={largeurPiste} height={D.h} className="prg-route" aria-hidden="true">
            <path d={route} transform="translate(0 7)" fill="none" stroke="#A0501A" strokeOpacity=".10" strokeWidth={D.route} strokeLinecap="round" />
            <path d={route} fill="none" stroke="#fff" strokeWidth={D.route} strokeLinecap="round" />
            {routeFaite && <path d={routeFaite} fill="none" stroke="#DCF5E6" strokeWidth={D.route} strokeLinecap="round" />}
            <path d={route} fill="none" stroke="#C25407" strokeOpacity=".45" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
          </svg>
          {matiere.items.map((it, i) => {
            const [x, y] = pts[i];
            const st = it.statut, sel = i === choisie;
            const taille = st === 'current' ? D.cours : sel ? D.choix : D.fait;
            return (
              <div key={it.ch.id}>
                <button
                  type="button"
                  className={`prg-case prg-case--${st}${sel ? ' prg-case--choisie' : ''}`}
                  style={{ left: x - taille / 2, top: y - taille / 2, width: taille, height: taille }}
                  onClick={() => onChoisir(i)}
                  aria-pressed={sel}
                  aria-label={`Chapitre ${i + 1} : ${it.ch.titre}, ${etiquette(it).toLowerCase()}`}
                >
                  {st === 'done' && <Coche taille={grand ? 26 : 24} />}
                  {st === 'current' && (
                    <span className="prg-case-rond" style={{ width: D.rondCours, height: D.rondCours }}>
                      <Mascot pose={subjectMascot(matiere.matiere)} size={D.rondCours} alt="" aria-hidden="true" />
                    </span>
                  )}
                  {st !== 'done' && st !== 'current' && <span className="prg-case-num">{i + 1}</span>}
                </button>
                <span className="prg-case-label" style={{ left: x - D.label / 2, top: y + taille / 2 + 10, width: D.label }} aria-hidden="true">
                  <span className="prg-case-etat" style={{ color: COULEUR[st] }}>{st === 'todo' ? `Chapitre ${i + 1}` : etiquette(it)}</span>
                  <span className={`prg-case-nom${st === 'todo' ? ' prg-case-nom--todo' : ''}`}>{it.ch.titre}</span>
                </span>
              </div>
            );
          })}
          <div className="prg-trophee" style={{ left: trophee[0] - 60, top: trophee[1] - 40 }}>
            <span className="prg-trophee-rond"><Mascot pose="trophy" size={grand ? 72 : 68} alt="" aria-hidden="true" /></span>
            <span className="prg-trophee-txt">Fin de l’année</span>
          </div>
        </div>
      </div>
      {detail && (
        <div className="prg-detail-place" style={{ '--pointe': `${Math.max(18, pointe)}px` }}>
          {detail}
        </div>
      )}
    </>
  );
}

/** Le détail de la case choisie : état, nom, contenu, et de quoi la lancer. */
function Detail({ it, ouverture, erreur, grand, onLancer, onScanner }) {
  const st = it.statut;
  // Cartes à revoir : seulement une fois les flashcards commencées (sinon toutes comptent).
  const aRevoir = it.state === 'a-revoir' ? it.dueCards : 0;
  const meta = aRevoir > 0 ? `${pluriel(aRevoir, 'carte')} à revoir` : `Chapitre ${it.i + 1}`;
  const contenu = it.ch.pret
    ? `${it.ch.flashcards} flashcards · quiz de ${it.ch.quiz} questions · résumé et carte mentale`
    : 'Ce chapitre arrive bientôt.';
  return (
    <div className={`prg-detail${grand ? ' prg-detail--grand' : ''}`}>
      <div className="prg-detail-txt">
        <div className="prg-detail-haut">
          <span className="prg-detail-etat" style={{ color: COULEUR[st] }}>{etiquette(it)}</span>
          <span className="prg-detail-meta">{meta}</span>
        </div>
        <h3 className="prg-detail-nom">{it.ch.titre}</h3>
        <p className="prg-detail-contenu">{erreur ? 'Impossible d’ouvrir ce chapitre pour le moment. Réessaie.' : contenu}</p>
        <div className="prg-detail-actions">
          <button type="button" className="prg-go" onClick={onLancer} disabled={!it.ch.pret || ouverture}>
            {!it.ch.pret ? 'Bientôt' : ouverture ? 'Ouverture…' : ACTION[st]}
          </button>
          <button type="button" className="prg-scanner" onClick={onScanner}>
            <IconeScan />{grand ? 'Scanner une leçon' : 'Scanner'}
          </button>
        </div>
      </div>
    </div>
  );
}
