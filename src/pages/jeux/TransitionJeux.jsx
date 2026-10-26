import { createPortal } from 'react-dom';
import './TransitionJeux.css';

/**
 * Transition entre deux tours de Réviz Games (storyboard B du 23/10) : le décor du tour fini
 * s'enroule vers la gauche comme un tapis de feutrine et découvre un fond orange à bandes qui
 * défilent ; une grande carte en carton se retourne avec le jeu suivant (pictogramme, nom, thème,
 * tour, score) ; puis le nouveau décor se déroule depuis la droite.
 *
 * Tout est en transform, clip-path et opacité, sur une couche posée au-dessus de la page
 * (portail) : rien ne bouge dans le jeu lui-même. Les trois étapes ont les mêmes courbes pour le
 * rouleau et le bord du décor, qui restent donc collés.
 *
 * etape : 'enroule' (0,5 s) → 'carte' (1,6 s, le temps de lire) → 'deroule' (0,55 s), pilotées par
 * Jeux.jsx. Le bord est en diagonale ; fond, rouleau et étoiles sont générés (public/jeux/transition/).
 */
// carte : le temps minimum de la carte (son retournement) ; attente : au-delà, elle attend que l'élève
// touche « Je suis prêt », et passe toute seule au bout de ce délai (Johan, 23/10 : expliquer le jeu
// qui arrive, sans casser le rythme).
export const DUREES_TRANSITION = { enroule: 500, carte: 1600, attente: 7000, deroule: 550 };

const JEUX = {
  magie: { nom: 'Le tour de magie', image: '/jeux/magie/carte-dos.webp', regle: 'Retiens les cartes, suis-les quand il mélange, puis retourne les paires.' },
  lance: { nom: 'Réviz lance', image: '/pantin/accessoires/boule.webp', regle: 'Lis la question au tableau, puis glisse la boule vers le bon panier.' },
  buzzer: { nom: 'Réviz se trompe\u00a0?', image: '/jeux/buzzer/buzzer-rouge-dome.webp', regle: 'Réviz affirme quelque chose\u00a0: vrai ou faux\u00a0? Tape sur le bon buzzer.' },
  pizzeria: { nom: 'La pizzeria\u00a0!', image: '/jeux/pizzeria/pizza.webp', regle: 'Lis le ticket, touche les parts qu’il faut pour l’assiette, puis Servir.' },
  ninja: { nom: 'Le ninja des fautes', image: '/jeux/ninja/pasteque.webp', regle: 'Tranche d’un coup de doigt les mots mal écrits. Laisse passer les bons.' },
  taupe: { nom: 'Tape-taupe\u00a0!', image: '/jeux/taupe/taupe.webp', regle: 'Tape seulement les taupes qui suivent la règle de la pancarte.' },
};

// Étoiles autour de la carte : position (en % de la carte), taille relative, angle.
const ETOILES = [[-12, 8, 1, -14], [108, 18, .8, 10], [-6, 86, .7, 20], [110, 80, 1.05, -8], [50, -10, .6, 4]];

export function TransitionJeux({ etape, suivante, numero, total, score, onPret }) {
  if (!etape || !suivante) return null;
  const jeu = JEUX[suivante.type] ?? { nom: 'Jeu suivant' };
  return createPortal(
    <div className={`tj tj--${etape}`} role="status" aria-live="polite">
      <div className="tj-fond">
        <span className="tj-bandes" aria-hidden="true" />
        <div className="tj-carte">
          {ETOILES.map(([x, y, t, r], k) => (
            <span key={k} className="tj-etoile" aria-hidden="true" style={{ left: `${x}%`, top: `${y}%`, '--k': k, '--t': t, '--r': `${r}deg` }} />
          ))}
          <div className="tj-carte-int">
            {jeu.image && <img src={jeu.image} alt="" className="tj-image" />}
            <span className="tj-tour">Tour {numero} sur {total}</span>
            <span className="tj-nom">{jeu.nom}</span>
            {suivante.titre && <span className="tj-theme">{suivante.titre}</span>}
            {jeu.regle && <span className="tj-regle">{jeu.regle}</span>}
            <span className="tj-score">{score.toLocaleString('fr-FR')}</span>
          </div>
        </div>
        {onPret && (
          <button type="button" className="tj-pret" onClick={onPret} autoFocus
            style={{ '--attente': `${(DUREES_TRANSITION.carte + DUREES_TRANSITION.attente) / 1000}s` }}>
            <span className="tj-pret-jauge" aria-hidden="true" />
            <span className="tj-pret-txt">{'Je suis prêt\u00a0!'}</span>
          </button>
        )}
      </div>
      <span className="tj-rouleau" aria-hidden="true" />
    </div>,
    document.body,
  );
}
