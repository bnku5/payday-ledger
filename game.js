'use strict';
/* The RPG layer. Real money moves become XP, gems, hearts and progress across the Ledgerlands.
   XP and gems are derived from your data, so editing or deleting an entry can't be used to farm them. */

const G0 = () => ({
  name: '', outfit: 'forest', hat: 'none', owned: { outfit: ['forest'], hat: ['none'] }, hp: 6, faints: [], days: {}, claimed: {}, weekly: {},
  bonusXP: 0, bonusGems: 0, spent: 0, potions: 1, tokens: 0, trophies: {}, lastLevel: 1, bosses: {}, rewards: [], buys: [], sound: true, photosInBackup: true,
  classHist: [], skills: {}, cool: {}, buffs: {}, look: { race: 'elf', hair: 'black', glasses: true },
  wk: {}, events: {}, pet: { name: 'Ember', best: 0 }, chronSeen: {}, unlocked: {},
});
function gs() {
  if (!profile.game || typeof profile.game !== 'object') profile.game = G0();
  const g = profile.game, d = G0();
  for (const k in d) if (g[k] === undefined) g[k] = d[k];
  return g;
}
const heroName = () => gs().name || 'Hero';
const featureOn = id => typeof unlocked !== 'function' || unlocked(id);

/* ---------- Classes and skills ----------
   Class bonuses count only for entries made while you held that class, so switching can't rewrite history. */
const CLASSES = {
  ranger: { name: 'Ranger', role: 'The Saver', passive: 'Savings deposits earn +25% XP.', active: 'mark' },
  knight: { name: 'Knight', role: 'The Debt Slayer', passive: 'Debt payments earn +50% XP and +50% gems.', active: 'cleave' },
  monk: { name: 'Monk', role: 'The Ascetic', passive: 'Clear days earn +50% XP. Wants hit you for 1 less heart.', active: 'meditate' },
  rogue: { name: 'Rogue', role: 'The Hustler', passive: 'Slain wants earn +50% XP. Every paycheck earns XP worth 5% of it.', active: 'vanish' },
  sage: { name: 'Sage', role: 'The Scholar', passive: 'Logging earns double XP. Each receipt photo +5 XP. Scholarships earn XP worth 10% of them.', active: 'study' },
};
const SKILLS = {
  mark: { name: 'Hunter’s Mark', cls: 'ranger', active: true, desc: 'Your next savings deposit within 24 hours earns double XP.' },
  cleave: { name: 'Cleave', cls: 'knight', active: true, desc: 'Your next debt payment within 24 hours earns double XP.' },
  meditate: { name: 'Meditate', cls: 'monk', active: true, desc: 'Restore all your hearts.' },
  vanish: { name: 'Vanish', cls: 'rogue', active: true, desc: 'Your next want within 24 hours does no damage and keeps your clear day.' },
  study: { name: 'Study', cls: 'sage', active: true, desc: 'Gain 5 XP for each entry you logged in the last 7 days, up to 150.' },
  thick: { name: 'Thick Skin', req: 2, cost: 1, desc: '+1 max heart.' },
  haggler: { name: 'Haggler', req: 3, cost: 1, desc: 'Grubb’s prices drop 20%.' },
  lucky: { name: 'Lucky Find', req: 4, cost: 1, desc: 'Every clear day from now on gives 2 extra gems.' },
  stomach: { name: 'Iron Stomach', req: 5, cost: 1, desc: 'Dash Goblins (delivery) stop hitting for an extra heart.' },
  second: { name: 'Second Wind', req: 6, cost: 1, active: true, desc: 'Ability, once a week: restore 3 hearts.' },
  treasure: { name: 'Treasure Sense', req: 8, cost: 1, desc: 'Weekly chests hold an extra Treat Pass.' },
  vital: { name: 'Vitality', req: 10, cost: 2, desc: '+2 max hearts.' },
};
const SKILL_COOL = 7 * 864e5, BUFF_TIME = 864e5;
function classAt(ts) { let c = null; for (const h of gs().classHist) if (h.at <= ts) c = h.cls; return c; }
const heroClass = () => classAt(Date.now());
const hasSkill = id => !!gs().skills[id];
const buffOn = id => (gs().buffs[id] || 0) > Date.now();
const priceOf = cost => hasSkill('haggler') ? Math.ceil(cost * .8) : cost;
function heroLook() { const g = gs(); return { outfit: g.outfit, hat: g.hat, race: g.look.race, hair: g.look.hair, glasses: g.look.glasses, cls: heroClass() }; }
const raceName = () => gs().look.race === 'elf' ? 'Elf' : 'Human';

/* ---------- Levels ---------- */
const lvlXP = L => 50 * (L - 1) * L;
const LEVEL_TITLES = [[1, 'Coin Pauper'], [2, 'Wanderer'], [3, 'Lantern Bearer'], [4, 'Pathfinder'], [5, 'Shieldhand'], [6, 'Thrift Squire'], [8, 'Ledger Knight'], [10, 'Keeper of the Vault'], [13, 'Warden of Gold'], [16, 'Thane of Thrift'], [20, 'Gilded Champion'], [25, 'Legend of the Ledger']];
const titleFor = L => LEVEL_TITLES.filter(([l]) => L >= l).pop()[1];

/* ---------- Monsters (wants) and bosses (debts) ---------- */
const MONSTERS = {
  delivery: { name: 'Dash Goblin', sprite: 'goblin', lore: 'Brings food to your door and takes a cut of everything.' },
  dining: { name: 'Grease Slime', sprite: 'slime', lore: 'Smells amazing. Leaves your purse sticky and light.' },
  subs: { name: 'Leech Bat', sprite: 'bat', lore: 'Bites once a month, forever, until you banish it.' },
  shopping: { name: 'Shiny Mimic', sprite: 'mimic', lore: 'Looks like treasure. Is a mouth.' },
  fun: { name: 'Revel Imp', sprite: 'imp', lore: 'Throws a great party. Sends you the bill.' },
  personal: { name: 'Smoke Wisp', sprite: 'wisp', lore: 'Drifts in quietly, a few coins at a time.' },
  gifts: { name: 'Gift Sprite', sprite: 'fairy', lore: 'Means well. Still eats your gold.' },
  other: { name: 'Wandering Gremlin', sprite: 'gremlin', lore: 'Random buys with no name. They add up.' },
};
const monsterOf = catId => MONSTERS[catId] || MONSTERS.other;
const BOSS = { card: ['Wyrm', 'wyrm'], collection: ['Wraith', 'wraith'], loan: ['Golem', 'golem'], bnpl: ['Imp Swarm', 'imp'], other: ['Golem', 'golem'] };
const bossName = d => `${d.name} ${(BOSS[d.type] || BOSS.other)[0]}`;
const bossSprite = d => (BOSS[d.type] || BOSS.other)[1];
const isWant = e => e.type === 'expense' && nwOf(e) === 'wants' && !e.billKey;

