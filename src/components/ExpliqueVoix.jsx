import { useEffect, useRef, useState } from 'react';
import { Fenetre } from './revizplus/RevizPlusOffre';
import { mesurer } from '../services/mesure';
import { nbsp } from '../utils/typography';
import '../components/RevizPlusAnnonce.css';
import './ExpliqueVoix.css';

/** La dictée du navigateur (Chrome, Edge, Safari), ou null. */
function Reconnaissance() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/** La question envoyée à Réviz IA : il corrige ce que l'élève a dit, sans refaire tout le cours. */
export function questionExplication(titre, texte) {
  return `Voici ce que j’ai retenu de « ${titre} », dit avec mes mots : « ${texte.trim()} ». `
    + 'Dis-moi ce qui est juste, ce qui manque et ce qui est faux, en quelques lignes, sans refaire tout le cours.';
}

/**
 * « Explique à voix haute » (11/11, repris de Knowunity : leur étape « Explain out loud ») :
 * l'élève raconte le chapitre de mémoire, comme à un ami ; Réviz IA lui dit ce qui manque.
 * C'est du rappel actif. Dictée du navigateur en français ; sans elle (Firefox, refus du micro),
 * l'élève l'écrit. Rien n'est enregistré : seul le texte part, comme une question à Réviz IA.
 * @param {{ titre: string, onEnvoyer: (question: string) => void, variante?: 'ligne'|'bouton' }} p
 */
export function ExpliqueVoix({ titre, onEnvoyer, variante = 'ligne' }) {
  const [ouvert, setOuvert] = useState(false);
  const ouvrir = () => { setOuvert(true); mesurer('explique_voix', { etape: 'ouvert' }); };
  return (
    <>
      {variante === 'ligne' ? (
        <button type="button" className="nf-ligne nf-ligne--ia ev-ligne" onClick={ouvrir}>
          <span className="ev-rond" aria-hidden="true"><Micro /></span>
          <span className="nf-ligne-txt">
            <span className="nf-ligne-titre">Explique-le à voix haute</span>
            <span className="nf-ligne-sous">Réviz IA te dit ce qui manque</span>
          </span>
        </button>
      ) : (
        <button type="button" className="ch-ia-suggestion ev-bouton" onClick={ouvrir}><Micro /> Explique-le à voix haute</button>
      )}
      {ouvert && <Feuille titre={titre} onEnvoyer={onEnvoyer} onClose={() => setOuvert(false)} />}
    </>
  );
}

function Feuille({ titre, onEnvoyer, onClose }) {
  const Reco = Reconnaissance();
  const [texte, setTexte] = useState('');
  const [ecoute, setEcoute] = useState(false);
  const [ecrit, setEcrit] = useState(!Reco); // sans dictée : on écrit
  const [erreur, setErreur] = useState('');
  const reco = useRef(null);
  const acquis = useRef('');

  useEffect(() => () => reco.current?.abort?.(), []);

  function parler() {
    setErreur('');
    const r = new Reco();
    r.lang = 'fr-FR';
    r.continuous = true;
    r.interimResults = true;
    acquis.current = texte ? `${texte} ` : '';
    r.onresult = e => {
      let finals = '', provisoire = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finals += t; else provisoire += t;
      }
      acquis.current += finals;
      setTexte(`${acquis.current}${provisoire}`.replace(/\s+/g, ' ').trimStart());
    };
    r.onerror = e => {
      setEcoute(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { setErreur('Le micro est bloqué : écris-le plutôt.'); setEcrit(true); }
      else if (e.error !== 'aborted' && e.error !== 'no-speech') setErreur('Je n’ai pas bien entendu. Réessaie, ou écris-le.');
    };
    r.onend = () => setEcoute(false);
    reco.current = r;
    try { r.start(); setEcoute(true); mesurer('explique_voix', { etape: 'parle' }); } catch { setEcrit(true); }
  }
  function arreter() { reco.current?.stop(); setEcoute(false); }
  function envoyer() {
    if (texte.trim().length < 10) { setErreur('Dis-en un peu plus : deux ou trois phrases.'); return; }
    reco.current?.abort?.();
    mesurer('explique_voix', { etape: 'envoye', ecrit, mots: texte.trim().split(/\s+/).length });
    onClose();
    onEnvoyer(questionExplication(titre, texte));
  }

  return (
    <Fenetre label="Explique à voix haute" pose={ecoute ? 'thinking' : 'hello'} onClose={onClose}>
      <h2 className="rpa-titre">Explique à voix haute</h2>
      <p className="rpa-texte">{nbsp(`Raconte ce que tu as retenu de « ${titre} », comme à un ami, sans regarder ton cours. Réviz IA te dit ce qui manque.`)}</p>
      <textarea className="ev-texte" rows={5} value={texte} onChange={e => setTexte(e.target.value)} readOnly={ecoute}
        placeholder={ecrit ? 'Écris-le en quelques phrases…' : 'Ce que tu dis s’écrit ici.'} aria-label="Ce que tu as retenu" />
      {erreur && <p className="ev-erreur" role="alert">{erreur}</p>}
      {!ecrit && (ecoute ? (
        <button type="button" className="rpo-btn ev-ecoute" onClick={arreter}><span className="ev-onde" aria-hidden="true" />J’ai fini de parler</button>
      ) : (
        <button type="button" className="rpo-btn rpo-btn--second" onClick={parler}><Micro /> {texte ? 'Continuer à parler' : 'Parler'}</button>
      ))}
      <button type="button" className="rpo-btn" onClick={envoyer} disabled={ecoute || !texte.trim()}>Demander à Réviz IA</button>
      {!ecrit && !ecoute && <button type="button" className="rpo-lien" onClick={() => setEcrit(true)}>Je préfère l’écrire</button>}
    </Fenetre>
  );
}

const Micro = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
