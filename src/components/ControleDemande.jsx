import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mascot } from './Mascot';
import { AjoutControle } from './AjoutControle';
import { agendaLocal, chargerAgenda, marquerEtape } from '../services/agendaService';
import { chapitreAReviser, cibleRevision } from '../services/controleChapitres';
import { mesurer } from '../services/mesure';
import { MATIERES_CONTROLE, controlesAVenir, intituleControle, jourEnClair, joursEntre, jourIso } from '../utils/agenda';
import { planRevision } from '../utils/planRevision';
import { peutDemanderControle, noterDemandeControle, noterControleNote } from '../utils/demandeControle';
import { nbsp } from '../utils/typography';
import './RappelDemain.css';
import './ControleDemande.css';

// Un titre de chapitre à rallonge ne doit pas noyer la phrase : coupé entre deux mots.
function court(titre, max = 48) {
  if (titre.length <= max) return titre;
  const debut = titre.slice(0, max);
  return `${debut.slice(0, Math.max(debut.lastIndexOf(' '), max - 12)).replace(/[\s:,;(]+$/, '')}…`;
}

/** « demain », « jeudi 13 novembre » : le jour du contrôle, dit simplement. */
function quand(date) {
  const n = joursEntre(jourIso(), date);
  return n <= 0 ? 'aujourd’hui' : n === 1 ? 'demain' : jourEnClair(date);
}

/**
 * « Ton prochain contrôle, c'est en quoi ? » (11/11), en fin de séance et d'abord à la fin de la
 * toute première : l'élève touche sa matière, la feuille d'ajout de l'agenda s'ouvre déjà
 * remplie, et son plan de révision commence tout de suite. Proposée tant qu'il n'a aucun
 * contrôle à venir, selon l'espacement de utils/demandeControle.js ; en essai aussi (l'agenda
 * suit l'élève à la création du compte).
 *
 * Une demande à la fois : `apres` (le rappel de 17 h) ne s'affiche que si celle-ci n'a pas lieu
 * d'être, ou une fois écartée (« Pas de contrôle prévu »). Contrôle noté, on ne demande plus rien :
 * un seul bouton, commencer. Le rappel se proposera à la prochaine ouverture de l'accueil.
 * @param {{ lieu: 'fin_accueil'|'fin_seance', apres?: import('react').ReactNode }} p
 */
export function ControleDemande({ lieu, apres = null }) {
  const { currentUser, isGuest } = useAuth() ?? {};
  const navigate = useNavigate();
  const uid = currentUser?.uid ?? null;
  const essai = !!isGuest;
  const [visible, setVisible] = useState(() => peutDemanderControle(uid, agendaLocal(uid)));
  const [feuille, setFeuille] = useState(null); // null | { matiere }
  const [reponse, setReponse] = useState(''); // '' | 'non' | 'note'
  const [controle, setControle] = useState(null);
  const [depart, setDepart] = useState(false);
  const note = useRef(false);
  const touche = useRef(false);

  useEffect(() => {
    if (!visible || note.current) return;
    note.current = true;
    noterDemandeControle(uid);
    mesurer('controle_demande', { etape: 'vue', lieu, essai });
  }, [visible, uid, lieu, essai]);

  // Un contrôle noté sur un autre appareil : l'agenda en ligne le sait, la demande se retire
  // (sauf si l'élève a déjà commencé à répondre).
  useEffect(() => {
    if (!visible || essai || !currentUser) return undefined;
    let vivant = true;
    chargerAgenda(currentUser).then(a => {
      if (vivant && !touche.current && controlesAVenir(a?.controles ?? []).length) setVisible(false);
    });
    return () => { vivant = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible || reponse === 'non') return apres;

  function choisir(matiere) {
    touche.current = true;
    mesurer('controle_demande', { etape: 'matiere', lieu, essai, matiere });
    setFeuille({ matiere });
  }
  function pasDeControle() {
    touche.current = true;
    mesurer('controle_demande', { etape: 'non', lieu, essai });
    setReponse('non');
  }
  function enregistre(agenda) {
    const c = agenda.controles.at(-1);
    noterControleNote(uid);
    mesurer('controle_demande', { etape: 'note', lieu, essai, matiere: c.matiere, jours: joursEntre(jourIso(), c.date) });
    setControle(c);
    setFeuille(null);
    setReponse('note');
  }
  // Le premier pas du plan, tout de suite : la fiche du chapitre à travailler. Si l'étape
  // « flashcards » tombe aujourd'hui (contrôle dans 5 jours ou moins), elle est notée comme
  // lancée, comme depuis l'accueil.
  async function commencer() {
    setDepart(true);
    mesurer('controle_demande', { etape: 'commencer', lieu, essai });
    const flash = planRevision(controle).find(e => e.id === 'flash');
    if (flash?.etat === 'aujourdhui') await marquerEtape(currentUser, controle.id, 'flash').catch(() => {});
    navigate(await cibleRevision(controle), { replace: true });
  }

  if (reponse === 'note') {
    const chapitre = chapitreAReviser(controle)?.titre;
    return (
      <section className="qz-carte cd-carte cd-carte--fait" aria-labelledby="cd-fait-titre" aria-live="polite">
        <h2 id="cd-fait-titre" className="qz-titre2">C’est noté</h2>
        <p className="rd-texte">
          <b>{intituleControle(controle)} {quand(controle.date)}.</b> {nbsp(`Ton plan de révision est prêt. Premier pas : ${chapitre ? `5 minutes sur « ${court(chapitre)} ».` : '5 minutes maintenant.'}`)}
        </p>
        {essai && <p className="rd-texte cd-essai">Crée ton compte gratuit pour garder ton plan.</p>}
        <div className="rd-actions">
          {essai && (
            <button type="button" className="fc-btn fc-btn--orange rd-btn" onClick={() => { mesurer('essai_compte_cta', { lieu: 'controle' }); navigate('/inscription'); }}>Créer mon compte gratuit</button>
          )}
          <button type="button" className={essai ? 'fc-lien rd-lien' : 'fc-btn fc-btn--orange rd-btn'} onClick={commencer} disabled={depart}>{depart ? 'Un instant…' : 'Commencer maintenant'}</button>
        </div>
      </section>
    );
  }

  return (
    <section className="qz-carte cd-carte" aria-labelledby="cd-titre">
      <h2 id="cd-titre" className="qz-titre2">{nbsp('Ton prochain contrôle, c’est en quoi ?')}</h2>
      <p className="rd-texte">{nbsp('Note-le : je te prépare un plan de révision jusqu’au jour J.')}</p>
      <div className="cd-matieres" role="group" aria-label="Matière du contrôle">
        {MATIERES_CONTROLE.filter(m => m.slug !== 'autre').map(m => (
          <button key={m.slug} type="button" className="cd-matiere" onClick={() => choisir(m.slug)}>
            <span className="cd-matiere-rond" aria-hidden="true"><Mascot pose={m.mascot} size={26} alt="" /></span>
            {m.label}
          </button>
        ))}
      </div>
      <div className="cd-liens">
        <button type="button" className="fc-lien cd-lien" onClick={() => choisir('autre')}>Autre matière</button>
        <button type="button" className="fc-lien cd-lien" onClick={pasDeControle}>Pas de contrôle prévu</button>
      </div>
      {feuille && <AjoutControle initial={feuille} onClose={() => setFeuille(null)} onSaved={enregistre} />}
    </section>
  );
}
