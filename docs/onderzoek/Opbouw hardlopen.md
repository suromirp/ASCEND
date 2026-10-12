# Opbouw: hoe snel je lopen mogen groeien

Onderbouwing van de loopopbouw in de Opbouw-fase (`engine/programLayout.ts#runBuildMultiplier`) en de vierde loop (`engine/extraRun.ts`). Per regel staat de sterkte van het bewijs. Opgesteld in oktober 2026.

## De 10%-regel gaat over één loop, niet over je week

De grootste studie tot nu toe volgde 5.205 hardlopers met een Garmin 18 maanden lang, over meer dan 500.000 trainingen ([Frandsen e.a. 2025, BJSM](https://pmc.ncbi.nlm.nih.gov/articles/PMC12421110/)). Elke loop werd vergeleken met je langste loop van de 30 dagen ervoor. Vergeleken met hooguit 10% langer:

- 10 tot 30% langer: ongeveer 64% meer kans op een overbelastingsblessure;
- 30 tot 100% langer: ongeveer 52% meer;
- meer dan het dubbele: ongeveer 128% meer.

Het risico loopt dus niet geleidelijk op. Het springt al omhoog net boven de 10%. De stijging van je weektotaal, week op week, hing in dezelfde studie niet samen met blessures (bewijs: matig, één grote verkennende studie; deelnemers gemiddeld 46 jaar, blessures zelf gemeld).

Bij 873 beginnende lopers gaven 10 tot 30% meer kilometers per twee weken geen duidelijk hoger risico dan minder dan 10%. Boven 30% wel, voor blessures die met afstand samenhangen ([Nielsen e.a. 2014, JOSPT](https://www.jospt.org/doi/10.2519/jospt.2014.5164)) (bewijs: matig).

**Wat ASCEND daarmee doet.** Eén loop blijft binnen 110% van je langste van de afgelopen 30 dagen, ook op Stevig (`engine/substitutions.ts`). Er is geen instelling om dat ruimer te maken: tussen 10 en 30% is geen veilige marge gevonden.

## De lange duurloop: 10% per blok van vier weken

In de basis groeit alles langzaam, 8% per blok, en dat stopt bij 1,3 keer rond week 17. In de Opbouw groeien de lange duurloop en de rustige loop elk blok 10% ten opzichte van het blok ervoor. De zwaarste week van een blok ligt vier weken na de vorige zwaarste week, dus binnen de 30 dagen. Zo komt die loop nooit meer dan 10% boven je langste van de maand ervoor (afgeleid van Frandsen e.a. 2025).

De lange duurloop stopt rond 2 uur, de rustige loop rond 55 minuten. Daarna, in Bergcapaciteit en Expeditieklaar, blijft dat niveau staan. Twee uur is een gangbare lange duurloop in een marathonopbouw en ruim genoeg als basis voor lange wandeldagen (bewijs: expert).

## Je week groeit via een extra loop

Omdat het weektotaal sneller mag groeien dan één loop, komt de extra groei uit een vierde, korte en rustige loop. Daarmee groeit je week zonder dat één loop een sprong maakt (afgeleid van Frandsen e.a. 2025 en Nielsen e.a. 2014).

Die vierde loop is verdiend, niet vast. ASCEND zet hem alleen in een week als:

- je in de Opbouw zit en het geen rustweek is;
- je ambitie niet op Rustig staat;
- je de laatste weken minstens 80% van je trainingen deed, en 75% van de lange (dezelfde lat als "Op koers");
- je de afgelopen twee weken geen pijn aangaf, hooguit één training zwaarder voelde dan gepland, en je niet ziek bent.

ASCEND beslist dat alleen voor deze week en de volgende, zodat een slechte periode nooit weken vooruit in je plan staat. Het blijft bij rustig lopen: in de basisfase en de Opbouw hoort zo'n 75 tot 80% van je training laag-intensief te zijn ([Oliveira e.a. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11329428/)) (bewijs: matig).

## De versnellingen

Aan het eind van die loop staan 6 versnellingen van 20 seconden, soepel tot ongeveer je 5 km-tempo, met volledige rust ertussen. Dat is gangbare coachingspraktijk om loopsnelheid en een soepele pas te oefenen zonder vermoeidheid (bewijs: expert; geen studie die versnellingen los toetst). Je kunt ze altijd weglaten.

## Wat dit niet onderbouwt

- Dat jonge, fitte lopers sneller kunnen opbouwen. Dat is aannemelijk, maar niet aangetoond: pezen en botten passen zich trager aan dan hart en longen.
- Een vijfde loop. Die zit er bewust niet in.
