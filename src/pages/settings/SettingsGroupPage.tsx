import { useState, type ComponentType } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/icons';
import { SkyBand } from '../../components/SkyBand';
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
import { GroupReset } from '../../components/settings/AdviceCard';
import { SETTINGS_ROOT, isSettingsPageId, placementOf, settingsPageTitle, type SettingsPageId } from '../../data/settingsLayout';

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
  // Een link naar een keuze die nu in het blad van een rij zit (de oude rij-id's) gaat naar die
  // rij en opent het blad; een sprong naar een gewone rij laat hem oplichten.
  const place = jump.jumpTo ? placementOf(jump.jumpTo.replace(/^instelling-/, '')) : undefined;
  const target = place && place.page === id ? place.row : jump.jumpTo;
  const [sheet, setSheet] = useState<string | null>(target && (jump.openSheet || place?.sheet) ? target : null);
  const Content = GROUPS[id] ?? Soon;

  useFlashOnMount(target);

  return (
    <SettingsJumpContext.Provider value={{ target }}>
      <div className="st-page animate-page-in">
        <SkyBand variant="low" gear={false}>
          <button type="button" className="st-back" onClick={() => navigate(SETTINGS_ROOT)}>
            <Icon name="terug" size={20} />
            Instellingen
          </button>
          <h1 className="st-title">{settingsPageTitle(id)}</h1>
        </SkyBand>
        {jump.reason && <p className="st-hint" style={{ marginLeft: 0, marginRight: 0 }} role="status">{jump.reason}</p>}
        <Content facts={facts} reload={reload} sheet={sheet} setSheet={setSheet} />
        <GroupReset page={id} facts={facts} />
      </div>
    </SettingsJumpContext.Provider>
  );
}
