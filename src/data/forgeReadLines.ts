// ASCEND: de uitleg achter de i naast de kolomkoppen in Forge, blad "Zo lees je dit"
// (docs/visie/Ontwerp beginner heel licht.md, deel 3). Gegevens, geen logica.

export const FORGE_READ_TITLE = 'Zo lees je dit';

// Het gewicht dat licht moet voelen: één regel boven de eerste krachttraining van de start.
export const FIRST_STRENGTH_LINE = 'Kies een gewicht dat licht voelt. Je moet er nog een paar over hebben.';

export const FORGE_READ_LINES: readonly { head: string; text: string }[] = [
  { head: 'Plan', text: 'Wat Forge voor deze set voorstelt. Vorige laat zien wat je de vorige keer deed. Tik op de kop om te wisselen.' },
  { head: 'Herh.', text: 'Herhalingen: hoe vaak je het gewicht optilt in één set.' },
  { head: 'Over', text: 'Hoeveel herhalingen je nog had kunnen doen. Een schatting is genoeg. Twijfel je tussen twee, kies de laagste. In de instellingen heet dit herhalingen in reserve (RIR).' },
  { head: 'W', text: 'Een opwarmset: licht, om te wennen aan de beweging. Hij telt niet mee als werkset.' },
];
