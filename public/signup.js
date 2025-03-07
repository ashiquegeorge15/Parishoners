// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
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

console.log("script loaded");


//----- New Registration code start
async function create(event) {
    event.preventDefault();
    
    try {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const name = document.getElementById("name")?.value || '';
        const phone = document.getElementById("phone")?.value || '';

        // Show loading state
        document.getElementById("submitBtn").disabled = true;
        document.getElementById("submitBtn").textContent = "Creating Account...";

        // Create user with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // Store ALL user data in Firestore users collection
        await setDoc(doc(fs, "users", uid), {
            email: email,
            name: name,
            phno: phone,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            isApproved: false,  // User starts as not approved
            status: 'pending',  // Status is pending until approved
            role: 'member'
        });

        // Create access request
        await setDoc(doc(fs, "accessRequests", uid), {
            email: email,
            displayName: name || email.split('@')[0],
            requestedAt: serverTimestamp(),
            status: 'pending',
            userDetails: {
                name: name,
                phone: phone,
                email: email
            }
        });

        // Sign out user until approved
        await signOut(auth);

        // Reset button
        document.getElementById("submitBtn").disabled = false;
        document.getElementById("submitBtn").textContent = "Sign Up";

        // Show success message
        alert("Registration successful! Your account is pending admin approval. You will be notified once approved.");

        // Redirect to login page
        window.location.href = "login.html";

    } catch (error) {
        console.error("Registration error:", error);
        
        // Reset button
        document.getElementById("submitBtn").disabled = false;
        document.getElementById("submitBtn").textContent = "Sign Up";
        
        if (error.code === 'auth/email-already-in-use') {
            alert("Email already exists!");
            window.location.href = "login.html";
        } else {
            alert(`Registration failed: ${error.message}`);
        }
    }
}

// Add event listener to submit button
const submitBtn = document.getElementById("submitBtn");
if (submitBtn) {
    submitBtn.addEventListener("click", create);
}

// Handle errors globally
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    alert('An error occurred. Please try again.');
});