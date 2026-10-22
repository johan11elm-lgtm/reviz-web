const o = rig.brasEl.g, rel = o.mains.relachee, NS = 'http://www.w3.org/2000/svg';
const W = e._w, H = e._h, gx = e._gx, gy = e._gy, [ax, ay] = e._ancre;
const pg = document.createElementNS(NS, 'g'), im = document.createElementNS(NS, 'image');
im.setAttribute('href', 'http://localhost:5388/pantin/accessoires/' + e._nom + '.webp');
im.setAttribute('width', W); im.setAttribute('height', H);
im.setAttribute('x', gx - ax * W); im.setAttribute('y', gy - ay * H);
pg.appendChild(im); rel.insertBefore(pg, rel.firstChild);
const a = +o.main.getAttribute('transform').match(/rotate\(([-\d.]+)/)[1];
pg.setAttribute('transform', `rotate(${-a + (e._angle || 0)} ${gx} ${gy})`);
