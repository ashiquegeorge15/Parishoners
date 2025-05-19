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
const navProfileImage = document.getElementById('nav-profile-image');
const userName = document.getElementById('userName');
const navUserName = document.getElementById('navUserName');
const dropdownUserName = document.getElementById('dropdownUserName');
const totalDues = document.getElementById('total-dues');
const paidDues = document.getElementById('paid-dues');
const unpaidDues = document.getElementById('unpaid-dues');
const paymentProgress = document.getElementById('payment-progress');
const progressPercentage = document.getElementById('progress-percentage');
const outstandingDuesTable = document.getElementById('outstanding-dues-table');
const paymentHistoryTable = document.getElementById('payment-history-table');
const sidebarToggle = document.getElementById('sidebar-toggle');
const mobileSidebarClose = document.getElementById('mobile-close');
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

// Handle responsive behavior for mobile
function initializeMobile() {
    // Create mobile toggle button if it doesn't exist
    if (!sidebarToggle && window.innerWidth < 992) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'sidebar-toggle';
        toggleBtn.className = 'btn position-fixed';
        toggleBtn.style.top = '15px';
        toggleBtn.style.left = '15px';
        toggleBtn.style.zIndex = '999';
        toggleBtn.style.backgroundColor = 'var(--primary-color)';
        toggleBtn.style.color = 'white';
        toggleBtn.style.borderRadius = '50%';
        toggleBtn.style.width = '45px';
        toggleBtn.style.height = '45px';
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
        
        document.body.appendChild(toggleBtn);
        
        toggleBtn.addEventListener('click', toggleSidebar);
    }
    
    // Set initial state based on screen width
    if (window.innerWidth < 992) {
        sidebar.classList.add('collapsed');
    } else {
        sidebar.classList.remove('collapsed');
    }
    
    // Listen for window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth < 992) {
            sidebar.classList.add('collapsed');
        }
    });
}

// Toggle sidebar function
function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    
    // For mobile, add overlay
    if (window.innerWidth < 992) {
        if (!sidebar.classList.contains('collapsed')) {
            // Add overlay
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            
            // Animate overlay
            setTimeout(() => {
                overlay.classList.add('active');
            }, 10);
            
            // Add click event to close sidebar when overlay is clicked
            overlay.addEventListener('click', () => {
                sidebar.classList.add('collapsed');
                overlay.classList.remove('active');
                setTimeout(() => {
                    overlay.remove();
                }, 300);
            });
        } else {
            // Remove overlay
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                overlay.classList.remove('active');
                setTimeout(() => {
                    overlay.remove();
                }, 300);
            }
        }
    }
}

// Handle logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            showLoader();
            await signOut(auth);
            window.location.href = '../index.html';
        } catch (error) {
            hideLoader();
            console.error("Error signing out:", error);
            showAlert("Failed to sign out. Please try again.", "danger");
        }
    });
}