/* ---------- Derived stats ---------- */
function gameStats() {
  const g = gs(), E = all();
  let dep = 0, depXP = 0, wd = 0, debtPaid = 0, debtXP = 0, debtGems = 0, bills = 0, receipts = 0, extraXP = 0;
  const perDay = {};
  for (const e of E) {
    const cls = classAt(e.created || 0), boost = e.boost ? 2 : 1;
    (perDay[e.date] = perDay[e.date] || []).push(cls === 'sage' ? 4 : 2);
    if (e.type === 'save') { if (e.amount > 0) { dep += e.amount; depXP += e.amount * (cls === 'ranger' ? 1.25 : 1) * boost; } else wd -= e.amount; }
    if (e.type === 'expense' && (e.debtId || e.catId === 'debt')) { const m = cls === 'knight' ? 1.5 : 1; debtPaid += e.amount; debtXP += e.amount * m * boost; debtGems += e.amount / 10 * m; }
    if (e.type === 'income' && cls === 'rogue' && (e.kind || 'paycheck') === 'paycheck') extraXP += e.amount * .05;
    if (e.type === 'income' && cls === 'sage' && e.kind === 'scholarship') extraXP += e.amount * .1;
    if (e.billKey && e.onTime) bills++;
    if (e.receipts) { receipts += e.receipts.length; if (cls === 'sage') extraXP += 5 * e.receipts.length; }
  }
  const net = Math.max(0, dep - wd);
  const saveXP = Math.max(0, depXP - wd);
  const logXP = Object.values(perDay).reduce((s, arr) => s + arr.sort((x, y) => y - x).slice(0, 10).reduce((x, y) => x + y, 0), 0);
  const days = Object.keys(g.days).sort();
  const faints = (g.faints || []).slice().sort();
  const luckyAt = g.skills.lucky || Infinity;
  let clearXP = 0, clearN = 0, luckyGems = 0, run = 0, best = 0, prev = null;
  for (const d of days) {
    const rec = g.days[d];
    if (rec.clear) {
      const chain = prev && daysBetween(parseD(prev), parseD(d)) === 1 && !faints.some(f => f > prev && f <= d);
      run = chain ? run + 1 : 1; best = Math.max(best, run);
      clearN++; clearXP += (25 + Math.min(run, 10) * 5) * (classAt(rec.at || 0) === 'monk' ? 1.5 : 1); prev = d;
      if ((rec.at || 0) >= luckyAt) luckyGems += 2;
    } else { run = 0; prev = null; }
  }
  const t = toStr(today()), y = toStr(addDays(today(), -1));
  const streak = prev && (prev === t || prev === y) && !faints.some(f => f > prev) ? run : 0;
  const skipped = profile.wants.filter(w => w.decided === 'skipped');
  const skipXP = skipped.reduce((s, w) => s + w.price * (classAt(w.decidedAt || 0) === 'rogue' ? 1.5 : 1), 0), skipGems = skipped.reduce((s, w) => s + Math.floor(w.price / 5), 0);
  // Pay yourself first: a deposit on the same day as a paycheck, up to 3 a month
  const saveDays = new Set(E.filter(e => e.type === 'save' && e.amount > 0).map(e => e.date)), pyfMonth = {};
  let pyf = 0;
  for (const d of [...new Set(E.filter(e => e.type === 'income' && (e.kind || 'paycheck') === 'paycheck' && e.amount >= 100).map(e => e.date))].sort()) {
    if (saveDays.has(d) && (pyfMonth[d.slice(0, 7)] = (pyfMonth[d.slice(0, 7)] || 0) + 1) <= 3) pyf++;
  }
  const xp = Math.floor(saveXP + debtXP + logXP + bills * 10 + clearXP + days.length * 5 + skipXP + extraXP + pyf * 25 + g.bonusXP);
  let level = 1; while (level < 40 && xp >= lvlXP(level + 1)) level++;
  const rawGems = Math.floor(net / 10) + Math.floor(debtGems) + clearN * 3 + luckyGems + days.length + skipGems + pyf * 5 + g.bonusGems + 10 * (level - 1) - g.spent;
  const maxHp = Math.min(15, 6 + Math.floor((level - 1) / 2) + (g.skills.thick ? 1 : 0) + (g.skills.vital ? 2 : 0));
  const usedPts = Object.keys(g.skills).reduce((s, id) => s + ((SKILLS[id] && SKILLS[id].cost) || 0), 0);
  return { xp, level, title: titleFor(level), cur: lvlXP(level), next: lvlXP(level + 1), gems: Math.max(0, rawGems), maxHp, hp: Math.max(0, Math.min(g.hp, maxHp)), streak, best, clearN, checkins: days.length, net, debtPaid, receipts, skipped: skipped.length, entries: E.length, points: level - 1 - usedPts };
}

/* ---------- Sound ---------- */
let AC = null;
const SFX = { coin: [[988, .06], [1319, .12]], level: [[523, .09], [659, .09], [784, .09], [1047, .25]], hurt: [[262, .07], [185, .07], [131, .14]], hit: [[392, .04], [196, .1]], blip: [[1200, .015]], rest: [[523, .12], [392, .12], [523, .24]], chest: [[659, .06], [784, .06], [988, .06], [1319, .2]], buy: [[784, .05], [1047, .12]], faint: [[392, .15], [330, .15], [262, .15], [196, .35]] };
function sfx(name) {
  if (!gs().sound || !SFX[name]) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    let t = AC.currentTime;
    for (const [f, d] of SFX[name]) {
      const o = AC.createOscillator(), gn = AC.createGain();
      o.type = 'square'; o.frequency.value = f; gn.gain.value = name === 'blip' ? .015 : .045;
      o.connect(gn); gn.connect(AC.destination); o.start(t); o.stop(t + d); t += d;
    }
  } catch (_) { /* audio unavailable */ }
}

/* ---------- Floating pop-ups ---------- */
function pop(text, color = 'var(--gold)') {
  const el = document.createElement('div');
  el.className = 'xp-pop'; el.textContent = text; el.style.color = color;
  el.style.marginTop = document.querySelectorAll('.xp-pop').length * 28 + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}
function popGain(before, after) {
  const dx = after.xp - before.xp, dg = after.gems - before.gems;
  const parts = [];
  if (dx > 0) parts.push(`+${dx} XP`);
  if (dg > 0) parts.push(`+${dg} GEMS`);
  if (parts.length) { pop(parts.join('  ')); sfx('coin'); }
}

/* ---------- Hearts ---------- */
const damageFor = e => Math.max(1, (e.amount < 15 ? 1 : e.amount < 50 ? 2 : e.amount < 100 ? 3 : 4) + (e.catId === 'delivery' && !hasSkill('stomach') ? 1 : 0) - (heroClass() === 'monk' ? 1 : 0));
function heal(n) { const g = gs(), st = gameStats(); g.hp = Math.min(st.maxHp, Math.max(0, g.hp) + n); }
function faint() {
  const g = gs(), st = gameStats();
  const lose = Math.min(10, st.gems);
  g.spent += lose; g.hp = 3; g.faints.push(toStr(today()));
  queueCeleb({ kind: 'faint', lose });
  sfx('faint');
}

