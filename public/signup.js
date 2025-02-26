// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
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


//----- New Registration code start
async function create(event) {
    event.preventDefault();
    
    try {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const name = document.getElementById("name")?.value || '';
        const phone = document.getElementById("phone")?.value || '';

        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Prepare user data
        const userData = {
            email: email,
            name: name,
            phno: phone,
            gender: "",
            address: "",
            dob: "",
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            role: 'member',
            status: 'active',
            emailVerified: user.emailVerified,
            photoURL: user.photoURL || '',
            deviceInfo: {
                browser: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
            }
        };

        // Store user data in Firestore
        await setDoc(doc(fs, "users", user.uid), userData);

        // Send email verification
        await sendEmailVerification(user);

        // Set up auth state change listener
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Update last login time
                try {
                    await updateDoc(doc(fs, "users", user.uid), {
                        lastLogin: serverTimestamp(),
                        emailVerified: user.emailVerified,
                        lastLoginDevice: {
                            browser: navigator.userAgent,
                            platform: navigator.platform,
                            language: navigator.language
                        }
                    });
                } catch (error) {
                    console.error("Error updating last login:", error);
                }
            }
        });

        // Show success message
        alert("Registration successful! Please check your email for verification.");

        // Redirect to auth page
        window.location.href = "auth/index.html";

    } catch (error) {
        console.error("Registration error:", error);
        
        if (error.code === 'auth/email-already-in-use') {
            alert("Email already exists");
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

// Add auth state change listener for all pages
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            // Update user's last login time
            await updateDoc(doc(fs, "users", user.uid), {
                lastLogin: serverTimestamp(),
                emailVerified: user.emailVerified,
                lastLoginDevice: {
                    browser: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language
                }
            });
        } catch (error) {
            console.error("Error updating user data:", error);
        }
    }
});

// Handle errors globally
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    alert('An error occurred. Please try again.');
});