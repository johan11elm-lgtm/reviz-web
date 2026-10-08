// -------------------------------------------------------
// Réviz — Empires historiques reconstitués SCHÉMATIQUEMENT à partir des pays
// actuels (unités Natural Earth) : pays entiers + pays coupés par des polygones
// convexes en lon/lat. Approximations, à signaler dans la légende des cartes.
// -------------------------------------------------------
import { masque } from './_histoire.mjs'

// Pays (unités) entièrement dans l'Empire en 117 (approximation).
export const ROME_ENTIERS = ['PRX', 'ESP', 'AND', 'FXX', 'MCO', 'BCR', 'BFR', 'BWR', 'LUX', 'CHE', 'LIE', 'ITA', 'SMR', 'MLT', 'SVN', 'HRV',
  'BHF', 'BIS', 'SRS', 'MNE', 'KOS', 'ALB', 'MKD', 'GRC', 'BGR', 'TUR', 'CYP', 'CYN', 'SYR', 'LBN', 'ISR', 'GAZ', 'WEB', 'JOR',
  'ENG', 'WLS', 'ARM', 'IRQ']
// Pays coupés : polygones convexes (lon/lat) à garder, schématiques.
export const ROME_COUPES = {
  NLD: [[[3, 50.5], [3, 51.95], [7.5, 51.85], [7.5, 50.5]]], // au sud du Rhin
  DEU: [
    [[5, 47], [5, 52], [6.3, 51.8], [7.6, 50.4], [8, 47]], // rive gauche du Rhin
    [[7.6, 50.4], [8.9, 50.1], [12.1, 49.0], [13.9, 48.5], [13.9, 47], [7.6, 47]], // champs Décumates, sud du Danube
  ],
  AUT: [[[9, 46], [9, 47.6], [13.4, 48.6], [16.9, 48.25], [17.5, 46]]], // au sud du Danube
  SVK: [[[16.8, 47.6], [16.8, 48.2], [18.9, 47.85], [18.9, 47.6]]],
  HUN: [[[15.9, 45.6], [15.9, 48.2], [18.9, 47.8], [18.85, 45.6]]], // Pannonie, à l'ouest du Danube
  SRV: [[[18.8, 44.7], [18.8, 45.2], [22, 45.2], [22, 44.7]]],
  ROU: [
    [[20, 44], [20.2, 46.4], [22.5, 47.6], [24.8, 47.6], [26.1, 46.4], [26.1, 44]], // Dacie (Transylvanie, Banat, Olténie)
    [[27.6, 43.6], [27.6, 44.8], [28.8, 45.4], [30, 45.4], [30, 43.6]], // Dobroudja (Mésie)
  ],
  MAR: [[[-7.2, 33.6], [-7.2, 36.2], [-1, 36.2], [-1, 34.4], [-5, 33.6]]], // Maurétanie Tingitane
  DZA: [[[-2.5, 34.6], [-2.5, 37.5], [9, 37.5], [9, 33.8], [5, 34.4]]],
  TUN: [[[7, 32.6], [7, 38], [12, 38], [12, 32.6]]],
  LBY: [[[9, 30.4], [9, 33.5], [26, 33.5], [26, 30.2], [20, 29.8]]],
  EGY: [[[24.5, 23.6], [24.5, 32], [35.5, 32], [35.5, 23.6]]],
  SAU: [[[34.5, 26.2], [34.5, 30.2], [38.5, 32.2], [38.5, 26.2]]], // Arabie pétrée
}

/**
 * Anneaux (écran) d'un ensemble reconstitué : `pays` = [{ unite, rings }] déjà
 * découpés au cadre, `xy` = projection de la carte.
 */
export function reconstituer(pays, xy, entiers, coupes) {
  const U = u => pays.filter(p => p.unite === u).flatMap(p => p.rings)
  return [
    ...entiers.flatMap(U),
    ...Object.entries(coupes).flatMap(([u, polys]) => polys.flatMap(poly => masque(U(u), poly, xy))),
  ]
}

// Empire romain au IIe siècle (après l'abandon de la Mésopotamie et de l'Arménie, 118).
export const ROME_IIE_ENTIERS = ROME_ENTIERS.filter(u => !['IRQ', 'ARM'].includes(u))

