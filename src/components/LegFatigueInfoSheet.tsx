import type { ReactNode } from 'react';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { Card, Eyebrow, SheetGrip } from './ui';
import { Icon } from './icons';

// The full explanation of the leg fatigue index: what it counts, how heavy
// each input weighs, how reliable it is and what to do yourself. From
// docs/onderzoek/Spierbelasting en beenvermoeidheid.md and Betrouwbaarheid
// beenvermoeidheid-index.md.

const SOURCES: { label: string; url: string }[] = [
  { label: 'Burt, Doma en Connor 2023: loopeconomie na spierschade', url: 'https://researchonline.jcu.edu.au/77226/' },
  { label: 'Bontemps e.a. 2020: herstel na bergaf lopen', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7674385/' },
  { label: 'Doma en Deakin 2013: kracht voor of na een loop', url: 'https://researchonline.jcu.edu.au/28717/' },
  { label: 'Morán-Navarro e.a. 2017: herstel na sets tot falen', url: 'https://pubmed.ncbi.nlm.nih.gov/28965198/' },
  { label: 'Maeo e.a. 2017: het repeated bout effect', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5348007/' },
  { label: 'Saw, Main en Gastin 2016: gevoel volgt belasting', url: 'https://bjsm.bmj.com/content/50/5/281' },
  { label: 'Halperin e.a. 2022: hoe goed je herhalingen in reserve inschat', url: 'https://pubmed.ncbi.nlm.nih.gov/34542869/' },
  { label: 'Ammann e.a. 2016: hoogtemeters van sporthorloges', url: 'https://pubmed.ncbi.nlm.nih.gov/26851440/' },
];

export function LegFatigueInfoSheet({ onClose }: { onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow="Benen" title="Hoe fris zijn je benen?" onClose={requestClose} /></div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
              Het getal bij Benen is een schatting van wat er van je recente trainingen nog in je benen zit. ASCEND zet je testloop en wedstrijd op een dag met frisse benen en kiest wat schuift als dat niet kan.
            </p>

            <Section title="Drie soorten vermoeidheid">
              <Bullet head="Intensiteit">Hard lopen en intervallen. Halveert elke 12 uur: na een dag is driekwart weg.</Bullet>
              <Bullet head="Kracht en klappen">Zware beenkracht en de klappen van lopen. Halveert per dag.</Bullet>
              <Bullet head="Spierschade">Van bergaf en van zakken in een squat of RDL. Blijft de eerste dag staan, halveert daarna elke anderhalve dag en is 3 tot 5 dagen merkbaar. Een snelle loop merkt het meest.</Bullet>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>Samen tellen ze op. Een rustige loop van 40 minuten kost de dag erna nog geen 2 punten, een volle Benen A ruim 13.</p>
            </Section>

            <Section title="De grenzen">
              <Bullet head="8 of lager">Fris genoeg voor een testloop.</Bullet>
              <Bullet head="Tot 12">Goed voor een harde training, zoals heuvels of intervallen.</Bullet>
              <Bullet head="3 tot 5">Wat je wilt op een wedstrijddag, met een rustige week ervoor.</Bullet>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>Je went eraan: een tweede vergelijkbare training binnen drie weken telt minder zwaar. Na ongeveer zes weken zonder is dat voorbij.</p>
            </Section>

            <Section title="Wat het zwaarst meetelt">
              <Bullet head="Je beentraining">Duur (tot 75 minuten), zwaarte en gewenning. Het getal schuift de dag erna 5 tot 12 punten. Van krachttraining weet ASCEND alleen duur en RPE; zonder RPE rekent hij met 8.</Bullet>
              <Bullet head="Bergaf">24 punten per 1.000 m dalen, anderhalf keer zoveel als hardlopend dalen, meer met een rugzak. Op vlak terrein telt het weinig.</Bullet>
              <Bullet head="Gevoel en pijn">"Slechter dan normaal" telt een training een kwart zwaarder. Je RPE maakt een training hooguit anderhalf keer zo zwaar of een kwart lichter. Pijn in je benen telt 3 punten en maakt je nooit vanzelf fris. Gemelde spierpijn is een ondergrens. "Fris" in de ochtendvraag verlaagt het getal nooit.</Bullet>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>Wat nog gepland staat telt met je eigen gemiddelde hoogtemeters, of met het doel van de training. Dat is het minst zeker.</p>
            </Section>

            <Section title="Hoe betrouwbaar">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>Grote verschillen kloppen bijna altijd: na een volle beentraining ben je de dag erna niet fris.</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>Rond de grens is het getal onzeker. Een 8,6 kan ook 7 of 11 zijn. Eén test bewijst het getal niet: een 5 km schommelt al een halve minuut. Daarom toont ASCEND bij je testloop een band en noemt hij alles binnen 2 punten van de grens "op de grens".</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>Herstel komt uit studies bij andere mensen. Jouw benen kunnen sneller of trager zijn.</p>
            </Section>

            <Section title="Wat je zelf kunt doen">
              <Bullet head="Loop in op je gewone tempo">Loop op je testdag eerst tien minuten rustig. Voelen je benen duidelijk zwaarder dan normaal, stel de test dan een dag uit, ook als het getal fris zegt. Dat gevoel meet jouw benen van vandaag.</Bullet>
              <Bullet head="Vul je RPE in">Vooral na Benen A. Zonder RPE gaat ASCEND uit van 8.</Bullet>
              <Bullet head="Kracht na de test">Loop eerst en doe daarna kracht, liefst 6 uur later en minstens 3. Dat verstoort je volgende loop niet. Voel je je eerder fit, dan kan het eerder. Kracht voor een loop verstoort hem wel.</Bullet>
            </Section>

            <Section title="Bronnen">
              <div className="flex flex-col gap-1.5">
                {SOURCES.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-xs underline underline-offset-2" style={{ color: 'var(--color-action)' }}>{s.label}<Icon name="buiten" size={14} className="ml-1 inline align-[-2px]" /></a>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>De getallen van de index zijn een afstemming op deze studies. De index als geheel is niet in een studie getest. Gebruik hem als kompas, niet als weegschaal.</p>
            </Section>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Bullet({ head, children }: { head: string; children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
      <span className="font-medium" style={{ color: 'var(--color-ink)' }}>{head}. </span>
      {children}
    </p>
  );
}
