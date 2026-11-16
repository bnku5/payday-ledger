'use strict';

/* ---------- Helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const fmt0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 });
const money = n => fmt2.format(Math.round((n || 0) * 100) / 100 + 0);
const money0 = n => fmt0.format(Math.round(n || 0) + 0);
const r2 = n => Math.round(n * 100) / 100;
const clamp01 = n => Math.max(0, Math.min(1, n || 0));
const parseAmt = v => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isFinite(n) ? r2(n) : NaN; };
const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = o => JSON.parse(JSON.stringify(o));
const pad = n => String(n).padStart(2, '0');
const toStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMonths = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth() + n, 1); x.setDate(Math.min(d.getDate(), dim(x.getFullYear(), x.getMonth()))); return x; };
const daysBetween = (a, b) => Math.round((b - a) / 864e5);
const dim = (y, m) => new Date(y, m + 1, 0).getDate();
const ymStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const ymShift = (ym, n) => { const [y, m] = ym.split('-').map(Number); return ymStr(new Date(y, m - 1 + n, 1)); };
const ymLabel = (ym, short) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-US', short ? { month: 'short' } : { month: 'long', year: 'numeric' }); };
const dLabel = (d, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => (typeof d === 'string' ? parseD(d) : d).toLocaleDateString('en-US', opts);
const short = d => dLabel(d, { month: 'short', day: 'numeric' });
const ordinal = n => { n = Number(n); const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

/* ---------- Reference data ---------- */
const CATS = [
  { id: 'housing', name: 'Rent & housing', group: 'needs', w: 0 },
  { id: 'groceries', name: 'Groceries', group: 'needs', w: .10 },
  { id: 'transport', name: 'Gas & transport', group: 'needs', w: .07 },
  { id: 'utilities', name: 'Utilities', group: 'needs', w: .03 },
  { id: 'phone', name: 'Phone & internet', group: 'needs', w: .03 },
  { id: 'insurance', name: 'Insurance', group: 'needs', w: .04 },
  { id: 'health', name: 'Health & gym', group: 'needs', w: .03 },
  { id: 'school', name: 'School & books', group: 'needs', w: .02 },
  { id: 'debt', name: 'Debt payments', group: 'needs', w: .05 },
  { id: 'dining', name: 'Eating out', group: 'wants', w: .05 },
  { id: 'delivery', name: 'Delivery apps', group: 'wants', w: .03 },
  { id: 'subs', name: 'Subscriptions', group: 'wants', w: .02 },
  { id: 'fun', name: 'Entertainment', group: 'wants', w: .04 },
  { id: 'shopping', name: 'Shopping', group: 'wants', w: .05 },
  { id: 'personal', name: 'Personal care', group: 'wants', w: .02 },
  { id: 'gifts', name: 'Gifts', group: 'wants', w: .01 },
  { id: 'other', name: 'Other', group: 'wants', w: .02 },
];
const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));
const catOf = id => CAT[id] || CAT.other;
const nwOf = e => (e.nw === 'needs' || e.nw === 'wants') ? e.nw : catOf(e.catId).group;
const FREQ = {
  weekly: { label: 'Every week', perYear: 52 },
  biweekly: { label: 'Every 2 weeks', perYear: 26 },
  semimonthly: { label: 'Twice a month (1st & 15th)', perYear: 24 },
  monthly: { label: 'Once a month', perYear: 12 },
};
const SPLITS = {
  starter: { label: 'Getting started: 60 / 30 / 10', needs: 60, wants: 30, save: 10 },
  balanced: { label: 'Balanced: 50 / 30 / 20', needs: 50, wants: 30, save: 20 },
  aggressive: { label: 'Fast saver: 50 / 20 / 30', needs: 50, wants: 20, save: 30 },
};
const DEBT_TYPES = { card: 'Credit card', collection: 'Collections account', loan: 'Loan', bnpl: 'Buy now, pay later', other: 'Other' };
const COLL_STATUS = { new: 'Haven’t dealt with it yet', validating: 'Asked them to validate', negotiating: 'Negotiating', plan: 'On a payment plan', settled: 'Settled in writing' };
const INCOME_KINDS = { paycheck: 'Paycheck', scholarship: 'Scholarship / aid', other: 'Other income' };
const STARTER_FUND = 1000;
const HIGH_APR = 8;
const COOL_OFF_H = 48;

/* 2026 tax figures. Federal: IRS Rev. Proc. 2025-32. Minnesota: MN Dept. of Revenue 2026 brackets. */
const TAX = {
  fedStd: 16100,
  fed: [[12400, .10], [50400, .12], [105700, .22], [201775, .24], [256225, .32], [640600, .35], [Infinity, .37]],
  ss: .062, ssBase: 184500, medicare: .0145,
  mnStd: 15300,
  mn: [[33310, .0535], [109430, .068], [203150, .0785], [Infinity, .0985]],
  mnLeave: .0044,
};

function defaultProfile() {
  return {
    v: 2, setupDone: false, payFrequency: 'biweekly', anchorPayday: toStr(today()), typicalPay: 0,
    pay: { type: 'hourly', rate: 0, hours: 0, state: 'MN', stateRate: 0, pretax: 0, calib: null, mode: 'actual' },
    split: { needs: 50, wants: 30, save: 20 }, budgets: {}, bills: [], goals: [], debts: [], wants: [], rules: {}, freed: [],
    debtMethod: 'avalanche', debtExtra: 0, investing: false, matchDate: '', lastBackup: 0, pinHash: '', artiSeen: {}, createdAt: Date.now(),
  };
}
function normalize(p) {
  const out = Object.assign(defaultProfile(), p || {});
  out.split = Object.assign({ needs: 50, wants: 30, save: 20 }, out.split || {});
  out.pay = Object.assign(defaultProfile().pay, out.pay || {});
  if (!p || !p.pay) { out.pay.type = out.typicalPay ? 'salary' : 'hourly'; }
  for (const k of ['bills', 'goals', 'debts', 'wants', 'freed']) if (!Array.isArray(out[k])) out[k] = [];
  for (const k of ['budgets', 'rules', 'artiSeen']) if (!out[k] || typeof out[k] !== 'object') out[k] = {};
  for (const k of Object.keys(out.rules)) if (!out.rules[k] || typeof out.rules[k] !== 'object') delete out.rules[k];
  delete out.importSkipped;
  if (!FREQ[out.payFrequency]) out.payFrequency = 'biweekly';
  out.bills.forEach(b => { if (!b.freq) b.freq = 'monthly'; });
  out.debts.forEach(d => { if (!d.type) d.type = Number(d.apr) > 0 ? 'card' : 'other'; });
  return out;
}

/* ---------- State + storage (this device only) ---------- */
const LS_KEY = 'paydayLedger.standalone.v2';
let profile, entries;
const ui = { tab: 'home', month: ymStr(today()), filter: 'all', search: '', chartSel: null, projector: 50 };
let lastCat = 'groceries';

/* Saved in the phone's database, with a mirror copy in browser storage. Whichever is newer wins on load. */
async function load() {
  let mirror = null, main = null;
  try { mirror = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (_) { mirror = null; }
  try { const s = await RDB.getState(); main = s ? JSON.parse(s) : null; } catch (_) { main = null; }
  const saved = [main, mirror].filter(Boolean).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))[0] || null;
  profile = normalize(saved && saved.profile);
  entries = new Map(((saved && saved.entries) || []).map(e => [e.id, e]));
  // Paid one-time bills drop off the list a month after their due date; the payment stays in your history
  profile.bills = profile.bills.filter(b => !(isOnce(b) && parseD(b.due) < addDays(today(), -30) && billPayment(billKey(b, parseD(b.due)))));
}
let BACKUP = null;
/* Average of your last 3 real paychecks; it becomes your "usual paycheck" when you plan with real amounts. */
function realPayAvg(excludeId) {
  const checks = all().filter(e => e.type === 'income' && (e.kind || 'paycheck') === 'paycheck' && e.amount >= 50 && e.id !== excludeId)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.created || 0) - (a.created || 0)).slice(0, 3);
  return checks.length ? r2(checks.reduce((s, e) => s + e.amount, 0) / checks.length) : 0;
}
let backupTimer = null;
function persist() {
  BACKUP = null;
  if (profile.pay.mode === 'actual' && entries) { const avg = realPayAvg(); if (avg) profile.typicalPay = avg; }
  const json = JSON.stringify({ profile, entries: [...entries.values()], savedAt: Date.now() });
  let mirrored = true;
  try { localStorage.setItem(LS_KEY, json); } catch (_) { mirrored = false; }
  RDB.putState(json).catch(() => { if (!mirrored) toast('Couldn’t save. Your phone may be out of storage.'); });
  clearTimeout(backupTimer); backupTimer = setTimeout(prepareBackup, 1500);
}
const saveProfile = () => persist();
function putEntry(e) {
  const isNew = !entries.has(e.id);
  const before = isNew ? gameStats() : null;
  const clean = Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  entries.set(e.id, clean); persist();
  if (isNew) gameOnNewEntry(clean, before);
}
function deleteEntry(id) { const e = entries.get(id); if (e) deleteReceipts(e.receipts); entries.delete(id); persist(); }

/* ---------- Pay & tax math ---------- */
const ppy = () => FREQ[profile.payFrequency].perYear;
function bracketTax(income, brackets) { let tax = 0, prev = 0; for (const [top, rate] of brackets) { if (income > prev) tax += (Math.min(income, top) - prev) * rate; prev = top; } return tax; }
function estimateCheck(gross, pay = profile.pay, perYear = ppy()) {
  const pretax = Math.min(gross, Number(pay.pretax) || 0);
  const taxable = Math.max(0, gross - pretax);
  const annual = taxable * perYear;
  const fed = bracketTax(Math.max(0, annual - TAX.fedStd), TAX.fed) / perYear;
  const ss = Math.min(taxable, TAX.ssBase / perYear) * TAX.ss;
  const med = taxable * TAX.medicare;
  let state = 0, leave = 0;
  if (pay.state === 'MN') { state = bracketTax(Math.max(0, annual - TAX.mnStd), TAX.mn) / perYear; leave = gross * TAX.mnLeave; }
  else state = taxable * (Number(pay.stateRate) || 0) / 100;
  const raw = gross - pretax - fed - ss - med - state - leave;
  const ratio = pay.calib && pay.calib.ratio ? pay.calib.ratio : 1;
  return { gross, pretax, fed, ss, med, state, leave, raw, net: raw * ratio, ratio };
}
const hoursPerCheck = () => (Number(profile.pay.hours) || 0) * 52 / ppy();
function grossFor(hours, ot = 0) { const rate = Number(profile.pay.rate) || 0; return rate * hours + rate * 1.5 * ot; }
function computeTypicalPay() {
  if (profile.pay.type !== 'hourly') return profile.typicalPay;
  return r2(estimateCheck(grossFor(hoursPerCheck())).net);
}
function netHourly() {
  if (profile.pay.type === 'hourly' && profile.pay.rate > 0) { const h = Math.max(1, hoursPerCheck() || 40 * 52 / ppy()); return estimateCheck(grossFor(h)).net / h; }
  const h = 40 * 52 / ppy();
  return (profile.typicalPay || 0) / h;
}
function workHours(amount) {
  const nh = netHourly();
  if (!(nh > 0) || !(amount > 0)) return '';
  const h = amount / nh;
  return h < 1 ? `${Math.max(1, Math.round(h * 60))} min of work` : `${h < 10 ? h.toFixed(1) : Math.round(h)} hours of work`;
}

/* ---------- Money math ---------- */
const all = () => [...entries.values()];
const sumAmt = list => r2(list.reduce((s, e) => s + (Number(e.amount) || 0), 0));
const ofType = (list, t) => list.filter(e => e.type === t);
const between = (a, b) => all().filter(e => e.date >= a && e.date <= b);
const monthList = ym => all().filter(e => e.date && e.date.startsWith(ym));

function payPeriod(ref = today()) {
  const f = profile.payFrequency, anchor = parseD(profile.anchorPayday);
  let start, next;
  if (f === 'weekly' || f === 'biweekly') {
    const len = f === 'weekly' ? 7 : 14;
    const k = Math.floor(daysBetween(anchor, ref) / len);
    start = addDays(anchor, k * len); next = addDays(start, len);
  } else if (f === 'semimonthly') {
    const y = ref.getFullYear(), m = ref.getMonth();
    if (ref.getDate() >= 15) { start = new Date(y, m, 15); next = new Date(y, m + 1, 1); }
    else { start = new Date(y, m, 1); next = new Date(y, m, 15); }
  } else {
    const day = anchor.getDate();
    const mk = (y, m) => new Date(y, m, Math.min(day, dim(y, m)));
    start = mk(ref.getFullYear(), ref.getMonth());
    if (start > ref) start = mk(ref.getFullYear(), ref.getMonth() - 1);
    next = mk(start.getFullYear(), start.getMonth() + 1);
  }
  return { start, next, end: addDays(next, -1) };
}

const isSpread = e => e.type === 'income' && e.kind === 'scholarship' && Number(e.spreadMonths) > 1;
function spreadShare(e, from, to) {
  const s = parseD(e.date), end = addDays(addMonths(s, Number(e.spreadMonths)), -1);
  const total = daysBetween(s, end) + 1;
  const a = from > s ? from : s, b = to < end ? to : end;
  const overlap = daysBetween(a, b) + 1;
  return overlap > 0 ? e.amount * overlap / total : 0;
}

const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
function pastMonths(fn) { const cur = ymStr(today()); return [1, 2, 3].map(n => fn(monthList(ymShift(cur, -n)))).filter(v => v > 0); }
function monthlyIncome() { const p = pastMonths(l => sumAmt(ofType(l, 'income'))); return p.length ? avg(p) : (profile.typicalPay || 0) * ppy() / 12; }
function monthlyEssentials() {
  const budgeted = CATS.filter(c => c.group === 'needs').reduce((s, c) => s + (Number(profile.budgets[c.id]) || 0), 0);
  if (budgeted > 0) return budgeted;
  const p = pastMonths(l => sumAmt(ofType(l, 'expense').filter(e => nwOf(e) === 'needs')));
  return p.length ? avg(p) : monthlyIncome() * .5;
}
function monthlyOutflow() {
  const budgeted = Object.values(profile.budgets).reduce((s, v) => s + (Number(v) || 0), 0);
  const p = pastMonths(l => sumAmt(ofType(l, 'expense')));
  return Math.max(budgeted, p.length ? avg(p) : 0) || monthlyIncome() * .8;
}

/* Bills: monthly on a day, or every two weeks from a start date */
const isOnce = b => b.freq === 'once';
const billMonthly = b => isOnce(b) ? 0 : (Number(b.amount) || 0) * (b.freq === 'biweekly' ? 26 / 12 : 1);
const billsMonthly = () => profile.bills.reduce((s, b) => s + billMonthly(b), 0);
const billKey = (b, d) => b.id + ':' + (b.freq === 'monthly' || !b.freq ? ymStr(d) : toStr(d));
/* Pay periods from the one containing a to the one containing b, counting both. */
function periodsSpan(a, b) { let n = 1, p = payPeriod(a); while (p.end < b && n < 120) { p = payPeriod(p.next); n++; } return n; }
/* One-time bills are saved up for evenly across the paychecks between when you added them and when they're due. */
function onceShare() {
  const pp = payPeriod();
  return profile.bills.filter(b => isOnce(b) && !billPayment(billKey(b, parseD(b.due)))).reduce((s, b) => {
    const due = parseD(b.due), amt = Number(b.amount) || 0;
    return s + (due < pp.start ? amt : amt / periodsSpan(new Date(b.created || Date.now()), due));
  }, 0);
}
const billShare = () => r2(billsMonthly() * 12 / ppy() + onceShare());
const billPayment = key => all().find(e => e.billKey === key);
function billDates(b, from, to) {
  const out = [];
  if (isOnce(b)) { const d = parseD(b.due); if (d >= from && d <= to) out.push(d); return out; }
  if (b.freq === 'biweekly') {
    const a = parseD(b.anchor || toStr(today()));
    let d = addDays(a, Math.ceil(daysBetween(a, from) / 14) * 14);
    while (d <= to) { out.push(d); d = addDays(d, 14); }
  } else {
    let y = from.getFullYear(), m = from.getMonth();
    while (new Date(y, m, 1) <= to) {
      const d = new Date(y, m, Math.min(Number(b.dueDay) || 1, dim(y, m)));
      if (d >= from && d <= to) out.push(d);
      m++; if (m > 11) { m = 0; y++; }
    }
  }
  return out;
}
function billsBetween(from, to) {
  const out = [];
  for (const b of profile.bills) for (const d of billDates(b, from, to)) { const key = billKey(b, d); out.push({ bill: b, date: d, key, paid: !!billPayment(key) }); }
  // One-time bills that are past due and still unpaid stay on the list until paid
  for (const b of profile.bills.filter(isOnce)) { const d = parseD(b.due), key = billKey(b, d); if (d < from && to >= today() && !billPayment(key)) out.push({ bill: b, date: d, key, paid: false }); }
  return out.sort((a, b) => a.date - b.date);
}

function goalSaved(g) { return r2((Number(g.initial) || 0) + sumAmt(all().filter(e => e.type === 'save' && e.goalId === g.id))); }
const goalKind = k => profile.goals.find(g => g.kind === k);
function debtBalance(d) {
  const paid = sumAmt(all().filter(e => e.type === 'expense' && e.debtId === d.id && (e.created || 0) > (d.asOfTs || 0)));
  return Math.max(0, r2((Number(d.balance) || 0) - paid));
}
const isCardDebt = d => d.type !== 'collection' && (d.type === 'card' || Number(d.apr) >= HIGH_APR);
const collectionDone = d => debtBalance(d) <= .005;

function periodSummary() {
  const pp = payPeriod();
  const sb = profile.startBalance;
  if (sb && sb.date >= toStr(pp.start) && sb.date <= toStr(pp.end)) return startPeriodSummary(pp, sb);
  const list = between(toStr(pp.start), toStr(pp.end));
  const direct = sumAmt(ofType(list, 'income').filter(e => !isSpread(e)));
  const spread = r2(all().filter(isSpread).reduce((s, e) => s + spreadShare(e, pp.start, pp.end), 0));
  const paycheckIn = sumAmt(ofType(list, 'income').filter(e => (e.kind || 'paycheck') === 'paycheck'));
  const expected = paycheckIn === 0;
  const waiting = expected && profile.pay.mode === 'actual';
  const planned = expected && !waiting ? (profile.typicalPay || 0) : 0;
  const base = r2(planned + direct + spread);
  const spent = sumAmt(ofType(list, 'expense').filter(e => !e.billKey));
  const saved = sumAmt(ofType(list, 'save'));
  const plannedSave = r2((planned + direct) * profile.split.save / 100);
  const saveLeft = Math.max(0, r2(plannedSave - Math.max(saved, 0)));
  const billsLeft = billShare();
  const safe = r2(base - spent - saved - saveLeft - billsLeft);
  const daysLeft = Math.max(1, daysBetween(today(), pp.next));
  return { pp, expected, waiting, base, spread, spent, saved, saveLeft, billsLeft, safe, daysLeft, perDay: safe / daysLeft, list };
}

