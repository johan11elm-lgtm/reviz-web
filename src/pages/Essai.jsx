import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mascot } from '../components/Mascot';
import { CLASSES_BY_CYCLE } from '../utils/levels';
import { CLASSES_DECOUVERTE, startDecouverte, stopDecouverte } from '../services/decouverteService';
import { loadCatalogue, openChapter } from '../services/programmeService';
import { EntreeEcran, Champ, ChoixClasse, Encart, LienTexte } from '../components/entree/Entree';

/**
 * Mode essai (« sans compte ») : prénom + classe, et l'élève révise son
 * programme tout de suite. Pensé pour le CDI : un poste partagé, pas de
 * cahier, pas d'adresse mail sous la main. La progression reste dans le
 * navigateur et suit l'élève s'il crée un compte plus tard.
 * Design : parcours d'entrée (handoff Claude Design du 22/10), écran 2.
 */
export default function Essai() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
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
  const [ouverture, setOuverture] = useState(false);
  const ouvert = useRef(false);
  const [prenom, setPrenom] = useState('');
  const [classe, setClasse] = useState(classeFiche);
  const [erreurPrenom, setErreurPrenom] = useState('');
  const [erreurClasse, setErreurClasse] = useState('');

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
  function ouvrirChapitre() {
    if (ouvert.current) return;
    ouvert.current = true;
    setOuverture(true);
    openChapter(classeFiche, chapitre.matiere, chapitre.ch)
      .then(() => navigate('/quiz', { replace: true }))
      .catch(() => navigate(`/programme?matiere=${matiereFiche}`, { replace: true }));
  }

  // Déjà connecté (compte, ou essai déjà commencé) et venu d'une fiche : le
  // quiz du chapitre directement. Un vrai compte sans chapitre : l'accueil.
  useEffect(() => {
    if (!currentUser || ouvert.current) return;
    if (chapitreFiche && chapitre === undefined) return;
    if (chapitre) ouvrirChapitre();
    else if (!isGuest) navigate('/', { replace: true });
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

  function submit(e) {
    e.preventDefault();
    const p = prenom.trim();
    if (!p) { setErreurPrenom('Entre ton prénom.'); return; }
    if (!classe) { setErreurClasse('Choisis ta classe.'); return; }
    stopDecouverte();
    loginAsGuest({ prenom: p, level: { cycle: 'college', classe, specialites: [] } });
    if (chapitre && classe === classeFiche) ouvrirChapitre();
    else navigate(matiereFiche ? `/programme?matiere=${matiereFiche}` : '/programme', { replace: true });
  }

  // Redirection automatique en cours ou à venir (effet ci-dessus) : rien à remplir.
  const redirige = currentUser && !prenom && ((chapitreFiche && chapitre !== null) || !isGuest);
  if (classeProf || redirige) return <div className="app app--no-halo en-page" />;

  // Venu d'une fiche avec un chapitre trouvé : seulement le prénom, la classe est connue.
  const quiz = chapitre ? chapitre.ch : null;

  return (
    <EntreeEcran
      bulle={quiz ? ['Teste-toi sur ce chapitre.', 'Juste ton prénom avant.'] : ['Essaie sans compte.', "Deux infos, et c'est parti."]}
      expression="content" geste="coucou"
      onRetour={() => navigate('/welcome')}
      dessous={(
        <>
          <Encart icone="horloge" teinte="lavande">
            Ta progression reste sur cet appareil. Crée un compte quand tu veux pour la retrouver partout.
          </Encart>
          <LienTexte to="/inscription">Je préfère créer mon compte</LienTexte>
        </>
      )}
    >
      <form className="en-pile" onSubmit={submit} noValidate>
        {quiz && (
          <div className="en-tuile">
            <Mascot pose="quiz" size={52} alt="" aria-hidden="true" />
            <div>
              <b>{quiz.titre} ({classeFiche.replace('ème', 'e')})</b>
              <span>{quiz.quiz} questions corrigées une à une.</span>
            </div>
          </div>
        )}
        <Champ id="essai-prenom" label="Ton prénom" type="text" placeholder="Lucas" value={prenom}
          erreur={erreurPrenom} maxLength={30} autoComplete="given-name" autoFocus
          onChange={e => { setPrenom(e.target.value); setErreurPrenom(''); }} />
        {!quiz && (
          <ChoixClasse valeur={classe} erreur={erreurClasse}
            onChange={c => { setClasse(c); setErreurClasse(''); }} />
        )}
        <button type="submit" className="en-btn" disabled={ouverture}>
          {ouverture ? 'Ouverture du quiz…' : quiz ? 'Lancer le quiz' : "C'est parti"}
        </button>
      </form>
    </EntreeEcran>
  );
}
