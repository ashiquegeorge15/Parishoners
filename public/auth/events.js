// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDyqAiultYZzwcoRfQhNKRiCG3DuEBEsd8",
    authDomain: "backendlogsign.firebaseapp.com",
    databaseURL: "https://backendlogsign-default-rtdb.firebaseio.com",
    projectId: "backendlogsign",
    storageBucket: "backendlogsign.appspot.com",
    messagingSenderId: "1039275246750",
    appId: "1:1039275246750:web:ee61d0b254a2697a3e278f",
    measurementId: "G-C9R69XEVH7"
};

// Initialize Firebase (using existing initialized app if available)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// DOM Elements
const calendarGrid = document.getElementById('calendarGrid');
const currentDateElement = document.getElementById('currentDate');
const weekdaysHeader = document.getElementById('weekdaysHeader');
const miniCalendar = document.getElementById('miniCalendar');
const upcomingEventsList = document.getElementById('upcomingEventsList');
const viewEventModal = document.getElementById('viewEventModal');
const addToMyCalendar = document.getElementById('addToMyCalendar');
const addEventToCalendarBtn = document.getElementById('addEventToCalendarBtn');

// Navigation Elements
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const todayBtn = document.getElementById('todayBtn');

// View Elements
const viewEventTitle = document.getElementById('viewEventTitle');
const viewEventDate = document.getElementById('viewEventDate');
const viewEventLocation = document.getElementById('viewEventLocation');
const viewEventCategory = document.getElementById('viewEventCategory');
const viewEventDescription = document.getElementById('viewEventDescription');

// Filter Elements
const categoryFilters = document.querySelectorAll('.category-filters input[type="checkbox"]');

// Calendar Variables
const currentDate = new Date();
let displayDate = new Date(currentDate);
let currentView = 'month';
let events = [];
let activeFilters = ['worship', 'community', 'education', 'meeting', 'other']; // Default all filters active

// Set up event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    auth.onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in, initialize the calendar
            initializeCalendar();
        } else {
            // No user is signed in, redirect to login page
            window.location.href = '../login.html';
        }
    });

    // Set up category filters
    categoryFilters.forEach(filter => {
        filter.addEventListener('change', updateFilters);
    });
});

// Navigation buttons
prevBtn.addEventListener('click', () => navigateDate(-1));
nextBtn.addEventListener('click', () => navigateDate(1));
todayBtn.addEventListener('click', goToToday);

// View options
document.querySelectorAll('.view-option').forEach(option => {
    option.addEventListener('click', (e) => changeView(e.target.getAttribute('data-view')));
});

// Add to Calendar buttons
if (addToMyCalendar) {
    addToMyCalendar.addEventListener('click', exportAllEvents);
}

if (addEventToCalendarBtn) {
    addEventToCalendarBtn.addEventListener('click', function() {
        const eventId = viewEventModal.getAttribute('data-event-id');
        if (eventId) {
            exportEvent(eventId);
        }
    });
}

// Initialize calendar
function initializeCalendar() {
    // Fetch events from Firebase
    fetchEvents();
    
    // Setup calendar UI
    updateCalendar();
}

