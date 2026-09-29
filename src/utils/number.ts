// ASCEND — Dutch number input/output.
//
// One place that turns what a user types into a number and a number back
// into copy, so no field ever reads "30.000" as 30 again (production
// report: a goal of 30.000 m D+ silently stored as 30 because the input
// went through a bare Number()). Dutch convention throughout: a dot groups
// thousands, a comma separates decimals. Exports/backups stay plain JSON
// numbers — this file is only about what a person sees and types.

export interface ParsedNumber {
  value: number | undefined;
  // Set when the text was readable but not in the Dutch convention — e.g.
  // "1.5" in a field that allows decimals (almost certainly meant as 1,5,
  // but worth a visible nudge rather than a silent guess).
  warning?: string;
}

const THOUSANDS_PATTERN = /^\d{1,3}(\.\d{3})+$/;

// maxDecimals: 0 for whole-number fields (meters, days), otherwise the
// number of decimals a field keeps.
export function parseNumberNL(raw: string, maxDecimals = 0): ParsedNumber {
  const text = raw.trim().replace(/\s/g, '');
  if (text === '') return { value: undefined };

  if (text.includes(',')) {
    const [intPart, decPart = '', ...rest] = text.split(',');
    if (rest.length > 0) return { value: undefined, warning: 'Gebruik maximaal één komma.' };
    const intDigits = intPart.replace(/\./g, '');
    if (!/^\d*$/.test(intDigits) || !/^\d*$/.test(decPart)) return { value: undefined };
    const value = Number(`${intDigits || '0'}.${decPart || '0'}`);
    if (maxDecimals === 0) {
      return { value: Math.round(value), warning: decPart ? 'Dit veld rekent in hele getallen.' : undefined };
    }
    return { value: roundTo(value, maxDecimals) };
  }

  if (/^\d+$/.test(text)) return { value: Number(text) };
  if (THOUSANDS_PATTERN.test(text)) return { value: Number(text.replace(/\./g, '')) };
  // A whole-number field (meters, days) has no decimals, so any dot can
  // only be grouping.
  if (maxDecimals === 0 && /^[\d.]+$/.test(text) && /\d/.test(text)) return { value: Number(text.replace(/\./g, '')) };

  // One dot that is not a thousands separator ("1.5", "12.75").
  if (/^\d*\.\d+$/.test(text)) {
    const asDecimal = Number(text);
    return { value: roundTo(asDecimal, maxDecimals), warning: `Bedoel je ${formatNumberNL(asDecimal, maxDecimals)}? Gebruik een komma voor decimalen.` };
  }

  return { value: undefined };
}

// Live formatting while typing: regroups the whole-number part with dots
// ("30000" -> "30.000") and keeps a comma + decimals as typed. Anything it
// can't read cleanly is returned untouched, so a half-typed value is never
// rewritten into something the user didn't mean.
export function formatWhileTypingNL(raw: string, maxDecimals = 0): string {
  const text = raw.replace(/\s/g, '');
  if (text === '') return '';
  if (text.includes(',')) {
    if (maxDecimals === 0) return text;
    const [intPart, decPart = ''] = text.split(',', 2);
    const intDigits = intPart.replace(/\./g, '');
    if (!/^\d*$/.test(intDigits) || !/^\d*$/.test(decPart)) return text;
    return `${groupThousands(intDigits || '0')},${decPart.slice(0, maxDecimals)}`;
  }
  if (/^\d+$/.test(text) || THOUSANDS_PATTERN.test(text)) {
    return groupThousands(text.replace(/\./g, ''));
  }
  if (/^[\d.]+$/.test(text)) {
    // Typing on after an automatic grouping ("3.000" + "0" = "3.0000"):
    // every group after the first still has 3+ digits, so the dots are
    // ours, not a decimal point. In a whole-number field a dot is always
    // grouping.
    const groups = text.split('.');
    if (maxDecimals === 0 || groups.slice(1).every((g) => g.length >= 3)) {
      const digits = text.replace(/\./g, '');
      return digits === '' ? '' : groupThousands(digits);
    }
  }
  return text;
}

// Always groups from 1.000 up (Intl's nl-NL leaves 4-digit numbers
// ungrouped on some engines — "1500" next to "30.000" reads inconsistent).
export function formatNumberNL(value: number, maxDecimals = 1): string {
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(value * factor) / factor;
  const negative = rounded < 0;
  const [intPart, decPart] = Math.abs(rounded).toString().split('.');
  const grouped = groupThousands(intPart);
  return `${negative ? '-' : ''}${grouped}${decPart ? `,${decPart}` : ''}`;
}

function groupThousands(digits: string): string {
  const trimmed = digits.replace(/^0+(?=\d)/, '');
  return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
