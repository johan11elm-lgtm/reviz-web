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

const URL_PISTE = '/jeux/fin/musique.mp3';
let ctx = null, tampon = null, chargement = null, sortie = null, source = null, actif = false;

// Le contexte audio partagé avec les bruitages (un seul pour la page, voir bruitages.js).
function contexte() {
  ctx = contexteAudio();
  return ctx;
}
function charger() {
  chargement ??= fetch(URL_PISTE).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(t => { tampon = t; })
    .catch(e => { chargement = null; throw e; });
  return chargement;
}

export const musiqueFin = {
  async demarrer() {
    if (actif || !sonActif() || !contexte()) return;
    actif = true;
    sortie = ctx.createGain();
    sortie.gain.setValueAtTime(0.0001, ctx.currentTime);
    sortie.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 1.2);
    sortie.connect(ctx.destination);
    try { await charger(); } catch { actif = false; return; } // sans la piste, la fin reste en silence
    if (!actif) return; // arrêtée pendant le chargement
    source = ctx.createBufferSource();
    source.buffer = tampon; source.loop = true;
    source.connect(sortie);
    source.start(ctx.currentTime + 0.05);
  },
  arreter() {
    if (!actif) return;
    actif = false;
    const out = sortie, s = source;
    source = null;
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    setTimeout(() => { s?.stop(); out.disconnect(); }, 600);
  },
  joue: () => actif,
};
