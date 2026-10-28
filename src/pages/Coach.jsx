import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { GuestWall } from '../components/GuestWall';
import { EtoileIA } from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { Mascot } from '../components/Mascot';
import { BulleReviz } from '../components/reviz/BulleReviz';
import { DecouvrirRevizPlus } from '../components/revizplus/RevizPlusOffre';
import { coachPreview, loadConversation, saveConversation, renderCoachMessage, COACH_ERREURS } from '../components/CoachChat';
import { sendCoachMessage, CHAT_MAX_MESSAGE_LENGTH } from '../services/chatService';
import { loadLessons, restoreLesson } from '../services/historyService';
import { ajouterControle } from '../services/agendaService';
import { ouvrirChapitreDuControle } from '../services/controleChapitres';
import { erreursRecentes } from '../services/erreursService';
import { track } from '../services/statsService';
import { AjoutControle } from '../components/AjoutControle';
import { SUBJECT_MAP, subjectKey, subjectMascot } from '../utils/subjects';
import { isProgrammeLessonId } from '../utils/programme';
import { intituleControle, matiereControle } from '../utils/agenda';
import { quotaCoachDuJour } from '../utils/revizPlus';
import { TEINTES, teinteMatiere } from '../utils/teinteMatiere';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useModalA11y } from '../hooks/useModalA11y';
import '../components/RevizPlus.css';
import './Coach.css';

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

// Pastel de la matière et point de la pastille leçon (handoff Réviz IA du 21/10).
const COULEURS = new Map([
  [TEINTES.lavande, { pastel: 'var(--rv-lavande)', point: 'var(--rv-lavande-point)' }],
  [TEINTES.peche, { pastel: 'var(--rv-peche-pale)', point: 'var(--rv-peche-point)' }],
  [TEINTES.rose, { pastel: 'var(--rv-rose)', point: 'var(--rv-rose-point)' }],
  [TEINTES.menthe, { pastel: 'var(--rv-menthe)', point: 'var(--rv-menthe-point)' }],
]);
const couleurs = matiere => COULEURS.get(teinteMatiere(matiere ?? '')) ?? COULEURS.get(TEINTES.peche);

// Réviz IA sans leçon (en agent : agenda, erreurs, programme ; api/_agent.js) : sa conversation.
const AGENT = 'reviz-ia';
// Les cartes de l'agent : où mène « Commencer », et la mascotte de chacune.
const ROUTE_FORMAT = { fiche: '/analyse', flashcards: '/flashcards', quiz: '/quiz', resume: '/resume', carte_mentale: '/mindmap' };
const POSE_FORMAT = { fiche: 'reading', flashcards: 'flashcard', quiz: 'quiz', resume: 'reading', carte_mentale: 'thinking', controle_blanc: 'examen', erreurs: 'quiz' };
const majuscule = s => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Relances sous la dernière réponse : le libellé, et ce qui part vraiment au serveur.
const RELANCES = {
  'Fais-moi réciter': 'Fais-moi réciter : pose-moi une question à la fois.',
  'Un exemple': 'Donne-moi un exemple concret.',
  'Plus simple': 'Explique-moi ça plus simplement.',
};

const Retour = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
);
const Horloge = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
const Croix = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
);
const Loupe = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
const Plus = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
);
const Micro = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
);
const Envoyer = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
);
const Coche = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
const Appareil = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
);
const Livre = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" /></svg>
);

