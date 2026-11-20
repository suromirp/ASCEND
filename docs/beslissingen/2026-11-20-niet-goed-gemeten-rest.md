# Niet goed gemeten: één regel voor uit, en de ziekte-signalen

Datum: 2026-11-20
Status: aangenomen

## Besluit

Staat "Vragen bij een korte nacht" uit, dan telt een eerder oordeel "Niet goed gemeten" nergens meer mee: niet op de ochtendkaart, niet in de ochtendregel, niet in Wat speelde er en niet bij Vroeg ziek zien. Het oordeel blijft bewaard, dus zet je de instelling weer aan, dan geldt het weer. Elke plek leest de oordelen via één functie, `engine/shortNight.ts#judgmentsInUse`.

Vroeg ziek zien telt de HRV van een nacht die je Niet goed gemeten noemde niet meer mee. Die ochtend is geen ochtend van de reeks, en zijn HRV blijft uit je gemiddelde. Zijn rusthartslag blijft in je gemiddelde, en de regel zelf (twee signalen, twee ochtenden op rij, 6 slagen) is niet veranderd.

## Reden

De ochtendkaart en de ochtendregel negeerden een oordeel al als de instelling uit stond, maar Wat speelde er las het nog. Dezelfde nacht was dan op Vandaag weer een korte nacht en in het overzicht niet. Eén regel voor alle plekken is te volgen en past bij wat het eerste besluit al zei: uit betekent dat alles werkt als voorheen en het veld niet gebruikt wordt.

Bij Vroeg ziek zien telde de HRV van een nacht waarvan je zelf zei dat het horloge hem niet goed mat nog als signaal. Een halve nacht geeft vaak een lage HRV, dus de vraag kon komen door de meting en niet door je lijf. Het eerste besluit haalde die HRV al uit je eigen gemiddelden; hier ontbrak het nog.

## Eigen keuzes van de bouwer

- Uit geldt ook terug in de tijd. Een nacht die je in oktober Niet goed gemeten noemde, is met de instelling uit weer een korte nacht in Wat speelde er. Er wordt niets gewist.
- De ochtend na een nacht die niet goed gemeten is, breekt de reeks van Vroeg ziek zien, net als een ochtend waar je zelf iets bij vastlegde. Overslaan en doortellen is niet gekozen: dan zou één ochtend met beide signalen genoeg kunnen zijn, en dat is een lichtere regel dan besloten.
- Alleen het HRV-deel verandert. De rusthartslag van zo'n nacht telt mee in je gemiddelde, zoals in `2026-10-25-korte-nacht-vragen.md`. Op de rusthartslag alleen komt er geen vraag: de regel vraagt twee signalen, en of dat anders moet hoort bij het onderzoek van I-78.
- Het oordeel "Klopt" doet bij Vroeg ziek zien niets: die nacht telt gewoon mee.
- Een nacht in een vakantie of vrije periode volgt dezelfde regel. Geen van deze plekken leest je vrije dagen.
- Vroeg ziek zien is een vraag en geen waarschuwing. Wie zijn nacht Niet goed gemeten noemt, krijgt die ochtend geen vraag; de ziekmelding zelf staat altijd open en de zorgteksten veranderen niet. Er is geen tekst achter een tik gezet.
- De tijdgrens van 15 seconden bij Opnieuw ophalen op de ochtendkaart wordt gewist zodra het ophalen klaar is en als de kaart weggaat (`utils/withTimeout.ts#timeLimit`). Wat je ziet is hetzelfde.

## Alternatieven

Een oordeel altijd laten gelden, ook met de instelling uit: dan kun je het niet meer zien of ongedaan maken, want de vraag en de regel "Deze nacht telt niet mee" staan er dan niet. De oordelen wissen bij uitzetten: dan is een vergissing niet terug te draaien. Bij Vroeg ziek zien de hele ochtend als uitgelegd behandelen: dan valt ook de rusthartslag uit het gemiddelde, tegen het eerste besluit in.

## Bron

Review van Warden op 18 november (I-92 in `docs/backlog.md`). Regels in `engine/shortNight.ts` en `engine/illnessSigns.ts`, tests in `engine/nightJudgmentRule.test.ts` en `engine/illnessSigns.test.ts`.

## Vervangt

Niets. Vult `2026-10-25-korte-nacht-vragen.md` en `2026-11-18-slaap-zelf-niet-goed-gemeten.md` aan, en de regel van Vroeg ziek zien in `2026-10-31-kansen-stap-0.md`.

## Terugdraaien

Lees in `components/influence/useInfluence.ts`, `components/influence/useInfluenceEffects.ts` en `components/useIllnessSign.ts` weer `settings.nightJudgments` in plaats van `judgmentsInUse(settings)`, en geef `ignoredNights` niet meer mee aan `illnessSign`. Er is geen opgeslagen vorm veranderd.
