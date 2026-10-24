import { Navigate, useNavigate } from 'react-router-dom';
import { Eyebrow } from '../../components/ui';
import { usePageState } from '../../components/usePageState';
import { Icon } from '../../components/icons';
import { SkyBand } from '../../components/SkyBand';
import { SettingsList, SettingsRow } from '../../components/settings/SettingsList';
import { useSettingsFacts } from '../../components/settings/useSettingsFacts';
import { jumpRoute, normalizeJumpTarget, useJumpState } from '../../components/settings/jump';
import { SETTINGS_INDEX } from '../../data/settingsIndex';
import { SETTINGS_PAGES, placementOf, settingsPageRoute, settingsPageTitle, type SettingsPageId } from '../../data/settingsLayout';
import { searchSettings } from '../../engine/settingsSearch';
import { settingAvailabilityOnPage } from '../../engine/settingsAvailability';
import { groupSummary, searchValue } from '../../engine/settingsSummary';
import { backupSpoken, statusCells } from '../../engine/settingsStatus';

const MAX_RESULTS = 10;

// Het overzicht van de instellingen: de stand in drie vakken, het zoekveld en de acht
// groepen. Elke groep heeft één waarde en één regel die waar zijn (engine/settingsSummary.ts).
export function SettingsOverview() {
  const navigate = useNavigate();
  const jump = useJumpState();
  const { facts } = useSettingsFacts();
  const [query, setQuery] = usePageState('query', '');

  // Een oude link (Forge: `instelling-forge`) zoekt zijn groep op en stuurt door.
  const legacy = normalizeJumpTarget(jump.jumpTo);
  if (legacy) {
    return <Navigate replace to={settingsPageRoute(legacy.page)} state={{ jumpTo: legacy.row, openSheet: legacy.sheet || jump.openSheet }} />;
  }

  const [fase, doel, backup] = statusCells({
    today: facts.today,
    position: facts.position,
    goal: facts.goal,
    lastExportedAt: facts.settings.lastExportedAt,
  });
  const searching = query.trim().length > 0;
  const results = searching ? searchSettings(query, SETTINGS_INDEX).slice(0, MAX_RESULTS) : [];
  // Het tandwiel op een tab geeft `from` mee: de groep van die tab licht even op.
  const highlighted: SettingsPageId[] = jump.from === '/week' ? ['planning'] : jump.from === '/' ? ['vandaag'] : [];

  function open(page: SettingsPageId, row: string, sheet?: boolean, reason?: string) {
    const r = jumpRoute(page, { jumpTo: row, openSheet: sheet, reason });
    navigate(r.to, { state: r.state });
  }

  return (
    <div className="st-page st-home animate-page-in">
      <SkyBand variant="low">
        <Eyebrow>Meer</Eyebrow>
        <h1 className="st-title">Instellingen</h1>
      </SkyBand>

      <div className="st-status">
        {[fase, doel, backup].map((c) => (
          <button
            key={c.key}
            type="button"
            className={`st-cell${c.attention ? ' attn' : ''}${c.dim ? ' dim' : ''}`}
            aria-label={c.key === 'backup' ? backupSpoken(facts.settings.lastExportedAt, facts.today) : `${c.label}: ${c.value}, ${c.detail}`}
            onClick={() => open(c.target.page, c.target.row, c.target.sheet)}
          >
            <span className="k">{c.label}</span>
            <span className="v st-num">{c.value}</span>
            <span className="d st-num">
              {c.attention && <span className="st-dot gold" aria-hidden="true" />}
              {c.detail}
            </span>
          </button>
        ))}
      </div>

      <div className="st-search">
        <label>
          <span className="sr-only">Zoek in de instellingen</span>
          <Icon name="zoeken" size={20} />
          <input
            id="settings-search"
            type="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder="Zoek, bijvoorbeeld horloge"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {searching ? (
        results.length > 0 ? (
          <>
            <div className="st-eyebrow"><Eyebrow>{results.length === 1 ? '1 resultaat' : `${results.length} resultaten`}</Eyebrow></div>
            <SettingsList>
              {results.map(({ item }) => {
                const placement = placementOf(item.id);
                if (!placement) return null;
                const availability = settingAvailabilityOnPage(item.id, facts);
                const value = searchValue(placement.row, facts);
                return (
                  <SettingsRow
                    key={item.id}
                    id={`zoek-${item.id}`}
                    title={item.title}
                    result
                    sub={settingsPageTitle(placement.page)}
                    value={availability.available ? value.text : 'Niet nu'}
                    dim={!availability.available || value.dim}
                    onClick={() => open(placement.page, placement.row, placement.sheet, availability.available ? undefined : availability.reason)}
                  />
                );
              })}
            </SettingsList>
          </>
        ) : (
          <>
            <div className="st-eyebrow"><Eyebrow>Niets gevonden</Eyebrow></div>
            <SettingsList>
              <div className="st-empty"><p>Probeer horloge, gewicht of back-up.</p></div>
            </SettingsList>
          </>
        )
      ) : (
        (['training', 'app'] as const).map((part) => (
          <div key={part}>
            <div className="st-eyebrow"><Eyebrow>{part === 'training' ? 'Je training' : 'De app'}</Eyebrow></div>
            <SettingsList>
              {SETTINGS_PAGES.filter((p) => p.part === part).map((p) => {
                const g = groupSummary(p.id, facts);
                return (
                  <SettingsRow
                    key={p.id}
                    id={`groep-${p.id}`}
                    title={p.title}
                    group
                    highlight={highlighted.includes(p.id)}
                    sub={g.sub}
                    value={g.value}
                    dim={g.dim}
                    dot={g.dot}
                    onClick={() => navigate(settingsPageRoute(p.id))}
                  />
                );
              })}
            </SettingsList>
          </div>
        ))
      )}

      {!searching && (
        <p className="st-foot">
          Versie <span className="st-num">{facts.buildLabel}</span>
          <br />
          Train. Progress. Explore. Ascend.
        </p>
      )}
    </div>
  );
}
