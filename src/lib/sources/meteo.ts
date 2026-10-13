export async function fetchMeteo(lat: number, lon: number) {
  const r = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&daily=et0_fao_evapotranspiration,precipitation_sum&past_days=30&forecast_days=1&timezone=Europe%2FMadrid`,
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = (await r.json()) as {
    daily: { time: string[]; et0_fao_evapotranspiration: number[]; precipitation_sum: number[] };
  };
  const days = j.daily.time.map((t, i) => ({
    date: t,
    et0: j.daily.et0_fao_evapotranspiration[i] ?? 0,
    rain: j.daily.precipitation_sum[i] ?? 0,
  }));
  const et0 = days.reduce((s, d) => s + d.et0, 0);
  const rain = days.reduce((s, d) => s + d.rain, 0);
  return { days, et0, rain, deficit: et0 - rain };
}
