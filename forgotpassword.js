import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-analytics.js";
import { getAuth, sendPasswordResetEmail} from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";

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

//*************************************************code starts

const btn=document.getElementById("submitBtn");

btn.addEventListener("click",function(){
const auth = getAuth();
let email=document.getElementById("email").value;
sendPasswordResetEmail(auth, email)
.then(() => {

    alert("reset password link sent");
// console.log("reset password link sent");
window.location.href= "login.html";

// Password reset email sent!

// ..
})
.catch((error) => {
const errorCode = error.code;
const errorMessage = error.message;
alert(errorMessage);
console.log(errorMessage);
console.log(errorCode);
// ..
});

});