// Show alert message with enhanced styling
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    
    // Add icon based on alert type
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i class="fas fa-check-circle me-2"></i>';
            break;
        case 'danger':
            icon = '<i class="fas fa-exclamation-circle me-2"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle me-2"></i>';
            break;
        default:
            icon = '<i class="fas fa-info-circle me-2"></i>';
    }
    
    alert.innerHTML = `
        ${icon}${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Add slide-in animation
    setTimeout(() => {
        alert.classList.add('show');
    }, 10);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

// Update user info with enhanced UI elements
async function updateUserInfo(user) {
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const displayName = userData.name || 'Parish Member';
            
            // Update all name instances
            if (userName) userName.textContent = displayName;
            if (navUserName) navUserName.textContent = displayName;
            if (dropdownUserName) dropdownUserName.textContent = displayName;
            
            // Load profile image if it exists and update all instances
            if (userData.profilePicture) {
                try {
                    const profileRef = ref(storage, userData.profilePicture);
                    const url = await getDownloadURL(profileRef);
                    
                    // Update all profile images
                    if (profileImage) profileImage.src = url;
                    if (navProfileImage) navProfileImage.src = url;
                    
                    // Update dropdown user image if it exists
                    const dropdownUserImg = document.querySelector('.dropdown-user-img');
                    if (dropdownUserImg) dropdownUserImg.src = url;
                    
                } catch (imgError) {
                    console.error("Error loading profile image:", imgError);
                }
            }
            
            // Set user status if available
            if (userData.status) {
                const statusBadge = document.querySelector('.profile-status .badge');
                if (statusBadge) {
                    statusBadge.textContent = userData.status;
                    
                    // Set appropriate badge color based on status
                    statusBadge.className = 'badge';
                    switch (userData.status.toLowerCase()) {
                        case 'active':
                            statusBadge.classList.add('bg-success');
                            break;
                        case 'pending':
                            statusBadge.classList.add('bg-warning');
                            break;
                        case 'inactive':
                            statusBadge.classList.add('bg-secondary');
                            break;
                        default:
                            statusBadge.classList.add('bg-primary');
                    }
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
        
        // Update progress
        const percentage = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
        paymentProgress.style.width = `${percentage}%`;
        paymentProgress.setAttribute('aria-valuenow', percentage);
        progressPercentage.textContent = `${percentage}%`;
        
        // Update progress bar color based on percentage
        if (percentage < 30) {
            paymentProgress.classList.remove('bg-success', 'bg-warning');
            paymentProgress.classList.add('bg-danger');
        } else if (percentage < 70) {
            paymentProgress.classList.remove('bg-success', 'bg-danger');
            paymentProgress.classList.add('bg-warning');
        } else {
            paymentProgress.classList.remove('bg-warning', 'bg-danger');
            paymentProgress.classList.add('bg-success');
        }
        
        // Display dues in tables
        displayOutstandingDues(outstandingDues);
        displayPaymentHistory(paidDuesList);
        
        hideLoader();
        
    } catch (error) {
        console.error("Error loading dues data:", error);
        showAlert("Failed to load dues data. Please try again later.", "danger");
        hideLoader();
    }
}

// Display outstanding dues with enhanced styling
function displayOutstandingDues(dues) {
    if (!outstandingDuesTable) return;
    
    if (dues.length === 0) {
        outstandingDuesTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-check-circle text-success fs-1 mb-3"></i>
                        <p class="mb-0">No outstanding dues found. You're all caught up!</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by due date (most recent first)
    dues.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
    
    let html = '';
    
    dues.forEach(due => {
        const statusClass = getStatusColor(due.status);
        const daysUntilDue = getDaysUntilDue(due.dueDate);
        const urgencyClass = daysUntilDue < 0 ? 'text-danger' : (daysUntilDue < 7 ? 'text-warning' : '');
        
        html += `
            <tr>
                <td>
                    <div class="due-description">
                        <p class="mb-0 fw-medium">${due.description}</p>
                        <small class="text-muted">ID: ${due.id.slice(0, 8)}</small>
                    </div>
                </td>
                <td>
                    <div class="due-date ${urgencyClass}">
                        <p class="mb-0">${formatDate(due.dueDate)}</p>
                        <small>${getDueMessage(daysUntilDue)}</small>
                    </div>
                </td>
                <td class="fw-bold">${formatCurrency(due.amount)}</td>
                <td><span class="badge ${statusClass}">${due.status.toUpperCase()}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary pay-now-btn" data-due-id="${due.id}">
                            <i class="fas fa-wallet me-1"></i> Pay Now
                        </button>
                        <button class="btn btn-sm btn-outline-secondary ms-1 contact-admin-btn" data-due-id="${due.id}">
                            <i class="fas fa-comment-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    outstandingDuesTable.innerHTML = html;
    
    // Initialize Pay Now buttons
    document.querySelectorAll('.pay-now-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const dueId = btn.getAttribute('data-due-id');
            // TODO: Implement payment process
            showAlert('Payment gateway integration coming soon!', 'info');
        });
    });
    
    // Initialize Contact Admin buttons
    document.querySelectorAll('.contact-admin-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const dueId = btn.getAttribute('data-due-id');
            document.getElementById('due-id').value = dueId;
            
            // Open modal using Bootstrap 5
            const modal = new bootstrap.Modal(document.getElementById('contactAdminModal'));
            modal.show();
        });
    });
}

