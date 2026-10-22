// ASCEND: a small xlsx reader. Pure, in the browser, no server.
//
// An xlsx is a zip file with XML in it. fflate unzips it (loaded only when a
// file really is an xlsx, so the app does not carry it otherwise); the XML of
// these simple parts is read with a small tokenizer below, not DOMParser, so
// it works the same in the browser and in node (vitest).
//
// Read: the worksheets in workbook order (xl/workbook.xml with its
// _rels), shared strings, inline strings, numbers, booleans, dates (a
// number whose cell format is a date or time, from xl/styles.xml, becomes
// an ISO text, 1900 and 1904 system) and empty cells by their reference (a
// cell in C1 after A1 leaves B1 empty). Formulas are not calculated; the
// value Excel stored with them is read. Out of scope: charts, pictures,
// merged cells, styles beyond "is this a date".

import { excelSerialToText, type Cell, type DateKind, type SheetTable } from './sheetTable';

// The message is Dutch and meant to be shown as is.
export class XlsxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XlsxError';
  }
}

// --- XML ---------------------------------------------------------------------

type Token =
  | { kind: 'open'; name: string; attrs: Record<string, string>; selfClosing: boolean }
  | { kind: 'close'; name: string }
  | { kind: 'text'; text: string };

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function decodeXml(s: string): string {
  if (!s.includes('&') && !s.includes('_x')) return s;
  return s
    .replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, body: string) => {
      if (body[0] === '#') {
        const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
        return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
      }
      return ENTITIES[body] ?? whole;
    })
    // OOXML writes a character that XML cannot hold as _x000D_.
    .replace(/_x([0-9a-fA-F]{4})_/g, (_w, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

// The name without its namespace prefix: "x:row" and "row" are the same.
const local = (name: string) => name.slice(name.indexOf(':') + 1);

const TOKEN = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<![^>]*>|<(\/?)([^\s/>]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;
const ATTR = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

export function* tokenize(xml: string): Generator<Token> {
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(xml))) {
    if (m[1] !== undefined) yield { kind: 'text', text: m[1] };
    else if (m[3] !== undefined) {
      const name = local(m[3]);
      if (m[2]) {
        yield { kind: 'close', name };
        continue;
      }
      const attrs: Record<string, string> = {};
      ATTR.lastIndex = 0;
      let a: RegExpExecArray | null;
      while ((a = ATTR.exec(m[4]))) attrs[local(a[1])] = decodeXml(a[2] ?? a[3] ?? '');
      yield { kind: 'open', name, attrs, selfClosing: m[5] === '/' };
      if (m[5] === '/') yield { kind: 'close', name };
    } else if (m[6] !== undefined) yield { kind: 'text', text: decodeXml(m[6]) };
  }
}

// --- parts -------------------------------------------------------------------

export function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  let current: string | null = null;
  let inT = false;
  let phonetic = 0;
  for (const t of tokenize(xml)) {
    if (t.kind === 'open') {
      if (t.name === 'si') current = '';
      else if (t.name === 'rPh') phonetic++;
      else if (t.name === 't' && current !== null && phonetic === 0) inT = true;
    } else if (t.kind === 'close') {
      if (t.name === 'si') {
        out.push(current ?? '');
        current = null;
      } else if (t.name === 'rPh') phonetic = Math.max(0, phonetic - 1);
      else if (t.name === 't') inT = false;
    } else if (inT && current !== null) current += t.text;
  }
  return out;
}

const BUILTIN_DATE_FORMATS: Record<number, DateKind> = {
  14: 'date', 15: 'date', 16: 'date', 17: 'date',
  18: 'time', 19: 'time', 20: 'time', 21: 'time',
  22: 'datetime',
  45: 'time', 46: 'time', 47: 'time',
};

// What a custom format code shows: dates ("yyyy-mm-dd"), a time of day or
// duration ("h:mm", "[h]:mm:ss"), both, or neither (a number).
export function formatKind(code: string): DateKind | undefined {
  const stripped = code
    .replace(/"[^"]*"/g, '')
    .replace(/\\./g, '')
    .replace(/\[(?![hms]+\])[^\]]*\]/gi, '')
    .toLowerCase();
  const hasDate = /[yd]/.test(stripped);
  const hasTime = /[hs]/.test(stripped);
  if (hasDate && hasTime) return 'datetime';
  if (hasDate) return 'date';
  if (hasTime) return 'time';
  return undefined;
}

// Per cell format index (the `s` of a cell): is it a date or time format?
export function parseStyles(xml: string): (DateKind | undefined)[] {
  const custom = new Map<number, string>();
  const xfs: number[] = [];
  let inCellXfs = false;
  for (const t of tokenize(xml)) {
    if (t.kind === 'open') {
      if (t.name === 'numFmt') custom.set(Number(t.attrs.numFmtId), t.attrs.formatCode ?? '');
      else if (t.name === 'cellXfs') inCellXfs = true;
      else if (t.name === 'xf' && inCellXfs) xfs.push(Number(t.attrs.numFmtId ?? 0));
    } else if (t.kind === 'close' && t.name === 'cellXfs') inCellXfs = false;
  }
  return xfs.map((id) => {
    const code = custom.get(id);
    return code !== undefined ? formatKind(code) : BUILTIN_DATE_FORMATS[id];
  });
}

export interface WorkbookSheet {
  name: string;
  relId: string;
}

export function parseWorkbook(xml: string): { sheets: WorkbookSheet[]; date1904: boolean } {
  const sheets: WorkbookSheet[] = [];
  let date1904 = false;
  for (const t of tokenize(xml)) {
    if (t.kind !== 'open') continue;
    if (t.name === 'sheet') sheets.push({ name: t.attrs.name ?? '', relId: t.attrs.id ?? '' });
    else if (t.name === 'workbookPr') date1904 = t.attrs.date1904 === '1' || t.attrs.date1904 === 'true';
  }
  return { sheets, date1904 };
}

