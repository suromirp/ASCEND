import type { ReactNode } from 'react';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { Card, Eyebrow } from './ui';
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
  const { closing, requestClose } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div className={`max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow="Benen" title="Hoe fris zijn je benen?" onClose={requestClose} /></div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
              Het getal bij Benen is een schatting van wat er van je recente trainingen nog in je benen zit. ASCEND gebruikt het om je testloop en wedstrijd op een dag met frisse benen te zetten, en om te kiezen wat er schuift als dat niet zo is.
            </p>

            <Section title="DRIE SOORTEN VERMOEIDHEID">
              <Bullet head="Intensiteit">Hard lopen, intervallen, je hartslag hoog. Halveert elke 12 uur: na een dag is driekwart weg.</Bullet>
              <Bullet head="Kracht en klappen">Zware beenkracht en de klappen van lopen. Halveert per dag.</Bullet>
              <Bullet head="Spierschade">Van bergaf en van het zakken in een squat of RDL. Blijft de eerste dag staan en halveert daarna elke anderhalve dag: 3 tot 5 dagen merkbaar. Dit raakt een snelle loop het meest.</Bullet>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>Die drie tellen samen op. Een rustige loop van 40 minuten kost de dag erna nog geen 2 punten, een volle Benen A ruim 13.</p>
            </Section>

            <Section title="DE GRENZEN">
              <Bullet head="8 of lager">Fris genoeg voor een testloop.</Bullet>
              <Bullet head="Tot 12">Goed voor een harde training, zoals heuvels of intervallen.</Bullet>
              <Bullet head="3 tot 5">Wat je wilt op een wedstrijddag, met een rustige week ervoor.</Bullet>
              <Bullet head="Je went eraan">Een tweede vergelijkbare training binnen drie weken telt minder zwaar. Na ongeveer zes weken zonder is die bescherming weg.</Bullet>
            </Section>

            <Section title="WAT HET ZWAARST MEETELT">
              <Bullet head="Je beentraining">Hoe lang (tot 75 minuten) en hoe zwaar, en of je eraan gewend bent. Dit verschuift het getal de dag erna met 5 tot 12 punten. ASCEND weet van krachttraining alleen de duur en je RPE; zonder RPE rekent hij met 8.</Bullet>
              <Bullet head="Bergaf">Per 1.000 m dalen 24 punten, anderhalf keer zoveel als je hardlopend daalt, meer met een rugzak. Op vlak terrein telt het weinig.</Bullet>
              <Bullet head="Je gevoel">"Slechter dan normaal" telt een training een kwart zwaarder. Je RPE kan een training hooguit anderhalf keer zo zwaar of een kwart lichter maken.</Bullet>
              <Bullet head="Pijn en spierpijn">Pijn in je benen telt 3 punten en maakt je nooit vanzelf fris. Gemelde spierpijn is een ondergrens. "Fris" in de ochtendvraag verlaagt het getal nooit.</Bullet>
              <Bullet head="Wat nog gepland staat">Telt met je eigen gemiddelde hoogtemeters, of met het doel van de training als je die nog niet logde. Dat is het minst zeker.</Bullet>
            </Section>

            <Section title="HOE BETROUWBAAR">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>Grote verschillen kloppen bijna altijd. Na een volle beentraining ben je de dag erna niet fris, en vier dagen later met een rustige dag ervoor meestal wel. Daar mag je op vertrouwen.</p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>Rond de grens is het getal onzeker. Een index van 8,6 kan net zo goed 7 of 11 zijn: één punt meer inspanning, een kwartier langer trainen of een andere aanname over herstel laat de uitkomst daar omslaan. Daarom toont ASCEND bij je testloop een band, en noemt hij alles binnen 2 punten van de grens "op de grens".</p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>Hoe snel je herstelt, komt uit studies bij andere mensen; jouw benen kunnen sneller of trager zijn. En één test kan het getal niet bewijzen: een 5 km schommelt al snel een halve minuut, ook als je even fris bent.</p>
            </Section>

            <Section title="WAT JE ZELF KUNT DOEN">
              <Bullet head="Loop in op je gewone tempo">Op je testdag eerst tien minuten rustig. Voelen je benen duidelijk zwaarder dan normaal, stel de test dan een dag uit, ook als het getal fris zegt. Dat gevoel meet jouw benen van vandaag.</Bullet>
              <Bullet head="Vul je RPE in">Vooral na Benen A: zonder RPE gaat ASCEND uit van 8.</Bullet>
              <Bullet head="Kracht na de test">Eerst lopen en daarna kracht doen, liefst 6 uur later en minstens 3, verstoort je volgende loop niet. Voel je je eerder fit, dan kan het eerder. Andersom wel.</Bullet>
            </Section>

            <Section title="BRONNEN">
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
