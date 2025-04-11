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
const eventModal = document.getElementById('eventModal');
const viewEventModal = document.getElementById('viewEventModal');
const eventForm = document.getElementById('eventForm');

// Form Elements
const eventTitleInput = document.getElementById('eventTitle');
const eventDateInput = document.getElementById('eventDate');
const eventTimeInput = document.getElementById('eventTime');
const eventLocationInput = document.getElementById('eventLocation');
const eventDescriptionInput = document.getElementById('eventDescription');
const isAllDayCheckbox = document.getElementById('isAllDay');
const eventIdInput = document.getElementById('eventId');

// Button Elements
const createEventBtn = document.getElementById('createEventBtn');
const saveEventBtn = document.getElementById('saveEventBtn');
const deleteEventBtn = document.getElementById('deleteEventBtn');
const editEventBtn = document.getElementById('editEventBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const todayBtn = document.getElementById('todayBtn');

// View Elements
const viewEventTitle = document.getElementById('viewEventTitle');
const viewEventDate = document.getElementById('viewEventDate');
const viewEventLocation = document.getElementById('viewEventLocation');
const viewEventCategory = document.getElementById('viewEventCategory');
const viewEventDescription = document.getElementById('viewEventDescription');

// Calendar Variables
const currentDate = new Date();
let displayDate = new Date(currentDate);
let currentView = 'month';
let events = [];

// Initialize date pickers using flatpickr
flatpickr(eventDateInput, {
    dateFormat: "Y-m-d",
    defaultDate: "today"
});

flatpickr(eventTimeInput, {
    enableTime: true,
    noCalendar: true,
    dateFormat: "H:i",
    time_24hr: false
});

// Function to load user profile picture
async function loadProfilePicture(userId) {
    try {
        // Get user profile data from Firestore
        const userDoc = await db.collection('users').doc(userId).get();
        
        // If user has a profile picture, update the image
        if (userDoc.exists && userDoc.data().profilePic && userDoc.data().profilePic.url) {
            const profileImg = document.querySelector('.profile-img');
            if (profileImg) {
                profileImg.src = userDoc.data().profilePic.url;
                console.log("Profile picture updated");
            }
        } else {
            console.log("No profile picture found or user doesn't exist");
        }
    } catch (error) {
        console.error("Error loading profile picture:", error);
    }
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    auth.onAuthStateChanged(function(user) {
        if (user) {
            // Check if user is admin
            db.collection('Admin').doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        // User is admin, initialize the calendar
                        initializeCalendar();
                        
                        // Load user profile picture
                        loadProfilePicture(user.uid);
                    } else {
                        // Not an admin, redirect to regular user page
                        window.location.href = '../auth/events.html';
                    }
                })
                .catch((error) => {
                    console.error("Error checking admin status:", error);
                    alert("Error verifying permissions. Please try again later.");
                });
        } else {
            // No user is signed in, redirect to login page
            window.location.href = '../login.html';
        }
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

// Create event button
createEventBtn.addEventListener('click', () => openEventModal());

// Save event button
saveEventBtn.addEventListener('click', saveEvent);

// Delete event button
deleteEventBtn.addEventListener('click', deleteEvent);

// Edit event button
editEventBtn.addEventListener('click', function() {
    const eventId = viewEventModal.getAttribute('data-event-id');
    
    // Close view modal and open edit modal
    let viewModalInstance = bootstrap.Modal.getInstance(viewEventModal);
    viewModalInstance.hide();
    
    // Open the event in edit mode
    openEventModal(eventId);
});

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
                events.push({
                    id: doc.id,
                    title: eventData.title,
                    date: eventData.date.toDate(), // Convert Firestore timestamp to Date
                    time: eventData.time ? eventData.time.toDate() : null,
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
            
            const hasEvent = events.some(event => 
                isSameDate(new Date(event.date), startDate)
            );
            
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

    // Add click event to create a new event on this date
    dateCell.addEventListener('click', () => {
        openEventModal(null, date);
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

        if (events.some(event => isSameDate(new Date(event.date), startDate))) {
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

// Open event modal for creating or editing an event
function openEventModal(eventId = null, date = new Date()) {
    // Reset form
    eventForm.reset();
    
    // Set modal title
    document.getElementById('eventModalLabel').textContent = eventId ? 'Edit Event' : 'Create New Event';
    
    // Set date to selected date
    if (eventDateInput._flatpickr) {
        eventDateInput._flatpickr.setDate(date);
    }
    
    if (eventId) {
        // Edit existing event
        const event = events.find(e => e.id === eventId);
        if (event) {
            eventTitleInput.value = event.title;
            if (eventDateInput._flatpickr) {
                eventDateInput._flatpickr.setDate(event.date);
            }
            
            if (event.time && eventTimeInput._flatpickr) {
                eventTimeInput._flatpickr.setDate(event.time);
            }
            
            eventLocationInput.value = event.location || '';
            eventDescriptionInput.value = event.description || '';
            isAllDayCheckbox.checked = event.isAllDay;
            
            // Set category radio
            const categoryRadio = document.querySelector(`input[name="eventCategory"][value="${event.category}"]`);
            if (categoryRadio) {
                categoryRadio.checked = true;
            }
            
            // Set event ID
            eventIdInput.value = eventId;
            
            // Show delete button
            deleteEventBtn.classList.remove('d-none');
        }
    } else {
        // Create new event
        eventIdInput.value = '';
        deleteEventBtn.classList.add('d-none');
    }
    
    // Show modal
    const eventModalElement = document.getElementById('eventModal');
    const modal = new bootstrap.Modal(eventModalElement);
    modal.show();
}

// Save event to Firebase
function saveEvent() {
    // Validate form
    if (!eventTitleInput.value || !eventDateInput.value) {
        alert('Please enter a title and date');
        return;
    }
    
    // Get form values
    const title = eventTitleInput.value;
    const date = eventDateInput._flatpickr.selectedDates[0];
    const time = isAllDayCheckbox.checked ? null : eventTimeInput._flatpickr.selectedDates[0];
    const location = eventLocationInput.value;
    const description = eventDescriptionInput.value;
    const isAllDay = isAllDayCheckbox.checked;
    const category = document.querySelector('input[name="eventCategory"]:checked').value;
    const eventId = eventIdInput.value;
    
    // Create event object
    const eventData = {
        title,
        date: firebase.firestore.Timestamp.fromDate(date),
        time: time ? firebase.firestore.Timestamp.fromDate(time) : null,
        location,
        description,
        isAllDay,
        category,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Save to Firestore
    if (eventId) {
        // Update existing event
        db.collection('events').doc(eventId).update(eventData)
            .then(() => {
                // Close modal
                const modal = bootstrap.Modal.getInstance(eventModal);
                modal.hide();
                
                // Refresh events
                fetchEvents();
            })
            .catch((error) => {
                console.error('Error updating event: ', error);
                alert('Error updating event: ' + error.message);
            });
    } else {
        // Create new event
        eventData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        eventData.createdBy = auth.currentUser.uid;
        
        db.collection('events').add(eventData)
            .then(() => {
                // Close modal
                const modal = bootstrap.Modal.getInstance(eventModal);
                modal.hide();
                
                // Refresh events
                fetchEvents();
            })
            .catch((error) => {
                console.error('Error adding event: ', error);
                alert('Error adding event: ' + error.message);
            });
    }
}

// Delete event from Firebase
function deleteEvent() {
    const eventId = eventIdInput.value;
    
    if (!eventId) {
        return;
    }
    
    if (confirm('Are you sure you want to delete this event?')) {
        db.collection('events').doc(eventId).delete()
            .then(() => {
                // Close modal
                const modal = bootstrap.Modal.getInstance(eventModal);
                modal.hide();
                
                // Refresh events
                fetchEvents();
            })
            .catch((error) => {
                console.error('Error deleting event: ', error);
                alert('Error deleting event: ' + error.message);
            });
    }
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
    
    // Store event ID for edit function
    viewEventModal.setAttribute('data-event-id', eventId);
    
    // Show modal
    const modal = new bootstrap.Modal(viewEventModal);
    modal.show();
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