// Chine des Han orientaux (IIe siècle apr. J.-C.), très schématique : Chine des
// plaines et des vallées jusqu'à la Grande Muraille, corridor du Gansu jusqu'à
// Dunhuang, nord du Viêt Nam actuel et nord-ouest de la Corée.
export const HAN_ENTIERS = []
export const HAN_COUPES = {
  CHN: [
    [[98.5, 21], [100.5, 33.5], [104.5, 38.5], [112, 41.6], [120, 42.4], [126, 41], [124, 30], [118, 21], [108, 17.5]],
    [[93, 39.2], [94, 41], [99.5, 40.4], [104.5, 38.5], [101, 35.5], [96, 37.5]], // corridor du Gansu
  ],
  VNM: [[[102, 17.6], [102, 23.5], [108.5, 23.5], [108.5, 17.6]]],
  PRK: [[[124, 37.5], [124, 40.2], [127.5, 40.2], [127.5, 37.5]]],
}

// Empire parthe (IIe siècle), schématique : plateau iranien et Mésopotamie.
export const PARTHES_ENTIERS = ['IRN', 'IRQ']
export const PARTHES_COUPES = {
  TKM: [[[52, 35], [52, 39], [62.5, 38.5], [62.5, 35]]],
  KWT: [[[46.5, 28.5], [46.5, 30.2], [48.5, 30.2], [48.5, 28.5]]],
}

// Empire kouchan (IIe siècle), schématique : Bactriane, Afghanistan, vallée de l'Indus, haut Gange.
export const KOUCHANS_ENTIERS = ['AFG', 'PAK']
export const KOUCHANS_COUPES = {
  IND: [[[68, 22], [72.5, 35], [78, 35], [84.5, 27], [84.5, 22]]],
  TJK: [[[67, 36.5], [67, 39.5], [71.5, 39.5], [71.5, 36.5]]],
  UZB: [[[64, 37], [64, 39.6], [68.5, 39.6], [68.5, 37]]],
}

// ---- Vers 800 (schématique) ----
// Empire carolingien à la mort de Charlemagne (814) : Gaule, Germanie jusqu'à l'Elbe,
// Bavière et marche de l'Est, Italie du Nord et du Centre, marche d'Espagne.
export const CAROLINGIENS_ENTIERS = ['FXX', 'MCO', 'BCR', 'BFR', 'BWR', 'LUX', 'NLD', 'CHE', 'LIE', 'AND', 'SMR', 'SVN']
export const CAROLINGIENS_COUPES = {
  DEU: [
    [[5, 47], [5, 55], [9.5, 55], [11.6, 53.4], [13.9, 48.5], [13.9, 47]], // jusqu'à l'Elbe et la Saale
  ],
  AUT: [[[9, 46.3], [9, 47.8], [13, 48.9], [16.5, 48.4], [16.5, 46.3]]],
  ITA: [[[6, 41.6], [6, 47.5], [14, 47.5], [14, 42], [12.8, 41.2]]], // Lombardie, Toscane, Spolète, États du pape
  ESP: [[[0.4, 40.9], [0.4, 43], [3.5, 43], [3.5, 40.9]]], // marche d'Espagne
  HRV: [[[13.4, 44.8], [13.4, 46.6], [16.5, 46.6], [16.5, 44.8]]], // Istrie et Frioul oriental
}
// Empire byzantin vers 800 : Grèce, Thrace, Asie Mineure, Italie du Sud, Sicile.
export const BYZANCE_ENTIERS = ['GRC', 'CYP', 'CYN']
export const BYZANCE_COUPES = {
  TUR: [[[25.5, 35], [25.5, 42.2], [40.5, 41.5], [40.5, 36.8], [36, 36]]],
  ITA: [
    [[15.6, 37.5], [15.6, 40.2], [17.2, 39.7], [17.2, 37.5]], // Calabre
    [[17.6, 39.6], [17.6, 41], [18.7, 41], [18.7, 39.6]], // Terre d'Otrante
    [[12, 36.5], [12, 38.4], [15.7, 38.4], [15.7, 36.5]], // Sicile
  ],
  ALB: [[[19.2, 40.9], [19.2, 41.6], [19.7, 41.6], [19.7, 40.9]]], // Dyrrachion
}
// Monde musulman vers 800 : émirat de Cordoue, Maghreb, califat abbasside.
export const ISLAM_ENTIERS = ['MAR', 'TUN', 'EGY', 'SYR', 'LBN', 'ISR', 'GAZ', 'WEB', 'JOR', 'IRQ', 'IRN', 'KWT', 'SAH']
export const ISLAM_COUPES = {
  ESP: [[[-9.5, 35.8], [-9.5, 41.6], [-4, 42.2], [0.3, 42.4], [0.3, 38.6], [-2, 35.8]]],
  PRX: [[[-10, 36.8], [-10, 41.4], [-6, 41.4], [-6, 36.8]]],
  DZA: [[[-2.5, 32], [-2.5, 37.5], [9, 37.5], [9, 32]]],
  LBY: [[[9, 30], [9, 33.5], [25.5, 33.5], [25.5, 30]]],
  SAU: [[[34.5, 16], [34.5, 32.2], [50, 32.2], [50, 16]]],
  TUR: [[[36, 36], [40.5, 36.8], [44.5, 37.2], [44.5, 35.5], [36, 35.5]]],
}

