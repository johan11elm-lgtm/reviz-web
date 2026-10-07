import { useState } from 'react';
import { BattleJoueur } from './BattleJoueur';
import { BattleRegles } from './BattleRegles';
import { lienBattle } from '../../utils/battle';

/**
 * Le salon : le code à partager, les deux joueurs, et le départ (hôte).
 */
export function BattleSalon({ code, salon, role, chapitre, onLancer, onQuitter }) {
  const [copie, setCopie] = useState(false);
  const lien = lienBattle(code, window.location.origin);
  const pret = salon.invite?.present === true;

  async function partager() {
    const texte = `Rejoins ma battle sur Réviz (${chapitre?.titre ?? 'chapitre du programme'}) : code ${code}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Battle Réviz', text: texte, url: lien }); return; } catch { /* annulé : on copie */ }
    }
    try {
      await navigator.clipboard.writeText(`${texte}\n${lien}`);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch { /* presse-papiers refusé : le code reste lisible */ }
  }

  return (
    <div className="battle-salon">
      <div className="rv-card rv-card--padded battle-code-card">
        <span className="battle-code-label" id="battle-code-label">Code de la partie</span>
        <div className="battle-code" aria-labelledby="battle-code-label">
          {[...code].map((c, i) => <span key={i} className="battle-code-car">{c}</span>)}
        </div>
        {role === 'hote' && (
          <button type="button" className="rv-btn-cta rv-btn-cta--ghost rv-btn-cta--center battle-partager" onClick={partager}>
            {copie ? 'Lien copié' : 'Partager le lien'}
          </button>
        )}
      </div>

      <div className="battle-versus">
        <BattleJoueur joueur={salon.hote} role="hote" moi={role === 'hote'} />
        <span className="battle-versus-vs" aria-hidden="true">VS</span>
        <BattleJoueur joueur={salon.invite ?? null} role="invite" moi={role === 'invite'} />
      </div>

      <BattleRegles />

      <div className="battle-actions">
        {role === 'hote' ? (
          <>
            <button type="button" className="rv-btn-cta rv-btn-cta--full" onClick={onLancer} disabled={!pret}>
              <span>{pret ? "C'est parti" : 'En attente de ton adversaire…'}</span>
              {pret && <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>}
            </button>
            {!salon.invite && <p className="battle-aide">Envoie le code ou le lien à ton adversaire.</p>}
          </>
        ) : (
          <p className="battle-aide battle-aide--fort">{salon.hote.prenom} va lancer la partie.</p>
        )}
        <button type="button" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost rv-btn-cta--center" onClick={onQuitter}>
          Quitter
        </button>
      </div>
    </div>
  );
}
