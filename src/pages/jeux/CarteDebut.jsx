import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { JEUX_HUB } from './HubJeux';
import { jouer } from '../../utils/bruitages';
import { prechargerPartie } from './prechargement';
import './CarteDebut.css';

/**
 * La carte de début de jeu (23/10, demande de Johan : « on appuie sur le jeu et ça commence direct ») :
 * avant la première manche, dans l'univers des transitions (fond orange en papier découpé qui arrive
 * en diagonale, grande carte en carton qui se retourne, étoiles en papier), la règle du jeu en trois
 * étapes, le nombre de tours, le record, et un bouton « Démarrer ». Rien ne part tant qu'on ne l'a pas
 * touché ; « Retour » revient à l'écran des jeux.
 *
 * cle : 'jour', 'melange' ou un jeu seul ; partie : les manches déjà tirées (la Partie rapide annonce
 * ainsi son premier jeu) ; record : le meilleur score de ce mode sur l'appareil (0 si aucun).
 * Pendant la lecture, la partie se charge (prechargement.js : pantin, costume, décor) ; la jauge du
 * bouton « Démarrer » montre où en est la première manche, sans jamais le bloquer. large : ordinateur
 * (décors en paysage) ; accessoiresDe(type) : le costume de Réviz pour un jeu.
 */
export const ETAPES = {
  magie: ['Mémorise les paires tant que les cartes sont retournées.', 'Réviz les cache et les mélange : suis-les des yeux.', 'Retourne-les deux par deux pour refaire les paires.'],
  lance: ['Lis la question écrite au tableau.', 'Glisse la boule vers le panier de la bonne réponse.', 'Les paniers bougent de plus en plus vite.'],
  buzzer: ['Réviz affirme quelque chose au micro.', 'Vrai ? Buzzer vert. Faux ? Buzzer rouge.', 'Attention, il dit parfois vrai pour te piéger !'],
  pizzeria: ['Lis la fraction sur le ticket de commande.', 'Touche les parts qu’il faut pour remplir l’assiette.', 'Appuie sur Servir quand c’est juste.'],
  ninja: ['Des fruits sautent, chacun porte un mot.', 'Tranche d’un coup de doigt les mots mal écrits.', 'Laisse retomber ceux qui sont bien écrits.'],
  taupe: ['Lis la règle sur la pancarte.', 'Tape les taupes qui suivent la règle.', 'Laisse les autres replonger dans leur trou.'],
};
const MELANGES = {
  jour: { nom: 'La partie du jour', tag: 'Défi du jour', image: '/jeux/hub/partie-du-jour.webp',
    etapes: ['La même partie pour tout le monde aujourd’hui.', 'Les jeux s’enchaînent, de plus en plus vite.', 'Avant chaque jeu, une carte te rappelle la règle.'] },
  melange: { nom: 'Partie rapide', tag: 'Tous les jeux', etapes: ['Les jeux arrivent au hasard, un par tour.', 'Chaque tour va un peu plus vite que le précédent.', 'Avant chaque jeu, une carte te rappelle la règle.'] },
};
// Étoiles autour de la carte : position (en % de la carte), taille relative, angle (comme la transition).
const ETOILES = [[-8, 6, 1, -14], [106, 14, .8, 10], [-6, 78, .7, 20], [108, 70, 1.05, -8], [52, -4, .6, 4]];

const nombre = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const calme = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function CarteDebut({ cle, partie, record = 0, large = false, accessoiresDe, boutonSon, onDemarrer, onRetour }) {
  const jeu = JEUX_HUB.find(j => j.cle === cle);
  const melange = MELANGES[cle];
  const premier = melange && JEUX_HUB.find(j => j.cle === partie[0]?.type);
  const nom = melange?.nom ?? jeu?.nom ?? 'Réviz Games';
  const tag = melange?.tag ?? jeu?.tag;
  const image = melange?.image ?? `/jeux/hub/${(premier ?? jeu)?.cle}.webp`;
  const etapes = melange?.etapes ?? ETAPES[cle] ?? [];
  const tours = partie.length;
  const duree = Math.max(...partie.map(m => m.duree ?? 0));

  const [charge, setCharge] = useState(0);
  useEffect(() => prechargerPartie(partie, { large, accessoiresDe, onProgres: setCharge }), [partie]); // eslint-disable-line react-hooks/exhaustive-deps
  // Le bruit de carte une seule fois, à l'ouverture ; Échap revient aux jeux.
  const retour = useRef(onRetour);
  retour.current = onRetour;
  useEffect(() => {
    const t = setTimeout(() => jouer('carte'), calme() ? 0 : 380);
    const touche = e => { if (e.key === 'Escape') retour.current(); };
    window.addEventListener('keydown', touche);
    return () => { clearTimeout(t); window.removeEventListener('keydown', touche); };
  }, []);

  return createPortal(
    <div className="cd" role="dialog" aria-modal="true" aria-labelledby="cd-nom" aria-describedby="cd-etapes">
      <span className="cd-bandes" aria-hidden="true" />
      <div className="cd-haut">
        <button type="button" className="cd-rond" onClick={onRetour} aria-label="Retour aux jeux">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
        </button>
        {boutonSon}
      </div>
      <div className="cd-scene">
        <div className="cd-carte">
          {ETOILES.map(([x, y, t, r], k) => (
            <span key={k} className="cd-etoile" aria-hidden="true" style={{ left: `${x}%`, top: `${y}%`, '--k': k, '--t': t, '--r': `${r}deg` }} />
          ))}
          <div className="cd-carte-int">
            <span className="cd-image" style={{ '--teinte': (premier ?? jeu)?.teinte ?? '#3A1D0C' }}>
              <img src={image} alt="" />
              {premier && <span className="cd-premier">1<sup>er</sup> jeu&nbsp;: {premier.nom}</span>}
            </span>
            {tag && <span className="cd-tag">{tag}</span>}
            <h2 id="cd-nom" className="cd-nom">{nom}</h2>
            <ol id="cd-etapes" className="cd-etapes">
              {etapes.map((e, k) => <li key={k} style={{ '--k': k }}><span className="cd-num" aria-hidden="true">{k + 1}</span><span>{e}</span></li>)}
            </ol>
            <p className="cd-infos">
              <span>{tours} tour{tours > 1 ? 's' : ''}{duree ? ` de ${duree} s` : ''}</span>
              {record > 0 && <span className="cd-record">Ton record&nbsp;: <b>{nombre(record)}</b></span>}
            </p>
          </div>
        </div>
      </div>
      <button type="button" className={`cd-demarrer${charge >= 1 ? ' cd-demarrer--pret' : ''}`} onClick={() => { jouer('glisse'); onDemarrer(); }} autoFocus
        aria-describedby="cd-charge">
        <span className="cd-jauge" aria-hidden="true" style={{ transform: `scaleX(${charge})` }} />
        <span id="cd-charge" className="cd-sr">{charge >= 1 ? 'Le jeu est prêt.' : 'Le jeu se charge.'}</span>
        Démarrer
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
    </div>,
    document.body,
  );
}
