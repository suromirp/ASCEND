// ASCEND: de brug naar de widget op het startscherm van de Android-app.
//
// De web-app geeft de samenvatting van vandaag (titel, duur, datum, engine/widgetSummary.ts) aan
// een klein eigen deel van de app (WidgetBridgePlugin.java). Dat bewaart hem in de voorkeuren
// van de app zelf en ververst de widget. Er gaat niets het toestel uit. In de browser doet deze
// laag niets en geeft geen fout.

import { Capacitor, registerPlugin } from '@capacitor/core';
import type { WidgetSummary } from '../engine/widgetSummary';

interface WidgetBridgePlugin {
  set(summary: { date: string; title: string; minutes: number }): Promise<void>;
}

let plugin: WidgetBridgePlugin | undefined;
let lastWritten = '';

/** Schrijft de samenvatting naar het toestel; alleen als hij veranderd is, en alleen in de Android-app. */
export function writeWidgetSummary(summary: WidgetSummary): void {
  if (!Capacitor.isNativePlatform()) return;
  const key = `${summary.date}|${summary.title}|${summary.minutes ?? 0}`;
  if (key === lastWritten) return;
  lastWritten = key;
  try {
    plugin ??= registerPlugin<WidgetBridgePlugin>('WidgetBridge');
    void plugin.set({ date: summary.date, title: summary.title, minutes: summary.minutes ?? 0 }).catch(() => {
      lastWritten = '';
    });
  } catch {
    lastWritten = '';
  }
}
