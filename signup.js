// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore,collection, addDoc,doc,setDoc } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
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
function create(event) {
    event.preventDefault()
      var email =  document.getElementById("email").value;
      // var FamId = document.getElementById("famId").value;
      var password = document.getElementById("password").value;
      //For new registration
      createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        // Signed in 
        const user = userCredential.user;
        // console.log(user);


           //get currently signed in user----------------------------

            onAuthStateChanged(auth, (user) => {
              if (user) {
   
               userId= user.uid;
               console.log("-----------------------userId set to "+userId);
               // Pushing data in firestore---------------------------------------

try {
  console.log("entered firestore code");
  const docRef =setDoc(doc(fs, "users", user.uid), {
    //  name: "Los Angeles",
    // state: "CA",
    // country: "USA"
  });
  console.log("Document written with ID: ", docRef.id);
} catch (e) {
  const err=console.error("Error adding document: ", e);
  console.log(err+" is error");
}
    // ...
    // console.log("user ID :"+userId);
  } else {
    // User is signed out
    // ...    
    console.log("log: not signed in ------------------------------");
  }
});


        alert("Registered successfully!!");
        

        //Redirect to ------"auth/index.html"

        window.location.href = "auth/index.html";
        // ...
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        // ..
        console.log("ERROR MESSAGE: "+errorMessage);
        console.log("ERROR CODE: "+errorCode);
        if (errorMessage=="Firebase: Error (auth/email-already-in-use).")
        {alert("Email already exists");
        window.location.href = "login.html";}
        //alert(error);
      });		  		  
  }	  
  document.getElementById("submitBtn").addEventListener("click", create);