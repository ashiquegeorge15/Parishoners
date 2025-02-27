// Responsive Calendar Handler
class ResponsiveCalendar {
    constructor() {
        this.isMobile = window.innerWidth < 768;
        this.setupResponsiveListeners();
        this.adjustCalendarLayout();
    }

    setupResponsiveListeners() {
        // Listen for window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Listen for orientation change
        window.addEventListener('orientationchange', () => {
            this.handleOrientationChange();
        });

        // Handle sidebar toggle
        const sidebarToggle = document.createElement('button');
        sidebarToggle.className = 'sidebar-toggle btn btn-light d-md-none';
        sidebarToggle.innerHTML = '<i class="fas fa-bars"></i>';
        document.querySelector('.calendar-header').prepend(sidebarToggle);

        sidebarToggle.addEventListener('click', () => {
            this.toggleSidebar();
        });
    }

    handleResize() {
        const wasDesktop = !this.isMobile;
        this.isMobile = window.innerWidth < 768;
        
        if (wasDesktop !== !this.isMobile) {
            this.adjustCalendarLayout();
        }

        this.adjustEventDisplay();
        this.adjustHeaderLayout();
    }

    handleOrientationChange() {
        setTimeout(() => {
            this.adjustCalendarLayout();
            this.adjustEventDisplay();
        }, 100);
    }

    adjustCalendarLayout() {
        const container = document.querySelector('.calendar-container');
        const sidebar = document.querySelector('.sidebar');
        const mainCalendar = document.querySelector('.main-calendar');

        if (this.isMobile) {
            container.classList.add('mobile-view');
            if (sidebar) sidebar.classList.add('sidebar-mobile');
            if (mainCalendar) mainCalendar.classList.add('calendar-mobile');
            this.adjustMobileView();
        } else {
            container.classList.remove('mobile-view');
            if (sidebar) sidebar.classList.remove('sidebar-mobile');
            if (mainCalendar) mainCalendar.classList.remove('calendar-mobile');
            this.adjustDesktopView();
        }
    }

    adjustMobileView() {
        // Adjust weekday headers for mobile
        const weekdays = document.querySelectorAll('.weekday');
        weekdays.forEach(day => {
            day.textContent = day.textContent.substring(0, 3); // Show only first 3 letters
        });

        // Adjust event display
        this.adjustEventDisplay();

        // Add swipe gestures for mobile
        this.setupSwipeGestures();
    }

    adjustDesktopView() {
        // Restore weekday headers
        const weekdays = document.querySelectorAll('.weekday');
        const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        weekdays.forEach((day, index) => {
            day.textContent = fullDays[index];
        });

        // Show sidebar if hidden
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.style.transform = 'translateX(0)';
    }

    adjustEventDisplay() {
        const dateCells = document.querySelectorAll('.date-cell');
        dateCells.forEach(cell => {
            const events = cell.querySelectorAll('.event');
            const maxVisible = this.isMobile ? 2 : 3;

            if (events.length > maxVisible) {
                // Hide excess events
                events.forEach((event, index) => {
                    if (index >= maxVisible - 1) {
                        event.style.display = 'none';
                    }
                });

                // Add more indicator
                const moreCount = events.length - (maxVisible - 1);
                const moreIndicator = document.createElement('div');
                moreIndicator.className = 'more-events';
                moreIndicator.textContent = `+${moreCount} more`;
                cell.appendChild(moreIndicator);

                // Add click handler to show all events
                moreIndicator.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showAllEvents(cell, events);
                });
            }
        });
    }

    showAllEvents(cell, events) {
        const rect = cell.getBoundingClientRect();
        const popup = document.createElement('div');
        popup.className = 'events-popup';
        popup.style.position = 'fixed';
        popup.style.top = `${rect.top}px`;
        popup.style.left = this.isMobile ? '10px' : `${rect.left}px`;
        popup.style.width = this.isMobile ? 'calc(100% - 20px)' : '300px';

        const date = cell.querySelector('.date-number').textContent;
        popup.innerHTML = `
            <div class="popup-header">
                <h6>Events for ${date}</h6>
                <button class="close-popup">&times;</button>
            </div>
            <div class="popup-content"></div>
        `;

        events.forEach(event => {
            const eventClone = event.cloneNode(true);
            eventClone.style.display = 'block';
            popup.querySelector('.popup-content').appendChild(eventClone);
        });

        document.body.appendChild(popup);

        // Close popup handlers
        const closeBtn = popup.querySelector('.close-popup');
        closeBtn.addEventListener('click', () => popup.remove());
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
    }

    setupSwipeGestures() {
        let touchStartX = 0;
        let touchEndX = 0;
        
        const calendar = document.querySelector('.calendar-container');
        
        calendar.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, false);

        calendar.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, false);
    }

    handleSwipe() {
        const minSwipeDistance = 50;
        const swipeDistance = touchEndX - touchStartX;

        if (Math.abs(swipeDistance) > minSwipeDistance) {
            if (swipeDistance > 0) {
                // Swipe right - previous month
                document.getElementById('prevBtn').click();
            } else {
                // Swipe left - next month
                document.getElementById('nextBtn').click();
            }
        }
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('show-sidebar');
        }
    }

    adjustHeaderLayout() {
        const header = document.querySelector('.calendar-header');
        if (this.isMobile) {
            header.classList.add('mobile-header');
        } else {
            header.classList.remove('mobile-header');
        }
    }
}

// Initialize responsive calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const responsiveCalendar = new ResponsiveCalendar();

    // Add necessary styles
    const style = document.createElement('style');
    style.textContent = `
        .mobile-view .calendar-header {
            flex-direction: column;
            padding: 10px;
        }

        .mobile-view .nav-buttons {
            margin-bottom: 10px;
        }

        .sidebar-mobile {
            position: fixed;
            left: -280px;
            top: 0;
            height: 100vh;
            width: 280px;
            z-index: 1000;
            transition: transform 0.3s ease;
            background: white;
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
        }

        .show-sidebar {
            transform: translateX(280px);
        }

        .sidebar-toggle {
            position: absolute;
            left: 10px;
            top: 10px;
            z-index: 100;
        }

        .events-popup {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            max-height: 80vh;
            overflow-y: auto;
        }

        .popup-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid #eee;
        }

        .popup-content {
            padding: 10px;
        }

        .close-popup {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
        }

        .more-events {
            font-size: 12px;
            color: #666;
            text-align: center;
            cursor: pointer;
            padding: 2px;
            background: #f8f9fa;
            border-radius: 3px;
            margin-top: 2px;
        }

        @media (max-width: 768px) {
            .weekday {
                font-size: 14px;
            }

            .date-cell {
                min-height: 80px;
            }

            .event {
                font-size: 11px;
            }

            .mobile-header {
                gap: 10px;
            }

            .view-options {
                display: flex;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                padding-bottom: 5px;
            }
        }
    `;
    document.head.appendChild(style);
}); 