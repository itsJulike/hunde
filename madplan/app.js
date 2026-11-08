'use strict';

// Madplan: planlæg ugens aftensmad med opskrifterne fra ../opskrifter og lav en samlet indkøbsliste.
// Planen gemmes i madplan/plan.json i GitHub-repoet (med samme GitHub-nøgle som opskriftsappen),
// og altid også på enheden, så den virker offline.

const app = document.getElementById('app');
const REPO = 'itsJulike/hunde';
const BRANCH = 'main';
const PLAN = 'madplan/plan.json';
const RECIPES = 'opskrifter/recipes.json';
const OPSKRIFTER = '../opskrifter/';
const DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
// Kategorier, der ikke er aftensmad. De er fravalgt i forslag, indtil man selv vælger dem til.
const NOT_DINNER = ['Kager', 'Småkager', 'Tærter', 'Brød', 'Bagværk', 'Kiks', 'Dessert', 'Desserter', 'Is', 'Drikke', 'Drinks', 'Morgenmad', 'Snacks', 'Slik'];

const state = {
  recipes: [],
  plan: load('madplan', {}),               // { "2026-W46": { dage: [7 × null | {opskrift, x} | {tekst}], ekstra: [] } }
  dirty: new Set(load('madplanUsynk', [])), // uger, der er ændret her og ikke gemt på GitHub endnu
  rev: {},
  week: null,
  sync: { kind: '', msg: '' }
};

/* ---------- Hjælpere ---------- */
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* privat tilstand e.l. */ }
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s).toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa');
const da = new Intl.Collator('da');
const keys = () => ({ github: load('githubNoegle', '') });

function tone(r) {
  let h = 0;
  for (const ch of r.kategori || r.titel) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 't' + ((h % 6) + 1);
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2300);
}

const svg = (w, body, extra = '') => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${body}</svg>`;
const icon = {
  back: svg(22, '<path d="m15 18-6-6 6-6"/>', 'stroke-width="2.4"'),
  prev: svg(20, '<path d="m15 18-6-6 6-6"/>', 'stroke-width="2.4"'),
  next: svg(20, '<path d="m9 18 6-6-6-6"/>', 'stroke-width="2.4"'),
  cart: svg(22, '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h3l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L21 8H6.3"/>', 'stroke-width="2"'),
  book: svg(22, '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2Zm0 0A2 2 0 0 0 6 22h13"/>', 'stroke-width="2"'),
  gear: svg(22, '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>', 'stroke-width="2"'),
  shuffle: svg(19, '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="m4 4 5 5"/>'),
  swap: svg(19, '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>', 'stroke-width="2"'),
  x: svg(19, '<path d="M6 6l12 12M18 6 6 18"/>'),
  plus: svg(20, '<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.4"'),
  share: svg(20, '<path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>', 'stroke-width="2"'),
  todoist: svg(20, '<path d="M4 12l8 4.5 8-4.5"/><path d="M4 16.5 12 21l8-4.5"/><path d="M4 7.5 12 3l8 4.5-8 4.5Z"/>', 'stroke-width="2"'),
  search: svg(18, '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>')
};

/* ---------- Uger ---------- */
// ISO-ugenummer, som i en dansk kalender: ugen starter mandag, uge 1 er ugen med årets første torsdag.
function weekKey(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
  const y = t.getUTCFullYear();
  const w = Math.floor((t - Date.UTC(y, 0, 1)) / 864e5 / 7) + 1;
  return `${y}-W${String(w).padStart(2, '0')}`;
}
function weekStart(key) {
  const [y, w] = key.split('-W').map(Number);
  const d = new Date(y, 0, 4);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + (w - 1) * 7);
  return d;
}
function dayDate(key, i) {
  const d = weekStart(key);
  d.setDate(d.getDate() + i);
  return d;
}
function shiftWeek(key, n) {
  const d = weekStart(key);
  d.setDate(d.getDate() + 7 * n + 3);
  return weekKey(d);
}
const weekNo = (key) => Number(key.split('-W')[1]);
function weekRange(key) {
  const a = dayDate(key, 0);
  const b = dayDate(key, 6);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}.–${b.getDate()}. ${MONTHS[b.getMonth()]}`
    : `${a.getDate()}. ${MONTHS[a.getMonth()].slice(0, 3)}. – ${b.getDate()}. ${MONTHS[b.getMonth()].slice(0, 3)}.`;
}
const shortDate = (d) => `${d.getDate()}. ${MONTHS[d.getMonth()].slice(0, 3)}.`;
const blankWeek = () => ({ dage: Array(7).fill(null), ekstra: [] });
const getWeek = (key) => state.plan[key] || blankWeek();
const isEmptyWeek = (w) => w.dage.every((d) => !d) && !w.ekstra.length;

// Ændrer en uge og sørger for, at den bliver gemt.
function editWeek(key, change) {
  const w = structuredClone(getWeek(key));
  change(w);
  if (isEmptyWeek(w)) delete state.plan[key];
  else state.plan[key] = w;
  changed(key);
}

/* ---------- Mængder (samme regler som i opskriftsappen) ---------- */
const FRAC = { '½': 1 / 2, '¼': 1 / 4, '¾': 3 / 4, '⅓': 1 / 3, '⅔': 2 / 3 };
const NUM = '\\d+\\/\\d+|\\d+(?:[.,]\\d+)?(?:\\s?[½¼¾⅓⅔])?|[½¼¾⅓⅔]';
const QTY = `(^|[^\\d.,/½¼¾⅓⅔])(${NUM})(?:(\\s*[-–]\\s*)(${NUM}))?(?![\\d.,/½¼¾⅓⅔]|\\s*[-–]\\s*\\d)`;
const reIng = new RegExp(QTY + '(?!\\s*(?:%|°|cm|mm|min|grader|timer?\\b))', 'g');

