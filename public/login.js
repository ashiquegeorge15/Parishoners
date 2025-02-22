// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword}from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore,doc,setDoc,getDoc,deleteDoc,getDocs,collection } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
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
const fs=getFirestore(app);



//----- Login code start	  
  document.getElementById("submitBtn").addEventListener("click", function(event) {
    event.preventDefault();
      var email =  document.getElementById("email").value;
      var password = document.getElementById("pass").value;

      signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        var trig=true;
        // Signed in 
        const user = userCredential.user;
        // console.log(user);
        // alert(user.email+" Login successful!");
        // document.getElementById('logout').style.display = 'block';
        const querySnapshot = await getDocs(collection(fs, "Admin"));
        var aId="";
        querySnapshot.forEach((doc) => {
         // doc.data() is never undefined for query doc snapshots
         aId=doc.id
        //  console.log("****"+aId)
         if(user.uid==aId){
          console.log("you are an admin")
          window.location.href = "/admin/index.html";
          trig=false
         }
            // console.log(doc.id);
            // console.log("*****");
        })
        if(trig){
          window.location.href = "/auth/index.html";
        }
        //alert(user.email+" Login successful!hjvjhvh");
        // ...
  })
      .catch((error) => {
        const errorCode = error.code;
        console.log(errorCode);
        const errorMessage = error.message;
        console.log(errorMessage);
        if(errorMessage=="Firebase: Error (auth/user-not-found).")
        {
          alert("email not found!")
        window.location.href = "signup.html";
        }else{
        // errorMessage
        console.log(errorMessage);
        alert(errorMessage);
        }
      });		  		  
  });
  //----- End


  