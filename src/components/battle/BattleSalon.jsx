import { useState } from 'react';
import { BattleMascot } from '../BattleMascot';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { CHRONO_MS, ROUNDS, lienBattle } from '../../utils/battle';

const Partage = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
);
const Copie = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="3" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
);

/**
 * Le salon : le code à partager, les deux joueurs face à face, et le départ (hôte).
 */
export function BattleSalon({ code, salon, role, chapitre, onLancer }) {
  const isDesktop = useIsDesktop();
  const [copie, setCopie] = useState(false);
  const lien = lienBattle(code, window.location.origin);
  const pret = salon.invite?.present === true;
  const regle = `${ROUNDS} rounds · ${CHRONO_MS / 1000} s par question`;

  async function partager() {
    const texte = `Rejoins ma battle sur Réviz (${chapitre?.titre ?? 'chapitre du programme'}) : code ${code}`;
    if (navigator.share && !isDesktop) {
      try { await navigator.share({ title: 'Battle Réviz', text: texte, url: lien }); return; } catch { /* annulé : on copie */ }
    }
    try {
      await navigator.clipboard.writeText(`${texte}\n${lien}`);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch { /* presse-papiers refusé : le code reste lisible */ }
  }

  const taille = isDesktop ? 300 : 120;
  const hote = (
    <div className="bt-salon-joueur bt-salon-joueur--hote">
      {isDesktop && <span className="bt-deco bt-deco--bas" aria-hidden="true" />}
      <BattleMascot pose="garde" couleur="encre" size={taille} priority alt="" aria-hidden="true" />
      <b>{salon.hote.prenom}</b>
      <span>{role === 'hote' ? 'Toi · hôte' : 'Hôte'}</span>
    </div>
  );
  const invite = (
    <div className={`bt-salon-joueur bt-salon-joueur--invite${salon.invite ? '' : ' is-vide'}`}>
      {isDesktop && <span className="bt-deco bt-deco--haut" aria-hidden="true" />}
      {salon.invite ? (
        <>
          <BattleMascot pose="garde" couleur="rouge" size={taille} priority alt="" aria-hidden="true" />
          <b>{salon.invite.prenom}</b>
          <span className={pret ? 'bt-pret' : ''}>{role === 'invite' ? 'Toi' : pret ? 'Dans le salon' : 'Reconnexion…'}</span>
        </>
      ) : (
        <>
          <span className="bt-salon-place" style={{ width: taille * 0.85, height: taille * 0.85 }} aria-hidden="true" />
          <span className="bt-salon-attente">En attente de ton adversaire…</span>
        </>
      )}
    </div>
  );

  const depart = role === 'hote' ? (
    <>
      <button type="button" className="bt-btn" onClick={onLancer} disabled={!pret}>C’est parti</button>
      <p className="bt-note">{salon.invite ? regle : 'Envoie le code ou le lien à ton adversaire.'}</p>
    </>
  ) : (
    <>
      <p className="bt-attente-hote" role="status">{salon.hote.prenom} va lancer la partie.</p>
      <p className="bt-note">{regle}</p>
    </>
  );

  const codeCarte = (
    <div className="bt-carte bt-code-carte">
      <span className="bt-sur" id="bt-code-label">Code du salon</span>
      <p className="bt-code" aria-labelledby="bt-code-label">{code}</p>
      <div className="bt-lien">
        <span className="bt-lien-url">{lien.replace(/^https?:\/\//, '')}</span>
        <button type="button" className="bt-btn bt-btn--peche bt-btn--petit" onClick={partager}>
          {isDesktop ? <Copie /> : <Partage />}{copie ? 'Lien copié' : isDesktop ? 'Copier le lien' : 'Partager'}
        </button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <div className="bt-salon bt-salon--large">
        {hote}
        <div className="bt-salon-centre">
          {codeCarte}
          <span className="bt-vs" aria-hidden="true">VS</span>
          {depart}
        </div>
        {invite}
      </div>
    );
  }
  return (
    <div className="bt-salon">
      {codeCarte}
      <div className="bt-salon-face">
        {hote}
        <span className="bt-vs" aria-hidden="true">VS</span>
        {invite}
      </div>
      {depart}
    </div>
  );
}
