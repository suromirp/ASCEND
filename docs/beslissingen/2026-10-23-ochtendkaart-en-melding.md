# Ochtendkaart en ochtendmelding

Datum: 2026-10-23
Status: aangenomen

## Besluit

In de ochtend staat bovenaan Vandaag, boven de missiekaart, een eigen kaart met de vraag "Goedemorgen. Hoe voel je je?". Daarin staat wat het horloge gaf, staan de vier keuzes voor je benen, en is alles wat ASCEND al weet alvast ingevuld, met de bron erbij. Daarnaast kan ASCEND in de geïnstalleerde app op Chrome voor Android een melding tonen die dezelfde vraag stelt.

## Reden

De eigenaar zocht de ochtendvraag tevergeefs: hij zat achter een regel in "Je dag" die niet als knop te herkennen was, en zijn slaap stond er niet bij. De vraag hoort zichtbaar te zijn op het moment dat hij ertoe doet, en mag niet meer kosten dan één tik als ASCEND het antwoord al kan vermoeden.

De kaart staat boven de missie en niet eronder. Wat je antwoordt kan de dag veranderen, de kaart verdwijnt na één tik, en onder de lange missiekaart zou hij op 360 px buiten beeld staan. De missiekaart houdt de gouden knop; de ochtendkaart is steen met alleen een bronzen rand om het voorstel.

Wanneer de kaart er staat: de ochtendcheck en de ochtendkaart staan aan, vandaag is nog niet ingevuld, het is voor twaalven en er is vandaag nog geen training gelogd. Daarna blijft de regel "Gevoel" in "Je dag" als samenvatting. Zolang de kaart staat, wacht die regel, zodat er niet twee keer dezelfde vraag staat.

Vooraf ingevuld, altijd met "uit je horloge" of "volgens je beenindex" erbij:
- slaap uit het horloge (bestond al);
- benen uit de beenindex: Fris blijft Fris, "Wat vermoeid" wordt "Wat stijf", "Vermoeid" wordt "Spierpijn". Flinke spierpijn stelt ASCEND nooit voor. Met pijn in de benen van de laatste dagen is Fris nooit het voorstel, en zonder iets wat nog meetelt valt er niets te zeggen;
- energie alleen als rusthartslag en HRV allebei duidelijk dezelfde kant op wijzen ten opzichte van je eigen gemiddelde van vier weken. Anders blijft energie leeg en mag leeg blijven.

Opslaan is één tik als alles staat. De knop heet overal "Opslaan".

Als het horloge wel iets gaf maar geen slaap, zegt de kaart dat in een paar woorden en biedt "Opnieuw ophalen" aan (grens van 15 seconden, zichtbare uitkomst). Slaap komt via Garmin Connect soms later bij intervals.icu dan de rusthartslag. Daarom haalt de app ook opnieuw op als hij in de ochtend weer in beeld komt en de slaap van vandaag nog mist, met dezelfde grens van 15 minuten als de gewone ophaalronde.

### De melding

Er is geen server en geen push. Onderzocht op 23 oktober 2026:
- Periodic Background Sync (`registration.periodicSync`, `minInterval`) werkt alleen in Chromium, alleen voor een geïnstalleerde app, en Chrome bepaalt aan de hand van een betrokkenheidsscore hoe vaak de service worker wakker wordt. Een precies tijdstip bestaat niet. De MDN-pagina noemt het "Limited availability" (niet in Firefox en Safari).
- Notification Triggers (`TimestampTrigger`, een melding op een vast tijdstip plannen) staat niet op MDN en is nooit uit de experimentele fase gekomen. Daar bouwen we niet op.
- `showNotification` in de service worker na een `periodicsync` werkt wel.

Gekozen variant: bij aanzetten vraagt ASCEND toestemming en meldt zich aan voor de periodieke sync (twaalf uur als minimum). De service worker (`public/morning-notice-sw.js`, binnengehaald met `importScripts` in de bestaande gegenereerde service worker, dus de precache en het offline gedrag blijven zoals ze waren) leest dan uit IndexedDB de instellingen en of er vandaag al een melding was. De beslissing "moet er nu een melding komen?" staat als pure functie in `engine/morningNotice.ts`; het script bevat dezelfde beslissing, en een test draait het script met dezelfde gevallen zodat ze niet uit elkaar lopen. De melding komt na de ingestelde tijd en niet na elven, hoogstens één keer per dag, en niet als vandaag al is ingevuld. Een tik opent Vandaag op `#/?actie=ochtend` met het blad open.

De instelling "Ochtendmelding" staat standaard uit, met een tijd (standaard 07:30, "rond" want Chrome bepaalt het moment). Kan de telefoon het niet, dan zegt de rij dat eerlijk. De rij heeft maar ruimte voor 40 tekens, dus de rij zegt "Alleen als je de app opent" of "Zet ASCEND eerst op je beginscherm" en het blad achter de rij heeft de hele zin: "Je telefoon laat ASCEND niet op de achtergrond wakker worden; je krijgt de vraag als je de app opent."

Nieuwe instellingen: `overviews.morningCard` (standaard aan) en `morningNotice: { enabled, time }` (standaard uit). Beide zijn optioneel en komen in de back-up; `morningNotice` wordt bij het inlezen gecontroleerd (`cleanMorningNotice`). De toestemming van de telefoon gaat niet mee: na een import staat de schakelaar uit tot de toestemming er is. Er is geen migratiestap nodig omdat de velden optioneel zijn.

## Alternatieven

- De kaart onder de missie: op 360 px buiten beeld, en dus weer moeilijk te vinden.
- Een melding op een vast tijdstip met Notification Triggers: bestaat niet in een bruikbare vorm.
- Een pushserver: past niet bij "geen backend, geen account".
- De service worker omzetten naar `injectManifest`: meer risico voor het offline gedrag, terwijl `importScripts` hetzelfde bereikt en al in gebruik is voor delen met ASCEND.
- Energie altijd voorstellen uit het horloge: een enkel signaal is te onzeker.

## Bron

Gesprek met de eigenaar over de ochtendvraag; `docs/onderzoek/Pijn spierpijn en vermoeidheid melden.md` voor de vraag zelf; Chrome-documentatie over Periodic Background Sync (developer.chrome.com/docs/capabilities/periodic-background-sync) en MDN over de Web Periodic Background Synchronization API.

## Vervangt

Niets. De ochtendcheck zelf, de regel "Gevoel" en de horloge-uitleg (docs/visie, idee 3) blijven zoals ze waren.

## Terugdraaien

De ochtendkaart uitzetten kan in Instellingen, Vandaag en meldingen. De melding staat standaard uit en uitzetten meldt de periodieke sync af. Wil je het helemaal weg, haal dan `morning-notice-sw.js` uit `workbox.importScripts` in `vite.config.ts`.