/* The first pay period counts down from the bank balance you started with.
   Only what you log after setting it counts, and bills still due before payday come out of it. */
function startPeriodSummary(pp, sb) {
  const to = toStr(pp.end);
  const after = all().filter(e => e.date >= sb.date && e.date <= to && (e.created || 0) >= (sb.at || 0));
  const spread = r2(after.filter(isSpread).reduce((s, e) => s + spreadShare(e, parseD(sb.date), pp.end), 0));
  const income = sumAmt(ofType(after, 'income').filter(e => !isSpread(e)));
  const base = r2(Number(sb.amount) + income + spread);
  const spent = sumAmt(ofType(after, 'expense'));
  const saved = sumAmt(ofType(after, 'save'));
  const billsLeft = r2(billsBetween(today() > parseD(sb.date) ? today() : parseD(sb.date), pp.end).filter(b => !b.paid).reduce((s, b) => s + Number(b.bill.amount || 0), 0));
  const plannedSave = r2((Number(sb.amount) + income) * profile.split.save / 100);
  const saveLeft = Math.max(0, r2(plannedSave - Math.max(saved, 0)));
  const safe = r2(base - spent - saved - saveLeft - billsLeft);
  const daysLeft = Math.max(1, daysBetween(today(), pp.next));
  return { pp, start: sb, expected: false, base, spread, spent, saved, saveLeft, billsLeft, safe, daysLeft, perDay: safe / daysLeft, list: after };
}

/* Splits a starting balance the same way as a paycheck: bills due before payday, your savings share, the rest to spend. */
function openStartSplit() {
  const sb = profile.startBalance; if (!sb) return;
  const pp = payPeriod(), bills = billsBetween(parseD(sb.date), pp.end).filter(b => !b.paid);
  const billAmt = r2(bills.reduce((s, b) => s + Number(b.bill.amount || 0), 0));
  const save = r2(sb.amount * profile.split.save / 100);
  const rest = r2(sb.amount - billAmt - save);
  const days = Math.max(1, daysBetween(today(), pp.next));
  const tight = rest < 0 || rest / days < 10;
  const msg = sb.amount - billAmt < 0 ? 'Your bills before payday are more than what’s in the account. Skip savings this time and cover the bills first.'
    : tight ? `That leaves about ${money0(Math.max(0, rest) / days)} a day. If that’s too tight, lower the tribute below. Something is better than nothing.`
    : 'Leftovers count too. Pay yourself first, then the rest is yours to spend.';
  openSheet('Starting gold', `
    <div class="celebrate"><div class="big pop">STARTING GOLD</div>${sprite('chestOpen', 'pop')}<p>You set out with <b class="num" style="color:var(--gold);font-size:28px">${money(sb.amount)}</b></p><p class="small muted">to last until ${dLabel(pp.next)}</p></div>
    <div class="card ledger">
      <div class="row"><span class="key"><i class="dot" style="background:var(--warn)"></i>Bills due before payday (${bills.length})</span><span class="num">−${money(billAmt)}</span></div>
      <div class="row"><span class="key"><i class="dot" style="background:var(--accent)"></i>Tribute to savings (${profile.split.save}%)</span><span class="num">−${money(save)}</span></div>
      <div class="row total"><span>Free to spend</span><span class="num">${money(rest)}</span></div>
    </div>
    ${artiCard({ msg }, true)}
    <form data-form="split">
      <div class="fields-2">
        <label class="field"><span>Tribute</span><input id="sp-amt" name="amount" inputmode="decimal" value="${(sb.amount - billAmt < 0 ? 0 : save).toFixed(2)}"></label>
        <label class="field"><span>Into</span><select id="sp-goal" name="goal">${goalOptions(defaultGoalId())}</select></label>
      </div>
      <input type="hidden" name="date" value="${esc(toStr(today()))}">
      <div class="btn-row"><button class="btn" type="button" data-action="close">Skip</button><button class="btn gold" type="submit">Deposit tribute</button></div>
    </form>`);
}

function planSteps() {
  const ef = goalKind('emergency'), buf = goalKind('buffer');
  const efSaved = ef ? goalSaved(ef) : 0, bufSaved = buf ? goalSaved(buf) : 0;
  const incomeN = all().filter(e => e.type === 'income').length;
  const expN = all().filter(e => e.type === 'expense').length;
  const cards = profile.debts.filter(isCardDebt);
  const cardLeft = cards.reduce((s, d) => s + debtBalance(d), 0), cardStart = cards.reduce((s, d) => s + (Number(d.balance) || 0), 0);
  const colls = profile.debts.filter(d => d.type === 'collection');
  const collOpen = colls.filter(d => !collectionDone(d));
  const oneMonth = Math.max(500, Math.round(monthlyOutflow() / 50) * 50);
  const three = Math.max(STARTER_FUND, Math.round(monthlyEssentials() * 3 / 50) * 50);
  const matchFuture = profile.matchDate && parseD(profile.matchDate) > today();
  const steps = [
    { title: 'Track every dollar', done: incomeN > 0 && expN >= 10, progress: (incomeN > 0 ? .3 : 0) + Math.min(expN, 10) / 10 * .7,
      text: incomeN > 0 && expN >= 10 ? 'You know where your money goes.' : `Log a paycheck and 10 purchases. ${expN} of 10 so far.` },
    { title: 'Save a $1,000 starter cushion', done: efSaved >= STARTER_FUND, progress: efSaved / STARTER_FUND, goal: ef && ef.id,
      text: `${money0(efSaved)} of ${money0(STARTER_FUND)}. This is what keeps a flat tire off the credit card.` },
    { title: 'Pay off the credit cards', done: cardLeft <= .005, progress: cardStart > 0 ? 1 - cardLeft / cardStart : 1,
      text: cardLeft > .005 ? `${money0(cardLeft)} left. Card interest is the most expensive thing in your budget. Minimums on everything, every extra dollar to the highest rate.` : cards.length ? 'Cards are paid off. Keep them at $0 every month.' : 'Add your credit cards on the Budget tab so they’re in the plan.' },
    { title: 'Deal with collections', done: colls.length > 0 && collOpen.length === 0, progress: colls.length ? 1 - collOpen.length / colls.length : 0,
      text: colls.length ? (collOpen.length ? `${collOpen.length} open. Validate first, negotiate, get any deal in writing before you pay.` : 'All handled. Watch your credit report to make sure they show as paid.') : 'If you have any, add them on the Budget tab (type: Collections). If not, tap “None”.', noColl: !colls.length },
    { title: 'Get one month ahead', done: bufSaved >= oneMonth, progress: bufSaved / oneMonth, goal: buf && buf.id, target: oneMonth,
      text: `${money0(bufSaved)} of ${money0(oneMonth)}. When this is full, this month’s bills get paid with last month’s money. That’s the end of paycheck to paycheck.` },
    { title: 'Three months covered', done: efSaved >= three, progress: efSaved / three, target: three, goal: ef && ef.id,
      text: `Grow the emergency fund to ${money0(three)}: three months of needs. A lost job or cut hours stops being a crisis.` },
    { title: 'Invest for retirement', done: !!profile.investing, progress: profile.investing ? 1 : 0, toggle: true,
      text: profile.investing ? 'You’re investing. Keep it automatic and don’t touch it.' : matchFuture ? `Your 401(k) match unlocks ${dLabel(profile.matchDate, { month: 'long', year: 'numeric' })}. Sign up that week and put in at least enough to get the full match.` : 'Put at least enough in your 401(k) to get the full match. Aim for 15% of pay over time. A Roth IRA works if there’s no match yet.' },
  ];
  if (profile.noCollections) { steps[3].done = true; steps[3].progress = 1; steps[3].text = 'No collections accounts. Nice.'; }
  const current = steps.findIndex(s => !s.done);
  return { steps, current: current === -1 ? steps.length : current };
}
function defaultGoalId() {
  const { steps, current } = planSteps();
  const s = steps[current];
  if (s && s.goal) return s.goal;
  const open = profile.goals.find(g => goalSaved(g) < g.target);
  return (open || profile.goals[0] || {}).id || '';
}

function simulatePayoff(method, extra) {
  const ds = profile.debts.map(d => ({ id: d.id, bal: debtBalance(d), apr: Number(d.apr) || 0, min: Number(d.minPayment) || 0 })).filter(d => d.bal > .005);
  if (!ds.length) return { months: 0, interest: 0, order: [], payoff: {} };
  const order = [...ds].sort(method === 'snowball' ? (a, b) => a.bal - b.bal : (a, b) => b.apr - a.apr || a.bal - b.bal);
  const budget = ds.reduce((s, d) => s + d.min, 0) + (Number(extra) || 0);
  let month = 0, interest = 0; const payoff = {};
  while (ds.some(d => d.bal > .005) && month < 600) {
    month++;
    for (const d of ds) if (d.bal > .005) { const i = d.bal * d.apr / 1200; d.bal += i; interest += i; }
    let avail = budget;
    for (const d of ds) if (d.bal > .005) { const p = Math.min(d.min, d.bal, avail); d.bal -= p; avail -= p; }
    for (const d of order) { if (avail <= 0) break; if (d.bal > .005) { const p = Math.min(avail, d.bal); d.bal -= p; avail -= p; } }
    for (const d of ds) if (d.bal <= .005 && !payoff[d.id]) payoff[d.id] = month;
  }
  return { months: month >= 600 ? null : month, interest, order, payoff };
}
const payoffDate = months => { const t = today(); return new Date(t.getFullYear(), t.getMonth() + months, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); };

/* ---------- Arti ---------- */
function artiSays() {
  const t = today();
  const s = periodSummary();
  const ym = ymStr(t), ml = monthList(ym);
  const foodOut = sumAmt(ofType(ml, 'expense').filter(e => e.catId === 'dining' || e.catId === 'delivery'));
  const foodBudget = (Number(profile.budgets.dining) || 0) + (Number(profile.budgets.delivery) || 0);
  const ready = profile.wants.filter(w => !w.decided && Date.now() - w.added >= COOL_OFF_H * 36e5);
  const subs = profile.bills.filter(b => b.catId === 'subs' && !isOnce(b));
  const subsYear = subs.reduce((a, b) => a + billMonthly(b), 0) * 12;
  const cards = profile.debts.filter(d => isCardDebt(d) && debtBalance(d) > .005).sort((a, b) => b.apr - a.apr);
  const nextDay = dLabel(s.pp.next, { weekday: 'long' });
  const sinceStart = daysBetween(s.pp.start, t);
  const cushion = profile.goals.filter(g => g.kind === 'emergency' || g.kind === 'buffer').reduce((a, g) => a + goalSaved(g), 0);
  const daily = monthlyOutflow() / 30.4;
  const loggedToday = all().some(e => e.date === toStr(t));

  if (!all().length) return { msg: 'I’m Arti. I’ll tell you what your money is actually doing, not what you hope it’s doing. Start by logging your last paycheck.', act: ['add', 'income', 'Log paycheck'] };
  if (s.safe < 0) return { msg: `You’re ${money0(-s.safe)} over for this pay period. No more wants until ${nextDay}. No delivery. You can do ${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'}.`, tone: 'bad' };
  const pendingN = all().filter(e => e.type === 'expense' && e.conf === 'unsure' && e.judgedBy !== 'you').length;
  if (pendingN) return { msg: `I couldn’t tell if ${pendingN === 1 ? 'one purchase was' : pendingN + ' purchases were'} a need or a want. You make the call.`, act: ['tab', 'activity', 'Make the call'] };
  if (s.expected && sinceStart >= 1 && profile.typicalPay > 0) return { msg: `Did you get paid on ${short(s.pp.start)}? Log it so I’m working with real numbers, not guesses.`, act: ['add', 'income', 'Log paycheck'] };
  if (ready.length) return { msg: `“${ready[0].name}” has sat on your want list for two days. Still want it? Be honest.`, act: ['tab', 'home', ''] , wants: true };
  if (s.saveLeft > 0 && !s.expected) return { msg: `You still owe yourself ${money0(s.saveLeft)} from ${s.start ? 'your starting gold' : 'this paycheck'}. Move it now, before it turns into DoorDash.`, act: ['save-now', s.saveLeft, 'Move it'] };
  if (foodOut > 0 && (foodBudget ? foodOut > foodBudget : foodOut > 150)) return { msg: `Food you didn’t cook: ${money0(foodOut)} this month. That’s ${workHours(foodOut) || 'a lot of work'}. Pick two nights this week to cook. Just two.` };
  if (subsYear > 300) return { msg: `Your subscriptions cost ${money0(subsYear)} a year. Which one did you not open this month? Cancel that one.`, act: ['tab', 'budget', 'See them'] };
  if (cards.length && !profile.debtExtra) return { msg: `${cards[0].name} charges ${cards[0].apr}% interest. Every extra $25 you send there is a guaranteed ${cards[0].apr}% return. Nothing else pays that.`, act: ['tab', 'budget', 'Set extra payment'] };
  if (cushion > 0 && daily > 0) { const d = Math.floor(cushion / daily); if (d >= 3) return { msg: `You have ${d} days of expenses saved. A month ago that number was probably zero. Keep going.`, tone: 'good' }; }
  if (!loggedToday && new Date().getHours() >= 18) return { msg: 'Nothing logged today. Either you spent nothing (nice) or you forgot. Which is it?', act: ['add', 'expense', 'Log something'] };
  if (s.perDay > 0) return { msg: `${money0(s.perDay)} a day until ${nextDay}. That’s your number. Stay under it and you make it to payday.`, tone: 'good' };
  return { msg: 'Quiet day. Log anything you spent so tomorrow’s number is right.' };
}
function artiCard(a, inline) {
  const act = a.act && a.act[2] ? `<div class="arti-actions"><button class="btn sm arti-btn" data-action="${a.act[0]}" ${a.act[0] === 'add' ? `data-type="${a.act[1]}"` : a.act[0] === 'tab' ? `data-tab="${a.act[1]}"` : `data-amt="${a.act[1]}"`}>${esc(a.act[2])}</button></div>` : '';
  return `<div class="arti ${inline ? 'inline' : ''}"><div class="arti-face" aria-hidden="true">${sprite('arti')}</div><div><div class="arti-name">ARTI</div><p class="arti-msg">${esc(a.msg)}</p>${act}</div></div>`;
}

/* ---------- Render helpers ---------- */
function glyph(e) {
  if (e.type === 'income') return `<div class="glyph income" aria-hidden="true">${sprite(e.kind === 'scholarship' ? 'scroll' : 'coin')}</div>`;
  if (e.type === 'save') return `<div class="glyph save" aria-hidden="true">${sprite(e.amount < 0 ? 'chestOpen' : 'chest')}</div>`;
  if (isWant(e)) return `<div class="glyph wants" aria-hidden="true">${sprite(e.treat ? 'ticket' : monsterOf(e.catId).sprite)}</div>`;
  const c = catOf(e.catId);
  return `<div class="glyph ${nwOf(e)}" aria-hidden="true">${esc(c.name.slice(0, 2))}</div>`;
}
function entryTitle(e) {
  if (e.type === 'income') return e.source || INCOME_KINDS[e.kind || 'paycheck'];
  if (e.type === 'save') { const g = profile.goals.find(x => x.id === e.goalId); return (e.amount < 0 ? 'From ' : 'To ') + (g ? g.name : 'savings'); }
  return e.note || catOf(e.catId).name;
}
function entrySub(e) {
  const parts = [];
  if (e.type === 'expense') { parts.push(nwOf(e) === 'needs' ? 'Need' : 'Want'); if (e.note) parts.push(catOf(e.catId).name); if (e.billKey) parts.push('Bill'); }
  else if (e.note && e.type !== 'income') parts.push(e.note);
  if (e.type === 'income') { parts.push(INCOME_KINDS[e.kind || 'paycheck']); if (e.hours) parts.push(e.hours + ' hrs'); if (isSpread(e)) parts.push(`spread over ${e.spreadMonths} months`); }
  if (e.type === 'save') parts.push('Savings');
  return parts.join(' · ');
}
function entryAmt(e) {
  if (e.type === 'income') return `<span class="amt in">+${money(e.amount)}</span>`;
  if (e.type === 'save') return `<span class="amt">${e.amount < 0 ? '+' : '−'}${money(Math.abs(e.amount))}</span>`;
  return `<span class="amt">−${money(e.amount)}</span>`;
}
function entryRow(e, withDate) {
  return `<button class="item" data-action="edit-entry" data-id="${esc(e.id)}">${glyph(e)}<div class="main"><div class="title">${esc(entryTitle(e))}${e.receipts && e.receipts.length ? sprite('receipt', 'rcpt-ico', null, 'has receipt') : ''}</div><div class="sub">${esc([withDate ? short(e.date) : '', entrySub(e)].filter(Boolean).join(' · '))}</div></div>${entryAmt(e)}</button>`;
}
const sortEntries = list => list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created || 0) - (a.created || 0));
function monthNav() {
  const cur = ymStr(today());
  return `<div class="month-nav"><button data-action="month" data-d="-1" aria-label="Previous month">‹</button><strong>${esc(ymLabel(ui.month))}</strong><button data-action="month" data-d="1" aria-label="Next month" ${ui.month >= cur ? 'disabled' : ''}>›</button></div>`;
}
const bar = (frac, cls = '') => `<div class="bar ${cls}"><i style="width:${(clamp01(frac) * 100).toFixed(1)}%"></i></div>`;

/* ---------- Views ---------- */
const TITLES = { home: 'Payday Ledger', quests: 'Quest Board', activity: 'Journal', budget: 'Budget', goals: 'Ledgerlands', insights: 'Stats' };

function render() {
  const view = $('#view');
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-current', t.dataset.tab === ui.tab ? 'page' : 'false'));
  $('#fab').hidden = !profile.setupDone;
  $('#top-title').textContent = profile.setupDone ? TITLES[ui.tab] : 'Payday Ledger';
  $('#top-eyebrow').textContent = profile.setupDone && ui.tab === 'home' ? dLabel(today(), { weekday: 'long', month: 'long', day: 'numeric' }) : '';
  $('#hud').innerHTML = profile.setupDone ? hudHTML() : '';
  if (!profile.setupDone) { view.innerHTML = viewOnboarding(); return; }
  const fn = { home: viewHome, quests: viewQuests, activity: viewActivity, budget: viewBudget, goals: viewGoals, insights: viewInsights }[ui.tab] || viewHome;
  const y = window.scrollY;
  view.innerHTML = fn();
  window.scrollTo(0, y);
  gameAfterRender();
}

