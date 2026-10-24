// De eerste zin van een uitleg: op het trainingsscherm staat één zin, de rest
// klapt open met Meer (MoreText in DuurParts.tsx).
export function firstSentence(text: string): string {
  const m = /^.*?[.!?](\s|$)/.exec(text);
  return (m ? m[0] : text).trim();
}

// Wat er na de eerste zin nog komt, of niets.
export function restAfterFirstSentence(text: string): string {
  return text.slice(firstSentence(text).length).trim();
}
