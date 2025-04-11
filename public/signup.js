// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, addDoc, doc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
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

console.log("script loaded");

// Function to check if email already exists in users collection
async function checkEmailExists(email) {
    try {
        // Query users collection for the email
        const usersRef = collection(fs, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        
        // Return true if email exists, false otherwise
        return !querySnapshot.empty;
    } catch (error) {
        console.error("Error checking email existence:", error);
        return false; // Default to false on error
    }
}

//----- New Registration code start
async function create(event) {
    event.preventDefault();
    
    try {
        // Form validation
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const name = document.getElementById("name").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const address = document.getElementById("address").value.trim();
        const dob = document.getElementById("dob").value;
        const gender = document.querySelector('input[name="gender"]:checked')?.value || '';
        
        // Basic validation
        if (!email || !password || !name || !phone || !address || !dob || !gender) {
            alert("Please fill in all required fields");
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert("Please enter a valid email address");
            return;
        }
        
        // Password validation (at least 6 characters)
        if (password.length < 6) {
            alert("Password must be at least 6 characters long");
            return;
        }

        // Update button state to show loading
        const submitBtn = document.getElementById("submitBtn");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="loader"></div> Creating Account...';

        console.log("Starting registration process...");

        // Check if email exists
        const emailExists = await checkEmailExists(email);
        if (emailExists) {
            showAccountExistsModal(email);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-user-plus"></i>Sign Up';
            return;
        }

        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Prepare user data with new fields
        const userData = {
            email: email,
            name: name,
            phno: phone,
            address: address,
            dateOfBirth: dob,
            gender: gender,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            isApproved: false,
            status: 'pending',
            role: 'member',
            emailVerified: user.emailVerified || false,
            photoURL: user.photoURL || '',
            uid: user.uid
        };

        // Save to users collection
        await setDoc(doc(fs, "users", user.uid), userData);

        // Create access request with additional details
        await setDoc(doc(fs, "accessRequests", user.uid), {
            email: email,
            displayName: name,
            requestedAt: serverTimestamp(),
            status: 'pending',
            userDetails: {
                name: name,
                phone: phone,
                email: email,
                address: address,
                dateOfBirth: dob,
                gender: gender
            }
        });

        // Send email verification
        await sendEmailVerification(user);
        await auth.signOut();

        // Show success modal
        showPendingApprovalModal();

    } catch (error) {
        console.error("Registration error:", error);
        const submitBtn = document.getElementById("submitBtn");
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i>Sign Up';
        
        if (error.code === 'auth/email-already-in-use') {
            showAccountExistsModal(document.getElementById("email").value);
        } else if (error.code === 'auth/weak-password') {
            alert('Password is too weak. Please use a stronger password.');
        } else if (error.code === 'auth/invalid-email') {
            alert('Please enter a valid email address.');
        } else {
            alert(`Registration failed: ${error.message}`);
        }
    }
}

// Function to show the account exists modal
function showAccountExistsModal(email) {
    // Create modal container if it doesn't exist
    let modalContainer = document.querySelector('.modal-container');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.classList.add('modal-container');
        document.body.appendChild(modalContainer);
    }

    // Create modal HTML
    const modalHTML = `
    <div class="approval-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Account Already Exists</h3>
                <button class="close-button">&times;</button>
            </div>
            <div class="modal-body">
                <div class="warning-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" class="bi bi-exclamation-circle" viewBox="0 0 16 16">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                    </svg>
                </div>
                <h4>This Email Is Already Registered</h4>
                <p>An account with email <strong>${email}</strong> already exists in our system.</p>
                <p>Please try logging in instead, or use a different email address to create a new account.</p>
            </div>
            <div class="modal-footer">
                <button class="btn-primary login-btn">Go to Login</button>
                <button class="btn-secondary try-again-btn">Try Again</button>
            </div>
        </div>
    </div>
    <style>
        .modal-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .approval-modal {
            background-color: white;
            border-radius: 15px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
            animation: modalFadeIn 0.3s ease-out forwards;
            overflow: hidden;
        }
        
        @keyframes modalFadeIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
            background-color: #f8f9fa;
        }
        
        .modal-header h3 {
            margin: 0;
            color: #333;
            font-weight: 600;
        }
        
        .close-button {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            transition: color 0.2s;
        }
        
        .close-button:hover {
            color: #333;
        }
        
        .modal-body {
            padding: 25px 20px;
            text-align: center;
        }
        
        .warning-icon {
            color: #dc3545;
            margin-bottom: 20px;
        }
        
        .success-icon {
            color: #28a745;
            margin-bottom: 20px;
        }
        
        .modal-body h4 {
            margin-bottom: 15px;
            color: #333;
            font-weight: 600;
        }
        
        .modal-body p {
            color: #666;
            margin-bottom: 10px;
            line-height: 1.5;
        }
        
        .modal-footer {
            padding: 15px 20px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: center;
            gap: 10px;
            background-color: #f8f9fa;
        }
        
        .btn-primary, .btn-secondary {
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            border: none;
            transition: all 0.3s ease;
            font-family: 'Poppins', sans-serif;
        }
        
        .btn-primary {
            background-color: #4a90e2;
            color: white;
        }
        
        .btn-secondary {
            background-color: #6c757d;
            color: white;
        }
        
        .btn-primary:hover {
            background-color: #3a7bc8;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .btn-secondary:hover {
            background-color: #5a6268;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .btn-primary:active, .btn-secondary:active {
            transform: translateY(0);
        }
    </style>
    `;

    // Add modal to container
    modalContainer.innerHTML = modalHTML;

    // Add event listeners
    const closeBtn = modalContainer.querySelector('.close-button');
    const loginBtn = modalContainer.querySelector('.login-btn');
    const tryAgainBtn = modalContainer.querySelector('.try-again-btn');

    closeBtn.addEventListener('click', () => {
        modalContainer.remove();
    });

    loginBtn.addEventListener('click', () => {
        modalContainer.remove();
        window.location.href = "login.html";
    });

    tryAgainBtn.addEventListener('click', () => {
        modalContainer.remove();
        // Clear the email field
        const emailInput = document.getElementById("email");
        if (emailInput) {
            emailInput.value = "";
            emailInput.focus();
        }
    });
}

