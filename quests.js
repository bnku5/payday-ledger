'use strict';
/* Holiday events, weekly challenges, the companion pet, the payday ceremony and the monthly Chronicle. */

/* ---------- Date helpers ---------- */
const nthWeekday = (y, m, wd, n) => { const first = new Date(y, m, 1); return new Date(y, m, 1 + (wd - first.getDay() + 7) % 7 + (n - 1) * 7); };
const lastWeekday = (y, m, wd) => { const last = new Date(y, m + 1, 0); return addDays(last, -((last.getDay() - wd + 7) % 7)); };
function easterSunday(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
const within = (e, a, b) => e.date >= a && e.date <= b;
const wantsIn = (a, b) => all().filter(e => isWant(e) && !e.treat && within(e, a, b));
const savedIn = (a, b) => sumAmt(all().filter(e => e.type === 'save' && e.amount > 0 && within(e, a, b)));
const clearIn = (a, b) => Object.keys(gs().days).filter(d => d >= a && d <= b && gs().days[d].clear).length;
const rangeLabel = (a, b) => a === b ? short(a) : `${short(a)} – ${short(b)}`;

/* ---------- Holiday events ---------- */
function holidayList(y) {
  const D = (m, d) => new Date(y, m, d);
  const thx = nthWeekday(y, 10, 4, 4), memorial = lastWeekday(y, 4, 1), labor = nthWeekday(y, 8, 1, 1), easter = easterSunday(y);
  return [
    { id: 'newyear', name: 'Resolution Rally', boss: 'Old Year Wraith', sprite: 'wraith', pal: { l: '#B8C4C0', c: '#FFCC33' }, start: D(0, 1), end: D(0, 7), goal: { type: 'save', n: 50 }, text: 'Start the year strong: save $50 in the first week.', gems: 40, xp: 150, item: ['hat', 'party'] },
    { id: 'valentine', name: 'Heartbreak Hollow', boss: 'Heartbreaker Imp', sprite: 'imp', pal: { r: '#FF7EB6', R: '#C2306E' }, start: D(1, 10), end: D(1, 14), goal: { type: 'cap', n: 60 }, text: 'Love is free. Keep wants under $60 from Feb 10 to 14.', gems: 30, xp: 120 },
    { id: 'stpat', name: 'The Clover Chase', boss: 'Clover Goblin', sprite: 'goblin', pal: { r: '#2FAF5A', z: '#9BE34A' }, start: D(2, 14), end: D(2, 17), goal: { type: 'cap', n: 40 }, text: 'Keep wants under $40 through St. Patrick’s Day.', gems: 30, xp: 120 },
    { id: 'easter', name: 'The Egg Hunt', boss: 'Egg Mimic', sprite: 'mimic', pal: { u: '#9CD8FF', y: '#FF9ECF' }, start: addDays(easter, -2), end: addDays(easter, 1), goal: { type: 'clear', n: 3 }, text: 'Earn 3 clear days over Easter weekend.', gems: 30, xp: 120 },
    { id: 'memorial', name: 'Cookout Clash', boss: 'Grill Slime', sprite: 'slime', start: addDays(memorial, -2), end: memorial, goal: { type: 'nocat', cats: ['dining', 'delivery'] }, text: 'Memorial Day weekend: no eating out, no delivery. Cook out instead.', gems: 30, xp: 120 },
    { id: 'july4', name: 'Fireworks Night', boss: 'Firework Imp', sprite: 'imp', pal: { r: '#3F7BE0', R: '#E04848' }, start: D(6, 2), end: D(6, 5), goal: { type: 'cap', n: 50 }, text: 'Keep wants under $50 around the Fourth.', gems: 30, xp: 120 },
    { id: 'labor', name: 'The Long Weekend Sale', boss: 'Sale Mimic', sprite: 'mimic', start: addDays(labor, -2), end: labor, goal: { type: 'nocat', cats: ['shopping'] }, text: 'Labor Day sales: buy nothing in Shopping all weekend.', gems: 30, xp: 120 },
    { id: 'halloween', name: 'Night of the Candy Wraith', boss: 'Candy Wraith', sprite: 'wraith', pal: { l: '#FF8C42', c: '#9BE34A' }, start: D(9, 25), end: D(9, 31), goal: { type: 'clear', n: 4 }, text: 'Earn 4 clear days in Halloween week.', gems: 35, xp: 150, item: ['hat', 'pumpkin'] },
    { id: 'thanksgiving', name: 'The Gravy Golem', boss: 'Gravy Golem', sprite: 'golem', pal: { a: '#B07A44', M: '#6B3E1F' }, start: addDays(thx, -3), end: thx, goal: { type: 'nocat', cats: ['delivery'] }, text: 'Thanksgiving week: no delivery apps. There’s a feast coming.', gems: 35, xp: 150 },
    { id: 'blackfriday', name: 'Rise of the Sale Hydra', boss: 'Sale Hydra', sprite: 'hydra', pal: { r: '#3EC27A', R: '#1E7A4A' }, start: addDays(thx, 1), end: addDays(thx, 4), goal: { type: 'nocat', cats: ['shopping'] }, text: 'Black Friday to Cyber Monday: buy nothing in Shopping. One planned buy is fine if you use a Treat Pass on it.', gems: 60, xp: 250, item: ['outfit', 'hydra'] },
    { id: 'christmas', name: 'The Frost Wyrm', boss: 'Frost Wyrm', sprite: 'wyrm', pal: { r: '#7FD4FF', R: '#3F7BE0' }, start: D(11, 15), end: D(11, 25), goal: { type: 'clear', n: 5 }, text: 'Earn 5 clear days between Dec 15 and Christmas. Use Treat Passes on gifts for people you love.', gems: 50, xp: 200, item: ['hat', 'winter'] },
  ].map(ev => Object.assign(ev, { key: `${ev.id}-${y}`, from: toStr(ev.start), to: toStr(ev.end) }));
}
function eventStatus(ev) {
  const t = toStr(today()), g = gs(), G = ev.goal;
  const started = t >= ev.from, ended = t > ev.to;
  let ok = false, failed = false, frac = 0, prog = '';
  if (G.type === 'save') { const v = savedIn(ev.from, ev.to); ok = v >= G.n; frac = v / G.n; prog = `${money0(v)} of ${money0(G.n)} saved`; }
  if (G.type === 'clear') { const v = clearIn(ev.from, ev.to); ok = v >= G.n; frac = v / G.n; prog = `${v} of ${G.n} clear days`; }
  if (G.type === 'cap') { const v = sumAmt(wantsIn(ev.from, ev.to)); failed = v > G.n; ok = ended && !failed; frac = 1 - Math.min(1, v / G.n); prog = `${money0(v)} of ${money0(G.n)} spent on wants`; }
  if (G.type === 'nocat') { const hits = wantsIn(ev.from, ev.to).filter(e => G.cats.includes(e.catId)); failed = hits.length > 0; ok = ended && !failed; frac = failed ? 0 : 1; prog = failed ? `Hit ${hits.length} time${hits.length === 1 ? '' : 's'}` : 'Untouched so far'; }
  if (ended && !ok) failed = true;
  return { started, ended, ok, failed, frac, prog, claimed: !!g.events[ev.key] };
}
function activeEvents() {
  const t = today(), y = t.getFullYear();
  return [...holidayList(y - 1), ...holidayList(y), ...holidayList(y + 1)].filter(ev => {
    if (t < addDays(ev.start, -10)) return false;
    const st = eventStatus(ev);
    if (st.claimed) return t <= addDays(ev.end, 1);
    if (st.ok) return t <= addDays(ev.end, 14);
    return t <= addDays(ev.end, 2);
  });
}
const itemName = it => it ? (it[0] === 'hat' ? HATS[it[1]].name : OUTFITS[it[1]].name) : '';
function eventCard(ev) {
  const st = eventStatus(ev), t = today();
  const daysTo = daysBetween(t, ev.start);
  const state = st.claimed ? '<span class="pill good">Won</span>' : st.ok ? '<span class="pill gold-p">Victory!</span>' : st.failed ? '<span class="pill bad">Lost</span>' : st.started ? '<span class="pill warn">Live now</span>' : `<span class="pill">In ${daysTo} day${daysTo === 1 ? '' : 's'}</span>`;
  return `<section class="card stack event-card">
    <div class="row"><span class="pill gold-p">HOLIDAY EVENT</span>${state}</div>
    <div class="boss">${sprite(ev.sprite, '', ev.pal ? { pal: ev.pal } : null)}<div class="stack" style="gap:4px"><div class="bn">${esc(ev.boss.toUpperCase())}</div><div class="small" style="color:var(--gold)">${esc(ev.name)} · ${rangeLabel(ev.from, ev.to)}</div></div></div>
    <p>${esc(ev.text)}</p>
    ${st.started && !st.claimed ? `${bar(st.frac, st.failed ? 'bad' : '')}<p class="small muted">${esc(st.prog)}</p>` : ''}
    <p class="small" style="color:var(--gold)">Reward: ${ev.gems} gems · ${ev.xp} XP${ev.item ? ` · ${esc(itemName(ev.item))} (event only)` : ''}</p>
    ${st.ok && !st.claimed ? `<button class="btn gold block" data-action="claim-event" data-key="${ev.key}">Claim reward</button>` : ''}
    ${st.failed && !st.claimed ? `<p class="small muted">The ${esc(ev.boss)} got you this time. It comes back next year.</p>` : ''}
  </section>`;
}
const eventsHTML = () => activeEvents().map(eventCard).join('');
function eventsCalendarHTML() {
  const y = today().getFullYear(), g = gs();
  const rows = holidayList(y).map(ev => {
    const st = eventStatus(ev), past = toStr(today()) > ev.to;
    const tag = g.events[ev.key] ? '<span class="pill good">Won</span>' : past ? (st.ok ? '<span class="pill gold-p">Claim</span>' : '<span class="pill">Missed</span>') : toStr(today()) >= ev.from ? '<span class="pill warn">Live</span>' : `<span class="small muted">${rangeLabel(ev.from, ev.to)}</span>`;
    return `<div class="item">${sprite(ev.sprite, '', ev.pal ? { pal: ev.pal } : null).replace('class="sprite ', 'style="width:32px;height:32px" class="sprite ')}<div class="main"><div class="title">${esc(ev.boss)}</div><div class="sub">${esc(ev.name)}${ev.item ? ' · ' + esc(itemName(ev.item)) : ''}</div></div>${tag}</div>`;
  }).join('');
  return `<section><div class="sec-head"><h2>${y} holiday events</h2></div><div class="list">${rows}</div></section>`;
}

/* ---------- Weekly challenges (3 random, 1 reroll a week) ---------- */
const weeklyIncome = () => (profile.typicalPay || 0) * ppy() / 52;
const round5 = v => Math.max(5, Math.round(v / 5) * 5);
const decidedIn = (w, a, b) => w.decidedAt && toStr(new Date(w.decidedAt)) >= a && toStr(new Date(w.decidedAt)) <= b;
const CHALLENGES = {
  nodelivery: { name: 'Dungeon of No Delivery', icon: 'goblin', kind: 'avoid', gems: 25, xp: 100, desc: () => 'No delivery apps all week.', test: w => { const n = w.ent.filter(e => isWant(e) && !e.treat && e.catId === 'delivery').length; return { fail: n > 0, frac: n ? 0 : 1, prog: n ? `${n} Dash Goblin${n > 1 ? 's' : ''} got through` : 'No goblins yet' }; } },
  kitchen: { name: 'Kitchen Week', icon: 'slime', kind: 'avoid', gems: 20, xp: 80, desc: () => 'Eat out or order in on 2 days at most.', test: w => { const n = new Set(w.ent.filter(e => isWant(e) && !e.treat && (e.catId === 'dining' || e.catId === 'delivery')).map(e => e.date)).size; return { fail: n > 2, frac: 1 - n / 3, prog: `${n} of 2 days used` }; } },
  ironwallet: { name: 'Iron Wallet', icon: 'flame', kind: 'reach', gems: 15, xp: 60, desc: () => 'Earn 3 clear days.', test: w => { const n = clearIn(w.from, w.to); return { done: n >= 3, frac: n / 3, prog: `${n} of 3 clear days` }; } },
  treasure: { name: 'Treasure Hunter', icon: 'chest', kind: 'reach', gems: 15, xp: 60, target: () => round5(weeklyIncome() * .1 || 20), desc: c => `Move ${money0(c.target())} to savings.`, test: (w, c) => { const t = c.target(), v = sumAmt(w.ent.filter(e => e.type === 'save' && e.amount > 0)); return { done: v >= t, frac: v / t, prog: `${money0(v)} of ${money0(t)}` }; } },
  bossrush: { name: 'Boss Rush', icon: 'sword', kind: 'reach', gems: 20, xp: 80, need: () => profile.debts.some(d => debtBalance(d) > .005), desc: () => 'Pay $50 toward your debts.', test: w => { const v = sumAmt(w.ent.filter(e => e.type === 'expense' && e.debtId)); return { done: v >= 50, frac: v / 50, prog: `${money0(v)} of $50` }; } },
  scribe: { name: 'Scribe’s Week', icon: 'scroll', kind: 'reach', gems: 12, xp: 50, desc: () => 'Log something on 5 different days.', test: w => { const n = new Set(w.ent.map(e => e.date)).size; return { done: n >= 5, frac: n / 5, prog: `${n} of 5 days` }; } },
  hunter: { name: 'Monster Hunter', icon: 'mimic', kind: 'reach', gems: 15, xp: 60, desc: () => 'Slay 2 wants from your want list.', test: w => { const n = profile.wants.filter(x => x.decided === 'skipped' && decidedIn(x, w.from, w.to)).length; return { done: n >= 2, frac: n / 2, prog: `${n} of 2 slain` }; } },
  lean: { name: 'Lean Week', icon: 'coin', kind: 'avoid', gems: 20, xp: 80, target: () => round5(weeklyWantBudget() * .75), desc: c => `Keep wants under ${money0(c.target())}.`, test: (w, c) => { const t = c.target(), v = sumAmt(w.ent.filter(e => isWant(e) && !e.treat)); return { fail: v > t, frac: 1 - Math.min(1, v / t), prog: `${money0(v)} of ${money0(t)}` }; } },
  receipts: { name: 'Keeper of Proof', icon: 'receipt', kind: 'reach', gems: 10, xp: 40, desc: () => 'Attach 3 receipt photos.', test: w => { const n = w.ent.reduce((s, e) => s + (e.receipts || []).length, 0); return { done: n >= 3, frac: n / 3, prog: `${n} of 3 photos` }; } },
  innkeeper: { name: 'Regular at the Inn', icon: 'house', kind: 'reach', gems: 12, xp: 50, desc: () => 'Rest at the Hearth Inn 5 nights.', test: w => { const n = Object.keys(gs().days).filter(d => d >= w.from && d <= w.to).length; return { done: n >= 5, frac: n / 5, prog: `${n} of 5 nights` }; } },
  weekend: { name: 'Weekend Warrior', icon: 'imp', kind: 'avoid', gems: 20, xp: 80, desc: () => 'No wants at all on Saturday or Sunday.', test: w => { const sat = toStr(addDays(parseD(w.from), 5)); const n = w.ent.filter(e => isWant(e) && !e.treat && e.date >= sat).length; return { fail: n > 0, frac: n ? 0 : 1, prog: n ? 'The weekend got you' : 'Weekend untouched so far' }; } },
  leech: { name: 'Leech Hunt', icon: 'bat', kind: 'reach', gems: 20, xp: 80, need: () => profile.bills.some(b => b.catId === 'subs'), desc: () => 'Cancel one subscription you don’t use.', test: w => { const n = profile.freed.filter(f => toStr(new Date(f.at)) >= w.from && toStr(new Date(f.at)) <= w.to).length; return { done: n >= 1, frac: n ? 1 : 0, prog: n ? 'Leech banished' : 'Check your Budget tab' }; } },
};
function weekData(mon) { const from = toStr(mon), to = toStr(addDays(mon, 6)); return { from, to, ended: toStr(today()) > to, ent: all().filter(e => within(e, from, to)) }; }
const challengePool = () => Object.keys(CHALLENGES).filter(k => !CHALLENGES[k].need || CHALLENGES[k].need());
function weekState(mon, create) {
  const g = gs(), key = toStr(mon);
  if (!g.wk[key] && create) {
    const pool = challengePool(), r = rng(Number(key.replace(/-/g, '')) * 7 + 3);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    g.wk[key] = { ids: pool.slice(0, 3), rerolled: false, claimed: [] };
    for (const k of Object.keys(g.wk)) if (k < toStr(addDays(mon, -21))) delete g.wk[k];
    saveProfile();
  }
  return g.wk[key];
}
function challengeStatus(id, w) {
  const c = CHALLENGES[id], r = c.test(w, c);
  if (c.kind === 'avoid') return Object.assign(r, { done: w.ended && !r.fail, failed: !!r.fail });
  return Object.assign(r, { failed: w.ended && !r.done });
}
function challengeRow(id, w, st, i, wkey, current) {
  const c = CHALLENGES[id]; if (!c) return '';
  const s = challengeStatus(id, w), claimed = st.claimed.includes(id);
  let right;
  if (claimed) right = sprite('check');
  else if (s.done) right = `<button class="btn sm gold" data-action="claim-ch" data-week="${wkey}" data-id="${id}">Claim</button>`;
  else if (s.failed) right = '<span class="pill bad">Failed</span>';
  else if (current && !st.rerolled) right = `<button class="btn sm" data-action="reroll" data-i="${i}" aria-label="Reroll ${esc(c.name)}">Reroll</button>`;
  else right = `<span class="pill">${c.kind === 'avoid' ? 'On track' : '…'}</span>`;
  return `<div class="quest ${claimed ? 'done' : ''}">${sprite(c.icon)}<div><div class="qt">${esc(c.name)}</div><div class="small muted">${esc(c.desc(c))}</div>${!claimed && !s.failed && s.frac != null ? `<div class="bar" style="margin:6px 0 2px">${`<i style="width:${(clamp01(s.frac) * 100).toFixed(0)}%"></i>`}</div>` : ''}<div class="qr">${esc(s.prog)} · +${c.gems} gems · +${c.xp} XP</div></div>${right}</div>`;
}
function weeklyHTML() {
  const mon = mondayOf(today()), key = toStr(mon), st = weekState(mon, true), w = weekData(mon);
  const lastMon = addDays(mon, -7), lastKey = toStr(lastMon), last = gs().wk[lastKey], lw = weekData(lastMon);
  const lastClaims = last ? last.ids.filter(id => CHALLENGES[id] && !last.claimed.includes(id) && challengeStatus(id, lw).done) : [];
  const resets = daysBetween(today(), addDays(mon, 7));
  return `<section>
    <div class="sec-head"><h2>Weekly challenges</h2><span class="small muted">new set in ${resets} day${resets === 1 ? '' : 's'}${st.rerolled ? '' : ' · 1 reroll left'}</span></div>
    <div class="list">${st.ids.map((id, i) => challengeRow(id, w, st, i, key, true)).join('')}</div>
    ${lastClaims.length ? `<div class="sec-head"><h2>Last week</h2></div><div class="list">${lastClaims.map(id => challengeRow(id, lw, last, 0, lastKey, false)).join('')}</div>` : ''}
  </section>`;
}

/* ---------- The companion ---------- */
const PET_STAGES = [
  { at: 0, name: 'Egg', sprite: 'egg' },
  { at: 100, name: 'Hatchling', sprite: 'hatch' },
  { at: 500, name: 'Kitten', sprite: 'kit' },
  { at: 1000, name: 'Ember Cat', sprite: 'fox' },
  { at: 2500, name: 'Blue-flame Guardian', sprite: 'fox', pal: { o: '#5BC8FF', O: '#2B7ACC', y: '#E8FBFF' } },
  { at: 5000, name: 'Golden Legend', sprite: 'fox', pal: { o: '#FFCC33', O: '#C98A00', y: '#FFF6D8' } },
];
const safetyGoals = () => profile.goals.filter(x => x.kind === 'emergency' || x.kind === 'buffer');
const cushion = () => safetyGoals().reduce((s, x) => s + goalSaved(x), 0);
function petStage() { const c = cushion(); let i = 0; PET_STAGES.forEach((s, j) => { if (c >= s.at) i = j; }); return i; }
const petSprite = (i, cls = '') => sprite(PET_STAGES[i].sprite, cls, PET_STAGES[i].pal ? { pal: PET_STAGES[i].pal } : null);
const petName = () => gs().pet.name || 'Ember';
function petMood() {
  const ids = new Set(safetyGoals().map(x => x.id)), now = Date.now();
  const recent = all().filter(e => e.type === 'save' && ids.has(e.goalId));
  if (recent.some(e => e.amount < 0 && now - (e.created || 0) < 14 * 864e5)) return 'worried';
  if (recent.some(e => e.amount > 0 && now - (e.created || 0) < 7 * 864e5)) return 'happy';
  return 'sleepy';
}
function petHTML() {
  const g = gs(), i = petStage(), c = cushion(), cur = PET_STAGES[i], next = PET_STAGES[i + 1], name = petName();
  const mood = petMood();
  let line;
  if ((g.pet.best || 0) > i) line = `${name} has weakened. It was a ${PET_STAGES[g.pet.best].name}. Refill your safety fund to bring it back.`;
  else if (i === 0) line = `The egg is warm. Put $100 in your Emergency fund or One month ahead to hatch it.`;
  else line = { happy: `${name} is bouncing around. Your last deposit fed it well.`, worried: `${name} looks worried. Money came out of your safety fund. Put it back when you can.`, sleepy: `${name} is napping on your coin pile. A deposit would wake it up.` }[mood];
  return `<section class="card pet-card">
    <div class="pet-box">${petSprite(i, 'pop')}</div>
    <div class="stack" style="gap:6px">
      <div class="row"><span class="name" style="font-family:var(--f-pixel);font-size:10px">${esc(name.toUpperCase())}</span><button class="link" data-action="pet-name">Rename</button></div>
      <div class="small" style="color:var(--gold)">${esc(cur.name)}</div>
      <p class="small">${esc(line)}</p>
      ${next ? `${bar((c - cur.at) / (next.at - cur.at))}<p class="small muted">${money0(c)} saved · ${esc(next.name)} at ${money0(next.at)}</p>` : '<p class="small" style="color:var(--gold)">Fully grown. Legendary.</p>'}
    </div>
  </section>`;
}

/* ---------- Payday ceremony ---------- */
function openPayday(inc) {
  const billAmt = billShare(), save = r2(inc.amount * profile.split.save / 100), rest = r2(inc.amount - billAmt - save);
  const extra = profile.pay.type === 'hourly' && profile.typicalPay > 0 ? r2(inc.amount - profile.typicalPay) : 0;
  const goalId = defaultGoalId(), goal = profile.goals.find(x => x.id === goalId);
  const msg = extra > 20 ? `This check is ${money0(extra)} more than your plan. You worked for that. Send the extra to ${goal ? goal.name : 'savings'} too.`
    : extra < -20 ? `This check is ${money0(-extra)} short of your plan. Tighter week. Bills and savings first, then what’s left is your real spending number.`
    : 'Pay yourself first. Deposit the tribute now, then do the same transfer in your bank app.';
  const coins = Array.from({ length: 12 }, (_, i) => `<img class="sprite coin-drop" src="${spriteURL('coin')}" alt="" style="left:${5 + (i * 37) % 90}%;animation-delay:${(i % 6) * .12}s">`).join('');
  const bonusOpen = !all().some(e => e.type === 'save' && e.amount > 0 && e.date === inc.date && e.created < inc.created);
  sfx('chest');
  openSheet('Payday!', `
    <div class="payday"><div class="coin-rain" aria-hidden="true">${coins}</div>
      <div class="celebrate"><div class="big pop">PAYDAY!</div>${sprite('chestOpen', 'pop')}<p>The guild pays its due: <b class="num" style="color:var(--gold);font-size:30px">${money(inc.amount)}</b></p>${inc.source ? `<p class="small muted">from ${esc(inc.source)}</p>` : ''}</div></div>
    <div class="card ledger">
      <div class="row"><span class="key"><i class="dot" style="background:var(--warn)"></i>Share of monthly bills</span><span class="num">−${money(billAmt)}</span></div>
      <div class="row"><span class="key"><i class="dot" style="background:var(--accent)"></i>Tribute to savings (${profile.split.save}%)</span><span class="num">−${money(save)}</span></div>
      <div class="row total"><span>Free to spend</span><span class="num">${money(rest)}</span></div>
    </div>
    ${artiCard({ msg }, true)}
    ${bonusOpen ? '<div class="callout"><p><b>Pay-yourself-first bonus:</b> deposit today and earn +25 XP and +5 gems on top.</p></div>' : ''}
    <form data-form="split">
      <div class="fields-2">
        <label class="field"><span>Tribute</span><input id="sp-amt" name="amount" inputmode="decimal" value="${(save + Math.max(0, extra > 20 ? extra : 0)).toFixed(2)}"></label>
        <label class="field"><span>Into</span><select id="sp-goal" name="goal">${goalOptions(goalId)}</select></label>
      </div>
      <input type="hidden" name="date" value="${esc(inc.date)}">
      <div class="btn-row"><button class="btn" type="button" data-action="close">Skip</button><button class="btn gold" type="submit">Deposit tribute</button></div>
    </form>`);
}

/* ---------- Monthly Chronicle ---------- */
function bestRun(dayKeys) {
  let best = 0, run = 0, prev = null;
  for (const d of dayKeys) { if (gs().days[d].clear) { run = prev && daysBetween(parseD(prev), parseD(d)) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; } else { run = 0; prev = null; } }
  return best;
}
function chronicleData(ym) {
  const g = gs(), ml = monthList(ym);
  const wants = ml.filter(e => isWant(e) && !e.treat);
  const byMon = {};
  for (const e of wants) { const m = monsterOf(e.catId); byMon[m.name] = byMon[m.name] || { m, amt: 0, n: 0 }; byMon[m.name].amt += e.amount; byMon[m.name].n++; }
  const nemesis = Object.values(byMon).sort((a, b) => b.amt - a.amt)[0] || null;
  const deposits = ml.filter(e => e.type === 'save' && e.amount > 0);
  const days = Object.keys(g.days).filter(d => d.startsWith(ym)).sort();
  return {
    ym, entries: ml.length, income: sumAmt(ofType(ml, 'income')), saved: sumAmt(ofType(ml, 'save')), lost: sumAmt(wants), met: wants.length, nemesis,
    slain: profile.wants.filter(w => w.decided === 'skipped' && w.decidedAt && ymStr(new Date(w.decidedAt)) === ym),
    debt: sumAmt(ml.filter(e => e.type === 'expense' && e.debtId)),
    bosses: profile.debts.filter(d => g.bosses[d.id] && ymStr(new Date(g.bosses[d.id])) === ym),
    clear: days.filter(d => g.days[d].clear).length, rested: days.length, best: bestRun(days),
    biggest: deposits.sort((a, b) => b.amount - a.amount)[0] || null,
    trophies: TROPHIES.filter(t => g.trophies[t[0]] && ymStr(new Date(g.trophies[t[0]])) === ym),
    events: Object.keys(g.events).filter(k => ymStr(new Date(g.events[k])) === ym).length,
    receipts: ml.reduce((s, e) => s + (e.receipts || []).length, 0),
  };
}
function openChronicle(ym) {
  const c = chronicleData(ym), p = chronicleData(ymShift(ym, -1));
  gs().chronSeen[ym] = true; saveProfile();
  const deeds = [];
  if (c.biggest) deeds.push(`Largest tribute: ${money(c.biggest.amount)} on ${short(c.biggest.date)}.`);
  if (c.best >= 2) deeds.push(`Longest clear streak: ${c.best} days.`);
  for (const d of c.bosses) deeds.push(`Defeated the ${bossName(d)}.`);
  for (const t of c.trophies) deeds.push(`Earned the “${t[1]}” trophy.`);
  if (c.slain.length) deeds.push(`Slew ${c.slain.length} temptation${c.slain.length === 1 ? '' : 's'} worth ${money0(c.slain.reduce((s, w) => s + w.price, 0))}.`);
  if (c.events) deeds.push(`Won ${c.events} holiday event${c.events === 1 ? '' : 's'}.`);
  if (!deeds.length) deeds.push('A quiet month on the road.');
  let verdict;
  if (p.entries && p.lost > 0) {
    const ch = Math.round((c.lost - p.lost) / p.lost * 100);
    verdict = ch <= -10 ? `Wants are down ${-ch}% from last month. That’s real progress. Keep the goblins hungry.` : ch >= 10 ? `Wants are up ${ch}% from last month. The monsters are winning this round. Pick one to starve next month.` : 'Wants held about level with last month. Steady. Now push them down.';
  } else verdict = c.saved > 0 ? `You saved ${money0(c.saved)}. Every legend starts with a first chest.` : 'Next month, try moving something to savings on payday. Even $20.';
  if (c.income > 0) verdict += ` You kept ${Math.max(0, Math.round(c.saved / c.income * 100))}% of what you earned.`;
  const stat = (k, v) => `<div class="cs"><span>${k}</span><b>${v}</b></div>`;
  openSheet(`${ymLabel(ym)} Chronicle`, `<article class="chronicle">
    <div class="chron-head">${sprite('hero')}${petSprite(petStage())}<div><div class="ch-title">THE CHRONICLE OF ${esc(heroName().toUpperCase())}</div><div class="ch-sub">${esc(ymLabel(ym))} · ${raceName()}${heroClass() ? ' ' + CLASSES[heroClass()].name : ''}</div></div></div>
    <div class="chron-grid">
      ${stat('Gold earned', money0(c.income))}${stat('Tribute saved', money0(c.saved))}
      ${stat('Damage to bosses', money0(c.debt))}${stat('Clear days', `${c.clear} of ${c.rested} rests`)}
      ${stat('Monsters met', c.met)}${stat('Gold they stole', money0(c.lost))}
      ${stat('Temptations slain', c.slain.length)}${stat('Receipts kept', c.receipts)}
    </div>
    <h3>DEEDS</h3><ul>${deeds.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
    ${c.nemesis ? `<h3>NEMESIS</h3><div class="nemesis">${sprite(c.nemesis.m.sprite)}<p>The <b>${esc(c.nemesis.m.name)}</b> took ${money0(c.nemesis.amt)} over ${c.nemesis.n} fight${c.nemesis.n === 1 ? '' : 's'}.</p></div>` : ''}
    <p class="verdict">${sprite('arti')} <span><b>Arti:</b> ${esc(verdict)}</span></p>
  </article>`);
}
function chronicleBannerHTML() {
  const t = today(), prev = ymShift(ymStr(t), -1);
  if (t.getDate() > 7 || !monthList(prev).length || gs().chronSeen[prev]) return '';
  return `<div class="callout">${sprite('scroll')}<p><b>Your ${esc(ymLabel(prev, true))} Chronicle is ready.</b> See how the month went.</p><button class="btn sm gold" data-action="open-chron" data-ym="${prev}">Read it</button></div>`;
}
function chroniclesListHTML() {
  const cur = ymStr(today()), months = [];
  for (let i = 0; i < 12; i++) { const ym = ymShift(cur, -i); if (monthList(ym).length) months.push(ym); }
  if (!months.length) return '';
  return `<section><div class="sec-head"><h2>Chronicles</h2></div><div class="chips" style="flex-wrap:wrap">${months.map(ym => `<button class="chip-btn" data-action="open-chron" data-ym="${ym}">${esc(ymLabel(ym, true))} ${ym.slice(0, 4)}${ym === cur ? ' (so far)' : ''}</button>`).join('')}</div></section>`;
}

/* ---------- Features open up over the first week ---------- */
const UNLOCKS = [
  { id: 'quests', label: 'Daily quests, gems and Grubb’s shop', day: 1, alt: () => Object.keys(gs().days).length > 0, npc: 'grubb',
    say: () => `Psst, ${heroName()}! You’ve been earning gems this whole time: one for every $10 you save. Spend them at my shop on potions, Treat Passes and gear. And check the Quest board each morning for three small quests.`, go: ['quests', 'See today’s quests'] },
  { id: 'pet', label: 'A companion', day: 2, alt: () => cushion() > 0, npc: 'wren',
    say: () => 'I found something in Emberwood. An egg, still warm. It feeds on your safety fund. Put $100 in your Emergency fund and it will hatch.', go: ['home', 'Meet it'] },
  { id: 'events', label: 'Holiday events', day: 3, alt: () => gameStats().level >= 3, npc: 'pip',
    say: () => { const nx = holidayList(today().getFullYear()).concat(holidayList(today().getFullYear() + 1)).find(ev => toStr(today()) <= ev.to); return `Holidays bring out the worst monsters in the Ledgerlands. Each one has a boss you beat by holding the line.${nx ? ` Next up: the ${nx.boss}, ${rangeLabel(nx.from, nx.to)}.` : ''}`; }, go: ['quests', 'See the event'] },
  { id: 'weekly', label: 'Weekly challenges', day: 4, alt: () => gameStats().level >= 3, npc: 'vell',
    say: () => `Every Monday I post three challenges on the Quest board, ${heroName()}. Don’t like one? You may reroll a single challenge each week. Beat them for gems and a weekly chest.`, go: ['quests', 'See the challenges'] },
];
const unlocked = id => !!gs().unlocked[id];
function dayNumber() { const c = new Date(profile.createdAt || Date.now()); c.setHours(0, 0, 0, 0); return daysBetween(c, today()); }
function nextUnlock() { return UNLOCKS.find(u => !unlocked(u.id)); }
function checkUnlocks() {
  const g = gs();
  if (!profile.setupDone) return;
  for (const u of UNLOCKS) {
    if (g.unlocked[u.id] || !(dayNumber() >= u.day || u.alt())) continue;
    g.unlocked[u.id] = Date.now();
    if (u.id === 'pet') { const st = petStage(); g.bonusGems += 20 * st; g.pet.best = st; }
    queueCeleb({ kind: 'custom', sfx: 'chest', html: `<div class="celebrate"><div class="big pop">NEW!</div><p style="color:var(--gold)">${esc(u.label)}</p></div><div class="dlg"><div class="portrait">${sprite(u.npc)}</div><div><div class="who">${esc(NPCS[u.npc].name.toUpperCase())}</div><p class="say">${esc(u.say())}</p></div></div>${u.go[0] !== 'home' ? `<button class="btn gold block" data-action="tab" data-tab="${u.go[0]}">${esc(u.go[1])}</button>` : ''}` });
    saveProfile();
  }
}

/* ---------- The Quest board tab ---------- */
function questBadge() {
  if (!profile.setupDone) return 0;
  const g = gs(), d = toStr(today());
  let n = 0;
  if (!g.days[d] && new Date().getHours() >= 17) n++;
  if (unlocked('quests')) n += questsFor(d).filter(id => QUESTS[id].done(d) && !(g.claimed[d] || []).includes(id)).length;
  if (unlocked('weekly')) {
    const mon = mondayOf(today()), st = gs().wk[toStr(mon)];
    if (st) n += st.ids.filter(id => CHALLENGES[id] && !st.claimed.includes(id) && challengeStatus(id, weekData(mon)).done).length;
    const c = lastWeekChest(); if (c && c.ok && !c.claimed) n++;
  }
  if (unlocked('events')) n += activeEvents().filter(ev => { const s = eventStatus(ev); return s.ok && !s.claimed; }).length;
  return n;
}
function viewQuests() {
  const nx = nextUnlock();
  const soon = UNLOCKS.filter(u => !unlocked(u.id));
  return `
    ${unlocked('events') ? eventsHTML() : ''}
    <section><div class="sec-head"><h2>Tonight</h2></div>${innHTML()}</section>
    ${unlocked('quests') ? dailyQuestsHTML() : ''}
    ${unlocked('weekly') ? weeklyHTML() + chestHTML() : ''}
    ${soon.length ? `<section><div class="sec-head"><h2>Coming soon</h2></div><div class="list">${soon.map(u => { const d = Math.max(1, u.day - dayNumber()); return `<div class="quest">${sprite('skull')}<div><div class="qt">${esc(u.label)}</div><div class="qr">Opens in ${d} day${d === 1 ? '' : 's'}, or sooner as you play</div></div><span class="pill">Locked</span></div>`; }).join('')}</div></section>` : ''}
    ${!nx ? '' : `<p class="small muted">The Ledgerlands open up a little more each day. For now: log what you spend, watch your safe-to-spend number, and rest at the inn each night.</p>`}`;
}
function questNudgeHTML() {
  const n = questBadge();
  return n ? `<div class="callout">${sprite('scroll')}<p><b>${n} thing${n === 1 ? '' : 's'} waiting on the Quest board.</b></p><button class="btn sm gold" data-action="tab" data-tab="quests">Go</button></div>` : '';
}

/* ---------- After every render: unlocks and pet evolution ---------- */
function questsAfterRender() {
  checkUnlocks();
  const tab = document.querySelector('.tab[data-tab="quests"]');
  if (tab) { const n = questBadge(); if (n) tab.dataset.badge = n; else delete tab.dataset.badge; }
  if (!unlocked('pet')) return;
  const g = gs(), i = petStage(), best = g.pet.best || 0;
  if (i > best) {
    for (let s = best + 1; s <= i; s++) {
      g.bonusGems += 20;
      queueCeleb({ kind: 'custom', sfx: 'level', html: `<div class="celebrate"><div class="big pop">${s === 1 ? 'IT HATCHED!' : 'EVOLUTION!'}</div>${petSprite(s, 'pop')}<p>${esc(petName())} became a <b style="color:var(--gold)">${esc(PET_STAGES[s].name)}</b>.</p><p class="small muted">Your safety fund reached ${money0(PET_STAGES[s].at)}. +20 gems.</p></div>` });
    }
    g.pet.best = i; saveProfile();
  }
}

/* ---------- Actions ---------- */
Object.assign(gameActions, {
  'claim-event': el => {
    const g = gs(), y = today().getFullYear();
    const ev = [...holidayList(y - 1), ...holidayList(y)].find(x => x.key === el.dataset.key);
    if (!ev || g.events[ev.key] || !eventStatus(ev).ok) return;
    const before = gameStats();
    g.events[ev.key] = Date.now(); g.bonusGems += ev.gems; g.bonusXP += ev.xp;
    if (ev.item && !g.owned[ev.item[0]].includes(ev.item[1])) g.owned[ev.item[0]].push(ev.item[1]);
    saveProfile();
    queueCeleb({ kind: 'custom', sfx: 'level', html: `<div class="celebrate"><div class="big pop">VICTORY!</div>${sprite(ev.sprite, 'pop', ev.pal ? { pal: ev.pal } : null)}<p>The <b>${esc(ev.boss)}</b> is defeated.</p><p class="small muted">+${ev.gems} gems · +${ev.xp} XP${ev.item ? ` · New: ${esc(itemName(ev.item))}. Wear it from the shop.` : ''}</p></div>` });
    render(); popGain(before, gameStats());
  },
  'claim-ch': el => {
    const g = gs(), st = g.wk[el.dataset.week], id = el.dataset.id, c = CHALLENGES[id];
    if (!st || !c || st.claimed.includes(id) || !challengeStatus(id, weekData(parseD(el.dataset.week))).done) return;
    const before = gameStats();
    st.claimed.push(id); g.bonusGems += c.gems; g.bonusXP += c.xp;
    saveProfile(); sfx('chest'); render(); popGain(before, gameStats());
  },
  reroll: el => {
    const mon = mondayOf(today()), st = weekState(mon, true), i = Number(el.dataset.i);
    if (st.rerolled) return;
    const options = challengePool().filter(k => !st.ids.includes(k));
    if (!options.length) return;
    st.ids[i] = options[Math.floor(Math.random() * options.length)]; st.rerolled = true;
    saveProfile(); sfx('blip'); render(); toast(`New challenge: ${CHALLENGES[st.ids[i]].name}`);
  },
  'pet-name': () => openSheet('Name your companion', `<form data-form="pet"><label class="field"><span>Name</span><input name="name" value="${esc(petName())}" maxlength="14" autofocus></label><button class="btn primary block" type="submit">Save</button></form>`),
  'open-chron': el => openChronicle(el.dataset.ym),
});
Object.assign(gameForms, {
  pet(f, fd) { gs().pet.name = String(fd.get('name') || '').trim().slice(0, 14) || 'Ember'; saveProfile(); closeSheet(); render(); },
});
