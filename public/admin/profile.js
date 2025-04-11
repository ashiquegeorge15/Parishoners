// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-analytics.js";
import { getAuth,onAuthStateChanged,deleteUser} from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore,doc,setDoc,getDoc,deleteDoc,getDocs,collection } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-storage.js";
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
const storage = getStorage(app);

console.log("script loaded");

// Handle profile picture preview
const profileImgInput = document.getElementById("imginp");
if (profileImgInput) {
  profileImgInput.addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (file && file.type.match('image.*')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        // Display image preview if available
        const previewImg = document.createElement("img");
        previewImg.src = e.target.result;
        previewImg.style.width = "150px";
        previewImg.style.height = "150px";
        previewImg.style.borderRadius = "50%";
        previewImg.style.objectFit = "cover";
        previewImg.style.marginBottom = "10px";
        
        const previewContainer = document.querySelector(".modal-body");
        // Remove any existing preview
        const existingPreview = previewContainer.querySelector(".preview-image");
        if (existingPreview) {
          previewContainer.removeChild(existingPreview);
        }
        
        // Add new preview at the top of the modal body
        previewContainer.insertBefore(previewImg, previewContainer.firstChild);
        previewImg.classList.add("preview-image");
      };
      reader.readAsDataURL(file);
    }
  });
}

// Upload profile picture to Firebase Storage
async function uploadProfilePicture(file, userId) {
  if (!file) return null;
  
  try {
    // Resize image before upload
    const resizedImage = await resizeImage(file);
    
    // Simpler path structure - this should work with the current rules
    // First try with the timestamped version (which is more secure)
    let profilePicRef = ref(storage, `profilepic/${userId}_${Date.now()}`);
    let uploadSuccess = false;
    let downloadURL = null;
    
    try {
      // Try uploading with timestamped path
      const snapshot = await uploadBytes(profilePicRef, resizedImage);
      console.log('Uploaded profile picture with timestamped path!');
      downloadURL = await getDownloadURL(snapshot.ref);
      uploadSuccess = true;
    } catch (err) {
      console.log('Failed to upload with timestamped path, trying simple path');
      
      // If that fails, try with the simpler path (just userId)
      profilePicRef = ref(storage, `profilepic/${userId}`);
      const snapshot = await uploadBytes(profilePicRef, resizedImage);
      console.log('Uploaded profile picture with simple path!');
      downloadURL = await getDownloadURL(snapshot.ref);
      uploadSuccess = true;
    }
    
    if (!uploadSuccess) {
      throw new Error('Failed to upload with both path strategies');
    }
    
    console.log('Profile picture URL:', downloadURL);
    
    return {
      url: downloadURL,
      path: profilePicRef.fullPath
    };
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    alert("Failed to upload profile picture: " + error.message);
    return null;
  }
}

// Resize image before upload to reduce storage usage
async function resizeImage(file, maxWidth = 500) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          resolve(blob);
        }, file.type, 0.8); // 0.8 quality
      };
    };
  });
}

// Delete profile picture from storage
async function deleteProfilePicture(picturePath) {
  if (!picturePath) return;
  
  try {
    const picRef = ref(storage, picturePath);
    await deleteObject(picRef);
    console.log("Profile picture deleted successfully");
  } catch (error) {
    console.error("Error deleting profile picture:", error);
  }
}

