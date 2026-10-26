const NS = 'http://www.w3.org/2000/svg', devant = g.querySelector('.bras-devant'), corps = [...g.querySelectorAll('image')].find(i => i.getAttribute('href').endsWith('corps.webp'));
const mk = (suffixe) => { const im = document.createElementNS(NS, 'image');
  im.setAttribute('href', 'http://localhost:5388/pantin/accessoires/' + e._nom + suffixe + '.webp');
  for (const [k, v] of Object.entries({ x: e._x, y: e._y, width: e._w, height: e._h })) im.setAttribute(k, v); return im; };
devant.parentNode.insertBefore(mk(''), devant);
if (e._derriere) corps.parentNode.insertBefore(mk('-derriere'), corps);
