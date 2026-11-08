'use strict';

// Fælles login for Opskrifter og Madplan.
//
// - Opskrifter, billeder og madplan ligger i et PRIVAT GitHub-repo (DATA_REPO). Kun en GitHub-nøgle
//   med adgang til det repo kan læse eller ændre dem.
// - Nøglerne (GitHub, Anthropic, Todoist) ligger krypteret i noegler.json i LOGIN_REPO, som er
//   offentligt, så den kan hentes før man er logget ind. Krypteringen er AES-256-GCM med en nøgle,
//   der laves ud fra adgangskoden med PBKDF2-SHA256 og mange gentagelser, så det tager lang tid at gætte.
// - Når man logger ind, dekrypteres nøglerne og gemmes på enheden, til man logger ud.
// - GitHub-nøglen må ikke have adgang til itsJulike/hunde (selve markusvej.dk), så en stjålet nøgle
//   ikke kan bruges til at ændre koden på siden.

const Login = (() => {
  const DATA_REPO = 'itsJulike/opskrifter-data';
  const LOGIN_REPO = 'itsJulike/opskrifter-login';
  const SITE_REPO = 'itsJulike/hunde';
  const BUNDLE = 'noegler.json';
  const ITERATIONS = 1000000;
  const MIN_ITERATIONS = 600000;
  const MIN_LENGTH = 16;
  const IMG_CACHE = 'opskrifter-billeder';
  const VERSION = 1;

  const load = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat tilstand */ } };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fail = (msg, kind = '') => Object.assign(new Error(msg), { kind });
  const enc = new TextEncoder();
  const b64 = (u8) => { let s = ''; for (const b of u8) s += String.fromCharCode(b); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  const loggedIn = () => load('loginV', 0) === VERSION && !!load('githubNoegle', '');

  /* ---------- Kryptering ---------- */
  async function aesKey(password, salt, iterations) {
    const base = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function seal(secrets, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await aesKey(password, salt, ITERATIONS);
    const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(secrets))));
    return { version: VERSION, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, cipher: 'AES-256-GCM', salt: b64(salt), iv: b64(iv), data: b64(data) };
  }
  async function unseal(bundle, password) {
    if (!bundle || bundle.version !== VERSION || !(bundle.iterations >= MIN_ITERATIONS)) throw fail('Login-filen er ukendt eller beskadiget.');
    const key = await aesKey(password, unb64(bundle.salt), bundle.iterations);
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(bundle.iv) }, key, unb64(bundle.data));
      return JSON.parse(new TextDecoder().decode(plain));
    } catch {
      throw fail('Forkert adgangskode.', 'wrong');
    }
  }

  /* ---------- GitHub ---------- */
  async function api(url, { token, method = 'GET', body, raw = false } = {}) {
    let res;
    try {
      res = await fetch(`https://api.github.com${url}`, {
        method,
        cache: 'no-store',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: body && JSON.stringify(body)
      });
    } catch {
      throw fail('Ingen forbindelse.', 'offline');
    }
    return res;
  }

  // Den krypterede login-fil. Kan hentes uden nøgle.
  async function fetchBundle() {
    try {
      const res = await api(`/repos/${LOGIN_REPO}/contents/${BUNDLE}?ref=main`, { raw: true });
      if (res.status === 404) return null;
      if (res.ok) return await res.json();
    } catch { /* GitHubs API svarer ikke: prøv filen direkte */ }
    // GitHub tillader 60 opslag i timen uden nøgle, og API'et kan være nede; så hentes filen direkte.
    try {
      const r = await fetch(`https://raw.githubusercontent.com/${LOGIN_REPO}/main/${BUNDLE}?t=${Date.now()}`, { cache: 'no-store' });
      if (r.status === 404) return null;
      if (r.ok) return await r.json();
    } catch { /* falder igennem */ }
    throw fail('Kunne ikke nå GitHub. Tjek forbindelsen, eller prøv igen om lidt.', 'offline');
  }

  async function saveBundle(bundle, token) {
    const cur = await api(`/repos/${LOGIN_REPO}/contents/${BUNDLE}?ref=main`, { token });
    const sha = cur.ok ? (await cur.json()).sha : undefined;
    const res = await api(`/repos/${LOGIN_REPO}/contents/${BUNDLE}`, {
      token,
      method: 'PUT',
      body: { message: 'Opdater login', branch: 'main', content: btoa(JSON.stringify(bundle, null, 2) + '\n'), ...(sha && { sha }) }
    });
    if (!res.ok) throw fail(`Kunne ikke gemme login (GitHub-fejl ${res.status}).`);
  }

  // Kan nøglen skrive i repoet? GitHubs "permissions" fortæller kun, hvad kontoen må, ikke nøglen.
  // Derfor prøver vi at ændre en fil med en bevidst forkert versions-id (sha). GitHub afviser altid
  // det uden at ændre noget: 409/422 betyder, at nøglen må skrive; 403/404, at den ikke må.
  const PROBE = { [DATA_REPO]: 'README.md', [LOGIN_REPO]: 'README.md', [SITE_REPO]: 'CNAME' };
  async function canPush(repo, token) {
    const res = await api(`/repos/${repo}/contents/${PROBE[repo]}`, {
      token,
      method: 'PUT',
      body: { message: 'Adgangstest (gemmes aldrig)', content: btoa('test'), sha: '0'.repeat(40), branch: 'main' }
    });
    if (res.status === 401) return 'bad';
    if (res.status === 409 || res.status === 422) return 'yes';
    if (res.status === 403 || res.status === 404) return 'no';
    return 'unknown';
  }

  // Tjekker nøglerne, før de gemmes. Returnerer en liste af fejl.
  async function checkKeys({ github, claude, todoist }) {
    const errors = [];
    const [data, login, site] = await Promise.all([canPush(DATA_REPO, github), canPush(LOGIN_REPO, github), canPush(SITE_REPO, github)]);
    if (data === 'bad') errors.push('GitHub-nøglen virker ikke.');
    else if ([data, login, site].includes('unknown')) errors.push('GitHub svarede ikke som forventet, så nøglen kunne ikke tjekkes. Prøv igen om lidt.');
    else {
      if (data !== 'yes') errors.push(`GitHub-nøglen skal kunne skrive i ${DATA_REPO}.`);
      if (login !== 'yes') errors.push(`GitHub-nøglen skal kunne skrive i ${LOGIN_REPO}.`);
      if (site === 'yes') errors.push(`GitHub-nøglen kan også ændre ${SITE_REPO} (selve markusvej.dk). Lav en ny nøgle, der kun har adgang til ${DATA_REPO} og ${LOGIN_REPO}.`);
    }
    if (claude) {
      try {
        const r = await fetch('https://api.anthropic.com/v1/models/claude-haiku-5-5', { headers: { 'x-api-key': claude, 'anthropic-version': '2026-10-21', 'anthropic-dangerous-direct-browser-access': 'true' } });
        if (!r.ok) errors.push(r.status === 401 ? 'Anthropic-nøglen virker ikke.' : `Anthropic svarede med fejl ${r.status}.`);
      } catch { errors.push('Anthropic-nøglen kunne ikke testes (ingen forbindelse).'); }
    }
    if (todoist) {
      try {
        const r = await fetch('https://api.todoist.com/api/v1/sync', {
          method: 'POST',
          headers: { Authorization: `Bearer ${todoist}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ sync_token: '*', resource_types: '["projects"]' })
        });
        if (!r.ok) errors.push(r.status === 401 || r.status === 403 ? 'Todoist-nøglen virker ikke.' : `Todoist svarede med fejl ${r.status}.`);
      } catch { errors.push('Todoist-nøglen kunne ikke testes (ingen forbindelse).'); }
    }
    return errors;
  }

  function useSecrets(s) {
    save('githubNoegle', s.github || '');
    save('claudeNoegle', s.claude || '');
    save('todoistNoegle', s.todoist || '');
    save('loginV', VERSION);
  }

  /* ---------- Skærme ---------- */
  const ICON = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>';
  // Skjult brugernavn, så Safari/iCloud-nøgleringen kan gemme og udfylde adgangskoden.
  const USER = '<input type="text" name="username" autocomplete="username" value="markusvej.dk" class="sr-only" tabindex="-1" aria-hidden="true" readonly>';

  function setStatus(el, msg, kind) {
    el.innerHTML = msg;
    el.className = 'imp-status ' + kind;
    el.hidden = !msg;
  }

  async function showLogin(app, { name, onDone }) {
    document.title = `${name} – log ind`;
    app.innerHTML = `
      <div class="wrap login-wrap">
        <header class="hero login-hero"><span class="login-icon">${ICON}</span><h1>${esc(name)}</h1>
          <p class="sub">Log ind for at se og rette opskrifter og madplan.</p></header>
        <form class="form" id="loginForm">
          ${USER}
          <label class="field"><span>Adgangskode</span>
            <input name="password" type="password" autocomplete="current-password" required autofocus></label>
          <p class="imp-status" id="loginStatus" role="status" hidden></p>
          <button class="btn primary" type="submit">Log ind</button>
        </form>
        <p class="hint login-alt" id="loginAlt"></p>
      </div>`;
    const form = document.getElementById('loginForm');
    const status = document.getElementById('loginStatus');
    const alt = document.getElementById('loginAlt');
    let bundle;
    try {
      bundle = await fetchBundle();
    } catch (ex) {
      setStatus(status, esc(ex.message), 'bad');
    }
    if (bundle === null) {
      // Intet login endnu: vis opsætningen i stedet.
      return showSetup(app, { name, onDone, first: true });
    }
    alt.innerHTML = 'Glemt adgangskoden? <button type="button" class="linkbtn" id="toSetup">Lav et nyt login med dine nøgler</button>';
    document.getElementById('toSetup').addEventListener('click', () => showSetup(app, { name, onDone, reset: true }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      setStatus(status, 'Låser op…', 'busy');
      try {
        bundle = bundle || await fetchBundle();
        if (bundle === null) return showSetup(app, { name, onDone, first: true });
        const secrets = await unseal(bundle, form.elements.password.value);
        useSecrets(secrets);
        setStatus(status, 'Logget ind ✓', 'good');
        onDone();
      } catch (ex) {
        btn.disabled = false;
        setStatus(status, esc(ex.message), 'bad');
        form.elements.password.select();
      }
    });
  }

  // Opret login, skift nøgler eller adgangskode.
  function showSetup(app, { name, onDone, first = false, reset = false }) {
    const editing = loggedIn();
    document.title = editing ? 'Skift nøgler eller adgangskode' : 'Opret login';
    const val = (k) => (editing ? esc(load(k, '')) : '');
    app.innerHTML = `
      <div class="wrap login-wrap">
        ${editing ? `<nav class="bar"><button class="iconbtn" type="button" id="setupBack">← Tilbage</button></nav>` : ''}
        <header class="hero login-hero">${editing ? '' : `<span class="login-icon">${ICON}</span>`}
          <h1>${editing ? 'Skift nøgler eller adgangskode' : first ? 'Opret login' : 'Nyt login'}</h1>
          <p class="sub">${first ? 'Første gang: skriv dine nøgler og vælg en adgangskode. Bagefter skal du kun bruge adgangskoden for at logge ind på andre enheder.' : reset ? 'Skriv dine nøgler igen og vælg en ny adgangskode. Den gamle adgangskode holder op med at virke.' : 'Nøglerne krypteres med adgangskoden og gemmes, så alle enheder kan logge ind med den.'}</p>
        </header>
        <form class="form" id="setupForm" autocomplete="off">
          <label class="field"><span>GitHub-nøgle</span><small>Skal kunne skrive i ${DATA_REPO} og ${LOGIN_REPO}, og må ikke have adgang til ${SITE_REPO}. Se LÆS MIG.</small>
            <input name="github" type="password" value="${val('githubNoegle')}" placeholder="github_pat_…" autocomplete="off" required></label>
          <label class="field"><span>Anthropic-nøgle <em>(valgfri)</em></span><small>Til at hente opskrifter fra links, tekst og billeder.</small>
            <input name="claude" type="password" value="${val('claudeNoegle')}" placeholder="sk-ant-…" autocomplete="off"></label>
          <label class="field"><span>Todoist-nøgle <em>(valgfri)</em></span><small>Til at sende indkøbslisten til Todoist.</small>
            <input name="todoist" type="password" value="${val('todoistNoegle')}" placeholder="API-token" autocomplete="off"></label>
          ${USER}
          <label class="field"><span>${editing ? 'Adgangskode (ny eller den nuværende)' : 'Adgangskode'}</span>
            <small>Mindst ${MIN_LENGTH} tegn. Tryk i feltet på iPhone, så kan Safari lave en stærk adgangskode og gemme den i iCloud-nøgleringen, så den udfyldes på dine andre enheder.</small>
            <input name="password" type="password" autocomplete="new-password" minlength="${MIN_LENGTH}" required></label>
          <label class="field"><span>Gentag adgangskoden</span>
            <input name="password2" type="password" autocomplete="new-password" required></label>
          <p class="imp-status" id="setupStatus" role="status" hidden></p>
          <button class="btn primary" type="submit">${editing ? 'Gem' : 'Opret login'}</button>
        </form>
        ${!editing && !first ? '<p class="hint login-alt"><button type="button" class="linkbtn" id="toLogin">Tilbage til log ind</button></p>' : ''}
      </div>`;
    window.scrollTo(0, 0);
    const form = document.getElementById('setupForm');
    const status = document.getElementById('setupStatus');
    document.getElementById('setupBack')?.addEventListener('click', () => history.back());
    document.getElementById('toLogin')?.addEventListener('click', () => showLogin(app, { name, onDone }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = form.elements;
      const secrets = { github: f.github.value.trim(), claude: f.claude.value.trim(), todoist: f.todoist.value.trim() };
      const pw = f.password.value;
      if (pw.length < MIN_LENGTH) return setStatus(status, `Adgangskoden skal være mindst ${MIN_LENGTH} tegn.`, 'bad');
      if (pw !== f.password2.value) return setStatus(status, 'De to adgangskoder er ikke ens.', 'bad');
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      setStatus(status, 'Tester nøglerne…', 'busy');
      try {
        const errors = await checkKeys(secrets);
        if (errors.length) throw fail(errors.map(esc).join('<br>'), 'keys');
        setStatus(status, 'Krypterer og gemmer…', 'busy');
        await saveBundle(await seal({ ...secrets, gemt: new Date().toISOString() }, pw), secrets.github);
        useSecrets(secrets);
        setStatus(status, 'Gemt ✓ Log ind med adgangskoden på dine andre enheder.', 'good');
        setTimeout(onDone, 900);
      } catch (ex) {
        btn.disabled = false;
        setStatus(status, ex.kind === 'keys' ? ex.message : esc(ex.message), 'bad');
      }
    });
  }

  // Boks til Indstillinger: status, skift nøgler/adgangskode og log ud.
  function accountHTML() {
    return `
      <section class="account">
        <h2>Login</h2>
        <p class="hint">Du er logget ind på denne enhed. Opskrifter og madplan ligger i det private repo ${DATA_REPO}.</p>
        <button class="btn" type="button" id="changeLogin">Skift nøgler eller adgangskode</button>
        <button class="btn danger" type="button" id="logout">Log ud på denne enhed</button>
      </section>`;
  }
  function bindAccount({ name, onDone, unsaved = () => false }) {
    const app = document.getElementById('app');
    document.getElementById('changeLogin').addEventListener('click', () => showSetup(app, { name, onDone }));
    const out = document.getElementById('logout');
    let armed = null;
    out.addEventListener('click', async () => {
      if (!armed) {
        out.classList.add('armed');
        out.textContent = unsaved() ? 'Der er ændringer, som ikke er gemt endnu. Tryk igen for at logge ud alligevel' : 'Tryk igen for at logge ud';
        armed = setTimeout(() => { armed = null; out.classList.remove('armed'); out.textContent = 'Log ud på denne enhed'; }, 4000);
        return;
      }
      await logout();
    });
  }

  // Fjerner nøgler og alle opskrifter, billeder og madplaner fra enheden.
  async function logout() {
    for (const k of ['githubNoegle', 'claudeNoegle', 'todoistNoegle', 'loginV', 'opskrifterKopi', 'madplan', 'madplanUsynk',
      'indkoebAfkrydset', 'todoistSendt', 'todoistMaal']) localStorage.removeItem(k);
    try { await caches.delete(IMG_CACHE); } catch { /* ingen cache */ }
    location.hash = '';
    location.reload();
  }

  /* ---------- Billeder fra det private repo ---------- */
  // <img data-img="billeder/x.jpg"> hentes med nøglen, gemmes til offline brug og vises.
  const urls = new Map();
  const cacheKey = (path) => `${location.origin}/__billeder/${path}`;
  function imageURL(path) {
    if (urls.has(path)) return urls.get(path);
    const p = (async () => {
      let cache = null;
      try { cache = await caches.open(IMG_CACHE); } catch { /* ingen cache */ }
      let res = cache && await cache.match(cacheKey(path));
      if (!res) {
        const r = await api(`/repos/${DATA_REPO}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=main`, { token: load('githubNoegle', ''), raw: true });
        if (!r.ok) throw fail('Billedet kunne ikke hentes.');
        const blob = await r.blob();
        res = new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } });
        if (cache) await cache.put(cacheKey(path), res.clone()).catch(() => {});
      }
      return URL.createObjectURL(await res.blob());
    })();
    urls.set(path, p);
    p.catch(() => urls.delete(path));
    return p;
  }
  async function forgetImage(path) {
    urls.delete(path);
    try { await (await caches.open(IMG_CACHE)).delete(cacheKey(path)); } catch { /* ingen cache */ }
  }
  function hydrate(root) {
    for (const img of root.querySelectorAll('img[data-img]')) {
      const path = img.dataset.img;
      img.removeAttribute('data-img');
      imageURL(path).then((u) => { img.src = u; }, () => img.classList.add('img-fail'));
    }
  }
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    new MutationObserver(() => hydrate(document)).observe(document.documentElement, { childList: true, subtree: true });
  }

  return { DATA_REPO, LOGIN_REPO, SITE_REPO, loggedIn, showLogin, showSetup, accountHTML, bindAccount, logout, imageURL, forgetImage, hydrate, seal, unseal };
})();