function viewOnboarding() {
  return `
  <div class="hero-onboard">
    <div style="display:flex;gap:12px;align-items:end">${sprite('hero', '', {}, '').replace('class="sprite ', 'style="width:64px;height:64px" class="sprite ')}${sprite('arti', '', null).replace('class="sprite ', 'style="width:40px;height:40px" class="sprite ')}</div>
    <h2>A NEW QUEST BEGINS</h2>
    <p>Saving earns XP and gems. Wants are monsters that knock off hearts. Debts are bosses. First, tell me how you get paid.</p>
  </div>
  ${artiCard({ msg: 'Hi, I’m Arti. I’ll keep it honest. Everything you enter stays on this phone.' }, true)}
  <form class="card" data-form="setup">
    <label class="field"><span>Your hero’s name</span><input id="ob-name" name="hero" maxlength="16" placeholder="Hero" autocomplete="nickname"></label>
    <div class="seg" role="radiogroup" aria-label="How you’re paid"><label><input type="radio" name="ptype" value="hourly" checked data-action="ob-type">Hourly</label><label><input type="radio" name="ptype" value="salary" data-action="ob-type">Salary or fixed</label></div>
    <div id="ob-hourly" class="fields-2">
      <label class="field"><span>Hourly rate</span><input id="ob-rate" name="rate" inputmode="decimal" placeholder="$18.50"></label>
      <label class="field"><span>Hours a week you can count on</span><input id="ob-hours" name="hours" inputmode="decimal" placeholder="25"></label>
    </div>
    <p class="hint" id="ob-hours-hint">Use a slow week, not a good one. Extra hours become extra savings.</p>
    <label class="field" id="ob-salary" hidden><span>Take-home pay per check</span><input id="ob-pay" name="pay" inputmode="decimal" placeholder="$1,450"></label>
    <div class="fields-2">
      <label class="field"><span>Paid</span><select id="ob-freq" name="freq">${Object.entries(FREQ).map(([k, f]) => `<option value="${k}" ${k === 'biweekly' ? 'selected' : ''}>${f.label}</option>`).join('')}</select></label>
      <label class="field"><span>Last payday</span><input id="ob-last" name="last" type="date" value="${toStr(today())}" required></label>
    </div>
    <div class="fields-2">
      <label class="field"><span>State</span><select id="ob-state" name="state"><option value="MN">Minnesota</option><option value="other">Another state</option></select></label>
      <label class="field" id="ob-state-rate" hidden><span>State tax % (rough)</span><input name="stateRate" inputmode="decimal" placeholder="4.5"></label>
    </div>
    <label class="field"><span>Money in your bank account right now</span><input id="ob-balance" name="balance" inputmode="decimal" placeholder="$312.40">
      <span class="hint">Just what’s left today. Your game starts from this, and your first pay period counts down from it. Leave it blank to start from your next paycheck.</span></label>
    <label class="field"><span>Monthly rent <span class="muted">(optional)</span></span><input id="ob-rent" name="rent" inputmode="decimal" placeholder="$900"></label>
    <label class="field"><span>How hard do you want to save?</span>
      <select id="ob-split" name="split">${Object.entries(SPLITS).map(([k, s]) => `<option value="${k}" ${k === 'balanced' ? 'selected' : ''}>${s.label}</option>`).join('')}</select>
      <span class="hint">Needs / wants / savings, as a share of each check. Change it anytime.</span></label>
    <p class="err" id="ob-err" hidden></p>
    <button class="btn primary block" type="submit">Build my plan</button>
  </form>
  <button class="link" data-action="import-backup">Restore from a backup instead</button>`;
}

function viewHome() {
  const s = periodSummary();
  const t = today();
  const parts = [
    { k: 'Spent', v: s.spent, c: 'var(--chart-spend)' },
    { k: s.start ? 'Bills due before payday' : 'Bills set-aside', v: s.billsLeft, c: 'var(--warn)' },
    { k: 'Savings', v: Math.max(s.saved, 0) + s.saveLeft, c: 'var(--accent)' },
  ];
  const total = Math.max(s.base, parts.reduce((a, p) => a + p.v, 0), 1);
  const nextIn = daysBetween(t, s.pp.next);
  const upcoming = billsBetween(t, addDays(t, 14));
  const recent = sortEntries(all()).slice(0, 5);
  const wants = profile.wants.filter(w => !w.decided);
  const needBackup = all().length > 0 && Date.now() - (profile.lastBackup || profile.createdAt) > 30 * 864e5;

  return `
  ${needBackup ? `<div class="callout warn"><p><b>Back up your data.</b> ${profile.lastBackup ? 'It’s been over 30 days.' : 'You haven’t yet.'} If this phone breaks, it’s gone.</p><button class="btn sm" data-action="export-json">Back up</button></div>` : ''}
  ${chronicleBannerHTML()}
  ${heroCardHTML()}
  ${questNudgeHTML()}
  ${artiCard(artiSays())}
  <section class="stub" aria-label="This pay period">
    <div class="stub-top">
      <div><div class="k">Pay period</div><div class="v">${short(s.pp.start)} – ${short(s.pp.end)}</div></div>
      <div style="text-align:right"><div class="k">Next payday</div><div class="v">${dLabel(s.pp.next)} · ${nextIn === 1 ? 'tomorrow' : 'in ' + nextIn + ' days'}</div></div>
    </div>
    <div class="stub-body">
      <div>
        <div class="safe-label">Safe to spend until payday</div>
        ${s.waiting ? `<div class="safe-num" style="color:var(--gold)">PAYDAY</div>
        <div class="safe-sub">Your pay period started ${short(s.pp.start)}. Type in what actually landed in your account and your number appears.</div>
      </div>
      <button class="btn primary block" data-action="add" data-type="income">Enter my paycheck</button>
      ${s.spent > 0 ? `<p class="small muted">${money(s.spent)} spent so far this period.</p>` : ''}` : `
        <div class="safe-num ${s.safe < 0 ? 'neg' : ''}">${s.safe < 0 ? '−' : ''}${money0(Math.abs(s.safe))}</div>
        <div class="safe-sub">${s.safe > 0 ? `About <b class="num">${money0(s.perDay)}</b> a day for ${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'}` : s.safe < 0 ? 'Over for this pay period. Wants wait until payday.' : 'Nothing left to spend this period.'}</div>
      </div>
      <div class="meter" role="img" aria-label="How this paycheck is split">${parts.map(p => p.v > 0 ? `<i style="width:${(p.v / total * 100).toFixed(1)}%;background:${p.c}"></i>` : '').join('')}${s.safe > 0 ? '<i style="flex:1;background:var(--line)"></i>' : ''}</div>
      <div class="ledger">
        <div class="row"><span class="key">${s.start ? (s.base > s.start.amount ? 'Starting balance + income' : `Starting balance (${short(s.start.date)})`) : s.expected ? 'Expected paycheck' : 'Income this period'}</span><span class="num">${money(s.base)}</span></div>
        ${s.spread > 0 ? `<div class="row small muted"><span>incl. scholarship spread</span><span class="num">${money(s.spread)}</span></div>` : ''}
        ${parts.map(p => `<div class="row"><span class="key"><i class="dot" style="background:${p.c}"></i>${p.k}</span><span class="num">−${money(p.v)}</span></div>`).join('')}
        <div class="row total"><span>Left to spend</span><span class="num">${money(s.safe)}</span></div>
      </div>
      <div class="btn-row">
        ${s.expected ? '<button class="btn sm primary" data-action="add" data-type="income">Log paycheck</button>' : ''}
        ${profile.pay.type === 'hourly' && profile.pay.mode !== 'actual' ? '<button class="btn sm" data-action="estimator">Estimate a check</button>' : ''}
      </div>`}
    </div>
  </section>

  ${unlocked('pet') ? petHTML() : ''}

  <section>
    <div class="sec-head"><h2>Lurking monsters</h2><button class="link" data-action="want">Add a want</button></div>
    ${wants.length ? `<div class="list">${wants.map(wantRow).join('')}</div>`
      : `<div class="card stack"><p><b>Want something? Don’t buy it yet.</b></p><p class="small muted">Add it here and it becomes a monster. Wait 48 hours, then slay it by skipping it: you earn XP equal to its price, plus gems.</p><button class="btn sm" data-action="want">Add something I want</button></div>`}
  </section>

  <section>
    <div class="sec-head"><h2>Bills in the next 2 weeks</h2><button class="link" data-action="tab" data-tab="budget">Manage</button></div>
    ${profile.bills.length === 0 ? `<div class="card empty"><strong>No bills yet</strong><span>Add rent, phone, gym and your card payment so they’re set aside first.</span><button class="btn sm" data-action="bill">Add a bill</button></div>`
      : upcoming.length === 0 ? '<div class="card muted">Nothing due in the next 14 days.</div>'
      : `<div class="list">${upcoming.map(billRow).join('')}</div>`}
  </section>

  <section>
    <div class="sec-head"><h2>Recent</h2><button class="link" data-action="tab" data-tab="activity">See all</button></div>
    ${recent.length ? `<div class="list">${recent.map(e => entryRow(e, true)).join('')}</div>`
      : '<div class="card empty"><strong>Nothing logged yet</strong><span>Tap + to log a paycheck or purchase. Arti will call each one a need or a want.</span></div>'}
  </section>`;
}

function wantRow(w) {
  const left = COOL_OFF_H * 36e5 - (Date.now() - w.added);
  const ready = left <= 0;
  const hrs = Math.ceil(left / 36e5);
  const m = monsterOf(judge(w.name, w.price).catId);
  return `<div class="item" style="display:grid;gap:8px">
    <div class="row"><span style="display:flex;gap:10px;align-items:center;min-width:0"><span class="glyph wants">${sprite(m.sprite)}</span><span class="main"><span class="title" style="display:block">${esc(w.name)}</span><span class="sub" style="display:block">A ${esc(m.name)} lurks</span></span></span><span class="amt">${money(w.price)}</span></div>
    <div class="row small"><span style="color:var(--want)">${esc(workHours(w.price))}</span>${ready ? '<span class="pill arti-p">Decide now</span>' : `<span class="pill">${hrs}h to go</span>`}</div>
    <div class="btn-row">${ready ? `<button class="btn sm" data-action="want-buy" data-id="${esc(w.id)}">Give in</button>` : ''}<button class="btn sm primary" data-action="want-skip" data-id="${esc(w.id)}">Slay it (skip)</button></div>
  </div>`;
}

function billRow(b) {
  const d = daysBetween(today(), b.date);
  const when = d === 0 ? 'Due today' : d === 1 ? 'Due tomorrow' : (d < 0 ? 'Was due ' : 'Due ') + short(b.date);
  const pill = b.paid ? '<span class="pill good">Paid</span>' : d <= 2 ? `<span class="pill warn">${d < 0 ? 'Late' : 'Soon'}</span>` : '';
  return `<div class="item"><div class="glyph ${catOf(b.bill.catId).group}" aria-hidden="true">${esc((b.bill.name || '?').slice(0, 2))}</div>
    <div class="main"><div class="title">${esc(b.bill.name)}</div><div class="sub">${when} ${pill}</div></div>
    <span class="amt">${money(b.bill.amount)}</span>
    <button class="btn sm ${b.paid ? '' : 'primary'}" data-action="toggle-bill" data-key="${esc(b.key)}" data-bill="${esc(b.bill.id)}" data-date="${toStr(b.date)}" aria-label="${b.paid ? 'Mark unpaid' : 'Mark paid'}: ${esc(b.bill.name)}">${b.paid ? 'Undo' : 'Paid'}</button></div>`;
}

function viewActivity() {
  let list = monthList(ui.month);
  if (ui.filter === 'needs' || ui.filter === 'wants') list = list.filter(e => e.type === 'expense' && nwOf(e) === ui.filter);
  else if (ui.filter === 'receipts') list = list.filter(e => e.receipts && e.receipts.length);
  else if (ui.filter !== 'all') list = list.filter(e => e.type === ui.filter);
  const q = ui.search.trim().toLowerCase();
  if (q) list = list.filter(e => (entryTitle(e) + ' ' + entrySub(e) + ' ' + (e.note || '')).toLowerCase().includes(q));
  sortEntries(list);
  const groups = [];
  for (const e of list) { const g = groups[groups.length - 1]; if (g && g.date === e.date) g.items.push(e); else groups.push({ date: e.date, items: [e] }); }
  const f = (k, l) => `<button class="chip-btn" data-action="filter" data-f="${k}" aria-pressed="${ui.filter === k}">${l}</button>`;
  const t = today(), monday = addDays(t, -((t.getDay() + 6) % 7));
  const week = between(toStr(monday), toStr(t)).filter(e => e.type === 'expense' && !e.billKey);
  const wN = sumAmt(week.filter(e => nwOf(e) === 'needs')), wW = sumAmt(week.filter(e => nwOf(e) === 'wants'));
  const pending = sortEntries(all().filter(e => e.type === 'expense' && e.conf === 'unsure' && e.judgedBy !== 'you')).slice(0, 8);
  return `
  <form class="card stack" data-form="quick" style="gap:10px">
    <b style="font-family:var(--f-display);font-size:18px">Log a purchase</b>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:10px"><input class="input" id="q-what" name="what" placeholder="What was it?" autocomplete="off" maxlength="80" aria-label="What was it?"><input class="input" id="q-amt" name="amount" inputmode="decimal" placeholder="$0.00" autocomplete="off" aria-label="Amount"></div>
    <div id="q-verdict">${verdictHTML(judge(''))}</div>
    <div class="btn-row"><label class="btn" style="cursor:pointer;flex:0 1 auto">${sprite('camera')} PHOTO<input type="file" id="q-photo" accept="image/*" hidden></label><button class="btn primary" type="submit">Log it</button></div>
    <span id="q-photo-s" class="small muted"></span>
  </form>
  ${pending.length ? `<section><div class="sec-head"><h2>Arti needs your call</h2></div><div class="list">${pending.map(e => `<div class="item"><div class="main"><div class="title">${esc(e.note || catOf(e.catId).name)}</div><div class="sub">${short(e.date)} · ${money(e.amount)}</div></div><button class="btn sm" data-action="call" data-id="${esc(e.id)}" data-nw="needs">Need</button><button class="btn sm" data-action="call" data-id="${esc(e.id)}" data-nw="wants">Want</button></div>`).join('')}</div></section>` : ''}
  <div class="card stack" style="gap:8px">
    <div class="row small"><b>This week</b><span><span style="color:#9DB3FF">Needs <b class="num">${money0(wN)}</b></span> · <span style="color:var(--want)">Wants <b class="num">${money0(wW)}</b></span></span></div>
    <div class="meter">${wN + wW > 0 ? `<i style="width:${(wN / (wN + wW) * 100).toFixed(1)}%;background:var(--chart-spend)"></i><i style="flex:1;background:var(--want)"></i>` : ''}</div>
  </div>
  ${monthNav()}
  <div class="chips">${f('all', 'All')}${f('needs', 'Needs')}${f('wants', 'Wants')}${f('income', 'Income')}${f('save', 'Savings')}${f('receipts', 'Receipts')}</div>
  <input class="input" id="search" type="search" aria-label="Search" placeholder="Search" value="${esc(ui.search)}" autocomplete="off">
  ${groups.length ? groups.map(g => `<section><div class="day-head">${esc(dLabel(g.date, { weekday: 'long', month: 'short', day: 'numeric' }))}</div><div class="list">${g.items.map(e => entryRow(e)).join('')}</div></section>`).join('')
    : `<div class="card empty"><strong>Nothing here</strong><span>${q || ui.filter !== 'all' ? 'No entries match. Try another filter.' : 'No entries in ' + esc(ymLabel(ui.month)) + '.'}</span></div>`}`;
}

