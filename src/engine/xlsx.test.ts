import { describe, it, expect } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { columnIndex, decodeXml, formatKind, parseSharedStrings, readXlsx, resolveTarget, XlsxError } from './xlsx';
import { excelSerialToText, isXlsx } from './sheetTable';
import { makeXlsx, serialOf } from './xlsxTestKit';

// All files here are made up in the test, from minimal XML of our own.

const MAIN = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';

function zipOf(parts: Record<string, string>): Uint8Array {
  return zipSync(Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, strToU8(v)])));
}

describe('Excel serial dates', () => {
  it('turns a serial into an ISO day, with the time of day when there is one', () => {
    expect(excelSerialToText(45000)).toBe('2023-03-15');
    expect(excelSerialToText(serialOf('2026-10-14'))).toBe('2026-10-14');
    expect(excelSerialToText(serialOf('2026-10-14', 18 * 3600 + 5 * 60))).toBe('2026-10-14T18:05:00');
    // Rounded to the second, never "17:59:59" or 24:00.
    expect(excelSerialToText(45000 + 0.7534722222)).toBe('2023-03-15T18:05:00');
    expect(excelSerialToText(45000.99999999)).toBe('2023-03-16');
  });

  it('knows about the 1900 leap year bug that Excel keeps', () => {
    expect(excelSerialToText(1)).toBe('1900-01-01');
    expect(excelSerialToText(59)).toBe('1900-02-28');
    expect(excelSerialToText(61)).toBe('1900-03-01');
    expect(excelSerialToText(62)).toBe('1900-03-02');
  });

  it('reads the 1904 system', () => {
    expect(excelSerialToText(0.5 + 1, 'datetime', true)).toBe('1904-01-02T12:00:00');
    expect(excelSerialToText(serialOf('2026-10-14') - 1462, 'date', true)).toBe('2026-10-14');
  });

  it('writes a time or a duration as a clock', () => {
    expect(excelSerialToText(0.5, 'time')).toBe('12:00:00');
    expect(excelSerialToText(0.0425, 'time')).toBe('1:01:12');
    expect(excelSerialToText(1 + 1 / 24 + 30 / 1440, 'time')).toBe('25:30:00');
    expect(excelSerialToText(0.25, 'datetime')).toBe('6:00:00');
  });
});

describe('the small parts', () => {
  it('turns cell references into column numbers', () => {
    expect(columnIndex('A1')).toBe(0);
    expect(columnIndex('C12')).toBe(2);
    expect(columnIndex('Z3')).toBe(25);
    expect(columnIndex('AA1')).toBe(26);
    expect(columnIndex('$B$2')).toBe(1);
    expect(columnIndex(undefined)).toBeUndefined();
    expect(columnIndex('12')).toBeUndefined();
  });

  it('decodes entities and the escapes of OOXML', () => {
    expect(decodeXml('Rij &amp; Co &lt;1&gt; &quot;x&quot; &#65;&#x42; &unknown;')).toBe('Rij & Co <1> "x" AB &unknown;');
    expect(decodeXml('a_x000D_b')).toBe('a\rb');
  });

  it('recognises date and time formats, not numbers', () => {
    expect(formatKind('yyyy-mm-dd')).toBe('date');
    expect(formatKind('dd/mm/yyyy hh:mm')).toBe('datetime');
    expect(formatKind('[h]:mm:ss')).toBe('time');
    expect(formatKind('mm:ss')).toBe('time');
    expect(formatKind('[$-409]d mmmm yyyy')).toBe('date');
    expect(formatKind('0.00')).toBeUndefined();
    expect(formatKind('General')).toBeUndefined();
    expect(formatKind('#,##0 "dagen"')).toBeUndefined();
    expect(formatKind('0.0 \\d')).toBeUndefined();
  });

  it('resolves the target of a relationship', () => {
    expect(resolveTarget('worksheets/sheet1.xml')).toBe('xl/worksheets/sheet1.xml');
    expect(resolveTarget('/xl/worksheets/sheet2.xml')).toBe('xl/worksheets/sheet2.xml');
    expect(resolveTarget('../xl/worksheets/sheet3.xml')).toBe('xl/worksheets/sheet3.xml');
  });

  it('reads shared strings with rich text and leaves out the phonetic part', () => {
    const xml = `<sst ${MAIN}><si><t>Plat</t></si><si><r><t>Rij</t></r><r><t xml:space="preserve"> twee</t></r></si><si><t>Kanji</t><rPh sb="0" eb="1"><t>fonetisch</t></rPh></si><si/></sst>`;
    expect(parseSharedStrings(xml)).toEqual(['Plat', 'Rij twee', 'Kanji', '']);
  });

  it('knows an xlsx by its first bytes', () => {
    expect(isXlsx(makeXlsx([{ name: 'A', rows: [['x']] }]))).toBe(true);
    expect(isXlsx(new TextEncoder().encode('Date,Workout\n'))).toBe(false);
    expect(isXlsx(new Uint8Array())).toBe(false);
  });
});

