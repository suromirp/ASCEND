---
name: naspelen
description: Speelt een melding van de eigenaar na met zijn back-up, zoals de app zelf opent (tijdzone, registers, opstartstappen). Gebruik als een fout alleen met echte data te zien is, voordat je een helper start.
---

# Naspelen met de back-up van de eigenaar

Alleen met toestemming in het gesprek, en alleen lezen. De back-up staat in de scratchpad (`backup-eigenaar-N/b.json`,
chmod 600) en komt nooit in de repo, tests of commits.

1. Kopieer `.claude/skills/naspelen/probe.test.ts.txt` naar `src/storage/zzprobe.test.ts` en zet je vraag op de plek
   onderaan de lus.
2. Draai, met de tijdzone en het moment van de eigenaar:
   `TZ=Europe/Amsterdam WHEN=<JJJJ-MM-DDTHH:MM:00> PROBE=<scratchpad>/backup-eigenaar-N/b.json OUT=<scratchpad>/probe.out npx vitest run src/storage/zzprobe.test.ts`
   De uitvoer van console.log valt weg; lees `probe.out`.
3. Verwijder `src/storage/zzprobe.test.ts` en `probe.out` meteen, en kijk met `git status` dat er niets achterblijft.

Waarom zo (5 november): zonder `primePlanningRegisters()` rekent de planning met andere duren dan de app en zie je de
fout niet; de tijdzone en het tijdstip bepalen wat vandaag is. De lijst met wat de weekcontrole schreef
(`planChangeProposals` met `trigger: 'plan_check'`) laat in de back-up zelf zien of iets bij elke opening terugkomt.
Een snelle eerste blik kan ook zonder app: `python3 -I` over de back-up, alleen lezen.