export function parseRelationships(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const t of tokenize(xml)) {
    if (t.kind === 'open' && t.name === 'Relationship' && t.attrs.Id && t.attrs.Target) map.set(t.attrs.Id, t.attrs.Target);
  }
  return map;
}

// "AB12" -> column 27 (zero-based). Undefined for a reference without letters.
export function columnIndex(ref: string | undefined): number | undefined {
  const letters = /^\$?([A-Za-z]+)/.exec(ref ?? '')?.[1];
  if (!letters) return undefined;
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export interface SheetContext {
  shared: string[];
  styles: (DateKind | undefined)[];
  date1904: boolean;
}

export function parseSheet(xml: string, ctx: SheetContext): Cell[][] {
  const rows: Cell[][] = [];
  let row: Cell[] | null = null;
  // The open cell.
  let col = -1;
  let type = '';
  let style: number | undefined;
  let value = '';
  let inline = '';
  let inV = false;
  let inIs = false;
  let inT = false;
  let phonetic = 0;
  let inCell = false;
  let nextCol = 0;

  const finishCell = () => {
    if (!row) return;
    let cell: Cell = '';
    if (type === 's') cell = ctx.shared[Number(value)] ?? '';
    else if (type === 'inlineStr') cell = inline;
    else if (type === 'str' || type === 'd') cell = value;
    else if (type === 'b') cell = value === '1' ? 'TRUE' : value === '0' ? 'FALSE' : value;
    else if (type === 'e') cell = '';
    else if (value.trim() !== '') {
      const n = Number(value);
      if (!Number.isFinite(n)) cell = value;
      else {
        const kind = style === undefined ? undefined : ctx.styles[style];
        cell = kind ? excelSerialToText(n, kind, ctx.date1904) : n;
      }
    }
    while (row.length < col) row.push('');
    row[col] = cell;
  };

  for (const t of tokenize(xml)) {
    if (t.kind === 'open') {
      switch (t.name) {
        case 'row':
          row = [];
          nextCol = 0;
          break;
        case 'c':
          inCell = true;
          col = columnIndex(t.attrs.r) ?? nextCol;
          type = t.attrs.t ?? '';
          style = t.attrs.s === undefined ? undefined : Number(t.attrs.s);
          value = '';
          inline = '';
          break;
        case 'v':
          inV = true;
          break;
        case 'is':
          inIs = true;
          break;
        case 'rPh':
          phonetic++;
          break;
        case 't':
          if (inIs && phonetic === 0) inT = true;
          break;
      }
    } else if (t.kind === 'close') {
      switch (t.name) {
        case 'c':
          if (inCell) finishCell();
          inCell = false;
          nextCol = col + 1;
          break;
        case 'row':
          if (row && row.some((c) => c !== '')) rows.push(row);
          row = null;
          break;
        case 'v':
          inV = false;
          break;
        case 'is':
          inIs = false;
          break;
        case 'rPh':
          phonetic = Math.max(0, phonetic - 1);
          break;
        case 't':
          inT = false;
          break;
      }
    } else if (inCell) {
      if (inV) value += t.text;
      else if (inT) inline += t.text;
    }
  }
  return rows;
}

// --- the file ----------------------------------------------------------------

// "worksheets/sheet1.xml" next to xl/, or "/xl/worksheets/sheet1.xml" from the
// root, or "../xl/..." : the path inside the zip.
export function resolveTarget(target: string): string {
  const parts: string[] = [];
  for (const part of (target.startsWith('/') ? target.slice(1) : `xl/${target}`).split('/')) {
    if (part === '..') parts.pop();
    else if (part !== '.' && part !== '') parts.push(part);
  }
  return parts.join('/');
}

// The worksheets of an xlsx, in workbook order, as tables. fflate is loaded
// here, on demand.
export async function readXlsx(bytes: Uint8Array): Promise<SheetTable[]> {
  const { unzipSync, strFromU8 } = await import('fflate');
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (f) => /^xl\/.*\.(xml|rels)$/i.test(f.name) });
  } catch {
    throw new XlsxError('Dit Excel-bestand kan niet worden geopend. Deel het opnieuw vanuit MacroFactor.');
  }
  const text = (path: string) => (files[path] ? strFromU8(files[path]) : undefined);
  const workbookXml = text('xl/workbook.xml');
  if (!workbookXml) throw new XlsxError('Dit lijkt geen Excel-werkmap te zijn: er staat geen werkblad in. Deel het bestand opnieuw vanuit MacroFactor.');
  const { sheets, date1904 } = parseWorkbook(workbookXml);
  const rels = parseRelationships(text('xl/_rels/workbook.xml.rels') ?? '');
  const sharedXml = text('xl/sharedStrings.xml');
  const stylesXml = text('xl/styles.xml');
  const ctx: SheetContext = {
    shared: sharedXml ? parseSharedStrings(sharedXml) : [],
    styles: stylesXml ? parseStyles(stylesXml) : [],
    date1904,
  };
  const tables: SheetTable[] = [];
  sheets.forEach((sheet, i) => {
    const target = rels.get(sheet.relId);
    // Without a relationship the sheets are conventionally numbered in order.
    const path = target ? resolveTarget(target) : `xl/worksheets/sheet${i + 1}.xml`;
    const xml = text(path);
    if (xml === undefined) return;
    tables.push({ name: sheet.name, rows: parseSheet(xml, ctx) });
  });
  return tables;
}