// Fetch events from Firestore
function fetchEvents() {
    upcomingEventsList.innerHTML = '<div class="events-loading">Loading events...</div>';
    
    db.collection('events')
        .orderBy('date', 'asc')
        .get()
        .then((querySnapshot) => {
            events = [];
            querySnapshot.forEach((doc) => {
                const eventData = doc.data();
                // Check if date is a Firestore timestamp and handle appropriately
                let eventDate;
                if (eventData.date && typeof eventData.date.toDate === 'function') {
                    eventDate = eventData.date.toDate(); // Convert Firestore timestamp to Date
                } else if (eventData.date instanceof Date) {
                    eventDate = eventData.date;
                } else if (eventData.date) {
                    // Try to convert from string or timestamp
                    eventDate = new Date(eventData.date);
                } else {
                    eventDate = new Date(); // Fallback to current date
                }

                // Same check for time field
                let eventTime = null;
                if (eventData.time && typeof eventData.time.toDate === 'function') {
                    eventTime = eventData.time.toDate();
                } else if (eventData.time instanceof Date) {
                    eventTime = eventData.time;
                } else if (eventData.time) {
                    eventTime = new Date(eventData.time);
                }

                events.push({
                    id: doc.id,
                    title: eventData.title,
                    date: eventDate,
                    time: eventTime,
                    isAllDay: eventData.isAllDay || false,
                    location: eventData.location || '',
                    description: eventData.description || '',
                    category: eventData.category || 'other'
                });
            });
            
            // Update calendar with the fetched events
            updateCalendar();
            
            // Update upcoming events list
            updateUpcomingEvents();
        })
        .catch((error) => {
            console.error('Error fetching events: ', error);
            upcomingEventsList.innerHTML = '<div class="events-loading">Error loading events</div>';
        });
}

// Update calendar display
function updateCalendar() {
    currentDateElement.textContent = formatDate(displayDate, 'long');
    updateWeekdaysHeader();
    clearCalendarGrid();

    switch (currentView) {
        case 'month':
            renderMonthView();
            break;
        case 'week':
            renderWeekView();
            break;
        case 'day':
            renderDayView();
            break;
        case 'year':
            renderYearView();
            break;
    }
    
    updateMiniCalendar();
}

// Render month view
function renderMonthView() {
    const firstDayOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
    const lastDayOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    for (let i = 0; i < 42; i++) {
        const dateCell = createDateCell(new Date(startDate));
        calendarGrid.appendChild(dateCell);
        startDate.setDate(startDate.getDate() + 1);
    }
}

// Render week view
function renderWeekView() {
    const startOfWeek = new Date(displayDate);
    startOfWeek.setDate(displayDate.getDate() - displayDate.getDay());

    for (let i = 0; i < 7; i++) {
        const dateCell = createDateCell(new Date(startOfWeek), true);
        calendarGrid.appendChild(dateCell);
        startOfWeek.setDate(startOfWeek.getDate() + 1);
    }
}

// Render day view
function renderDayView() {
    const dateCell = createDateCell(displayDate, true);
    dateCell.style.width = '100%';
    calendarGrid.appendChild(dateCell);
}

// Render year view
function renderYearView() {
    for (let month = 0; month < 12; month++) {
        const monthDate = new Date(displayDate.getFullYear(), month, 1);
        const monthCell = document.createElement('div');
        monthCell.className = 'month-cell';
        monthCell.innerHTML = `
            <h3>${formatDate(monthDate, 'month')}</h3>
            <div class="mini-month-grid"></div>
        `;
        const miniMonthGrid = monthCell.querySelector('.mini-month-grid');

        const firstDayOfMonth = new Date(displayDate.getFullYear(), month, 1);
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        // Add days of week
        const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        daysOfWeek.forEach(day => {
            const dayElem = document.createElement('div');
            dayElem.className = 'mini-date-cell day-of-week';
            dayElem.textContent = day;
            miniMonthGrid.appendChild(dayElem);
        });

        for (let i = 0; i < 42; i++) {
            const miniDateCell = document.createElement('div');
            miniDateCell.className = 'mini-date-cell';
            miniDateCell.textContent = startDate.getDate();
            
            if (startDate.getMonth() !== month) {
                miniDateCell.classList.add('different-month');
            }
            
            if (isSameDate(startDate, new Date())) {
                miniDateCell.classList.add('today');
            }
            
            const hasEvent = events.filter(event => 
                isSameDate(new Date(event.date), startDate) && 
                activeFilters.includes(event.category)
            ).length > 0;
            
            if (hasEvent) {
                miniDateCell.classList.add('has-event');
            }
            
            miniDateCell.addEventListener('click', () => {
                displayDate = new Date(startDate);
                currentView = 'month';
                updateCalendar();
            });
            
            miniMonthGrid.appendChild(miniDateCell);
            startDate.setDate(startDate.getDate() + 1);
        }

        calendarGrid.appendChild(monthCell);
    }
}

