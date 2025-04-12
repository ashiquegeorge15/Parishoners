// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-storage.js";

// Your web app's Firebase configuration
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
const storage = getStorage(app);

// DOM Elements
const loadingContainer = document.getElementById('loading-container');
const profileImage = document.getElementById('profile-image');
const userName = document.getElementById('userName');
const totalDues = document.getElementById('total-dues');
const paidDues = document.getElementById('paid-dues');
const unpaidDues = document.getElementById('unpaid-dues');
const paymentProgress = document.getElementById('payment-progress');
const progressPercentage = document.getElementById('progress-percentage');
const outstandingDuesTable = document.getElementById('outstanding-dues-table');
const paymentHistoryTable = document.getElementById('payment-history-table');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
const content = document.getElementById('content');
const logoutBtn = document.getElementById('logoutBtn');
const contactAdminForm = document.getElementById('contact-admin-form');

// Global variables
let currentUser = null;
let duesData = [];

// Show/hide loader functions
function showLoader() {
    loadingContainer.style.display = 'flex';
}

function hideLoader() {
    loadingContainer.style.display = 'none';
}

// Initialize sidebar toggle
if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        content.classList.toggle('expanded');
    });
}

// Handle logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = '../index.html';
        } catch (error) {
            console.error("Error signing out:", error);
        }
    });
}

