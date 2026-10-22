// ASCEND: "Loopinzicht" in Meer (Overzichten en vragen): wat ASCEND na een loop
// of tocht laat zien en hoe hij vergelijkt. Elke keuze heeft het advies als
// standaard en één zin uitleg; de ids horen bij src/data/settingsIndex.ts.
// De schakelaar voor het ophalen van de reeksen staat bij Garmin koppelen.

import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { resolveRunInsight, type InsightTopicSwitch, type RunInsightSettings } from '../engine/runInsightSettings';
import { settingsAnchor } from '../data/settingsIndex';
import { Card, Eyebrow, Toggle } from './ui';

function Row({ id, title, note, checked, onChange }: { id: string; title: string; note: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <div id={settingsAnchor(id)} className="scroll-mt-40 flex items-center justify-between gap-4 py-1">
      <div>
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{title}</p>
        <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

export function RunInsightSettingsCard() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useAppData();
  const r = resolveRunInsight(settings.runInsight);
  // Alleen de gewijzigde sleutel erbij; wat je niet aanraakte blijft ontbreken
  // en betekent dus de standaard.
  const set = (patch: Partial<RunInsightSettings>) => void updateSettings({ runInsight: { ...settings.runInsight, ...patch } });
  const setTopic = (topic: InsightTopicSwitch, on: boolean) => set({ topics: { ...settings.runInsight?.topics, [topic]: on } });
  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>Loopinzicht</Eyebrow>
      <Row
        id="loopinzicht"
        title="Inzicht na een training"
        note="Na een loop of tocht zie je hoogstens twee regels over wat beter ging en waar je op moet letten."
        checked={r.enabled}
        onChange={(on) => set({ enabled: on })}
      />
      {r.enabled && (
        <>
          <Row
            id="loop-efficientie"
            title="Efficiëntie"
            note="Hoe snel je liep bij dezelfde hartslag, vergeleken met je eigen rustige loopjes."
            checked={r.topics.efficiency}
            onChange={(on) => setTopic('efficiency', on)}
          />
          <Row
            id="loop-langedagen"
            title="Lange dagen"
            note="Hoeveel je hartslag opliep bij gelijk tempo op een lange loop."
            checked={r.topics.longDays}
            onChange={(on) => setTopic('longDays', on)}
          />
          <Row
            id="loop-berg"
            title="Bergop en bergaf"
            note="Je klimsnelheid bij dezelfde hartslag en feiten over je dalen, alleen bij een tocht met een klim of daling."
            checked={r.topics.climbing}
            onChange={(on) => setTopic('climbing', on)}
          />
          <Row
            id="loop-vorm"
            title="Pas en vorm"
            note="Pas en vorm toont alleen iets als er echt wat verandert, bijvoorbeeld langer grondcontact aan het eind."
            checked={r.topics.form}
            onChange={(on) => setTopic('form', on)}
          />
        </>
      )}
      <Row
        id="loopweer"
        title="Weer erbij zoeken"
        note="Voor eerlijk vergelijken zoekt ASCEND het weer van die dag op bij Open-Meteo, op een plaats afgerond op ongeveer een kilometer."
        checked={r.weather}
        onChange={(on) => set({ weather: on })}
      />
      <Row
        id="borstband"
        title="Mijn hartslag komt van de borstband"
        note="Zonder borstband vergelijkt ASCEND geen loopjes waarbij de hartslag van een andere bron kan komen. Staat dit aan, dan telt elke loop als gemeten met de band."
        checked={r.chestStrap}
        onChange={(on) => set({ chestStrap: on })}
      />
      <button onClick={() => navigate('/koppelen/garmin')} className="min-h-[44px] self-start text-left text-xs underline underline-offset-2" style={{ color: 'var(--color-bronze)' }}>
        Reeksen van je horloge ophalen: instellen bij Koppelingen
      </button>
    </Card>
  );
}
