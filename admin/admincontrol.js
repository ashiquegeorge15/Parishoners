// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-analytics.js";
import { getAuth ,deleteUser} from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";
import { getFirestore, collection, query, where,deleteDoc, getDocs,doc} from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";

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

console.log("script loaded");

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const fs = getFirestore(app);
const auth=getAuth();
const user = auth.currentUser;

// delete user function
async function delUsr(id,name){
    var con=confirm("You sure to delete "+name+"?")
    if(con==true)
    {
    console.log("delete called on "+name)
    
    // const name=name
    // console.log(gender);
    // var gender = gender
    // console.log(gender);
    // const phno=phno
    // const address=document.getElementById("uaddress").value;
    // const dob=dob
 

 await deleteDoc(doc(fs,"users",id));

      //Delete account from Firebase authentication
      deleteUser(user).then(() => {
        // User deleted.
        alert("user deleted");
      }).catch((error) => {
        // An error ocurred
        // ...
       console.log("user not deleted");
      });

        window.location.reload();}

}

// List Users------------------------------------------------
async function load() {
    //Get all users
    const querySnapshot = await getDocs(collection(fs, "users"));
    querySnapshot.forEach(async (doc) => {
        // doc.data() is never undefined for query doc snapshots
        const uName=doc.data().name
        var uId=doc.id
        console.log(doc.data().name);
        console.log("---------");

        // CREATE LI ELEMENTS----------------------
        const userList=document.getElementById("userlist");
        const adminList=document.getElementById("adminlist")

        const newNode=document.createElement("li");
        newNode.style.margin="5px"

        const nodeDiv=document.createElement("div");
        nodeDiv.classList.add("users");
        newNode.appendChild(nodeDiv);

            const imgDiv=document.createElement("div");
            imgDiv.classList.add("one");
            nodeDiv.appendChild(imgDiv);

                const image=document.createElement("img");
                image.classList.add("userpic");
                image.src="img/icon/defaultPic.png"

                const nameP=document.createElement("p")
                nameP.style="vertical-align: middle"
                nameP.textContent=uName

                imgDiv.appendChild(image)
                imgDiv.appendChild(nameP)

            const btnDiv=document.createElement("div")
            btnDiv.classList.add("two")
            nodeDiv.appendChild(btnDiv)

                // create Delete button
                const delbtn=document.createElement("button")
                delbtn.classList.add("btn")
                delbtn.classList.add("btn-danger")
                delbtn.style.marginRight="3px"
                // delbtn.id="mkadminbtn"
                delbtn.textContent="Delete"
                delbtn.addEventListener('click', function(){delUsr(doc.id,doc.data().name)});
                btnDiv.appendChild(delbtn)

                const mkadminbtn=document.createElement("button")
                mkadminbtn.classList.add("btn")
                mkadminbtn.classList.add("btn-primary")
                // mkadminbtn.id="mkadminbtn"
                mkadminbtn.textContent="make Admin"
                btnDiv.appendChild(mkadminbtn)


        // Test if admin
        const querySnapshot = await getDocs(collection(fs, "Admin"));
        var aId="";
        querySnapshot.forEach((doc) => {
         // doc.data() is never undefined for query doc snapshots
         aId=doc.id
            // console.log(doc.id);
            // console.log("*****");
        })

        if(aId==uId)
        {
            mkadminbtn.textContent="remove Admin"
            adminList.appendChild(newNode);
        }else{
            userList.appendChild(newNode);
        }

    });
      

  } 

  function search(){
    //Get searched user only
    
  }

  // List Admins-----------------------------------------------

  window.onload=load();