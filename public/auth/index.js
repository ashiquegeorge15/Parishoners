import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
import { getDatabase, ref, get, onValue } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-database.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDyqAiultYZzwcoRfQhNKRiCG3DuEBEsd8",
  authDomain: "backendlogsign.firebaseapp.com",
  projectId: "backendlogsign",
  storageBucket: "backendlogsign.appspot.com",
  messagingSenderId: "1039275246750",
  appId: "1:1039275246750:web:ee61d0b254a2697a3e278f",
  measurementId: "G-C9R69XEVH7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);
const rtdb = getDatabase();

console.log("script loaded");

// DOM Elements
const pageLoader = document.getElementById("page-loader");
const logoutBtn = document.getElementById("logoutBtn");
const profileDropdownToggle = document.getElementById("profileDropdownToggle");
const profileLogoutBtn = document.getElementById("profileLogoutBtn");
const userName = document.getElementById("userName");
const profileDropdownName = document.getElementById("profileDropdownName");
const profileDropdownImg = document.getElementById("profileDropdownImg");
const recentAnnouncementsContainer = document.getElementById("recentAnnouncements");
const upcomingEventsContainer = document.getElementById("upcomingEvents");

// Show loader
window.addEventListener("load", () => {
  setTimeout(() => {
    pageLoader.style.display = "none";
  }, 500);
});

// Toggle profile dropdown
if (profileDropdownToggle) {
  profileDropdownToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    profileDropdownToggle.classList.toggle("active");
  });
  
  // Close dropdown when clicking outside
  document.addEventListener("click", () => {
    profileDropdownToggle.classList.remove("active");
  });
}

// Auth state observer
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // User is signed in
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Update UI with user data
        if (userName) userName.textContent = userData.name || user.displayName || user.email;
        if (profileDropdownName) profileDropdownName.textContent = userData.name || user.displayName || user.email;
        
        // Update profile image if available
        if (userData.photoURL) {
          const profileImgs = document.querySelectorAll(".profile-img");
          profileImgs.forEach(img => {
            img.src = userData.photoURL;
          });
          
          if (profileDropdownImg) {
            profileDropdownImg.src = userData.photoURL;
          }
        }
      }
      
      // Fetch recent announcements
      fetchRecentAnnouncements();
      
      // Fetch upcoming events
      fetchUpcomingEvents();
      
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  } else {
    // User is signed out, redirect to login
    window.location.href = "../index.html";
  }
});