/* ---------- Hooks called by the app ---------- */
function setEntry(e, patch) { Object.assign(e, patch); const stored = entries.get(e.id); if (stored) Object.assign(stored, patch); }
function gameOnNewEntry(e, before) {
  const g = gs();
  if (e.type === 'save' && e.amount > 0 && buffOn('mark')) { setEntry(e, { boost: true }); delete g.buffs.mark; setTimeout(() => pop('HUNTER’S MARK ×2', 'var(--arti)'), 400); }
  if (e.type === 'expense' && e.debtId && buffOn('cleave')) { setEntry(e, { boost: true }); delete g.buffs.cleave; setTimeout(() => pop('CLEAVE ×2', 'var(--arti)'), 400); }
  if (isWant(e) && !e.treat && buffOn('vanish')) { setEntry(e, { treat: true, vanish: true }); delete g.buffs.vanish; pop('VANISH! NO DAMAGE', 'var(--arti)'); sfx('blip'); }
  else if (isWant(e)) {
    if (e.treat) { g.tokens = Math.max(0, g.tokens - 1); pop('TREAT PASS USED', 'var(--arti)'); }
    else {
      const m = monsterOf(e.catId), dmg = damageFor(e);
      g.hp = Math.min(g.hp, gameStats().maxHp) - dmg;
      if (g.days[e.date] && g.days[e.date].clear) { g.days[e.date].clear = false; toast('That breaks your clear day.'); }
      pop(`${m.name.toUpperCase()}! −${dmg} ♥`, 'var(--heart)'); sfx('hurt');
      document.getElementById('hud')?.classList.add('shake'); setTimeout(() => document.getElementById('hud')?.classList.remove('shake'), 500);
      if (g.hp <= 0) faint();
    }
  }
  if (e.type === 'save' && e.amount >= 20) heal(1);
  if (e.type === 'expense' && e.debtId) {
    const d = profile.debts.find(x => x.id === e.debtId);
    if (d) {
      const left = debtBalance(d);
      if (left <= .005 && !g.bosses[d.id]) { g.bosses[d.id] = Date.now(); g.bonusXP += 200; g.bonusGems += 30; queueCeleb({ kind: 'boss', debt: d }); }
      else setTimeout(() => { pop(`HIT ${bossName(d).toUpperCase()} −${money0(e.amount)}`, 'var(--want)'); sfx('hit'); }, 700);
    }
  }
  saveProfile();
  const after = gameStats();
  if (!isWant(e) || e.treat) popGain(before, after);
}
function gameOnSkip(w, before) { const m = monsterOf(judge(w.name).catId); pop(`${m.name.toUpperCase()} SLAIN!`, 'var(--accent)'); sfx('chest'); setTimeout(() => popGain(before, gameStats()), 900); }

/* ---------- Celebrations (level up, trophies, bosses, fainting) ---------- */
const CELEB = [];
function queueCeleb(c) { CELEB.push(c); }
function processCelebrations() {
  if (!CELEB.length || !document.getElementById('sheet-root').hidden) return;
  const c = CELEB.shift();
  let body = '';
  if (c.kind === 'level') { sfx('level'); body = `<div class="celebrate"><div class="big pop">LEVEL UP!</div>${sprite('hero', 'pop', { outfit: gs().outfit, hat: gs().hat })}<p>${esc(heroName())} reached <b>LV ${c.level}</b>: <span style="color:var(--gold)">${esc(titleFor(c.level))}</span></p><p class="small muted">Hearts refilled.${featureOn('quests') ? ' +10 gems.' : ''}${c.hp ? ` Max hearts: ${c.hp}.` : ''}</p></div>`; }
  else if (c.kind === 'trophy') { sfx('chest'); body = `<div class="celebrate"><div class="big pop">TROPHY!</div>${sprite(c.t[5], 'pop')}<p><b style="color:var(--gold)">${esc(c.t[1])}</b></p><p class="small muted">${esc(c.t[2])}. +${c.t[4]} gems.</p></div>`; }
  else if (c.kind === 'boss') { sfx('level'); body = `<div class="celebrate"><div class="big pop">BOSS DEFEATED</div>${sprite(bossSprite(c.debt), 'pop')}<p>You paid off <b>${esc(c.debt.name)}</b>. The ${esc(bossName(c.debt))} is no more.</p><p class="small muted">+200 XP · +30 gems. That money is yours again every month.</p></div>`; }
  else if (c.kind === 'faint') { body = `<div class="dlg"><div class="portrait">${sprite('mabel')}</div><div><div class="who">MABEL</div><p class="say">You collapsed on the road, ${esc(heroName())}. Too many monsters. I dragged you back to the inn. You dropped ${c.lose} gems on the way, and your streak is gone. Rest up. Fewer wants tomorrow.</p></div></div>`; }
  else if (c.kind === 'class') { body = `<div class="dlg"><div class="portrait">${sprite('pip')}</div><div><div class="who">ELDER PIP</div><p class="say">Level 2 already, ${esc(heroName())}! You’re ready to choose a path. Ranger, Knight, Monk, Rogue or Sage. Each one rewards a different way of winning with money.</p></div></div><button class="btn gold block" data-action="classes">See the classes</button>`; }
  else if (c.kind === 'custom') { sfx(c.sfx || 'chest'); body = c.html; }
  else if (c.kind === 'chest') { sfx('chest'); body = `<div class="celebrate"><div class="big pop">WEEKLY CHEST</div>${sprite('chestOpen', 'pop')}<p>You kept wants under budget last week.</p><p class="small muted">+100 XP · +20 gems · +1 Treat Pass</p></div>`; }
  openSheet(c.kind === 'faint' ? 'You fainted' : 'Huzzah', body + '<button class="btn primary block" data-action="close">Continue</button>');
}
function gameAfterRender() {
  const g = gs(), st = gameStats();
  if (st.level > g.lastLevel) {
    for (let L = g.lastLevel + 1; L <= st.level; L++) { queueCeleb({ kind: 'level', level: L, hp: L % 2 === 1 && L > 1 ? Math.min(12, 6 + Math.floor((L - 1) / 2)) : 0 }); }
    if (g.lastLevel < 2 && st.level >= 2 && !heroClass()) queueCeleb({ kind: 'class' });
    g.hp = st.maxHp; g.lastLevel = st.level; saveProfile();
  } else if (st.level < g.lastLevel) { g.lastLevel = st.level; saveProfile(); }
  if (typeof questsAfterRender === 'function') questsAfterRender();
  if (featureOn('quests')) checkTrophies(gameStats());
  const map = document.getElementById('map');
  if (map && !map.dataset.drawn) { map.dataset.drawn = '1'; drawMap(map, reachedRegion()); showHere(); }
  setTimeout(processCelebrations, 350);
}

/* ---------- Trophies ---------- */
const TROPHIES = [
  ['first_pay', 'First Wages', 'Log your first paycheck', () => all().some(e => e.type === 'income'), 5, 'coin'],
  ['first_save', 'Coin in the Chest', 'Move money to savings', s => s.net > 0, 5, 'chest'],
  ['save100', 'Hundred Hoard', 'Save $100', s => s.net >= 100, 10, 'chest'],
  ['save500', 'Silver Stash', 'Save $500', s => s.net >= 500, 15, 'chestOpen'],
  ['save1000', 'Ember Chest', 'Save $1,000', s => s.net >= 1000, 25, 'chestOpen'],
  ['save2500', 'Dragon’s Hoard', 'Save $2,500', s => s.net >= 2500, 40, 'gem'],
  ['streak3', 'Steady Steps', '3 clear days in a row', s => s.best >= 3, 5, 'flame'],
  ['streak7', 'Week of Iron', '7 clear days in a row', s => s.best >= 7, 15, 'flame'],
  ['streak30', 'Moon of Discipline', '30 clear days in a row', s => s.best >= 30, 50, 'flame'],
  ['skip1', 'Mimic Slayer', 'Skip something on your want list', s => s.skipped >= 1, 5, 'mimic'],
  ['skip5', 'Tempter’s Bane', 'Skip 5 wants', s => s.skipped >= 5, 15, 'sword'],
  ['boss1', 'Wyrmslayer', 'Pay off a debt', () => Object.keys(gs().bosses).length >= 1, 30, 'wyrm'],
  ['subcut', 'Leech Banished', 'Cancel a subscription', () => profile.freed.length >= 1, 10, 'bat'],
  ['receipt10', 'Keeper of Proof', 'Attach 10 receipt photos', s => s.receipts >= 10, 10, 'receipt'],
  ['logs50', 'Royal Scribe', 'Log 50 entries', s => s.entries >= 50, 10, 'scroll'],
  ['lvl5', 'Seasoned', 'Reach level 5', s => s.level >= 5, 10, 'star'],
  ['lvl10', 'Veteran', 'Reach level 10', s => s.level >= 10, 25, 'star'],
];
function checkTrophies(st) {
  const g = gs(); let changed = false;
  for (const t of TROPHIES) if (!g.trophies[t[0]] && t[3](st)) { g.trophies[t[0]] = Date.now(); g.bonusGems += t[4]; queueCeleb({ kind: 'trophy', t }); changed = true; }
  if (changed) saveProfile();
}

