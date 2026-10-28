// Test helper: makes a minimal xlsx (a zip of our own minimal XML) from
// made-up tables. Not used by the app; only by the *.test.ts files next to it.

import { strToU8, zipSync } from 'fflate';

// A number with a date format (the serial of the day), or a plain value.
export type KitCell = string | number | { date: number } | { time: number } | null;

export interface KitSheet {
  name: string;
  rows: KitCell[][];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function colLetters(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    out = String.fromCharCode(65 + ((n - 1) % 26)) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

// The serial of an ISO day in the 1900 system (valid from 1 March 1900).
export function serialOf(iso: string, secondsOfDay = 0): number {
  const [y, m, d] = iso.split('-').map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000 + secondsOfDay / 86400;
}

export function makeXlsx(sheets: KitSheet[], options: { date1904?: boolean } = {}): Uint8Array {
  const shared: string[] = [];
  const sharedIndex = (s: string) => {
    let i = shared.indexOf(s);
    if (i < 0) i = shared.push(s) - 1;
    return i;
  };
  const sheetXml = sheets.map((sheet) => {
    const rows = sheet.rows
      .map((row, r) => {
        const cells = row
          .map((cell, c) => {
            if (cell === null || cell === '') return '';
            const ref = `${colLetters(c)}${r + 1}`;
            if (typeof cell === 'string') return `<c r="${ref}" t="s"><v>${sharedIndex(cell)}</v></c>`;
            if (typeof cell === 'number') return `<c r="${ref}"><v>${cell}</v></c>`;
            if ('date' in cell) return `<c r="${ref}" s="1"><v>${cell.date}</v></c>`;
            return `<c r="${ref}" s="2"><v>${cell.time}</v></c>`;
          })
          .join('');
        return `<row r="${r + 1}">${cells}</row>`;
      })
      .join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;
  });
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
    'xl/workbook.xml': strToU8(
      `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr${options.date1904 ? ' date1904="1"' : ''}/><sheets>${sheets
        .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map((_s, i) => `<Relationship Id="rId${i + 1}" Type="worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
        .join('')}</Relationships>`,
    ),
    'xl/sharedStrings.xml': strToU8(
      `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.length}" uniqueCount="${shared.length}">${shared
        .map((s) => `<si><t xml:space="preserve">${esc(s)}</t></si>`)
        .join('')}</sst>`,
    ),
    // Format 1: a date (builtin 14), format 2: a time ([h]:mm:ss, custom 165).
    'xl/styles.xml': strToU8(
      '<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="165" formatCode="[h]:mm:ss"/></numFmts><cellStyleXfs count="1"><xf numFmtId="14"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="165"/></cellXfs></styleSheet>',
    ),
  };
  sheetXml.forEach((xml, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(xml);
  });
  return zipSync(files);
}
