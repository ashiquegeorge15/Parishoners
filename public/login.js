// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
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
const analytics = getAnalytics(app);
const auth = getAuth();
const fs = getFirestore(app);

//----- Login code start	  
document.getElementById("submitBtn").addEventListener("click", async function(event) {
  event.preventDefault();
  
  // Show loading indicator
  showLoading(true);
  
  try {
    // Get email and password
    var email = document.getElementById("email").value;
    var password = document.getElementById("pass").value;
    
    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // OPTIMIZED: Check if admin by directly checking the document
    const adminDoc = await getDoc(doc(fs, "Admin", user.uid));
    if (adminDoc.exists()) {
      console.log("Admin login successful");
      
      // Update admin last login
      await updateDoc(doc(fs, "Admin", user.uid), {
        lastLogin: serverTimestamp()
      });
      
      // Redirect admin to admin dashboard
      window.location.href = "/admin/index.html";
      return;
    }
    
    // READ FROM USERS COLLECTION to check approval status
    const userDoc = await getDoc(doc(fs, "users", user.uid));
    
    if (!userDoc.exists()) {
      // This shouldn't happen normally, but handle just in case
      console.error("User authenticated but not found in users collection");
      alert("User account incomplete. Please contact administrator.");
      await auth.signOut();
      showLoading(false);
      return;
    }
    
    const userData = userDoc.data();
    
    // Update last login timestamp in users collection
    await updateDoc(doc(fs, "users", user.uid), {
      lastLogin: serverTimestamp(),
      emailVerified: user.emailVerified || false
    });
    
    // Check if user is approved
    if (!userData.isApproved) {
      // Create/update access request
      await setDoc(doc(fs, "accessRequests", user.uid), {
        email: user.email,
        displayName: userData.name || email.split('@')[0],
        requestedAt: serverTimestamp(),
        status: 'pending',
        lastLogin: serverTimestamp()
      }, { merge: true });
      
      // Sign out user
      await auth.signOut();
      
      // Hide loading indicator
      showLoading(false);
      
      // Show pending approval message
      showPendingApprovalModal();
      
      return;
    }
    
    // User is approved, redirect to dashboard
    console.log("User login successful - approved user");
    window.location.href = "/auth/index.html";
    
  } catch (error) {
    console.error("Login error:", error);
    showLoading(false);
    
    if (error.code === "auth/user-not-found") {
      alert("Email not found!");
      window.location.href = "signup.html";
    } else if (error.code === "auth/wrong-password") {
      alert("Incorrect password. Please try again.");
    } else {
      alert("Login error: " + error.message);
    }
  }
});

// Show/hide loading indicator
function showLoading(show) {
  const submitBtn = document.getElementById("submitBtn");
  
  if (show) {
    submitBtn.innerHTML = "Logging in...";
    submitBtn.disabled = true;
  } else {
    submitBtn.innerHTML = "Login";
    submitBtn.disabled = false;
  }
}

// Function to show the pending approval modal
function showPendingApprovalModal() {
  // Create modal HTML
  const modalHTML = `
    <div class="modal fade" id="pendingApprovalModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Approval Required</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center">
            <div class="mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" class="bi bi-hourglass-split text-warning mb-3" viewBox="0 0 16 16">
                <path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1h-11zm2-13v1c0 .537.12 1.045.337 1.5h6.326c.216-.455.337-.963.337-1.5V2h-7zm3 6.35c0 .701-.478 1.236-1.011 1.492A3.5 3.5 0 0 0 4.5 13s.866-1.299 3-1.48V8.35zm1 0v3.17c2.134.181 3 1.48 3 1.48a3.5 3.5 0 0 0-1.989-3.158C8.978 9.586 8.5 9.052 8.5 8.351z"/>
              </svg>
              <h4>Waiting for Admin Approval</h4>
              <p class="text-muted">Your account is pending administrator approval.</p>
              <p class="text-muted">You'll receive access once an administrator approves your request.</p>
            </div>
          </div>
          <div class="modal-footer justify-content-center">
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">I Understand</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Initialize and show the modal
  const modal = new bootstrap.Modal(document.getElementById('pendingApprovalModal'));
  modal.show();
  
  // Remove modal after it's hidden
  document.getElementById('pendingApprovalModal').addEventListener('hidden.bs.modal', function() {
    this.remove();
  });
}
  //----- End


  