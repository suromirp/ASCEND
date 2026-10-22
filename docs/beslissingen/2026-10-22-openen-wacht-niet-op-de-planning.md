# Openen wacht niet op de planning

Datum: 2026-10-22
Status: aangenomen

## Besluit

De app opent na de migraties en het lezen van de gegevens, en rekent de
planning daarna op de achtergrond door. Alles wat de planning verandert
(Akkoord, ongedaan maken, vrije dagen, geen tijd vandaag, het herstel van een
afwijking) wacht eerst tot de syncs in de wachtrij klaar zijn en leest daarna
de opgeslagen planning. De syncs lopen altijd na elkaar; wie langer dan een
minuut wacht, wordt losgelaten, de sync zelf loopt in de wachtrij af. De
openingsmigraties lopen nooit zonder het openingsslot: wacht een ander venster
langer dan 10 seconden, dan zegt de app dat, met Opnieuw proberen. Na een
seconde zonder app staat het logo in beeld, na 6 seconden wat er gebeurt, na 20
seconden Opnieuw proberen en Back-up maken met de stap die hangt.

## Reden

De eigenaar kreeg na herladen een zwart scherm dat niet wegging: het openen
wachtte op een planningssync zonder grens. Twee syncs tegelijk kunnen dezelfde
weken dubbel toevoegen, en een wijziging op de planning van voor de sync kan
terugzetten wat de sync net rechtzette; daarom de wachtrij en het wachten.

## Alternatieven

Een grens op de sync zelf die hem afbreekt: kan niet, de sync schrijft in losse
stappen. Openen zonder slot na een paar seconden: kan de migraties in twee
vensters tegelijk laten lopen. Knoppen uitschakelen tot de eerste sync klaar
is: geeft een app die even niets doet zonder te zeggen waarom.

## Bron

Gesprek met de eigenaar op 22 oktober 2026, onderzoek van Sherpa Vandaag met
nagemaakte omstandigheden, review van Warden.

## Vervangt

Niets.

## Terugdraaien

De boot weer op de sync laten wachten in `engine/bootWatch.ts#runBoot`.