/* ---------- Daily quests and the weekly chest ---------- */
const QUESTS = {
  clear: { text: 'Stay clear: no wants today', gems: 5, xp: 15, icon: 'flame', done: d => !!(gs().days[d] && gs().days[d].clear) },
  save: { text: 'Pay yourself: move any amount to savings', gems: 4, xp: 10, icon: 'chest', done: d => all().some(e => e.type === 'save' && e.amount > 0 && e.date === d) },
  log3: { text: 'Scribe: log 3 entries today', gems: 3, xp: 10, icon: 'scroll', done: d => all().filter(e => e.date === d).length >= 3 },
  kitchen: { text: 'Kitchen hero: no eating out or delivery', gems: 4, xp: 15, icon: 'slime', done: d => !!gs().days[d] && !all().some(e => e.date === d && e.type === 'expense' && (e.catId === 'dining' || e.catId === 'delivery')) },
  debt: { text: 'Strike a boss: pay anything toward a debt', gems: 5, xp: 15, icon: 'sword', avail: () => profile.debts.some(x => debtBalance(x) > .005), done: d => all().some(e => e.date === d && e.type === 'expense' && e.debtId) },
  rest: { text: 'Rest at the Hearth Inn tonight', gems: 2, xp: 5, icon: 'house', done: d => !!gs().days[d] },
  receipt: { text: 'Keep the proof: attach a receipt photo', gems: 2, xp: 5, icon: 'receipt', done: d => all().some(e => e.date === d && e.receipts && e.receipts.length) },
};
function questsFor(d) {
  const pool = Object.keys(QUESTS).filter(k => k !== 'clear' && (!QUESTS[k].avail || QUESTS[k].avail()));
  const r = rng(Number(d.replace(/-/g, '')));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return ['clear', ...pool.slice(0, 2)];
}
const mondayOf = d => addDays(d, -((d.getDay() + 6) % 7));
function weeklyWantBudget() {
  const wantsBudget = CATS.filter(c => c.group === 'wants').reduce((s, c) => s + (Number(profile.budgets[c.id]) || 0), 0);
  return (wantsBudget || monthlyIncome() * profile.split.wants / 100) * 12 / 52;
}
function lastWeekChest() {
  const g = gs(), mon = addDays(mondayOf(today()), -7), sun = addDays(mon, 6), key = toStr(mon);
  if (parseD(key) < addDays(new Date(profile.createdAt || Date.now()), -7)) return null;
  const wants = sumAmt(between(key, toStr(sun)).filter(e => isWant(e) && !e.treat));
  const rests = Object.keys(g.days).filter(d => d >= key && d <= toStr(sun)).length;
  return { key, wants, budget: weeklyWantBudget(), rests, ok: rests >= 3 && wants <= weeklyWantBudget(), claimed: !!g.weekly[key] };
}

/* ---------- Map progress ---------- */
function reachedRegion() { const { current } = planSteps(); return Math.min(REGIONS.length - 1, current); }

/* ---------- HTML pieces ---------- */
function heartsHTML(st, big) {
  let h = '';
  for (let i = 0; i < st.maxHp; i++) h += `<img class="sprite" src="${spriteURL(i < st.hp ? 'heart' : 'heartE')}" alt="" style="width:${big ? 20 : 16}px;height:${big ? 20 : 16}px">`;
  return `<span class="hearts" role="img" aria-label="${st.hp} of ${st.maxHp} hearts">${h}</span>`;
}
function hudHTML() {
  const st = gameStats();
  return `<div class="hud"><span class="lv">LV${st.level}</span>${heartsHTML(st)}${featureOn('quests') ? `<span class="gems">${sprite('gem')}${st.gems}</span>` : ''}<span class="streak">${sprite('flame')}${st.streak}</span></div>
    <div class="xpbar" style="margin-bottom:8px" role="img" aria-label="Experience"><i style="width:${((st.xp - st.cur) / (st.next - st.cur) * 100).toFixed(1)}%"></i></div>`;
}
function heroCardHTML() {
  const g = gs(), st = gameStats();
  return `<section class="card stack" style="gap:12px">
    <div class="hero-card"><div class="portrait">${sprite('hero', '', { outfit: g.outfit, hat: g.hat })}</div>
      <div class="stack" style="gap:4px"><div class="name">${esc(heroName())}</div><div class="title">LV ${st.level} ${raceName()}${heroClass() ? ' ' + CLASSES[heroClass()].name : ''}</div><div class="small muted">${esc(st.title)}</div>
      <div class="xpbar"><i style="width:${((st.xp - st.cur) / (st.next - st.cur) * 100).toFixed(1)}%"></i></div>
      <div class="small muted">${st.next - st.xp} XP to LV ${st.level + 1}</div></div></div>
    <div class="row" style="flex-wrap:wrap">${heartsHTML(st, true)}${featureOn('quests') ? `<span class="small" style="color:var(--accent)">${sprite('gem', '', null)} ${st.gems} gems</span>` : ''}<span class="small" style="color:var(--want)">${sprite('flame')} ${st.streak}-day streak</span></div>
    ${featureOn('quests') ? `<div class="row small muted" style="justify-content:flex-start;gap:14px;flex-wrap:wrap"><span>${sprite('potion')} ${g.potions} potion${g.potions === 1 ? '' : 's'}</span><span>${sprite('ticket')} ${g.tokens} treat pass${g.tokens === 1 ? '' : 'es'}</span></div>` : ''}
    <div class="btn-row">${g.potions > 0 && st.hp < st.maxHp ? '<button class="btn sm" data-action="drink">Drink potion</button>' : ''}${heroClass() ? `<button class="btn sm arti-btn" data-action="skills">Skills${st.points > 0 ? ` (${st.points})` : ''}</button>` : st.level >= 2 ? '<button class="btn sm arti-btn" data-action="classes">Choose class</button>' : ''}${featureOn('quests') ? '<button class="btn sm gold" data-action="shop">Shop</button><button class="btn sm" data-action="trophies">Trophies</button>' : ''}<button class="btn sm" data-action="bestiary">Bestiary</button></div>
  </section>`;
}
function dailyQuestsHTML() {
  const g = gs(), d = toStr(today()), claimed = g.claimed[d] || [];
  return `<section>
    <div class="sec-head"><h2>Today’s quests</h2><span class="small muted">resets at midnight</span></div>
    <div class="list">${questsFor(d).map(id => {
      const q = QUESTS[id], done = q.done(d), got = claimed.includes(id);
      return `<div class="quest ${got ? 'done' : ''}">${sprite(q.icon)}<div><div class="qt">${esc(q.text)}</div><div class="qr">+${q.gems} gems · +${q.xp} XP</div></div>${got ? sprite('check') : done ? `<button class="btn sm gold" data-action="claim" data-q="${id}">Claim</button>` : '<span class="pill">…</span>'}</div>`;
    }).join('')}</div>
  </section>`;
}
function innHTML() {
  const rested = !!gs().days[toStr(today())];
  return `<div class="card row" style="gap:12px"><div style="display:flex;gap:10px;align-items:center">${sprite('mabel', 'inn-face', null)}<div><b style="font-family:var(--f-pixel);font-size:9px">HEARTH INN</b><div class="small muted">${rested ? 'You rested here tonight.' : 'Rest here every night. A day with no wants becomes a clear day.'}</div></div></div><button class="btn sm ${rested ? '' : 'primary'}" data-action="inn">${rested ? 'Visit' : 'Rest'}</button></div>`;
}
function chestHTML() {
  const chest = lastWeekChest();
  return chest && chest.ok && !chest.claimed ? `<div class="callout"><p>${sprite('chest')} <b>Weekly chest!</b> Wants last week: ${money0(chest.wants)} of ${money0(chest.budget)}.</p><button class="btn sm gold" data-action="open-chest">Open</button></div>` : '';
}