// Create a date cell for the calendar
function createDateCell(date, isLarge = false) {
    const dateCell = document.createElement('div');
    dateCell.className = 'date-cell' + (isLarge ? ' large' : '');
    
    if (date.getMonth() !== displayDate.getMonth()) {
        dateCell.classList.add('different-month');
    }
    
    if (isSameDate(date, new Date())) {
        dateCell.classList.add('today');
    }

    const dateNumber = document.createElement('div');
    dateNumber.className = 'date-number';
    dateNumber.textContent = date.getDate();
    dateCell.appendChild(dateNumber);

    // Add events to the date cell
    const cellEvents = events.filter(event => isSameDate(new Date(event.date), date));
    cellEvents.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = `event ${event.category}`;
        
        if (!activeFilters.includes(event.category)) {
            eventElement.classList.add('hidden');
        }
        
        let eventTitle = event.title;
        if (!event.isAllDay && event.time) {
            eventTitle = `${formatTime(event.time)} ${eventTitle}`;
        }
        
        eventElement.textContent = eventTitle;
        eventElement.addEventListener('click', (e) => {
            e.stopPropagation();
            viewEvent(event.id);
        });
        
        dateCell.appendChild(eventElement);
    });

    return dateCell;
}

// Update the weekdays header based on the current view
function updateWeekdaysHeader() {
    weekdaysHeader.innerHTML = '';
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    if (currentView === 'year') {
        return;
    }
    
    weekdays.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'weekday';
        dayElement.textContent = currentView === 'month' ? day.substr(0, 3) : day;
        weekdaysHeader.appendChild(dayElement);
    });
}

// Update the mini calendar in the sidebar
function updateMiniCalendar() {
    miniCalendar.innerHTML = '';
    
    const miniMonthElement = document.createElement('div');
    miniMonthElement.className = 'mini-month';
    miniMonthElement.textContent = formatDate(displayDate, 'short');
    miniCalendar.appendChild(miniMonthElement);

    const miniDaysElement = document.createElement('div');
    miniDaysElement.className = 'mini-days';
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.textContent = day;
        miniDaysElement.appendChild(dayElement);
    });
    miniCalendar.appendChild(miniDaysElement);

    const miniDatesElement = document.createElement('div');
    miniDatesElement.className = 'mini-dates';

    const firstDayOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    for (let i = 0; i < 42; i++) {
        const miniDateElement = document.createElement('div');
        miniDateElement.className = 'mini-date';
        miniDateElement.textContent = startDate.getDate();

        if (isSameDate(startDate, new Date())) {
            miniDateElement.classList.add('today');
        }

        if (startDate.getMonth() !== displayDate.getMonth()) {
            miniDateElement.classList.add('different-month');
        }

        // Check if there are events on this date (with active filters)
        const hasEvent = events.some(event => 
            isSameDate(new Date(event.date), startDate) && 
            activeFilters.includes(event.category)
        );

        if (hasEvent) {
            miniDateElement.classList.add('has-event');
        }

        miniDateElement.addEventListener('click', () => {
            displayDate = new Date(startDate);
            updateCalendar();
        });

        miniDatesElement.appendChild(miniDateElement);
        startDate.setDate(startDate.getDate() + 1);
    }
    
    miniCalendar.appendChild(miniDatesElement);
}

