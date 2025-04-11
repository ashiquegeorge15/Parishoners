import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    onSnapshot,
    doc,
    getDoc,
    updateDoc,
    setDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";

// Your Firebase config
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
const auth = getAuth(app);
const db = getFirestore(app);

// Function to load user profile picture
async function loadProfilePicture(userId) {
    try {
        // Get user profile data from Firestore
        const userDoc = await getDoc(doc(db, "users", userId));
        
        // If user has a profile picture, update the image
        if (userDoc.exists() && userDoc.data().profilePic && userDoc.data().profilePic.url) {
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

// Function to check and update notifications for access requests
async function setupNotifications() {
    try {
        // Listen for pending access requests
        const q = query(
            collection(db, 'accessRequests'),
            where('status', '==', 'pending')
        );
        
        onSnapshot(q, (snapshot) => {
            const count = snapshot.docs.length;
            
            // Update notification badge
            const badge = document.querySelector('.notifications .badge');
            if (badge) {
                badge.textContent = count;
                
                // Show/hide badge based on count
                if (count > 0) {
                    badge.style.display = 'block';
                } else {
                    badge.style.display = 'none';
                }
            }
            
            // Update notification dropdown
            updateNotificationDropdown(snapshot.docs);
        });
    } catch (error) {
        console.error("Error setting up notifications:", error);
    }
}

// Function to update notification dropdown content
function updateNotificationDropdown(requests) {
    const notificationContainer = document.querySelector('.notification-dropdown');
    
    if (!notificationContainer) return;
    
    // Clear existing notifications
    const notificationList = notificationContainer.querySelector('.notification-list');
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
    
    // Add notification items - limit to 5 most recent
    requests.slice(0, 5).forEach(doc => {
        const request = doc.data();
        const requestType = request.userDetails ? 'New signup' : 'Login request';
        const time = request.requestedAt ? formatTimestamp(request.requestedAt) : 'Just now';
        
        const notificationItem = document.createElement('li');
        notificationItem.innerHTML = `
            <a href="#request-${doc.id}" class="notification-item" data-id="${doc.id}">
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
        
        // Add click event to scroll to the request
        notificationItem.querySelector('.notification-item').addEventListener('click', (e) => {
            e.preventDefault();
            const requestRow = document.getElementById(`request-${doc.id}`);
            if (requestRow) {
                requestRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                requestRow.classList.add('highlight-row');
                setTimeout(() => {
                    requestRow.classList.remove('highlight-row');
                }, 2000);
            }
        });
    });
    
    // Add view all link if there are more than 5 notifications
    if (requests.length > 5) {
        const viewAllItem = document.createElement('li');
        viewAllItem.className = 'view-all';
        viewAllItem.innerHTML = `
            <a href="#">View all ${requests.length} requests</a>
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

// Check if user is admin
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '/login.html';
        return;
    }
    
    try {
        // Check if user is admin
        const adminDoc = await getDoc(doc(db, 'Admin', user.uid));
        if (!adminDoc.exists()) {
            window.location.href = '/auth/index.html';
            return;
        }

        // Load user profile picture
        await loadProfilePicture(user.uid);
        
        // Setup notifications
        setupNotifications();

        // Start listening to access requests
        initializeRequestsListener();
        
        // Set a badge in the title to show how many pending requests
        document.title = "Access Requests - Admin Dashboard";
        
    } catch (error) {
        console.error("Error checking admin status:", error);
        alert("Error checking admin status. Please try again.");
    }
});

function initializeRequestsListener() {
    // Listen for all pending access requests
    const requestsQuery = query(
        collection(db, 'accessRequests'),
        where('status', '==', 'pending')
    );

    onSnapshot(requestsQuery, (snapshot) => {
        const requestsBody = document.getElementById('requestsBody');
        const emptyState = document.getElementById('emptyState');
        
        // Clear existing rows
        requestsBody.innerHTML = '';
        
        if (snapshot.empty) {
            // Show empty state
            requestsBody.classList.add('d-none');
            emptyState.classList.remove('d-none');
            document.getElementById('pendingCount').textContent = '0';
            return;
        }
        
        // Hide empty state, show table
        requestsBody.classList.remove('d-none');
        emptyState.classList.add('d-none');
        
        // Sort by requestedAt (newest first)
        const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => {
            if (!a.requestedAt || !b.requestedAt) return 0;
            return b.requestedAt.toDate() - a.requestedAt.toDate();
        });
        
        // Add rows for each request
        requests.forEach(request => {
            addRequestToTable(request);
        });
        
        // Update counter in title
        document.getElementById('pendingCount').textContent = requests.length;
        document.title = `(${requests.length}) Access Requests - Admin Dashboard`;
    });
}

function addRequestToTable(request) {
    const tbody = document.getElementById('requestsBody');
    const row = document.createElement('tr');
    row.id = `request-${request.id}`;
    row.className = 'new-request';

    // Determine request type (signup or login)
    const requestType = request.userDetails ? 'New Signup' : 'Login Request';
    const typeClass = request.userDetails ? 'bg-info' : 'bg-warning';

    row.innerHTML = `
        <td>${request.email || 'N/A'}</td>
        <td>${request.displayName || 'N/A'}</td>
        <td>${formatDate(request.requestedAt)}</td>
        <td>
            <span class="badge ${typeClass}">${requestType}</span>
        </td>
        <td>
            <div class="action-buttons">
                <button class="btn btn-success btn-sm approve-btn" data-id="${request.id}">
                    <i class="bi bi-check-circle"></i> Approve
                </button>
                <button class="btn btn-danger btn-sm reject-btn" data-id="${request.id}">
                    <i class="bi bi-x-circle"></i> Reject
                </button>
            </div>
        </td>
    `;

    tbody.appendChild(row);
    attachActionListeners(request.id);
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(date);
}

function attachActionListeners(requestId) {
    const row = document.getElementById(`request-${requestId}`);
    
    const approveBtn = row.querySelector('.approve-btn');
    if (approveBtn) {
        approveBtn.addEventListener('click', () => {
            handleRequestAction(requestId, 'approved');
        });
    }
    
    const rejectBtn = row.querySelector('.reject-btn');
    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => {
            handleRequestAction(requestId, 'rejected');
        });
    }
}

