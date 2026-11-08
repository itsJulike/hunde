# Madplan – markusvej.dk/madplan

Planlæg ugens aftensmad med opskrifterne fra https://markusvej.dk/opskrifter/ og få en samlet
indkøbsliste. Appen ligger i mappen `madplan/` i `itsJulike/hunde`, ved siden af `opskrifter/`.

## Læg appen på iPhonen

1. Åbn `https://markusvej.dk/madplan/` i Safari.
2. Tryk **Del** → **Føj til hjemmeskærm**.
3. Tryk på tandhjulet og sæt den samme GitHub-nøgle ind som i opskriftsappen. Tryk **Gem og test**.

Uden nøgle virker alt, men planen gemmes kun på den enhed. Med nøglen gemmes den i
`madplan/plan.json` på GitHub, så alle med appen ser den samme plan. Dem uden nøgle kan stadig se
planen (den opdateres på siden inden for 1–10 minutter).

## Sådan bruges den

- **Foreslå en hel uge** fylder de tomme dage med retter. Den tager først retter, der ikke er i ugen,
  og derefter dem, der er længst siden I har fået. Kager, småkager, tærter og andet bagværk er fravalgt;
  det ændres under **Forslag vælges fra**.
- På hver dag kan du **blande** (ny tilfældig ret), **vælge** en bestemt ret, skrive selv (fx "Rester"
  eller "Pizza ude") eller **fjerne** retten. **Mængde** ganger retten op eller ned, og det kommer med
  på indkøbslisten.
- Tryk på en ret for at åbne opskriften.
- **Indkøbslisten** lægger ugens ingredienser sammen (fx 500 g + 500 g hakket oksekød = 1 kg). Du kan
  tilføje andre varer, krydse af og dele listen til fx Påmindelser eller Beskeder. Afkrydsningerne
  gemmes kun på telefonen; de tilføjede varer deles med de andre.

## Send indkøbslisten til Todoist

1. Find din API-nøgle i Todoist: **Indstillinger → Integrationer → Udvikler → API-token**
   (eller https://app.todoist.com/app/settings/integrations/developer). Kopiér den.
2. I Madplan: tryk på tandhjulet, sæt nøglen ind under **Todoist-nøgle** og tryk **Gem og test**.
3. Vælg under **Send varerne til**, hvilket projekt (og evt. hvilken sektion) varerne skal i. Appen
   vælger selv et projekt, der hedder noget med "Indkøb", hvis du har et.

På indkøbslisten trykker du så **Send … varer til Todoist**. Hver vare bliver en opgave, og i
beskrivelsen står, hvilken ret den er til. Varer, der allerede er sendt, får mærket "I Todoist" og
sendes ikke igen. Ændrer du mængden bagefter, sendes varen som en ny opgave, så slet den gamle i Todoist.

Todoist-nøglen giver adgang til hele din Todoist, men appen opretter kun opgaver. Den gemmes kun
på den enhed, du skriver den på.

## Ret i appen

Hvis du ændrer i `app.js` eller `madplan.css`, så hæv tallet i `madplan-v2` øverst i `sw.js`.
Appen bruger opskriftsappens `app.css` til farver og knapper, så den følger med, hvis udseendet ændres dér.
