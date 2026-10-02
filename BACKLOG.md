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
