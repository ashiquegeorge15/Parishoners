
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDyqAiultYZzwcoRfQhNKRiCG3DuEBEsd8",
  authDomain: "backendlogsign.firebaseapp.com",
  databaseURL: "https://backendlogsign-default-rtdb.firebaseio.com",
  projectId: "backendlogsign",
  storageBucket: "backendlogsign.appspot.com",
  messagingSenderId: "1039275246750",
  appId: "1:1039275246750:web:ee61d0b254a2697a3e278f",
  measurementId: "G-C9R69XEVH7"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
//const analytics = getAnalytics(app);

import { getDatabase, ref, set,get, update, remove,child,push, onChildAdded, onChildChanged, onChildRemoved, onValue,orderByChild } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-database.js";

console.log("script loaded");

//CREATE FAMILY ID------------------------------------
const db=getDatabase();
const postListRef = ref(db, 'Families/');
const newPostRef = push(postListRef);

const btn=document.getElementById("btn");

const pass=document.getElementById("pass");
const email=document.getElementById("email");
const fName=document.getElementById("fName");
let Id="";

// console.log(famName.value);

function create(){
    console.log("in function")
    //check for empty entries
  if(pass.value==""||email.value==""||fName==""){
    fName.placeholder="Enter Family Name!";
    email.placeholder="Enter email!";
    pass.placeholder="Enter password!";
    console.log("log:email/password not entered");
  }

  else{
    console.log("log:email password entered");

    // Create User with  Email and Password ------------- to Authentication (not RTDB)

    createUserWithEmailAndPassword(auth, email.value, pass.value)
    .then((userCredential) => {
      // Signed in 
      const user = userCredential.user;
      // console.log(user);
      console.log("log: Registered successfully!! -----------------------------    ");
      // ...
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      // ..

      if (errorMessage=="Firebase: Error (auth/email-already-in-use).")
      alert("Email already exists");
      //window.location.href = "login.html";
      //alert(error);
      console.log(errorMessage);
    });		  		  
    
    //get currently signed in user
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in, see docs for a list of available properties
    // https://firebase.google.com/docs/reference/js/firebase.User
    userId= user.uid;
    // ...
    console.log(userId);
  } else {
    // User is signed out
    // ...    
    console.log("log: not signed in ------------------------------");
  }
});

    // PUSH data to Firebase ---------------------------- Create Family
const famId=set(push(ref(db, 'Families/')),{
    FamName: fName
   }).then(()=>{
    console.log("log:Family ID created!");
  //alert("Family ID created!");
//window.location.reload();
  }).catch((error)=>{
  alert(error);
  });
  console.log("log: Family ID : "+famId+" -----------------------------");
}
}

btn.addEventListener('click',create);