// Update the upcoming events list in the sidebar
function updateUpcomingEvents() {
    upcomingEventsList.innerHTML = '';
    
    // Sort events by date, ascending
    const sortedEvents = [...events].sort((a, b) => a.date - b.date);
    
    // Filter to get only upcoming events (today and future dates)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingEvents = sortedEvents.filter(event => event.date >= today);
    
    if (upcomingEvents.length === 0) {
        upcomingEventsList.innerHTML = '<div class="events-loading">No upcoming events</div>';
        return;
    }
    
    // Limit to the next 10 events
    const displayEvents = upcomingEvents.slice(0, 10);
    
    displayEvents.forEach(event => {
        const eventItem = document.createElement('div');
        eventItem.className = `event-item ${event.category}`;
        
        if (!activeFilters.includes(event.category)) {
            eventItem.classList.add('hidden');
        }
        
        eventItem.innerHTML = `
            <h5>${event.title}</h5>
            <p>${formatDate(event.date, 'medium')}${event.time && !event.isAllDay ? ' • ' + formatTime(event.time) : ''}</p>
        `;
        
        eventItem.addEventListener('click', () => {
            viewEvent(event.id);
        });
        
        upcomingEventsList.appendChild(eventItem);
    });
}

// Update category filters
function updateFilters() {
    activeFilters = [];
    
    categoryFilters.forEach(filter => {
        if (filter.checked) {
            activeFilters.push(filter.value);
        }
    });
    
    // Re-render calendar with new filters
    updateCalendar();
    updateUpcomingEvents();
}

// Navigate the calendar by changing the display date
function navigateDate(direction) {
    switch (currentView) {
        case 'day':
            displayDate.setDate(displayDate.getDate() + direction);
            break;
        case 'week':
            displayDate.setDate(displayDate.getDate() + (7 * direction));
            break;
        case 'month':
            displayDate.setMonth(displayDate.getMonth() + direction);
            break;
        case 'year':
            displayDate.setFullYear(displayDate.getFullYear() + direction);
            break;
    }
    
    updateCalendar();
}

// Go to today
function goToToday() {
    displayDate = new Date();
    updateCalendar();
}

// Change the calendar view
function changeView(view) {
    if (!view) return;
    
    currentView = view;
    
    // Update active state for view buttons
    document.querySelectorAll('.view-option').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const viewButton = document.querySelector(`.view-option[data-view="${view}"]`);
    if (viewButton) {
        viewButton.classList.add('active');
    }
    
    updateCalendar();
}

// View event details
function viewEvent(eventId) {
    const event = events.find(e => e.id === eventId);
    
    if (!event) {
        return;
    }
    
    // Set event details in modal
    viewEventTitle.textContent = event.title;
    
    let dateDisplay = formatDate(event.date, 'full');
    if (event.time && !event.isAllDay) {
        dateDisplay += ' at ' + formatTime(event.time);
    } else if (event.isAllDay) {
        dateDisplay += ' (All Day)';
    }
    
    viewEventDate.textContent = dateDisplay;
    viewEventLocation.textContent = event.location || 'No location specified';
    
    // Format category to title case
    const categoryFormatted = event.category.charAt(0).toUpperCase() + event.category.slice(1);
    viewEventCategory.textContent = categoryFormatted;
    
    viewEventDescription.textContent = event.description || 'No description available';
    
    // Store event ID for export function
    viewEventModal.setAttribute('data-event-id', eventId);
    
    // Show modal
    const modal = new bootstrap.Modal(viewEventModal);
    modal.show();
}

