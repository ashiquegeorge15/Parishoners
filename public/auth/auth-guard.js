import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";

// Firebase configuration
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

// Check if user is authenticated and approved
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // No user is signed in, redirect to login
    window.location.href = '/login.html';
    return;
  }

  try {
    // Check if user is admin
    const adminDoc = await getDoc(doc(db, "Admin", user.uid));
    if (adminDoc.exists()) {
      // User is admin, allow access
      return;
    }

    // Check if user is approved
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists() || !userDoc.data().isApproved) {
      // User is not approved, sign out and redirect
      await auth.signOut();
      
      // Redirect with appropriate error parameter
      window.location.href = '/login.html?error=not_approved';
      return;
    }
    
    // User is approved, update last access time
    await updateDoc(doc(db, "users", user.uid), {
      lastAccess: serverTimestamp()
    });

  } catch (error) {
    console.error("Error checking user status:", error);
    // On error, log the issue but don't necessarily sign the user out
    alert("Error checking access status. Please try again.");
  }
}); 