/* ---------- Dialog boxes ---------- */
let DLG = null;
function openDialog(npc, lines, choices = [], title) {
  DLG = { npc, lines: lines.filter(Boolean), i: 0, choices, timer: null };
  openSheet(title || NPCS[npc].name, `<div class="dlg" data-action="dlg-next" role="button" tabindex="0"><div class="portrait">${sprite(npc)}</div><div><div class="who">${esc(NPCS[npc].name.toUpperCase())}</div><p class="say" id="dlg-say" aria-live="polite"></p><div class="more" id="dlg-more">▼ TAP</div></div></div>
    <div class="stack" id="dlg-choices" hidden>${(choices.length ? choices : [{ label: 'Farewell' }]).map((c, i) => `<button class="btn ${c.cls || ''} block" data-action="dlg-choice" data-i="${i}">${esc(c.label)}</button>`).join('')}</div>`);
  typeLine();
}
function typeLine() {
  const el = document.getElementById('dlg-say'); if (!el || !DLG) return;
  const text = DLG.lines[DLG.i]; let n = 0;
  clearInterval(DLG.timer);
  const last = DLG.i >= DLG.lines.length - 1;
  const finish = () => { clearInterval(DLG.timer); DLG.timer = null; el.textContent = text; document.getElementById('dlg-more').hidden = last; if (last) document.getElementById('dlg-choices').hidden = false; };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
  DLG.finish = finish;
  DLG.timer = setInterval(() => { n += 2; el.textContent = text.slice(0, n); if (n % 6 === 0) sfx('blip'); if (n >= text.length) finish(); }, 22);
}

/* ---------- Region and NPC conversations ---------- */
function goalAdd(kind) { const g = profile.goals.find(x => x.kind === kind) || profile.goals.find(x => /car/i.test(x.name) && kind === 'car'); return g ? { label: `Add gold to ${g.name}`, cls: 'primary', fn: () => openEntry('save', null, { goalId: g.id }) } : null; }
function regionTalk(id) {
  const { steps, current } = planSteps();
  const idx = REGIONS.findIndex(r => r.id === id);
  const reg = REGIONS[idx] || SIDE.find(s => s.id === id);
  const name = heroName();
  const locked = idx > current;
  const st = gameStats();
  if (locked) return openDialog(reg.npc, [`The fog is thick around ${reg.name}, ${name}.`, `Finish your quest at ${REGIONS[Math.min(current, 6)].name} first. ${steps[Math.min(current, 6)].title}.`], [], reg.name);
  const T = {
    village: () => openDialog('pip', [`Welcome home, ${name}. Every legend in the Ledgerlands started right here, with a tally.`, steps[0].done ? 'You track your coin like a true scribe. The road east is open to you.' : steps[0].text, 'Mabel’s inn is just down the lane. Rest there each night and the road treats you kinder.'], [{ label: 'Log a purchase', cls: 'primary', fn: () => openEntry('expense') }, { label: 'Visit the Hearth Inn', fn: openInn }], reg.name),
    ember: () => openDialog('wren', [`The Ember Chest sits at the heart of these woods, ${name}. Fill it with $1,000 and no surprise can knock you flat.`, steps[1].text, steps[1].done ? 'It glows full. Well done. Guard it, and only open it for real emergencies.' : 'A little every paycheck. The woods are patient.'], [goalAdd('emergency')].filter(Boolean), reg.name),
    peaks: () => {
      const wyrms = profile.debts.filter(isCardDebt).filter(d => debtBalance(d) > .005);
      return openDialog('bram', [wyrms.length ? `Interest Wyrms nest in these peaks, ${name}. ${wyrms.map(d => `${bossName(d)}: ${money0(debtBalance(d))} HP, breathes ${d.apr}% fire`).join('. ')}.` : 'The peaks are quiet. No wyrms left, or none you’ve told me about.', 'Pay every minimum so none of them can scorch you. Then throw every spare coin at the one with the hottest fire.', 'I’ll sharpen your blade. You bring the gold.'], [wyrms.length ? { label: 'Strike a wyrm', cls: 'primary', fn: () => openEntry('expense', null, { catId: 'debt', note: wyrms[0].name + ' payment', debtId: wyrms[0].id }) } : { label: 'Add a debt', cls: 'primary', fn: () => openDebt() }, { label: 'Set extra monthly payment', fn: () => { location.hash = 'budget'; } }], reg.name);
    },
    marsh: () => openDialog('mags', ['Debt Wraiths haunt this marsh. Collections accounts, the townsfolk call them.', 'They don’t grow like wyrms do. Most charge no interest. So don’t panic, and don’t pay the first one who shouts at you.', 'Ask them in writing to prove the debt is real. Offer a lump sum, often less than they ask. Get the deal on paper before a single coin leaves your hand.', 'And never hand them the key to your bank. LawHelpMN has the old laws written down if you need them.'], [{ label: 'Add a wraith (collections)', cls: 'primary', fn: () => openDebt(null, true) }, ...(profile.debts.some(d => d.type === 'collection') ? [] : [{ label: 'There are none in my marsh', fn: () => { profile.noCollections = true; saveProfile(); closeSheet(); render(); } }])], reg.name),
    cross: () => openDialog('grubb', [`Welcome to the Crossroads, ${name}! Finest wares in the Ledgerlands.`, `Here’s a merchant’s secret: get one whole month ahead. ${steps[4].text}`, `You’ve got ${st.gems} gems on you. Care to browse?`], [{ label: 'Open the shop', cls: 'gold', fn: openShop }, goalAdd('buffer')].filter(Boolean), reg.name),
    keep: () => openDialog('vell', [`Stormwall Keep has stood a hundred winters, ${name}, because its stores never run dry.`, steps[5].text, 'Three months of needs, set aside. Then a lost job or cut hours is a siege you can outlast.'], [goalAdd('emergency')].filter(Boolean), reg.name),
    tower: () => openDialog('ione', ['The stars move slowly, traveler. So does compound interest. Both are unstoppable.', steps[6].text, 'Coin you invest at 26 does far more work than coin you invest at 46.'], [{ label: profile.investing ? 'I stopped investing' : 'I’m investing now', cls: 'primary', fn: () => { profile.investing = !profile.investing; saveProfile(); closeSheet(); render(); } }, { label: 'Set my 401(k) match date', fn: openSettings }], reg.name),
    stable: () => {
      const car = profile.goals.find(g => /car/i.test(g.name));
      return openDialog('odo', [`A wagon of your own, eh ${name}? Smart. Cash for a car beats a loan that bites every month.`, car ? `Your Car fund holds ${money0(goalSaved(car))} of ${money0(car.target)}.` : 'You don’t have a car fund yet.', 'Even a used one needs a down payment, insurance and repairs. Save for all three.'], car ? [goalAdd('car')] : [{ label: 'Start a car fund', cls: 'primary', fn: () => openGoal(null) }], reg.name);
    },
    isle: () => {
      const house = profile.goals.find(g => /house|home/i.test(g.name));
      return openDialog('ione', ['That’s the Far Isle. A house of your own, someday.', 'Nobody rows there straight from the village. You get there by finishing the main quest first. The boat leaves from Starfall Tower.', house ? `Your house fund holds ${money0(goalSaved(house))}.` : 'When you’re ready, start a house fund. Even a small one tells the stars you mean it.'], house ? [] : [{ label: 'Start a house fund', fn: () => openGoal(null) }], reg.name);
    },
  };
  (T[id] || T.village)();
}

