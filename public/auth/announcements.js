// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";
import { getDatabase, ref, get, onValue } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-database.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";

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
  const db = getDatabase();
const auth = getAuth();
const firestore = getFirestore(app);

// DOM Elements
const myList = document.getElementById("myList");

// Function to load user profile picture if available
async function loadUserProfilePicture(userId) {
  try {
    // Get user profile data from Firestore
    const userDoc = await getDoc(doc(firestore, "users", userId));
    
    // If user has a profile picture, update all profile images
    if (userDoc.exists() && userDoc.data().profilePic && userDoc.data().profilePic.url) {
      // Update the sidebar profile image if exists
      const sidebarProfileImg = document.querySelector('.profile-img');
      if (sidebarProfileImg) {
        sidebarProfileImg.src = userDoc.data().profilePic.url;
      }
      
      // Update mobile nav profile image
      const mobileProfileImg = document.querySelector('.profilepicclass img');
      if (mobileProfileImg) {
        mobileProfileImg.src = userDoc.data().profilePic.url;
      }
      
      console.log("Profile pictures updated");
    }
  } catch (error) {
    console.error("Error loading profile picture:", error);
  }
}

// Format date and time for display
function formatDateTime(date, time) {
  // Convert from DD/MM/YYYY to more readable format
  const parts = date.split('/');
  const day = parts[0];
  const month = parts[1];
  const year = parts[2];
  
  // Convert month number to month name
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const monthName = monthNames[parseInt(month) - 1];
  
  return `${monthName} ${day}, ${year} at ${time}`;
}

