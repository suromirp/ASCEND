import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../../state/AppDataContext';
import { SPORT_LABEL, type Sport } from '../../../engine/sports';
import { applyClothingFeedback, hasClothingAdjust, MAX_ADJUST_C, readClothingAdjust } from '../../../engine/clothingFeedback';
import { resolveOverviews } from '../../../engine/overviewSettings';
import { isMyLocation } from '../../../engine/weatherLocation';
import { Icon } from '../../icons';
import { useEffect, useState } from 'react';
import { noticeProblemText, type NoticeSupport } from '../../../engine/morningNotice';
import { readNoticeSupport } from '../../../utils/morningNotice';
import { ChoiceSheet, Sheet, SheetButtons } from '../Sheet';
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
  // Zelf bijstellen werkt als een tik na een buitentraining: een halve graad per keer.
  const nudge = (sport: Sport, feel: 'too_warm' | 'too_cold') => {
    const next = applyClothingFeedback(settings.clothingAdjust, sport, feel);
    void updateSettings({ clothingAdjust: Object.keys(next).length ? next : undefined });
  };
  return (
    <Sheet eyebrow="Vandaag en meldingen" title="Kleding bijstellen" line="ASCEND leert dit van je tikken na een buitentraining. Je kunt het hier ook zelf bijstellen." onClose={onClose}>
      <SettingsList>
        {SPORTS.map((s) => {
          const v = adjust[s] ?? 0;
          const atMax = v >= MAX_ADJUST_C;
          const atMin = v <= -MAX_ADJUST_C;
          return (
            <div key={s} className="st-row step">
              <span className="t"><span className="st-title-text">{SPORT_LABEL[s]}</span></span>
              <span className="v" style={{ pointerEvents: 'auto' }}>
                <button type="button" className="st-step" aria-label={`${SPORT_LABEL[s]}: warmer kleden`} disabled={atMin} onClick={() => nudge(s, 'too_cold')}>
                  <Icon name="min" size={18} />
                </button>
                <span className="st-num" style={{ minWidth: 84, textAlign: 'center', color: v ? 'var(--color-ink)' : undefined }}>
                  {v ? `${String(Math.abs(v)).replace('.', ',')}° ${v > 0 ? 'lichter' : 'warmer'}` : 'Standaard'}
                </span>
                <button type="button" className="st-step" aria-label={`${SPORT_LABEL[s]}: lichter kleden`} disabled={atMax} onClick={() => nudge(s, 'too_warm')}>
                  <Icon name="plus" size={18} />
                </button>
              </span>
            </div>
          );
        })}
      </SettingsList>
      <p className="st-hint">Min is warmer kleden, plus is lichter kleden, een halve graad per tik.</p>
      <div className="st-btns">
        <button type="button" className="st-btn" disabled={!hasClothingAdjust(settings.clothingAdjust)} onClick={() => void updateSettings({ clothingAdjust: undefined })}>
          Terug naar de standaard
        </button>
      </div>
    </Sheet>
  );
}

// Waarom de ochtendmelding niet werkt, in gewone woorden. De rij zelf past maar één korte regel
// toe; hier staat de hele zin. Zonder achtergrondwerk krijg je de vraag als je de app opent.
export function NoticeInfoSheet({ support, failure, onClose }: { support: NoticeSupport | undefined; failure?: 'denied' | 'no_background' | 'sync_refused'; onClose: () => void }) {
  // De toestemming kan net veranderd zijn: de telefoon zelf is de bron.
  const [live, setLive] = useState(support);
  useEffect(() => {
    let alive = true;
    void readNoticeSupport().then((v) => alive && setLive(v)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  const text = noticeProblemText(live, failure);
  return (
    <Sheet eyebrow="Vandaag en meldingen" title="Ochtendmelding" onClose={onClose}>
      {(close) => (
        <>
          <p className="st-hint" style={{ marginLeft: 0, marginRight: 0, color: 'var(--color-ink)' }} role="status">{text}</p>
          <SheetButtons>
            <button type="button" className="st-btn" onClick={close}>Begrepen</button>
          </SheetButtons>
        </>
      )}
    </Sheet>
  );
}