// Function to show the pending approval modal
function showPendingApprovalModal() {
    // Create modal container if it doesn't exist
    let modalContainer = document.querySelector('.modal-container');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.classList.add('modal-container');
        document.body.appendChild(modalContainer);
    }

    // Create modal HTML
    const modalHTML = `
    <div class="approval-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Account Registration Successful</h3>
                <button class="close-button">&times;</button>
            </div>
            <div class="modal-body">
                <div class="success-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" class="bi bi-check-circle" viewBox="0 0 16 16">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
                    </svg>
                </div>
                <h4>Waiting for Admin Approval</h4>
                <p>Your account has been created successfully, but requires administrator approval before you can access the dashboard.</p>
                <p>We'll notify you when your account has been approved.</p>
                <p>Please check your email for verification link.</p>
            </div>
            <div class="modal-footer">
                <button class="btn-primary login-btn">Go to Login</button>
                <button class="btn-secondary home-btn">Back to Home</button>
            </div>
        </div>
    </div>
    <style>
        .modal-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .approval-modal {
            background-color: white;
            border-radius: 15px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
            animation: modalFadeIn 0.3s ease-out forwards;
            overflow: hidden;
        }
        
        @keyframes modalFadeIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
            background-color: #f8f9fa;
        }
        
        .modal-header h3 {
            margin: 0;
            color: #333;
            font-weight: 600;
        }
        
        .close-button {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            transition: color 0.2s;
        }
        
        .close-button:hover {
            color: #333;
        }
        
        .modal-body {
            padding: 25px 20px;
            text-align: center;
        }
        
        .success-icon {
            color: #28a745;
            margin-bottom: 20px;
        }
        
        .modal-body h4 {
            margin-bottom: 15px;
            color: #333;
            font-weight: 600;
        }
        
        .modal-body p {
            color: #666;
            margin-bottom: 10px;
            line-height: 1.5;
        }
        
        .modal-footer {
            padding: 15px 20px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: center;
            gap: 10px;
            background-color: #f8f9fa;
        }
        
        .btn-primary, .btn-secondary {
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            border: none;
            transition: all 0.3s ease;
            font-family: 'Poppins', sans-serif;
        }
        
        .btn-primary {
            background-color: #4a90e2;
            color: white;
        }
        
        .btn-secondary {
            background-color: #6c757d;
            color: white;
        }
        
        .btn-primary:hover {
            background-color: #3a7bc8;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .btn-secondary:hover {
            background-color: #5a6268;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .btn-primary:active, .btn-secondary:active {
            transform: translateY(0);
        }
    </style>
    `;

    // Add modal to container
    modalContainer.innerHTML = modalHTML;

    // Add event listeners
    const closeBtn = modalContainer.querySelector('.close-button');
    const loginBtn = modalContainer.querySelector('.login-btn');
    const homeBtn = modalContainer.querySelector('.home-btn');

    closeBtn.addEventListener('click', () => {
        modalContainer.remove();
        window.location.href = "login.html";
    });

    loginBtn.addEventListener('click', () => {
        modalContainer.remove();
        window.location.href = "login.html";
    });

    homeBtn.addEventListener('click', () => {
        modalContainer.remove();
        window.location.href = "index.html";
    });
}

// Add event listener to submit button
document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", create);
    }
    
    // Set default date for DOB field (18 years ago)
    const dobInput = document.getElementById("dob");
    if (dobInput) {
        const today = new Date();
        const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
        const formattedDate = eighteenYearsAgo.toISOString().split('T')[0];
        dobInput.setAttribute('max', today.toISOString().split('T')[0]); // Can't select future dates
        dobInput.value = formattedDate;
    }
});

// Handle errors globally
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    alert('An error occurred. Please try again.');
    
    // Reset the submit button if an unhandled error occurs
    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn && submitBtn.disabled) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i>Sign Up';
    }
});