// Logout functionality
const handleLogout = async () => {
  try {
    await signOut(auth);
    window.location.href = "../index.html";
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

// Add event listeners for logout buttons
if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
if (profileLogoutBtn) profileLogoutBtn.addEventListener("click", handleLogout);

// Fetch recent announcements
async function fetchRecentAnnouncements() {
  try {
    // Here you would fetch from Firestore
    // For now, we'll just show a sample
    
    // Remove loading spinner
    const loadingItems = recentAnnouncementsContainer.querySelectorAll(".loading-item");
    loadingItems.forEach(item => item.remove());
    
    // Add sample announcements
    const announcements = [
      {
        title: "Sunday School Registration",
        content: "Registration for the new academic year is now open",
        timestamp: "2 days ago"
      },
      {
        title: "Parish Meeting",
        content: "General parish meeting scheduled for next Sunday after service",
        timestamp: "1 week ago"
      }
    ];
    
    announcements.forEach(announcement => {
      const announcementEl = createAnnouncementElement(announcement);
      recentAnnouncementsContainer.appendChild(announcementEl);
    });
  } catch (error) {
    console.error("Error fetching announcements:", error);
  }
}

// Create announcement element
function createAnnouncementElement(announcement) {
  const div = document.createElement("div");
  div.className = "activity-item";
  
  div.innerHTML = `
    <div class="activity-icon announcements">
      <i class="fas fa-bullhorn"></i>
    </div>
    <div class="activity-content">
      <h4>${announcement.title}</h4>
      <p>${announcement.content}</p>
      <span class="activity-time"><i class="far fa-clock"></i> ${announcement.timestamp}</span>
    </div>
  `;
  
  return div;
}

// Fetch upcoming events
async function fetchUpcomingEvents() {
  try {
    // Here you would fetch from Firestore
    // For now, we'll just show a sample
    
    // Remove loading spinner
    const loadingItems = upcomingEventsContainer.querySelectorAll(".loading-item");
    loadingItems.forEach(item => item.remove());
    
    // Add sample events
    const events = [
      {
        title: "Christmas Carol Service",
        content: "Join us for a night of caroling and celebration",
        timestamp: "Dec 20, 6:00 PM"
      },
      {
        title: "New Year Service",
        content: "Special service to welcome the new year",
        timestamp: "Dec 31, 11:00 PM"
      }
    ];
    
    events.forEach(event => {
      const eventEl = createEventElement(event);
      upcomingEventsContainer.appendChild(eventEl);
    });
  } catch (error) {
    console.error("Error fetching events:", error);
  }
}

// Create event element
function createEventElement(event) {
  const div = document.createElement("div");
  div.className = "activity-item";
  
  div.innerHTML = `
    <div class="activity-icon events">
      <i class="fas fa-calendar"></i>
    </div>
    <div class="activity-content">
      <h4>${event.title}</h4>
      <p>${event.content}</p>
      <span class="activity-time"><i class="far fa-clock"></i> ${event.timestamp}</span>
    </div>
  `;
  
  return div;
}

// Update user name in sidebar
async function updateUserInfo(user) {
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            document.getElementById('userName').textContent = userData.name || 'Parish Member';
            
            // Update profile picture
            const profileImg = document.querySelector('.profile-img');
            if (profileImg && userData.profilePic && userData.profilePic.url) {
                profileImg.src = userData.profilePic.url;
            }
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

// Show loader function
function showLoader() {
    const loader = document.getElementById('page-loader');
    if (loader) {
        loader.classList.add('active');
    }
}

// Hide loader function
function hideLoader() {
    const loader = document.getElementById('page-loader');
    if (loader) {
        loader.classList.remove('active');
        // Optional: Remove loader completely after transition
        setTimeout(() => {
            loader.style.display = 'none';
        }, 300);
    }
}

// Add event listeners for page transitions
document.addEventListener('DOMContentLoaded', () => {
    // Hide loader when page is fully loaded
    hideLoader();

    // Add click event listeners to all navigation links
    document.querySelectorAll('a').forEach(link => {
        if (link.href && !link.href.includes('#') && !link.id.includes('logoutBtn')) {
            link.addEventListener('click', () => {
                showLoader();
            });
            }
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
        showLoader();
    });
});

// Modify your existing navigation handling
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        if (!link.id.includes('logoutBtn')) { // Don't show loader for logout
            showLoader();
        }
    });
});

// Modify your existing auth state change handler
onAuthStateChanged(auth, async (user) => {
    showLoader(); // Show loader when checking auth state
    
    if (!user) {
        window.location.href = '/login.html';
        return;
    }

    try {
        await updateUserInfo(user);
        const adminDoc = await getDoc(doc(db, "Admin", user.uid));
        if (adminDoc.exists()) {
            hideLoader(); // Hide loader after admin check
            return;
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists() || !userDoc.data().isApproved) {
            await signOut(auth);
            window.location.href = '/login.html?error=not_approved';
            return;
        }

        hideLoader(); // Hide loader after all checks
    } catch (error) {
        console.error("Error checking user status:", error);
        await signOut(auth);
        window.location.href = '/login.html?error=check_failed';
    }
});

// Add this to handle page unload
window.addEventListener('beforeunload', () => {
    showLoader();
});

// Add this for handling AJAX requests if you're using them
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    showLoader();
    try {
        const response = await originalFetch(...args);
        hideLoader();
        return response;
    } catch (error) {
        hideLoader();
        throw error;
    }
};

// Show loader immediately when page starts loading
document.addEventListener('DOMContentLoaded', () => {
    showLoader();
});

// Format date for display
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown date';
    
    let date;
    if (timestamp.toDate) {
        // Firestore timestamp
        date = timestamp.toDate();
    } else if (timestamp.seconds) {
        // Firestore timestamp in seconds
        date = new Date(timestamp.seconds * 1000);
    } else {
        // Assume it's a Date object or timestamp
        date = new Date(timestamp);
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    
    const options = { month: 'short', day: 'numeric' };
    if (date.getFullYear() !== now.getFullYear()) {
        options.year = 'numeric';
    }
    
    return date.toLocaleDateString('en-US', options);
}

