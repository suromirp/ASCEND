# Lange chat of verse chats

Datum: 19 november 2026. Vraag van de eigenaar: "Maakt het nou echt uit of je dezelfde chat voor coden gebruikt of één vaste coördinator-chat? Claude vat het contextvenster zelf samen; maakt het dan nog uit? Onderzoek dat, en kijk hoe anderen het doen en hoe Claude (Anthropic) het zelf doet."

Gelezen vooraf: `.claude/skills/coordinator-wissel/SKILL.md`, `.claude/coordinator/overdracht.md`, `.claude/skills/werkverdeling/SKILL.md`, `.claude/kosten/logboek.md` en het eerdere onderzoek `docs/onderzoek/Werkwijze autonome agents.md`.

Zekerheid per bewering, zoals in het vorige werkwijze-onderzoek: **zeker** is gemeten of staat in een primaire bron; **waarschijnlijk** is een sterke afleiding of een meting met een kleine of oudere steekproef; **onzeker** is alleen beweerd, of mijn eigen schatting.

## Het antwoord in vijf zinnen

Ja, het maakt uit, en het samenvatten redt je niet: in een cloudsessie vat Claude Code pas samen als het venster van 1 miljoen tokens bijna vol is (rond 967k), terwijl onze coördinator op 12 november al bij 500k en 560k wisselde, dus tot dan draait hij gewoon met de hele geschiedenis. Elke aanroep in een lange chat leest die hele geschiedenis opnieuw; met cache kost dat een twintigste van de normale prijs, maar het groeit lineair met de lengte, dus de kosten van een chat groeien ongeveer kwadratisch, en na een pauze langer dan de cache (een uur) wordt alles opnieuw weggeschreven. Onderzoek laat bij alle geteste modellen zien dat de kwaliteit daalt naarmate de context voller raakt, al bij tienduizenden tokens voor lastige vragen, en samenvatten herstelt dat maar deels, omdat een samenvatting de redenen en kleine afspraken kwijtraakt. Anthropic, OpenAI en de bekende werkwijzen doen het allemaal zo: één chat per samenhangende taak, de staat van het werk in bestanden buiten de chat (voortgangsbestand, git, AGENTS.md of CLAUDE.md), en verse subagents voor het zware lees- en bouwwerk. Voor ASCEND klopt de opzet dus (verse bouwers, overdracht in de repo), maar de wissel moet op lengte in plaats van op de klok, en het overdrachtsbestand zelf is te lang geworden.

## 1. Hoe Claude Code de context gebruikt en samenvat