// Get appropriate message based on days until due
function getDueMessage(days) {
    if (days < 0) {
        return `<span class="text-danger">Overdue by ${Math.abs(days)} days</span>`;
    } else if (days === 0) {
        return '<span class="text-warning">Due today</span>';
    } else if (days === 1) {
        return '<span class="text-warning">Due tomorrow</span>';
    } else if (days < 7) {
        return `<span class="text-warning">Due in ${days} days</span>`;
    } else {
        return `Due in ${days} days`;
    }
}

// Calculate days until due
function getDaysUntilDue(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}

// Display payment history with enhanced styling
function displayPaymentHistory(dues) {
    if (!paymentHistoryTable) return;
    
    if (dues.length === 0) {
        paymentHistoryTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-history text-muted fs-1 mb-3"></i>
                        <p class="mb-0">No payment history found yet.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by payment date (most recent first)
    dues.sort((a, b) => new Date(b.paymentDate || b.dueDate) - new Date(a.paymentDate || a.dueDate));
    
    let html = '';
    
    dues.forEach(due => {
        const statusClass = getStatusColor(due.status);
        
        html += `
            <tr>
                <td>
                    <div class="due-description">
                        <p class="mb-0 fw-medium">${due.description}</p>
                        <small class="text-muted">ID: ${due.id.slice(0, 8)}</small>
                    </div>
                </td>
                <td>${formatDate(due.dueDate)}</td>
                <td class="fw-bold">${formatCurrency(due.amount)}</td>
                <td>
                    <div class="payment-date">
                        <p class="mb-0">${due.paymentDate ? formatDate(due.paymentDate) : '-'}</p>
                        ${due.paymentDate ? `<small class="text-muted">${formatTime(due.paymentDate)}</small>` : ''}
                    </div>
                </td>
                <td><span class="badge ${statusClass}">${due.status.toUpperCase()}</span></td>
            </tr>
        `;
    });
    
    paymentHistoryTable.innerHTML = html;
}

// Format time (HH:MM AM/PM)
function formatTime(date) {
    const d = new Date(date);
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    
    return `${hours}:${minutes} ${ampm}`;
}

// Format currency with Naira symbol
function formatCurrency(amount) {
    return '₦' + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Format date as DD MMM YYYY
function formatDate(date) {
    if (!date) return 'N/A';
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-GB', options);
}

// Get CSS class for status badge
function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'paid':
            return 'bg-success';
        case 'pending':
            return 'bg-warning';
        case 'overdue':
            return 'bg-danger';
        case 'cancelled':
            return 'bg-secondary';
        default:
            return 'bg-primary';
    }
}

// Initialize contact admin form
if (contactAdminForm) {
    contactAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const subject = document.getElementById('message-subject').value;
        const message = document.getElementById('message-text').value;
        const dueId = document.getElementById('due-id').value;
        
        if (!subject || !message) {
            showAlert('Please fill in all fields', 'warning');
            return;
        }
        
        try {
            await addDoc(collection(db, "messages"), {
                subject,
                message,
                dueId,
                userId: currentUser.uid,
                timestamp: serverTimestamp(),
                status: 'unread'
            });
            
            // Close modal using Bootstrap 5
            const modal = bootstrap.Modal.getInstance(document.getElementById('contactAdminModal'));
            modal.hide();
            
            // Reset form
            contactAdminForm.reset();
            
            showAlert('Message sent successfully', 'success');
        } catch (error) {
            console.error("Error sending message:", error);
            showAlert('Failed to send message. Please try again.', 'danger');
        }
    });
}

// Generate random ID for dues without IDs
function generateId() {
    return 'due_' + Math.random().toString(36).substr(2, 9);
}

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize mobile sidebar functionality
    initializeMobile();
    
    // Set up authentication listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            updateUserInfo(user);
            loadDuesData(user.uid);
        } else {
            // Redirect to login if not authenticated
            window.location.href = '../login.html';
        }
    });
}); 