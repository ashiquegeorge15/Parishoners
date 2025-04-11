// Wait for Firebase scripts to load
document.addEventListener('DOMContentLoaded', function() {
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

    // Initialize Firebase if not already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.firestore();
    const rtdb = firebase.database();
    const auth = firebase.auth();

    console.log("Firebase initialized");

    // Function to update stats cards with real counts
    async function updateStatsCards() {
        try {
            // Show loading state
            document.querySelectorAll('.stat-number').forEach(el => {
                el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            });

            // Get counts from Firestore collections
            const [usersSnapshot, eventsSnapshot] = await Promise.all([
                db.collection('users').get(),
                db.collection('events').get()
            ]);

            // Get announcements count from Realtime Database
            const announcementsSnapshot = await rtdb.ref().child('Announcements').get();
            const announcementsCount = announcementsSnapshot.exists() ? Object.keys(announcementsSnapshot.val() || {}).length : 0;

            // Calculate total gallery images
            let totalImages = 0;
            eventsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.images && Array.isArray(data.images)) {
                    totalImages += data.images.length;
                }
            });

            // Debug logs
            console.log({
                usersCount: usersSnapshot.size,
                announcementsCount,
                eventsCount: eventsSnapshot.size,
                totalImages
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

            // Update all stats
            updateWithAnimation('.stat-card:nth-child(1) .stat-number', usersSnapshot.size);
            updateWithAnimation('.stat-card:nth-child(2) .stat-number', announcementsCount);
            updateWithAnimation('.stat-card:nth-child(3) .stat-number', eventsSnapshot.size);
            updateWithAnimation('.stat-card:nth-child(4) .stat-number', totalImages);

            // Hide percentage changes
            document.querySelectorAll('.stat-change').forEach(el => el.style.display = 'none');

        } catch (error) {
            console.error("Error updating stats:", error);
            
            // Show error state in cards
            document.querySelectorAll('.stat-number').forEach(el => {
                el.textContent = 'Error';
                el.style.color = 'red';
            });
        }
    }
    
    // Function to load and display user profile picture
    async function loadUserProfilePicture(userId) {
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
                console.log("No profile picture found or user doc doesn't exist");
            }
        } catch (error) {
            console.error("Error loading profile picture:", error);
        }
    }

    // Function to check and update notifications for access requests
    async function setupNotifications() {
        try {
            // Listen for pending access requests
            db.collection('accessRequests')
              .where('status', '==', 'pending')
              .onSnapshot((snapshot) => {
                  const count = snapshot.docs.length;
                  console.log(`Found ${count} pending access requests`);
                  
                  // Update notification badge
                  const badge = document.querySelector('.notifications .badge');
                  if (badge) {
                      badge.textContent = count;
                      
                      // Show/hide badge based on count
                      if (count > 0) {
                          badge.style.display = 'block';
                          // Flash animation for new notifications
                          badge.classList.add('flash');
                          setTimeout(() => {
                              badge.classList.remove('flash');
                          }, 2000);
                      } else {
                          badge.style.display = 'none';
                      }
                  }
                  
                  // Setup notification dropdown
                  updateNotificationDropdown(snapshot.docs);
              }, (error) => {
                  console.error("Error listening for access requests:", error);
              });
        } catch (error) {
            console.error("Error setting up notifications:", error);
        }
    }
    
    // Function to update notification dropdown content
    function updateNotificationDropdown(requests) {
        const notificationDropdown = document.querySelector('.notification-dropdown');
        
        if (!notificationDropdown) {
            console.error("Notification dropdown element not found");
            return;
        }
        
        // Clear existing notifications
        const notificationList = notificationDropdown.querySelector('.notification-list');
        if (!notificationList) {
            console.error("Notification list element not found");
            return;
        }
        
        notificationList.innerHTML = '';
        
        if (requests.length === 0) {
            // Show empty state
            notificationList.innerHTML = `
                <li class="empty-notification">
                    <p>No new requests</p>
                </li>
            `;
            return;
        }
        
        console.log(`Adding ${Math.min(requests.length, 5)} notifications to dropdown`);
        
        // Add notification items
        requests.slice(0, 5).forEach(doc => {
            const request = doc.data();
            const requestType = request.userDetails ? 'New signup' : 'Login request';
            const time = request.requestedAt ? formatTimestamp(request.requestedAt) : 'Just now';
            
            const notificationItem = document.createElement('li');
            notificationItem.innerHTML = `
                <a href="access.html" class="notification-item">
                    <div class="notification-icon ${request.userDetails ? 'bg-info' : 'bg-warning'}">
                        <i class="fas fa-user-plus"></i>
                    </div>
                    <div class="notification-content">
                        <p class="notification-text">
                            <strong>${requestType}:</strong> ${request.email || 'Unknown user'}
                        </p>
                        <p class="notification-time">${time}</p>
                    </div>
                </a>
            `;
            
            notificationList.appendChild(notificationItem);
        });
        
        // Add view all link if there are more than 5 notifications
        if (requests.length > 5) {
            const viewAllItem = document.createElement('li');
            viewAllItem.className = 'view-all';
            viewAllItem.innerHTML = `
                <a href="access.html">View all ${requests.length} requests</a>
            `;
            notificationList.appendChild(viewAllItem);
        }
    }
    
    // Format timestamp for notifications
    function formatTimestamp(timestamp) {
        if (!timestamp) return 'Just now';
        
        const date = timestamp.toDate();
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
        
        return date.toLocaleDateString();
    }

    // Setup logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const confirmLogout = confirm("Are you sure you want to logout?");
            if (confirmLogout) {
                auth.signOut().then(() => {
                    window.location.href = '../login.html';
                }).catch((error) => {
                    console.error("Error during logout:", error);
                    alert("Logout failed. Please try again.");
                });
            }
        });
    }
    
    // Setup notification click handler
    const notificationBell = document.querySelector('.notifications');
    if (notificationBell) {
        notificationBell.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationBell.classList.toggle('active');
            console.log("Notification bell clicked, active:", notificationBell.classList.contains('active'));
        });
        
        // Close notification dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!notificationBell.contains(e.target)) {
                notificationBell.classList.remove('active');
            }
        });
    }

    // Auth state listener
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                // Check if user is admin
                const adminDoc = await db.collection('Admin').doc(user.uid).get();
                if (adminDoc.exists) {
                    console.log('Admin authenticated, updating stats...');
                    // Load user profile picture
                    await loadUserProfilePicture(user.uid);
                    await updateStatsCards();
                    // Setup notifications for access requests
                    setupNotifications();
                    // Update stats every 5 minutes
                    setInterval(updateStatsCards, 300000);
                } else {
                    console.log('Non-admin user, redirecting...');
                    window.location.href = '../index.html';
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
                window.location.href = '../index.html';
            }
        } else {
            console.log('No user logged in, redirecting...');
            window.location.href = '../login.html';
        }
    });
});