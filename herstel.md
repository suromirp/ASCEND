# Warden Wandeling plannen (I-62)

AKKOORD

Moet: geen.

Mag:
- src/components/logForm/useLogForm.ts:51 en src/components/AdHocLogSheet.tsx (TrainingSwitch): het concept is per template-sleutel; wisselen laat het concept van de eerste training als wees staan tot je terugkeert. Staat zo in het besluit, geen dubbel log. Overweeg een regel in docs/werkbriefjes/historie-en-logs.md.
- src/components/WalkPlanSheet.tsx: h-[90vh] met vaste hoogte; controleer door Lookout op 360 px.
- npm run kaart:vergelijk niet afgemaakt (duurde langer dan 5 minuten); kennisindex:vergelijk is schoon.

Gedraaid: tsc schoon, lint 0 fouten (1 oude waarschuwing LegFatigueCard), vitest src/engine, storage en components: 10541 groen. Geen U+2013 of U+2014, geen hexkleuren in de wijziging.
