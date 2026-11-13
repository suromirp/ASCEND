import { describe, expect, it } from 'vitest';
import briefingScreen from './TrainingBriefing.tsx?raw';
import todayCard from './WeatherTodayCard.tsx?raw';
import weatherPage from '../pages/Weather.tsx?raw';

// De gekozen plek gaat mee van de rij Weer in de Briefing naar de pagina Weer
// (docs/beslissingen/2026-11-13-weer-van-de-plek-pagina.md). Wat meegaat en wat de pagina leest
// staat in engine/weatherPageLink.test.ts; hier alleen dat de drie schermen die functies gebruiken.
describe('de plek van de Briefing op de pagina Weer', () => {
  it('de rij Weer geeft het doel van het weer-vak mee, niet een eigen keuze', () => {
    expect(briefingScreen).toContain("toPage('/weer', weatherPageLink(weatherTarget, template.id, date))");
  });
  it('de plek reist in de stap van de router, niet in het adres', () => {
    expect(briefingScreen).toContain('navigate(to, state === undefined ? undefined : { state })');
    expect(briefingScreen).not.toMatch(/\/weer\?/);
  });
  it('de pagina leest de stap met de dag van vandaag en geeft hem aan de kaart', () => {
    expect(weatherPage).toContain('readWeatherPageLink(useLocation().state, todayISO())');
    expect(weatherPage).toContain('<WeatherTodayCard link={briefingLink} />');
  });
  it('de kaart toont een training die niet meer bestaat als thuis en haalt alleen dan niets op', () => {
    expect(todayCard).toContain('const link = linked ? given : undefined;');
    expect(todayCard).toContain('weatherPageView(link, usePlaceWeather(link?.place), weather.forecast)');
  });
  it('de regel over de plek staat boven de getallen, en tijdens het laden staan er geen getallen', () => {
    expect(todayCard).toMatch(/\{view\.note && <p role="status"[\s\S]*?\{view\.loading \? null : w \?/);
  });
});