// Create announcement card
function createAnnouncementCard(announcement) {
  // Create list item
  const listItem = document.createElement("li");
  listItem.id = announcement.id;
  
  // Create container
  const container = document.createElement("div");
  container.classList.add("container");
  
  // Create title section
  const titleDiv = document.createElement("div");
  titleDiv.classList.add("title");
  const titleP = document.createElement("p");
  titleP.textContent = announcement.Title;
  titleDiv.appendChild(titleP);
  
  // Create content section
  const contentDiv = document.createElement("div");
  contentDiv.classList.add("content");
  const contentP = document.createElement("p");
  contentP.textContent = announcement.Body;
  contentDiv.appendChild(contentP);
  
  // Add attachment if present
  if (announcement.attachment) {
    const attachmentContainer = document.createElement("div");
    attachmentContainer.classList.add("attachment-container");
    
    if (announcement.attachment.fileType.startsWith('image/')) {
      // Image attachment
      const img = document.createElement("img");
      img.classList.add("attachment-preview");
      img.src = announcement.attachment.downloadURL;
      img.alt = "Announcement attachment";
      img.loading = "lazy";
      
      // Add click event to open image in new tab
      img.addEventListener("click", () => {
        window.open(announcement.attachment.downloadURL, "_blank");
      });
      
      attachmentContainer.appendChild(img);
    } else if (announcement.attachment.fileType === 'application/pdf') {
      // PDF attachment
      const pdfPreview = document.createElement("div");
      pdfPreview.classList.add("pdf-preview");
      
      // PDF icon
      const icon = document.createElement("i");
      icon.classList.add("far", "fa-file-pdf", "pdf-icon");
      
      // File name and size
      const fileInfo = document.createElement("div");
      const fileName = document.createElement("div");
      fileName.classList.add("file-name");
      fileName.textContent = announcement.attachment.fileName;
      
      // Calculate file size in KB or MB
      const fileSize = announcement.attachment.fileSize;
      const fileSizeText = document.createElement("small");
      fileSizeText.classList.add("text-muted");
      
      if (fileSize < 1024 * 1024) {
        fileSizeText.textContent = `${Math.round(fileSize / 1024)} KB`;
      } else {
        fileSizeText.textContent = `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
      }
      
      // View button
      const viewBtn = document.createElement("a");
      viewBtn.href = announcement.attachment.downloadURL;
      viewBtn.target = "_blank";
      viewBtn.classList.add("btn", "btn-sm", "btn-outline-primary", "mt-2");
      viewBtn.textContent = "View PDF";
      
      fileInfo.appendChild(fileName);
      fileInfo.appendChild(fileSizeText);
      fileInfo.appendChild(document.createElement("br"));
      fileInfo.appendChild(viewBtn);
      
      pdfPreview.appendChild(icon);
      pdfPreview.appendChild(fileInfo);
      attachmentContainer.appendChild(pdfPreview);
    }
    
    contentDiv.appendChild(attachmentContainer);
  }
  
  // Create date and time section
  const dtDiv = document.createElement("div");
  dtDiv.classList.add("comment");
  const dtP = document.createElement("p");
  dtP.textContent = formatDateTime(announcement.Date, announcement.Time);
  dtDiv.appendChild(dtP);
  
  // Append all sections to container
  container.appendChild(titleDiv);
  container.appendChild(contentDiv);
  container.appendChild(dtDiv);
  
  // Append container to list item
  listItem.appendChild(container);
  
  return listItem;
}

// Load announcements
function loadAnnouncements() {
  const dbRef = ref(db, 'Announcements');
  
  // Clear the list before loading
  myList.innerHTML = '';
  
  // Show loading state
  const loadingItem = document.createElement("li");
  loadingItem.className = "text-center p-4";
  loadingItem.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Loading announcements...</p>';
  myList.appendChild(loadingItem);
  
  onValue(dbRef, (snapshot) => {
    // Clear loading state
    myList.innerHTML = '';
    
    // Store announcements in an array for sorting
    const announcements = [];
    
    snapshot.forEach((childSnapshot) => {
      const announcement = childSnapshot.val();
      announcement.id = childSnapshot.key;
      announcements.push(announcement);
    });
    
    // Check if there are any announcements
    if (announcements.length === 0) {
      const noDataItem = document.createElement("li");
      noDataItem.className = "text-center p-5";
      noDataItem.innerHTML = '<i class="fas fa-info-circle fa-3x mb-3 text-muted"></i><p>No announcements available at this time.</p>';
      myList.appendChild(noDataItem);
      return;
    }
    
    // Sort announcements by date and time (newest first)
    announcements.sort((a, b) => {
      // Extract date parts (DD/MM/YYYY)
      const aDateParts = a.Date.split('/');
      const bDateParts = b.Date.split('/');
      
      // Create Date objects (YYYY-MM-DD)
      const aDate = new Date(
        aDateParts[2], 
        aDateParts[1] - 1, 
        aDateParts[0]
      );
      const bDate = new Date(
        bDateParts[2], 
        bDateParts[1] - 1, 
        bDateParts[0]
      );
      
      // Compare dates
      if (aDate.getTime() !== bDate.getTime()) {
        return bDate.getTime() - aDate.getTime();
      }
      
      // If dates are equal, compare times
      return b.Time.localeCompare(a.Time);
    });
    
    // Add each announcement to the list
    announcements.forEach((announcement, index) => {
      const announcementCard = createAnnouncementCard(announcement);
      myList.appendChild(announcementCard);
    });
  }, {
    onlyOnce: false // Continuously listen for updates
  });
}

// Handle responsive sidebar toggle (if we add that functionality later)
function setupSidebarToggle() {
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('collapsed');
      document.querySelector('.main-content').classList.toggle('expanded');
    });
  }
}

// Check authentication and load data
function init() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in
      console.log("User is signed in:", user.uid);
      loadUserProfilePicture(user.uid);
      loadAnnouncements();
      setupSidebarToggle();
    } else {
      // User is signed out, redirect to login
      console.log("User is signed out");
      window.location.href = "login.html";
    }
  });
}

// Handle logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "../login.html";
  } catch (error) {
    console.error("Error signing out: ", error);
  }
});

// Initialize on page load
window.onload = init;
