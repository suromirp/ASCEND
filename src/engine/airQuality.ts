// ASCEND: luchtkwaliteit bij een harde training buiten (docs/onderzoek/Kansen met gegevens.md,
// kans J; docs/beslissingen/2026-10-31-kansen-stap-0.md).
//
// Inspanning in vervuilde lucht verhoogt de opname van fijnstof, en ozon kan longfunctie en
// prestatie verlagen (Giles en Koehle 2014, bewijs matig). In Nederland gaat het om een paar
// zomerse ozondagen per jaar, dus weinig zinnen. Alleen bij een harde training buiten (hoge
// intensiteit: tempo, intervallen, een test), en alleen als de Europese luchtkwaliteitsindex in de
// uren van de training op "slecht" of erger staat (60 of meer). Een raster van ongeveer 11 km zegt
// weinig over een park naast een drukke weg; daarom een raad, geen oordeel, en nooit een
// verschuiving zonder jou.
//
// Puur: geen React, geen IndexedDB.

import type { AirQualityHour } from '../integrations/openMeteo';

export const AQI_POOR = 60;
// Ozon vanaf hier is in de Europese index zelf "slecht" (µg/m³, uurwaarde).
export const OZONE_POOR = 130;
export const PM25_POOR = 25;

export interface AirQualityNote {
  aqi: number;
  cause: 'ozon' | 'fijnstof' | 'lucht';
  text: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

function dayPart(hour: number): string {
  if (hour < 12) return 'vanochtend';
  if (hour < 18) return 'vanmiddag';
  return 'vanavond';
}

export function airQualityNote(hours: readonly AirQualityHour[], date: string, startHour: number, durationMinutes: number, today: string): AirQualityNote | undefined {
  const length = Math.max(1, Math.ceil(durationMinutes / 60));
  const byTime = new Map(hours.map((h) => [h.time, h]));
  const window: AirQualityHour[] = [];
  for (let h = startHour; h < Math.min(24, startHour + length); h++) {
    const hour = byTime.get(`${date}T${pad(h)}:00`);
    if (hour) window.push(hour);
  }
  const aqis = window.map((h) => h.aqi).filter((v): v is number => v !== undefined);
  if (aqis.length === 0) return undefined;
  const aqi = Math.max(...aqis);
  if (aqi < AQI_POOR) return undefined;
  const ozone = Math.max(0, ...window.map((h) => h.ozone ?? 0));
  const pm = Math.max(0, ...window.map((h) => h.pm25 ?? 0));
  const when = date === today ? dayPart(startHour) : 'op dat uur';
  if (ozone >= OZONE_POOR) {
    const day = date === today ? 'vandaag' : 'die dag';
    // Ozon piekt 's middags; een training die al voor 12 uur staat kan niet vroeger, dus dan alleen rustig.
    if (startHour < 12) return { aqi, cause: 'ozon', text: `Veel ozon ${when}. Doe ${day} liever rustig.` };
    return { aqi, cause: 'ozon', text: `Veel ozon ${when}. Liever 's ochtends, of ${day} rustig.` };
  }
  if (pm >= PM25_POOR) {
    return { aqi, cause: 'fijnstof', text: `Veel fijnstof in de lucht ${when}. Een rustige training of binnen kan helpen.` };
  }
  return { aqi, cause: 'lucht', text: `Slechte luchtkwaliteit ${when}. Een rustige training of binnen kan helpen.` };
}