function qtyVal(s) {
  if (s.includes('/')) { const [a, b] = s.split('/'); return a / b; }
  const m = s.match(/^(\d+(?:[.,]\d+)?)?\s?([½¼¾⅓⅔])?$/);
  return (m[1] ? parseFloat(m[1].replace(',', '.')) : 0) + (m[2] ? FRAC[m[2]] : 0);
}
function fmtQty(v) {
  if (v >= 100) return String(Math.round(v / 5) * 5);
  if (v >= 20) return String(Math.round(v));
  let whole = Math.floor(v);
  const fr = [[0, ''], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'], [1, '']]
    .find(([x]) => Math.abs(v - whole - x) < 0.04);
  if (!fr) return String(Math.round(v * 10) / 10).replace('.', ',');
  if (fr[0] === 1) whole += 1;
  return whole || !fr[1] ? whole + fr[1] : fr[1];
}
function scaled(text, f, re) {
  if (f === 1) return esc(text);
  let out = '';
  let last = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index + m[1].length;
    out += esc(text.slice(last, start));
    out += `<b class="q">${fmtQty(qtyVal(m[2]) * f)}${m[4] ? m[3] + fmtQty(qtyVal(m[4]) * f) : ''}</b>`;
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}
function scaledYield(u, f) {
  if (f === 1) return esc(u);
  if (/pr\./i.test(u) || /^1(?![\d.,½¼¾⅓⅔])/.test(u) || !/\d/.test(u)) return `${esc(u)} <b class="q">×${fmtQty(f)}</b>`;
  return scaled(u, f, reIng);
}
const FACTORS = [0.5, 1, 1.5, 2, 3];

/* ---------- Indkøbsliste ---------- */
// Enheder, der lægges sammen: g og kg bliver til g, l/dl/cl/ml til dl.
const UNIT = { g: ['g', 1], gram: ['g', 1], kg: ['g', 1000], dl: ['dl', 1], l: ['dl', 10], liter: ['dl', 10], cl: ['dl', 0.1], ml: ['dl', 0.01],
  tsk: ['tsk', 1], spsk: ['spsk', 1], stk: ['stk', 1], fed: ['fed', 1], 'dåse': ['dåse', 1], 'dåser': ['dåse', 1], pakke: ['pakke', 1], pakker: ['pakke', 1],
  bundt: ['bundt', 1], knivspids: ['knivspids', 1], skive: ['skiver', 1], skiver: ['skiver', 1], 'håndfuld': ['håndfuld', 1] };
const reLine = new RegExp(`^(?:ca\\.?\\s*)?(${NUM})(?:\\s*[-–]\\s*(${NUM}))?\\s*(?:(${Object.keys(UNIT).join('|')})\\.?(?=\\s|$))?\\s*(.*)$`, 'i');

// "180 g smør (jeg brugte …), blødt" → { amount: 180, unit: 'g', name: 'smør' }
function parseIngredient(text) {
  const clean = text.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  const m = clean.match(reLine);
  let name = m ? m[4] : clean;
  name = name.split(',')[0].trim() || name.trim();
  if (!m) return { name, unit: '', lo: 0, hi: 0 };
  const [unit, mult] = m[3] ? UNIT[m[3].toLowerCase()] : ['', 1];
  const lo = qtyVal(m[1]) * mult;
  return { name, unit, lo, hi: m[2] ? qtyVal(m[2]) * mult : lo };
}

function fmtAmount(unit, lo, hi) {
  let u = unit;
  if (unit === 'g' && lo >= 1000) { lo /= 1000; hi /= 1000; u = 'kg'; }
  if (unit === 'dl' && lo >= 10) { lo /= 10; hi /= 10; u = 'l'; }
  if (hi > 1 + 1e-9) u = { 'dåse': 'dåser', pakke: 'pakker' }[u] || u;
  const n = Math.abs(hi - lo) > 1e-9 ? `${fmtQty(lo)}–${fmtQty(hi)}` : fmtQty(lo);
  return u ? `${n} ${u}` : n;
}

// Samler ugens ingredienser. Samme vare fra flere retter lægges sammen, hvis enheden passer.
function shoppingList(key) {
  const items = new Map();
  getWeek(key).dage.forEach((d, i) => {
    const r = d?.opskrift && state.recipes.find((x) => x.id === d.opskrift);
    if (!r) return;
    for (const line of r.ingredienser) {
      if (/:\s*$/.test(line)) continue; // overskrifter som "Fyld:"
      const p = parseIngredient(line);
      if (!p.name) continue;
      const k = norm(p.name);
      if (!items.has(k)) items.set(k, { key: k, name: p.name, amounts: new Map(), loose: false, from: [] });
      const it = items.get(k);
      if (p.lo) {
        const a = it.amounts.get(p.unit) || { lo: 0, hi: 0 };
        a.lo += p.lo * (d.x || 1);
        a.hi += p.hi * (d.x || 1);
        it.amounts.set(p.unit, a);
      } else it.loose = true;
      const who = `${r.titel} (${DAYS[i].slice(0, 3).toLowerCase()})`;
      if (!it.from.includes(who)) it.from.push(who);
    }
  });
  return [...items.values()]
    .map((it) => {
      const amount = [...it.amounts].map(([u, a]) => fmtAmount(u, a.lo, a.hi)).join(' + ');
      return { key: it.key, label: amount ? `${amount} ${it.name}` : it.name.charAt(0).toUpperCase() + it.name.slice(1), from: it.from, sortName: it.name };
    })
    .sort((a, b) => da.compare(a.sortName, b.sortName));
}

/* ---------- Forslag ---------- */
const categories = () => [...new Set(state.recipes.map((r) => r.kategori || 'Andet'))].sort(da.compare);
function allowedCats() {
  const all = categories();
  const chosen = load('forslagKategorier', null);
  if (Array.isArray(chosen)) return new Set(chosen.filter((c) => all.includes(c)));
  const dinner = all.filter((c) => !NOT_DINNER.includes(c));
  return new Set(dinner.length ? dinner : all);
}

// Vælger en opskrift: først dem, der ikke er brugt i ugen, derefter dem, der er længst siden man har brugt.
function suggest(key, w, skip = []) {
  const cats = allowedCats();
  const pool = state.recipes.filter((r) => cats.has(r.kategori || 'Andet') && !skip.includes(r.id));
  if (!pool.length) return null;
  const last = {};
  for (const [k, wk] of Object.entries(state.plan)) {
    if (k >= key) continue;
    for (const d of wk.dage) if (d?.opskrift && (last[d.opskrift] || '') < k) last[d.opskrift] = k;
  }
  const inWeek = (id) => w.dage.filter((d) => d?.opskrift === id).length;
  const ranked = pool
    .map((r) => ({ r, a: inWeek(r.id), b: last[r.id] || '', c: Math.random() }))
    .sort((x, y) => x.a - y.a || (x.b < y.b ? -1 : x.b > y.b ? 1 : 0) || x.c - y.c);
  return ranked[0].r;
}

/* ---------- GitHub ---------- */
function fail(msg, kind = '') {
  const ex = new Error(msg);
  ex.kind = kind;
  return ex;
}
const textToB64 = (s) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const b64ToText = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

async function github(path, { method = 'GET', body, raw = false } = {}) {
  const token = keys().github;
  if (!token) throw fail('Tilføj din GitHub-nøgle under Indstillinger.', 'nokey');
  let res;
  try {
    res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}${method === 'GET' ? `?ref=${BRANCH}` : ''}`, {
      method,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: body && JSON.stringify({ branch: BRANCH, ...body })
    });
  } catch {
    throw fail('Ingen forbindelse.', 'offline');
  }
  if (res.status === 401) throw fail('GitHub-nøglen virker ikke (måske er den udløbet).', 'auth');
  if (res.status === 403 || (res.status === 404 && method !== 'GET')) throw fail(`GitHub-nøglen må ikke skrive i ${REPO}.`, 'auth');
  if (res.status === 409 || (res.status === 422 && method !== 'GET')) throw fail('Filen blev ændret imens.', 'conflict');
  if (!res.ok && res.status !== 404) throw fail(`GitHub svarede med fejl ${res.status}.`);
  return res;
}

async function loadRecipes() {
  if (keys().github) {
    try {
      const res = await github(RECIPES, { raw: true });
      if (res.ok) return await res.json();
    } catch { /* falder tilbage til siden */ }
  }
  return (await fetch(OPSKRIFTER + 'recipes.json', { cache: 'no-cache' })).json();
}

async function loadRemotePlan() {
  if (keys().github) {
    const res = await github(PLAN, { raw: true });
    return res.status === 404 ? {} : res.json();
  }
  const res = await fetch('plan.json', { cache: 'no-cache' });
  return res.ok ? res.json() : {};
}

// Lægger planen fra GitHub ind, men beholder de uger, der er ændret her og ikke gemt endnu.
function mergeRemote(remote) {
  const next = { ...remote };
  for (const k of state.dirty) {
    if (state.plan[k]) next[k] = state.plan[k];
    else delete next[k];
  }
  state.plan = next;
  save('madplan', state.plan);
}

let saveTimer = null;
let pushing = false;
let pushAgain = false;

function changed(key) {
  state.rev[key] = (state.rev[key] || 0) + 1;
  state.dirty.add(key);
  save('madplan', state.plan);
  save('madplanUsynk', [...state.dirty]);
  if (!keys().github) return setSync('local');
  setSync('pending');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(push, 1200);
}

async function push() {
  if (!keys().github || !state.dirty.size) return;
  if (pushing) { pushAgain = true; return; }
  pushing = true;
  setSync('saving');
  try {
    for (let i = 0; ; i++) {
      const f = await (await github(PLAN)).json().catch(() => null);
      const exists = f && f.sha;
      const remote = !exists ? {} : JSON.parse(f.content ? b64ToText(f.content) : await (await github(PLAN, { raw: true })).text());
      const sent = [...state.dirty].map((k) => [k, state.rev[k] || 0]);
      for (const [k] of sent) {
        if (state.plan[k]) remote[k] = state.plan[k];
        else delete remote[k];
      }
      const ordered = Object.fromEntries(Object.keys(remote).sort().map((k) => [k, remote[k]]));
      const weeks = sent.map(([k]) => 'uge ' + weekNo(k)).join(', ');
      try {
        await github(PLAN, { method: 'PUT', body: { message: `Madplan: ${weeks}`, content: textToB64(JSON.stringify(ordered, null, 1) + '\n'), ...(exists && { sha: f.sha }) } });
      } catch (ex) {
        if (ex.kind === 'conflict' && i < 2) continue;
        throw ex.kind === 'conflict' ? fail('Madplanen blev ændret et andet sted samtidig.') : ex;
      }
      for (const [k, rev] of sent) if ((state.rev[k] || 0) === rev) state.dirty.delete(k);
      save('madplanUsynk', [...state.dirty]);
      mergeRemote(ordered);
      setSync(state.dirty.size ? 'pending' : 'saved');
      break;
    }
  } catch (ex) {
    setSync('error', ex);
  } finally {
    pushing = false;
    if (pushAgain) { pushAgain = false; push(); }
  }
}

function setSync(kind, ex) {
  const msg = {
    local: 'Planen gemmes kun på denne enhed. Tilføj GitHub-nøglen under <a href="#/indstillinger">Indstillinger</a> for at dele den med de andre.',
    pending: 'Gemmer…',
    saving: 'Gemmer…',
    saved: 'Gemt ✓',
    error: `${esc(ex?.message || 'Kunne ikke gemme.')} Ændringerne er gemt på enheden. <button type="button" class="linkbtn" data-retry>Prøv igen</button>${ex?.kind === 'auth' ? ' · <a href="#/indstillinger">Indstillinger</a>' : ''}`
  }[kind];
  state.sync = { kind, msg };
  const el = document.getElementById('sync');
  if (el) paintSync(el);
}
function paintSync(el) {
  el.className = 'sync ' + state.sync.kind;
  el.innerHTML = state.sync.msg;
  el.hidden = !state.sync.msg;
  if (state.sync.kind === 'saved') setTimeout(() => { if (state.sync.kind === 'saved') { state.sync = { kind: '', msg: '' }; el.hidden = true; } }, 1800);
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-retry]')) push(); });

/* ---------- Todoist ---------- */
// Varer sendes til Todoist med Todoists Sync-API direkte fra telefonen. Nøglen gemmes kun på enheden.
const TODOIST = 'https://api.todoist.com/api/v1/sync';
const todoistKey = () => load('todoistNoegle', '');

async function todoistSync(form, token = todoistKey()) {
  if (!token) throw fail('Tilføj din Todoist-nøgle under <a href="#/indstillinger">Indstillinger</a>.', 'nokey');
  let res;
  try {
    res = await fetch(TODOIST, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form)
    });
  } catch {
    throw fail('Ingen forbindelse til Todoist.', 'offline');
  }
  if (res.status === 401 || res.status === 403) throw fail('Todoist-nøglen virker ikke. Tjek den under <a href="#/indstillinger">Indstillinger</a>.', 'auth');
  if (!res.ok) throw fail(`Todoist svarede med fejl ${res.status}.`);
  return res.json();
}

// Henter projekter og sektioner, så man kan vælge, hvor varerne skal hen.
async function todoistProjects(token) {
  const d = await todoistSync({ sync_token: '*', resource_types: JSON.stringify(['projects', 'sections']) }, token);
  const live = (x) => !x.is_deleted && !x.is_archived;
  const projects = (d.projects || []).filter(live).sort((a, b) => (b.inbox_project ? 1 : 0) - (a.inbox_project ? 1 : 0) || (a.child_order ?? 0) - (b.child_order ?? 0));
  return { projects, sections: (d.sections || []).filter(live).sort((a, b) => (a.section_order ?? 0) - (b.section_order ?? 0)) };
}

// Hvor varerne lander: { projekt, projektNavn, sektion, sektionNavn }. Standard er et projekt, der hedder noget med indkøb.
function defaultTarget({ projects }) {
  const p = projects.find((x) => /indk[øo]b|handle|shopping|grocer/i.test(x.name)) || projects.find((x) => x.inbox_project) || projects[0];
  return p ? { projekt: p.id, projektNavn: p.name, sektion: '', sektionNavn: '' } : null;
}

// Husker pr. uge, hvilke varer (med hvilken mængde) der er sendt, så de ikke sendes to gange.
const sentMap = (key) => load('todoistSendt', {})[key] || {};
function saveSent(key, map) {
  const all = load('todoistSendt', {});
  for (const k of Object.keys(all)) if (k < shiftWeek(weekKey(new Date()), -4)) delete all[k];
  if (Object.keys(map).length) all[key] = map;
  else delete all[key];
  save('todoistSendt', all);
}

async function sendToTodoist(key, items) {
  const target = load('todoistMaal', null);
  if (!todoistKey() || !target) throw fail('Tilføj din Todoist-nøgle og vælg et projekt under <a href="#/indstillinger">Indstillinger</a>.', 'nokey');
  const sent = sentMap(key);
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i += 50) {
    const chunk = items.slice(i, i + 50).map((x) => ({
      x,
      cmd: {
        type: 'item_add',
        uuid: crypto.randomUUID(),
        temp_id: crypto.randomUUID(),
        args: {
          content: x.label,
          description: [x.from.length ? 'Til ' + x.from.join(', ') : '', `Madplan uge ${weekNo(key)}`].filter(Boolean).join(' · '),
          project_id: target.projekt,
          ...(target.sektion && { section_id: target.sektion })
        }
      }
    }));
    const d = await todoistSync({ commands: JSON.stringify(chunk.map((c) => c.cmd)) });
    for (const { x, cmd } of chunk) {
      if (d.sync_status?.[cmd.uuid] === 'ok') { sent[x.id] = x.label; ok++; } else failed++;
    }
    saveSent(key, sent);
  }
  return { ok, failed };
}

/* ---------- Ugeplan ---------- */
function mealHTML(d, i) {
  if (!d) {
    return `<button class="emptyday" type="button" data-act="pick" data-i="${i}">${icon.plus}<span>Vælg ret</span></button>`;
  }
  const actions = (shuffle) => `<div class="meal-actions">
      ${shuffle ? `<button type="button" class="mini" data-act="shuffle" data-i="${i}" aria-label="Foreslå en anden ret">${icon.shuffle}</button>` : ''}
      <button type="button" class="mini" data-act="pick" data-i="${i}" aria-label="Vælg en anden ret">${icon.swap}</button>
      <button type="button" class="mini" data-act="clear" data-i="${i}" aria-label="Fjern">${icon.x}</button>
    </div>`;
  if (d.tekst) {
    return `<div class="meal free"><p class="free-text">${esc(d.tekst)}</p>${actions(false)}</div>`;
  }
  const r = state.recipes.find((x) => x.id === d.opskrift);
  if (!r) {
    return `<div class="meal free"><p class="free-text muted">Opskriften findes ikke længere</p>${actions(true)}</div>`;
  }
  const f = d.x || 1;
  const href = OPSKRIFTER + '#/' + encodeURIComponent(r.id);
  return `<div class="meal ${tone(r)}">
      <a class="thumb" href="${href}">${r.billede ? `<img src="${esc(OPSKRIFTER + r.billede)}" alt="" loading="lazy">` : esc(r.titel.charAt(0))}</a>
      <div class="body">
        <a href="${href}"><h3>${esc(r.titel)}</h3></a>
        <p class="meta"><span class="cat-label">${esc(r.kategori || 'Andet')}</span>${r.udbytte ? scaledYield(r.udbytte, f) : ''}</p>
        <label class="portion"><span>Mængde</span>
          <select data-act="x" data-i="${i}">${FACTORS.map((x) => `<option value="${x}" ${x === f ? 'selected' : ''}>${fmtQty(x)}×</option>`).join('')}</select>
        </label>
      </div>
      ${actions(true)}
    </div>`;
}

function renderWeek() {
  const key = state.week;
  const w = getWeek(key);
  const today = weekKey(new Date()) === key ? (new Date().getDay() + 6) % 7 : -1;
  const planned = w.dage.filter(Boolean).length;
  const cats = categories();
  const allowed = allowedCats();
  document.title = `Madplan uge ${weekNo(key)}`;
  app.innerHTML = `
    <div class="wrap">
      <header class="top">
        <div>
          <h1>Madplan</h1>
          <p class="sub">Uge ${weekNo(key)} · ${weekRange(key)}</p>
        </div>
        <div class="top-actions">
          <a class="settings" href="${OPSKRIFTER}" aria-label="Opskrifter">${icon.book}</a>
          <a class="settings" href="#/indstillinger" aria-label="Indstillinger">${icon.gear}</a>
          <a class="add" href="#/indkoeb/${key}" aria-label="Indkøbsliste">${icon.cart}</a>
        </div>
      </header>
      <nav class="weeknav" aria-label="Skift uge">
        <button type="button" data-week="-1">${icon.prev}<span>Uge ${weekNo(shiftWeek(key, -1))}</span></button>
        ${today < 0 ? '<button type="button" data-week="0" class="now">Denne uge</button>' : '<span class="now on">Denne uge</span>'}
        <button type="button" data-week="1"><span>Uge ${weekNo(shiftWeek(key, 1))}</span>${icon.next}</button>
      </nav>
      <p class="sync" id="sync" role="status" hidden></p>
      ${state.recipes.length ? '' : '<div class="empty"><strong>Ingen opskrifter endnu</strong>Tilføj opskrifter i opskriftsappen, så kan de bruges her.</div>'}
      <ol class="days">
        ${w.dage.map((d, i) => `
          <li class="day${i === today ? ' today' : ''}">
            <div class="dayhead"><b>${DAYS[i]}</b><span>${i === today ? 'I dag' : shortDate(dayDate(key, i))}</span></div>
            ${mealHTML(d, i)}
          </li>`).join('')}
      </ol>
      <div class="plan-actions">
        <button class="btn primary" type="button" id="fill" ${planned === 7 || !state.recipes.length ? 'disabled' : ''}>${icon.shuffle}<span>${planned ? 'Foreslå retter til de tomme dage' : 'Foreslå en hel uge'}</span></button>
        <a class="btn" href="#/indkoeb/${key}">${icon.cart}<span>Indkøbsliste</span></a>
      </div>
      <details class="prefs" ${load('forslagAaben', false) ? 'open' : ''}>
        <summary>Forslag vælges fra</summary>
        <p class="hint">Tryk for at vælge kategorier til og fra. Kager og andet bagværk er fravalgt fra start.</p>
        <div class="chips wrapchips" id="cats">
          ${cats.map((c) => `<button type="button" class="chip cat ${tone({ kategori: c })}" aria-pressed="${allowed.has(c)}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
        </div>
      </details>
      ${planned ? '<button class="btn danger" type="button" id="clearWeek">Ryd ugen</button>' : ''}
    </div>`;
  paintSync(document.getElementById('sync'));

  app.querySelectorAll('[data-week]').forEach((b) => b.addEventListener('click', () => {
    const n = Number(b.dataset.week);
    state.week = n ? shiftWeek(key, n) : weekKey(new Date());
    location.hash = state.week === weekKey(new Date()) ? '#/' : '#/uge/' + state.week;
  }));

  app.querySelector('.days').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const i = Number(b.dataset.i);
    if (b.dataset.act === 'pick') return openPicker(key, i);
    if (b.dataset.act === 'clear') editWeek(key, (wk) => { wk.dage[i] = null; });
    if (b.dataset.act === 'shuffle') {
      const cur = getWeek(key).dage[i];
      const r = suggest(key, getWeek(key), cur?.opskrift ? [cur.opskrift] : []);
      if (!r) return toast(state.recipes.length > 1 ? 'Ingen andre opskrifter i de valgte kategorier' : 'Der er kun én opskrift');
      editWeek(key, (wk) => { wk.dage[i] = { opskrift: r.id, x: cur?.x || 1 }; });
    }
    renderWeek();
  });
  app.querySelector('.days').addEventListener('change', (e) => {
    const s = e.target.closest('select[data-act="x"]');
    if (!s) return;
    editWeek(key, (wk) => { wk.dage[Number(s.dataset.i)].x = Number(s.value); });
    renderWeek();
  });

  document.getElementById('fill').addEventListener('click', () => {
    if (!allowedCats().size) return toast('Vælg mindst én kategori under "Forslag vælges fra"');
    let n = 0;
    editWeek(key, (wk) => {
      wk.dage.forEach((d, i) => {
        if (d) return;
        const r = suggest(key, wk);
        if (r) { wk.dage[i] = { opskrift: r.id, x: 1 }; n++; }
      });
    });
    renderWeek();
    if (!n) toast('Ingen opskrifter i de valgte kategorier');
  });

  const details = app.querySelector('.prefs');
  details.addEventListener('toggle', () => save('forslagAaben', details.open));
  document.getElementById('cats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    const set = allowedCats();
    set.has(b.dataset.cat) ? set.delete(b.dataset.cat) : set.add(b.dataset.cat);
    save('forslagKategorier', [...set]);
    b.setAttribute('aria-pressed', set.has(b.dataset.cat));
  });

  const clr = document.getElementById('clearWeek');
  clr?.addEventListener('click', () => {
    if (!clr.classList.contains('armed')) {
      clr.classList.add('armed');
      clr.textContent = 'Tryk igen for at rydde hele ugen';
      setTimeout(() => { clr.classList.remove('armed'); clr.textContent = 'Ryd ugen'; }, 3000);
      return;
    }
    editWeek(key, (wk) => { wk.dage = Array(7).fill(null); });
    renderWeek();
  });
}

