import { useMemo, useState, type ComponentType } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/icons';
import { SkyBand } from '../../components/SkyBand';
import { SettingsAdjustedContext, SettingsAdvancedContext, SettingsJumpContext } from '../../components/settings/jumpContext';
import { useSettingsFacts } from '../../components/settings/useSettingsFacts';
import { useFlashOnMount, useJumpState } from '../../components/settings/jump';
import type { GroupProps } from '../../components/settings/groups/types';
import { ForgeGroup } from '../../components/settings/groups/ForgeGroup';
import { PlanningGroup } from '../../components/settings/groups/PlanningGroup';
import { VandaagGroup } from '../../components/settings/groups/VandaagGroup';
import { DoelGroup } from '../../components/settings/groups/DoelGroup';
import { KoppelingenGroup } from '../../components/settings/groups/KoppelingenGroup';
import { GegevensGroup } from '../../components/settings/groups/GegevensGroup';
import { GidsenGroup } from '../../components/settings/groups/GidsenGroup';
import { LichaamGroup } from '../../components/settings/groups/LichaamGroup';
import { GroupReset } from '../../components/settings/AdviceReset';
import { adjustedRows } from '../../engine/settingsAvailability';
import { PAGE_ROWS, SETTINGS_ROOT, isAdvancedRow, isSettingsPageId, placementOf, settingsAdvancedRoute, settingsPageRoute, settingsPageTitle, type SettingsPageId } from '../../data/settingsLayout';

// Welke inhoud bij welke groep hoort. Elke groep heeft inhoud; een onbekende groep gaat naar het overzicht.
const GROUPS: Record<SettingsPageId, ComponentType<GroupProps>> = {
  planning: PlanningGroup,
  forge: ForgeGroup,
  lichaam: LichaamGroup,
  vandaag: VandaagGroup,
  doel: DoelGroup,
  koppelingen: KoppelingenGroup,
  gegevens: GegevensGroup,
  gidsen: GidsenGroup,
};

// Eén groep: terug naar het overzicht, de titel en de rijen. Een sprong (zoeken, een
// link vanaf een andere pagina) scrolt naar de rij en laat hem oplichten; hoort er een
// blad bij, dan opent dat meteen. Een onbekende groep gaat terug naar het overzicht.
export function SettingsGroupPage({ advanced = false }: { advanced?: boolean }) {
  const { groep } = useParams();
  const location = useLocation();
  if (!isSettingsPageId(groep)) return <Navigate replace to={SETTINGS_ROOT} />;
  // Geavanceerd bestaat alleen waar de groep rijen daarvoor heeft.
  if (advanced && PAGE_ROWS[groep].advanced.length === 0) return <Navigate replace to={settingsPageRoute(groep)} />;
  // Een sprong naar een rij van Geavanceerd gaat naar die pagina, met de sprong erbij.
  const jumpRow = jumpRowOf(location.state);
  if (!advanced && jumpRow && isAdvancedRow(groep, jumpRow)) return <Navigate replace to={settingsAdvancedRoute(groep)} state={location.state} />;
  return <GroupPageInner id={groep} advanced={advanced} />;
}

function jumpRowOf(state: unknown): string | undefined {
  const raw = state && typeof state === 'object' ? (state as { jumpTo?: unknown }).jumpTo : undefined;
  if (typeof raw !== 'string') return undefined;
  const id = raw.replace(/^instelling-/, '');
  return placementOf(id)?.row;
}

function GroupPageInner({ id, advanced }: { id: SettingsPageId; advanced: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const jump = useJumpState();
  const { facts, reload } = useSettingsFacts();
  // Een link naar een keuze die nu in het blad van een rij zit (de oude rij-id's) gaat naar die
  // rij en opent het blad; een sprong naar een gewone rij laat hem oplichten.
  const place = jump.jumpTo ? placementOf(jump.jumpTo.replace(/^instelling-/, '')) : undefined;
  const target = place && place.page === id ? place.row : jump.jumpTo;
  const [sheet, setSheet] = useState<string | null>(target && (jump.openSheet || place?.sheet) ? target : null);
  const Content = GROUPS[id];

  useFlashOnMount(target);
  const adjusted = useMemo(() => adjustedRows(facts.settings, id), [facts.settings, id]);

  return (
    <SettingsJumpContext.Provider value={{ target }}>
      <div className="st-page animate-page-in">
        <SkyBand variant="low" gear={false}>
          <button type="button" className="st-back" onClick={() => (advanced ? (location.key !== 'default' ? navigate(-1) : navigate(settingsPageRoute(id), { replace: true })) : navigate(SETTINGS_ROOT))}>
            <Icon name="terug" size={20} />
            {advanced ? settingsPageTitle(id) : 'Instellingen'}
          </button>
          <h1 className="st-title">{advanced ? 'Geavanceerd' : settingsPageTitle(id)}</h1>
        </SkyBand>
        {jump.reason && <p className="st-hint" style={{ marginLeft: 0, marginRight: 0 }} role="status">{jump.reason}</p>}
        <SettingsAdjustedContext.Provider value={adjusted}>
          <SettingsAdvancedContext.Provider value={{ page: id, onAdvanced: advanced }}>
            <Content facts={facts} reload={reload} sheet={sheet} setSheet={setSheet} />
          </SettingsAdvancedContext.Provider>
        </SettingsAdjustedContext.Provider>
        {!advanced && <GroupReset page={id} facts={facts} />}
      </div>
    </SettingsJumpContext.Provider>
  );
}
