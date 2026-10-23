/**
 * Musique de l'écran de fin de Réviz Games (23/10) : la piste Google Flow Music « Victory Bounce »
 * (glockenspiel, boîte à musique, cuivres doux, 100 BPM), jouée entière en boucle, sans montage
 * (public/jeux/fin/musique.mp3 ; sources WAV, avec l'autre prise « Stage Clear », dans
 * refonte-2026-11/games-mondes/fin/musique/). Elle part un peu après l'arrivée, pour laisser passer
 * la fanfare du podium, continue pendant le récap et s'arrête en fondu quand on rejoue ou quitte.
 * Elle suit le bouton son des bruitages. Piste faite sur un compte Flow gratuit, sans usage
 * commercial : à regénérer avant le lancement.
 */
import { sonActif, contexteAudio } from './bruitages';
import { pisteDecodee } from './musiqueCommun';

const URL_PISTE = '/jeux/fin/musique.mp3';
let ctx = null, sortie = null, source = null, actif = false;
let generation = 0; // chaque démarrage et chaque arrêt change de génération : un chargement périmé ne joue rien

// Le contexte audio partagé avec les bruitages (un seul pour la page, voir bruitages.js).
function contexte() {
  ctx = contexteAudio();
  return ctx;
}
const piste = pisteDecodee(URL_PISTE);

export const musiqueFin = {
  async demarrer() {
    if (actif || !sonActif() || !contexte()) return;
    actif = true;
    const mien = ++generation;
    const out = sortie = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 1.2);
    out.connect(ctx.destination);
    let tampon;
    try { tampon = await piste.charger(ctx); } catch { if (mien === generation) { actif = false; out.disconnect(); } return; } // sans la piste, la fin reste en silence
    if (mien !== generation) return; // arrêtée (ou relancée) pendant le chargement : pas de source orpheline
    source = ctx.createBufferSource();
    source.buffer = tampon; source.loop = true;
    source.connect(out);
    source.start(ctx.currentTime + 0.05);
  },
  arreter() {
    if (!actif) return;
    actif = false;
    generation += 1;
    const out = sortie, s = source;
    source = null;
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    setTimeout(() => { s?.stop(); out.disconnect(); }, 600);
  },
  joue: () => actif,
  /** Relâche le morceau décodé (à appeler une fois la musique arrêtée, en quittant les jeux). */
  liberer: () => piste.liberer(),
};