// Titre court pour les cartes et la pastille : « La Révolution française, 1789-1799 » → « la Révolution française ».
const court = titre => {
  const t = titre.split(/\s*[,:(]\s*/)[0].trim() || titre;
  return /^(La|Le|Les|L’|L')\s?/.test(t) ? t[0].toLowerCase() + t.slice(1) : t;
};

const dateLecon = l => (isProgrammeLessonId(l.id) ? 'Chapitre du programme'
  : l.scannedAt ? `Scannée le ${new Date(l.scannedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : '');

/**
 * Une carte proposée par Réviz IA sans leçon : noter un contrôle (Ajouter, ou Modifier dans la
 * feuille de l'agenda) ou lancer une révision (Commencer). L'appli agit avec son code habituel ;
 * pendant que la réponse s'écrit, la carte se montre sans ses boutons.
 */
function CarteIA({ carte, enCours, onAjouter, onModifier, onCommencer }) {
  const controle = carte.type === 'controle';
  return (
    <div className="ia-action">
      <span className="ia-action-rond" aria-hidden="true">
        <Mascot pose={controle ? matiereControle(carte.matiere).mascot : (POSE_FORMAT[carte.format] ?? 'reading')} size={40} alt="" />
      </span>
      <span className="ia-action-txt">
        <b>{controle ? intituleControle(carte) : carte.titre}</b>
        <span>{controle ? `${majuscule(carte.jour)} · ${carte.titre}` : carte.sous}</span>
      </span>
      {!enCours && (controle && carte.ajoute ? (
        <Link className="ia-action-fait" to="/agenda">Ajouté · voir mon plan</Link>
      ) : (
        <span className="ia-action-btns">
          {controle ? (
            <>
              <button type="button" className="ia-action-btn" onClick={onAjouter} aria-label={`Ajouter à l’agenda : ${intituleControle(carte)}, ${carte.jour}`}>Ajouter</button>
              <button type="button" className="ia-action-btn ia-action-btn--blanc" onClick={onModifier} aria-label="Modifier avant d’ajouter">Modifier</button>
            </>
          ) : <button type="button" className="ia-action-btn" onClick={onCommencer} aria-label={`Commencer : ${carte.titre}, ${carte.sous}`}>Commencer</button>}
        </span>
      ))}
    </div>
  );
}

/** « Sur quelle leçon ? » : Réviz IA sur toutes les matières, puis recherche et leçons par matière, le choix coché. */
function ChoixLecon({ lecons, activeId, onSelect, onClose, grand }) {
  const ref = useModalA11y(onClose, true);
  const [q, setQ] = useState('');
  const r = q.trim().toLowerCase();
  const ordre = Object.keys(SUBJECT_MAP);
  const groupes = [];
  lecons.filter(l => !r || l.metadata.title.toLowerCase().includes(r)).forEach(l => {
    const nom = l.metadata.subject || 'Autre';
    let g = groupes.find(x => x.nom === nom);
    if (!g) groupes.push(g = { nom, cle: subjectKey(nom), lecons: [] });
    g.lecons.push(l);
  });
  groupes.sort((a, b) => (ordre.indexOf(a.cle) + 1 || 99) - (ordre.indexOf(b.cle) + 1 || 99));
  return (
    <div className="ia-voile" onClick={onClose}>
      <div className={`ia-choix${grand ? ' ia-choix--fenetre' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-label="Sur quelle leçon ?" onClick={e => e.stopPropagation()}>
        {!grand && <span className="ia-poignee" aria-hidden="true" />}
        <div className="ia-choix-tete">
          <h2>Sur quelle leçon&nbsp;?</h2>
          <button type="button" className="ia-fermer" onClick={onClose} aria-label="Fermer"><Croix /></button>
        </div>
        <label className="ia-recherche">
          <Loupe />
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher une leçon" aria-label="Chercher une leçon" />
        </label>
        <div className="ia-choix-liste">
          {!r && (
            <ul className="ia-groupe">
              <li>
                <button type="button" className="ia-lecon" aria-pressed={!activeId} onClick={() => onSelect(null)}>
                  <span className="ia-lecon-rond" style={{ background: 'var(--rv-lavande)' }} aria-hidden="true"><EtoileIA id="rv-ia-choix-agent" size={24} /></span>
                  <span className="ia-lecon-txt"><b>Toutes mes matières</b><span>Réviz IA connaît tes contrôles et ton programme</span></span>
                  <span className={`ia-radio${!activeId ? ' is-choisie' : ''}`} aria-hidden="true">{!activeId && <Coche />}</span>
                </button>
              </li>
            </ul>
          )}
          {groupes.map(g => (
            <section key={g.nom}>
              <div className="ia-groupe-tete"><span>{g.nom}</span><span>{pluriel(g.lecons.length, 'leçon')}</span></div>
              <ul className="ia-groupe">
                {g.lecons.map(l => {
                  const choisie = l.id === activeId;
                  return (
                    <li key={l.id}>
                      <button type="button" className="ia-lecon" aria-pressed={choisie} onClick={() => onSelect(l.id)}>
                        <span className="ia-lecon-rond" style={{ background: couleurs(g.nom).pastel }} aria-hidden="true">
                          <Mascot pose={subjectMascot(g.nom)} size={grand ? 38 : 36} alt="" />
                        </span>
                        <span className="ia-lecon-txt"><b>{l.metadata.title}</b><span>{dateLecon(l)}</span></span>
                        <span className={`ia-radio${choisie ? ' is-choisie' : ''}`} aria-hidden="true">{choisie && <Coche />}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {!groupes.length && <p className="ia-vide">Aucune leçon ne correspond.</p>}
        </div>
      </div>
    </div>
  );
}

/** Téléphone : les discussions passées (derrière l'horloge). */
function Discussions({ recents, activeId, onSelect, onNouvelle, onClose }) {
  const ref = useModalA11y(onClose, true);
  return (
    <div className="ia-voile" onClick={onClose}>
      <div className="ia-choix" ref={ref} role="dialog" aria-modal="true" aria-label="Tes discussions" onClick={e => e.stopPropagation()}>
        <span className="ia-poignee" aria-hidden="true" />
        <div className="ia-choix-tete">
          <h2>Tes discussions</h2>
          <button type="button" className="ia-fermer" onClick={onClose} aria-label="Fermer"><Croix /></button>
        </div>
        <button type="button" className="ia-nouvelle" onClick={onNouvelle}><EtoileIA id="rv-ia-nouvelle-tel" size={18} />Nouvelle discussion</button>
        <div className="ia-choix-liste">
          <div className="ia-groupe-tete"><span>Récents</span></div>
          {recents.length ? (
            <ul className="ia-groupe">
              {recents.map(({ lecon, apercu }) => (
                <li key={lecon.id}>
                  <button type="button" className="ia-lecon" aria-current={lecon.id === activeId ? 'true' : undefined} onClick={() => onSelect(lecon.id)}>
                    <span className="ia-lecon-txt"><b>{lecon.metadata.title}</b><span>{apercu.fromCoach ? 'Réviz IA : ' : 'Toi : '}{apercu.text}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="ia-vide">Pas encore de discussion. Pose ta première question.</p>}
        </div>
      </div>
    </div>
  );
}

/** Dictée (Web Speech) : le texte entendu s'ajoute au champ. Absente si le navigateur ne sait pas faire. */
function useDictee(onTexte) {
  const Reco = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const [ecoute, setEcoute] = useState(false);
  const reco = useRef(null);
  useEffect(() => () => reco.current?.abort?.(), []);
  if (!Reco) return null;
  return {
    ecoute,
    basculer() {
      if (ecoute) { reco.current?.stop(); return; }
      const r = new Reco();
      r.lang = 'fr-FR';
      r.interimResults = false;
      r.onresult = e => onTexte([...e.results].map(x => x[0].transcript).join(' '));
      r.onend = () => setEcoute(false);
      r.onerror = () => setEcoute(false);
      reco.current = r;
      r.start();
      setEcoute(true);
    },
  };
}

/**
 * Page Réviz IA (handoff Claude Design du 21/10) : le prof particulier qui connaît la leçon.
 * Une conversation par leçon (sessionStorage, comme le panneau des formats). Accueil « Salut
 * Léa. », réponses sans bulle précédées de l'étoile, relances, champ à bord dégradé avec la
 * leçon attachée, « Réviz réfléchit… » puis le texte qui arrive, carte de limite gratuite.
 * Téléphone : en-tête et champ, sans barre du bas. Ordinateur : colonne des discussions à gauche.
 *
 * Sans `?lesson=` : Réviz IA sur toutes les matières, en agent (docs/plan-reviz-ia-agent.md,
 * étape 2). Elle lit l'agenda, les erreurs et le programme, dit ce qu'elle regarde, et propose
 * des cartes que l'élève valide (CarteIA).
 */
export default function Coach() {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { isGuest, hasRevizPlus, getUserLevel, currentUser } = useAuth();
  const lecons = useMemo(() => loadLessons(), []);
  const parametre = params.get('lesson');
  const lecon = parametre ? (lecons.find(l => l.id === parametre) ?? null) : null;
  const leconId = lecon?.id ?? null;
  const cle = leconId ?? AGENT;

  const [messages, setMessages] = useState(() => loadConversation(cle));
  const [saisie, setSaisie] = useState(() => location.state?.question ?? '');
  const [brouillon, setBrouillon] = useState(null); // null : rien en cours ; '' : réfléchit ; texte : écrit
  const [erreur, setErreur] = useState(null);
  const [quotaOut, setQuotaOut] = useState(false);
  const [quota, setQuota] = useState(() => quotaCoachDuJour());
  const [choix, setChoix] = useState(false);
  const [histo, setHisto] = useState(false);
  const [menuPlus, setMenuPlus] = useState(false);
  const [offre, setOffre] = useState(false);
  const [outil, setOutil] = useState(null); // agent : ce qu'il regarde en ce moment
  const [cartesEnCours, setCartesEnCours] = useState([]);
  const [ajout, setAjout] = useState(null); // carte de contrôle ouverte dans la feuille de l'agenda
  const fil = useRef(null);
  const champ = useRef(null);
  const enCours = brouillon !== null;

  useEffect(() => { setMessages(loadConversation(cle)); setErreur(null); }, [cle]);
  useEffect(() => { saveConversation(cle, messages); }, [messages, cle]);
  // Le fil suit la réponse qui s'écrit seulement si l'élève est déjà en bas : remonté pour relire le
  // début, il n'est plus ramené en bas à chaque morceau reçu. Envoyer une question le recolle en bas.
  // C'est le fil qui défile (téléphone : .app est figé à la hauteur de l'écran) ; sur tablette, où
  // .app grandit avec son contenu, c'est la page.
  const colle = useRef(true);
  useEffect(() => {
    // En capture sur le document : on entend aussi le défilement du fil (qui ne remonte pas).
    const mesurer = () => {
      const el = fil.current;
      const reste = el && el.scrollHeight > el.clientHeight + 1 ? el.scrollHeight - el.scrollTop - el.clientHeight
        : document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      colle.current = reste < 80;
    };
    document.addEventListener('scroll', mesurer, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', mesurer, { capture: true });
  }, []);
  useEffect(() => {
    if (!colle.current) return;
    const el = fil.current;
    if (el) el.scrollTop = el.scrollHeight;
    // Tablette seulement : sur téléphone, faire défiler la fenêtre (qui ne défile pas) laissait Safari iOS
    // décalé après la fermeture du clavier, et plus aucun toucher ne tombait au bon endroit (Johan, 24/10).
    if (!isDesktop && !telephone()) window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [messages, brouillon, erreur, isDesktop]);
  // Téléphone : la page prend exactement la zone visible (visualViewport), clavier ouvert ou non. Safari ne
  // réduit pas la page quand le clavier s'ouvre : une barre de saisie fixée en bas restait derrière le
  // clavier. Ici la barre est en bas de la page, dans le flux, donc toujours juste au-dessus du clavier.
  // Clavier fermé : la page est remise en place (voir remettreLaPage).
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !telephone()) return;
    const maj = () => {
      const page = fil.current?.closest('.ia-page');
      const clavier = hauteurPage() - vv.height - vv.offsetTop > 40;
      page?.style.setProperty('--ia-hauteur', `${Math.round(vv.height)}px`);
      page?.style.setProperty('--ia-haut', `${Math.round(vv.offsetTop)}px`);
      page?.toggleAttribute('data-clavier', clavier);
      if (!clavier) remettreLaPage();
      if (colle.current && fil.current) fil.current.scrollTop = fil.current.scrollHeight;
    };
    maj();
    vv.addEventListener('resize', maj);
    vv.addEventListener('scroll', maj);
    return () => { vv.removeEventListener('resize', maj); vv.removeEventListener('scroll', maj); };
  }, []);
  useEffect(() => {
    const el = champ.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [saisie]);

  const dictee = useDictee(t => setSaisie(s => (s ? `${s} ${t}` : t)));
  if (isGuest) {
    return <GuestWall action={"parler à Réviz\u00a0IA"} text="Réviz IA demande un compte. C'est gratuit, et tout ce que tu as révisé en mode essai te suit." />;
  }

  const limite = quotaOut || (!hasRevizPlus && quota?.remaining === 0);
  async function envoyer(texte) {
    const contenu = texte.trim();
    if (!contenu || enCours || limite) return;
    const historique = [...messages, { role: 'user', content: contenu }];
    colle.current = true;
    setMessages(historique);
    setSaisie('');
    setErreur(null);
    setBrouillon('');
    setOutil(null);
    setCartesEnCours([]);
    try {
      const { text, cartes: proposees = [] } = await sendCoachMessage({
        lessonId: leconId,
        history: historique,
        level: getUserLevel(),
        // Le texte qui reprend après un outil efface « Je regarde ton agenda… ».
        onDelta: t => { setBrouillon(t); setOutil(null); },
        onOutil: setOutil,
        onCarte: setCartesEnCours,
        erreurs: leconId ? undefined : erreursRecentes(currentUser?.uid),
      });
      proposees.forEach(k => track('ia_carte_proposee', { type: k.type, format: k.format ?? null }));
      setMessages([...historique, { role: 'assistant', content: text, ...(proposees.length ? { cartes: proposees } : {}) }]);
    } catch (err) {
      if (err.message === 'CHAT_LIMIT') setQuotaOut(true);
      else setErreur(COACH_ERREURS[err.message] ?? 'Oups, ça a coincé. Réessaie dans un instant.');
      // La question n'est pas comptée : elle revient dans le champ.
      setMessages(messages);
      setSaisie(contenu);
    } finally {
      setBrouillon(null);
      setOutil(null);
      setCartesEnCours([]);
      setQuota(quotaCoachDuJour());
    }
  }
  // id null (ou AGENT, depuis les discussions) : Réviz IA sur toutes les matières.
  const choisir = id => { setParams(id && id !== AGENT ? { lesson: id } : {}, { replace: true }); setChoix(false); setHisto(false); };
  const nouvelle = () => { setMessages([]); setErreur(null); setHisto(false); };
  const retour = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'));

  // Cartes de l'agent : l'élève valide, l'appli fait avec son code habituel.
  const marquerAjoute = (i, j) => setMessages(ms => ms.map((m, k) => (k === i ? { ...m, cartes: m.cartes.map((x, l) => (l === j ? { ...x, ajoute: true } : x)) } : m)));
  async function ajouterCarte(i, j, carte) {
    try {
      await ajouterControle(currentUser, { matiere: carte.matiere, titre: carte.titre, date: carte.date, chapitres: carte.chapitres, classe: carte.classe, programme: carte.programme });
      track('ia_carte_validee', { type: 'controle' });
      marquerAjoute(i, j);
    } catch {
      setErreur('Le contrôle n’a pas pu être ajouté. Réessaie.');
    }
  }
  async function commencer(carte) {
    track('ia_carte_validee', { type: 'revision', format: carte.format });
    try {
      if (carte.format === 'controle_blanc') return navigate(`/controle?c=${encodeURIComponent(carte.controleId)}`);
      if (carte.format === 'erreurs') {
        if (!restoreLesson(carte.lessonId)) throw new Error('COURS_EFFACE');
        return navigate('/quiz?erreurs=1');
      }
      await ouvrirChapitreDuControle({ classe: carte.classe, programme: carte.programme }, carte.chapitre);
      return navigate(ROUTE_FORMAT[carte.format] ?? '/analyse');
    } catch {
      return setErreur('Ce chapitre ne s’ouvre pas pour le moment. Retrouve-le dans ton programme.');
    }
  }

  const titre = lecon?.metadata.title ?? null;
  const titreCourt = titre ? court(titre) : null;
  const c = couleurs(lecon?.metadata.subject);
  const prenom = currentUser?.displayName?.split(' ')[0];
  const moment = new Date().getHours() >= 17 ? 'ce soir' : "aujourd'hui";
  const vide = messages.length === 0 && !enCours;
  const apercuAgent = coachPreview(AGENT);
  const recents = [
    ...(apercuAgent ? [{ lecon: { id: AGENT, metadata: { title: 'Toutes mes matières' } }, apercu: apercuAgent }] : []),
    ...lecons.map(l => ({ lecon: l, apercu: coachPreview(l.id) })).filter(x => x.apercu),
  ];
  const cartes = lecon ? [
    { titre: `Explique-moi ${titreCourt}`, sous: "comme si j'avais 10 ans", envoi: `Explique-moi « ${titre} » comme si j'avais 10 ans.` },
    { titre: 'Fais-moi réciter', sous: titreCourt, envoi: `Fais-moi réciter « ${titre} » : pose-moi une question à la fois.` },
    { titre: 'Scanne ma leçon', sous: 'et prépare un quiz', aller: '/scan' },
    { titre: 'Prépare mon contrôle', sous: 'un plan en 3 jours', envoi: `Prépare-moi un plan de révision en 3 jours pour mon contrôle sur « ${titre} ».` },
  ] : [
    { titre: `Je fais quoi ${moment} ?`, sous: 'selon tes contrôles', envoi: `Je fais quoi ${moment} ?` },
    { titre: "J'ai un contrôle", sous: 'on le note ensemble', remplir: "J'ai un contrôle de " },
    { titre: 'Refaire mes erreurs', sous: 'les questions ratées', envoi: 'Fais-moi refaire mes erreurs récentes.' },
    { titre: 'Explique-moi', sous: 'une notion du programme', remplir: 'Explique-moi ' },
  ];
  const remplir = texte => { setSaisie(texte); requestAnimationFrame(() => champ.current?.focus()); };
  const note = !hasRevizPlus && Number.isFinite(quota?.remaining)
    ? `${pluriel(quota.remaining, 'question')} ${quota.remaining > 1 ? 'gratuites' : 'gratuite'} aujourd'hui · Réviz IA peut se tromper`
    : 'Réviz IA peut se tromper';

  const accueil = (
    <div className="ia-accueil">
      {isDesktop ? <EtoileIA id="rv-ia-accueil" size={44} /> : (
        <div className="ia-accueil-reviz">
          <Mascot pose="coach" size={78} alt="" aria-hidden="true" />
          <BulleReviz lignes={['Pose-moi ta question.', lecon ? 'Je connais ta leçon.' : 'Je connais tes contrôles.']} pointe="gauche" className="ia-bulle" />
        </div>
      )}
      <h1 className="ia-salut"><span className="ia-degrade">{prenom ? `Salut ${prenom}.` : 'Salut.'}</span><br />On révise quoi {moment}&nbsp;?</h1>
      <ul className="ia-cartes">
        {cartes.map(k => (
          <li key={k.titre}>
            <button type="button" className="ia-carte" onClick={() => (k.aller ? navigate(k.aller) : k.remplir ? remplir(k.remplir) : envoyer(k.envoi))}>
              <b>{k.titre}</b><span>{k.sous}</span>
              <i aria-hidden="true">↗</i>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const derniere = messages.length - 1;
  const conversation = (
    <div className="ia-fil-int" role="log" aria-live="polite">
      {messages.map((m, i) => (m.role === 'user' ? (
        <div key={i} className="ia-eleve">{m.content}</div>
      ) : (
        <div key={i} className="ia-reponse">
          <EtoileIA id={`rv-ia-r${i}`} size={isDesktop ? 24 : 22} />
          <div className="ia-reponse-txt">
            {renderCoachMessage(m.content)}
            {m.cartes?.length > 0 && (
              <div className="ia-actions">
                {m.cartes.map((k, j) => (
                  <CarteIA key={j} carte={k} onAjouter={() => ajouterCarte(i, j, k)} onModifier={() => setAjout({ i, j, carte: k })} onCommencer={() => commencer(k)} />
                ))}
              </div>
            )}
            {i === derniere && !enCours && !limite && (
              <div className="ia-relances">
                {Object.keys(RELANCES).map(r => <button type="button" key={r} className="ia-relance" onClick={() => envoyer(RELANCES[r])}>{r}</button>)}
              </div>
            )}
          </div>
        </div>
      )))}
      {enCours && (
        <div className="ia-reponse">
          <span className={brouillon ? '' : 'ia-etoile-tourne'}><EtoileIA id="rv-ia-ecrit" size={isDesktop ? 24 : 22} /></span>
          {brouillon ? (
            <div className="ia-reponse-txt ia-ecrit">
              {renderCoachMessage(brouillon)}
              {cartesEnCours.length > 0 && <div className="ia-actions">{cartesEnCours.map((k, j) => <CarteIA key={j} carte={k} enCours />)}</div>}
              {outil && <span className="ia-reflechit ia-reflechit--suite">{outil}</span>}
            </div>
          ) : <span className="ia-reflechit">{outil ?? 'Réviz réfléchit…'}</span>}
        </div>
      )}
      {erreur && <p className="ia-erreur" role="alert">{erreur}</p>}
    </div>
  );

  const composeur = limite ? (
    <div className="ia-limite">
      <div className="ia-limite-haut">
        <span className="ia-limite-rond" aria-hidden="true"><Mascot pose="sleeping" size={isDesktop ? 60 : 54} alt="" /></span>
        <span className="ia-limite-txt">
          <b>{hasRevizPlus ? 'On a beaucoup discuté aujourd’hui.' : `Tu as utilisé tes ${quota?.limit ?? 'questions'} ${quota?.limit ? 'questions ' : ''}du jour.`}</b>
          <span>{hasRevizPlus ? 'On reprend demain matin.' : 'Elles reviennent demain matin.'}</span>
        </span>
      </div>
      {!hasRevizPlus && <button type="button" className="ia-btn" onClick={() => setOffre(true)}>Questions illimitées avec Réviz+</button>}
    </div>
  ) : (
    <>
      <form className="ia-champ-cadre" onSubmit={e => { e.preventDefault(); envoyer(saisie); }}>
        <div className="ia-champ">
          <textarea
            ref={champ}
            rows={1}
            value={saisie}
            onChange={e => setSaisie(e.target.value)}
            onBlur={remettreLaPage}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); envoyer(saisie); } }}
            placeholder={isDesktop && vide ? (lecon ? 'Demande à Réviz IA, ou dépose une photo de ta leçon' : 'Demande à Réviz IA : un contrôle à noter, quoi réviser, une notion') : 'Demande à Réviz IA'}
            maxLength={CHAT_MAX_MESSAGE_LENGTH}
            disabled={enCours}
            aria-label={lecon ? 'Ta question sur la leçon' : 'Ta question à Réviz IA'}
          />
          <div className="ia-outils">
            <span className="ia-plus-zone">
              <button type="button" className="ia-plus" onClick={() => setMenuPlus(m => !m)} aria-expanded={menuPlus} aria-label="Ajouter"><Plus /></button>
              {menuPlus && (
                <>
                  <span className="ia-attrape" onClick={() => setMenuPlus(false)} aria-hidden="true" />
                  <span className="ia-menu" role="menu">
                    <button type="button" role="menuitem" onClick={() => navigate('/scan')}><Appareil />Scanner une leçon</button>
                    {lecons.length > 0 && <button type="button" role="menuitem" onClick={() => { setMenuPlus(false); setChoix(true); }}><Livre />{lecon ? 'Changer de leçon' : 'Choisir une leçon'}</button>}
                  </span>
                </>
              )}
            </span>
            {/* Avec au moins une leçon, on peut toujours passer de la leçon à toutes les matières, et inversement. */}
            <button type="button" className="ia-pastille rv-ilot" style={{ background: lecon ? c.pastel : 'var(--rv-lavande)' }} onClick={() => setChoix(true)} disabled={!lecons.length}
              aria-label={lecon ? `Leçon : ${titre}. Changer de leçon` : `Toutes mes matières${lecons.length ? '. Choisir une leçon' : ''}`}>
              <i style={{ background: lecon ? c.point : 'var(--rv-lavande-point)' }} aria-hidden="true" /><span>{lecon ? majuscule(titreCourt) : 'Mes matières'}</span>
            </button>
            <span className="ia-flex" />
            {dictee && (
              <button type="button" className={`ia-micro${dictee.ecoute ? ' is-ecoute' : ''}`} onClick={dictee.basculer} aria-label={dictee.ecoute ? 'Arrêter la dictée' : 'Dicter ta question'} aria-pressed={dictee.ecoute}><Micro /></button>
            )}
            <button type="submit" className="ia-envoyer" disabled={!saisie.trim() || enCours} aria-label="Envoyer la question"><Envoyer /></button>
          </div>
        </div>
      </form>
      <p className="ia-note">{isDesktop && vide ? (lecon ? 'Réviz IA connaît ta leçon et t’aide à trouver, sans faire tes devoirs à ta place.' : 'Réviz IA connaît tes contrôles et ton programme, et t’aide à réviser sans faire tes devoirs à ta place.') : note}</p>
    </>
  );

  const fenetres = (
    <>
      {choix && <ChoixLecon lecons={lecons} activeId={leconId} onSelect={choisir} onClose={() => setChoix(false)} grand={isDesktop} />}
      {histo && <Discussions recents={recents} activeId={cle} onSelect={choisir} onNouvelle={nouvelle} onClose={() => setHisto(false)} />}
      {offre && <DecouvrirRevizPlus onClose={() => setOffre(false)} />}
      {ajout && (
        <AjoutControle
          initial={{ matiere: ajout.carte.matiere, date: ajout.carte.date, chapitres: ajout.carte.chapitres, programme: ajout.carte.programme, titre: ajout.carte.chapitres?.length ? '' : ajout.carte.titre }}
          onClose={() => setAjout(null)}
          onSaved={() => { track('ia_carte_validee', { type: 'controle', modifiee: true }); marquerAjoute(ajout.i, ajout.j); setAjout(null); }}
        />
      )}
    </>
  );

  // ── Ordinateur ──
  if (isDesktop) {
    return (
      <div className="app app--large app--no-halo ia-page ia-page--grand">
        <span className="ia-halo" aria-hidden="true" />
        <aside className="ia-colonne" aria-label="Tes conversations">
          <Link to="/" className="ia-logo">réviz</Link>
          <button type="button" className="ia-nouvelle" onClick={nouvelle}><EtoileIA id="rv-ia-nouvelle" size={20} />Nouvelle discussion</button>
          <h2 className="ia-recents-titre">Récents</h2>
          {recents.length ? (
            <ul className="ia-recents">
              {recents.map(({ lecon: l }) => (
                <li key={l.id}>
                  <button type="button" className={`ia-recent${l.id === cle ? ' is-actif' : ''}`} aria-current={l.id === cle ? 'true' : undefined} onClick={() => choisir(l.id)}>{l.metadata.title}</button>
                </li>
              ))}
            </ul>
          ) : <p className="ia-recents-vide">Tes discussions apparaîtront ici.</p>}
        </aside>
        <main className={`ia-centre${vide ? ' ia-centre--accueil' : ''}`}>
          <div className="ia-fil" ref={fil}>{vide ? accueil : conversation}</div>
          <div className="ia-pied">{composeur}</div>
        </main>
        {fenetres}
      </div>
    );
  }

  // ── Téléphone ──
  return (
    <div className="app app--large app--no-halo ia-page ia-page--tel">
      <span className="ia-halo" aria-hidden="true" />
      <header className="ia-tete">
        <button type="button" className="ia-rond" onClick={retour} aria-label="Retour"><Retour /></button>
        <Marque />
        <span className="ia-flex" />
        <button type="button" className="ia-rond" onClick={() => setHisto(true)} aria-haspopup="dialog" aria-label="Tes discussions"><Horloge /></button>
      </header>
      <main className="ia-fil ia-fil--tel" ref={fil}>{vide ? accueil : conversation}</main>
      <div className={`ia-pied ia-pied--tel${limite ? ' ia-pied--limite' : ''}`}>{composeur}</div>
      {fenetres}
    </div>
  );
}

// Téléphone : .app est figé à la hauteur de l'écran (global.css, max-width 430 px), la fenêtre ne défile pas.
const telephone = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 430px)').matches;
// La hauteur de la page sans le clavier : sur iPhone, window.innerHeight rétrécit avec le clavier (c'est la
// zone visible), pas la hauteur de l'élément racine.
const hauteurPage = () => Math.max(window.innerHeight, document.documentElement.clientHeight);
// Safari iOS décale la page pour montrer le champ sous le clavier et peut la laisser décalée une fois le
// clavier fermé (le champ se désactive pendant la réponse) : les touchers ne tombent alors plus sur ce qu'on
// voit. Sur téléphone, la page n'a aucune raison d'être défilée : on la remet en place.
function remettreLaPage() {
  if (!telephone()) return;
  setTimeout(() => {
    const vv = window.visualViewport;
    const clavierOuvert = vv && hauteurPage() - vv.height - vv.offsetTop > 40;
    if (!clavierOuvert && (window.scrollY || document.documentElement.scrollTop)) window.scrollTo(0, 0);
  }, 60);
}

function Marque() {
  return (
    <span className="ia-marque">
      <EtoileIA id="rv-ia-marque" size={24} />
      Réviz <span className="ia-degrade">IA</span>
    </span>
  );
}
