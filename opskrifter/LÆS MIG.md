# Opskrifter – markusvej.dk/opskrifter

Appen ligger i mappen `opskrifter/` i GitHub-repoet `itsJulike/hunde` (det samme repo som
hundesiderne, fordi det er det repo, markusvej.dk peger på) og vises med GitHub Pages på
https://markusvej.dk/opskrifter/. Hundesiderne ligger uden for mappen og bliver ikke rørt af appen.

GitHub Pages kan ikke køre kode på serveren. Derfor gemmer appen opskrifter og billeder ved at lægge
dem direkte i repoet, og den kalder Claude direkte fra telefonen. Det kræver to nøgler, som du skriver
ind under **Indstillinger** (tandhjulet på forsiden). De gemmes kun på den enhed, du skriver dem på.
Uden nøgler kan alle stadig se, søge i og skalere opskrifterne.

## Læg appen på iPhonen

1. Åbn `https://markusvej.dk/opskrifter/` i Safari.
2. Tryk på **Del-knappen** → **Føj til hjemmeskærm**. Den åbner i fuld skærm og virker offline.
3. Åbn appen, tryk på tandhjulet og skriv de to nøgler ind (se nedenfor). Tryk **Gem og test**.

## GitHub-nøgle (til at gemme)

1. Gå til https://github.com/settings/personal-access-tokens/new (GitHub → Settings → Developer
   settings → Personal access tokens → Fine-grained tokens → Generate new token).
2. Navn: "Opskrifter-app". Udløb: fx 1 år (du laver bare en ny, når den udløber).
3. **Repository access:** vælg *Only select repositories* → `itsJulike/hunde`.
4. **Permissions → Repository permissions → Contents:** *Read and write*. Intet andet.
5. Tryk **Generate token**, kopiér nøglen (`github_pat_…`) og sæt den ind i appen.

Nøglen kan kun ændre filer i `hunde`-repoet, ikke resten af din GitHub-konto. Appen selv skriver
kun i mappen `opskrifter/`.

## Anthropic-nøgle (til Claude)

1. Gå til https://console.anthropic.com → *API Keys* → lav en nøgle. Sæt gerne en lav månedlig
   grænse under *Billing*.
2. Sæt den ind i appen.

Appen bruger `claude-haiku-5-5` (står øverst i `app.js` som `MODEL`). En opskrift fra tekst eller
billede koster under 1 øre, og en opskrift fra et link ca. 1–3 øre, fordi hele siden bliver læst.

## Tilføj eller ret en opskrift

Tryk på **+** på forsiden for at tilføje en opskrift, eller på **blyanten** i en opskrift for at
rette eller slette den. Under titlen kan du tilføje, skifte eller fjerne et billede.

Når du gemmer, laver appen et "commit" i repoet. Opskriften kan ses med det samme på den telefon,
hvor du gemte den. Andre (uden nøgle) ser den, når GitHub Pages har opdateret siden, typisk inden for
1–10 minutter.

**Backup:** Hele historikken ligger i GitHub. Gik noget galt, så åbn `opskrifter/recipes.json` på GitHub, tryk
på *History* og hent en ældre udgave.

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

Genvejen åbner formularen i Safari. Safari og hjemmeskærms-appen deler ikke nøgler, så skriv dem også
ind under Indstillinger i Safari første gang.

## Ret direkte i filerne

Du kan også rette `opskrifter/recipes.json` direkte på GitHub. `id` skal være unikt og uden mellemrum (bruges i
linket, fx `#/banankage`).

Felter: `titel`, `kategori`, `tags`, `ovn`, `bagetid`, `bagetidMin` (tal, bruges til sortering),
`udbytte`, `form`, `tilfoejet` (dato), `ingredienser`, `fremgangsmaade`, `noter`, `kilde` (link),
`billede` (fx `billeder/banankage-1730000000000.jpg`).

Hvis du ændrer i `app.js` eller `app.css`, så hæv tallet i `opskrifter-v13` øverst i `sw.js`
(fx til `v14`), så telefonen henter den nye udgave.
