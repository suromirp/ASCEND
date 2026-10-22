// ASCEND: weather domain shapes. The forecast comes from one provider today
// (Open-Meteo, integrations/openMeteo.ts), but everything downstream reads
// these shapes, never a provider's answer, so another source can be
// dropped in without touching the engine or a screen.

// A place, as kept on this device: a name and coordinates rounded to two
// decimals (about a kilometre). Same shape as AppSettings.homeLocation.
export interface WeatherPlace {
  name: string;
  lat: number;
  lon: number;
}

// One hour of the forecast, in the local time of the place.
export interface WeatherHour {
  time: string; // 'YYYY-MM-DDTHH:00', local time of the place
  tempC: number;
  feelsC: number;
  precipMm: number; // rain, snow and showers of that hour, in mm of water
  precipProb?: number; // chance of precipitation, 0 to 100
  windKmh: number;
  gustKmh: number;
  code: number; // WMO weather code
}

// Sunrise and sunset of one day, local time: 'YYYY-MM-DDTHH:MM'.
export interface WeatherDay {
  date: string;
  sunrise: string;
  sunset: string;
}

export interface WeatherForecast {
  fetchedAt: string; // ISO timestamp of the fetch
  place: WeatherPlace;
  hours: WeatherHour[];
  days: WeatherDay[];
}