function viewBudget() {
  const ml = monthList(ui.month);
  const exp = ofType(ml, 'expense');
  const incLogged = sumAmt(ofType(ml, 'income'));
  const income = incLogged || monthlyIncome();
  const spentBy = {};
  for (const e of exp) spentBy[e.catId || 'other'] = (spentBy[e.catId || 'other'] || 0) + e.amount;
  const needs = sumAmt(exp.filter(e => nwOf(e) === 'needs'));
  const wants = sumAmt(exp.filter(e => nwOf(e) === 'wants'));
  const saved = sumAmt(ofType(ml, 'save'));
  const sp = profile.split;
  const splitRow = (label, val, pct, kind) => {
    const target = income * pct / 100, frac = target > 0 ? val / target : 0, over = kind !== 'save' && frac > 1;
    return `<div class="stack" style="gap:4px"><div class="row"><b>${label}</b><span class="small num">${money0(val)} <span class="muted">of ${money0(target)} · ${pct}%</span></span></div>${bar(frac, over ? 'bad' : kind === 'save' ? '' : frac > .85 ? 'warn' : '')}</div>`;
  };
  const rows = CATS.map(c => ({ c, b: Number(profile.budgets[c.id]) || 0, s: spentBy[c.id] || 0 })).filter(r => r.b > 0 || r.s > 0);
  const cur = ui.month === ymStr(today());
  const t = today();
  const elapsed = cur ? t.getDate() / dim(t.getFullYear(), t.getMonth()) : 1;
  const debts = profile.debts;
  const sim = simulatePayoff(profile.debtMethod, profile.debtExtra);
  const totalDebt = debts.reduce((s, d) => s + debtBalance(d), 0);
  const subs = profile.bills.filter(b => b.catId === 'subs' && !isOnce(b));
  const freedYear = profile.freed.reduce((s, f) => s + f.monthly * 12, 0);
  const colls = debts.filter(d => d.type === 'collection');

  return `
  ${monthNav()}
  <section>
    <div class="sec-head"><h2>Needs, wants, savings</h2><button class="link" data-action="settings">Change split</button></div>
    <div class="card stack" style="gap:14px">
      ${splitRow('Needs', needs, sp.needs, 'needs')}
      ${splitRow('Wants', wants, sp.wants, 'wants')}
      ${splitRow('Savings', saved, sp.save, 'save')}
      <p class="small muted">Based on ${incLogged ? 'income logged this month' : 'your expected pay'}: ${money0(income)}.</p>
    </div>
  </section>

  <section>
    <div class="sec-head"><h2>Category budgets</h2><button class="link" data-action="edit-budgets">Edit</button></div>
    ${rows.length ? `<div class="list">${rows.map(({ c, b, s }) => {
      const frac = b ? s / b : 1, over = b && s > b, pace = b && !over && cur && frac > elapsed + .15;
      const status = !b ? '<span class="pill">No budget</span>' : over ? `<span class="pill bad">${money0(s - b)} over</span>` : pace ? '<span class="pill warn">Ahead of pace</span>' : `<span class="pill good">${money0(b - s)} left</span>`;
      return `<div class="item" style="display:grid;gap:8px"><div class="row"><span class="title">${esc(c.name)}</span>${status}</div>${bar(frac, over ? 'bad' : pace ? 'warn' : '')}<div class="row small muted"><span class="num">${money(s)} spent</span><span class="num">${b ? 'of ' + money0(b) : ''}</span></div></div>`;
    }).join('')}</div>` : '<div class="card empty"><strong>No budgets set</strong><button class="btn sm" data-action="edit-budgets">Set budgets</button></div>'}
  </section>

  <section>
    <div class="sec-head"><h2>Bills</h2><button class="link" data-action="bill">Add bill</button></div>
    ${profile.bills.length ? `<div class="list">${[...profile.bills].filter(b => !isOnce(b)).sort((a, b) => (a.freq === 'biweekly') - (b.freq === 'biweekly') || a.dueDay - b.dueDay).map(b => {
      const nxt = billDates(b, today(), addDays(today(), 62))[0];
      return `<button class="item" data-action="bill" data-id="${esc(b.id)}"><div class="glyph ${catOf(b.catId).group}" aria-hidden="true">${esc(b.name.slice(0, 2))}</div><div class="main"><div class="title">${esc(b.name)}</div><div class="sub">${b.freq === 'biweekly' ? 'Every 2 weeks' : 'Monthly on the ' + ordinal(b.dueDay)}${nxt ? ' · next ' + short(nxt) : ''}</div></div><span class="amt">${money(b.amount)}</span></button>`;
    }).join('')}${profile.bills.filter(isOnce).sort((a, b) => a.due.localeCompare(b.due)).map(b => {
      const paid = !!billPayment(billKey(b, parseD(b.due))), late = !paid && parseD(b.due) < today();
      return `<button class="item" data-action="bill" data-id="${esc(b.id)}"><div class="glyph ${catOf(b.catId).group}" aria-hidden="true">1×</div><div class="main"><div class="title">${esc(b.name)}</div><div class="sub">One time · due ${short(b.due)}</div></div><span class="amt">${money(b.amount)}</span>${paid ? '<span class="pill good">Paid</span>' : late ? '<span class="pill bad">Late</span>' : ''}</button>`;
    }).join('')}<div class="item"><div class="main"><b>Recurring per month</b><div class="sub" style="white-space:normal">${money(billShare())} set aside from each paycheck${onceShare() > 0 ? `, including ${money(onceShare())} toward one-time bills` : ''}</div></div><span class="amt">${money(billsMonthly())}</span></div></div>`
      : '<div class="card empty"><strong>No bills yet</strong><span>Fixed bills get set aside from every paycheck automatically.</span><button class="btn sm" data-action="bill">Add a bill</button></div>'}
  </section>

  <section>
    <div class="sec-head"><h2>Subscription check</h2></div>
    <div class="card stack">
      ${subs.length ? `<p>You pay <b class="num">${money(subs.reduce((a, b) => a + billMonthly(b), 0))}</b> a month, <b class="num">${money0(subs.reduce((a, b) => a + billMonthly(b), 0) * 12)}</b> a year, for ${subs.length} subscription${subs.length === 1 ? '' : 's'}.</p>
        <div class="list">${subs.map(b => `<div class="item"><div class="main"><div class="title">${esc(b.name)}</div><div class="sub">${money0(billMonthly(b) * 12)} a year · ${esc(workHours(billMonthly(b) * 12))}</div></div><button class="btn sm" data-action="cancel-sub" data-id="${esc(b.id)}">I canceled it</button></div>`).join('')}</div>`
      : '<p class="small muted">Add each subscription as a bill with the category “Subscriptions”. They’ll show up here with their yearly cost.</p>'}
      ${freedYear > 0 ? `<p class="small" style="color:var(--good)">You’ve cut ${money0(freedYear)} a year in subscriptions.</p>` : ''}
    </div>
  </section>

  <section>
    <div class="sec-head"><h2>Debt payoff</h2><button class="link" data-action="debt">Add debt</button></div>
    ${debts.length ? `
    <div class="card stack" style="gap:12px">
      <div class="row"><div><div class="small muted">Total owed</div><div class="num" style="font-size:24px">${money0(totalDebt)}</div></div>
        <div style="text-align:right"><div class="small muted">Debt-free</div><div style="font-weight:800">${sim.months === null ? 'Payments too low' : sim.months === 0 ? 'Now' : payoffDate(sim.months)}</div></div></div>
      <div class="seg" role="group" aria-label="Payoff method">
        <button data-action="debt-method" data-m="avalanche" aria-pressed="${profile.debtMethod !== 'snowball'}">Highest interest first</button>
        <button data-action="debt-method" data-m="snowball" aria-pressed="${profile.debtMethod === 'snowball'}">Smallest balance first</button>
      </div>
      <label class="field"><span>Extra per month on top of minimums</span><input id="debt-extra" inputmode="decimal" value="${profile.debtExtra ? profile.debtExtra : ''}" placeholder="$0"></label>
      <p class="small muted">${sim.months === null ? 'At these payments the balance never reaches zero. Raise the extra amount.' : `Interest along the way: <b class="num">${money0(sim.interest)}</b>.`} ${profile.debtMethod === 'snowball' ? 'Quick wins keep you going.' : 'This order costs the least.'}</p>
    </div>
    <div class="list">${sim.order.concat(debts.filter(d => debtBalance(d) <= .005).map(d => ({ id: d.id }))).map((o, i) => {
      const d = debts.find(x => x.id === o.id), bal = debtBalance(d);
      const sub = d.type === 'collection' ? `Collections · ${COLL_STATUS[d.status || 'new']}` : `${Number(d.apr) || 0}% APR · min ${money0(d.minPayment)}`;
      return `<button class="item" data-action="debt" data-id="${esc(d.id)}"><div class="glyph ${d.type === 'collection' ? 'wants' : 'needs'}" aria-hidden="true">${bal > .005 ? i + 1 : '✓'}</div><div class="main"><div class="title">${esc(d.name)}</div><div class="sub">${esc(sub)}${sim.payoff[d.id] ? ' · done ' + payoffDate(sim.payoff[d.id]) : ''}</div></div><span class="amt">${money(bal)}</span></button>`;
    }).join('')}</div>
    <p class="small muted">Log a payment as a “Debt payments” expense and pick the debt, or link the bill to it. The balance drops on its own.</p>
    ${colls.length ? artiCard({ msg: 'Collections, honestly: they usually don’t charge interest, so pay down the cards first. Before you pay a collector anything, ask them in writing to validate the debt. Many settle for less than the balance. Get the deal in writing first, and never give them access to your bank account.' }, true) : ''}`
      : '<div class="card empty"><strong>No debts tracked</strong><span>Add your credit cards and any collections accounts to see the fastest way out.</span><button class="btn sm" data-action="debt">Add a debt</button></div>'}
  </section>`;
}

function viewGoals() {
  const { steps, current } = planSteps();
  const totalSaved = profile.goals.reduce((s, g) => s + goalSaved(g), 0);
  const skipped = profile.wants.filter(w => w.decided === 'skipped').reduce((s, w) => s + w.price, 0);
  const reg = REGIONS[reachedRegion()], cur = steps[current];
  return `
  <section>${mapHTML()}<p class="small muted">Tap a place to talk to whoever lives there.</p></section>
  ${cur ? `<div class="card stack"><div class="row"><span class="pill gold-p">MAIN QUEST ${current + 1}/7</span><button class="link" data-action="region" data-id="${reg.id}">Talk to ${esc(NPCS[reg.npc].name.split(' ')[0])}</button></div><h3 style="font-size:10px;color:var(--gold)">${esc(reg.name)}</h3><p><b>${esc(cur.title)}.</b> <span style="color:var(--ink-2)">${esc(cur.text)}</span></p>${cur.toggle ? '' : bar(cur.progress)}</div>` : '<div class="card"><b>The main quest is complete.</b> The Far Isle awaits.</div>'}
  ${bossesHTML()}
  <div class="stats">
    <div class="stat"><span class="k">Total saved</span><span class="v">${money0(totalSaved)}</span></div>
    <div class="stat"><span class="k">Plan per paycheck</span><span class="v">${money0((profile.typicalPay || 0) * profile.split.save / 100)}</span></div>
  </div>

  <section>
    <div class="sec-head"><h2>Quest log</h2></div>
    <div class="card">
      ${steps.map((s, i) => `<div class="step ${s.done ? 'done' : i === current ? 'now' : ''}"><div class="n">${s.done ? '✓' : i + 1}</div><div>
        <h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>
        ${i === current && !s.toggle ? bar(s.progress) : ''}
        ${i === current && s.goal ? `<button class="btn sm primary" style="margin-top:10px" data-action="add" data-type="save" data-goal="${esc(s.goal)}">Add money</button>` : ''}
        ${i === current && s.noColl ? '<div class="btn-row" style="margin-top:10px"><button class="btn sm" data-action="no-collections">None</button><button class="btn sm primary" data-action="debt" data-coll="1">Add one</button></div>' : ''}
        ${s.toggle && (i === current || s.done) ? `<div class="btn-row" style="margin-top:10px"><button class="btn sm" data-action="toggle-investing">${s.done ? 'I’m not investing yet' : 'I’m doing this'}</button>${s.done ? '' : '<button class="btn sm" data-action="match-date">Set match date</button>'}</div>` : ''}
        ${s.target && i === current && s.goal && (profile.goals.find(g => g.id === s.goal) || {}).target < s.target ? `<button class="btn sm" style="margin-top:8px" data-action="raise-goal" data-id="${esc(s.goal)}" data-t="${s.target}">Set goal to ${money0(s.target)}</button>` : ''}
      </div></div>`).join('')}
    </div>
  </section>

  <section>
    <div class="sec-head"><h2>Treasure chests</h2><button class="link" data-action="goal">New goal</button></div>
    ${profile.goals.length ? `<div class="list">${profile.goals.map(g => {
      const saved = goalSaved(g), frac = g.target ? saved / g.target : 0, left = Math.max(0, g.target - saved);
      let pace = '';
      if (g.deadline && left > 0) {
        const days = daysBetween(today(), parseD(g.deadline));
        const checks = Math.max(1, Math.floor(days / (365 / ppy())));
        pace = days <= 0 ? '<span class="pill bad">Past target date</span>' : `<span class="small muted">${money0(left / checks)}/paycheck to hit ${dLabel(g.deadline, { month: 'short', year: 'numeric' })}</span>`;
      }
      return `<div class="item" style="display:grid;gap:8px">
        <div class="row"><span class="title">${esc(g.name)}</span>${frac >= 1 ? '<span class="pill good">Reached</span>' : `<span class="small num muted">${Math.round(frac * 100)}%</span>`}</div>
        ${bar(frac)}
        <div class="row small"><span class="num"><b>${money(saved)}</b> <span class="muted">of ${money0(g.target)}</span></span>${pace}</div>
        <div class="btn-row"><button class="btn sm primary" data-action="add" data-type="save" data-goal="${esc(g.id)}">Add money</button><button class="btn sm" data-action="goal" data-id="${esc(g.id)}">Edit</button></div>
      </div>`;
    }).join('')}</div>` : '<div class="card empty"><strong>No goals yet</strong><button class="btn sm" data-action="goal">Create a goal</button></div>'}
    ${skipped > 0 ? `<p class="small" style="color:var(--good)">Skipped from your want list so far: ${money0(skipped)}.</p>` : ''}
  </section>

  <section>
    <div class="sec-head"><h2>The fortune teller</h2></div>
    <div class="card stack" style="gap:12px">
      <label class="field"><span>Save <b class="num" id="proj-amt">${money0(ui.projector)}</b> every paycheck</span>
        <input id="projector" type="range" min="10" max="500" step="10" value="${ui.projector}" style="min-height:auto;padding:0;border:0;background:none;accent-color:var(--accent)"></label>
      <div class="stats" id="proj-out" style="grid-template-columns:repeat(3,minmax(0,1fr))">${projectorStats(ui.projector)}</div>
      <p class="small muted">In a high-yield savings account at 4% a year. Rates change; this is an estimate. A car in 2 years and a house later both start here.</p>
    </div>
  </section>`;
}
function projectorStats(per) {
  const n1 = ppy(), r = .04 / n1;
  const fv = yrs => { const n = n1 * yrs; return per * ((Math.pow(1 + r, n) - 1) / r); };
  return [1, 2, 5].map(y => `<div class="stat"><span class="k">${y} year${y > 1 ? 's' : ''}</span><span class="v">${money0(fv(y))}</span></div>`).join('');
}