function openInn() {
  const g = gs(), d = toStr(today()), y = toStr(addDays(today(), -1));
  const target = !g.days[d] ? d : null;
  const missedY = !g.days[y] && new Date(profile.createdAt || 0) < parseD(y);
  if (!target) return openDialog('mabel', [`You’ve already rested tonight, ${heroName()}.`, g.days[d].clear ? 'And a clear day it was. Sleep well.' : 'Tomorrow’s a new road. Fewer monsters, I hope.'], missedY ? [{ label: 'I forgot to rest last night', fn: () => innFor(y) }] : [], 'Hearth Inn');
  innFor(target, missedY && target === d ? y : null);
}
function innFor(day, alsoYesterday) {
  const wants = all().filter(e => e.date === day && isWant(e) && !e.treat);
  const when = day === toStr(today()) ? 'today' : 'yesterday';
  const yChoice = alsoYesterday ? [{ label: 'Rest for last night instead', fn: () => innFor(alsoYesterday) }] : [];
  if (!wants.length) {
    openDialog('mabel', [`Welcome back, ${heroName()}. Long day on the road?`, `Your journal shows no wants ${when}. Not a single monster. Is that the truth?`], [
      { label: 'Rest. I swear it.', cls: 'primary', fn: () => checkIn(day, true) },
      { label: 'Wait, I forgot to log something', fn: () => openEntry('expense', null, { date: day }) }, ...yChoice], 'Hearth Inn');
  } else {
    const total = sumAmt(wants);
    openDialog('mabel', [`I can see the scratches, ${heroName()}. ${wants.length} monster${wants.length === 1 ? '' : 's'} ${when}: ${[...new Set(wants.map(e => monsterOf(e.catId).name))].join(', ')}.`, `${money(total)} gone. No clear day this time, but resting still heals you.`], [{ label: 'Rest anyway', cls: 'primary', fn: () => checkIn(day, false) }, ...yChoice], 'Hearth Inn');
  }
}
function checkIn(day, clear) {
  const before = gameStats(), g = gs();
  g.days[day] = { clear, at: Date.now() };
  heal(clear ? 2 : 1);
  saveProfile(); closeSheet(); render(); sfx('rest');
  popGain(before, gameStats());
  if (clear) toast(`Clear day. Streak: ${gameStats().streak}.`);
}

/* ---------- Shop ---------- */
function openShop() {
  const g = gs(), st = gameStats();
  const row = (icon, name, desc, base, act, extra = '') => { const cost = priceOf(base); return `<div class="shop-item">${icon}<div><div class="qt">${esc(name)}</div><div class="small muted">${esc(desc)}</div></div><button class="btn sm gold" data-action="${act}" ${extra} ${st.gems < cost ? 'disabled' : ''}>${cost} ${sprite('gem')}</button></div>`; };
  const own = (kind, id) => g.owned[kind].includes(id);
  openSheet('Grubb’s Shop', `
    <div class="dlg"><div class="portrait">${sprite('grubb')}</div><div><div class="who">GRUBB</div><p class="say">Gems in, goodies out! You’ve got <b style="color:var(--accent)">${st.gems}</b>. Every $10 you save earns one.</p></div></div>
    <div class="sec-head"><h2>Supplies</h2></div>
    <div class="list">
      ${row(sprite('potion'), 'Red potion', 'Restores 3 hearts.', 12, 'buy', 'data-item="potion"')}
      ${row(sprite('ticket'), 'Treat Pass', 'One guilt-free want: no damage, streak stays safe.', 25, 'buy', 'data-item="pass"')}
    </div>
    <div class="sec-head"><h2>Your rewards</h2><button class="link" data-action="reward-new">Add one</button></div>
    <p class="small muted">Name real treats you want to earn. Buying one gives you a Treat Pass to spend on it.</p>
    ${g.rewards.length ? `<div class="list">${g.rewards.map(r => row(sprite('star'), r.name, 'Earned treat', r.cost, 'buy', `data-item="reward" data-id="${esc(r.id)}"`)).join('')}</div>` : ''}
    <form data-form="reward" id="reward-form" class="card" hidden>
      <div class="fields-2"><label class="field"><span>Treat</span><input name="name" placeholder="Burrito night" maxlength="30" required></label><label class="field"><span>Gem price</span><input name="cost" inputmode="numeric" placeholder="30"></label></div>
      <p class="hint">Rule of thumb: about 2 gems per real dollar the treat costs.</p>
      <button class="btn primary" type="submit">Add reward</button>
    </form>
    <div class="sec-head"><h2>Tunics</h2></div>
    <div class="grid-3">${Object.entries(OUTFITS).filter(([id, o]) => !o.event || own('outfit', id)).map(([id, o]) => `<button class="tile" data-action="${own('outfit', id) ? 'equip' : 'buy'}" data-item="outfit" data-id="${id}" ${!own('outfit', id) && st.gems < priceOf(o.cost) ? 'disabled' : ''}>${sprite('hero', '', { outfit: id, hat: g.hat })}<span class="tn">${esc(o.name)}</span><span class="td">${g.outfit === id ? 'Wearing' : own('outfit', id) ? 'Wear' : priceOf(o.cost) + ' gems'}</span></button>`).join('')}</div>
    <div class="sec-head"><h2>Hats</h2></div>
    <div class="grid-3">${Object.entries(HATS).filter(([id, h]) => !h.event || own('hat', id)).map(([id, h]) => `<button class="tile" data-action="${own('hat', id) ? 'equip' : 'buy'}" data-item="hat" data-id="${id}" ${!own('hat', id) && st.gems < priceOf(h.cost) ? 'disabled' : ''}>${sprite('hero', '', { outfit: g.outfit, hat: id })}<span class="tn">${esc(h.name)}</span><span class="td">${g.hat === id ? 'Wearing' : own('hat', id) ? 'Wear' : priceOf(h.cost) + ' gems'}</span></button>`).join('')}</div>`);
}
function buy(el) {
  const g = gs(), st = gameStats(), item = el.dataset.item, id = el.dataset.id;
  let cost = 0, label = '';
  if (item === 'potion') { cost = 12; label = 'Red potion'; }
  else if (item === 'pass') { cost = 25; label = 'Treat Pass'; }
  else if (item === 'reward') { const r = g.rewards.find(x => x.id === id); if (!r) return; cost = r.cost; label = r.name; }
  else if (item === 'outfit') { cost = OUTFITS[id].cost; label = OUTFITS[id].name; }
  else if (item === 'hat') { cost = HATS[id].cost; label = HATS[id].name; }
  cost = priceOf(cost);
  if (st.gems < cost) { toast('Not enough gems yet.'); return; }
  g.spent += cost;
  if (item === 'potion') g.potions++;
  if (item === 'pass' || item === 'reward') g.tokens++;
  if (item === 'outfit') { g.owned.outfit.push(id); g.outfit = id; }
  if (item === 'hat') { g.owned.hat.push(id); g.hat = id; }
  g.buys.push({ label, cost, at: Date.now() });
  saveProfile(); sfx('buy');
  toast(item === 'reward' ? `${label} earned. Log it as a want and use your Treat Pass.` : `Bought: ${label}.`);
  openShop(); render();
}

