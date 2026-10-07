// -------------------------------------------------------
// Réviz — Aura de la Battle de l'élève connecté (en-tête de Home)
//
// Le serveur l'écrit sur le profil Firestore (api/battle-fin.js). Elle est
// relue à chaque visite ; la dernière valeur connue reste sur l'appareil
// (reviz-aura-{uid}, effacée avec le compte) pour s'afficher sans attendre.
// -------------------------------------------------------
import { useEffect, useState } from 'react';
import { getUserProfile } from '../services/userProfileService';

const cle = uid => `reviz-aura-${uid}`;

function lireCache(uid) {
  try {
    const valeur = JSON.parse(localStorage.getItem(cle(uid)));
    return typeof valeur?.aura === 'number' ? valeur : null;
  } catch { return null; }
}

/**
 * @param {string|null|undefined} uid — absent pour un invité : rien n'est lu
 * @returns {{ aura: number, jouees: number } | null} null tant qu'on ne sait pas
 */
export function useAuraCompte(uid) {
  const [compte, setCompte] = useState(() => (uid ? lireCache(uid) : null));

  useEffect(() => {
    if (!uid) { setCompte(null); return undefined; }
    let actif = true;
    setCompte(lireCache(uid));
    getUserProfile(uid)
      .then(profil => {
        const valeur = { aura: profil?.aura ?? 0, jouees: profil?.battles?.jouees ?? 0 };
        try { localStorage.setItem(cle(uid), JSON.stringify(valeur)); } catch { /* stockage indisponible */ }
        if (actif) setCompte(valeur);
      })
      .catch(() => {});
    return () => { actif = false; };
  }, [uid]);

  return compte;
}
