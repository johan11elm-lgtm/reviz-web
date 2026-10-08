// Réviz — Éprouvette graduée en gros plan : graduations de 50 à 60 mL en 10 intervalles
// (1 graduation = 1 mL), ménisque dont le bas est à 56 mL, œil placé à la hauteur du bas
// du ménisque (ligne de visée en accent). Figure commune : 5eme/physique-chimie/etats-de-la-matiere
// (méthode : « écart entre deux nombres écrits ÷ nombre d'intervalles ») et
// 6eme/sciences-et-technologie/etats-de-la-matiere (graduations de 1 mL).
// Sortie : public/programme/illustrations/communs/eprouvette-graduee.svg
import { C, r1, doc, etq, etqFixe, mention, rappel, ecrireSvg } from './_pc.mjs'

const XG = 128, XD = 208, XM = (XG + XD) / 2   // parois du tube
const Y = v => r1(250 - (v - 50) * 20)        // 20 px par mL
const HAUT = 22, BAS = 282
const LECTURE = 56, CREUX = 12                // bas du ménisque, hauteur de la courbure
const yb = Y(LECTURE), yp = yb - CREUX
const corps = []
// liquide (eau : aplat bleu) sous le ménisque
const men = `M${XG},${yp} C${XG + 4},${yb - 4} ${XG + 16},${yb} ${XM},${yb} C${XD - 16},${yb} ${XD - 4},${yb - 4} ${XD},${yp}`
corps.push(`<path d="${men} V${BAS} H${XG} Z" fill="${C.bleuClair}"/>`)
corps.push(`<path d="${men}" fill="none" stroke="${C.bleu}" stroke-width="1.75"/>`)
// parois (tube coupé en haut et en bas : gros plan)
corps.push(`<path d="M${XG},${HAUT} V${BAS} M${XD},${HAUT} V${BAS}" stroke="${C.encre}" stroke-width="1.75" fill="none"/>`)
// graduations
let t = ''
for (let v = 50; v <= 60; v++) t += `M${XG},${Y(v)} h${v % 5 ? 13 : 26} `
for (const v of [49, 61]) t += `M${XG},${Y(v)} h13 `
corps.push(`<path d="${t.trim()}" stroke="${C.encre}" stroke-width="1.5"/>`)
corps.push(etqFixe(XG - 8, Y(60) + 4, '60', 'end'))
corps.push(etqFixe(XG - 8, Y(50) + 4, '50', 'end'))
corps.push(mention(XG - 8, Y(60) - 14, 'mL', 'end'))
// accolade « 1 mL » entre 58 et 59
const xa = XG + 18
corps.push(`<path d="M${xa},${Y(59) + 1} h4 V${Y(58) - 1} h-4" stroke="${C.encre}" stroke-width="1.25" fill="none"/>`)
corps.push(etq(xa + 10, (Y(58) + Y(59)) / 2 + 4, '1 mL'))
// œil (profil, regard vers la gauche) et ligne de visée
const xo = 300
corps.push(`<path d="M${xo - 18},${yb} Q${xo - 2},${yb - 13} ${xo + 16},${yb - 3} M${xo - 18},${yb} Q${xo - 2},${yb + 12} ${xo + 16},${yb + 3}" stroke="${C.encre}" stroke-width="1.75" fill="none" stroke-linecap="round"/>`)
corps.push(`<circle cx="${xo - 8}" cy="${yb}" r="4.2" fill="${C.encre}"/>`)
corps.push(`<path d="M${xo - 22},${yb} H${XG}" stroke="${C.accent}" stroke-width="2.25" stroke-dasharray="6 4"/>`)
corps.push(`<circle cx="${XM}" cy="${yb}" r="2.6" fill="${C.accent}"/>`)
// étiquettes
corps.push(etq(232, 90, 'Ménisque'))
corps.push(rappel([244, 94], [XD - 6, yp + 3.5]))
corps.push(etq(226, yb + 38, ['Bas du', 'ménisque']))
corps.push(rappel([234, yb + 26], [XM + 4, yb + 2]))
corps.push(etq(xo - 2, yb + 30, 'Œil', 'middle'))
corps.push(etq(16, yb + 4, '56 mL'))
corps.push(rappel([58, yb], [XG - 2, yb]))

const svg = doc(BAS + 12,
  'Éprouvette graduée en gros plan : graduations de 50 à 60 mL en 10 intervalles (1 mL chacune), ménisque dont le bas est à 56 mL, œil à la hauteur du bas du ménisque. Réviz, 5e physique-chimie et 6e sciences, états de la matière.',
  corps)
ecrireSvg('eprouvette-graduee', svg, 'communs')