/* ---------- Vælg en ret ---------- */
let pickerOpen = false;
function openPicker(key, i) {
  const w = getWeek(key);
  const cur = w.dage[i];
  const el = document.createElement('div');
  el.className = 'sheet-wrap';
  el.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Vælg ret til ${DAYS[i].toLowerCase()}">
      <div class="sheet-head">
        <h2>${DAYS[i]} <span>${shortDate(dayDate(key, i))}</span></h2>
        <button type="button" class="iconbtn" data-close aria-label="Luk">${icon.x}</button>
      </div>
      <label class="search">${icon.search}<input id="pq" type="search" placeholder="Søg efter en ret" autocomplete="off" enterkeyhint="search" aria-label="Søg"></label>
      <form class="free-form" id="freeForm">
        <input id="freeText" placeholder="Eller skriv selv, fx Rester eller Pizza ude" value="${esc(cur?.tekst || '')}" maxlength="80" enterkeyhint="done">
        <button class="btn" type="submit">Brug</button>
      </form>
      <ul class="pick-list" id="pickList"></ul>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add('locked');
  pickerOpen = true;
  const close = () => {
    el.remove();
    document.body.classList.remove('locked');
    pickerOpen = false;
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) close(); });

  const usedThisWeek = new Set(w.dage.map((d) => d?.opskrift).filter(Boolean));
  const list = el.querySelector('#pickList');
  const paint = () => {
    const q = norm(el.querySelector('#pq').value).split(/\s+/).filter(Boolean);
    const hits = state.recipes
      .filter((r) => {
        const hay = norm([r.titel, r.kategori, ...(r.tags || []), ...(r.ingredienser || [])].join(' '));
        return q.every((x) => hay.includes(x));
      })
      .sort((a, b) => da.compare(a.titel, b.titel));
    list.innerHTML = hits.length
      ? hits.map((r) => `
        <li><button type="button" class="pick ${tone(r)}${cur?.opskrift === r.id ? ' current' : ''}" data-id="${esc(r.id)}">
          <span class="thumb">${r.billede ? `<img src="${esc(OPSKRIFTER + r.billede)}" alt="" loading="lazy">` : esc(r.titel.charAt(0))}</span>
          <span class="body"><b>${esc(r.titel)}</b><small><span class="cat-label">${esc(r.kategori || 'Andet')}</span>${usedThisWeek.has(r.id) ? 'Allerede i ugen' : ''}</small></span>
        </button></li>`).join('')
      : '<li class="empty">Ingen opskrifter matcher</li>';
  };
  paint();
  el.querySelector('#pq').addEventListener('input', paint);
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    editWeek(key, (wk) => { wk.dage[i] = { opskrift: b.dataset.id, x: cur?.x || 1 }; });
    close();
    renderWeek();
  });
  el.querySelector('#freeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = el.querySelector('#freeText').value.trim();
    editWeek(key, (wk) => { wk.dage[i] = t ? { tekst: t } : null; });
    close();
    renderWeek();
  });
}