async function handleRequestAction(requestId, action) {
    try {
        // Disable buttons to prevent double-clicks
        const row = document.getElementById(`request-${requestId}`);
        const buttons = row.querySelectorAll('button');
        buttons.forEach(button => button.disabled = true);
        
        // Show processing state
        row.classList.add('processing');
        
        // Update access request status
        await updateDoc(doc(db, 'accessRequests', requestId), {
            status: action,
            processedAt: serverTimestamp(),
            processedBy: auth.currentUser.uid
        });

        // Update user document with approval status
        await updateDoc(doc(db, 'users', requestId), {
            isApproved: action === 'approved',
            status: action === 'approved' ? 'active' : 'rejected',
            approvedAt: action === 'approved' ? serverTimestamp() : null,
            approvedBy: action === 'approved' ? auth.currentUser.uid : null,
            lastUpdated: serverTimestamp()
        });
            
        // Show notification
        showNotification(
            action === 'approved' 
                ? 'User approved successfully' 
                : 'User access rejected',
            action === 'approved' ? 'success' : 'danger'
        );
        
        // Remove row with animation
        setTimeout(() => {
            row.style.opacity = '0';
            row.style.height = '0';
            row.style.padding = '0';
            row.style.margin = '0';
            
            setTimeout(() => {
                row.remove();
                
                // Check if table is now empty
                const requestsBody = document.getElementById('requestsBody');
                if (requestsBody.children.length === 0) {
                    requestsBody.classList.add('d-none');
                    document.getElementById('emptyState').classList.remove('d-none');
                    document.getElementById('pendingCount').textContent = '0';
                    document.title = "Access Requests - Admin Dashboard";
                }
            }, 500);
        }, 1000);

    } catch (error) {
        console.error('Error handling request:', error);
        alert('Error processing request: ' + error.message);
        
        // Re-enable buttons on error
        const row = document.getElementById(`request-${requestId}`);
        if (row) {
            const buttons = row.querySelectorAll('button');
            buttons.forEach(button => button.disabled = false);
            row.classList.remove('processing');
        }
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification`;
    notification.innerHTML = `
        <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
        <button type="button" class="btn-close" aria-label="Close"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Close button handler
    notification.querySelector('.btn-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
} 