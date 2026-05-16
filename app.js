// ====================================
// APP CONFIGURATION
// ====================================
const OPENSHEET_API_URL = 'https://opensheet.elk.sh/1wflogYrCU9S_H_9ptpmtj1LJ2-mt-RvXUq36u_yPw44/Sheet1';
let panchangData = [];
let currentDate = new Date();

// ====================================
// DOM ELEMENTS
// ====================================
const datePicker = document.getElementById('datePicker');
const prevDayBtn = document.getElementById('prevDay');
const nextDayBtn = document.getElementById('nextDay');
const todayBtn = document.getElementById('todayBtn');
const currentTimeDisplay = document.getElementById('currentTime');
const sunriseTimeDisplay = document.getElementById('sunriseTime');
const sunsetTimeDisplay = document.getElementById('sunsetTime');
const timelineContainer = document.getElementById('timelineContainer');

// ====================================
// INITIALIZE APP
// ====================================
async function initApp() {
    try {
        // Fetch data from OpenSheet API
        const response = await fetch(OPENSHEET_API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch data from OpenSheet API');
        }
        panchangData = await response.json();
        
        // Set date picker to today
        updateDatePicker(currentDate);
        
        // Display panchang for current date
        displayPanchang(currentDate);
        
        // Update current time every second
        updateCurrentTime();
        setInterval(updateCurrentTime, 1000);
        
    } catch (error) {
        console.error('Error initializing app:', error);
        timelineContainer.innerHTML = `
            <div class="loading" style="color: #dc3545;">
                ❌ Error loading data. Please check if the Google Sheet is publicly accessible.
                <br><br>
                <small>${error.message}</small>
            </div>
        `;
    }
}

// ====================================
// DATE PICKER & NAVIGATION
// ====================================
function updateDatePicker(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    datePicker.value = `${year}-${month}-${day}`;
}

datePicker.addEventListener('change', (e) => {
    currentDate = new Date(e.target.value);
    displayPanchang(currentDate);
});

prevDayBtn.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1);
    updateDatePicker(currentDate);
    displayPanchang(currentDate);
});

nextDayBtn.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 1);
    updateDatePicker(currentDate);
    displayPanchang(currentDate);
});

todayBtn.addEventListener('click', () => {
    currentDate = new Date();
    updateDatePicker(currentDate);
    displayPanchang(currentDate);
});

// ====================================
// CURRENT TIME DISPLAY
// ====================================
function updateCurrentTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    currentTimeDisplay.textContent = now.toLocaleString('en-IN', options);
    
    // Update active period if on current date
    const today = new Date();
    if (currentDate.toDateString() === today.toDateString()) {
        highlightActivePeriod();
    }
}

// ====================================
// DISPLAY PANCHANG
// ====================================
function displayPanchang(date) {
    const dateString = formatDateForAPI(date);
    
    // Find data for selected date
    const todayData = panchangData.find(d => d.Date === dateString);
    
    if (!todayData) {
        timelineContainer.innerHTML = `
            <div class="loading" style="color: #dc3545;">
                ❌ No data available for ${dateString}
                <br><br>
                <small>Please add this date to your Google Sheet</small>
            </div>
        `;
        return;
    }
    
    // Get previous day's sunset
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateString = formatDateForAPI(prevDate);
    const prevDayData = panchangData.find(d => d.Date === prevDateString);
    const prevSunset = prevDayData ? prevDayData.Sunset : todayData.Sunset;
    
    // Display sunrise/sunset
    sunriseTimeDisplay.textContent = todayData.Sunrise;
    sunsetTimeDisplay.textContent = todayData.Sunset;
    
    // Calculate weekday (1=Mon, 7=Sun)
    const weekday = getWeekdayNumber(dateString);
    
    // Generate timeline
    const timeline = DAILY_TIMELINE(
        todayData.Sunrise,
        todayData.Sunset,
        weekday,
        prevSunset
    );
    
    // Display timeline
    renderTimeline(timeline);
    
    // Highlight active period if today
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        highlightActivePeriod();
    }
}

// ====================================
// RENDER TIMELINE
// ====================================
function renderTimeline(timeline) {
    timelineContainer.innerHTML = '';
    
    timeline.forEach(([startTime, endTime, periodName]) => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        
        // Add specific class based on period name
        const className = periodName.toLowerCase().replace(/ /g, '-');
        item.classList.add(className);
        
        // Add data attributes for active period detection
        item.dataset.startTime = startTime;
        item.dataset.endTime = endTime;
        
        item.innerHTML = `
            <div class="timeline-time">${startTime} - ${endTime}</div>
            <div class="timeline-name">${periodName}</div>
        `;
        
        timelineContainer.appendChild(item);
    });
}

// ====================================
// HIGHLIGHT ACTIVE PERIOD
// ====================================
function highlightActivePeriod() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Remove all active classes
    document.querySelectorAll('.timeline-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Find and highlight current period
    document.querySelectorAll('.timeline-item').forEach(item => {
        const startTime = item.dataset.startTime;
        const endTime = item.dataset.endTime;
        
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
            item.classList.add('active');
        }
    });
}

// ====================================
// UTILITY FUNCTIONS
// ====================================
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function timeToMinutes(timeStr) {
    if (timeStr === '24:00') return 1440;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// ====================================
// START APP
// ====================================
initApp();