import { useEffect, useState, type ComponentType } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/icons';
import { SettingsJumpContext } from '../../components/settings/jumpContext';
import { useSettingsFacts } from '../../components/settings/useSettingsFacts';
import { useFlashOnMount, useJumpState } from '../../components/settings/jump';
import type { GroupProps } from '../../components/settings/groups/types';
import { Soon } from '../../components/settings/groups/Soon';
import { ForgeGroup } from '../../components/settings/groups/ForgeGroup';
import { PlanningGroup } from '../../components/settings/groups/PlanningGroup';
import { VandaagGroup } from '../../components/settings/groups/VandaagGroup';
import { DoelGroup } from '../../components/settings/groups/DoelGroup';
import { KoppelingenGroup } from '../../components/settings/groups/KoppelingenGroup';
import { GegevensGroup } from '../../components/settings/groups/GegevensGroup';
import { GidsenGroup } from '../../components/settings/groups/GidsenGroup';
import { LichaamGroup } from '../../components/settings/groups/LichaamGroup';
import { SETTINGS_ROOT, isSettingsPageId, settingsPageTitle, type SettingsPageId } from '../../data/settingsLayout';

// Welke inhoud bij welke groep hoort. Een groep die er nog niet is, toont Soon.
const GROUPS: Partial<Record<SettingsPageId, ComponentType<GroupProps>>> = {
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
export function SettingsGroupPage() {
  const { groep } = useParams();
  if (!isSettingsPageId(groep)) return <Navigate replace to={SETTINGS_ROOT} />;
  return <GroupPageInner id={groep} />;
}

function GroupPageInner({ id }: { id: SettingsPageId }) {
  const navigate = useNavigate();
  const jump = useJumpState();
  const { facts, reload } = useSettingsFacts();
  const [sheet, setSheet] = useState<string | null>(jump.openSheet && jump.jumpTo ? jump.jumpTo : null);
  const Content = GROUPS[id] ?? Soon;

  // Een nieuwe pagina begint bovenaan, tenzij er een rij is om naartoe te springen.
  useEffect(() => {
    if (!jump.jumpTo) document.querySelector('main')?.scrollTo({ top: 0 });
  }, [jump.jumpTo]);
  useFlashOnMount(jump.jumpTo);

  return (
    <SettingsJumpContext.Provider value={{ target: jump.jumpTo }}>
      <div className="st-page animate-page-in">
        <div className="st-topbar">
          <button type="button" className="st-back" onClick={() => navigate(SETTINGS_ROOT)}>
            <Icon name="terug" size={20} />
            Instellingen
          </button>
        </div>
        <h1 className="st-title">{settingsPageTitle(id)}</h1>
        {jump.reason && <p className="st-hint" style={{ marginLeft: 0, marginRight: 0 }} role="status">{jump.reason}</p>}
        <Content facts={facts} reload={reload} sheet={sheet} setSheet={setSheet} />
      </div>
    </SettingsJumpContext.Provider>
  );
}