/* ---------- Indkøbsliste ---------- */
function checkedSet(key) {
  return new Set(load('indkoebAfkrydset', {})[key] || []);
}
function saveChecked(key, set) {
  const all = load('indkoebAfkrydset', {});
  // Gem kun afkrydsninger for de seneste uger.
  for (const k of Object.keys(all)) if (k < shiftWeek(weekKey(new Date()), -4)) delete all[k];
  if (set.size) all[key] = [...set];
  else delete all[key];
  save('indkoebAfkrydset', all);
}

function renderShopping() {
  const key = state.week;
  const w = getWeek(key);
  const items = [
    ...shoppingList(key).map((x) => ({ ...x, id: 'i:' + x.key })),
    ...w.ekstra.map((t, n) => ({ id: 'e:' + norm(t), label: t, from: [], extra: n }))
  ];
  const checked = checkedSet(key);
  const open = items.filter((x) => !checked.has(x.id));
  const done = items.filter((x) => checked.has(x.id));
  const meals = w.dage.filter((d) => d?.opskrift).length;
  const sent = sentMap(key);
  const unsent = open.filter((x) => sent[x.id] !== x.label);
  const target = load('todoistMaal', null);
  const hasTodoist = todoistKey() && target;
  const row = (x) => {
    const notes = [];
    if (x.from.length) notes.push(esc(x.from.join(', ')));
    if (sent[x.id] === x.label) notes.push('<em class="td">I Todoist</em>');
    else if (sent[x.id]) notes.push('<em class="td">Mængden er ændret, siden den blev sendt til Todoist</em>');
    return `
    <li><label>
      <input type="checkbox" data-id="${esc(x.id)}" ${checked.has(x.id) ? 'checked' : ''}>
      <span>${esc(x.label)}${notes.length ? `<small>${notes.join(' · ')}</small>` : ''}</span>
      ${x.extra !== undefined ? `<button type="button" class="mini" data-del="${x.extra}" aria-label="Fjern ${esc(x.label)}">${icon.x}</button>` : ''}
    </label></li>`;
  };
  const where = target ? esc(target.projektNavn) + (target.sektionNavn ? ' › ' + esc(target.sektionNavn) : '') : '';
  let todoistBtn = '';
  if (open.length) {
    if (!hasTodoist) {
      todoistBtn = `<a class="btn todoist" href="#/indstillinger">${icon.todoist}<span>Send til Todoist</span></a>
        <p class="hint todoist-hint">Tilføj din Todoist-nøgle under Indstillinger først.</p>`;
    } else if (unsent.length) {
      todoistBtn = `<button class="btn todoist" type="button" id="todoist">${icon.todoist}<span>Send ${unsent.length} ${unsent.length === 1 ? 'vare' : 'varer'} til Todoist</span></button>
        <p class="hint todoist-hint">Lander i ${where}.${unsent.length < open.length ? ' Varer, der allerede er sendt, kommer ikke med igen.' : ''}${unsent.some((x) => sent[x.id]) ? ' Varer med ændret mængde sendes som nye opgaver, så slet de gamle i Todoist.' : ''}</p>`;
    } else {
      todoistBtn = `<p class="hint todoist-hint">Alle varer er sendt til ${where} i Todoist. <button class="linkbtn" type="button" id="todoistAgain">Send alle igen</button></p>`;
    }
  }
  document.title = `Indkøb uge ${weekNo(key)}`;
  app.innerHTML = `
    <div class="wrap">
      <nav class="bar">
        <a class="iconbtn" href="${key === weekKey(new Date()) ? '#/' : '#/uge/' + key}">${icon.back}<span>Uge ${weekNo(key)}</span></a>
        <div class="actions">
          <button class="iconbtn" type="button" id="share" aria-label="Del listen" ${open.length ? '' : 'disabled'}>${icon.share}</button>
        </div>
      </nav>
      <header class="hero"><h1>Indkøbsliste</h1>
        <p class="sub">Uge ${weekNo(key)} · ${meals} ${meals === 1 ? 'ret' : 'retter'} · ${open.length} ${open.length === 1 ? 'vare' : 'varer'} tilbage</p>
      </header>
      <p class="sync" id="sync" role="status" hidden></p>
      <form class="free-form" id="addForm">
        <input id="addText" placeholder="Tilføj vare, fx mælk eller opvasketabs" maxlength="80" enterkeyhint="done" autocomplete="off">
        <button class="btn" type="submit">${icon.plus}<span class="sr">Tilføj</span></button>
      </form>
      ${todoistBtn}
      <p class="imp-status" id="tdStatus" role="status" hidden></p>
      ${items.length ? '' : '<div class="empty"><strong>Listen er tom</strong>Vælg retter til ugen, så kommer ingredienserne her.</div>'}
      ${open.length ? `<ul class="ingredients shop">${open.map(row).join('')}</ul>` : ''}
      ${done.length ? `<div class="section-head"><h2>I kurven</h2><button class="linkbtn" type="button" id="uncheck">Fjern flueben</button></div>
        <ul class="ingredients shop done-list">${done.map(row).join('')}</ul>` : ''}
      ${items.length ? '<p class="hint shop-hint">Mængderne er lagt sammen fra ugens retter og ganget med den valgte mængde. Tjek selv, hvad du har i forvejen.</p>' : ''}
    </div>`;
  paintSync(document.getElementById('sync'));

  app.querySelectorAll('.shop input[type="checkbox"]').forEach((c) => c.addEventListener('change', () => {
    const set = checkedSet(key);
    c.checked ? set.add(c.dataset.id) : set.delete(c.dataset.id);
    saveChecked(key, set);
    setTimeout(renderShopping, 250);
  }));
  app.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    const n = Number(b.dataset.del);
    editWeek(key, (wk) => { wk.ekstra.splice(n, 1); });
    renderShopping();
  }));
  document.getElementById('addForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = document.getElementById('addText').value.trim();
    if (!t) return;
    editWeek(key, (wk) => { wk.ekstra.push(t); });
    renderShopping();
    document.getElementById('addText').focus();
  });
  document.getElementById('uncheck')?.addEventListener('click', () => { saveChecked(key, new Set()); renderShopping(); });

  const send = async (list, btn) => {
    const st = document.getElementById('tdStatus');
    if (btn) btn.disabled = true;
    st.className = 'imp-status busy';
    st.textContent = 'Sender til Todoist…';
    st.hidden = false;
    try {
      const { ok, failed } = await sendToTodoist(key, list);
      renderShopping();
      if (failed) {
        const st2 = document.getElementById('tdStatus');
        st2.className = 'imp-status warn';
        st2.textContent = `${ok} ${ok === 1 ? 'vare' : 'varer'} sendt. ${failed} kunne ikke sendes – tryk på knappen igen for at prøve dem igen.`;
        st2.hidden = false;
      } else toast(`${ok} ${ok === 1 ? 'vare' : 'varer'} sendt til Todoist`);
    } catch (ex) {
      if (btn) btn.disabled = false;
      st.className = 'imp-status bad';
      st.innerHTML = ex.message; // beskederne er skrevet i appen og kan indeholde et link til Indstillinger
    }
  };
  const tdBtn = document.getElementById('todoist');
  tdBtn?.addEventListener('click', () => send(unsent, tdBtn));
  document.getElementById('todoistAgain')?.addEventListener('click', () => { saveSent(key, {}); send(open); });

  document.getElementById('share').addEventListener('click', async () => {
    const text = `Indkøb uge ${weekNo(key)}\n` + open.map((x) => '• ' + x.label).join('\n');
    try {
      if (navigator.share) await navigator.share({ title: `Indkøb uge ${weekNo(key)}`, text });
      else { await navigator.clipboard.writeText(text); toast('Listen er kopieret'); }
    } catch (ex) {
      if (ex.name !== 'AbortError') toast('Kunne ikke dele listen');
    }
  });
}