// Also handle the navbar logout button
const navbarLogoutBtn = document.getElementById('navbar-logout-btn');
if (navbarLogoutBtn) {
    navbarLogoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = '../index.html';
        } catch (error) {
            console.error("Error signing out:", error);
        }
    });
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertContainer = document.querySelector('.alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

// Update user info
async function updateUserInfo(user) {
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            userName.textContent = userData.name || 'Parish Member';
            
            // Load profile image if it exists
            if (userData.profilePicture) {
                try {
                    const profileRef = ref(storage, userData.profilePicture);
                    const url = await getDownloadURL(profileRef);
                    profileImage.src = url;
                } catch (imgError) {
                    console.error("Error loading profile image:", imgError);
                }
            }
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

// Load dues data
async function loadDuesData(userId) {
    try {
        showLoader();
        
        // Instead of querying the dues collection directly (which has permission issues),
        // get the user document which should contain dues information or have access
        const userDoc = await getDoc(doc(db, "users", userId));
        
        if (!userDoc.exists()) {
            showAlert("User profile not found", "danger");
            hideLoader();
            return;
        }
        
        const userData = userDoc.data();
        
        // Check if user has duesHistory in their document
        let duesEntries = [];
        if (userData.duesHistory && Array.isArray(userData.duesHistory)) {
            duesEntries = userData.duesHistory.map(due => ({
                id: due.id || generateId(),
                userId: userId,
                description: due.description || 'Unnamed Due',
                amount: parseFloat(due.amount) || 0,
                dueDate: due.dueDate ? (due.dueDate.toDate ? due.dueDate.toDate() : new Date(due.dueDate)) : new Date(),
                status: due.status || 'unpaid',
                paymentDate: due.paymentDate ? (due.paymentDate.toDate ? due.paymentDate.toDate() : new Date(due.paymentDate)) : null
            }));
        } else {
            // Try to get data from dues collection as a fallback
            try {
                const duesQuery = query(collection(db, "dues"), where("userId", "==", userId));
                const duesSnapshot = await getDocs(duesQuery);
                
                duesSnapshot.forEach((doc) => {
                    const due = {
                        id: doc.id,
                        ...doc.data(),
                        dueDate: doc.data().dueDate?.toDate() || new Date(),
                        paymentDate: doc.data().paymentDate?.toDate() || null
                    };
                    duesEntries.push(due);
                });
            } catch (error) {
                console.log("Could not access dues collection, using empty data:", error);
                // Continue with empty dues - we already tried our best
            }
        }
        
        duesData = duesEntries;
        
        // Process dues data
        let totalAmount = 0;
        let paidAmount = 0;
        let unpaidAmount = 0;
        
        const outstandingDues = [];
        const paidDuesList = [];
        
        // Calculate totals
        duesData.forEach(due => {
            const amount = parseFloat(due.amount) || 0;
            totalAmount += amount;
            
            if (due.status === 'paid') {
                paidAmount += amount;
                paidDuesList.push(due);
            } else {
                unpaidAmount += amount;
                outstandingDues.push(due);
            }
        });
        
        // Update stats
        totalDues.textContent = formatCurrency(totalAmount);
        paidDues.textContent = formatCurrency(paidAmount);
        unpaidDues.textContent = formatCurrency(unpaidAmount);
        
        // Update progress bar
        const progressValue = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
        paymentProgress.style.width = `${progressValue}%`;
        paymentProgress.setAttribute('aria-valuenow', progressValue);
        progressPercentage.textContent = `${progressValue}%`;
        
        // Display tables
        displayOutstandingDues(outstandingDues);
        displayPaymentHistory(paidDuesList);
        
        hideLoader();
    } catch (error) {
        console.error("Error loading dues data:", error);
        showAlert("Failed to load dues data. Please try again later.", "danger");
        hideLoader();
    }
}

// Display outstanding dues
function displayOutstandingDues(dues) {
    if (!outstandingDuesTable) return;
    
    if (dues.length === 0) {
        outstandingDuesTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No outstanding dues found</td>
            </tr>
        `;
        return;
    }
    
    outstandingDuesTable.innerHTML = dues.map(due => `
        <tr>
            <td>${due.description || 'Unnamed Due'}</td>
            <td>${formatDate(due.dueDate)}</td>
            <td>${formatCurrency(due.amount)}</td>
            <td><span class="badge bg-${getStatusColor(due.status)}">${due.status.toUpperCase()}</span></td>
            <td>
                <button class="btn btn-sm btn-primary contact-admin-btn" 
                  data-bs-toggle="modal" 
                  data-bs-target="#contactAdminModal" 
                  data-due-id="${due.id}">
                    Contact Admin
                </button>
            </td>
        </tr>
    `).join('');
    
    // Add event listeners to contact admin buttons
    document.querySelectorAll('.contact-admin-btn').forEach(button => {
        button.addEventListener('click', function() {
            const dueId = this.getAttribute('data-due-id');
            document.getElementById('due-id').value = dueId;
        });
    });
}

// Display payment history
function displayPaymentHistory(dues) {
    if (!paymentHistoryTable) return;
    
    if (dues.length === 0) {
        paymentHistoryTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No payment history found</td>
            </tr>
        `;
        return;
    }
    
    paymentHistoryTable.innerHTML = dues.map(due => `
        <tr>
            <td>${due.description || 'Unnamed Due'}</td>
            <td>${formatDate(due.dueDate)}</td>
            <td>${formatCurrency(due.amount)}</td>
            <td>${formatDate(due.paymentDate)}</td>
            <td><span class="badge bg-success">PAID</span></td>
        </tr>
    `).join('');
}

// Contact admin form submission
if (contactAdminForm) {
    contactAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();
        
        const dueId = document.getElementById('due-id').value;
        const subject = document.getElementById('message-subject').value;
        const message = document.getElementById('message-text').value;
        
        try {
            // Add message to Firestore
            await addDoc(collection(db, "messages"), {
                userId: auth.currentUser.uid,
                subject: subject,
                message: message,
                dueId: dueId || null,
                timestamp: serverTimestamp(),
                read: false
            });
            
            // Reset form and close modal
            contactAdminForm.reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById('contactAdminModal'));
            if (modal) {
                modal.hide();
            } else {
                // If bootstrap modal instance not found, try jQuery
                try {
                    $('#contactAdminModal').modal('hide');
                } catch (error) {
                    console.error('Error closing modal:', error);
                }
            }
            
            showAlert('Message sent successfully!', 'success');
        } catch (error) {
            console.error('Error sending message:', error);
            showAlert('Error sending message. Please try again later.', 'danger');
        } finally {
            hideLoader();
        }
    });
}

// Helper functions
function formatCurrency(amount) {
    return '₦' + parseFloat(amount).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(date) {
    if (!date) return 'N/A';
    
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    
    return date.toLocaleDateString('en-US', options);
}

function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'paid':
            return 'success';
        case 'pending':
            return 'warning';
        case 'overdue':
            return 'danger';
        default:
            return 'secondary';
    }
}

// Check authentication state
onAuthStateChanged(auth, async (user) => {
    showLoader();
    
    if (user) {
        currentUser = user;
        await updateUserInfo(user);
        await loadDuesData(user.uid);
    } else {
        window.location.href = '../index.html';
    }
});

// Initialize for mobile devices
function initializeMobile() {
    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
        content.classList.add('expanded');
    }
}

// Run initialization
document.addEventListener('DOMContentLoaded', () => {
    initializeMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
            content.classList.add('expanded');
        }
    });
});

// Helper function to generate an ID
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
} 