/* ---------- Bestiary and trophies ---------- */
function openBestiary() {
  const wants = all().filter(isWant);
  const skipped = profile.wants.filter(w => w.decided === 'skipped');
  const tiles = Object.entries(MONSTERS).map(([cat, m]) => {
    const met = wants.filter(e => (MONSTERS[e.catId] ? e.catId : 'other') === cat);
    const slain = skipped.filter(w => { const c = judge(w.name).catId; return (MONSTERS[c] ? c : 'other') === cat; }).length;
    const known = met.length || slain;
    return `<div class="tile ${known ? '' : 'locked'}">${sprite(m.sprite)}<span class="tn">${known ? esc(m.name) : '???'}</span><span class="td">${known ? `Met ${met.length} · took ${money0(sumAmt(met))}${slain ? ` · slain ${slain}` : ''}` : 'Not met yet'}</span></div>`;
  }).join('');
  const bosses = profile.debts.map(d => { const b = debtBalance(d), start = Math.max(Number(d.startBalance) || 0, Number(d.balance) || 0, b); return `<div class="boss card">${sprite(bossSprite(d))}<div class="stack" style="gap:4px"><div class="bn">${esc(bossName(d).toUpperCase())}</div><div class="hpbar"><i style="width:${(start ? b / start * 100 : 0).toFixed(1)}%"></i></div><div class="small muted">${b > .005 ? `${money0(b)} HP left` : 'Defeated'}</div></div></div>`; }).join('');
  openSheet('Bestiary', `<p class="small muted">Every want you log is a monster you met. Skip one on your want list and you slay it.</p><div class="grid-3">${tiles}</div>${bosses ? `<div class="sec-head"><h2>Bosses</h2></div><div class="stack">${bosses}</div>` : ''}<details class="card"><summary>Monster lore</summary><div class="stack" style="margin-top:10px">${Object.values(MONSTERS).map(m => `<p class="small"><b>${esc(m.name)}:</b> ${esc(m.lore)}</p>`).join('')}</div></details>`);
}
function openTrophies() {
  const g = gs();
  const n = Object.keys(g.trophies).length;
  openSheet('Trophies', `<p class="small muted">${n} of ${TROPHIES.length} earned.</p><div class="grid-3">${TROPHIES.map(t => `<div class="tile ${g.trophies[t[0]] ? '' : 'locked'}">${sprite(t[5])}<span class="tn">${esc(t[1])}</span><span class="td">${esc(t[2])}</span></div>`).join('')}</div>`);
}

/* ---------- Map tab ---------- */
function mapHTML() {
  const reached = reachedRegion();
  const g = gs();
  const pin = (r, i, side) => `<button class="map-pin ${!side && i > reached ? 'locked' : ''}" style="left:${(r.x + .5) / MAP_W * 100}%;top:${(r.y + .3) / MAP_H * 100}%" data-action="walk-region" data-id="${r.id}" aria-label="Walk to ${esc(r.name)}"><span>${esc(r.name)}</span></button>`;
  const here = heroPos();
  return `<div class="map-wrap" data-action="map-tap"><canvas class="pix" id="map" width="320" height="240" aria-label="Map of the Ledgerlands"></canvas>
    ${REGIONS.map((r, i) => pin(r, i)).join('')}${SIDE.map(s => pin(s, 0, true)).join('')}
    ${featureOn('pet') && petStage() > 0 ? petSprite(petStage(), 'map-hero map-pet').replace('class="sprite ', `id="map-pet" style="${tilePct(here.x, here.y, .25, .2)}" class="sprite `) : ''}<img class="sprite map-hero" id="map-hero" src="${spriteURL('hero', { outfit: g.outfit, hat: g.hat })}" alt="You" style="${tilePct(here.x, here.y)}"></div>`;
}

/* ---------- Actions and forms ---------- */
const gameActions = {
  'dlg-next': () => { if (!DLG) return; if (DLG.timer) { DLG.finish(); return; } if (DLG.i < DLG.lines.length - 1) { DLG.i++; typeLine(); } },
  'dlg-choice': el => { const c = DLG && DLG.choices[Number(el.dataset.i)]; closeSheet(); if (c && c.fn) c.fn(); },
  claim: el => {
    const g = gs(), d = toStr(today()), q = QUESTS[el.dataset.q];
    if (!q || !q.done(d) || (g.claimed[d] || []).includes(el.dataset.q)) return;
    const before = gameStats();
    (g.claimed[d] = g.claimed[d] || []).push(el.dataset.q);
    g.bonusGems += q.gems; g.bonusXP += q.xp;
    for (const k of Object.keys(g.claimed)) if (k < toStr(addDays(today(), -14))) delete g.claimed[k];
    saveProfile(); render(); popGain(before, gameStats());
  },
  inn: openInn,
  'open-chest': () => { const c = lastWeekChest(), g = gs(); if (!c || !c.ok || c.claimed) return; g.weekly[c.key] = true; g.bonusGems += 20; g.bonusXP += 100; g.tokens += hasSkill('treasure') ? 2 : 1; saveProfile(); queueCeleb({ kind: 'chest' }); render(); },
  drink: () => { const g = gs(); if (g.potions < 1) return; g.potions--; heal(3); saveProfile(); sfx('chest'); pop('+3 ♥', 'var(--heart)'); render(); },
  shop: openShop,
  buy,
  equip: el => { const g = gs(); if (el.dataset.item === 'outfit') g.outfit = el.dataset.id; else g.hat = el.dataset.id; saveProfile(); sfx('blip'); openShop(); render(); },
  'reward-new': () => { const f = document.getElementById('reward-form'); if (f) { f.hidden = false; f.querySelector('input').focus(); } },
  trophies: openTrophies,
  bestiary: openBestiary,
  region: el => regionTalk(el.dataset.id),
  sound: () => { const g = gs(); g.sound = !g.sound; saveProfile(); document.querySelector('#sound-btn img').src = spriteURL(g.sound ? 'note' : 'noteOff'); if (g.sound) sfx('coin'); },
};
const gameForms = {
  reward(f, fd) {
    const name = String(fd.get('name') || '').trim(), cost = Math.max(5, Math.round(Number(fd.get('cost')) || 30));
    if (!name) return;
    gs().rewards.push({ id: newId('rw'), name, cost }); saveProfile(); openShop();
  },
};

