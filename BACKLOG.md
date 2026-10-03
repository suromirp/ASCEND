# ASCEND backlog

Ideeën en functies die bewust geparkeerd zijn. Niet weg, alleen nog niet aan.

## Korte en minimumversie van een sessie

Een krachtsessie ingekort starten op een dag met weinig tijd: de korte
versie laat optionele oefeningen weg (±45 min), de minimumversie houdt
alleen de kernoefeningen over (±20 min). Telt als gedaan; de minimumversie
telt niet mee voor progressie.

- Status: verborgen in de app, de logica en data staan er nog.
- Weer aanzetten: `SESSION_VARIANTS_ENABLED` in `src/engine/substitutions.ts`
  op `true`. Dan verschijnen de knoppen weer op de Vandaag-kaart, in het
  sessievenster en in de logger.
- Open vraag voor later: hoe dit samengaat met krachttraining die in
  MacroFactor wordt bijgehouden (daar bepaalt MacroFactor de oefeningen).

## Makeover: kiesbare stijl en nieuwe Ascend-pagina

Een volledige makeover van de app, met een stijl die je zelf kiest in
Instellingen. De huidige stijl blijft als "Klassiek" (legacy), opgepoetst.

- Concepten staan op het designcanvas "ASCEND makeover concepten"
  (https://claude.ai/artifact/FPCsJGXXbA8Ma4tZD9MSxs).
- Voorkeur tot nu toe: Onyx (mat zwart, messing, smalle stoere letters,
  technische cijfers), maar zonder wijzerplaat of klok. Drie varianten
  liggen klaar, elk voor hardlopen, GR5 en kracht:
  - A. Profiel: de training als grafiek (intensiteit, helling, sets).
  - B. Typografie: de naam groot, het kerngetal eronder.
  - C. Tijdlijn: de training stap voor stap.
- Andere richtingen die bewaard zijn: Topo (wandelkaart met rood-witte
  GR-markering), Affiche (Zwitserse bergposter), Minimaal, Premium goud,
  Nachtklim, Stoa, Noorderlicht.
- Ascend-pagina wordt een overzicht (doel, aftellen, voortgang,
  vermogens). Doelen instellen verhuist naar een eigen pagina "Doelen
  beheren". Ascend krijgt een opzet per doel: GR5 (hoogteprofiel),
  hardlopen (voorspelde eindtijd, km per week), kracht (hoofdliften en
  sets per spiergroep).
- Animaties: subtiel en functioneel (getallen die optellen, lijnen die
  zich tekenen, balken die vollopen), uit bij "minder beweging".
- Geen RPG-look en geen gamification die meer trainen beloont boven het
  juiste trainen. Rust en deload tellen mee als trouw.
- Open keuzes: welke stijlen in de app komen en welke variant (A, B of C)
  per scherm.
