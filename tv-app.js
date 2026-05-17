// tv-app.js

const API_URL =
  'https://opensheet.elk.sh/1wflogYrCU9S_H_9ptpmtj1LJ2-mt-RvXUq36u_yPw44/Sheet1';

let rows = [];
let selectedDate = new Date();

const el = {
  clockH: document.getElementById('hourHand'),
  clockM: document.getElementById('minuteHand'),
  clockS: document.getElementById('secondHand'),
  date: document.getElementById('clockDate'),
  status: document.getElementById('currentStatus'),
  countdown: document.getElementById('currentCountdown'),
  label: document.getElementById('currentLabel'),
  bar: document.getElementById('timelineBar')
};

const pad = n => String(n).padStart(2, '0');

const fmtDate = d =>
  d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

const toMin = t => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
};

const fromMin = m => {
  const total = (m + 1440) % 1440;
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return `${pad(h)}:${pad(mm)}`;
};

const diffStr = (a, b) => {
  let s = Math.max(0, Math.floor((b - a) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

const to12 = m => {
  const total = (m + 1440) % 1440;
  let h = Math.floor(total / 60);
  const mm = total % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${pad(h)}:${pad(mm)} ${suffix}`;
};

function currentRow() {
  return rows.find(r => r.Date === selectedDate.toISOString().slice(0, 10));
}

function prevRow() {
  const p = new Date(selectedDate);
  p.setDate(p.getDate() - 1);
  return rows.find(r => r.Date === p.toISOString().slice(0, 10));
}

/**
 * Build raw daily events from DAILY_TIMELINE,
 * but drop Abhijit on Wednesdays.
 */
function rawEvents() {
  const r = currentRow();
  if (!r) return [];

  const week = new Date(selectedDate).getDay() || 7; // 1=Mon, 3=Wed, 7=Sun

  const base = DAILY_TIMELINE(
    r.Sunrise,
    r.Sunset,
    week,
    prevRow()?.Sunset || r.Sunset
  ).map(([s, e, n]) => ({
    s: toMin(s),
    e: toMin(e),
    n
  }));

  // Drop Abhijit Muhurta on Wednesdays (weekday 3)
  if (week === 3) {
    return base.filter(ev => ev.n !== 'Abhijit Muhurta');
  }
  return base;
}

/**
 * Merge overlapping/adjacent events with same name
 */
function mergeSameNameEvents(events) {
  if (!events.length) return [];
  const list = [...events].sort((a, b) => (a.s - b.s));
  const merged = [];
  let cur = { ...list[0] };

  for (let i = 1; i < list.length; i++) {
    const e = list[i];
    if (e.n === cur.n && e.s <= cur.e) {
      cur.e = Math.max(cur.e, e.e);
    } else {
      merged.push(cur);
      cur = { ...e };
    }
  }
  merged.push(cur);
  return merged;
}

/**
 * Build timeline (for bottom bar) with merged events and Free Time
 */
function buildTimeline() {
  const r = currentRow();
  if (!r) return [];

  const base = rawEvents();

  const mergedNamed = mergeSameNameEvents(base.filter(ev => ev.n !== 'Free Time'));
  const events = [...mergedNamed].sort((a, b) => a.s - b.s);

  const result = [];
  let prevEnd = 0;

  events.forEach(ev => {
    if (ev.s > prevEnd) {
      result.push({
        s: prevEnd,
        e: ev.s,
        n: 'Free Time',
        type: 'free'
      });
    }
    result.push({
      ...ev,
      type: /Rahu Kaal/i.test(ev.n) ? 'inauspicious' : 'auspicious'
    });
    prevEnd = Math.max(prevEnd, ev.e);
  });

  if (prevEnd < 1440) {
    result.push({
      s: prevEnd,
      e: 1440,
      n: 'Free Time',
      type: 'free'
    });
  }

  return result;
}

/**
 * Equal-width segments for bottom bar
 */
function renderTimeline() {
  const segs = buildTimeline();
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();

  if (!segs.length) {
    el.bar.innerHTML =
      '<div class="seg-label" style="padding-top:34px">No data</div>';
    return;
  }

  const width = 100 / segs.length;

  let html = '<div class="timeline-grid">';
  segs.forEach(x => {
    const active = mins >= x.s && mins < x.e;
    html += `
      <div class="segment ${x.type} ${active ? 'active' : ''}" style="width:${width}%">
        <div class="seg-label">
          ${x.n}
          <span class="seg-time">${to12(x.s)} - ${to12(x.e)}</span>
        </div>
      </div>`;
  });
  html += '</div>';
  el.bar.innerHTML = html;
}

/**
 * Analog clock
 */
function drawAnalog() {
  const n = new Date();
  const hours = n.getHours();
  const minutes = n.getMinutes();
  const seconds = n.getSeconds();

  const hourAngle = (hours % 12) * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6;
  const secondAngle = seconds * 6;

  el.clockH.style.transform = `translate(-50%,-100%) rotate(${hourAngle}deg)`;
  el.clockM.style.transform = `translate(-50%,-100%) rotate(${minuteAngle}deg)`;
  el.clockS.style.transform = `translate(-50%,-100%) rotate(${secondAngle}deg)`;
}

/**
 * Top panel: show current + overlapping + upcoming
 */
function updateTop() {
  const n = new Date();
  drawAnalog();
  el.date.textContent = fmtDate(n);

  const r = currentRow();
  if (!r) {
    el.label.textContent = '';
    el.status.textContent = 'No data available';
    el.countdown.textContent = '';
    el.countdown.classList.remove('blink');
    return;
  }

  const base = rawEvents();
  const nowMin =
    n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60;

  // All events active right now (can be multiple)
  const activeNow = base.filter(ev => nowMin >= ev.s && nowMin < ev.e);

  // First future non-free event
  const upcoming = base
    .filter(ev => ev.s > nowMin && ev.n !== 'Free Time')
    .sort((a, b) => a.s - b.s)[0];

  // Helper to format countdown text
  const countdownTo = (startMin) =>
    diffStr(
      n,
      new Date(
        n.getFullYear(),
        n.getMonth(),
        n.getDate(),
        Math.floor(startMin / 60),
        startMin % 60,
        0
      )
    );

  // CASE 1: No active event -> only upcoming (if within 15 min)
  if (!activeNow.length) {
    if (upcoming && upcoming.s - nowMin <= 15) {
      el.label.textContent = 'Upcoming Kaal';
      el.status.innerHTML = `<div class="current-name">${upcoming.n}</div>`;
      el.countdown.classList.add('blink');
      el.countdown.textContent = `Starts in ${countdownTo(upcoming.s)}`;
    } else {
      el.label.textContent = '';
      el.status.textContent = '';
      el.countdown.textContent = '';
      el.countdown.classList.remove('blink');
    }
    return;
  }

  // CASE 2: We have active events -> show progress bars
  el.label.textContent = 'Current Muhurat / Kaal';

  const lines = activeNow.map(ev => {
    const total = ev.e - ev.s || 1;
    const elapsed = Math.max(0, Math.min(total, nowMin - ev.s));
    const pct = Math.round((elapsed / total) * 100);
    return `
      <div class="current-row">
        <div class="current-name">${ev.n}</div>
        <div class="current-progress">
          <div class="current-progress-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  });

  el.status.innerHTML = lines.join('');

  // Countdown: only for upcoming within 15 min
  if (upcoming && upcoming.s - nowMin <= 15) {
    el.countdown.classList.add('blink');
    el.countdown.textContent = `Next: ${upcoming.n} in ${countdownTo(upcoming.s)}`;
  } else {
    el.countdown.textContent = '';
    el.countdown.classList.remove('blink');
  }
}

async function init() {
  rows = await (await fetch(API_URL)).json();
  renderTimeline();
  updateTop();
  setInterval(() => {
    updateTop();
    renderTimeline();
  }, 1000);
}

init(); //new new