/* ---------- Indstillinger ---------- */
function renderSettings() {
  document.title = 'Indstillinger';
  const k = keys();
  const saved = load('todoistMaal', null);
  app.innerHTML = `
    <div class="wrap">
      <nav class="bar">
        <a class="iconbtn" href="#/">${icon.back}<span>Madplan</span></a>
      </nav>
      <header class="hero"><h1>Indstillinger</h1></header>
      <form id="settings" class="form" autocomplete="off">
        <p class="hint">Nøglerne gemmes kun på denne enhed.</p>
        <label class="field"><span>GitHub-nøgle</span><small>Gemmer madplanen i ${REPO}, så alle ser den samme plan. Det er den samme nøgle som i opskriftsappen.</small>
          <input name="github" type="password" value="${esc(k.github)}" placeholder="github_pat_…" autocomplete="off"></label>
        <label class="field"><span>Todoist-nøgle</span><small>Bruges til at sende indkøbslisten til Todoist. Find den i Todoist under Indstillinger → Integrationer → Udvikler → API-token.</small>
          <input name="todoist" type="password" value="${esc(todoistKey())}" placeholder="API-token fra Todoist" autocomplete="off"></label>
        <label class="field" id="targetField" ${todoistKey() ? '' : 'hidden'}><span>Send varerne til</span>
          <select name="target" id="target">${saved ? `<option value="${esc(saved.projekt + '|' + saved.sektion)}">${esc(saved.projektNavn + (saved.sektionNavn ? ' › ' + saved.sektionNavn : ''))}</option>` : '<option value="">Henter projekter…</option>'}</select></label>
        <p class="imp-status" id="setStatus" role="status" hidden></p>
        <button class="btn primary" type="submit">Gem og test</button>
        <button class="btn danger" type="button" id="forget">Glem nøglerne på denne enhed</button>
      </form>
    </div>`;
  window.scrollTo(0, 0);
  const form = document.getElementById('settings');
  const status = document.getElementById('setStatus');
  const setStatus = (msg, kind) => { status.innerHTML = msg; status.className = 'imp-status ' + kind; status.hidden = !msg; };
  const select = document.getElementById('target');
  const field = document.getElementById('targetField');
  let lists = null;
  const label = (t) => (t ? t.projektNavn + (t.sektionNavn ? ' › ' + t.sektionNavn : '') : '');

  // Fylder listen med projekter og deres sektioner, fx "Indkøb" og "Indkøb › Netto".
  const fillTargets = (data, current) => {
    lists = data;
    const opts = [];
    for (const p of data.projects) {
      opts.push([p.id + '|', p.name]);
      for (const s of data.sections.filter((x) => x.project_id === p.id)) opts.push([p.id + '|' + s.id, `${p.name} › ${s.name}`]);
    }
    const cur = current ? current.projekt + '|' + current.sektion : '';
    select.innerHTML = opts.map(([v, t]) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(t)}</option>`).join('');
    field.hidden = false;
  };
  const chosenTarget = () => {
    if (!lists || !select.value) return null;
    const [pid, sid] = select.value.split('|');
    const p = lists.projects.find((x) => x.id === pid);
    const s = lists.sections.find((x) => x.id === sid);
    return p ? { projekt: p.id, projektNavn: p.name, sektion: s?.id || '', sektionNavn: s?.name || '' } : null;
  };
  if (todoistKey()) {
    todoistProjects(todoistKey())
      .then((d) => {
        const t = saved && d.projects.some((p) => p.id === saved.projekt) ? saved : defaultTarget(d);
        fillTargets(d, t);
        if (!saved && t) save('todoistMaal', t);
      })
      .catch(() => { /* vises, når man trykker Gem og test */ });
  }
  select.addEventListener('change', () => {
    const t = chosenTarget();
    if (!t) return;
    save('todoistMaal', t);
    setStatus(`Varerne sendes til ${esc(label(t))}.`, 'good');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const gh = form.elements.github.value.trim();
    const td = form.elements.todoist.value.trim();
    save('githubNoegle', gh);
    save('todoistNoegle', td);
    if (!td) { save('todoistMaal', null); field.hidden = true; }
    if (!gh && !td) return setStatus('Nøglerne er fjernet fra denne enhed.', 'good');
    setStatus('Tester nøglerne…', 'busy');
    const out = [];
    let ghOk = false;
    if (gh) {
      try {
        const r = await fetch(`https://api.github.com/repos/${REPO}`, { headers: { Authorization: `Bearer ${gh}` }, cache: 'no-store' });
        const d = await r.json();
        ghOk = r.ok && d.permissions?.push;
        out.push(ghOk ? 'GitHub: virker ✓' : r.status === 401 ? 'GitHub: nøglen virker ikke ✗' : `GitHub: nøglen må ikke skrive i ${REPO} ✗`);
      } catch { out.push('GitHub: kunne ikke testes (ingen forbindelse) ✗'); }
    }
    if (td) {
      try {
        const d = await todoistProjects(td);
        const prev = chosenTarget() || load('todoistMaal', null);
        const t = prev && d.projects.some((p) => p.id === prev.projekt) ? prev : defaultTarget(d);
        fillTargets(d, t);
        save('todoistMaal', t);
        out.push(`Todoist: virker ✓ Varerne sendes til ${label(t) || '?'}. Du kan vælge et andet projekt ovenfor.`);
      } catch (ex) {
        out.push(ex.kind === 'auth' ? 'Todoist: nøglen virker ikke ✗' : 'Todoist: kunne ikke testes (' + ex.message.replace(/<[^>]+>/g, '') + ') ✗');
      }
    }
    setStatus(out.map(esc).join('<br>'), out.some((x) => x.includes('✗')) ? 'bad' : 'good');
    if (ghOk) { await refresh(true); push(); }
  });
  document.getElementById('forget').addEventListener('click', () => {
    save('githubNoegle', '');
    save('todoistNoegle', '');
    save('todoistMaal', null);
    form.elements.github.value = form.elements.todoist.value = '';
    field.hidden = true;
    setStatus('Nøglerne er fjernet fra denne enhed.', 'good');
  });
}