describe('readXlsx', () => {
  it('reads strings, numbers and dates of several sheets, in workbook order', async () => {
    const bytes = makeXlsx([
      { name: 'Scale Weight', rows: [['Date', 'Weight (kg)'], [{ date: serialOf('2026-10-14') }, 85.4], [{ date: serialOf('2026-10-15', 8 * 3600) }, 85.1]] },
      { name: 'Training', rows: [['Naam', 'Duur'], ['Boven & onder', { time: 3720 / 86400 }]] },
    ]);
    const tables = await readXlsx(bytes);
    expect(tables.map((t) => t.name)).toEqual(['Scale Weight', 'Training']);
    expect(tables[0].rows).toEqual([
      ['Date', 'Weight (kg)'],
      ['2026-10-14', 85.4],
      ['2026-10-15T08:00:00', 85.1],
    ]);
    expect(tables[1].rows).toEqual([['Naam', 'Duur'], ['Boven & onder', '1:02:00']]);
  });

  it('leaves empty cells empty by their reference and skips empty rows', async () => {
    const bytes = zipOf({
      'xl/workbook.xml': `<workbook ${MAIN} xmlns:r="x"><sheets><sheet name="Blad1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Target="/xl/worksheets/sheet1.xml"/></Relationships>',
      'xl/worksheets/sheet1.xml': `<worksheet ${MAIN}><sheetData>
        <row r="1"><c r="A1" t="inlineStr"><is><t>Eerste</t></is></c><c r="C1" t="inlineStr"><is><r><t>Der</t></r><r><t>de</t></r></is></c></row>
        <row r="2"><c r="B2"/></row>
        <row r="4"><c r="B4"><v>7</v></c><c r="D4" t="b"><v>1</v></c><c r="E4" t="str"><f>A1</f><v>uit formule</v></c><c r="F4" t="e"><v>#N/A</v></c><c r="G4" t="d"><v>2026-10-14T18:05:00</v></c></row>
      </sheetData></worksheet>`,
    });
    const [table] = await readXlsx(bytes);
    expect(table.rows).toEqual([
      ['Eerste', '', 'Derde'],
      ['', 7, '', 'TRUE', 'uit formule', '', '2026-10-14T18:05:00'],
    ]);
  });

  it('works without styles and shared strings, and with a namespace prefix', async () => {
    const bytes = zipOf({
      'xl/workbook.xml': '<x:workbook xmlns:x="m" xmlns:r="r"><x:sheets><x:sheet name="Een" sheetId="1" r:id="rId9"/></x:sheets></x:workbook>',
      'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId9" Target="worksheets/data.xml"/></Relationships>',
      'xl/worksheets/data.xml': '<x:worksheet xmlns:x="m"><x:sheetData><x:row r="1"><x:c r="A1"><x:v>45000</x:v></x:c><x:c r="B1"><x:v>1.5</x:v></x:c></x:row></x:sheetData></x:worksheet>',
    });
    const [table] = await readXlsx(bytes);
    // No style, so 45000 stays a number.
    expect(table).toEqual({ name: 'Een', rows: [[45000, 1.5]] });
  });

  it('uses the 1904 system of the workbook', async () => {
    const bytes = makeXlsx([{ name: 'A', rows: [[{ date: serialOf('2026-10-14') - 1462 }]] }], { date1904: true });
    expect((await readXlsx(bytes))[0].rows).toEqual([['2026-10-14']]);
  });

  it('says in Dutch what is wrong with a file that is no workbook', async () => {
    await expect(readXlsx(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 9, 9, 9, 9, 9, 9]))).rejects.toBeInstanceOf(XlsxError);
    await expect(readXlsx(zipOf({ 'iets.txt': 'hoi' }))).rejects.toThrow(/geen werkblad/);
  });
});
