// ASCEND: een scherm dat niet kon laden omdat de verbinding ontbrak (een verse start offline,
// voordat de service worker alles binnen heeft). De browser geeft dan een Engelse technische
// melding; de app zegt er in het Nederlands wat er aan de hand is. Puur.

const CHUNK_PATTERNS = [
  /dynamically imported module/i,
  /importing a module script failed/i,
  /loading (css )?chunk [\w-]+ failed/i,
];

export function isChunkLoadError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message ?? '';
  return CHUNK_PATTERNS.some((p) => p.test(message));
}

export const CHUNK_TITLE = 'Dit scherm is er nog niet';
export const CHUNK_LINE = 'Het kon niet laden, waarschijnlijk omdat je geen verbinding hebt. Zodra je weer online bent, opent het. De rest van ASCEND werkt gewoon.';
