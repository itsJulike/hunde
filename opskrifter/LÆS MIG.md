# Opskrifter – markusvej.dk/opskrifter

Appens kode ligger i mappen `opskrifter/` i `itsJulike/hunde` (det repo, markusvej.dk vises fra) og
bruges også af Madplan (`markusvej.dk/madplan`). Hundesiderne bliver ikke rørt af appen.

## Sådan er det skruet sammen

- **Opskrifter, billeder og madplan** ligger i det **private** repo `itsJulike/opskrifter-data`.
  Kun en GitHub-nøgle med adgang til det repo kan læse eller ændre dem.
- **Nøglerne** (GitHub, Anthropic, Todoist) ligger krypteret i `noegler.json` i det offentlige repo
  `itsJulike/opskrifter-login`. Filen er krypteret med AES-256-GCM med en nøgle, der laves ud fra
  din adgangskode (PBKDF2-SHA256, 1.000.000 gentagelser), så den er værdiløs uden adgangskoden.
- **Log ind** med adgangskoden på hver enhed (og i hver hjemmeskærms-app). Så hentes og dekrypteres
  nøglerne og gemmes på enheden, indtil du logger ud. Koden ligger i `login.js`.
- GitHub-nøglen må **ikke** have adgang til `itsJulike/hunde`. Så kan en stjålen nøgle ikke bruges
  til at ændre koden på markusvej.dk. Appen nægter at gemme en nøgle, der har den adgang.

## Første gang: lav GitHub-nøglen og opret login

1. Gå til https://github.com/settings/personal-access-tokens/new (GitHub → Settings → Developer
   settings → Personal access tokens → Fine-grained tokens → Generate new token).
2. Navn: "Opskrifter-app". Udløb: fx 1 år.
3. **Repository access:** *Only select repositories* → `itsJulike/opskrifter-data` og
   `itsJulike/opskrifter-login`. **Ikke** `hunde`.
4. **Permissions → Repository permissions → Contents:** *Read and write*. Intet andet.
5. Tryk **Generate token** og kopiér nøglen (`github_pat_…`).
6. Åbn `https://markusvej.dk/opskrifter/`. Første gang vises **Opret login**: sæt GitHub-nøglen ind,
   og evt. Anthropic- og Todoist-nøglen, og vælg en adgangskode på mindst 16 tegn. På iPhone kan
   Safari lave en stærk adgangskode og gemme den i iCloud-nøgleringen, så den udfyldes af sig selv på
   dine andre Apple-enheder.
7. Slet den gamle GitHub-nøgle, der havde adgang til `hunde`.

**Anthropic-nøgle:** https://console.anthropic.com → *API Keys*. Appen bruger `claude-haiku-5-5`. En
opskrift fra tekst eller billede koster under 1 øre, fra et link ca. 1–3 øre.

**Todoist-nøgle:** Todoist → Indstillinger → Integrationer → Udvikler → API-token.

## Log ind på andre enheder

Åbn appen, skriv adgangskoden, og tryk **Log ind**. På iPhone: Del-knappen → **Føj til hjemmeskærm**.
Safari og hver hjemmeskærms-app husker login hver for sig, så du logger ind én gang i hver.

Under **Indstillinger** (tandhjulet) kan du:
- **Skifte nøgler eller adgangskode**, fx når GitHub-nøglen udløber. De andre enheder bliver logget
  ind, til de logger ud; næste login kræver den nye adgangskode.
- **Logge ud på denne enhed.** Det fjerner nøgler, opskrifter, billeder og madplan fra enheden.

**Glemt adgangskoden?** Tryk "Lav et nyt login med dine nøgler" på login-skærmen. Det kræver en
GitHub-nøgle med adgang til de to repoer.

**Mistet en enhed?** Slet GitHub-nøglen på github.com, Anthropic-nøglen på console.anthropic.com og
nulstil Todoist-nøglen. Lav nye nøgler, og opret et nyt login med en ny adgangskode.

## Tilføj eller ret en opskrift

Tryk på **+** på forsiden for at tilføje en opskrift, eller på **blyanten** i en opskrift for at
rette eller slette den. Under titlen kan du tilføje, skifte eller fjerne et billede.

Når du gemmer, laver appen et "commit" i `opskrifter-data`, og alle, der er logget ind, ser
opskriften med det samme.

**Backup:** Hele historikken ligger i GitHub. Gik noget galt, så åbn `recipes.json` i
`itsJulike/opskrifter-data`, tryk på *History* og hent en ældre udgave.

## Hent opskrifter fra links, Instagram, TikTok, tekstfiler og billeder

Øverst i "Ny opskrift" er boksen **Hent opskrift**. Du kan indsætte et link eller en tekst, vælge
op til 6 billeder (skærmbilleder eller fotos af en kogebog) eller vælge en tekstfil (.txt), som så
hentes med det samme. Claude oversætter til dansk og regner cups/ounces/°F om til dl/g/°C.

- **Links** hentes af Claude selv. Det virker med de fleste opskriftssider.
- **Instagram og TikTok** lukker ikke Claude ind. Kopiér i stedet opslagets tekst, eller tag
  skærmbilleder af de steder i videoen, hvor ingredienserne står.

Uden Anthropic-nøgle bliver en indsat tekst delt op ved linjerne "Ingredienser" og "Fremgangsmåde".

### "Gem opskrift" i iPhonens Del-menu

1. Åbn appen **Genveje** og tryk **+** for at lave en ny genvej. Kald den "Gem opskrift".
2. Tryk på **ⓘ** (Detaljer) og slå **Vis i delingsark** til. Vælg at den modtager *URL'er*,
   *Tekst* og *Safari-websider*.
3. Tilføj handlingen **Kod URL** (URL Encode) med *Genvejsinput* som input.
4. Tilføj handlingen **Åbn URL'er** (Open URLs) med adressen
   `https://markusvej.dk/opskrifter/#/ny?tekst=` efterfulgt af variablen *Kodet tekst*.

Genvejen åbner formularen i Safari, så du skal være logget ind i Safari (ikke kun i hjemmeskærms-appen).

## Ret direkte i filerne

Du kan også rette `recipes.json` i `itsJulike/opskrifter-data` direkte på GitHub. `id` skal være unikt og uden mellemrum (bruges i
linket, fx `#/banankage`).

Felter: `titel`, `kategori`, `tags`, `ovn`, `bagetid`, `bagetidMin` (tal, bruges til sortering),
`udbytte`, `form`, `tilfoejet` (dato), `ingredienser`, `fremgangsmaade`, `noter`, `kilde` (link),
`billede` (fx `billeder/banankage-1730000000000.jpg`).

Hvis du ændrer i `app.js`, `login.js` eller `app.css`, så hæv tallet i `opskrifter-v15` øverst i `sw.js`
(fx til `v16`), så telefonen henter den nye udgave.
