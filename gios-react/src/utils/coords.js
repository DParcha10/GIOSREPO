// "37.0582° N, 121.0744° W": hemisphere letters, never a sign plus a letter.
export function fmtLatLng(lat, lng, digits = 4) {
  if (lat == null || lng == null || Number.isNaN(+lat) || Number.isNaN(+lng)) return '—';
  const la = `${Math.abs(+lat).toFixed(digits)}° ${+lat >= 0 ? 'N' : 'S'}`;
  const lo = `${Math.abs(+lng).toFixed(digits)}° ${+lng >= 0 ? 'E' : 'W'}`;
  return `${la}, ${lo}`;
}