/* ---------- Bosses and the adventure record ---------- */
function bossCard(d) {
  const b = debtBalance(d), start = Math.max(Number(d.startBalance) || 0, Number(d.balance) || 0, b);
  const down = b <= .005;
  return `<div class="boss card">${sprite(bossSprite(d), down ? '' : '', null, '')}<div class="stack" style="gap:6px">
    <div class="bn" style="${down ? 'color:var(--muted);text-decoration:line-through' : ''}">${esc(bossName(d).toUpperCase())}</div>
    <div class="hpbar"><i style="width:${(start ? b / start * 100 : 0).toFixed(1)}%"></i></div>
    <div class="row small"><span class="muted">${down ? 'Defeated' : `${money0(b)} HP${d.type === 'collection' ? '' : ` · ${Number(d.apr) || 0}% fire`}`}</span>${down ? '' : `<button class="btn sm" data-action="strike" data-id="${esc(d.id)}">${sprite('sword')} Strike</button>`}</div>
  </div></div>`;
}
function bossesHTML() {
  if (!profile.debts.length) return '';
  return `<section><div class="sec-head"><h2>Bosses</h2><button class="link" data-action="tab" data-tab="budget">Battle plan</button></div><div class="stack">${profile.debts.map(bossCard).join('')}</div></section>`;
}
function adventureHTML() {
  const st = gameStats(), wants = all().filter(isWant), g = gs();
  const stat = (k, v) => `<div class="stat"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  return `<section><div class="sec-head"><h2>Adventure record</h2></div><div class="stats">
    ${stat('Total XP', st.xp)}${stat('Level', `${st.level} · ${esc(st.title)}`)}
    ${stat('Clear days', st.clearN)}${stat('Best streak', st.best)}
    ${stat('Monsters met', wants.length)}${stat('Gold lost to them', money0(sumAmt(wants)))}
    ${stat('Monsters slain', st.skipped)}${stat('Bosses defeated', Object.keys(g.bosses).length)}
    ${stat('Trophies', `${Object.keys(g.trophies).length}/${TROPHIES.length}`)}${stat('Receipts kept', st.receipts)}
  </div></section>`;
}
gameActions.strike = el => { const d = profile.debts.find(x => x.id === el.dataset.id); if (d) openEntry('expense', null, { catId: 'debt', note: d.name + ' payment', debtId: d.id }); };

/* ---------- Class and skill screens ---------- */
function openClasses() {
  const cur = heroClass(), st = gameStats();
  openSheet(cur ? 'Retrain' : 'Choose your class', `
    <div class="dlg"><div class="portrait">${sprite('pip')}</div><div><div class="who">ELDER PIP</div><p class="say">${cur ? 'Retraining costs 50 gems. Class bonuses count from the moment you switch.' : 'Every hero walks a path. Pick the one that fits how you want to win. You can retrain later for 50 gems.'}</p></div></div>
    ${Object.entries(CLASSES).map(([id, c]) => `<div class="card class-card">${sprite('hero', '', { cls: id })}<div class="stack" style="gap:6px"><h3>${c.name.toUpperCase()} · ${esc(c.role)}</h3><p class="small">${esc(c.passive)}</p><p class="small" style="color:var(--arti)"><b>${esc(SKILLS[c.active].name)}</b> (weekly): ${esc(SKILLS[c.active].desc)}</p>${cur === id ? '<span class="pill good">Your class</span>' : `<button class="btn sm ${cur ? '' : 'gold'}" data-action="pick-class" data-id="${id}" ${cur && st.gems < 50 ? 'disabled' : ''}>${cur ? 'Retrain · 50 gems' : 'Become a ' + c.name}</button>`}</div></div>`).join('')}`);
}
function openSkills() {
  const g = gs(), st = gameStats(), cls = heroClass(), now = Date.now();
  const actives = [cls && CLASSES[cls].active, hasSkill('second') && 'second'].filter(Boolean);
  const activeRow = id => {
    const s = SKILLS[id], last = g.cool[id] || 0, ready = now - last >= SKILL_COOL;
    const right = buffOn(id) ? '<span class="pill arti-p">Active</span>' : ready ? `<button class="btn sm arti-btn" data-action="use-skill" data-id="${id}">Use</button>` : `<span class="pill">${Math.ceil((SKILL_COOL - (now - last)) / 864e5)}d</span>`;
    return `<div class="skill"><div><div class="qt">${esc(s.name)}</div><div class="small muted">${esc(s.desc)}</div></div>${right}</div>`;
  };
  const tree = Object.entries(SKILLS).filter(([, s]) => !s.cls).map(([id, s]) => {
    const learned = hasSkill(id), locked = st.level < s.req;
    return `<div class="skill ${learned ? 'learned' : ''} ${locked ? 'locked' : ''}"><div><div class="qt">${esc(s.name)} <span class="small muted">· LV ${s.req}${s.cost > 1 ? ` · ${s.cost} pts` : ''}</span></div><div class="small muted">${esc(s.desc)}</div></div>${learned ? sprite('check') : `<button class="btn sm gold" data-action="learn" data-id="${id}" ${locked || st.points < s.cost ? 'disabled' : ''}>Learn</button>`}</div>`;
  }).join('');
  openSheet('Skills', `
    <div class="hero-card"><div class="portrait">${sprite('hero')}</div><div class="stack" style="gap:4px"><div class="name">${esc(heroName())}</div><div class="title">${raceName()} ${cls ? CLASSES[cls].name : 'Adventurer'}</div><div class="small muted">${cls ? esc(CLASSES[cls].passive) : 'No class yet.'}</div></div></div>
    <div class="row"><span class="pill gold-p">${Math.max(0, st.points)} skill point${st.points === 1 ? '' : 's'}</span><span class="small muted">You earn 1 every level</span></div>
    ${cls ? '' : '<div class="callout"><p>Choose a class to unlock its signature ability.</p><button class="btn sm gold" data-action="classes">Choose class</button></div>'}
    ${actives.length ? `<div class="sec-head"><h2>Abilities</h2><span class="small muted">once a week each</span></div><div class="list">${actives.map(activeRow).join('')}</div>` : ''}
    <div class="sec-head"><h2>Skill tree</h2></div><div class="list">${tree}</div>
    <div class="btn-row">${cls ? '<button class="btn sm" data-action="classes">Retrain class</button>' : ''}${Object.keys(g.skills).length ? `<button class="btn sm danger" data-action="respec" ${st.gems < 30 ? 'disabled' : ''}>Reset skills · 30 gems</button>` : ''}</div>`);
}
function useSkill(id) {
  const g = gs(), now = Date.now(), s = SKILLS[id];
  if (!s || (s.cls && s.cls !== heroClass()) || (!s.cls && !hasSkill(id))) return;
  if (now - (g.cool[id] || 0) < SKILL_COOL) return;
  const before = gameStats();
  g.cool[id] = now;
  if (id === 'mark' || id === 'cleave' || id === 'vanish') { g.buffs[id] = now + BUFF_TIME; toast(`${s.name} is active for 24 hours.`); }
  if (id === 'meditate') { g.hp = before.maxHp; pop('HEARTS RESTORED', 'var(--heart)'); }
  if (id === 'second') { heal(3); pop('+3 ♥', 'var(--heart)'); }
  if (id === 'study') { const n = all().filter(e => (e.created || 0) > now - 7 * 864e5).length; g.bonusXP += Math.min(150, n * 5); }
  saveProfile(); sfx('level'); popGain(before, gameStats()); openSkills(); render();
}
Object.assign(gameActions, {
  classes: openClasses,
  skills: openSkills,
  'pick-class': el => {
    const g = gs(), cur = heroClass(), id = el.dataset.id;
    if (!CLASSES[id] || cur === id) return;
    if (cur) { if (gameStats().gems < 50) { toast('Retraining costs 50 gems.'); return; } g.spent += 50; }
    g.classHist.push({ cls: id, at: Date.now() });
    saveProfile(); sfx('level'); closeSheet(); render();
    openDialog('pip', [`A ${CLASSES[id].name}! It suits you, ${heroName()}.`, CLASSES[id].passive, `Your signature ability is ${SKILLS[CLASSES[id].active].name}. Use it once a week from the Skills screen.`], [{ label: 'Open skills', cls: 'primary', fn: openSkills }], 'Tally Village');
  },
  learn: el => { const id = el.dataset.id, s = SKILLS[id], st = gameStats(); if (!s || hasSkill(id) || st.level < s.req || st.points < s.cost) return; gs().skills[id] = Date.now(); saveProfile(); sfx('chest'); openSkills(); render(); },
  'use-skill': el => useSkill(el.dataset.id),
  respec: () => { const g = gs(); if (gameStats().gems < 30) return; g.spent += 30; g.skills = {}; saveProfile(); toast('Skills reset. Your points are back.'); openSkills(); render(); },
});
