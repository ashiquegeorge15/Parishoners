// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
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
const fs = getFirestore(app);

// Show login loading spinner
function showLoading(show) {
  const loginBtn = document.getElementById("submitBtn");
  if (show) {
    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing in...';
    loginBtn.disabled = true;
  } else {
    loginBtn.innerHTML = 'Login';
    loginBtn.disabled = false;
  }
}

// Login event handler
document.getElementById("submitBtn").addEventListener("click", async function(event) {
  event.preventDefault();
  
  try {
    // Get form values
    var email = document.getElementById("email").value;
    var password = document.getElementById("pass").value;

    // Show loading state
    document.getElementById("submitBtn").disabled = true;
    document.getElementById("submitBtn").textContent = "Signing In...";

    // First authenticate with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    console.log("Authentication successful");
    
    // ONLY use Firestore to check user status
    // First, check if the user document exists in users collection
    const userDoc = await getDoc(doc(fs, "users", uid));
    
    if (!userDoc.exists()) {
      console.log("User does not exist in users collection");
      
      // Create a new user document with default values
      await setDoc(doc(fs, "users", uid), {
        email: email,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isApproved: false,
        status: 'pending',
        role: 'member'
      });
      
      // Create access request
      await setDoc(doc(fs, "accessRequests", uid), {
        email: email,
        displayName: email.split('@')[0],
        requestedAt: serverTimestamp(),
        status: 'pending'
      });
      
      // Sign out user
      await signOut(auth);
      
      // Reset button
      document.getElementById("submitBtn").disabled = false;
      document.getElementById("submitBtn").textContent = "Login";
      
      // Show message
      alert("Your account is pending admin approval. Please wait for approval.");
      return;
    }
    
    // User exists, get user data
    const userData = userDoc.data();
    
    // Check if user is admin based on Firestore data (not Auth)
    if (userData.role === 'admin') {
      console.log("User is admin according to Firestore");
      window.location.href = "/admin/index.html";
      return;
    }
    
    // Check if user is approved
    if (!userData.isApproved) {
      console.log("User is not approved");
      
      // Update access request
      await setDoc(doc(fs, "accessRequests", uid), {
        email: email,
        displayName: userData.name || email.split('@')[0],
        requestedAt: serverTimestamp(),
        status: 'pending'
      }, { merge: true });
      
      // Sign out user
      await signOut(auth);
      
      // Reset button
      document.getElementById("submitBtn").disabled = false;
      document.getElementById("submitBtn").textContent = "Login";
      
      // Show message
      alert("Your account is pending admin approval. You will be notified once approved.");
      return;
    }
    
    // User is approved, update last login
    await setDoc(doc(fs, "users", uid), {
      lastLogin: serverTimestamp()
    }, { merge: true });
    
    // Redirect to user dashboard
    console.log("User is approved, redirecting to dashboard");
    window.location.href = "/auth/index.html";
    
  } catch (error) {
    console.error("Login error:", error);
    
    // Reset button
    document.getElementById("submitBtn").disabled = false;
    document.getElementById("submitBtn").textContent = "Login";
    
    // Handle authentication errors
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

// Function to show approval pending message
function showApprovalPendingMessage() {
  // Create modal container
  const modalContainer = document.createElement('div');
  modalContainer.className = 'modal-overlay';
  
  // Modal HTML
  modalContainer.innerHTML = `
    <div class="approval-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Account Pending Approval</h3>
          <button class="close-button">&times;</button>
        </div>
        <div class="modal-body">
          <div class="waiting-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" class="bi bi-hourglass-split" viewBox="0 0 16 16">
              <path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1h-11zm2-13v1c0 .537.12 1.045.337 1.5h6.326c.216-.455.337-.963.337-1.5V2h-7zm3 6.35c0 .701-.478 1.236-1.011 1.492A3.5 3.5 0 0 0 4.5 13s.866-1.299 3-1.48V8.35zm1 0v3.17c2.134.181 3 1.48 3 1.48a3.5 3.5 0 0 0-1.989-3.158C8.978 9.586 8.5 9.052 8.5 8.351z"/>
            </svg>
          </div>
          <h4>Your Account Needs Approval</h4>
          <p>Your account is currently waiting for administrator approval.</p>
          <p>You will be notified once your account has been approved.</p>
          <p>Please check back later or contact support for assistance.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-primary close-modal-btn">I Understand</button>
        </div>
      </div>
    </div>
    <style>
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1050;
      }
      
      .approval-modal {
        background-color: white;
        border-radius: 10px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        animation: fadeIn 0.3s ease-out;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid #eee;
      }
      
      .modal-header h3 {
        margin: 0;
        color: #333;
      }
      
      .close-button {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #999;
      }
      
      .modal-body {
        padding: 20px;
        text-align: center;
      }
      
      .waiting-icon {
        color: #ffc107;
        margin-bottom: 20px;
      }
      
      .modal-body h4 {
        margin-bottom: 15px;
        color: #333;
      }
      
      .modal-body p {
        color: #666;
        margin-bottom: 10px;
      }
      
      .modal-footer {
        padding: 15px 20px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: center;
      }
      
      .btn-primary {
        padding: 8px 16px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.3s;
      }
      
      .btn-primary:hover {
        background-color: #0069d9;
      }
    </style>
  `;
  
  // Add modal to page
  document.body.appendChild(modalContainer);
  
  // Add event listeners
  const closeBtn = modalContainer.querySelector('.close-button');
  const closeModalBtn = modalContainer.querySelector('.close-modal-btn');
  
  const closeModal = () => {
    modalContainer.style.opacity = '0';
    setTimeout(() => modalContainer.remove(), 300);
  };
  
  closeBtn.addEventListener('click', closeModal);
  closeModalBtn.addEventListener('click', closeModal);
}
  //----- End


  