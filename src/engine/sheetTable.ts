// ASCEND: the table every spreadsheet-like file is read into.
//
// A CSV (engine/macrofactorImport.ts#parseCsv) and a sheet of an xlsx
// (engine/xlsx.ts) both end up as rows of cells, text or number. The
// MacroFactor readers work on that, so column recognition and the Dutch
// messages exist once. This file is tiny and pure on purpose: it is loaded
// with the readers, while the zip library is only loaded for an xlsx.

export type Cell = string | number;

export interface SheetTable {
  // The worksheet name; for a CSV the file name (or empty).
  name: string;
  rows: Cell[][];
}

export function cellText(cell: Cell | undefined): string {
  if (cell === undefined) return '';
  return typeof cell === 'number' ? String(cell) : cell;
}

// A zip starts with "PK\x03\x04", and an xlsx is a zip.
export function isXlsx(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

// --- Excel dates -------------------------------------------------------------

// Excel stores a date as the number of days since 1900-01-01 (day 1) with the
// time of day as the fraction, and wrongly counts a 29 February 1900. From 1
// March 1900 on (serial 61) the offset is therefore 1899-12-30. The Mac system
// (date1904) counts from 1904-01-01.
export type DateKind = 'date' | 'time' | 'datetime';

// Serials this wide are dates between 1954 and 2119: a plain number in a
// column called "Date" is read as a serial when it falls in here.
export const SERIAL_MIN = 20000;
export const SERIAL_MAX = 80000;

const DAY_MS = 86400000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function clock(seconds: number, hourDigits = 1): string {
  return `${String(Math.floor(seconds / 3600)).padStart(hourDigits, '0')}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

// "2026-10-14" for a whole day, "2026-10-14T18:05:00" with a time of day.
// A time-only format (or a serial below 1) gives "18:05:00"; the hours keep
// counting past 24 for a duration ("26:30:00").
export function excelSerialToText(serial: number, kind: DateKind = 'datetime', date1904 = false): string {
  const total = Math.round(serial * 86400);
  if (kind === 'time' || serial < 1) return clock(total);
  const days = Math.floor(total / 86400);
  const sod = total - days * 86400;
  const origin = date1904 ? Date.UTC(1904, 0, 1) : days >= 61 ? Date.UTC(1899, 11, 30) : Date.UTC(1899, 11, 31);
  const d = new Date(origin + days * DAY_MS);
  const date = `${String(d.getUTCFullYear()).padStart(4, '0')}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return sod === 0 ? date : `${date}T${clock(sod, 2)}`;
}
