# feed-reader

Egen tech-nyhetsleser. Henter siste TLDR Tech-utgave server-side via en Netlify Function
(`netlify/functions/tldr.js`) og viser den i `index.html`. Ingen CORS-proxy i produksjon.

## Lokal test

```
npm install
netlify dev
```

Åpne localhost — funksjonen kjører på `/.netlify/functions/tldr`.

## Deploy

Samme dev/main-flyt som steepstone:

1. Push til `dev`-branch mens du itererer, for å ikke bruke opp produksjons build-minutter.
2. Koble Netlify-siten til `dev` som deploy-branch under utvikling, eller bruk deploy previews.
3. Merge til `main` når du er fornøyd — det trigger produksjonsdeploy.

## Neste steg

- Legg til flere kilder: sett opp egne funksjoner for `ai`- og `webdev`-editionene
  (samme `tldr.js`, bare kall med `?edition=ai`), eller legg til Stratechery/Import AI
  som separate RSS-baserte funksjoner.
- Cache: funksjonen setter `Cache-Control: public, max-age=1800` — TLDR oppdateres uansett
  bare én gang daglig, så du kan sette denne enda høyere.
- `node-html-parser` er eneste avhengighet — ingen bundling-hodepine.
