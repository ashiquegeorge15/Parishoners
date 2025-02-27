document.addEventListener('DOMContentLoaded', function() {
  const currentDate = new Date();
  let currentView = 'month';
  let events = [];

  const calendarGrid = document.getElementById('calendarGrid');
  const currentDateElement = document.getElementById('currentDate');
  const weekdaysHeader = document.getElementById('weekdaysHeader');
  const miniCalendar = document.getElementById('miniCalendar');
  const eventModal = document.getElementById('eventModal');
  const eventForm = document.getElementById('eventForm');

  // Navigation buttons
  document.getElementById('prevBtn').addEventListener('click', () => navigateMonth(-1));
  document.getElementById('nextBtn').addEventListener('click', () => navigateMonth(1));
  document.getElementById('todayBtn').addEventListener('click', goToToday);

  // View options
  document.querySelectorAll('.view-option').forEach(option => {
      option.addEventListener('click', (e) => changeView(e.target.dataset.view));
  });

  // Create event button
  document.getElementById('createEventBtn').addEventListener('click', openEventModal);

  // Close modal
  document.querySelector('.close').addEventListener('click', closeEventModal);

  // Event form submission
  eventForm.addEventListener('submit', saveEvent);

  // Initialize calendar
  updateCalendar();

  function updateCalendar() {
      currentDateElement.textContent = formatDate(currentDate, 'MMMM yyyy');
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

  function renderMonthView() {
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const startDate = new Date(firstDayOfMonth);
      startDate.setDate(startDate.getDate() - startDate.getDay());

      for (let i = 0; i < 42; i++) {
          const dateCell = createDateCell(new Date(startDate));
          calendarGrid.appendChild(dateCell);
          startDate.setDate(startDate.getDate() + 1);
      }
  }

  function renderWeekView() {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

      for (let i = 0; i < 7; i++) {
          const dateCell = createDateCell(new Date(startOfWeek), true);
          calendarGrid.appendChild(dateCell);
          startOfWeek.setDate(startOfWeek.getDate() + 1);
      }
  }

  function renderDayView() {
      const dateCell = createDateCell(currentDate, true);
      dateCell.style.width = '100%';
      calendarGrid.appendChild(dateCell);
  }

  function renderYearView() {
      for (let month = 0; month < 12; month++) {
          const monthDate = new Date(currentDate.getFullYear(), month, 1);
          const monthCell = document.createElement('div');
          monthCell.className = 'month-cell';
          monthCell.innerHTML = `
              <h3>${formatDate(monthDate, 'MMMM')}</h3>
              <div class="mini-month-grid"></div>
          `;
          const miniMonthGrid = monthCell.querySelector('.mini-month-grid');

          const firstDayOfMonth = new Date(currentDate.getFullYear(), month, 1);
          const lastDayOfMonth = new Date(currentDate.getFullYear(), month + 1, 0);
          const startDate = new Date(firstDayOfMonth);
          startDate.setDate(startDate.getDate() - startDate.getDay());

          for (let i = 0; i < 42; i++) {
              const miniDateCell = document.createElement('div');
              miniDateCell.className = 'mini-date-cell';
              miniDateCell.textContent = startDate.getDate();
              if (startDate.getMonth() !== month) {
                  miniDateCell.classList.add('different-month');
              }
              miniMonthGrid.appendChild(miniDateCell);
              startDate.setDate(startDate.getDate() + 1);
          }

          calendarGrid.appendChild(monthCell);
      }
  }

  function createDateCell(date, isLarge = false) {
      const dateCell = document.createElement('div');
      dateCell.className = 'date-cell' + (isLarge ? ' large' : '');
      if (date.getMonth() !== currentDate.getMonth()) {
          dateCell.classList.add('different-month');
      }
      if (isSameDate(date, new Date())) {
          dateCell.classList.add('today');
      }

      const dateNumber = document.createElement('div');
      dateNumber.className = 'date-number';
      dateNumber.textContent = date.getDate();
      dateCell.appendChild(dateNumber);

      const cellEvents = events.filter(event => isSameDate(new Date(event.date), date));
      cellEvents.forEach(event => {
          const eventElement = document.createElement('div');
          eventElement.className = 'event';
          eventElement.style.backgroundColor = event.color;
          eventElement.textContent = event.title;
          if (event.isReminder) {
              eventElement.classList.add('reminder');
          }
          dateCell.appendChild(eventElement);
      });

      dateCell.addEventListener('click', () => openEventModal(date));

      return dateCell;
  }

  function updateWeekdaysHeader() {
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      weekdaysHeader.innerHTML = '';
      weekdays.forEach(day => {
          const dayElement = document.createElement('div');
          dayElement.className = 'weekday';
          dayElement.textContent = day;
          weekdaysHeader.appendChild(dayElement);
      });
  }

  function updateMiniCalendar() {
      const miniMonthElement = document.createElement('div');
      miniMonthElement.className = 'mini-month';
      miniMonthElement.textContent = formatDate(currentDate, 'MMMM yyyy');

      const miniDaysElement = document.createElement('div');
      miniDaysElement.className = 'mini-days';
      ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
          const dayElement = document.createElement('div');
          dayElement.textContent = day;
          miniDaysElement.appendChild(dayElement);
      });

      const miniDatesElement = document.createElement('div');
      miniDatesElement.className = 'mini-dates';

      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const startDate = new Date(firstDayOfMonth);
      startDate.setDate(startDate.getDate() - startDate.getDay());

      for (let i = 0; i < 42; i++) {
          const miniDateElement = document.createElement('div');
          miniDateElement.className = 'mini-date';
          miniDateElement.textContent = startDate.getDate();

          if (isSameDate(startDate, new Date())) {
              miniDateElement.classList.add('today');
          }

          if (startDate.getMonth() !== currentDate.getMonth()) {
              miniDateElement.classList.add('different-month');
          }

          if (events.some(event => isSameDate(new Date(event.date), startDate))) {
              miniDateElement.classList.add('has-event');
          }

          miniDatesElement.appendChild(miniDateElement);
          startDate.setDate(startDate.getDate() + 1);
      }

      miniCalendar.innerHTML = '';
      miniCalendar.appendChild(miniMonthElement);
      miniCalendar.appendChild(miniDaysElement);
      miniCalendar.appendChild(miniDatesElement);
  }

  function navigateMonth(direction) {
      currentDate.setMonth(currentDate.getMonth() + direction);
      updateCalendar();
  }

  function goToToday() {
      currentDate = new Date();
      updateCalendar();
  }

  function changeView(view) {
      currentView = view;
      document.querySelectorAll('.view-option').forEach(option => {
          option.classList.toggle('active', option.dataset.view === view);
      });
      updateCalendar();
  }

  function openEventModal(date = new Date()) {
      eventModal.style.display = 'block';
      document.getElementById('eventDate').value = formatDate(date, 'yyyy-MM-dd');
  }

  function closeEventModal() {
      eventModal.style.display = 'none';
  }

  function saveEvent(e) {
      e.preventDefault();
      const newEvent = {
          title: document.getElementById('eventTitle').value,
          date: document.getElementById('eventDate').value,
          time: document.getElementById('eventTime').value,
          color: document.getElementById('eventColor').value,
          isReminder: document.getElementById('isReminder').checked
      };
      events.push(newEvent);
      closeEventModal();
      updateCalendar();
  }

  function clearCalendarGrid() {
      calendarGrid.innerHTML = '';
  }

  function formatDate(date, format) {
      const options = {
          'MMMM yyyy': { month: 'long', year: 'numeric' },
          'yyyy-MM-dd': { year: 'numeric', month: '2-digit', day: '2-digit' },
          'MMMM': { month: 'long' }
      };
      return date.toLocaleDateString('en-US', options[format]);
  }

  function isSameDate(date1, date2) {
      return date1.getDate() === date2.getDate() &&
             date1.getMonth() === date2.getMonth() &&
             date1.getFullYear() === date2
             date1.getMonth() === date2.getMonth() &&
             date1.getFullYear() === date2.getFullYear();
  }
});