Elke beurt stuurt alles opnieuw. Claude Code heeft geen geheugen tussen aanroepen; elke aanroep bevat de systeemprompt, CLAUDE.md, elk eerder bericht en elk resultaat van een tool, plus het nieuwe bericht. Elke tool-aanroep binnen één antwoord is ook een nieuwe aanroep met die hele geschiedenis. **Zeker.** Bron: [How Claude Code uses prompt caching](https://code.claude.com/docs/en/prompt-caching), [Manage costs effectively](https://code.claude.com/docs/en/costs).

Wanneer er wordt samengevat. Modellen met een venster van 1M (Opus 4.7 en later, Sonnet 5 en later, de Fable-modellen) vatten standaard pas samen rond 967k tokens. Voor cloudsessies, zoals de onze, zeggen de docs: samenvatten "as the conversation approaches the model's limit". Je kunt het eerder laten gebeuren met `/autocompact` of de variabele `CLAUDE_CODE_AUTO_COMPACT_WINDOW`. Een chat die lang stilligt op de cache van een uur kan ook vroeger worden samengevat (idle compaction, vanaf ongeveer 200k). **Zeker.** Bron: [Model configuration, Default auto-compact thresholds](https://code.claude.com/docs/en/model-config), [Best practices](https://code.claude.com/docs/en/best-practices).

Wat een samenvatting overleeft. Opnieuw van schijf geladen: CLAUDE.md in de root, regels zonder `paths:`, het automatische geheugen, de beschrijvingen van skills, een verse git-status en het plan uit plan mode. Bodies van skills die je gebruikte komen terug, maar afgekapt op 5.000 tokens per skill en 25.000 in totaal, de oudste eerst eruit. Van de gelezen bestanden komen er hoogstens vijf terug, de laatst gewijzigde eerst, en een bestand boven 5.000 tokens alleen als verwijzing. Alles wat alleen in het gesprek stond (een besluit van de eigenaar, een id van een bouwer, waarom iets zo is) gaat in de samenvatting op of verdwijnt. **Zeker.** Bron: [Explore the context window, What survives compaction](https://code.claude.com/docs/en/context-window).

Wat Anthropic zelf over samenvatten zegt. De samenvatting van Claude Code houdt "architectural decisions, unresolved bugs, and implementation details" vast en gooit overbodige tool-uitvoer weg. Maar bij een overdracht naar een volgende sessie "doesn't always pass perfectly clear instructions to the next agent"; daarom werken hun lange agents met een voortgangsbestand en git in plaats van alleen met samenvatten. Een regel die je alleen in het gesprek zegt, zoals "niet pushen voordat ik heb gekeken", kan bij het samenvatten verloren gaan; wat ertoe doet hoort in een vaste regel. **Zeker** (bron zegt het), maar zonder cijfers over hoe vaak het misgaat. Bron: [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), [Best practices](https://code.claude.com/docs/en/best-practices).

Het officiële advies. "`/clear` between unrelated tasks. It costs nothing, and it means the next task doesn't keep paying for the previous one's history." En: "a focused context gets you better answers and costs less." Na twee mislukte correcties: opnieuw beginnen met een betere prompt, omdat een derde correctie vooral een gesprek verlengt waarin twee mislukte pogingen staan die Claude telkens weer leest. **Zeker** (advies van de maker, geen meting erbij). Bron: [Best practices](https://code.claude.com/docs/en/best-practices).

## 2. Kwaliteit bij een volle context

Context rot. Chroma testte 18 modellen (waaronder Claude 4, GPT-4.1, Gemini 2.5) met bewust eenvoudige taken waarin alleen de lengte veranderde. Bij alle modellen werd het resultaat onbetrouwbaarder naarmate de invoer langer werd, ook bij simpel kopiëren. Op LongMemEval scoorden alle modellen duidelijk beter met een gerichte prompt van zo'n 300 tokens dan met dezelfde vraag in de volle geschiedenis van zo'n 113k tokens. Afleiders (stukken die op het antwoord lijken) maakten het erger. **Zeker** voor deze modellen, **waarschijnlijk** voor nieuwere modellen. Bron: [Chroma, Context Rot, juli 2025](https://www.trychroma.com/research/context-rot).

Verloren in het midden. Modellen vinden informatie het best aan het begin of eind van een lange invoer en slechter in het midden. **Zeker** voor de modellen van 2023; nieuwere modellen hebben dit minder, Chroma zag het in zijn eenvoudige zoektest niet meer terug. Bron: [Liu e.a., Lost in the Middle, TACL 2024](https://arxiv.org/abs/2307.03172).

Zoeken zonder letterlijke overeenkomst. NoLiMa liet 13 modellen die 128k of meer beloven een antwoord vinden dat niet letterlijk in de vraag staat. Bij 32k zakten 11 van de 13 onder de helft van hun score bij korte invoer; GPT-4o ging van 99,3 naar 69,7 procent. **Zeker** voor deze modellen. Bron: [Modarressi e.a., NoLiMa, ICML 2025](https://arxiv.org/abs/2502.05167).

Lange gesprekken zijn erger dan lange documenten. Laban en collega's knipten opdrachten in stukjes over meerdere beurten, zoals een echt gesprek. Over 15 modellen en zes taken zakte de score gemiddeld 39 procent tegen dezelfde opdracht in één keer. Het kwam vooral door onbetrouwbaarheid (vroege aannames waar het model daarna aan vasthoudt), niet doordat het model minder kon; het effect zat al in gesprekken van twee beurten. **Zeker** voor de gemeten modellen. Dit is precies het patroon van een coördinator die de hele dag bijsturingen krijgt. Bron: [Laban e.a., LLMs Get Lost In Multi-Turn Conversation](https://arxiv.org/abs/2505.06120).

Wat samenvatten daaraan doet. Samenvatten maakt de context weer kort en gericht, en daarmee beter. Maar het is verliesgevend: de samenvatter kiest wat belangrijk is, en Anthropic, OpenAI en Cognition noemen het allemaal een noodgreep die moeilijk goed te krijgen is. Cognition: een samenvatter die geschiedenis terugbrengt tot "key details, events, and decisions" rekt de tijd op, maar loopt uiteindelijk ook tegen een grens aan. Een eerlijke meting die samenvatten vergelijkt met een verse chat plus een goed overdrachtsbestand heb ik niet gevonden. **Waarschijnlijk** (eensgezind advies, geen meting). Bron: [Cognition, Don't build multi-agents](https://cognition.com/blog/dont-build-multi-agents), [OpenAI Codex best practices](https://learn.chatgpt.com/guides/best-practices).

Kanttekening. De metingen gaan over modellen van 2023 tot 2025. Hoe groot de daling is voor Opus 5.5 op 500k tokens weet niemand publiek. Dat er een daling is, staat in elke studie en in de docs van Anthropic zelf ("the model's ability to accurately recall information from that context decreases"). **Onzeker** hoe groot, **zeker** dat het de goede kant op wijst.

## 3. Kosten: prompt caching in een lange en een verse chat

Hoe de cache werkt. De cache matcht het begin van de aanroep exact. In een gewone beurt is dat alles behalve het nieuwste stuk. Gelezen uit de cache kost op Opus 5.5 $0,20 per miljoen tokens (een twintigste van de $4 normale invoer); wegschrijven kost 1,25 keer de invoerprijs bij de cache van vijf minuten en 2 keer bij die van een uur. Op een abonnement binnen het plan krijgt de hoofdchat de cache van een uur, subagents vijf minuten. Na een pauze langer dan de cache wordt de hele geschiedenis opnieuw verwerkt en weggeschreven. Samenvatten, van model wisselen of een MCP-server aanzetten breekt de cache ook. **Zeker.** Bron: [How Claude Code uses prompt caching](https://code.claude.com/docs/en/prompt-caching), [Prompt caching (API)](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), prijzen uit de Claude API-skill van 3 november 2026.

Kost elke beurt in een lange chat meer, ook met cache? Ja. De docs zeggen het letterlijk: "a one-line question in a session that has been open all day still draws usage for the whole conversation." Per aanroep betaal je de hele context tegen het cachetarief. Een coördinator op 500k betaalt per aanroep ongeveer 500.000 × $0,20 / 1.000.000 = $0,10 alleen om te lezen; een verse coördinator op 80k betaalt $0,016. Een beurt met tien tool-aanroepen is dan $1 tegen $0,16. **Zeker** voor de rekenregel, de getallen zijn een voorbeeld.

Groei is kwadratisch. Omdat elke aanroep alles leest wat ervoor kwam, kost een chat die groeit tot lengte L ongeveer het aantal aanroepen keer de gemiddelde lengte. Twee keer zo lang doorgaan is dus ongeveer vier keer zoveel leeskosten, niet twee keer. **Zeker** (volgt uit de rekenregel).

Nagerekend met het logboek. Het kostenlogboek noemt voor 12 november: coördinator ca. $23 tot een vroege wissel bij ongeveer 500k context, en daarna ca. $32 tot de wissel bij ongeveer 560k. Bouwers in een eigen sessie kostten meestal $5 tot $12 bij 200k tot 350k context. Een ruwe schatting voor de $23: een verse coördinator start rond 80k (systeemprompt en tools plus CLAUDE.md, overdracht, eigenaar.md, werkverdeling en backlog; samen ruim 165 KB tekst). Groeit hij naar 500k, dan is de gemiddelde context bij een aanroep zo'n 290k, dat is $0,058 per aanroep. Rond 300 aanroepen geeft dan ongeveer $17 aan lezen, plus het wegschrijven van 420k nieuwe tokens tegen het uurtarief ($3,40) en de uitvoer. Dat komt uit op ongeveer het gelogde bedrag, dus het beeld klopt: het grootste deel van een coördinatordag is het steeds opnieuw lezen van de eigen geschiedenis. **Waarschijnlijk** (het aantal aanroepen staat niet in het logboek en de prijzen van 12 november kunnen anders zijn geweest; de verhouding blijft).

Wat een extra wissel kost en oplevert. Splits je dezelfde dag in twee chats die elk tot zo'n 290k groeien, dan zakt het lezen van ongeveer $17 naar ongeveer $11, terwijl een extra start ongeveer 80k tokens wegschrijven kost, zo'n $0,65. De wissel zelf is dus goedkoop; de lengte is duur. **Waarschijnlijk** (eigen rekenvoorbeeld met de echte prijzen).

Pauzes en het uur-ritme. Een chat die langer dan een uur stilligt, verliest de cache; de volgende beurt schrijft dan alles opnieuw weg. Bij 500k is dat zo'n $4 per keer (500k tegen het uurtarief van $8 per miljoen). Taken die een lange chat elk uur wekken (de Wachter, de uurtaak van de Werkkaart) zitten precies op die grens, en een melding na een stil uur betaalt dus de hele geschiedenis opnieuw. **Waarschijnlijk** (rekenregel zeker; of de wekmomenten net binnen of buiten het uur vallen, heb ik niet gemeten).

Een abonnement rekent niet in dollars, maar de docs zeggen dat lange context en cachemissers meetellen voor de limieten van het plan, en `/usage` geeft er zelf aanbevelingen over. De weeklimiet waar het overdrachtsbestand op 17 november voor waarschuwde (47 procent op dinsdag) past bij dit beeld. **Waarschijnlijk.** Bron: [Manage costs effectively, Why usage climbs in a long session](https://code.claude.com/docs/en/costs).

## 4. Hoe anderen het doen

Anthropic, onderzoekssysteem. Een leidende agent maakt een plan, zet dat in een geheugen buiten de context, en start subagents met een schone context die elk een gerichte samenvatting teruggeven. Voor lange gesprekken: "agents can spawn fresh subagents with clean contexts while maintaining continuity through careful handoffs." Gemeten: met Opus 4 als leider en Sonnet 4-subagents scoorde het 90,2 procent beter dan Opus 4 alleen op hun eigen onderzoekstest, en het aantal tokens verklaarde 80 procent van het verschil in prestaties. Het kost wel zo'n 15 keer de tokens van een chat. Ze zeggen er zelf bij dat code minder goed op te splitsen is dan onderzoek. **Zeker** voor hun eigen test (interne meting, niet onafhankelijk herhaald). Bron: [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system).

Anthropic, lange bouwtaken. Elke sessie begint vers. Een eerste agent zet een featurelijst, een voortgangsbestand en een eerste commit klaar; elke volgende sessie leest eerst de map, de git-log, het voortgangsbestand en de featurelijst, draait een korte test, en werkt dan één feature af tot een schone, samenvoegbare staat. Hun kernzin: "finding a way for agents to quickly understand the state of work when starting with a fresh context window." **Zeker** dat ze het zo doen, zonder harde cijfers over het verschil met één lange chat. Bron: [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents).

Anthropic, context engineering. Drie middelen voor lange taken: samenvatten (voor veel heen en weer), gestructureerde notities buiten de context (voor werk met duidelijke mijlpalen), en subagents die "a condensed, distilled summary of its work (often 1,000-2,000 tokens)" teruggeven (voor parallel uitzoekwerk). **Zeker** (advies van de maker). Bron: [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents).

OpenAI Codex. "Keep one chat per coherent unit of work." Een veelgemaakte fout volgens OpenAI: "Using one chat for an entire project instead of one chat per coherent outcome", wat "leads to bloated context and worse results over time". Vaste regels horen in AGENTS.md of een skill, niet in het gesprek, en AGENTS.md moet kort blijven. **Zeker** (advies van de maker, geen meting). Bron: [OpenAI Codex best practices](https://learn.chatgpt.com/guides/best-practices).

Cognition (Devin) als tegengeluid. Zij waarschuwen juist tegen te veel losse agents: "Share context, and share full agent traces, not just individual messages", omdat losse agents elkaars impliciete keuzes niet zien en werk opleveren dat niet past. Dat pleit niet voor één eindeloze chat, maar voor zorgvuldige overdracht van besluiten en redenen, niet alleen van taken. **Onzeker** (mening van een maker, geen meting). Bron: [Cognition, Don't build multi-agents](https://cognition.com/blog/dont-build-multi-agents).

Cursor en losse ontwikkelaars. Wat ik over Cursor vond (nieuwe chat per taak, de ring die laat zien hoe vol de context is) komt uit blogs en forums, niet uit eigen docs van Cursor; tweedehands bronnen spreken elkaar ook tegen over of Cursor zelf samenvat. Veel ontwikkelaars met Claude Code melden dezelfde gewoonten: `/clear` tussen taken, een handoff-bestand, CLAUDE.md kort. **Onzeker** (beweerd, niet gemeten). Bron: [flaviocopes over compaction](https://flaviocopes.com/ai-glossary/compaction/), [OpenAI-forum over context in Codex](https://community.openai.com/t/how-are-people-managing-context-in-codex/1393098).

Gemeten tegenover beweerd, samengevat. Gemeten zijn: dat lange context de kwaliteit drukt (Chroma, NoLiMa, Laban), dat verse subagents met een leider beter scoren op onderzoek (Anthropic, intern), en hoe de cache rekent (docs). Alleen beweerd of aangeraden zijn: dat een verse chat met handoff beter werkt dan samenvatten, hoe vaak je moet wisselen, en hoe goed een overdrachtsbestand de kennis overbrengt. Een directe meting van "één lange coördinator tegen dagelijkse verse coördinatoren" bestaat niet.

## 5. Wat dit betekent voor ASCEND

De opzet klopt. Bouwers en helpers starten vers, met een opdracht, een werkbriefje en de kennisindex; dat is precies het patroon van Anthropic en OpenAI. De les uit de werkverdeling dat herstel naar dezelfde bouwer goedkoper is dan een nieuwe (20k tot 40k tegen 90k tot 290k), past bij de cache, met één voorwaarde: een subagent heeft een cache van vijf minuten, dus wie later dan dat hervat, betaalt de hele context opnieuw.

De dagelijkse wissel is op twee manieren niet goed afgesteld.
- Te weinig op drukke dagen: op 12 november moest er twee keer vroeg gewisseld worden, bij 500k en 560k. Op die lengte betaalt elke beurt al zes keer zo veel als vers, en de kwaliteit zit volgens alle metingen ver in het gebied waar hij daalt. De automatische samenvatting komt pas rond 1M en helpt hier dus niet.
- Zinloos op stille dagen: een chat die weinig groeit, hoeft niet om 04:47 weg. De klok meet niet wat duur en riskant is; de lengte doet dat.

Het overdrachtsbestand is zelf een lange chat geworden. Het is 45 KB met 18 "Stand"-koppen, de meeste verouderd, terwijl de eigen regel zegt "verouderde regels eruit". Elke verse coördinator leest het helemaal, en de belangrijke stand staat tussen oude standen (precies het "verloren in het midden"-risico). Samen met backlog, werkverdeling, CLAUDE.md en eigenaar.md start een coördinator op ruim 165 KB tekst.

Wat je verliest bij een wissel, en hoe je het opvangt.
- Besluiten met hun reden en kleine afspraken uit het gesprek. Opvangen: elk besluit meteen in de overdracht (dat staat al in CLAUDE.md), met de reden in één zin.
- Lopende dingen die aan de oude sessie vastzitten: taken met `persistent_session_id` naar de oude chat, achtergrondhelpers, worktrees. Dat ging al mis (de taak "Bouwers nakijken" bleef in een oude chat vuren). Opvangen: een vaste lijst in de overdracht van alles wat aan de sessie hangt, en bij de wissel elk punt omzetten of uitzetten.
- De keten van sessies (diepte 8). Al opgelost met `create_trigger` zonder keten.
- Het gevoel voor de eigenaar (toon, wat hij al weet). Dat zit deels in CLAUDE.md en eigenaar.md; de rest is echt verlies, maar klein tegenover de kosten van een chat van 500k.

## Advies voor ASCEND

Dit is een advies. De eigenaar beslist; aan de werkwijze zelf is niets veranderd.

- Wissel de coördinator op lengte, niet op de klok: wissel bij ongeveer 250k tot 300k context, en ook na elke afgeronde bouwronde, en sla de wissel van 04:47 over als de chat nog kort is. Een wissel kost ongeveer $0,65, een middag op 500k veel meer.
- Laat de automatische samenvatting eerder komen als vangnet, bijvoorbeeld met `CLAUDE_CODE_AUTO_COMPACT_WINDOW=300000` in de omgeving. Dat is een instelling van Claude Code; alleen doen als de eigenaar het wil.
- Maak het overdrachtsbestand kort en vast van vorm: één huidige stand van hoogstens een scherm (lopend werk met sessie, branch en taak-id's; wat aan deze sessie hangt; open vragen; het plan), daarna besluiten met reden. Oude standen eruit; ze staan in git. Doel: onder 10 KB.
- Laat de verse coördinator op aanvraag lezen: de backlog en de werkverdeling niet helemaal bij de start, alleen het stuk dat hij nodig heeft (grep op `I-<n>`, de tabel van de werkverdeling).
- Houd bouwers en helpers vers, één taak per sessie; dat is al zo en klopt met elke bron. Herstel naar dezelfde bouwer alleen binnen een paar minuten, anders een nieuwe met alleen de lijst.
- Wek een lange chat niet elk uur voor niets. Een taak die elk uur een chat wakker maakt, betaalt na een stil uur de hele geschiedenis opnieuw. Laat zo'n taak in een verse sessie per keer draaien, of alleen als er iets te doen is. Controleer de uurtaak van de Werkkaart hierop.
- Voeg in het kostenlogboek per coördinatorsessie de context bij de wissel en het bedrag toe. Dan meten we na twee weken zelf of de wissel op lengte goedkoper is, in plaats van het te geloven.

## Bronnen

- [Claude Code, Manage costs effectively](https://code.claude.com/docs/en/costs)
- [Claude Code, How Claude Code uses prompt caching](https://code.claude.com/docs/en/prompt-caching)
- [Claude Code, Explore the context window](https://code.claude.com/docs/en/context-window)
- [Claude Code, Model configuration](https://code.claude.com/docs/en/model-config)
- [Claude Code, Best practices](https://code.claude.com/docs/en/best-practices)
- [Claude API, Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Anthropic, Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Anthropic, How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Anthropic, Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Chroma, Context Rot](https://www.trychroma.com/research/context-rot)
- [Liu e.a., Lost in the Middle](https://arxiv.org/abs/2307.03172)
- [Modarressi e.a., NoLiMa](https://arxiv.org/abs/2502.05167)
- [Laban e.a., LLMs Get Lost In Multi-Turn Conversation](https://arxiv.org/abs/2505.06120)
- [OpenAI Codex best practices](https://learn.chatgpt.com/guides/best-practices)
- [Cognition, Don't build multi-agents](https://cognition.com/blog/dont-build-multi-agents)
