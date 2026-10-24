// De eerste zin van een uitleg: op het trainingsscherm staat één zin, de rest
// staat onder Info.
export function firstSentence(text: string): string {
  const m = /^.*?[.!?](\s|$)/.exec(text);
  return (m ? m[0] : text).trim();
}