/* ---------- Start ---------- */
function route() {
  if (pickerOpen) document.querySelector('.sheet-wrap [data-close]')?.click();
  const path = location.hash.replace(/^#\/?/, '');
  const m = path.match(/^(?:uge|indkoeb)\/(\d{4}-W\d{2})$/);
  if (m) state.week = m[1];
  else if (path === '') state.week = weekKey(new Date());
  else if (!state.week) state.week = weekKey(new Date());
  if (path === 'indstillinger') return renderSettings();
  if (path.startsWith('indkoeb')) return renderShopping();
  renderWeek();
  window.scrollTo(0, 0);
}

// Henter den nyeste plan, fx når appen åbnes igen, så man ser ændringer fra de andre.
async function refresh(force = false) {
  if (!force && (pushing || state.dirty.size)) return;
  try {
    const remote = await loadRemotePlan();
    const before = JSON.stringify(state.plan);
    mergeRemote(remote);
    const busy = pickerOpen || document.activeElement?.matches('input, textarea, select');
    if (JSON.stringify(state.plan) !== before && !busy && !location.hash.includes('indstillinger')) route();
  } catch { /* offline: brug planen på enheden */ }
}

async function start() {
  try {
    state.recipes = (await loadRecipes()).map((r) => ({ ...r, tags: r.tags || [], ingredienser: r.ingredienser || [] }));
  } catch {
    app.innerHTML = '<div class="wrap"><div class="empty"><strong>Kunne ikke hente opskrifterne</strong>Tjek din forbindelse og prøv igen.</div></div>';
    return;
  }
  try { mergeRemote(await loadRemotePlan()); } catch { /* offline */ }
  if (!keys().github && state.dirty.size) setSync('local');
  window.addEventListener('hashchange', route);
  route();
  if (keys().github && state.dirty.size) push();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { refresh(); push(); } });
  window.addEventListener('online', push);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

start();
