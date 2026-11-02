import { describe, expect, it } from 'vitest';
import { groupSummary, rowSummary, type SettingsFacts } from './settingsSummary';

// Nagemaakte feiten; alleen wat deze rijen lezen telt.
function facts(over: Partial<SettingsFacts> = {}): SettingsFacts {
  return {
    today: '2026-11-01',
    settings: { strengthTrackedExternally: false, introSoundEnabled: true },
    dailyTimeBudget: {},
    pairing: 'automatic',
    position: null,
    goal: null,
    treks: 0,
    vacations: 0,
    activeInjuries: 0,
    strengthExternal: false,
    ambition: { chosen: 'standaard', effective: 'standaard' },
    weight: null,
    watch: null,
    macroFactor: null,
    strengthDurations: [],
    folderSupported: false,
    folderChosen: false,
    storage: 'protected',
    snapshots: 0,
    buildLabel: 'test',
    longSundayVisible: true,
    ...over,
  } as SettingsFacts;
}

const app = { timed: true, notifications: 'granted', exactAlarm: 'granted', healthConnect: 'soon' } as const;
const browser = { timed: false, notifications: 'prompt', exactAlarm: 'unavailable', healthConnect: 'unavailable' } as const;

describe('Toestemmingen in Instellingen', () => {
  it('even kijken zolang de telefoon niets zei, onbekend als het niet lukte', () => {
    expect(rowSummary('toestemmingen', facts())).toMatchObject({ value: 'Even kijken', dim: true });
    expect(rowSummary('toestemmingen', facts({ device: 'unknown' }))).toMatchObject({ value: 'Onbekend', dim: true });
  });
  it('alles aan in de app', () => {
    expect(rowSummary('toestemmingen', facts({ device: app }))).toMatchObject({ value: 'Alles aan' });
  });
  it('een amber stip als de exacte wekker uit staat en het einde van de rust aan', () => {
    expect(rowSummary('toestemmingen', facts({ device: { ...app, exactAlarm: 'denied' } }))).toMatchObject({ value: '1 staat uit', dot: 'warn', sub: 'Exacte wekker staat uit' });
  });
  it('in de browser gedimd zonder stip als niets wat aan staat het nodig heeft', () => {
    const r = rowSummary('toestemmingen', facts({ device: browser, storage: 'not_protected' }));
    expect(r).toMatchObject({ value: '2 staan uit', dim: true });
    expect(r.dot).toBeUndefined();
  });
});

describe('de rijen van de app-meldingen', () => {
  it('bestaan alleen in de app', () => {
    expect(rowSummary('rust-melding', facts({ device: browser })).hidden).toBe(true);
    expect(rowSummary('rust-melding', facts({ device: app }))).toMatchObject({ checked: true, hidden: false });
    expect(rowSummary('auto-bijwerken', facts({ liveUpdate: false })).hidden).toBe(true);
    expect(rowSummary('auto-bijwerken', facts({ liveUpdate: true }))).toMatchObject({ checked: true, hidden: false });
  });
  it('de tijd van de weekmelding verdwijnt als de weekmelding uit staat', () => {
    expect(rowSummary('weekmelding-tijd', facts({ device: app }))).toMatchObject({ value: 'Zondag 19:00', hidden: false });
    expect(rowSummary('weekmelding-tijd', facts({ device: app, settings: { strengthTrackedExternally: false, introSoundEnabled: true, weekNotice: false } })).hidden).toBe(true);
  });
  it('de bundel zegt hoeveel er aan staan', () => {
    expect(rowSummary('bundel-meldingen', facts({ device: app }))).toMatchObject({ value: '2 van 3 aan' });
    expect(rowSummary('bundel-meldingen', facts({ device: browser }))).toMatchObject({ value: 'Uit', dim: true });
  });
});

describe('Rijen die op een bron wachten', () => {
  it('zeggen Bezig… zolang hun bron niet binnen is, zonder regel, en alleen die rijen', () => {
    const f = facts({ pending: ['snapshots'] });
    expect(rowSummary('momentopnamen', f)).toEqual({ value: 'Bezig…', dim: true });
    expect(groupSummary('gegevens', f)).toEqual({ value: 'Bezig…', sub: '', dim: true });
    expect(rowSummary('opslag', f)).toMatchObject({ value: 'Ja' });
    expect(rowSummary('momentopnamen', facts({ pending: [] }))).toMatchObject({ value: '0' });
  });
  it('de bundel meldingen wacht op de telefoon', () => {
    expect(rowSummary('bundel-meldingen', facts({ pending: ['device'] }))).toMatchObject({ value: 'Bezig…' });
  });
});

describe('Rijen waarvan de bron te traag was of faalde', () => {
  it('kopieën: Onbekend, nooit 0 of "Alles staat alleen op deze telefoon"', () => {
    const f = facts({ unknown: ['snapshots'] });
    expect(rowSummary('momentopnamen', f)).toEqual({ value: 'Onbekend', dim: true });
    expect(groupSummary('gegevens', f)).toEqual({ value: 'Onbekend', sub: '', dim: true });
  });
  it('MacroFactor: geen "Niet gekoppeld" bij een time-out', () => {
    const f = facts({ unknown: ['macroFactor'] });
    expect(groupSummary('koppelingen', f)).toEqual({ value: 'Onbekend', sub: '', dim: true });
  });
  it('opslag en Health Connect: Onbekend', () => {
    expect(rowSummary('opslag', facts({ unknown: ['storage'], storage: undefined }))).toEqual({ value: 'Onbekend', dim: true });
    expect(rowSummary('health-connect', facts({ unknown: ['healthConnect'] }))).toEqual({ value: 'Onbekend', dim: true });
  });
});

describe('Rijen die van een nog onbekende bron afhangen blijven zichtbaar', () => {
  it('Garmin-rij is er met Bezig… zolang het horloge nog niet gelezen is, daarna verdwijnt hij als er geen koppeling is', () => {
    expect(rowSummary('slaap', facts({ pending: ['watch'] }))).toEqual({ value: 'Bezig…', dim: true, hidden: false });
    expect(rowSummary('slaap', facts({ unknown: ['watch'] }))).toEqual({ value: 'Onbekend', dim: true, hidden: false });
    expect(rowSummary('slaap', facts({ pending: [], unknown: [] })).hidden).toBe(true);
  });
  it('de rij van een bron die al bekend is blijft verborgen', () => {
    expect(rowSummary('slaap', facts({ pending: ['snapshots'] })).hidden).toBe(true);
  });
  it('Toestemmingen wacht ook op Opslag', () => {
    expect(rowSummary('toestemmingen', facts({ pending: ['storage'] }))).toMatchObject({ value: 'Bezig…' });
  });
});