// ---- XVIe siècle (schématique) ----
// Possessions de Charles Quint en Europe (vers 1550) : Espagne, Pays-Bas, Franche-Comté,
// royaume de Naples, Sicile, Sardaigne, Milanais.
export const CQ_EUROPE_ENTIERS = ['ESP', 'NLD', 'BCR', 'BFR', 'BWR', 'LUX']
export const CQ_EUROPE_COUPES = {
  FXX: [
    [[5.1, 46.3], [5.1, 47.9], [6.9, 47.9], [6.9, 46.3]], // Franche-Comté
    [[1.6, 50.1], [1.6, 51.1], [4.3, 51.1], [4.3, 50.1]], // Artois et Flandre
  ],
  ITA: [
    [[13, 41.6], [13.9, 42.9], [16, 42.2], [19, 40.3], [17.5, 37.5], [15, 37.5]], // royaume de Naples (péninsule)
    [[12, 36.5], [12, 38.4], [15.7, 38.4], [15.7, 36.5]], // Sicile
    [[8, 38.8], [8, 41.4], [9.9, 41.4], [9.9, 38.8]], // Sardaigne
    [[8.4, 44.9], [8.4, 46.4], [10.6, 46.4], [10.6, 44.9]], // Milanais
  ],
}
// Amérique espagnole vers 1550.
export const CQ_AMERIQUE_ENTIERS = ['GTM', 'BLZ', 'HND', 'SLV', 'NIC', 'CRI', 'PAN', 'CUB', 'DOM', 'HTI', 'PRI', 'JAM', 'COL', 'ECU', 'PER', 'BOL']
export const CQ_AMERIQUE_COUPES = {
  MEX: [[[-118, 14], [-118, 24.5], [-96, 24.5], [-86, 22], [-86, 14]]],
  VEN: [[[-74, 8], [-74, 12.5], [-60, 12.5], [-60, 8]]],
  CHL: [[[-76, -38], [-76, -17], [-67, -17], [-67, -38]]],
}
// Saint-Empire romain germanique (Charles Quint empereur à partir de 1519).
export const SAINT_EMPIRE_ENTIERS = ['DEU', 'AUT', 'CZE', 'SVN']
// Empire ottoman à la mort de Soliman (1566).
export const OTTOMANS_ENTIERS = ['TUR', 'GRC', 'BGR', 'MKD', 'ALB', 'SRS', 'SRV', 'KOS', 'MNE', 'BHF', 'BIS', 'SYR', 'LBN', 'ISR', 'GAZ', 'WEB', 'JOR', 'IRQ', 'EGY', 'KWT']
export const OTTOMANS_COUPES = {
  HUN: [[[16.5, 45.7], [17.5, 47.4], [19.5, 48.1], [22.5, 47.6], [22.9, 45.7]]], // Hongrie centrale (1541)
  HRV: [[[15.6, 44.2], [15.6, 45.5], [19.5, 45.5], [19.5, 44.2]]], // Slavonie, arrière-pays dalmate
  ROU: [[[20.2, 45.2], [20.2, 46.6], [22.3, 46.6], [22.3, 45.2]], [[27.4, 43.6], [27.4, 45.5], [30, 45.5], [30, 43.6]]], // Banat, Dobroudja
  LBY: [[[9, 30.5], [9, 33.5], [25.5, 33.5], [25.5, 30.5]]], // Tripolitaine, Cyrénaïque (côtes)
  DZA: [[[-2, 34.6], [-2, 37.5], [8.6, 37.5], [8.6, 34.6]]], // régence d'Alger
  SAU: [[[34.5, 20], [34.5, 29.5], [41, 29.5], [41, 20]]], // Hedjaz
}
