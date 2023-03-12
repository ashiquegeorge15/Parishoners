// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-analytics.js";

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
const analytics = getAnalytics(app);

import { getDatabase, ref, set,get, update, remove,child } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-database.js";

// Post Announcement
const db=getDatabase();

const btn=document.querySelector("#postBtn");

const annTitle=document.querySelector('#annTitle');
const annBody=document.querySelector('#annBody');

function insert(){
set(ref(db, "announcements/" + annTitle.value),{
Body: annBody.value
}).then(()=>{
alert("Announcement posted!");
}).catch((error)=>{
alert(error);
})
}

btn.addEventListener('click',insert);