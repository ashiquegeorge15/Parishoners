// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-analytics.js";
import { getAuth,onAuthStateChanged,deleteUser} from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore,doc,setDoc,getDoc,deleteDoc } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
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

async function create() {
  // Getting fetails from user---------------------
  const name=document.getElementById("uname").value;
  console.log(name);
  var x = document.getElementById("ugender");
  var i = x.selectedIndex;
  var gender = x.options[i].text;
  console.log(gender);
  const phno=document.getElementById("uphno").value;
  console.log(phno);
  const address=document.getElementById("uaddress").value;
  console.log(address);
  const dob=document.getElementById("udob").value;
  console.log(dob);

  // getting user Id from authentication-------------------------
const user = auth.currentUser;
console.log("user: "+user);

// Uploading details to firestore--------------------------------

try { 
  console.log("entered firestore code");
  const docRef =setDoc(doc(fs, "users", user.uid), {
     name: name,
     gender: gender,
    phno: phno,
    address: address,
    dob: dob
  });
  console.log("Document written with ID: ", docRef.id);
// window.location.reload();
} catch (e) {
  const err=console.error("Error adding document: ", e);
  console.log(err+" is error");
}
window.location.reload();
}


async function disp(){

    // getting user Id from authentication-------------------------
    
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
        const uid = user.uid;
        // console.log(uid);

        // Getting data from firestore-------------------------
        const docRef = doc(fs, "users", uid);
        const docSnap =  await getDoc(docRef);
  
        if (docSnap.exists()) {
          // console.log("Document data:", docSnap.data());

          const name=docSnap.data().name;
          console.log("name: "+name);
          document.getElementById("name").textContent=name;

          const email=user.email;
          console.log("email: "+email);
          document.getElementById("email").textContent=email;

          const phno=docSnap.data().phno;
          console.log("phno: "+phno);
          document.getElementById("number").textContent=phno;

          const dob=docSnap.data().dob;
          console.log("dob: "+dob);
          document.getElementById("dob").textContent=dob;

          const gender=docSnap.data().gender;
          console.log("gender: "+gender);
          document.getElementById("gender").textContent=gender;

          const address=docSnap.data().address;
          console.log("address: "+address);
          document.getElementById("address").textContent=address;

        } else {
          // docSnap.data() will be undefined in this case
          console.log("No such document!");
        }
        // ...
      } else {
        // User is signed out
        // ...
        console.log("User not logged in---------------------")
        window.location.href = "../login.html";
      }
    });
}

function logout(event){
  event.preventDefault();
  alert("Are you sure to logout?");
  auth.signOut();
  window.location.href = "../login.html";
}

//deleting profile data
delAccBtn.addEventListener('click',async (d)=>{
  // getting user Id from authentication
  const user = auth.currentUser;


  var con=confirm("are you sure to delete "+user.email);
  if(con==true){



 // Getting user details ---------------------
 const name=document.getElementById("uname").value;
 console.log(name);
 var x = document.getElementById("ugender");
 var i = x.selectedIndex;
 var gender = x.options[i].text;
 console.log(gender);
 const phno=document.getElementById("uphno").value;
 console.log(phno);
 const address=document.getElementById("uaddress").value;
 console.log(address);
 const dob=document.getElementById("udob").value;
 console.log(dob);

 await deleteDoc(doc(fs,"users",user.uid));

     //Delete account from Firebase authentication
     deleteUser(user).then(() => {
      // User deleted.
      alert("user deleted");
    }).catch((error) => {
      // An error ocurred
      // ...
      alert("user not deleted");
    });

  }
});

async function data(){
  
  // Getting Details from Firestore
  const docRef = doc(fs, "users", auth.currentUser.uid);
const docSnap = await getDoc(docRef);

if (docSnap.exists()) {
  console.log("Document data:", docSnap.data());
  document.getElementById("uname").value=docSnap.data().name
  switch(docSnap.data().gender){
  case "Choose...":
  document.getElementById("ugender").value="selected";
  break;
  case "Prefer not to say":
  document.getElementById("ugender").value="1";
  break;
  case "Male":
  document.getElementById("ugender").value="2";
  break;
  case "Female":
  document.getElementById("ugender").value="3";
  break;}
  document.getElementById("uaddress").value=docSnap.data().address
  document.getElementById("udob").value=docSnap.data().dob
  document.getElementById("uphno").value=docSnap.data().phno
  
  console.log(docSnap.data().name+"-----------------")
 
}else {
  // docSnap.data() will be undefined in this case
  console.log("No such document!");
}
}

function admincontrol(){
  window.location.href="admincontrol.html";
}

document.getElementById("Save").addEventListener("click", create);
document.getElementById("logout").addEventListener("click", logout);
document.getElementById("editProfile").addEventListener("click", data);
document.getElementById("admincontrol").addEventListener("click", admincontrol);
window.onload=disp();