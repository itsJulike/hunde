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

## Ret i appen

Hvis du ændrer i `app.js` eller `madplan.css`, så hæv tallet i `madplan-v1` øverst i `sw.js`.
Appen bruger opskriftsappens `app.css` til farver og knapper, så den følger med, hvis udseendet ændres dér.
