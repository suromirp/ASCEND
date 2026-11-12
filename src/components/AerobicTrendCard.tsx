import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { aerobicTrend, formatPace, tempoPiecesOn, trendHeadline, trendVerdict, zone2Criteria } from '../engine/aerobicTrend';
import { useExcludedLogIds } from './influence/useExcludedLogIds';
import { todayISO } from '../utils/dates';
import { Card, Eyebrow, InfoButton } from './ui';
import { ZONE2_CHART_H, Zone2WeekChart } from './stand/Zone2WeekChart';
import { zone2CardCaption, zone2WeekChart } from '../engine/zone2Chart';
import { zone2CardSentence } from '../engine/standPage';
import { Zone2InfoSheet } from './Zone2InfoSheet';

// Je stand, het ene beeld op de pagina (moved here from Ascend): progress on easy runs, as pace at one zone 2 heart rate
// (engine/aerobicTrend.ts). Een stip per week, sneller boven; een lijn alleen bij een uitspraak
// (engine/zone2Chart.ts#zone2WeekChart, besluit docs/beslissingen/2026-11-12-zone2-kaart.md).
export function AerobicTrendCard() {
  const { sessionLogs, templates, program, settings } = useAppData();
  // A training set to "Niet meetellen voor hartslag" stays out (engine/influence.ts).
  const excluded = useExcludedLogIds();
  const pieces = tempoPiecesOn(settings);
  const today = todayISO();
  const trend = useMemo(() => aerobicTrend(sessionLogs, templates, program, settings.heartRate, today, excluded, { pieces }), [sessionLogs, templates, program, settings.heartRate, today, excluded, pieces]);
  const [info, setInfo] = useState(false);
  // The big number: the line today, the first estimate or the last week, with its label.
  const headline = trendHeadline(trend);
  const hasZones = !!(settings.heartRate?.lthr || settings.heartRate?.maxHr);

  // One sentence from the same line as the chart (engine/aerobicTrend.ts#trendVerdict).
  const verdict = trendVerdict(trend);
  const sentence = zone2CardSentence(verdict, trend.statement?.kind === 'eerste-schatting');
  const chart = useMemo(() => zone2WeekChart(trend, today), [trend, today]);
  // Wat de kop is en wat de stippen zijn: achter de i, met het hele oordeel. Op de kaart hoogstens één zin
  // (Pathfinder 12 november): het oordeel zonder te herhalen wat de kop al zegt.
  const caption = zone2CardCaption(trend);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-3">
          <Eyebrow>Tempo bij zone 2</Eyebrow>
          <InfoButton onClick={() => setInfo(true)} label="Wat tempo bij zone 2 zegt" />
        </span>
        {headline && (
          <span className="flex flex-col items-end">
            <span className="font-sans text-2xl tabular-nums" style={{ color: 'var(--color-ink)' }}>{formatPace(headline.paceSec)}<span className="text-sm"> /km</span></span>
            <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{headline.label}</span>
          </span>
        )}
      </div>
      {/* Geen ondertitel: sneller en trager staan aan de grafiek, de vaste hartslag in de uitspraak en achter de i (Pathfinder 12 november). */}
      {chart.dots.length > 0 ? (
        <Zone2WeekChart chart={chart} />
      ) : (
        // Op dezelfde hoogte als de grafiek, zodat er niets verspringt als de eerste stip er is.
        <div className="flex items-center" style={{ minHeight: ZONE2_CHART_H }} data-zone2-empty>
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Nog geen loopjes. Elke week met een loop wordt hier een stip.</p>
        </div>
      )}
      {sentence && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{sentence}</p>}
      {/* Wat meetelt staat achter de i, niet op de kaart (Pathfinder 12 november: drie regels onder de grafiek was te veel). */}
      {info && (
        <Zone2InfoSheet
          trend={trend}
          pieces={pieces}
          zones={hasZones}
          today={today}
          notes={[...(caption ? [caption] : []), ...(verdict ? [verdict] : [])]}
          criteria={`${zone2Criteria(trend, pieces, hasZones).join(' ')}${trend.outsideZone > 0 ? ` ${trend.outsideZone} ${trend.outsideZone === 1 ? 'loopje zat' : 'loopjes zaten'} te ver van zone 2 en ${trend.outsideZone === 1 ? 'telt' : 'tellen'} niet mee.` : ''}`}
          onClose={() => setInfo(false)}
        />
      )}
    </Card>
  );
}
