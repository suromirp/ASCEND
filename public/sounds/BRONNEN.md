# Bronnen van de geluiden

Opnames voor de rustbel van Forge staan in deze map, met per bestand de bron en de licentie. Alleen
CC0 of publiek domein, zonder login of sleutel, hoogstens rond 30 KB per stuk (mp3, mono). Een
opname gaat mee in de precache (`vite.config.ts`) en wordt aangemeld in `REST_SOUND_FILES` in
`src/engine/restSounds.ts`. Lukt laden niet, dan klinkt de heldere bel (`src/utils/restBell.ts`).

Stand op 11 november 2026: er staat hier nog geen opname. Alle tien klanken worden gemaakt met
Web Audio. Downloaden van Wikimedia Commons werd in de bouwomgeving geweigerd (HTTP 429, ook voor
de omgezette mp3's). Besluit: `docs/beslissingen/2026-11-11-rusttimer-geluiden.md`.

Kandidaten om later op te halen (beide CC0 op Wikimedia Commons, nog niet beluisterd):

- Vikinghoorn: "Jönses mor skrämde björn - tjulning i horn - SMV - SVA BB 5412 03.wav", een Zweedse
  koehoorn uit het archief van Svenskt visarkiv (SMV). Eén roep van ongeveer anderhalve seconde knippen.
- Cornu: "Hunting horn tone.ogg", een natuurhoorn. Een korte roep knippen.