function viewInsights() {
  const ml = monthList(ui.month);
  const inc = sumAmt(ofType(ml, 'income')), exp = ofType(ml, 'expense'), out = sumAmt(exp), saved = sumAmt(ofType(ml, 'save'));
  const cur = ui.month === ymStr(today());
  const [y, m] = ui.month.split('-').map(Number);
  const days = cur ? today().getDate() : dim(y, m - 1);
  const spendDays = new Set(exp.filter(e => !e.billKey).map(e => e.date));
  const noSpend = Math.max(0, days - [...spendDays].filter(d => Number(d.slice(8)) <= days).length);
  const byCat = {};
  for (const e of exp) byCat[e.catId || 'other'] = (byCat[e.catId || 'other'] || 0) + e.amount;
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const max = cats.length ? cats[0][1] : 1;
  const foodOut = (byCat.dining || 0) + (byCat.delivery || 0);
  const wantsTotal = sumAmt(exp.filter(e => nwOf(e) === 'wants'));
  const impulse = exp.filter(e => nwOf(e) === 'wants' && !e.billKey && e.catId !== 'subs').length;
  const months = [5, 4, 3, 2, 1, 0].map(n => ymShift(ui.month, -n));
  const series = months.map(mm => { const l = monthList(mm); return { ym: mm, inc: sumAmt(ofType(l, 'income')), out: sumAmt(ofType(l, 'expense')), save: sumAmt(ofType(l, 'save')) }; });
  const tips = [];
  if (inc > 0 && saved / inc < .1) tips.push(`You saved ${Math.round(Math.max(0, saved) / inc * 100)}% of income. The fix isn’t willpower. Move savings the day you get paid, before you see the money.`);
  if (foodOut > 0) tips.push(`Eating out and delivery: ${money0(foodOut)} this month, ${workHours(foodOut)}. Delivery apps add fees and tip on top of the menu price. Picking up yourself saves 20–30%.`);
  if (wantsTotal > 0 && inc > 0 && wantsTotal / inc > profile.split.wants / 100) tips.push(`Wants took ${Math.round(wantsTotal / inc * 100)}% of income, above your ${profile.split.wants}% target.`);
  if (impulse >= 8) tips.push(`${impulse} separate “want” purchases this month. Small random buys are what broke your last budget. Run the next one through the want list.`);
  if (byCat.subs) tips.push(`Subscriptions: ${money0(byCat.subs)} this month, ${money0(byCat.subs * 12)} a year at this rate.`);

  return `
  ${adventureHTML()}
  ${chroniclesListHTML()}
  ${eventsCalendarHTML()}
  ${monthNav()}
  <div class="stats">
    <div class="stat"><span class="k">Income</span><span class="v">${money0(inc)}</span></div>
    <div class="stat"><span class="k">Spent</span><span class="v">${money0(out)}</span></div>
    <div class="stat"><span class="k">Saved</span><span class="v">${money0(saved)}</span></div>
    <div class="stat"><span class="k">Savings rate</span><span class="v">${inc > 0 ? Math.round(saved / inc * 100) + '%' : '—'}</span></div>
    <div class="stat"><span class="k">Food you didn’t cook</span><span class="v">${money0(foodOut)}</span></div>
    <div class="stat"><span class="k">No-spend days</span><span class="v">${noSpend} of ${days}</span></div>
  </div>

  <section>
    <div class="sec-head"><h2>Last 6 months</h2></div>
    <div class="card stack" style="gap:12px">
      <div class="legend"><span><i class="dot" style="background:var(--chart-income)"></i>Income</span><span><i class="dot" style="background:var(--chart-spend)"></i>Spending</span></div>
      <div class="readout">${readout(series, ui.chartSel ?? 5)}</div>
      <div class="chart">${trendChart(series, ui.chartSel ?? 5)}</div>
      <p class="small muted">Tap a month to see its numbers.</p>
    </div>
  </section>

  <section>
    <div class="sec-head"><h2>Where it went</h2></div>
    ${cats.length ? `<div class="card stack" style="gap:12px">${cats.map(([k, v]) => `<div class="stack" style="gap:4px"><div class="row small"><span>${esc(catOf(k).name)}</span><span class="num">${money(v)} <span class="muted">· ${Math.round(v / out * 100)}%</span></span></div><div class="bar"><i style="width:${(v / max * 100).toFixed(1)}%;background:${catOf(k).group === 'wants' ? 'var(--want)' : 'var(--chart-spend)'}"></i></div></div>`).join('')}
      <div class="legend small"><span><i class="dot" style="background:var(--chart-spend)"></i>Needs</span><span><i class="dot" style="background:var(--want)"></i>Wants</span></div></div>`
      : `<div class="card empty"><strong>No spending logged in ${esc(ymLabel(ui.month))}</strong></div>`}
  </section>

  ${tips.length ? `<section><div class="sec-head"><h2>Arti’s read</h2></div><div class="stack">${tips.map(t => artiCard({ msg: t }, true)).join('')}</div></section>` : ''}`;
}
function readout(series, i) {
  const s = series[i];
  return `<span><b style="font-family:var(--f-display)">${esc(ymLabel(s.ym))}</b></span><span>Income <b>${money0(s.inc)}</b></span><span>Spent <b>${money0(s.out)}</b></span><span>Saved <b>${money0(s.save)}</b></span>`;
}
function niceMax(v) { if (v <= 0) return 100; const p = Math.pow(10, Math.floor(Math.log10(v))); for (const k of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (k * p >= v) return k * p; return 10 * p; }
function trendChart(series, sel) {
  const W = 340, H = 190, L = 44, R = 6, T = 10, B = 24;
  const max = niceMax(Math.max(...series.map(s => Math.max(s.inc, s.out))));
  const y = v => T + (H - T - B) * (1 - v / max);
  const gw = (W - L - R) / series.length, bw = Math.min(16, gw / 3);
  let g = '';
  for (let k = 0; k <= 4; k++) { const v = max * k / 4; g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v >= 1000 ? '$' + (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : '$' + v}</text>`; }
  const barPath = (x, v) => { const h = Math.max(0, y(0) - y(v)); if (h < .5) return ''; const r = Math.min(4, h, bw / 2), top = y(0) - h; return `M${x},${y(0)}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${y(0)}Z`; };
  series.forEach((s, i) => {
    const cx = L + gw * i + gw / 2;
    if (i === sel) g += `<rect class="sel" x="${L + gw * i + 2}" y="${T}" width="${gw - 4}" height="${H - T - B}" rx="6"/>`;
    g += `<path d="${barPath(cx - bw - 1, s.inc)}" fill="var(--chart-income)"/><path d="${barPath(cx + 1, s.out)}" fill="var(--chart-spend)"/>`;
    g += `<text x="${cx}" y="${H - 6}" text-anchor="middle" style="${i === sel ? 'fill:var(--ink)' : ''}">${esc(ymLabel(s.ym, true))}</text>`;
    g += `<rect class="hit" x="${L + gw * i}" y="0" width="${gw}" height="${H}" data-action="chart-sel" data-i="${i}"><title>${esc(ymLabel(s.ym))}: income ${money0(s.inc)}, spent ${money0(s.out)}</title></rect>`;
  });
  g += `<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--muted)" stroke-width="1"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Income and spending by month">${g}</svg>`;
}

/* ---------- Sheets ---------- */
const sheetRoot = $('#sheet-root');
let confirmFn = null;
function openSheet(title, body) {
  sheetRoot.innerHTML = `<div class="scrim" data-action="close"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-inner"><div class="grabber"></div><div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-action="close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>${body}</div></div>`;
  sheetRoot.hidden = false;
  document.body.style.overflow = 'hidden';
  const first = sheetRoot.querySelector('[autofocus]');
  if (first) setTimeout(() => first.focus(), 60);
}
let relock = false;
function closeSheet() {
  if (DLG && DLG.timer) clearInterval(DLG.timer);
  sheetRoot.hidden = true; sheetRoot.innerHTML = ''; document.body.style.overflow = ''; confirmFn = null; releaseReceiptURLs();
  if (relock) { relock = false; if (profile.pinHash) lockNow(); }
  setTimeout(processCelebrations, 300);
}
function confirmSheet(title, text, okLabel, fn, danger = true) {
  openSheet(title, `<p style="color:var(--ink-2)">${text}</p><div class="btn-row"><button class="btn" data-action="close">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-action="confirm-ok">${esc(okLabel)}</button></div>`);
  confirmFn = fn;
}
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2800); }

const goalOptions = sel => profile.goals.map(g => `<option value="${esc(g.id)}" ${g.id === sel ? 'selected' : ''}>${esc(g.name)}</option>`).join('');
const catOptions = sel => ['needs', 'wants'].map(gr => `<optgroup label="${gr === 'needs' ? 'Needs' : 'Wants'}">${CATS.filter(c => c.group === gr).map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup>`).join('');
function catPicker(sel) {
  const grp = g => CATS.filter(c => c.group === g).map(c => `<label><input type="radio" name="cat" value="${c.id}" ${c.id === sel ? 'checked' : ''}><span>${esc(c.name)}</span></label>`).join('');
  return `<div class="field"><span class="field-label">Category</span><div class="cat-grid"><div class="group-label">Needs</div>${grp('needs')}<div class="group-label">Wants</div>${grp('wants')}</div></div>`;
}
function lastSource() { const inc = sortEntries(ofType(all(), 'income').filter(e => (e.kind || 'paycheck') === 'paycheck'))[0]; return inc ? inc.source || '' : ''; }

function openEntry(type, existing, preset = {}) {
  if (!profile.goals.length && type === 'save') { openGoal(null); return; }
  const e = existing || Object.assign({ type, amount: '', date: toStr(today()), catId: lastCat, note: '', source: lastSource(), goalId: defaultGoalId(), kind: 'paycheck' }, preset);
  const t = e.type;
  const titles = { expense: 'Spending', income: 'Income', save: 'Savings' };
  const amtVal = e.amount === '' ? '' : Math.abs(e.amount).toFixed(2);
  let fields = '';
  if (t === 'expense') {
    const j = existing ? { catId: e.catId, nw: nwOf(e), conf: e.judgedBy === 'you' ? 'you' : (e.conf || 'sure'), reason: e.judgedBy === 'you' ? 'Your call.' : judge(e.note, e.amount).reason } : judge(e.note, Number(e.amount) || 0);
    fields = `<p class="work-cost" id="f-work">${esc(e.amount ? workHours(Math.abs(e.amount)) : '')}</p>
      <label class="field"><span>What was it?</span><input id="f-what" name="note" value="${esc(e.note || '')}" placeholder="DoorDash, gas, textbook, vape…" maxlength="80" autocomplete="off"></label>
      <div id="f-verdict">${verdictHTML(j, Math.abs(Number(e.amount) || 0))}</div>
      <div class="seg" role="radiogroup" aria-label="Need or want"><label><input type="radio" name="nw" value="needs" ${j.nw === 'needs' ? 'checked' : ''}>Need</label><label><input type="radio" name="nw" value="wants" ${j.nw === 'wants' ? 'checked' : ''}>Want</label></div>
      <input type="hidden" name="conf" id="f-conf" value="${j.conf}">
      ${!existing && gs().tokens > 0 ? `<label class="toggle card" id="f-treat-wrap" ${j.nw === 'wants' ? '' : 'hidden'} style="padding:10px"><span>${sprite('ticket')} Use a Treat Pass (${gs().tokens} left): no damage, streak safe</span><input type="checkbox" name="treat"></label>` : ''}
      <details class="card"><summary style="cursor:pointer;font-weight:650">Category: <span id="f-cat-name">${esc(catOf(j.catId).name)}</span></summary><div style="margin-top:12px">${catPicker(j.catId)}</div></details>`;
    if (profile.debts.length) fields += `<label class="field"><span>Pays down a debt? <span class="muted">(optional)</span></span><select id="f-debt" name="debt"><option value="">No</option>${profile.debts.map(d => `<option value="${esc(d.id)}" ${d.id === e.debtId ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>`;
  } else if (t === 'income') {
    const kind = e.kind || 'paycheck';
    fields = `<div class="seg" role="radiogroup" aria-label="Kind">${Object.entries(INCOME_KINDS).map(([k, l]) => `<label><input type="radio" name="kind" value="${k}" ${k === kind ? 'checked' : ''} data-action="kind-switch">${l.split(' ')[0]}</label>`).join('')}</div>
      <label class="field"><span>From</span><input id="f-source" name="source" value="${esc(e.source || '')}" placeholder="${kind === 'scholarship' ? 'School or scholarship name' : 'Employer'}" maxlength="60"></label>
      <div class="fields-2">
        <label class="field" id="f-hours-wrap" ${kind !== 'paycheck' || profile.pay.type !== 'hourly' ? 'hidden' : ''}><span>Hours on this check <span class="muted">(optional)</span></span><input id="f-hours" name="hours" inputmode="decimal" value="${esc(e.hours || '')}" placeholder="${Math.round(hoursPerCheck()) || ''}"></label>
        <label class="field" id="f-spread-wrap" ${kind !== 'scholarship' ? 'hidden' : ''}><span>Make it last</span><select id="f-spread" name="spread">${[1, 2, 3, 4, 5, 6, 9, 12].map(n => `<option value="${n}" ${Number(e.spreadMonths || 4) === n ? 'selected' : ''}>${n === 1 ? 'Use it now' : n + ' months'}</option>`).join('')}</select></label>
      </div>
      <p class="hint" id="f-spread-hint" ${kind !== 'scholarship' ? 'hidden' : ''}>I’ll count a slice of it in each pay period so a big refund doesn’t feel like free money for one week. A semester is about 4 months.</p>`;
  } else {
    fields = `<div class="seg" role="radiogroup" aria-label="Direction"><label><input type="radio" name="dir" value="in" ${e.amount === '' || e.amount >= 0 ? 'checked' : ''}>Put money in</label><label><input type="radio" name="dir" value="out" ${e.amount < 0 ? 'checked' : ''}>Take money out</label></div>
      <label class="field"><span>Goal</span><select id="f-goal" name="goal">${goalOptions(e.goalId)}</select></label>`;
  }
  if (t !== 'save') fields += receiptField(existing);
  openSheet(existing ? 'Edit ' + titles[t].toLowerCase() : 'Add', `
    ${existing ? '' : `<div class="seg" role="group" aria-label="Type">${['expense', 'income', 'save'].map(k => `<button type="button" data-action="add" data-type="${k}" aria-pressed="${k === t}">${titles[k]}</button>`).join('')}<button type="button" data-action="want">Want it?</button></div>`}
    <form data-form="entry" data-id="${esc(existing ? existing.id : '')}" data-type="${t}" ${existing && existing.judgedBy === 'you' ? 'data-unw="1"' : ''}>
      <label class="amount-field"><span>$</span><input id="f-amount" name="amount" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${amtVal}" aria-label="Amount" ${existing ? '' : 'autofocus'}></label>
      ${fields}
      ${t === 'expense' ? `<label class="field"><span>Date</span><input id="f-date" name="date" type="date" value="${esc(e.date)}" required></label>` : `<div class="fields-2">
        <label class="field"><span>Date</span><input id="f-date" name="date" type="date" value="${esc(e.date)}" required></label>
        <label class="field"><span>Note</span><input id="f-note" name="note" value="${esc(e.note || '')}" placeholder="Optional" maxlength="80"></label>
      </div>`}
      <p class="err" id="f-err" hidden></p>
      <button class="btn primary block" type="submit">${existing ? 'Save changes' : t === 'income' ? 'Log income' : t === 'save' ? 'Save it' : 'Add spending'}</button>
      ${existing ? `<button class="btn danger block" type="button" data-action="delete-entry" data-id="${esc(existing.id)}">Delete</button>` : ''}
    </form>`);
}

function openEstimator() {
  const h = Math.round(hoursPerCheck() * 10) / 10;
  openSheet('Paycheck estimator', `
    <p class="small muted">${money(profile.pay.rate)}/hr · ${FREQ[profile.payFrequency].label.toLowerCase()} · ${profile.pay.state === 'MN' ? 'Minnesota' : 'state tax ' + profile.pay.stateRate + '%'} · single, no dependents</p>
    <div class="fields-2">
      <label class="field"><span>Regular hours this check</span><input id="est-hours" inputmode="decimal" value="${h || ''}"></label>
      <label class="field"><span>Overtime hours (1.5×)</span><input id="est-ot" inputmode="decimal" placeholder="0"></label>
    </div>
    <div class="card ledger" id="est-out"></div>
    <details class="card"><summary style="font-weight:650;cursor:pointer">Make it match your real paystub</summary>
      <form data-form="calib" style="margin-top:12px">
        <p class="small muted">Enter the gross and net from one real paystub. I’ll adjust every estimate to match what your employer actually takes out (insurance, uniform fees, anything).</p>
        <div class="fields-2">
          <label class="field"><span>Gross pay</span><input id="cal-gross" name="gross" inputmode="decimal" placeholder="$1,092.00"></label>
          <label class="field"><span>Net pay</span><input id="cal-net" name="net" inputmode="decimal" placeholder="$894.10"></label>
        </div>
        ${profile.pay.calib ? `<p class="small" style="color:var(--good)">Calibrated from a paystub on ${short(new Date(profile.pay.calib.at))}. <button class="link" type="button" data-action="clear-calib">Remove</button></p>` : ''}
        <p class="err" id="cal-err" hidden></p>
        <button class="btn block" type="submit">Calibrate</button>
      </form>
    </details>
    <p class="hint">Uses 2026 federal brackets, Social Security, Medicare${profile.pay.state === 'MN' ? ', Minnesota income tax and the 0.44% Minnesota Paid Leave premium' : ' and your state rate'}. Your real withholding can differ a bit.</p>`);
  updateEstimator();
}
function updateEstimator() {
  const out = $('#est-out'); if (!out) return;
  const hours = parseFloat($('#est-hours').value) || 0, ot = parseFloat($('#est-ot').value) || 0;
  const e = estimateCheck(grossFor(hours, ot));
  const line = (k, v, neg = true) => `<div class="row"><span class="key">${k}</span><span class="num">${neg ? '−' : ''}${money(v)}</span></div>`;
  out.innerHTML = `${line('Gross pay', e.gross, false)}${e.pretax ? line('Pre-tax deductions', e.pretax) : ''}${line('Federal income tax', e.fed)}${line('Social Security', e.ss)}${line('Medicare', e.med)}${line(profile.pay.state === 'MN' ? 'Minnesota income tax' : 'State income tax', e.state)}${e.leave ? line('MN Paid Leave', e.leave) : ''}${e.ratio !== 1 ? line('Paystub adjustment', e.raw - e.net) : ''}
    <div class="row total"><span>Take-home</span><span class="num">${money(e.net)}</span></div>
    <p class="small muted">${hours + ot > 0 ? `${money(e.net / (hours + ot))} per hour you actually keep.` : ''}</p>`;
}

function openWant() {
  openSheet('Want it?', `
    ${artiCard({ msg: 'Put it here and wait 48 hours. If you still want it then, buy it guilt-free. Most of the time you won’t.' }, true)}
    <form data-form="want">
      <label class="field"><span>What is it?</span><input id="w-name" name="name" placeholder="New headphones" maxlength="50" required autofocus></label>
      <label class="field"><span>Price</span><input id="w-price" name="price" inputmode="decimal" placeholder="$120"></label>
      <p class="work-cost" id="w-work"></p>
      <p class="err" id="w-err" hidden></p>
      <button class="btn primary block" type="submit">Start the 48 hours</button>
    </form>`);
}

function openBill(id) {
  const b = profile.bills.find(x => x.id === id) || { name: '', amount: '', dueDay: '', catId: 'housing', freq: 'monthly', anchor: toStr(today()), due: toStr(addDays(today(), 14)), debtId: '' };
  openSheet(id ? 'Edit bill' : 'Add a bill', `
    <form data-form="bill" data-id="${esc(id || '')}">
      <label class="field"><span>Name</span><input id="b-name" name="name" value="${esc(b.name)}" placeholder="Rent, phone, gym, card payment…" required maxlength="40" ${id ? '' : 'autofocus'}></label>
      <div class="seg" role="radiogroup" aria-label="How often"><label><input type="radio" name="freq" value="monthly" ${b.freq !== 'biweekly' && b.freq !== 'once' ? 'checked' : ''} data-action="bill-freq">Monthly</label><label><input type="radio" name="freq" value="biweekly" ${b.freq === 'biweekly' ? 'checked' : ''} data-action="bill-freq">Every 2 weeks</label><label><input type="radio" name="freq" value="once" ${b.freq === 'once' ? 'checked' : ''} data-action="bill-freq">One time</label></div>
      <div class="fields-2">
        <label class="field"><span>Amount</span><input id="b-amt" name="amount" inputmode="decimal" value="${b.amount === '' ? '' : Number(b.amount).toFixed(2)}" placeholder="$0.00" required></label>
        <label class="field" id="b-due-wrap" ${b.freq !== 'once' ? 'hidden' : ''}><span>Due date</span><input id="b-due" name="due" type="date" value="${esc(b.due || toStr(addDays(today(), 14)))}"></label>
        <label class="field" id="b-day-wrap" ${b.freq === 'biweekly' || b.freq === 'once' ? 'hidden' : ''}><span>Due day of month</span><input id="b-day" name="day" type="number" min="1" max="31" value="${esc(b.dueDay)}" placeholder="1–31"></label>
        <label class="field" id="b-anchor-wrap" ${b.freq !== 'biweekly' ? 'hidden' : ''}><span>Next charge date</span><input id="b-anchor" name="anchor" type="date" value="${esc(b.anchor || toStr(today()))}"></label>
      </div>
      <p class="hint" id="b-once-hint" ${b.freq !== 'once' ? 'hidden' : ''}>Paid once, then done. Until then, a share comes out of each paycheck so the full amount is ready by the due date.</p>
      <label class="field"><span>Category</span><select id="b-cat" name="cat">${catOptions(b.catId)}</select></label>
      ${profile.debts.length ? `<label class="field"><span>Pays down a debt? <span class="muted">(for card payments)</span></span><select id="b-debt" name="debt"><option value="">No</option>${profile.debts.map(d => `<option value="${esc(d.id)}" ${d.id === b.debtId ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>` : ''}
      <p class="err" id="b-err" hidden></p>
      <button class="btn primary block" type="submit">${id ? 'Save bill' : 'Add bill'}</button>
      ${id ? `<button class="btn danger block" type="button" data-action="delete-bill" data-id="${esc(id)}">Delete bill</button>` : ''}
    </form>`);
}

function openGoal(id) {
  const g = profile.goals.find(x => x.id === id) || { name: '', target: '', deadline: '', initial: 0 };
  openSheet(id ? 'Edit goal' : 'New goal', `
    <form data-form="goal" data-id="${esc(id || '')}">
      <label class="field"><span>What are you saving for?</span><input id="g-name" name="name" value="${esc(g.name)}" placeholder="Car, trip, laptop…" required maxlength="40" ${id ? '' : 'autofocus'}></label>
      <div class="fields-2">
        <label class="field"><span>Target</span><input id="g-target" name="target" inputmode="decimal" value="${g.target === '' ? '' : Number(g.target).toFixed(0)}" placeholder="$1,000" required></label>
        <label class="field"><span>By <span class="muted">(optional)</span></span><input id="g-deadline" name="deadline" type="date" value="${esc(g.deadline || '')}"></label>
      </div>
      <label class="field"><span>Already saved toward it</span><input id="g-initial" name="initial" inputmode="decimal" value="${g.initial ? Number(g.initial).toFixed(2) : ''}" placeholder="$0"></label>
      <p class="err" id="g-err" hidden></p>
      <button class="btn primary block" type="submit">${id ? 'Save goal' : 'Create goal'}</button>
      ${id && !g.kind || (id && g.kind === 'custom') ? `<button class="btn danger block" type="button" data-action="delete-goal" data-id="${esc(id)}">Delete goal</button>` : ''}
    </form>`);
}

function openDebt(id, coll) {
  const d = profile.debts.find(x => x.id === id) || { name: '', balance: '', apr: '', minPayment: '', type: coll ? 'collection' : 'card', status: 'new', agency: '' };
  const cur = id ? debtBalance(d) : '';
  const isColl = d.type === 'collection';
  openSheet(id ? 'Edit debt' : 'Add a debt', `
    <form data-form="debt" data-id="${esc(id || '')}">
      <label class="field"><span>Type</span><select id="d-type" name="type">${Object.entries(DEBT_TYPES).map(([k, l]) => `<option value="${k}" ${k === d.type ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Name</span><input id="d-name" name="name" value="${esc(d.name)}" placeholder="${isColl ? 'Original company (e.g. old phone bill)' : 'Discover, Capital One…'}" required maxlength="40"></label>
      <div class="fields-3">
        <label class="field"><span>Balance now</span><input id="d-bal" name="balance" inputmode="decimal" value="${cur === '' ? '' : cur.toFixed(2)}" placeholder="$0" required></label>
        <label class="field"><span>APR %</span><input id="d-apr" name="apr" inputmode="decimal" value="${esc(d.apr)}" placeholder="${isColl ? '0' : '29.9'}"></label>
        <label class="field"><span>Minimum</span><input id="d-min" name="min" inputmode="decimal" value="${d.minPayment === '' ? '' : Number(d.minPayment).toFixed(2)}" placeholder="${isColl ? '$0' : '$40'}"></label>
      </div>
      <div id="d-coll" class="stack" ${isColl ? '' : 'hidden'}>
        <label class="field"><span>Collection agency</span><input name="agency" value="${esc(d.agency || '')}" placeholder="Who’s contacting you" maxlength="40"></label>
        <label class="field"><span>Where you are with it</span><select name="status">${Object.entries(COLL_STATUS).map(([k, l]) => `<option value="${k}" ${k === (d.status || 'new') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        ${artiCard({ msg: 'Step by step: 1) Ask them in writing to validate the debt, ideally within 30 days of their first letter. 2) Check your free credit reports at annualcreditreport.com. 3) Offer a lump-sum settlement, often 30–50% of the balance. 4) Get the agreement in writing before paying, then set the balance here to the settled amount. 5) Pay with a method you control, never by giving them your bank login. Old debts have legal time limits, and a payment can restart some of them. LawHelpMN.org explains this for Minnesota.' }, true)}
      </div>
      <p class="err" id="d-err" hidden></p>
      <button class="btn primary block" type="submit">${id ? 'Save debt' : 'Add debt'}</button>
      ${id ? `<button class="btn danger block" type="button" data-action="delete-debt" data-id="${esc(id)}">Delete debt</button>` : ''}
    </form>`);
}

function openBudgets() {
  const inc = monthlyIncome();
  const row = c => `<div class="budget-row"><label for="bud-${c.id}">${esc(c.name)}</label><input class="input" id="bud-${c.id}" name="${c.id}" inputmode="decimal" value="${profile.budgets[c.id] ? Number(profile.budgets[c.id]).toFixed(0) : ''}" placeholder="$0"></div>`;
  openSheet('Monthly budgets', `
    <form data-form="budgets">
      <p class="small muted">Monthly take-home is about <b class="num">${money0(inc)}</b>. Your split aims for ${money0(inc * profile.split.needs / 100)} on needs and ${money0(inc * profile.split.wants / 100)} on wants.</p>
      <div class="group-label">Needs</div>${CATS.filter(c => c.group === 'needs').map(row).join('')}
      <div class="group-label">Wants</div>${CATS.filter(c => c.group === 'wants').map(row).join('')}
      <p class="small" id="bud-total"></p>
      <button class="btn primary block" type="submit">Save budgets</button>
    </form>`);
  updateBudgetTotal();
}
function updateBudgetTotal() {
  const el = $('#bud-total'); if (!el) return;
  let n = 0, w = 0;
  for (const c of CATS) { const v = parseAmt($('#bud-' + c.id).value) || 0; if (c.group === 'needs') n += v; else w += v; }
  const left = monthlyIncome() - n - w;
  el.innerHTML = `Needs <b class="num">${money0(n)}</b> · Wants <b class="num">${money0(w)}</b> · Left for savings <b class="num" style="color:${left < 0 ? 'var(--bad)' : 'var(--good)'}">${money0(left)}</b>`;
}

function openSettings() {
  const p = profile, pay = p.pay;
  openSheet('Settings', `
    <form data-form="settings">
      <div class="field-label">Pay</div>
      <div class="seg" role="radiogroup" aria-label="How you’re paid"><label><input type="radio" name="ptype" value="hourly" ${pay.type === 'hourly' ? 'checked' : ''} data-action="set-type">Hourly</label><label><input type="radio" name="ptype" value="salary" ${pay.type !== 'hourly' ? 'checked' : ''} data-action="set-type">Salary or fixed</label></div>
      <div class="fields-2" id="s-hourly" ${pay.type !== 'hourly' ? 'hidden' : ''}>
        <label class="field"><span>Hourly rate</span><input name="rate" inputmode="decimal" value="${pay.rate || ''}"></label>
        <label class="field"><span>Hours/week to plan on</span><input name="hours" inputmode="decimal" value="${pay.hours || ''}"></label>
        <label class="field"><span>Pre-tax deductions per check</span><input name="pretax" inputmode="decimal" value="${pay.pretax || ''}" placeholder="$0"></label>
        <label class="field"><span>State</span><select name="state" data-action="state-switch"><option value="MN" ${pay.state === 'MN' ? 'selected' : ''}>Minnesota</option><option value="other" ${pay.state !== 'MN' ? 'selected' : ''}>Another state</option></select></label>
        <label class="field" id="s-state-rate" ${pay.state === 'MN' ? 'hidden' : ''}><span>State tax %</span><input name="stateRate" inputmode="decimal" value="${pay.stateRate || ''}"></label>
      </div>
      <div class="field"><span class="field-label">Before a paycheck is entered</span>
        <div class="seg" role="radiogroup" aria-label="Paycheck planning"><label><input type="radio" name="payMode" value="actual" ${pay.mode !== 'estimate' ? 'checked' : ''}>Wait for the real amount</label><label><input type="radio" name="payMode" value="estimate" ${pay.mode === 'estimate' ? 'checked' : ''}>Use an estimate</label></div>
        <span class="hint">${pay.mode !== 'estimate' && realPayAvg() ? `Your usual paycheck is ${money(realPayAvg())}, the average of your last real ones. ` : ''}Real amount: on payday you type in what landed, then your number appears. Estimate: plan ahead with the estimator until you do.</span></div>
      <label class="field" id="s-salary" ${pay.type === 'hourly' ? 'hidden' : ''}><span>Take-home per check</span><input name="pay" inputmode="decimal" value="${p.typicalPay ? p.typicalPay.toFixed(2) : ''}"></label>
      <div class="fields-2">
        <label class="field"><span>Paid</span><select name="freq">${Object.entries(FREQ).map(([k, f]) => `<option value="${k}" ${k === p.payFrequency ? 'selected' : ''}>${f.label}</option>`).join('')}</select></label>
        <label class="field"><span>A recent payday</span><input name="anchor" type="date" value="${esc(p.anchorPayday)}"></label>
      </div>
      <div class="field"><span class="field-label">Split each paycheck (%)</span>
        <div class="fields-3">
          <label class="field"><span class="hint">Needs</span><input name="needs" type="number" min="0" max="100" value="${p.split.needs}"></label>
          <label class="field"><span class="hint">Wants</span><input name="wants" type="number" min="0" max="100" value="${p.split.wants}"></label>
          <label class="field"><span class="hint">Savings</span><input name="save" type="number" min="0" max="100" value="${p.split.save}"></label>
        </div></div>
      <label class="field"><span>Starting balance <span class="muted">(optional)</span></span><input name="startBal" inputmode="decimal" value="${p.startBalance ? Number(p.startBalance.amount).toFixed(2) : ''}" placeholder="$0.00">
        <span class="hint">${p.startBalance ? `Set ${short(p.startBalance.date)}. ` : ''}What’s in your bank account right now. Your current pay period counts down from it until your next payday. Change it to start over from today.</span></label>
      <label class="field"><span>401(k) match starts <span class="muted">(optional)</span></span><input name="match" type="date" value="${esc(p.matchDate || '')}"></label>
      <p class="err" id="s-err" hidden></p>
      <button class="btn primary block" type="submit">Save settings</button>
    </form>
    <form class="card stack" data-form="hero">
      <b style="font-family:var(--f-pixel);font-size:10px">YOUR HERO</b>
      <label class="field"><span>Name</span><input name="hero" value="${esc(gs().name)}" maxlength="16" placeholder="Hero"></label>
      <div class="row" style="justify-content:flex-start">${sprite('hero', '', null).replace('class="sprite ', 'style="width:56px;height:56px" class="sprite ')}<span class="small muted">Change your look below, then save.</span></div>
      <div class="fields-2">
        <label class="field"><span>Race</span><select name="race"><option value="elf" ${gs().look.race === 'elf' ? 'selected' : ''}>Elf</option><option value="human" ${gs().look.race !== 'elf' ? 'selected' : ''}>Human</option></select></label>
        <label class="field"><span>Hair</span><select name="hair">${Object.entries(HAIR).map(([k, h]) => `<option value="${k}" ${gs().look.hair === k ? 'selected' : ''}>${h[2]}</option>`).join('')}</select></label>
      </div>
      <label class="toggle"><span>Round glasses</span><input type="checkbox" name="glasses" ${gs().look.glasses ? 'checked' : ''}></label>
      <label class="toggle"><span>Sound effects</span><input type="checkbox" name="sound" ${gs().sound ? 'checked' : ''}></label>
      <label class="toggle"><span>Put receipt photos in backups</span><input type="checkbox" name="photos" ${gs().photosInBackup ? 'checked' : ''}></label>
      <button class="btn sm" type="submit">Save hero</button>
    </form>
    <div class="card stack">
      <b>Your data</b><p class="small muted" id="storage-line"></p>
      <p class="small muted">Everything is stored on this iPhone only. Nothing is sent anywhere. Back up now and then, and keep the file in iCloud Drive or Files.${p.lastBackup ? ' Last backup: ' + short(new Date(p.lastBackup)) + '.' : ''}</p>
      <div class="btn-row"><button class="btn sm primary" data-action="export-json">Back up</button><button class="btn sm" data-action="export-csv">Export CSV</button></div>
      <button class="btn sm" data-action="import-backup">Restore from backup</button>
    </div>
    <div class="card stack">
      <b>App lock</b>
      <p class="small muted">A PIN keeps people who pick up your phone out of the app. It’s a privacy screen, not encryption. Your iPhone passcode is the real lock.</p>
      ${p.pinHash ? '<button class="btn sm" data-action="pin-off">Turn off PIN</button>' : `<form data-form="pin" class="stack"><input class="input" name="pin" type="password" inputmode="numeric" maxlength="8" placeholder="4–8 digits" autocomplete="new-password" aria-label="New PIN"><button class="btn sm" type="submit">Set PIN</button></form>`}
    </div>
    <button class="btn sm danger" data-action="erase">Erase everything</button>`);
  storageLine().then(t => { const el = $('#storage-line'); if (el) el.textContent = t; });
  prepareBackup();
}

/* ---------- Arti's call: need or want ---------- */
const MERCHANTS = [
  ['delivery', ['DOORDASH', 'DOOR DASH', 'UBER EATS', 'UBEREATS', 'GRUBHUB', 'POSTMATES', 'SEAMLESS', 'GOPUFF', 'CAVIAR', 'INSTACART DELIVERY']],
  ['groceries', ['CUB', 'HY-VEE', 'HYVEE', 'ALDI', 'KOWALSKI', 'LUNDS', 'BYERLY', 'TRADER JOE', 'WHOLE FOODS', 'KROGER', 'SAFEWAY', 'INSTACART', 'FOOD 4 LESS', 'GROCERY', 'GROCERIES', 'SUPERMARKET']],
  ['subs', ['NETFLIX', 'SPOTIFY', 'HULU', 'DISNEY+', 'DISNEY PLUS', 'HBO', 'MAX ', 'YOUTUBE PREMIUM', 'YOUTUBE TV', 'PRIME VIDEO', 'AMAZON PRIME', 'PARAMOUNT', 'PEACOCK', 'XBOX GAME PASS', 'GAME PASS', 'PS PLUS', 'PLAYSTATION PLUS', 'NINTENDO ONLINE', 'CHATGPT', 'CLAUDE', 'ADOBE', 'AUDIBLE', 'PATREON', 'TWITCH', 'CRUNCHYROLL', 'SIRIUS', 'ICLOUD', 'APPLE MUSIC', 'DISCORD NITRO', 'ONLYFANS', 'TINDER', 'BUMBLE', 'HINGE', 'SUBSCRIPTION']],
  ['dining', ['MCDONALD', 'CHIPOTLE', 'STARBUCKS', 'TACO BELL', 'WENDY', 'BURGER KING', 'SUBWAY', 'DOMINO', 'PIZZA', 'CAFE', 'COFFEE', 'LATTE', 'CARIBOU', 'DUNN BROS', 'DUNKIN', 'RESTAURANT', 'GRILL', 'CHICK-FIL', 'CHICK FIL', 'PANERA', 'KFC', 'CULVER', 'JIMMY JOHN', 'POTBELLY', 'NOODLES', 'DAIRY QUEEN', 'ARBY', 'SONIC', 'POPEYE', 'BUFFALO WILD', 'BWW', 'APPLEBEE', 'OLIVE GARDEN', 'SUSHI', 'TACO', 'BURGER', 'DINER', 'WINGS', 'LUNCH', 'DINNER', 'BREAKFAST', 'BRUNCH', 'TAKEOUT', 'TAKE OUT', 'DRIVE THRU', 'FAST FOOD', 'BOBA', 'SMOOTHIE', 'BAR TAB', 'AT THE BAR', 'DRINKS OUT']],
  ['phone', ['VERIZON', 'T-MOBILE', 'TMOBILE', 'AT&T', 'MINT MOBILE', 'VISIBLE', 'CRICKET', 'XFINITY', 'COMCAST', 'SPECTRUM', 'CENTURYLINK', 'METRONET', 'PHONE BILL', 'PHONE PLAN', 'INTERNET', 'WIFI']],
  ['utilities', ['XCEL', 'CENTERPOINT', 'ELECTRIC', 'POWER BILL', 'WATER BILL', 'GAS BILL', 'HEAT BILL', 'UTILITY', 'UTILITIES']],
  ['health', ['PLANET FITNESS', 'ANYTIME FITNESS', 'LA FITNESS', 'LIFE TIME', 'LIFETIME', 'SNAP FITNESS', 'YMCA', 'GYM', 'DOCTOR', 'DENTIST', 'PRESCRIPTION', 'MEDICINE', 'MEDS', 'PHARMACY', 'COPAY', 'CO-PAY', 'THERAPY', 'CLINIC', 'URGENT CARE', 'HOSPITAL', 'GLASSES', 'CONTACTS']],
  ['insurance', ['GEICO', 'PROGRESSIVE', 'STATE FARM', 'ALLSTATE', 'INSURANCE', 'LEMONADE']],
  ['school', ['TUITION', 'TEXTBOOK', 'BOOKSTORE', 'CHEGG', 'PEARSON', 'MCGRAW', 'LAB FEE', 'SCHOOL SUPPLIES', 'CLASS FEE', 'PARKING PERMIT']],
  ['housing', ['RENT ', 'LANDLORD', 'APARTMENT', 'RENTERS', 'MORTGAGE']],
  ['debt', ['CREDIT CARD PAYMENT', 'CARD PAYMENT', 'LOAN PAYMENT', 'COLLECTIONS', 'DISCOVER PAYMENT', 'CAPITAL ONE PAYMENT', 'MINIMUM PAYMENT']],
  ['transport', ['GAS ', 'FUEL', 'FILL UP', 'OIL CHANGE', 'TIRE', 'MECHANIC', 'CAR REPAIR', 'BUS ', 'METRO TRANSIT', 'LIGHT RAIL', 'TRAIN', 'PARKING', 'TOLL', 'TABS', 'DVS', 'AUTOZONE', 'O REILLY', 'JIFFY LUBE']],
  ['fun', ['STEAM', 'TICKETMASTER', 'STUBHUB', 'AMC', 'MOVIE', 'CINEMA', 'THEATER', 'CONCERT', 'TICKETS', 'BOWLING', 'GAMESTOP', 'VIDEO GAME', 'GAME ', 'TOPGOLF', 'TOP GOLF', 'FESTIVAL', 'PARTY', 'CLUB']],
  ['shopping', ['BEST BUY', 'ETSY', 'EBAY', 'SHEIN', 'TEMU', 'NIKE', 'ADIDAS', 'KOHL', 'MACY', 'OLD NAVY', 'H&M', 'ZARA', 'APPLE STORE', 'MALL', 'CLOTHES', 'SHIRT', 'HOODIE', 'SHOES', 'SNEAKERS', 'JEANS', 'JACKET', 'HEADPHONES', 'AIRPODS', 'GADGET', 'DECOR', 'IKEA', 'HOME DEPOT', 'MENARDS']],
  ['personal', ['GREAT CLIPS', 'SPORT CLIPS', 'SALON', 'BARBER', 'HAIRCUT', 'ULTA', 'SEPHORA', 'NAILS']],
  ['gifts', ['GIFT', 'BIRTHDAY', 'PRESENT', 'DONATION', 'CHURCH', 'TITHE']],
];
// Words that settle need vs want no matter where it was bought: [word, category, need or want]
const FORCED = [
  ['VAPE', 'personal', 'wants'], ['JUUL', 'personal', 'wants'], ['CIGARETTE', 'personal', 'wants'], ['TOBACCO', 'personal', 'wants'], ['ZYN', 'personal', 'wants'], ['WEED', 'personal', 'wants'], ['DISPO', 'personal', 'wants'], ['DISPENSARY', 'personal', 'wants'], ['THC', 'personal', 'wants'],
  ['LOTTERY', 'fun', 'wants'], ['SCRATCH', 'fun', 'wants'], ['BET ', 'fun', 'wants'], ['PARLAY', 'fun', 'wants'], ['DRAFTKINGS', 'fun', 'wants'], ['FANDUEL', 'fun', 'wants'], ['CASINO', 'fun', 'wants'],
  ['BEER', 'fun', 'wants'], ['LIQUOR', 'fun', 'wants'], ['ALCOHOL', 'fun', 'wants'], ['WINE', 'fun', 'wants'], ['SELTZER', 'fun', 'wants'], ['SHOTS', 'fun', 'wants'],
  ['SNACK', 'groceries', 'wants'], ['CANDY', 'groceries', 'wants'], ['CHIPS', 'groceries', 'wants'], ['SODA', 'groceries', 'wants'], ['ENERGY DRINK', 'groceries', 'wants'], ['MONSTER', 'groceries', 'wants'], ['RED BULL', 'groceries', 'wants'], ['CELSIUS', 'groceries', 'wants'],
  ['V-BUCKS', 'fun', 'wants'], ['VBUCKS', 'fun', 'wants'], ['SKIN ', 'fun', 'wants'], ['SKINS', 'fun', 'wants'], ['LOOT', 'fun', 'wants'], ['IN-APP', 'fun', 'wants'], ['COLOGNE', 'shopping', 'wants'], ['JEWELRY', 'shopping', 'wants'], ['TATTOO', 'personal', 'wants'], ['CAR WASH', 'transport', 'wants'],
  ['TOILET PAPER', 'groceries', 'needs'], ['PAPER TOWEL', 'groceries', 'needs'], ['SOAP', 'personal', 'needs'], ['SHAMPOO', 'personal', 'needs'], ['TOOTHPASTE', 'personal', 'needs'], ['DEODORANT', 'personal', 'needs'], ['RAZOR', 'personal', 'needs'], ['LAUNDRY', 'personal', 'needs'], ['DETERGENT', 'groceries', 'needs'],
  ['WORK BOOTS', 'shopping', 'needs'], ['WORK SHOES', 'shopping', 'needs'], ['UNIFORM', 'shopping', 'needs'], ['WINTER COAT', 'shopping', 'needs'], ['REPLACEMENT', 'shopping', 'needs'], ['BROKEN', 'shopping', 'needs'], ['CHARGER', 'shopping', 'needs'], ['FIRST AID', 'health', 'needs'], ['HAIRCUT', 'personal', 'needs'],
];
const GAS_STATIONS = ['SHELL', 'HOLIDAY', 'SPEEDWAY', 'KWIK TRIP', 'KWIK STAR', 'BP', 'EXXON', 'MOBIL', 'CHEVRON', 'MARATHON', 'CIRCLE K', 'CASEY', 'CITGO', 'SINCLAIR', 'GAS STATION', 'QT ', 'QUIKTRIP'];
// Places where it could be either. Arti asks instead of pretending to know.
const EITHER = [
  [['TARGET', 'WALMART', 'WAL-MART'], 'shopping', 'wants', 'Target and Walmart go either way. Toilet paper is a need, a new hoodie is a want. Which was it?'],
  [['AMAZON', 'AMZN'], 'shopping', 'wants', 'Amazon could be anything. Something you needed, or something you wanted?'],
  [['COSTCO', 'SAMS CLUB', "SAM'S CLUB"], 'groceries', 'needs', 'Costco runs are usually needs. Unless the cart was mostly TVs and snacks.'],
  [['CVS', 'WALGREENS'], 'health', 'needs', 'Medicine is a need. Snacks and candy from the pharmacy aren’t. Which was it?'],
  [['VENMO', 'CASH APP', 'ZELLE', 'PAYPAL'], 'other', 'wants', 'Sent to who, for what? Splitting rent is a need. Splitting a bar tab isn’t.'],
  [['UBER', 'LYFT', 'TAXI'], 'transport', 'wants', 'A ride to work or class is a need. A ride to the bar is a want. Which was it?'],
];
const REASONS = {
  delivery: 'Delivery is a want. Every time, even when you’re tired. Fees and tip add 20–30% on top.',
  dining: 'Eating out is a want. Food is a need. Someone else cooking it isn’t.',
  groceries: 'Groceries are a need.',
  transport: 'Getting to work and class is a need.',
  housing: 'A roof over your head is a need.',
  utilities: 'Lights and heat are needs.',
  phone: 'A phone plan is a need. The newest phone isn’t.',
  insurance: 'Insurance is a need.',
  health: 'Health is a need. That includes the gym, if you actually go.',
  school: 'School costs are needs. That’s an investment in you.',
  debt: 'Paying debt is a need. Missing it costs more.',
  subs: 'Subscriptions are wants. Even the one you use every day.',
  fun: 'Fun is a want. That’s allowed. It just comes out of the want money.',
  shopping: 'Shopping is a want, unless it replaced something broken.',
  personal: 'Mostly a want.',
  gifts: 'Gifts are wants. Kind ones, but wants.',
  other: '',
};
const titleCase = s => String(s).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
function merchantKey(s) { return String(s || '').toUpperCase().replace(/[^A-Z&' ]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' '); }
function judge(text, amount = 0) {
  const raw = String(text || '').trim();
  if (!raw) return { catId: lastCat, nw: catOf(lastCat).group, conf: 'empty', reason: '' };
  const rule = profile.rules[merchantKey(raw)];
  if (rule && rule.catId) return { catId: rule.catId, nw: rule.nw || catOf(rule.catId).group, conf: 'sure', reason: `You told me ${titleCase(raw)} is a ${rule.nw === 'needs' ? 'need' : 'want'}. I remembered.` };
  const debtHit = profile.debts.find(d => d.name && raw.toUpperCase().includes(d.name.toUpperCase()));
  if (debtHit) return { catId: 'debt', nw: 'needs', conf: 'sure', reason: `A payment on ${debtHit.name} is a need. It’s also a hit on a boss.`, debtId: debtHit.id };
  const U = ' ' + raw.toUpperCase().replace(/[^A-Z0-9&+\-' ]/g, ' ').replace(/\s+/g, ' ') + ' ';
  // Short words match at the start of a word; a trailing space means a whole word.
  const has = w => w.endsWith(' ') ? U.includes(' ' + w) : w.length <= 4 ? U.includes(' ' + w) : U.includes(w);
  const forced = FORCED.find(([w]) => has(w));
  if (forced) {
    const [, catId, nw] = forced;
    return { catId, nw, conf: 'sure', reason: nw === 'wants' ? `${titleCase(forced[0].trim())} is a want. No way around that one.` : `${titleCase(forced[0].trim())} is a need.` };
  }
  if (GAS_STATIONS.some(has)) {
    if (has('GAS ') || has('FUEL') || has('FILL') || amount >= 20) return { catId: 'transport', nw: 'needs', conf: amount >= 20 || has('GAS ') ? 'sure' : 'guess', reason: 'Gas to get to work and class is a need.' };
    return { catId: 'groceries', nw: 'wants', conf: 'guess', reason: 'Under $20 at a gas station is usually snacks or an energy drink, not gas. If it was gas, flip it to Need.' };
  }
  const delivery = MERCHANTS[0][1].some(has);
  if (!delivery) {
    const either = EITHER.find(([words]) => words.some(has));
    if (either) return { catId: either[1], nw: either[2], conf: 'unsure', reason: either[3] };
  }
  for (const [catId, words] of MERCHANTS) if (words.some(has)) return { catId, nw: catOf(catId).group, conf: 'sure', reason: REASONS[catId] };
  return { catId: 'other', nw: 'wants', conf: 'unsure', reason: 'I don’t know what that is. Need or want? You make the call and I’ll remember.' };
}
function verdictHTML(j, amt = 0) {
  if (j.conf === 'empty') return artiCard({ msg: 'Tell me what it was. I’ll call it: need or want.' }, true);
  const tag = j.nw === 'needs' ? '<span class="pill need-p">Need</span>' : '<span class="pill want-p">Want</span>';
  const conf = j.conf === 'unsure' ? '<span class="pill warn">Not sure</span>' : j.conf === 'guess' ? '<span class="pill">Best guess</span>' : j.conf === 'you' ? '<span class="pill arti-p">Your call</span>' : '';
  const cost = j.nw === 'wants' && amt > 0 && workHours(amt) ? ` That’s ${workHours(amt)}.` : '';
  return `<div class="arti inline"><div class="arti-face" aria-hidden="true">${sprite('arti')}</div><div><div class="arti-name">ARTI’S CALL</div><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:3px 0 5px">${tag}<span class="small muted">${esc(catOf(j.catId).name)}</span>${conf}</div><p class="small" style="color:var(--ink-2)">${esc((j.reason + cost).trim())}</p></div></div>`;
}
function refreshVerdict() {
  const f = document.querySelector('form[data-form="entry"][data-type="expense"]'); if (!f) return;
  const amt = parseAmt($('#f-amount').value) || 0;
  const j = judge($('#f-what').value, amt);
  const picked = f.querySelector('input[name=cat]:checked');
  if (f.dataset.ucat && picked) { j.catId = picked.value; if (!f.dataset.unw) j.nw = catOf(picked.value).group; }
  if (f.dataset.unw) j.nw = f.querySelector('input[name=nw]:checked').value;
  if (f.dataset.unw || f.dataset.ucat) { j.conf = 'you'; j.reason = 'Your call. I’ll remember it next time.'; }
  $('#f-verdict').innerHTML = verdictHTML(j, amt);
  f.querySelector(`input[name=nw][value=${j.nw}]`).checked = true;
  const cr = f.querySelector(`input[name=cat][value="${j.catId}"]`); if (cr) cr.checked = true;
  $('#f-cat-name').textContent = catOf(j.catId).name;
  $('#f-conf').value = j.conf;
  const tw = $('#f-treat-wrap'); if (tw) tw.hidden = j.nw !== 'wants';
  if (j.debtId && $('#f-debt') && !$('#f-debt').value) $('#f-debt').value = j.debtId;
}

/* ---------- Files ---------- */
async function shareOrDownload(filename, text, type) {
  const file = new File([text], filename, { type });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: filename }); return true; }
  } catch (e) { if (e && e.name === 'AbortError') return false; if (e && e.name === 'NotAllowedError') return 'retry'; }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}
function csvExport() {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = [['Date', 'Type', 'Amount', 'Category', 'Need or want', 'Goal', 'From', 'Note']];
  for (const e of sortEntries(all())) {
    const g = profile.goals.find(x => x.id === e.goalId);
    rows.push([e.date, e.type === 'save' ? 'savings' : e.type === 'income' ? INCOME_KINDS[e.kind || 'paycheck'] : 'expense', e.type === 'income' ? e.amount : -e.amount, e.type === 'expense' ? catOf(e.catId).name : '', e.type === 'expense' ? (nwOf(e) === 'needs' ? 'Need' : 'Want') : '', g ? g.name : '', e.source || '', e.note || '']);
  }
  return rows.map(r => r.map(q).join(',')).join('\n');
}
function pickFile(accept, cb) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.hidden = true;
  i.addEventListener('change', () => { if (i.files && i.files[0]) i.files[0].text().then(cb); i.remove(); });
  document.body.appendChild(i); i.click();
}
async function prepareBackup() {
  const photos = gs().photosInBackup ? await receiptsForBackup() : {};
  BACKUP = JSON.stringify({ app: 'payday-ledger', version: 3, exportedAt: new Date().toISOString(), profile: Object.assign({}, profile, { pinHash: '' }), entries: all(), receipts: photos });
}
function restoreBackup(txt) {
  let data; try { data = JSON.parse(txt); } catch (_) { data = null; }
  if (!data || !data.profile || !Array.isArray(data.entries)) { toast('That file isn’t a Payday Ledger backup.'); return; }
  confirmSheet('Restore this backup?', `It has ${data.entries.length} entries${data.exportedAt ? ' from ' + esc(short(data.exportedAt.slice(0, 10))) : ''}. Everything in the app now will be replaced.`, 'Replace and restore', () => {
    const pin = profile.pinHash;
    profile = normalize(data.profile);
    profile.pinHash = pin;
    profile.setupDone = true;
    if (!profile.goals.some(g => g.kind === 'emergency')) profile.goals.unshift({ id: newId('g'), kind: 'emergency', name: 'Emergency fund', target: STARTER_FUND, initial: 0 });
    if (!profile.goals.some(g => g.kind === 'buffer')) profile.goals.splice(1, 0, { id: newId('g'), kind: 'buffer', name: 'One month ahead', target: 1500, initial: 0 });
    entries = new Map(data.entries.filter(e => e && e.id && e.type && isFinite(e.amount) && e.date).map(e => [e.id, e]));
    persist(); restoreReceipts(data.receipts).then(render); toast('Backup restored');
  }, false);
}

/* ---------- PIN lock ---------- */
async function sha(s) {
  if (!(window.crypto && crypto.subtle)) return 'plain:' + s;
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('payday-ledger:' + s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
function lockNow() { if (!profile.pinHash) return; $('#lock').hidden = false; $('#lock-pin').value = ''; setTimeout(() => $('#lock-pin').focus(), 50); }
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (profile.pinHash && hiddenAt && Date.now() - hiddenAt > 60e3) lockNow();
});

/* ---------- Actions ---------- */
function toggleBill(el) {
  const key = el.dataset.key, paid = billPayment(key);
  if (paid) { deleteEntry(paid.id); toast('Marked unpaid'); render(); return; }
  const b = profile.bills.find(x => x.id === el.dataset.bill); if (!b) return;
  const date = el.dataset.date > toStr(today()) ? toStr(today()) : el.dataset.date;
  putEntry({ id: newId('e'), type: 'expense', amount: Number(b.amount), catId: b.catId || 'other', note: b.name, date, billKey: key, debtId: b.debtId || null, onTime: el.dataset.date >= toStr(today()), created: Date.now() });
  toast(b.name + ' marked paid'); render();
}

const actions = {
  close: closeSheet,
  tab: el => { closeSheet(); if (location.hash.slice(1) === el.dataset.tab) window.scrollTo(0, 0); location.hash = el.dataset.tab; },
  add: el => openEntry(el.dataset.type || 'expense', null, el.dataset.goal ? { goalId: el.dataset.goal } : {}),
  'edit-entry': el => { const e = entries.get(el.dataset.id); if (e) openEntry(e.type, e); },
  'delete-entry': el => confirmSheet('Delete this entry?', 'It will be removed from your history and totals.', 'Delete', () => { deleteEntry(el.dataset.id); toast('Deleted'); }),
  'save-now': el => openEntry('save', null, { amount: Number(el.dataset.amt) }),
  'toggle-bill': toggleBill,
  bill: el => openBill(el.dataset.id),
  'delete-bill': el => confirmSheet('Delete this bill?', 'Past payments stay in your history.', 'Delete bill', () => { profile.bills = profile.bills.filter(b => b.id !== el.dataset.id); saveProfile(); }),
  'cancel-sub': el => { const b = profile.bills.find(x => x.id === el.dataset.id); if (!b) return; confirmSheet(`Canceled ${esc(b.name)}?`, `I’ll remove it from your bills and count ${money0(billMonthly(b) * 12)} a year as freed up. Make sure it’s actually canceled with the company.`, 'Yes, it’s canceled', () => { profile.freed.push({ name: b.name, monthly: billMonthly(b), at: Date.now() }); profile.bills = profile.bills.filter(x => x.id !== b.id); saveProfile(); toast(`${money0(billMonthly(b) * 12)} a year back in your pocket`); }, false); },
  goal: el => openGoal(el.dataset.id),
  'delete-goal': el => confirmSheet('Delete this goal?', 'Deposits into it stay in your history but no longer count toward a goal.', 'Delete goal', () => { profile.goals = profile.goals.filter(g => g.id !== el.dataset.id); saveProfile(); }),
  debt: el => openDebt(el.dataset.id, el.dataset.coll),
  'delete-debt': el => confirmSheet('Delete this debt?', 'Payments you logged stay in your history.', 'Delete debt', () => { profile.debts = profile.debts.filter(d => d.id !== el.dataset.id); saveProfile(); }),
  'debt-method': el => { profile.debtMethod = el.dataset.m; saveProfile(); render(); },
  'no-collections': () => { profile.noCollections = true; saveProfile(); render(); },
  'edit-budgets': openBudgets,
  'toggle-investing': () => { profile.investing = !profile.investing; saveProfile(); render(); if (profile.investing) toast('That’s the long game. Good.'); },
  'match-date': openSettings,
  'raise-goal': el => { const g = profile.goals.find(x => x.id === el.dataset.id); if (g) { g.target = Number(el.dataset.t); saveProfile(); render(); toast('Goal updated'); } },
  month: el => { const n = ymShift(ui.month, Number(el.dataset.d)); if (n <= ymStr(today())) { ui.month = n; ui.chartSel = null; render(); } },
  filter: el => { ui.filter = el.dataset.f; render(); },
  'chart-sel': el => { ui.chartSel = Number(el.dataset.i); render(); },
  settings: openSettings,
  estimator: openEstimator,
  'clear-calib': () => { profile.pay.calib = null; profile.typicalPay = computeTypicalPay(); saveProfile(); openEstimator(); render(); },
  want: openWant,
  'want-buy': el => { const w = profile.wants.find(x => x.id === el.dataset.id); if (!w) return; w.decided = 'bought'; w.decidedAt = Date.now(); saveProfile(); openEntry('expense', null, { amount: w.price, note: w.name, catId: 'shopping' }); },
  'want-skip': el => { const w = profile.wants.find(x => x.id === el.dataset.id); if (!w) return; const before = gameStats(); w.decided = 'skipped'; w.decidedAt = Date.now(); saveProfile(); render(); gameOnSkip(w, before); confirmSheet('Skipped. Good call.', `That’s ${money(w.price)} you didn’t spend. Want to move it to savings so it actually counts?`, `Move ${money0(w.price)} to savings`, () => { putEntry({ id: newId('e'), type: 'save', amount: w.price, goalId: defaultGoalId(), date: toStr(today()), note: 'Skipped: ' + w.name, created: Date.now() }); toast('Moved to savings'); }, false); },
  'confirm-ok': () => { const fn = confirmFn; relock = false; closeSheet(); if (fn) { fn(); render(); } },
  'export-json': async () => {
    if (!BACKUP) await prepareBackup();
    const ok = await shareOrDownload(`payday-ledger-backup-${toStr(today())}.json`, BACKUP, 'application/json');
    if (ok === 'retry') { toast('Backup packed. Tap Back up once more to save it.'); return; }
    if (ok) { profile.lastBackup = Date.now(); saveProfile(); render(); toast('Backup saved. Keep it in iCloud Drive or Files.'); }
  },
  'export-csv': () => shareOrDownload(`payday-ledger-${toStr(today())}.csv`, csvExport(), 'text/csv'),
  'import-backup': () => pickFile('.json,application/json', restoreBackup),
  call: el => { const e = entries.get(el.dataset.id); if (!e) return; e.nw = el.dataset.nw; e.judgedBy = 'you'; e.conf = 'sure'; if (e.note) profile.rules[merchantKey(e.note)] = { catId: e.catId, nw: e.nw }; persist(); render(); toast(e.note ? `Got it. Next time I’ll know ${e.note}.` : 'Got it.'); },
  erase: () => confirmSheet('Erase everything?', 'This deletes every paycheck, expense, bill, goal and debt on this phone. Back up first if you might want them. This can’t be undone.', 'Erase everything', () => { profile = defaultProfile(); entries = new Map(); persist(); RDB.clear().catch(() => {}); location.hash = 'home'; }),
  'pin-off': () => { profile.pinHash = ''; saveProfile(); openSettings(); toast('PIN turned off'); },
  'forgot-pin': () => { $('#lock').hidden = true; confirmSheet('Forgot your PIN?', 'There’s no way to recover it. You can erase the app and restore from your last backup.', 'Erase and start over', () => { profile = defaultProfile(); entries = new Map(); persist(); location.hash = 'home'; }); relock = true; },
};

const forms = {
  setup(f, fd) {
    const err = $('#ob-err');
    const type = fd.get('ptype');
    gs().name = String(fd.get('hero') || '').trim().slice(0, 16);
    profile.payFrequency = fd.get('freq');
    profile.anchorPayday = fd.get('last') || toStr(today());
    profile.pay = Object.assign(profile.pay, { type, state: fd.get('state'), stateRate: parseFloat(fd.get('stateRate')) || 0 });
    if (type === 'hourly') {
      const rate = parseAmt(fd.get('rate')), hours = parseFloat(fd.get('hours'));
      if (!(rate > 0) || !(hours > 0)) { err.textContent = 'Enter your hourly rate and the hours a week you can count on.'; err.hidden = false; return; }
      profile.pay.rate = rate; profile.pay.hours = hours;
      profile.typicalPay = computeTypicalPay();
    } else {
      const pay = parseAmt(fd.get('pay'));
      if (!(pay > 0)) { err.textContent = 'Enter your take-home pay per check.'; err.hidden = false; return; }
      profile.typicalPay = pay;
    }
    const pay = profile.typicalPay;
    const split = SPLITS[fd.get('split')] || SPLITS.balanced;
    profile.split = { needs: split.needs, wants: split.wants, save: split.save };
    const monthly = pay * ppy() / 12;
    const rent = parseAmt(fd.get('rent'));
    const bal = parseAmt(fd.get('balance'));
    if (isFinite(bal)) profile.startBalance = { amount: bal, date: toStr(today()), at: Date.now() };
    const round5 = v => Math.max(0, Math.round(v / 5) * 5);
    const b = {};
    for (const c of CATS) if (c.w) b[c.id] = round5(monthly * c.w * (c.group === 'wants' ? split.wants / 30 : 1));
    b.housing = rent > 0 ? rent : round5(monthly * .3);
    profile.budgets = b;
    if (rent > 0 && !profile.bills.some(x => x.catId === 'housing')) profile.bills.push({ id: newId('b'), name: 'Rent', amount: rent, freq: 'monthly', dueDay: 1, catId: 'housing' });
    if (!goalKind('emergency')) profile.goals.unshift({ id: newId('g'), kind: 'emergency', name: 'Emergency fund', target: STARTER_FUND, initial: 0 });
    if (!goalKind('buffer')) profile.goals.push({ id: newId('g'), kind: 'buffer', name: 'One month ahead', target: Math.max(500, Math.round(monthlyOutflow() / 50) * 50), initial: 0 });
    if (!profile.goals.some(g => g.kind === 'custom' && /car/i.test(g.name))) profile.goals.push({ id: newId('g'), kind: 'custom', name: 'Car fund', target: 5000, deadline: toStr(addMonths(today(), 24)), initial: 0 });
    profile.setupDone = true;
    persist(); render();
    const save = pay * split.save / 100;
    openDialog('pip', [
      `So you’re ${heroName()}. Welcome to Tally Village, the edge of the Ledgerlands.`,
      `Each paycheck${type === 'hourly' ? ', about ' + money0(pay) + ' by my reckoning,' : ''} gets split three ways: ${money0(pay * split.needs / 100)} for needs, ${money0(pay * split.wants / 100)} for wants, ${money0(save)} for savings.`,
      'Every dollar you save is XP. Every want you log is a monster, and it bites off hearts.',
      'Each night, rest at Mabel’s inn on the Quests tab. A day with no wants is a clear day, and clear days in a row make you stronger.',
      'That’s all you need for now. More of the Ledgerlands opens up over your first week.',
      `Your first quest: fill the Ember Chest with $1,000. At ${money0(save)} a paycheck that’s about ${Math.ceil(STARTER_FUND / Math.max(1, save))} paychecks.`,
      'But first, tell me your bills and your debts. A hero should know the bosses on the road.',
    ], [...(profile.startBalance ? [{ label: 'Budget my starting gold', cls: 'gold', fn: openStartSplit }] : []), { label: 'Add bills', fn: () => openBill() }, { label: 'Add debts', cls: 'primary', fn: () => openDebt() }, { label: 'Start adventuring' }], 'Tally Village');
  },
  entry(f, fd) {
    const amount = parseAmt(fd.get('amount'));
    const err = $('#f-err');
    if (!(amount > 0)) { err.textContent = 'Enter an amount greater than zero.'; err.hidden = false; return; }
    const id = f.dataset.id || newId('e');
    const old = entries.get(id) || {};
    const type = f.dataset.type;
    const e = { id, type, amount, date: fd.get('date') || toStr(today()), note: String(fd.get('note') || '').trim(), created: old.created || Date.now() };
    if (type === 'expense') {
      e.catId = fd.get('cat') || 'other'; e.nw = fd.get('nw') || catOf(e.catId).group;
      const mine = f.dataset.unw || f.dataset.ucat;
      e.judgedBy = mine ? 'you' : (old.judgedBy || 'arti');
      e.conf = mine || fd.get('conf') === 'empty' || fd.get('conf') === 'you' ? 'sure' : fd.get('conf');
      if (mine && e.note) profile.rules[merchantKey(e.note)] = { catId: e.catId, nw: e.nw };
      e.debtId = fd.get('debt') || null; e.billKey = old.billKey; e.onTime = old.onTime; lastCat = e.catId;
      if (old.treat || (!f.dataset.id && fd.get('treat') && e.nw === 'wants' && gs().tokens > 0)) e.treat = true;
    }
    if (type === 'income') {
      e.kind = fd.get('kind') || 'paycheck';
      e.source = String(fd.get('source') || '').trim();
      if (e.kind === 'paycheck') e.hours = parseFloat(fd.get('hours')) || null;
      if (e.kind === 'scholarship') e.spreadMonths = Number(fd.get('spread')) || 1;
    }
    if (type === 'save') { e.goalId = fd.get('goal'); if (fd.get('dir') === 'out') e.amount = -amount; }
    if (type !== 'save') e.receipts = commitReceipts(old.receipts);
    putEntry(e);
    closeSheet(); render();
    if (type === 'income' && !f.dataset.id && e.kind === 'paycheck') openPayday(e);
    else if (type === 'expense' && !f.dataset.id && e.conf === 'unsure') toast('Logged. Arti needs your call on this one.');
    else if (type === 'expense' && !f.dataset.id && e.nw === 'wants') toast(`Want. That was ${workHours(amount) || 'money you worked for'}.`);
    else toast(f.dataset.id ? 'Saved' : type === 'save' ? (e.amount > 0 ? 'Moved to savings' : 'Withdrawn') : 'Added');
  },
  quick(f, fd) {
    const what = String(fd.get('what') || '').trim(), amount = parseAmt(fd.get('amount'));
    if (!what || !(amount > 0)) { toast('Type what it was and how much.'); return; }
    const j = judge(what, amount);
    const q = RForm.quick; RForm.quick = null;
    if (q) RDB.put(q.id, q.blob).catch(() => toast('Couldn’t save the photo.'));
    putEntry({ id: newId('e'), type: 'expense', amount, date: toStr(today()), note: what, catId: j.catId, nw: j.nw, conf: j.conf, judgedBy: 'arti', debtId: j.debtId, receipts: q ? [q.id] : undefined, created: Date.now() });
    lastCat = j.catId; render();
    toast(j.conf === 'unsure' ? 'Logged. Arti needs your call on this one.' : `${j.nw === 'needs' ? 'Need' : 'Want'}: ${catOf(j.catId).name}.${j.nw === 'wants' && workHours(amount) ? ' That was ' + workHours(amount) + '.' : ''}`);
  },
  split(f, fd) {
    const amount = parseAmt(fd.get('amount'));
    if (amount > 0 && fd.get('goal')) putEntry({ id: newId('e'), type: 'save', amount, goalId: fd.get('goal'), date: fd.get('date') || toStr(today()), note: 'Paycheck split', created: Date.now() });
    closeSheet(); render(); toast(amount > 0 ? money(amount) + ' moved to savings' : 'Paycheck logged');
  },
  calib(f, fd) {
    const gross = parseAmt(fd.get('gross')), net = parseAmt(fd.get('net'));
    const err = $('#cal-err');
    if (!(gross > 0) || !(net > 0) || net >= gross) { err.textContent = 'Enter gross and net from the same paystub. Net is the smaller one.'; err.hidden = false; return; }
    const raw = estimateCheck(gross, Object.assign({}, profile.pay, { calib: null })).raw;
    profile.pay.calib = { ratio: net / raw, at: Date.now() };
    profile.typicalPay = computeTypicalPay();
    saveProfile(); openEstimator(); render(); toast('Estimates now match your paystub');
  },
  want(f, fd) {
    const price = parseAmt(fd.get('price'));
    const name = String(fd.get('name') || '').trim();
    if (!name || !(price > 0)) { const e = $('#w-err'); e.textContent = 'Enter what it is and the price.'; e.hidden = false; return; }
    profile.wants.push({ id: newId('w'), name, price, added: Date.now() });
    profile.wants = profile.wants.filter(w => !w.decided || Date.now() - w.decidedAt < 90 * 864e5 || w.decided === 'skipped');
    saveProfile(); closeSheet(); render(); toast('On the list. Check back in 48 hours.');
  },
  bill(f, fd) {
    const amount = parseAmt(fd.get('amount')), freq = fd.get('freq'), day = Math.round(Number(fd.get('day')));
    const err = $('#b-err');
    if (!(amount > 0) || (freq === 'monthly' && !(day >= 1 && day <= 31)) || (freq === 'once' && !fd.get('due'))) { err.textContent = freq === 'once' ? 'Enter an amount and a due date.' : 'Enter an amount and a due day between 1 and 31.'; err.hidden = false; return; }
    const data = { name: String(fd.get('name')).trim(), amount, freq, dueDay: freq === 'monthly' ? day : 1, anchor: fd.get('anchor') || toStr(today()), due: freq === 'once' ? fd.get('due') : undefined, catId: fd.get('cat'), debtId: fd.get('debt') || '' };
    const id = f.dataset.id;
    if (id) Object.assign(profile.bills.find(b => b.id === id), data); else profile.bills.push(Object.assign({ id: newId('b'), created: Date.now() }, data));
    saveProfile(); closeSheet(); render(); toast(id ? 'Bill saved' : 'Bill added');
  },
  goal(f, fd) {
    const target = parseAmt(fd.get('target'));
    if (!(target > 0)) { const e = $('#g-err'); e.textContent = 'Enter a target amount.'; e.hidden = false; return; }
    const data = { name: String(fd.get('name')).trim(), target, deadline: fd.get('deadline') || '', initial: parseAmt(fd.get('initial')) || 0 };
    const id = f.dataset.id;
    if (id) Object.assign(profile.goals.find(g => g.id === id), data); else profile.goals.push(Object.assign({ id: newId('g'), kind: 'custom' }, data));
    saveProfile(); closeSheet(); render(); toast(id ? 'Goal saved' : 'Goal created');
  },
  debt(f, fd) {
    const balance = parseAmt(fd.get('balance'));
    if (!(balance >= 0)) { const e = $('#d-err'); e.textContent = 'Enter the current balance.'; e.hidden = false; return; }
    const type = fd.get('type');
    const data = { name: String(fd.get('name')).trim(), type, balance, apr: parseFloat(fd.get('apr')) || 0, minPayment: parseAmt(fd.get('min')) || 0, asOfTs: Date.now() };
    if (type === 'collection') { data.agency = String(fd.get('agency') || '').trim(); data.status = fd.get('status') || 'new'; }
    const id = f.dataset.id;
    const prevD = id && profile.debts.find(d => d.id === id);
    data.startBalance = Math.max(Number(prevD && prevD.startBalance) || 0, balance);
    if (id) Object.assign(prevD, data); else profile.debts.push(Object.assign({ id: newId('d') }, data));
    if (type === 'collection') profile.noCollections = false;
    saveProfile(); closeSheet(); render(); toast(id ? 'Debt saved' : 'Debt added');
  },
  budgets(f, fd) {
    const b = {};
    for (const c of CATS) { const v = parseAmt(fd.get(c.id)); if (v > 0) b[c.id] = v; }
    profile.budgets = b; saveProfile(); closeSheet(); render(); toast('Budgets saved');
  },
  settings(f, fd) {
    const n = Number(fd.get('needs')), w = Number(fd.get('wants')), s = Number(fd.get('save'));
    const err = $('#s-err');
    if (n + w + s !== 100 || [n, w, s].some(v => !(v >= 0))) { err.textContent = `Your split adds up to ${n + w + s}%. Make it 100%.`; err.hidden = false; return; }
    const type = fd.get('ptype');
    profile.payFrequency = fd.get('freq');
    profile.anchorPayday = fd.get('anchor') || profile.anchorPayday;
    profile.pay.type = type;
    profile.pay.mode = fd.get('payMode') === 'estimate' ? 'estimate' : 'actual';
    if (type === 'hourly') {
      profile.pay.rate = parseAmt(fd.get('rate')) || profile.pay.rate;
      profile.pay.hours = parseFloat(fd.get('hours')) || profile.pay.hours;
      profile.pay.pretax = parseAmt(fd.get('pretax')) || 0;
      profile.pay.state = fd.get('state');
      profile.pay.stateRate = parseFloat(fd.get('stateRate')) || 0;
      profile.typicalPay = computeTypicalPay();
    } else profile.typicalPay = parseAmt(fd.get('pay')) || profile.typicalPay;
    profile.split = { needs: n, wants: w, save: s };
    profile.matchDate = fd.get('match') || '';
    const sbRaw = String(fd.get('startBal') || '').trim(), sbAmt = parseAmt(sbRaw);
    if (!sbRaw) delete profile.startBalance;
    let newStart = false;
    if (isFinite(sbAmt) && (!profile.startBalance || sbAmt !== profile.startBalance.amount)) { profile.startBalance = { amount: sbAmt, date: toStr(today()), at: Date.now() }; newStart = true; }
    saveProfile(); closeSheet(); render(); toast('Settings saved');
    if (newStart) openStartSplit();
  },
  hero(f, fd) {
    const g = gs();
    g.name = String(fd.get('hero') || '').trim().slice(0, 16); g.sound = !!fd.get('sound'); g.photosInBackup = !!fd.get('photos');
    g.look = { race: fd.get('race') === 'human' ? 'human' : 'elf', hair: HAIR[fd.get('hair')] ? fd.get('hair') : 'black', glasses: !!fd.get('glasses') };
    openSettings();
    saveProfile(); BACKUP = null; prepareBackup(); toast('Hero saved'); render();
    document.querySelector('#sound-btn img').src = spriteURL(g.sound ? 'note' : 'noteOff');
  },
  async pin(f, fd) {
    const pin = String(fd.get('pin') || '');
    if (!/^\d{4,8}$/.test(pin)) { toast('Use 4 to 8 digits.'); return; }
    profile.pinHash = await sha(pin); saveProfile(); openSettings(); toast('PIN set. The app locks after a minute away.');
  },
  async unlock(f, fd) {
    const ok = (await sha(String(fd.get('pin') || ''))) === profile.pinHash;
    if (ok) { $('#lock').hidden = true; $('#lock-err').hidden = true; }
    else { const e = $('#lock-err'); e.textContent = 'Wrong PIN.'; e.hidden = false; $('#lock-pin').value = ''; }
  },
};

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.tagName === 'INPUT') return;
  const fn = actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, fn = forms[f.dataset.form];
  if (fn) fn(f, new FormData(f));
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'search') {
    ui.search = t.value; const pos = t.selectionStart; render();
    const s = $('#search'); if (s) { s.focus(); try { s.setSelectionRange(pos, pos); } catch (_) { /* unsupported */ } }
  } else if (t.id === 'projector') {
    ui.projector = Number(t.value); $('#proj-amt').textContent = money0(ui.projector); $('#proj-out').innerHTML = projectorStats(ui.projector);
  } else if (t.id && t.id.startsWith('bud-')) updateBudgetTotal();
  else if (t.id === 'est-hours' || t.id === 'est-ot') updateEstimator();
  else if (t.id === 'f-amount' && $('#f-work')) { $('#f-work').textContent = workHours(parseAmt(t.value)); refreshVerdict(); }
  else if (t.id === 'f-what') refreshVerdict();
  else if (t.id === 'q-what' || t.id === 'q-amt') { const amt = parseAmt($('#q-amt').value) || 0; $('#q-verdict').innerHTML = verdictHTML(judge($('#q-what').value, amt), amt); }
  else if (t.id === 'w-price') $('#w-work').textContent = workHours(parseAmt(t.value)) ? 'That’s ' + workHours(parseAmt(t.value)) + '.' : '';
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'debt-extra') { profile.debtExtra = parseAmt(t.value) || 0; saveProfile(); render(); }
  else if (t.name === 'ptype' && t.closest('[data-form="setup"]')) { const h = t.value === 'hourly'; $('#ob-hourly').hidden = !h; $('#ob-hours-hint').hidden = !h; $('#ob-salary').hidden = h; }
  else if (t.name === 'ptype' && t.closest('[data-form="settings"]')) { const h = t.value === 'hourly'; $('#s-hourly').hidden = !h; $('#s-salary').hidden = h; }
  else if (t.id === 'ob-state') $('#ob-state-rate').hidden = t.value === 'MN';
  else if (t.name === 'state' && t.closest('[data-form="settings"]')) $('#s-state-rate').hidden = t.value === 'MN';
  else if (t.name === 'freq' && t.closest('[data-form="bill"]')) { const v = t.value; $('#b-day-wrap').hidden = v !== 'monthly'; $('#b-anchor-wrap').hidden = v !== 'biweekly'; $('#b-due-wrap').hidden = v !== 'once'; $('#b-once-hint').hidden = v !== 'once'; }
  else if (t.name === 'kind' && t.closest('[data-form="entry"]')) { $('#f-hours-wrap').hidden = t.value !== 'paycheck' || profile.pay.type !== 'hourly'; $('#f-spread-wrap').hidden = t.value !== 'scholarship'; $('#f-spread-hint').hidden = t.value !== 'scholarship'; $('#f-source').placeholder = t.value === 'scholarship' ? 'School or scholarship name' : t.value === 'paycheck' ? 'Employer' : 'Where from'; }
  else if (t.id === 'd-type') { const c = t.value === 'collection'; $('#d-coll').hidden = !c; }
  else if (t.name === 'nw' && t.closest('[data-form="entry"]')) { t.form.dataset.unw = '1'; refreshVerdict(); }
  else if (t.name === 'cat' && t.closest('[data-form="entry"]')) { t.form.dataset.ucat = '1'; refreshVerdict(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheetRoot.hidden) closeSheet(); });

function readHash() {
  const h = location.hash.replace('#', '');
  ui.tab = TITLES[h] ? h : 'home';
  if (!profile) return;
  closeSheet(); render(); window.scrollTo(0, 0);
}
window.addEventListener('hashchange', readHash);

Object.assign(actions, gameActions, receiptActions);
Object.assign(forms, gameForms);
(async () => {
  await load();
  hydrateSprites();
  document.querySelector('#sound-btn img').src = spriteURL(gs().sound ? 'note' : 'noteOff');
  readHash();
  if (profile.pinHash) lockNow();
  prepareBackup();
})();
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (_) { /* best effort */ }
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