// Load stats
async function loadStats() {
    try {
        // Show loading state
        document.querySelectorAll('.stat-number').forEach(el => {
            el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        });

        // Get counts from Firestore
        const usersQuery = query(collection(db, "users"), where("isApproved", "==", true));
        const usersSnapshot = await getDocs(usersQuery);
        
        // Get events count
        const eventsQuery = query(collection(db, "events"));
        const eventsSnapshot = await getDocs(eventsQuery);
        
        // Get announcements count from Realtime Database
        const announcementsSnapshot = await get(ref(rtdb, 'Announcements'));
        const announcementsCount = announcementsSnapshot.exists() ? Object.keys(announcementsSnapshot.val()).length : 0;

        // Calculate total gallery images
        let totalImages = 0;
        eventsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.images && Array.isArray(data.images)) {
                totalImages += data.images.length;
            }
        });

        // Update stats with animation
        function updateWithAnimation(selector, value) {
            const element = document.querySelector(selector);
            if (element) {
                element.style.transition = 'opacity 0.3s ease';
                element.style.opacity = '0';
                setTimeout(() => {
                    element.textContent = value;
                    element.style.opacity = '1';
                }, 300);
            }
        }

        // Update stats
        updateWithAnimation('.stat-card:nth-child(1) .stat-number', usersSnapshot.size);
        updateWithAnimation('.stat-card:nth-child(2) .stat-number', eventsSnapshot.size);
        updateWithAnimation('.stat-card:nth-child(3) .stat-number', totalImages);
        updateWithAnimation('.stat-card:nth-child(4) .stat-number', announcementsCount);

        // Hide or update percentage changes
        document.querySelectorAll('.stat-change').forEach(el => {
            // For now, hide them as we don't have historical data
            el.style.display = 'none';
        });
    } catch (error) {
        console.error("Error loading stats:", error);
        // Show error state
        document.querySelectorAll('.stat-number').forEach(el => {
            el.textContent = 'Error';
            el.style.color = 'red';
        });
    }
}

