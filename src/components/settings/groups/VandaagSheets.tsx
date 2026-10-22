import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../../state/AppDataContext';
import { SPORT_LABEL, type Sport } from '../../../engine/sports';
import { hasClothingAdjust, readClothingAdjust } from '../../../engine/clothingFeedback';
import { resolveOverviews } from '../../../engine/overviewSettings';
import { isMyLocation } from '../../../engine/weatherLocation';
import { AutoTag } from '../../ui';
import { ChoiceSheet, Sheet } from '../Sheet';
import { SettingsList } from '../SettingsList';

type PlaceChoice = 'follow' | 'fixed';

// Plaats voor het weer: volgt je locatie (een plaats die "Mijn locatie" heet, bijgewerkt als je de
// app opent) of een vaste plaats. Het gebruikt wat er al staat: de plaats en de schakelaar "Weer
// volgt je locatie"; wat er naar de weerdienst gaat verandert niet (een plek afgerond op ongeveer
// een kilometer). Een plaats kiezen of "Gebruik mijn locatie" vraagt de Weer-pagina zelf.
export function PlaceSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useAppData();
  const o = resolveOverviews(settings.overviews);
  const place = settings.homeLocation;
  const follows = isMyLocation(place) && o.weatherFollowsLocation;

  function pick(v: PlaceChoice) {
    if (v === 'follow') {
      if (isMyLocation(place)) void updateSettings({ overviews: { ...settings.overviews, weatherFollowsLocation: true } });
      else navigate('/weer');
      return;
    }
    void updateSettings({ overviews: { ...settings.overviews, weatherFollowsLocation: false } });
    if (!place) navigate('/weer');
  }

  return (
    <>
      <ChoiceSheet<PlaceChoice>
        eyebrow="Vandaag en meldingen"
        title="Plaats voor het weer"
        options={[
          { value: 'follow', label: 'Volgt je locatie', note: 'Afgerond op een kilometer' },
          { value: 'fixed', label: 'Vaste plaats', note: place && !isMyLocation(place) ? place.name : 'Blijft zoals je koos' },
        ]}
        value={follows ? 'follow' : 'fixed'}
        advice="follow"
        helpKey="plaats"
        keepOpen
        onPick={pick}
        onClose={onClose}
        footer={
          <>
            <p className="st-hint" style={{ marginLeft: 0 }}>
              {follows ? 'Zonder toestemming van je toestel blijft de laatste plek staan.' : place ? `Het weer is voor ${place.name}.` : 'Er is nog geen plaats gekozen.'}
            </p>
            <div className="st-btns">
              <button type="button" className="st-btn" onClick={() => navigate('/weer')}>{follows ? 'Plaats opnieuw bepalen' : 'Andere plaats kiezen'}</button>
            </div>
          </>
        }
      />
    </>
  );
}

const SPORTS: Sport[] = ['running', 'hiking', 'cycling'];

// Je kleding: wat ASCEND leerde uit je tikken na een buitentraining, per sport. "Terug naar de
// standaard" zet alles op nul.
export function ClothingSheet({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useAppData();
  const adjust = readClothingAdjust(settings.clothingAdjust);
  return (
    <Sheet eyebrow="Vandaag en meldingen" title="Geleerd over je kleding" line="Uit je tikken na een buitentraining." onClose={onClose}>
      <SettingsList>
        {SPORTS.map((s) => {
          const v = adjust[s];
          return (
            <div key={s} className="st-row">
              <span className="t"><span className="st-title-text">{SPORT_LABEL[s]}</span></span>
              <span className={`v${v ? '' : ' dim'}`}>
                {v ? <AutoTag /> : null}
                <span className="st-num">{v ? `${String(Math.abs(v)).replace('.', ',')}° ${v > 0 ? 'lichter' : 'zwaarder'}` : 'Standaard'}</span>
              </span>
            </div>
          );
        })}
      </SettingsList>
      <div className="st-btns">
        <button type="button" className="st-btn" disabled={!hasClothingAdjust(settings.clothingAdjust)} onClick={() => void updateSettings({ clothingAdjust: undefined })}>
          Terug naar de standaard
        </button>
      </div>
    </Sheet>
  );
}
