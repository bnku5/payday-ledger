'use strict';
/* Walk the Ledgerlands: use the pad or arrow keys, or tap a spot and the hero walks there.
   Water, mountains, trees and fog block the way. Walk into a town and press A to talk. */

const WALLS = new Set(['w', 'm', 't']);
let walkTimer = null, holdTimer = null, posSaveTimer = null;

const terrainAt = (x, y) => { if (!TERRAIN) TERRAIN = buildTerrain(); return TERRAIN[y][x]; };
function canWalk(x, y, reached = reachedRegion()) {
  return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && !WALLS.has(terrainAt(x, y)) && !isFogged(x, y, reached);
}
function heroPos() {
  const g = gs();
  if (!g.pos || !canWalk(g.pos.x, g.pos.y)) { const r = REGIONS[reachedRegion()]; g.pos = { x: r.x, y: r.y }; }
  return g.pos;
}
const spotAt = (x, y) => [...REGIONS, ...SIDE].find(r => r.x === x && r.y === y);
const spotNear = (x, y) => spotAt(x, y) || [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) => spotAt(x + dx, y + dy)).find(Boolean);
const tilePct = (x, y, dx = 0, dy = 0) => `left:${(x + .5 + dx) / MAP_W * 100}%;top:${(y + .5 + dy) / MAP_H * 100}%`;
function place(id, x, y, dx = 0, dy = 0) {
  const el = document.getElementById(id); if (!el) return;
  el.style.left = `${(x + .5 + dx) / MAP_W * 100}%`; el.style.top = `${(y + .5 + dy) / MAP_H * 100}%`;
}
function showHere() {
  const el = document.getElementById('map-here'); if (!el) return;
  const p = heroPos(), s = spotNear(p.x, p.y);
  el.innerHTML = s ? `<b style="color:var(--gold)">${esc(s.name)}</b><br>Press A to talk` : ({ p: 'On the road', g: 'Open fields', s: 'Sandy shore', h: 'Mirewater bog', b: 'On a bridge' }[terrainAt(p.x, p.y)] || 'The Ledgerlands');
}
function moveHero(x, y) {
  const g = gs(), prev = { ...heroPos() };
  g.pos = { x, y };
  place('map-hero', x, y);
  place('map-pet', prev.x, prev.y, .25, .2);
  const flip = x < prev.x ? -1 : x > prev.x ? 1 : null;
  const h = document.getElementById('map-hero'); if (h && flip) h.style.setProperty('--face', flip);
  showHere();
  clearTimeout(posSaveTimer); posSaveTimer = setTimeout(saveProfile, 800);
}
function bump() { const h = document.getElementById('map-hero'); if (h) { h.classList.remove('bump'); void h.offsetWidth; h.classList.add('bump'); } }
function stepHero(dx, dy) {
  stopWalking();
  const p = heroPos();
  if (canWalk(p.x + dx, p.y + dy)) { moveHero(p.x + dx, p.y + dy); return true; }
  bump(); return false;
}
function stopWalking() { clearInterval(walkTimer); walkTimer = null; }
/* Shortest walkable route, breadth-first over the 20×15 grid. */
function findPath(tx, ty) {
  const p = heroPos(), reached = reachedRegion(), key = (x, y) => y * MAP_W + x;
  const prev = new Map([[key(p.x, p.y), null]]), queue = [[p.x, p.y]];
  while (queue.length) {
    const [x, y] = queue.shift();
    if (x === tx && y === ty) {
      const path = []; let k = key(x, y);
      while (k !== key(p.x, p.y)) { path.unshift([k % MAP_W, Math.floor(k / MAP_W)]); k = prev.get(k); }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, nk = key(nx, ny);
      if (!prev.has(nk) && canWalk(nx, ny, reached)) { prev.set(nk, key(x, y)); queue.push([nx, ny]); }
    }
  }
  return null;
}
function walkTo(tx, ty, onArrive) {
  const path = findPath(tx, ty);
  if (!path) return false;
  stopWalking();
  if (!path.length) { if (onArrive) onArrive(); return true; }
  walkTimer = setInterval(() => {
    const next = path.shift();
    if (!next) { stopWalking(); if (onArrive) onArrive(); return; }
    moveHero(next[0], next[1]);
  }, 130);
  return true;
}
function interact() {
  const p = heroPos(), s = spotNear(p.x, p.y);
  if (s) regionTalk(s.id); else toast('Nobody here. Walk to a town or landmark.');
}
function exploreControlsHTML() {
  return `<div class="explore">
    <div class="dpad" aria-label="Move your hero">
      <button class="dp up" data-step="0,-1" aria-label="Up">▲</button><button class="dp left" data-step="-1,0" aria-label="Left">◀</button>
      <button class="dp right" data-step="1,0" aria-label="Right">▶</button><button class="dp down" data-step="0,1" aria-label="Down">▼</button>
    </div>
    <p class="small" id="map-here" aria-live="polite"></p>
    <button class="abtn" data-action="interact" aria-label="Talk">A</button>
  </div>`;
}

/* Hold a pad button to keep walking. */
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-step]'); if (!b) return;
  e.preventDefault();
  const [dx, dy] = b.dataset.step.split(',').map(Number);
  stepHero(dx, dy);
  clearInterval(holdTimer);
  holdTimer = setInterval(() => stepHero(dx, dy), 170);
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) document.addEventListener(ev, () => clearInterval(holdTimer));
document.addEventListener('keydown', e => {
  if (ui.tab !== 'goals' || !document.getElementById('map') || !document.getElementById('sheet-root').hidden || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[e.key];
  if (dir) { e.preventDefault(); stepHero(dir[0], dir[1]); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); interact(); }
});

Object.assign(gameActions, {
  interact,
  'walk-region': el => {
    const s = [...REGIONS, ...SIDE].find(r => r.id === el.dataset.id); if (!s) return;
    const p = heroPos();
    if (p.x === s.x && p.y === s.y) { regionTalk(s.id); return; }
    if (!walkTo(s.x, s.y, () => regionTalk(s.id))) regionTalk(s.id);
  },
  'map-tap': (el, e) => {
    const r = el.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * MAP_W), y = Math.floor((e.clientY - r.top) / r.height * MAP_H);
    const s = spotAt(x, y);
    if (!walkTo(x, y, s ? () => regionTalk(s.id) : null)) { bump(); toast(isFogged(x, y, reachedRegion()) ? 'Too foggy. Finish your current quest to explore further.' : 'You can’t walk there.'); }
  },
});