// Load recent announcements
async function loadRecentAnnouncements() {
    const announcementsContainer = document.getElementById('recentAnnouncements');
    if (!announcementsContainer) return;
    
    try {
        // Clear any existing content except the loading spinner
        const loadingItem = announcementsContainer.querySelector('.loading-item');
        announcementsContainer.innerHTML = '';
        if (loadingItem) {
            announcementsContainer.appendChild(loadingItem);
        }
        
        // Get announcements from Realtime Database
        const announcementsRef = ref(rtdb, 'Announcements');
        const snapshot = await get(announcementsRef);
        
        // Remove loading spinner
        const updatedLoadingItem = announcementsContainer.querySelector('.loading-item');
        if (updatedLoadingItem) {
            announcementsContainer.removeChild(updatedLoadingItem);
        }
        
        if (!snapshot.exists()) {
            // No announcements available
            const emptyState = document.createElement('div');
            emptyState.className = 'text-center p-3';
            emptyState.innerHTML = `
                <i class="fas fa-info-circle text-muted fa-2x mb-2"></i>
                <p class="text-muted">No announcements available</p>
            `;
            announcementsContainer.appendChild(emptyState);
            return;
        }
        
        // Convert to array and sort by date (newest first)
        const announcements = [];
        snapshot.forEach(childSnapshot => {
            const announcement = childSnapshot.val();
            announcement.id = childSnapshot.key;
            announcements.push(announcement);
        });
        
        // Sort by date
        announcements.sort((a, b) => {
            // Parse dates (DD/MM/YYYY)
            const aDateParts = a.Date.split('/');
            const bDateParts = b.Date.split('/');
            
            const aDate = new Date(
                aDateParts[2], 
                aDateParts[1] - 1, 
                aDateParts[0]
            );
            
            const bDate = new Date(
                bDateParts[2], 
                bDateParts[1] - 1, 
                bDateParts[0]
            );
            
            return bDate - aDate;
        });
        
        // Display the three most recent announcements
        const recentAnnouncements = announcements.slice(0, 3);
        
        recentAnnouncements.forEach(announcement => {
            const announcementDate = new Date(
                announcement.Date.split('/')[2],
                announcement.Date.split('/')[1] - 1,
                announcement.Date.split('/')[0]
            );
            
            const formattedDate = formatDate(announcementDate);
            
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                <div class="activity-icon announcements">
                    <i class="fas fa-bullhorn"></i>
                </div>
                <div class="activity-content">
                    <h4>${announcement.Title}</h4>
                    <p>${announcement.Body.length > 50 ? announcement.Body.substring(0, 50) + '...' : announcement.Body}</p>
                    <span class="activity-time">${formattedDate}</span>
                </div>
            `;
            
            // Add click event to navigate to announcements page
            item.addEventListener('click', () => {
                window.location.href = 'announcements.html';
            });
            
            announcementsContainer.appendChild(item);
        });
        
    } catch (error) {
        console.error("Error loading announcements:", error);
        // Show error state
        announcementsContainer.innerHTML = `
            <div class="text-center p-3">
                <i class="fas fa-exclamation-circle text-danger fa-2x mb-2"></i>
                <p class="text-danger">Failed to load announcements</p>
            </div>
        `;
    }
}

// Load upcoming events
async function loadUpcomingEvents() {
    const eventsContainer = document.getElementById('upcomingEvents');
    if (!eventsContainer) return;
    
    try {
        // Clear existing content except loading spinner
        const loadingItem = eventsContainer.querySelector('.loading-item');
        eventsContainer.innerHTML = '';
        if (loadingItem) {
            eventsContainer.appendChild(loadingItem);
        }
        
        // Get current date
        const now = new Date();
        
        // Query upcoming events
        const eventsQuery = query(
            collection(db, "events"),
            where("date", ">=", now),
            orderBy("date", "asc"),
            limit(3)
        );
        
        const eventsSnapshot = await getDocs(eventsQuery);
        
        // Remove loading spinner
        const updatedLoadingItem = eventsContainer.querySelector('.loading-item');
        if (updatedLoadingItem) {
            eventsContainer.removeChild(updatedLoadingItem);
        }
        
        if (eventsSnapshot.empty) {
            // No upcoming events
            const emptyState = document.createElement('div');
            emptyState.className = 'text-center p-3';
            emptyState.innerHTML = `
                <i class="fas fa-calendar text-muted fa-2x mb-2"></i>
                <p class="text-muted">No upcoming events</p>
            `;
            eventsContainer.appendChild(emptyState);
            return;
        }
        
        // Display events
        eventsSnapshot.forEach(doc => {
            const event = doc.data();
            const eventDate = event.date.toDate();
            
            // Format date and time
            const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            const formattedDateTime = eventDate.toLocaleString('en-US', options);
            
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                <div class="activity-icon events">
                    <i class="fas fa-calendar"></i>
                </div>
                <div class="activity-content">
                    <h4>${event.title}</h4>
                    <p>${event.description.length > 50 ? event.description.substring(0, 50) + '...' : event.description}</p>
                    <span class="activity-time">${formattedDateTime}</span>
                </div>
            `;
            
            // Add click event to navigate to events page
            item.addEventListener('click', () => {
                window.location.href = 'events.html';
            });
            
            eventsContainer.appendChild(item);
        });
        
    } catch (error) {
        console.error("Error loading events:", error);
        // Show error state
        eventsContainer.innerHTML = `
            <div class="text-center p-3">
                <i class="fas fa-exclamation-circle text-danger fa-2x mb-2"></i>
                <p class="text-danger">Failed to load events</p>
            </div>
        `;
    }
}

// Initialize everything
function init() {
    showLoader();
    
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Redirect to login if not signed in
            window.location.href = '/login.html';
            return;
        }
        
        try {
            // Check if user is approved
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists() || !userDoc.data().isApproved) {
                // User is not approved, sign out and redirect
                await signOut(auth);
                window.location.href = '/login.html?error=not_approved';
                return;
            }
            
            // Update user info
            await updateUserInfo(user);
            
            // Load dashboard data
            await Promise.all([
                loadStats(),
                loadRecentAnnouncements(),
                loadUpcomingEvents()
            ]);
            
            // Hide loader when everything is loaded
            hideLoader();
        } catch (error) {
            console.error("Error initializing dashboard:", error);
            hideLoader();
        }
    });
    
    // Add event listeners for page transitions
    document.querySelectorAll('a').forEach(link => {
        if (link.href && !link.href.includes('#') && !link.id.includes('logoutBtn')) {
            link.addEventListener('click', () => {
                showLoader();
            });
        }
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
        showLoader();
    });
}

// Initialize the dashboard
window.onload = init;