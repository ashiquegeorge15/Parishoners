import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import {getFirestore, collection, getDoc,getDocs, doc } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js"
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
const fs = getFirestore();

console.log("script loaded");

window.onload=()=>{
    onAuthStateChanged(auth, async (user) => {
        if (user) {
          // User is signed in, see docs for a list of available properties
          // https://firebase.google.com/docs/reference/js/firebase.User

          // Check if user is Admin
          const uid=user.uid
          // console.log("user "+uid)

          const docSnap = await getDoc(doc(fs,"Admin",uid));
          if(docSnap.exists()) {
            // console.log(docSnap.data());
            console.log("User is Admin")
          } else {
            window.location.href="../auth/index.html"
            console.log("Document does not exist")
          }

        } else {
            // User is signed out
            // ...
            console.log("User not logged in---------------------")
            window.location.href = "../index.html";
          }
        });
};