async function create() {
  // Getting details from user---------------------
  console.log("create called--------------")
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

  // Check for profile picture upload
  const fileInput = document.getElementById("imginp");
  let profilePicData = null;
  
  if (fileInput.files.length > 0) {
    // Upload the new profile picture
    profilePicData = await uploadProfilePicture(fileInput.files[0], user.uid);
    
    // If a new picture was uploaded, check if there's an old one to delete
    if (profilePicData) {
      // Get current user data to check for existing profile pic
      const userDoc = await getDoc(doc(fs, "users", user.uid));
      if (userDoc.exists() && userDoc.data().profilePic && userDoc.data().profilePic.path) {
        // Delete the old picture
        await deleteProfilePicture(userDoc.data().profilePic.path);
      }
    }
  }

  // Uploading details to firestore--------------------------------
  try { 
    console.log("entered firestore code");
    const userData = {
      name: name,
      gender: gender,
      phno: phno,
      address: address,
      dob: dob
    };
    
    // Add profile picture data if available
    if (profilePicData) {
      userData.profilePic = profilePicData;
    }
    
    await setDoc(doc(fs, "users", user.uid), userData);
    console.log("Document written to firestore");

  } catch (e) {
    const err=console.error("Error adding document: ", e);
    console.log(err+" is error");
    alert(err+" is error");
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

        // test if user is admin
        const querySnapshot = await getDocs(collection(fs, "Admin"));
        var aId="";
        var count=true
        querySnapshot.forEach((doc) => {
         // doc.data() is never undefined for query doc snapshots
         aId=doc.id


          if(aId==uid)
          {
            aId="";
            // console.log(uid+' is admin')
            count=false
            // ccount=true
            // return false
          }


            // console.log(doc.id);
            // console.log("*****");
        })
        
        // take to login page if not admin
        if(count){
          
            auth.signOut();
            window.location.href = "../login.html";
          
          // window.location.href="../login.html"
        }
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
          
          // Display profile picture if available
          if (docSnap.data().profilePic && docSnap.data().profilePic.url) {
            const profileImage = document.querySelector(".profile-image");
            profileImage.src = docSnap.data().profilePic.url;
          }

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
  const con=confirm("Are you sure to logout?");
  if(con){
  auth.signOut();
  window.location.href = "../login.html";}
}

//deleting profile data
delAccBtn.addEventListener('click',async (d)=>{
  // getting user Id from authentication
  const user = auth.currentUser;


  var con=confirm("are you sure to delete "+user.email);
  if(con==true){

    try {
      // Get user data to retrieve profile picture path
      const userDoc = await getDoc(doc(fs, "users", user.uid));
      
      // Delete profile picture from storage if it exists
      if (userDoc.exists() && userDoc.data().profilePic && userDoc.data().profilePic.path) {
        await deleteProfilePicture(userDoc.data().profilePic.path);
      }
      
      // Delete user document from Firestore
      await deleteDoc(doc(fs,"users",user.uid));

      // Delete account from Firebase authentication
      deleteUser(user).then(() => {
        // User deleted.
        alert("user deleted");
      }).catch((error) => {
        // An error ocurred
        alert("user not deleted");
      });
    } catch (error) {
      console.error("Error during account deletion:", error);
      alert("Error deleting account: " + error.message);
    }
  }
});

async function data(){
  
  // Getting Details from Firestore
  const docRef = doc(fs, "users", auth.currentUser.uid);
const docSnap = await getDoc(docRef);

if (docSnap.exists()) {
  // console.log("Document data:", docSnap.data());
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

async function delUsr(id,name){
  var con=confirm("You sure to delete "+name+"?")
  if(con==true)
  {
    console.log("delete called on "+name);
    
    try {
      // Get user data to retrieve profile picture path
      const userDoc = await getDoc(doc(fs, "users", id));
      
      // Delete profile picture from storage if it exists
      if (userDoc.exists() && userDoc.data().profilePic && userDoc.data().profilePic.path) {
        await deleteProfilePicture(userDoc.data().profilePic.path);
      }
      
      // Delete user document from Firestore
      await deleteDoc(doc(fs,"users",id));

      // Delete account from Firebase authentication
      deleteUser(user).then(() => {
        // User deleted.
        alert("user deleted");
      }).catch((error) => {
        // An error ocurred
        console.log("user not deleted");
      });

      window.location.reload();
    } catch (error) {
      console.error("Error during user deletion:", error);
      alert("Error deleting user: " + error.message);
    }
  }
}

document.getElementById("Save").addEventListener("click", create);
document.getElementById("logout").addEventListener("click", logout);
document.getElementById("editProfile").addEventListener("click", data);
document.getElementById("admincontrol").addEventListener("click", admincontrol);
document.getElementById("delAccBtn").addEventListener("click", delUsr);
window.onload=disp();


