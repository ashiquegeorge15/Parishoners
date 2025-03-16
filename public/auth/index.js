import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
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

console.log("script loaded");

// Update user name in sidebar
async function updateUserInfo(user) {
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            document.getElementById('userName').textContent = userData.name || 'Parish Member';
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

// Handle logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = '/login.html';
    } catch (error) {
        console.error("Error signing out:", error);
    }
});

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
        link.addEventListener('click', (e) => {
            // Only show loader for internal links
            if (link.href && link.href.startsWith(window.location.origin)) {
                showLoader();
            }
        });
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
            await auth.signOut();
            window.location.href = '/login.html?error=not_approved';
            return;
        }

        hideLoader(); // Hide loader after all checks
    } catch (error) {
        console.error("Error checking user status:", error);
        await auth.signOut();
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
    const loader = document.getElementById('page-loader');
    if (loader) {
        loader.classList.add('active');
    }
});