// ====================================
// TIME UTILITY FUNCTIONS
// ====================================

// Convert any time input to HH:MM 24hr string
function parseTime(timeInput) {
  if (!timeInput) return '00:00';
  
  let time;
  if (typeof timeInput === 'string') {
    // Handle "7:12" or "07:12" format
    const parts = timeInput.trim().split(':');
    if (parts.length === 2) {
      const hours = parseInt(parts[0]);
      const mins = parseInt(parts[1]);
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
    time = new Date(`2000/01/01 ${timeInput.toUpperCase()}`);
  } else if (timeInput instanceof Date) {
    time = timeInput;
  } else {
    const hours = Math.floor(timeInput);
    const mins = Math.round((timeInput - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
  
  if (isNaN(time)) return '00:00';
  const hours = time.getHours();
  const mins = time.getMinutes();
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Add minutes to time string
function addTimes(timeStr, minutes) {
  minutes = Math.round(minutes);
  const match = parseTime(timeStr).match(/(\d+):(\d+)/);
  const hours = parseInt(match[1]);
  const mins = parseInt(match[2]);
  
  const totalMins = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMins / 60) % 24;
  const newMins = Math.floor(totalMins % 60);
  
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

// Get day duration in minutes
function getDayMinutes(sunrise, sunset) {
  const sr = parseTime(sunrise);
  const ss = parseTime(sunset);
  const srMins = parseInt(sr.split(':')[0]) * 60 + parseInt(sr.split(':')[1]);
  const ssMins = parseInt(ss.split(':')[0]) * 60 + parseInt(ss.split(':')[1]);
  return ssMins - srMins;
}

// Convert time string to minutes from 00:00
function timeToMins(timeStr) {
  const parsed = parseTime(timeStr).split(':');
  return parseInt(parsed[0]) * 60 + parseInt(parsed[1]);
}

// ====================================
// MUHURAT & KAAL CALCULATIONS
// ====================================

// Rahu Kaal - Inauspicious period (varies by weekday)
function RAHU_KAAL(sunrise, sunset, weekday) {
  const dayMins = getDayMinutes(sunrise, sunset);
  const partMins = dayMins / 8;
  const rahuPart = [1, 6, 4, 5, 3, 2, 7][weekday - 1]; // Mon=2nd, Tue=7th, etc.
  const startMins = rahuPart * partMins;
  const rahuStart = addTimes(sunrise, startMins);
  const rahuEnd = addTimes(rahuStart, partMins);
  return [rahuStart, rahuEnd];
}

// Yamagandam - Inauspicious period (varies by weekday)
function YAMAGANDAM(sunrise, sunset, weekday) {
  const dayMins = getDayMinutes(sunrise, sunset);
  const partMins = dayMins / 8;
  const yamParts = [3, 2, 1, 0, 6, 5, 4][weekday - 1]; // Mon=4th, Tue=3rd, etc.
  const startMins = yamParts * partMins;
  const yamStart = addTimes(sunrise, startMins);
  const yamEnd = addTimes(yamStart, partMins);
  return [yamStart, yamEnd];
}

// Gulika Kaal - Inauspicious period (varies by weekday)
function GULIKA_KAAL(sunrise, sunset, weekday) {
  const dayMins = getDayMinutes(sunrise, sunset);
  const partMins = dayMins / 8;
  const gulikaPart = [5, 4, 3, 2, 1, 0, 6][weekday - 1]; // Mon=6th, Tue=5th, etc.
  const startMins = gulikaPart * partMins;
  const gulikaStart = addTimes(sunrise, startMins);
  const gulikaEnd = addTimes(gulikaStart, partMins);
  return [gulikaStart, gulikaEnd];
}

// Brahma Muhurta - Most auspicious period (13th-14th part of night)
function BRAHMA_MUHURTA_A(prevSunset, sunrise) {
  // Parse times into Date objects
  const sunsetTime = parseTime(prevSunset).split(':');
  const sunriseTime = parseTime(sunrise).split(':');
  
  let sunset = new Date(2000, 0, 1, parseInt(sunsetTime[0]), parseInt(sunsetTime[1]));
  let sunriseDate = new Date(2000, 0, 2, parseInt(sunriseTime[0]), parseInt(sunriseTime[1]));
  
  // Total night duration in milliseconds
  const nightDuration = sunriseDate.getTime() - sunset.getTime();
  
  // One part = 1/15th of night
  const partDuration = nightDuration / 15;
  
  // Brahma Muhurta = 13th to 14th part (last 1/15th of night)
  const brahmaStart = new Date(sunset.getTime() + partDuration * 13);
  const brahmaEnd = new Date(sunset.getTime() + partDuration * 14);
  
  // Format time as HH:MM
  function formatTime(date) {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }
  
  return [formatTime(brahmaStart), formatTime(brahmaEnd)];
}

// Abhijit Muhurta - Auspicious midday period (solar noon ±24 min)
function ABHIJIT_MUHURTA(sunrise, sunset) {
  const dayMins = getDayMinutes(sunrise, sunset);
  const midpointMins = dayMins / 2;
  const midpoint = addTimes(sunrise, midpointMins);
  const abhijitStart = addTimes(midpoint, -24);
  const abhijitEnd = addTimes(midpoint, 24);
  return [abhijitStart, abhijitEnd];
}

// Godhuli Kaal - Twilight period (sunset ±24 min)
function GODHULI_KAAL(sunset) {
  const godhuliStart = addTimes(sunset, -24);
  const godhuliEnd = addTimes(sunset, 24);
  return [godhuliStart, godhuliEnd];
}

// ====================================
// MAIN TIMELINE GENERATOR
// ====================================

function DAILY_TIMELINE(sunrise, sunset, weekday, prevSunset) {
  // Get all muhurat/kaal timings
  const brahmam = BRAHMA_MUHURTA_A(prevSunset, sunrise);
  const abhijit = ABHIJIT_MUHURTA(sunrise, sunset);
  const godhuli = GODHULI_KAAL(sunset);
  const rahu = RAHU_KAAL(sunrise, sunset, weekday);
  const yam = YAMAGANDAM(sunrise, sunset, weekday);
  const gulika = GULIKA_KAAL(sunrise, sunset, weekday);
  
  // Convert to [startMins, endMins, name] from 00:00
  const events = [
    [timeToMins(brahmam[0]), timeToMins(brahmam[1]), 'Brahma Muhurta'],
    [timeToMins(rahu[0]), timeToMins(rahu[1]), 'Rahu Kaal'],
    [timeToMins(yam[0]), timeToMins(yam[1]), 'Yamagandam'],
    [timeToMins(gulika[0]), timeToMins(gulika[1]), 'Gulika Kaal'],
    [timeToMins(abhijit[0]), timeToMins(abhijit[1]), 'Abhijit Muhurta'],
    [timeToMins(godhuli[0]), timeToMins(godhuli[1]), 'Godhuli Kaal']
  ].filter(e => e[1] > e[0]); // Only valid events
  
  // Sort by start time
  events.sort((a, b) => a[0] - b[0]);
  
  // Build timeline with gaps filled as "Free Time"
  const timeline = [];
  let prevEnd = 0;
  
  for (let event of events) {
    // Add gap if exists
    if (event[0] > prevEnd) {
      timeline.push([addTimes('00:00', prevEnd), addTimes('00:00', event[0]), 'Free Time']);
    }
    
    // Add event (merge if overlaps)
    if (event[0] <= prevEnd) {
      event[1] = Math.max(event[1], prevEnd);
    }
    prevEnd = event[1];
    timeline.push([addTimes('00:00', event[0]), addTimes('00:00', event[1]), event[2]]);
  }
  
  // Final gap to midnight
  if (prevEnd < 1440) {
    timeline.push([addTimes('00:00', prevEnd), '24:00', 'Free Time']);
  }
  
  return timeline;
}

// ====================================
// HELPER: Get weekday number (1=Mon, 7=Sun)
// ====================================
function getWeekdayNumber(dateString) {
  const date = new Date(dateString);
  const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return day === 0 ? 7 : day; // Convert to 1=Mon, 7=Sun
}

// ====================================
// EXPORT FOR USE
// ====================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DAILY_TIMELINE,
    getWeekdayNumber,
    parseTime,
    addTimes,
    RAHU_KAAL,
    YAMAGANDAM,
    GULIKA_KAAL,
    BRAHMA_MUHURTA_A,
    ABHIJIT_MUHURTA,
    GODHULI_KAAL
  };
}