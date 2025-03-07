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