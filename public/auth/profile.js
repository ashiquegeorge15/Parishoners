// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-analytics.js";
import { getAuth, onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
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

// Page loader functionality
function showLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.classList.add('active');
  }
}

function hideLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.classList.remove('active');
    setTimeout(() => {
      loader.style.display = 'none';
    }, 300);
  }
}

// Show loader on page load
document.addEventListener('DOMContentLoaded', () => {
  showLoader();
  disp(); // Load user data
});

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
  showLoader();
  
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
    
    await setDoc(doc(fs, "users", user.uid), userData, { merge: true });
    console.log("Document written to firestore");
    
    hideLoader();
    window.location.reload();

  } catch (e) {
    hideLoader();
    const err=console.error("Error adding document: ", e);
    console.log(err+" is error");
    alert(err+" is error");
  }
}

async function disp() {
  showLoader();
  
  // getting user Id from authentication-------------------------
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is signed in, see docs for a list of available properties
      // https://firebase.google.com/docs/reference/js/firebase.User
      const uid = user.uid;
      // console.log(uid);

      // Getting data from firestore-------------------------
      const docRef = doc(fs, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log("Document data:", docSnap.data());

        // Populate form fields for editing
        const userData = docSnap.data();
        document.getElementById("uname").value = userData.name || '';
        document.getElementById("uphno").value = userData.phno || '';
        document.getElementById("uaddress").value = userData.address || '';
        document.getElementById("udob").value = userData.dob || '';
        
        // Set the gender value
        const genderSelect = document.getElementById("ugender");
        if (userData.gender) {
          for (let i = 0; i < genderSelect.options.length; i++) {
            if (genderSelect.options[i].text === userData.gender) {
              genderSelect.selectedIndex = i;
              break;
            }
          }
        }

        // Update displayed profile information
        document.getElementById("name").textContent = userData.name || 'Member Name';
        document.getElementById("email").textContent = user.email || 'Not provided';
        document.getElementById("number").textContent = userData.phno || 'Not provided';
        document.getElementById("dob").textContent = userData.dob || 'Not provided';
        document.getElementById("gender").textContent = userData.gender || 'Not provided';
        document.getElementById("address").textContent = userData.address || 'Not provided';

        // Update profile image if available
        if (userData.profilePic && userData.profilePic.url) {
          const profileImages = document.querySelectorAll(".profile-image");
          profileImages.forEach(img => {
            img.src = userData.profilePic.url;
          });
        }

      } else {
        // docSnap.data() will be undefined in this case
        console.log("No such document!");
      }
      
      hideLoader();
    } else {
      // User is signed out
      console.log("User not logged in---------------------")
      window.location.href = "../login.html";
    }
  });
}

function logout(event) {
  event.preventDefault();
  const con = confirm("Are you sure you want to logout?");
  if (con) {
    showLoader();
    auth.signOut();
    window.location.href = "../login.html";
  }
}

// Delete account
document.getElementById("delAccBtn").addEventListener('click', async (d) => {
  // getting user Id from authentication
  const user = auth.currentUser;

  var con = confirm("Are you sure you want to delete your account: " + user.email);
  if (con == true) {
    try {
      showLoader();
      
      // Get user data to check for profile pic
      const userDoc = await getDoc(doc(fs, "users", user.uid));
      
      // Delete profile picture if it exists
      if (userDoc.exists() && userDoc.data().profilePic && userDoc.data().profilePic.path) {
        await deleteProfilePicture(userDoc.data().profilePic.path);
      }
      
      // Delete user document from Firestore
      await deleteDoc(doc(fs, "users", user.uid));
      console.log("User document deleted successfully");
      
      // Delete user from Authentication
      await deleteUser(user);
      console.log("User deleted successfully");
      
      hideLoader();
      alert("Your account has been deleted successfully");
      window.location.href = "../login.html";
    } catch (error) {
      hideLoader();
      console.error("Error deleting user:", error);
      alert("Failed to delete account: " + error.message);
    }
  }
});

// Event listeners
document.addEventListener("DOMContentLoaded", function() {
  // Save profile changes button
  const saveButton = document.getElementById("Save");
  if (saveButton) {
    saveButton.addEventListener("click", create);
  }
  
  // Logout button
  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
});