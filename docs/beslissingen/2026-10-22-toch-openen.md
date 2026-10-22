# Toch openen neemt het openingsslot over

Datum: 2026-10-22
Status: aangenomen

## Besluit

Houdt een ander ASCEND-venster het openingsslot langer dan tien seconden vast,
dan staat er naast Opnieuw proberen ook Toch openen. Die knop zet een vlag in
sessionStorage en herlaadt; bij die ene lading neemt deze app het slot over
(Web Locks met `steal`) in plaats van te wachten. De vlag wordt in één keer
gelezen en gewist (`engine/bootWatch.ts#bootLockChoice`), dus hij geldt voor
precies één lading; een vlag die niet te wissen is wordt niet gebruikt.

Het venster waarvan het slot wordt overgenomen, stopt vóór zijn volgende
opstartstap (`storage/bootLock.ts`, `isCancelled` in
`storage/bootMigrations.ts`) en zegt "ASCEND is in een ander venster geopend.",
met Opnieuw proberen. Dat vraagt het slot daarna gewoon weer en wacht.

## Reden

Android pauzeert een tabblad van Chrome op de achtergrond zonder het ooit te
sluiten. Hield dat tabblad het slot vast, dan bleef de geïnstalleerde app
buitengesloten tot je Chrome geforceerd stopte, een stap die de eigenaar niet
hoort te hoeven kennen.

Dit is een uitzondering op
`2026-10-22-openen-wacht-niet-op-de-planning.md`, dat openen zonder slot
afwijst omdat de migraties dan in twee vensters tegelijk kunnen lopen. Dat
besluit blijft staan. De afweging: overnemen gebeurt alleen op jouw tik, nooit
vanzelf na een tijd, en het andere venster stopt vóór zijn volgende stap. Wat
overblijft is hoogstens één stap die in het oude venster nog afrondt terwijl
het nieuwe begint. De stappen zijn zo gemaakt dat ze twee keer mogen lopen
(ze onthouden per versie wat gedaan is en kijken eerst wat er al ligt), en een
gepauzeerd tabblad schrijft niets zolang het gepauzeerd is: bij bevriezen
worden zijn openstaande transacties afgebroken
(`2026-10-22-opslag-vrij-bij-wegleggen.md`).

## Alternatieven

Vanzelf overnemen na een paar seconden: dat is openen zonder slot, wat het
eerdere besluit afwijst, en het zou ook een venster treffen dat gewoon traag is.
Alleen de uitleg om Chrome geforceerd te stoppen: werkt, maar laat de eigenaar
vastzitten tot hij die stap vindt. Het oude venster laten doorlopen na het
overnemen: dan schrijven twee vensters naast elkaar verder.

## Bron

Gesprek met de eigenaar op 22 oktober 2026, review van Warden op de eerste
versie van Toch openen.

## Vervangt

Niets. Aanvulling op `2026-10-22-openen-wacht-niet-op-de-planning.md`, dat niet
is herschreven.

## Terugdraaien

De knop Toch openen in `src/App.tsx` weghalen; zonder vlag wacht elke lading
weer zoals voorheen.