// Export event to user's calendar (Google Calendar, iCal, etc)
function exportEvent(eventId) {
    const event = events.find(e => e.id === eventId);
    
    if (!event) {
        return;
    }
    
    // Format date for ICS file
    const formatDateForICS = (date) => {
        const pad = (n) => (n < 10 ? '0' + n : n);
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    };
    
    const startDate = event.time ? event.time : new Date(event.date);
    let endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1); // Default to 1-hour event
    
    if (event.isAllDay) {
        // For all-day events, use DATE format instead of DATE-TIME
        const formatDateOnly = (date) => {
            const pad = (n) => (n < 10 ? '0' + n : n);
            return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
        };
        
        // Create ICS content
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//St Thomas Church//Event Calendar//EN',
            'BEGIN:VEVENT',
            `SUMMARY:${event.title}`,
            `DTSTART;VALUE=DATE:${formatDateOnly(event.date)}`,
            `DTEND;VALUE=DATE:${formatDateOnly(new Date(event.date.getTime() + 24 * 60 * 60 * 1000))}`,
            `LOCATION:${event.location || 'St Thomas Church'}`,
            `DESCRIPTION:${event.description || ''}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');
        
        downloadICS(event.title, icsContent);
    } else {
        // Create ICS content for timed event
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//St Thomas Church//Event Calendar//EN',
            'BEGIN:VEVENT',
            `SUMMARY:${event.title}`,
            `DTSTART:${formatDateForICS(startDate)}`,
            `DTEND:${formatDateForICS(endDate)}`,
            `LOCATION:${event.location || 'St Thomas Church'}`,
            `DESCRIPTION:${event.description || ''}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');
        
        downloadICS(event.title, icsContent);
    }
}

// Export all events to user's calendar
function exportAllEvents() {
    if (events.length === 0) {
        alert('No events to export');
        return;
    }
    
    // Filter to get only upcoming events (today and future dates)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Only include events with active filters
    const upcomingEvents = events.filter(event => 
        event.date >= today && 
        activeFilters.includes(event.category)
    );
    
    if (upcomingEvents.length === 0) {
        alert('No upcoming events to export');
        return;
    }
    
    // Format date for ICS file
    const formatDateForICS = (date) => {
        const pad = (n) => (n < 10 ? '0' + n : n);
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    };
    
    const formatDateOnly = (date) => {
        const pad = (n) => (n < 10 ? '0' + n : n);
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    };
    
    // Create ICS content
    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//St Thomas Church//Event Calendar//EN'
    ];
    
    upcomingEvents.forEach(event => {
        if (event.isAllDay) {
            icsContent = icsContent.concat([
                'BEGIN:VEVENT',
                `SUMMARY:${event.title}`,
                `DTSTART;VALUE=DATE:${formatDateOnly(event.date)}`,
                `DTEND;VALUE=DATE:${formatDateOnly(new Date(event.date.getTime() + 24 * 60 * 60 * 1000))}`,
                `LOCATION:${event.location || 'St Thomas Church'}`,
                `DESCRIPTION:${event.description || ''}`,
                'END:VEVENT'
            ]);
        } else {
            const startDate = event.time ? event.time : new Date(event.date);
            let endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 1); // Default to 1-hour event
            
            icsContent = icsContent.concat([
                'BEGIN:VEVENT',
                `SUMMARY:${event.title}`,
                `DTSTART:${formatDateForICS(startDate)}`,
                `DTEND:${formatDateForICS(endDate)}`,
                `LOCATION:${event.location || 'St Thomas Church'}`,
                `DESCRIPTION:${event.description || ''}`,
                'END:VEVENT'
            ]);
        }
    });
    
    icsContent.push('END:VCALENDAR');
    
    downloadICS('St_Thomas_Church_Events', icsContent.join('\r\n'));
}

// Helper function to download ICS file
function downloadICS(title, content) {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Clear the calendar grid
function clearCalendarGrid() {
    calendarGrid.innerHTML = '';
}

// Format date for display
function formatDate(date, format = 'short') {
    if (!date) return '';
    
    const options = {
        short: { month: 'short', year: 'numeric' },
        medium: { month: 'short', day: 'numeric' },
        long: { month: 'long', year: 'numeric' },
        full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
        month: { month: 'long' }
    };
    
    return new Date(date).toLocaleDateString('en-US', options[format]);
}

// Format time for display
function formatTime(time) {
    if (!time) return '';
    
    const options = { hour: 'numeric', minute: '2-digit', hour12: true };
    return new Date(time).toLocaleTimeString('en-US', options);
}

// Check if two dates are the same day
function isSameDate(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}
