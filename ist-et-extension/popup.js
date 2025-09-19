
// IST ↔ ET converter without external libraries (MV3 compliant).
// Uses Intl.DateTimeFormat with time zones + a small fixed-point step to handle ET DST.

const ZONES = { ET: 'America/New_York', IST: 'Asia/Kolkata' };
const MINUTES = 60 * 1000;
const IST_OFFSET_MIN = 330; // +05:30, constant

const $ = (id) => document.getElementById(id);
const etInput = $('etInput');
const istInput = $('istInput');
const etOffsetEl = $('etOffset');
const istOffsetEl = $('istOffset');
const dstBadge = $('dstBadge');
const nowETBtn = $('nowET');
const nowISTBtn = $('nowIST');
const swapBtn = $('swapBtn');
const cards = $('cards');
const istCard = $('istCard');
const etCard = $('etCard');

// Format helpers
const fmtET = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONES.ET, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
const fmtIST = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONES.IST, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
const fmtUTC = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

function partsMap(fmt, date) {
  const o = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') o[p.type] = p.value;
  }
  return o;
}

function partsToMillis(parts) {
  const y = Number(parts.year);
  const m = Number(parts.month);
  const d = Number(parts.day);
  const hh = Number(parts.hour);
  const mm = Number(parts.minute);
  return Date.UTC(y, m - 1, d, hh, mm);
}

// Given a UTC millis, return offset minutes for the provided timeZone at that instant.
function offsetMinutesAtUTC(utcMillis, timeZoneFmt) {
  const map = partsMap(timeZoneFmt, new Date(utcMillis));
  const localAsUTC = partsToMillis(map);
  return (localAsUTC - utcMillis) / MINUTES; // minutes
}

// Build a datetime-local string (yyyy-mm-ddThh:mm) from UTC millis, displayed in a time zone
function toLocalInputValue(utcMillis, zoneFmt) {
  const map = partsMap(zoneFmt, new Date(utcMillis));
  const y = map.year, m = map.month, d = map.day, hh = map.hour, mm = map.minute;
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

// Parse datetime-local string to [y,m,d,hh,mm]
function parseInputValue(v) {
  if (!v) return null;
  const [date, time] = v.split('T');
  if (!date || !time) return null;
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return [y, m, d, hh, mm];
}

// From IST wall clock -> UTC millis
function istWallToUTC(v) {
  const parts = parseInputValue(v);
  if (!parts) return null;
  const [y, m, d, hh, mm] = parts;
  const asUTC = Date.UTC(y, m - 1, d, hh, mm); // treat as if this IST wall time was UTC
  return asUTC - IST_OFFSET_MIN * MINUTES;     // shift back to actual UTC
}

// From ET wall clock -> UTC millis (handles DST by iterating once)
function etWallToUTC(v) {
  const parts = parseInputValue(v);
  if (!parts) return null;
  const [y, m, d, hh, mm] = parts;
  const naiveUTC = Date.UTC(y, m - 1, d, hh, mm);
  // First guess using offset at naiveUTC
  let off1 = offsetMinutesAtUTC(naiveUTC, fmtET);
  let utc1 = naiveUTC - off1 * MINUTES;
  // Recompute at utc1 for accuracy across DST boundaries
  let off2 = offsetMinutesAtUTC(utc1, fmtET);
  let utc2 = naiveUTC - off2 * MINUTES;
  return utc2;
}

// Update offset labels and DST badge
function refreshMeta() {
  const now = Date.now();
  const offET = offsetMinutesAtUTC(now, fmtET);
  const signET = offET >= 0 ? '+' : '-';
  const absET = Math.abs(offET);
  etOffsetEl.textContent = `${signET}${String(Math.floor(absET/60)).padStart(2,'0')}:${String(absET%60).padStart(2,'0')}`;
  istOffsetEl.textContent = '+05:30';
  dstBadge.textContent = (offET === -240) ? 'DST ACTIVE' : 'DST INACTIVE'; // -240 min == UTC-4
}

// Conversions
function convertFromIST() {
  const v = istInput.value;
  if (!v) return;
  const utc = istWallToUTC(v);
  if (utc == null) return;
  etInput.value = toLocalInputValue(utc, fmtET);
  refreshMeta();
}

function convertFromET() {
  const v = etInput.value;
  if (!v) return;
  const utc = etWallToUTC(v);
  if (utc == null) return;
  istInput.value = toLocalInputValue(utc, fmtIST);
  refreshMeta();
}

// Button actions
nowISTBtn.addEventListener('click', () => {
  const now = Date.now();
  istInput.value = toLocalInputValue(now, fmtIST);
  convertFromIST();
});

nowETBtn.addEventListener('click', () => {
  const now = Date.now();
  etInput.value = toLocalInputValue(now, fmtET);
  convertFromET();
});

// Live input
istInput.addEventListener('input', convertFromIST);
etInput.addEventListener('input', convertFromET);

// Swap cards order
let istFirst = true;
swapBtn.addEventListener('click', () => {
  if (istFirst) {
    cards.insertBefore(etCard, istCard);
  } else {
    cards.insertBefore(istCard, etCard);
  }
  istFirst = !istFirst;
});

// Init
(function init() {
  refreshMeta();
  // initialize IST with its current time
  istInput.value = toLocalInputValue(Date.now(), fmtIST);
  convertFromIST();
  // keep meta fresh each minute
  setInterval(refreshMeta, 60_000);
})();
