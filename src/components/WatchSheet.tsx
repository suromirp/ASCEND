// ASCEND: het blad Je horloge van een training (docs/visie/Ontwerp Info-blad.md, richting A, spoor 1).
//
// Eén plek voor het horloge: de stand van de workout (vanzelf via intervals.icu) met Nu versturen of
// Opnieuw, zelf nabouwen in Garmin Connect, de datavelden als tekst per pagina en de rij naar de
// pagina om ze te bekijken en aan te passen. Wat het blad toont komt uit engine/watchSheet.ts; dit
// bestand tekent alleen. Een rij met "Pagina" sluit eerst alle lagen (het blad en het trainingsscherm)
// en navigeert daarna.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { WATCH_SHEET_TEXT, type WatchSheetView } from '../engine/watchSheet';
import { Sheet } from './settings/Sheet';
import { GuideRow } from './GuideRow';
import { WatchStatusRow } from './WatchStatusRow';
import { Eyebrow } from './ui';

export function WatchSheet({
  view,
  template,
  session,
  garmin,
  dayLabel,
  onClose,
  onLeave,
}: {
  view: WatchSheetView;
  template: SessionTemplate;
  session?: PlannedSession;
  garmin?: { sport: string; lines: string[]; note?: string };
  dayLabel: string;
  onClose: () => void;
  // Sluit alle lagen onder dit blad (het trainingsscherm) voordat een rij naar een pagina gaat.
  onLeave: () => void;
}) {
  const navigate = useNavigate();
  const [manualOpen, setManualOpen] = useState(false);

  function toPage(to: string, state?: unknown) {
    onClose();
    onLeave();
    navigate(to, state ? { state } : undefined);
  }
  const leave = () => {
    onClose();
    onLeave();
  };

  const { workout, fields, zones } = view;
  return (
    <>
      <Sheet eyebrow={dayLabel} title={WATCH_SHEET_TEXT.title} onClose={onClose}>
        <div className="st-eyebrow" style={{ marginLeft: 0 }}><Eyebrow>Workout</Eyebrow></div>
        {workout.emptyText ? (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{workout.emptyText}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {workout.parts.map((part) => {
              if (part.kind === 'status') {
                return session ? <WatchStatusRow key="status" session={session} template={template} onLeave={leave} /> : null;
              }
              if (part.kind === 'unlinked') {
                return (
                  <div key="unlinked">
                    <p className="mb-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{part.text}</p>
                    <div className="st-list">
                      <GuideRow prefix="horloge" row={{ id: 'koppelen', title: part.rowTitle, page: true }} onClick={() => toPage(part.to)} />
                    </div>
                  </div>
                );
              }
              return (
                <div key="manual" className="st-list">
                  <GuideRow prefix="horloge" row={{ id: 'nabouwen', title: part.title, sub: part.sub, page: false }} onClick={() => setManualOpen(true)} />
                </div>
              );
            })}
          </div>
        )}

        {fields && (
          <>
            <div className="st-eyebrow" style={{ marginLeft: 0, marginTop: 'var(--s5, 20px)' }}><Eyebrow>{fields.title}</Eyebrow></div>
            {fields.state === 'ready' ? (
              <div className="flex flex-col gap-1">
                {fields.lines.map((line) => (
                  <p key={line} className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{line}</p>
                ))}
                {fields.why && <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{fields.why}</p>}
                {fields.ownVersionLine && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{fields.ownVersionLine}</p>}
              </div>
            ) : (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{fields.noAdviceText}</p>
            )}
            <div className="st-list mt-3">
              <GuideRow prefix="horloge" row={{ id: 'datavelden', title: fields.rowTitle, page: true }} onClick={() => toPage(fields.to)} />
            </div>
          </>
        )}

        {zones && (
          <div className="st-list mt-4">
            <GuideRow prefix="horloge" row={{ id: 'zones', title: zones.title, page: true }} onClick={() => toPage(zones.to, { section: zones.section })} />
          </div>
        )}
      </Sheet>

      {manualOpen && garmin && (
        <Sheet eyebrow="Uitleg" title={WATCH_SHEET_TEXT.manual} onClose={() => setManualOpen(false)}>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
            Maak in Garmin Connect een nieuwe workout van het type {garmin.sport}, met deze stappen. Stuur hem naar je horloge en start hem als je begint.
          </p>
          {garmin.note && <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-ink)' }}>{garmin.note}</p>}
          <div className="mt-2.5 flex flex-col gap-1">
            {garmin.lines.map((line, i) => (
              <p key={i} className="whitespace-pre text-xs tabular-nums" style={{ color: line.startsWith('Herhaal') ? 'var(--color-action)' : 'var(--color-ink)' }}>{line}</p>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}
