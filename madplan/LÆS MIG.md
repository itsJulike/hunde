# Madplan – markusvej.dk/madplan

Planlæg ugens aftensmad med opskrifterne fra https://markusvej.dk/opskrifter/ og få en samlet
indkøbsliste. Appen ligger i mappen `madplan/` i `itsJulike/hunde`, ved siden af `opskrifter/`.

## Log ind

Madplan bruger samme login som Opskrifter (se `opskrifter/LÆS MIG.md`). Opskrifter og madplan ligger
i det private repo `itsJulike/opskrifter-data` (madplanen i `madplan/plan.json`), og alle, der er
logget ind, ser den samme plan.

1. Åbn `https://markusvej.dk/madplan/` i Safari og log ind med adgangskoden.
2. Tryk **Del** → **Føj til hjemmeskærm**, åbn appen derfra, og log ind igen (hjemmeskærms-appen
   husker login for sig selv).

## Sådan bruges den

- **Foreslå en hel uge** fylder de tomme dage med retter. Den tager først retter, der ikke er i ugen,
  og derefter dem, der er længst siden I har fået. Kager, småkager, tærter og andet bagværk er fravalgt;
  det ændres under **Forslag vælges fra**.
- På hver dag kan du **blande** (ny tilfældig ret), **vælge** en bestemt ret, skrive selv (fx "Rester"
  eller "Pizza ude") eller **fjerne** retten. **Mængde** ganger retten op eller ned, og det kommer med
  på indkøbslisten.
- Tryk **Hjemme** på de dage, du arbejder hjemme. Så får dagen også en plads til frokost, som kommer
  med i forslag og på indkøbslisten. Frokost foreslås fra kategorier som Frokost, Salater og Supper,
  hvis du har dem (ellers fra aftensmaden); det ændres under **Forslag vælges fra → Frokost**.
  Hurtigvalg som "Rester" og "Madpakke" ligger under søgefeltet, når du vælger en ret.
- Tryk på en ret for at åbne opskriften.
- **Indkøbslisten** lægger ugens ingredienser sammen (fx 500 g + 500 g hakket oksekød = 1 kg) og
  deler dem op i varegrupper i butikkens rækkefølge: Frugt og grønt, Brød, Kød og fisk, Mejeri og æg,
  Kolonial, Frost, Drikkevarer, Husholdning og Andet. Du kan tilføje andre varer, krydse af og dele
  listen. Afkrydsningerne gemmes kun på telefonen; de tilføjede varer deles med de andre.
- **Basisvarer** som salt, peber, vand og olie står ikke på listen, men nederst under "Basisvarer, du
  nok har". Listen rettes under Indstillinger (én vare pr. linje) og gælder kun på den enhed.
- Varegrupperne gættes ud fra varens navn (reglerne står i `AISLE_RULES` i `app.js`). Havner noget
  forkert, kan reglerne rettes dér.

## Send indkøbslisten til Todoist

Todoist-nøglen er en del af login (Indstillinger → Skift nøgler eller adgangskode). Under
**Indstillinger → Todoist** vælger du projektet, og om varerne skal deles op i sektioner efter
varegruppe, fx "Frugt og grønt". Sektioner, der mangler, bliver oprettet.

På indkøbslisten trykker du så **Send … varer til Todoist**. Hver vare bliver en opgave, og i
beskrivelsen står, hvilken ret den er til. Varer, der allerede er sendt, får mærket "I Todoist" og
sendes ikke igen. Ændrer du mængden bagefter, sendes varen som en ny opgave, så slet den gamle i Todoist.

Todoist-nøglen giver adgang til hele din Todoist, men appen opretter kun opgaver.

## Ret i appen

Hvis du ændrer i `app.js` eller `madplan.css` (eller `../opskrifter/login.js`), så hæv tallet i `madplan-v9` øverst i `sw.js`.
Appen bruger opskriftsappens `app.css` til farver og knapper, så den følger med, hvis udseendet ændres dér.
