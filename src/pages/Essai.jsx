import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CLASSES_BY_CYCLE } from '../utils/levels';
import { CLASSES_DECOUVERTE, isDecouverte, startDecouverte } from '../services/decouverteService';
import { loadCatalogue, openChapter } from '../services/programmeService';
import { erreursDe } from '../services/erreursService';
import { chapterLessonId } from '../utils/programme';
import { noterArrivee } from '../utils/arriveeFiche';

/**
 * /essai : adresse des liens du site, des fiches, des e-mails et des codes vidéo. Depuis le 11/11,
 * plus d'essai sans compte : un nouveau venu passe par l'entrée (/commencer), où Réviz pose ses
 * questions avant le compte. Restent ici : la visite d'un enseignant (/profs, programme sans
 * compte), le compte déjà connecté venu d'une fiche (son chapitre), et les essais commencés avant
 * le 11/11 (repris tels quels).
 */
export default function Essai() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const { loginAsGuest, currentUser, isGuest } = useAuth();
  // Enseignant arrivé par /profs (affiche) : la classe est déjà choisie,
  // on ouvre directement son programme en mode découverte, sans formulaire.
  const classeProf = params.get('prof') && CLASSES_DECOUVERTE.includes(params.get('classe'))
    ? params.get('classe') : null;
  // Élève arrivé depuis une fiche publique de la landing (`?classe=3ème&matiere=maths`) :
  // sa classe est déjà cochée et, après le prénom, on ouvre directement la matière.
  const classeFiche = !classeProf && CLASSES_BY_CYCLE.college.includes(params.get('classe'))
    ? params.get('classe') : null;
  const matiereFiche = /^[a-z0-9-]{1,40}$/.test(params.get('matiere') ?? '') ? params.get('matiere') : null;
  // … et avec le chapitre de la fiche (`&chapitre=angles-et-triangles`), le prénom
  // suffit : on ouvre directement le quiz de ce chapitre.
  const chapitreFiche = classeFiche && matiereFiche && /^[a-z0-9-]{1,80}$/.test(params.get('chapitre') ?? '')
    ? params.get('chapitre') : null;
  // undefined : catalogue en cours de lecture ; null : chapitre introuvable.
  const [chapitre, setChapitre] = useState(chapitreFiche ? undefined : null);
  const ouvert = useRef(false);
  // Essai déjà commencé à l'arrivée (hors visite d'un enseignant) : on le reprend. Refaire le formulaire
  // créerait un nouvel essai vide, et la progression du premier ne serait plus affichée. Pour changer
  // d'élève sur un poste partagé : Réglages → quitter l'essai.
  const dejaInvite = useRef(isGuest && !isDecouverte());

  // Gardé aussi pour la découverte, si l'élève crée plutôt un compte (utils/arriveeFiche.js).
  useEffect(() => {
    if (chapitreFiche) noterArrivee({ classe: classeFiche, matiere: matiereFiche, chapitre: chapitreFiche });
  }, [chapitreFiche, classeFiche, matiereFiche]);

  useEffect(() => {
    if (!chapitreFiche) return;
    let alive = true;
    loadCatalogue(classeFiche)
      .then(c => {
        const m = c.matieres.find(x => x.slug === matiereFiche);
        const ch = m?.chapitres.find(x => x.id === chapitreFiche && x.pret);
        if (alive) setChapitre(ch ? { matiere: m.matiere, ch } : null);
      })
      .catch(() => { if (alive) setChapitre(null); });
    return () => { alive = false; };
  }, [chapitreFiche, classeFiche, matiereFiche]);

  // Charge le chapitre comme le fait Mon programme, puis lance le quiz.
  // En cas d'échec (réseau), la liste des chapitres de la matière.
  // Le mail du lendemain (?via=rappel) : s'il reste sur l'appareil des questions ratées de ce
  // chapitre, « Bats ton toi d'hier » (3 d'entre elles) plutôt que tout le quiz.
  function ouvrirChapitre() {
    if (ouvert.current) return;
    ouvert.current = true;
    const defi = params.get('via') === 'rappel' && erreursDe(currentUser?.uid ?? null, chapterLessonId(chapitre.ch.id)).length > 0;
    openChapter(classeFiche, chapitre.matiere, chapitre.ch)
      .then(() => navigate(defi ? '/quiz?erreurs=1&defi=1&depuis=rappel' : '/exercices', { replace: true }))
      .catch(() => navigate(`/programme?matiere=${matiereFiche}`, { replace: true }));
  }

  // Déjà connecté (compte, ou essai déjà commencé) et venu d'une fiche : le
  // quiz du chapitre directement. Un vrai compte sans chapitre : l'accueil ;
  // un essai déjà commencé : l'accueil aussi (la matière de la fiche s'il en vient une).
  useEffect(() => {
    if (!currentUser || ouvert.current) return;
    if (chapitreFiche && chapitre === undefined) return;
    if (chapitre) ouvrirChapitre();
    else if (!isGuest) navigate('/', { replace: true });
    else if (dejaInvite.current) navigate(matiereFiche ? `/programme?matiere=${matiereFiche}` : '/', { replace: true });
    // ouvrirChapitre ne dépend que de ces valeurs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isGuest, chapitre, chapitreFiche, navigate]);

  useEffect(() => {
    if (!classeProf || (currentUser && !isGuest)) return;
    startDecouverte();
    loginAsGuest({ prenom: 'Prof', level: { cycle: 'college', classe: classeProf, specialites: [] } });
    navigate('/programme', { replace: true });
    // Une seule fois, à l'arrivée sur la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirection automatique en cours ou à venir (effets ci-dessus) : rien à afficher.
  const redirige = currentUser && ((chapitreFiche && chapitre !== null) || !isGuest || dejaInvite.current);
  if (classeProf || redirige) return <div className="app app--no-halo en-page" />;

  // 11/11 : plus d'essai sans compte. Venu d'un e-mail de Réviz (son compte existe) : la connexion,
  // qui le ramène sur ce quiz. Sinon l'entrée, où Réviz pose ses questions avant le compte ; elle
  // reprend la classe et le chapitre de la fiche (mêmes paramètres).
  if (params.get('via') === 'rappel') {
    return <Navigate to={`/connexion?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return <Navigate to={`/commencer${location.search}`} replace />;
}
