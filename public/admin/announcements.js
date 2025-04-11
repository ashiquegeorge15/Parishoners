// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-analytics.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";
import { getDatabase, ref, set, get, update, remove, child, push, onValue, orderByChild } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-database.js";
import { getFirestore, doc, getDoc, collection } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-storage.js";

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
const storage = getStorage(app);

// DOM Elements
const postBtn = document.querySelector("#postBtn");
const annTitle = document.querySelector('#annTitle');
const annBody = document.querySelector('#annBody');
const myList = document.getElementById("myList");
const announcementForm = document.getElementById("announcementForm");
const modal = new bootstrap.Modal(document.getElementById('addannouncements'));
const logoutBtn = document.getElementById('logoutBtn');
const attachmentFile = document.getElementById('attachmentFile');
const filePreviewContainer = document.getElementById('filePreviewContainer');
const clearFileBtn = document.getElementById('clearFileBtn');
const progressContainer = document.querySelector('.progress-container');
const uploadProgress = document.querySelector('.upload-progress');

// File Attachment Variables
let selectedFile = null;
let uploadTask = null;
let attachmentData = null;

// Function to load admin profile picture
async function loadAdminProfilePicture(userId) {
  try {
    // Get user profile data from Firestore
    const userDoc = await getDoc(doc(firestore, "users", userId));
    
    // If user has a profile picture, update the image
    if (userDoc.exists() && userDoc.data().profilePic && userDoc.data().profilePic.url) {
      const profileImg = document.querySelector('.profile-img');
      if (profileImg) {
        profileImg.src = userDoc.data().profilePic.url;
        console.log("Profile picture updated in sidebar");
      }
    } else {
      console.log("No profile picture found for sidebar");
    }
  } catch (error) {
    console.error("Error loading profile picture for sidebar:", error);
  }
}

// Function to check if user is admin
async function checkIfAdmin(user) {
  if (!user) return false;
  try {
    const adminDoc = await getDoc(doc(firestore, "Admin", user.uid));
    return adminDoc.exists();
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// Date and Time Formatting
function getCurrentDateTime() {
  let today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yy = today.getFullYear();
  let hh = today.getHours();
  let mi = String(today.getMinutes()).padStart(2, '0');
  let period = "AM";
  
  if (hh >= 12) {
    period = "PM";
    if (hh > 12) hh -= 12;
  }
  
  if (hh === 0) hh = 12;
  
  hh = String(hh).padStart(2, '0');
  
  return {
    date: `${dd}/${mm}/${yy}`,
    time: `${hh}:${mi} ${period}`
  };
}

// Handle file selection
function handleFileSelect(event) {
  const file = event.target.files[0];
  
  if (!file) {
    clearFilePreview();
    return;
  }
  
  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('File is too large. Maximum size is 5MB.', 'error');
    clearFileInput();
    return;
  }
  
  selectedFile = file;
  
  // Clear previous preview
  filePreviewContainer.innerHTML = '';
  
  // Create preview based on file type
  if (file.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.className = 'img-fluid attachment-preview';
    img.alt = 'Image Preview';
    
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    filePreviewContainer.appendChild(img);
  } else if (file.type === 'application/pdf') {
    const pdfPreview = document.createElement('div');
    pdfPreview.className = 'pdf-preview';
    pdfPreview.innerHTML = `
      <i class="far fa-file-pdf pdf-icon"></i>
      <span class="file-name">${file.name}</span>
    `;
    filePreviewContainer.appendChild(pdfPreview);
  } else {
    showToast('Unsupported file type. Please upload an image or PDF.', 'error');
    clearFileInput();
  }
}

// Clear file input and preview
function clearFileInput() {
  attachmentFile.value = '';
  selectedFile = null;
  clearFilePreview();
}

// Clear file preview
function clearFilePreview() {
  filePreviewContainer.innerHTML = '';
}

// Upload file to Firebase Storage
async function uploadFileToStorage(file, announcementId) {
  return new Promise((resolve, reject) => {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const fileName = `announcements/${announcementId}/attachment.${fileExtension}`;
    const fileRef = storageRef(storage, fileName);
    
    // Show progress container
    progressContainer.style.display = 'block';
    
    // Start upload
    uploadTask = uploadBytesResumable(fileRef, file);
    
    uploadTask.on('state_changed', 
      // Progress callback
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        uploadProgress.style.width = progress + '%';
      },
      // Error callback
      (error) => {
        console.error('Upload failed:', error);
        progressContainer.style.display = 'none';
        reject(error);
      },
      // Success callback
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Create attachment data object
          const attachmentInfo = {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            downloadURL: downloadURL,
            uploadedAt: new Date().toISOString(),
            storagePath: fileName
          };
          
          progressContainer.style.display = 'none';
          resolve(attachmentInfo);
        } catch (error) {
          console.error('Error getting download URL:', error);
          progressContainer.style.display = 'none';
          reject(error);
        }
      }
    );
  });
}

// Delete file from Firebase Storage
async function deleteFileFromStorage(storagePath) {
  if (!storagePath) return;
  
  try {
    const fileRef = storageRef(storage, storagePath);
    await deleteObject(fileRef);
    console.log('File deleted successfully');
  } catch (error) {
    console.error('Error deleting file:', error);
    // Continue with announcement deletion even if file deletion fails
  }
}

// Insert Announcement
async function insertAnnouncement(event) {
  event.preventDefault();
  
  // Form validation
  if (annTitle.value.trim() === "" || annBody.value.trim() === "") {
    if (annTitle.value.trim() === "") {
      annTitle.classList.add('is-invalid');
      annTitle.placeholder = "Please enter a title";
    }
    
    if (annBody.value.trim() === "") {
      annBody.classList.add('is-invalid');
      annBody.placeholder = "Please enter announcement content";
    }
    return;
  }
  
  // Get current date and time
  const { date, time } = getCurrentDateTime();
  
  // Reference for new announcement
  const postListRef = ref(db, 'Announcements/');
  const newPostRef = push(postListRef);
  const announcementId = newPostRef.key;
  
  // Set loading state
  postBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Posting...';
  postBtn.disabled = true;
  
  try {
    // Prepare announcement data
    const announcementData = {
      Title: annTitle.value.trim(),
      Body: annBody.value.trim(),
      Date: date,
      Time: time,
      hasAttachment: false
    };
    
    // If there's a file selected, upload it first
    if (selectedFile) {
      try {
        const attachmentInfo = await uploadFileToStorage(selectedFile, announcementId);
        announcementData.hasAttachment = true;
        announcementData.attachment = attachmentInfo;
      } catch (error) {
        console.error("Error uploading file:", error);
        showToast('Error uploading file. Please try again.', 'error');
        
        // Reset button state but don't clear the form so user can try again
        postBtn.innerHTML = 'Post Announcement';
        postBtn.disabled = false;
        return;
      }
    }
    
    // Save announcement data to Firebase
    await set(newPostRef, announcementData);
    
    // Reset form and close modal
    annTitle.value = "";
    annBody.value = "";
    annTitle.classList.remove('is-invalid');
    annBody.classList.remove('is-invalid');
    clearFileInput();
    modal.hide();
    
    // Show success toast
    showToast('Announcement posted successfully!', 'success');
  } catch (error) {
    console.error("Error posting announcement:", error);
    showToast('Error posting announcement. Please try again.', 'error');
  } finally {
    // Reset button state
    postBtn.innerHTML = 'Post Announcement';
    postBtn.disabled = false;
  }
}

// Create Toast Notification
function showToast(message, type) {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center ${type === 'error' ? 'bg-danger' : 'bg-success'} text-white border-0`;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');
  
  // Toast content
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  // Add toast to container
  toastContainer.appendChild(toastEl);
  
  // Initialize and show toast
  const toast = new bootstrap.Toast(toastEl, {
    autohide: true,
    delay: 3000
  });
  toast.show();
  
  // Remove toast after it's hidden
  toastEl.addEventListener('hidden.bs.toast', () => {
    toastEl.remove();
  });
}

// Delete Announcement
async function deleteAnnouncement(id, title, storagePath) {
  if (confirm(`Are you sure you want to delete "${title}"?`)) {
    try {
      // First, delete the attachment from storage if it exists
      if (storagePath) {
        await deleteFileFromStorage(storagePath);
      }
      
      // Then delete the announcement data
      await remove(ref(db, 'Announcements/' + id));
      showToast('Announcement deleted successfully!', 'success');
    } catch (error) {
      console.error("Error deleting announcement:", error);
      showToast('Error deleting announcement. Please try again.', 'error');
    }
  }
}

// Display Announcements
function loadAnnouncements() {
  const dbRef = ref(db, 'Announcements');
  
  // Clear existing list
  myList.innerHTML = '';
  
  // Show loading message
  myList.innerHTML = `
    <div class="text-center my-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2">Loading announcements...</p>
    </div>
  `;
  
  // Variables for sorting
  let announcements = [];
  
  onValue(dbRef, (snapshot) => {
    // Clear list for fresh data
    myList.innerHTML = '';
    
    // Collect all announcements for sorting
    snapshot.forEach((childSnapshot) => {
      const childKey = childSnapshot.key;
      const data = childSnapshot.val();
      const announcement = {
        id: childKey,
        title: data.Title,
        body: data.Body,
        date: data.Date,
        time: data.Time,
        // Convert date to sortable format (yyyy-mm-dd)
        sortDate: data.Date.split('/').reverse().join('-') + ' ' + data.Time,
        hasAttachment: data.hasAttachment || false,
        attachment: data.attachment || null
      };
      announcements.push(announcement);
    });
    
    // Sort by date (newest first)
    announcements.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
    
    // Display sorted announcements
    if (announcements.length === 0) {
      // Show message when no announcements
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'text-center mt-5 p-4 bg-light rounded';
      emptyMessage.innerHTML = `
        <div class="text-muted">
          <i class="fas fa-bullhorn fa-3x mb-3"></i>
          <h5>No announcements yet</h5>
          <p>Click "Add Announcement" to create the first one.</p>
        </div>
      `;
      myList.appendChild(emptyMessage);
    } else {
      // Create announcement cards
      announcements.forEach((announcement, index) => {
        createAnnouncementCard(announcement, index);
      });
    }
  }, {
    onlyOnce: true
  });
}

// Create Announcement Card
function createAnnouncementCard(announcement, index) {
  // Create list item
  const listItem = document.createElement("li");
  listItem.classList.add("announcementslist");
  listItem.style.animationDelay = `${0.1 * (index % 5)}s`;
  
  // Create container
  const container = document.createElement("div");
  container.classList.add("container");
  
  // Create title section
  const titleDiv = document.createElement("div");
  titleDiv.classList.add("title");
  
  const titleP = document.createElement("p");
  titleP.textContent = announcement.title;
  
  const delBtn = document.createElement("button");
  delBtn.classList.add("deletebtn");
  delBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
  delBtn.addEventListener('click', () => {
    const storagePath = announcement.hasAttachment ? announcement.attachment.storagePath : null;
    deleteAnnouncement(announcement.id, announcement.title, storagePath);
  });
  
  titleDiv.appendChild(titleP);
  titleDiv.appendChild(delBtn);
  
  // Create content section
  const contentDiv = document.createElement("div");
  contentDiv.classList.add("content");
  
  const contentP = document.createElement("p");
  contentP.textContent = announcement.body;
  contentDiv.appendChild(contentP);
  
  // Add attachment if present
  if (announcement.hasAttachment && announcement.attachment) {
    const attachmentContainer = document.createElement("div");
    attachmentContainer.className = "attachment-container mt-3";
    
    const attachmentHeader = document.createElement("div");
    attachmentHeader.className = "d-flex align-items-center mb-2";
    attachmentHeader.innerHTML = `
      <i class="fas fa-paperclip me-2"></i>
      <span class="fw-medium">Attachment</span>
    `;
    
    attachmentContainer.appendChild(attachmentHeader);
    
    // Create attachment preview based on file type
    if (announcement.attachment.fileType.startsWith('image/')) {
      const imgElement = document.createElement("img");
      imgElement.src = announcement.attachment.downloadURL;
      imgElement.alt = "Announcement image";
      imgElement.className = "attachment-preview";
      attachmentContainer.appendChild(imgElement);
    } else if (announcement.attachment.fileType === 'application/pdf') {
      // Create PDF viewing container
      const pdfContainer = document.createElement("div");
      pdfContainer.className = "pdf-container";
      
      // Create PDF file name and controls
      const pdfHeader = document.createElement("div");
      pdfHeader.className = "pdf-preview d-flex justify-content-between align-items-center";
      
      // File info with icon
      const fileInfo = document.createElement("div");
      fileInfo.className = "d-flex align-items-center";
      fileInfo.innerHTML = `
        <i class="far fa-file-pdf pdf-icon"></i>
        <span class="file-name">${announcement.attachment.fileName}</span>
      `;
      
      // Action buttons
      const actionButtons = document.createElement("div");
      actionButtons.className = "btn-group btn-group-sm";
      actionButtons.innerHTML = `
        <button type="button" class="btn btn-outline-primary toggle-pdf-view">
          <i class="fas fa-eye"></i> View
        </button>
        <a href="${announcement.attachment.downloadURL}" target="_blank" class="btn btn-outline-secondary">
          <i class="fas fa-download"></i> Download
        </a>
      `;
      
      pdfHeader.appendChild(fileInfo);
      pdfHeader.appendChild(actionButtons);
      
      // Create collapsible PDF embed container (initially hidden)
      const pdfEmbed = document.createElement("div");
      pdfEmbed.className = "pdf-embed-container mt-3 mb-2";
      pdfEmbed.style.display = "none";
      
      // Create the actual PDF embed
      const embedElement = document.createElement("iframe");
      embedElement.className = "pdf-embed";
      embedElement.src = announcement.attachment.downloadURL;
      embedElement.width = "100%";
      embedElement.height = "500";
      embedElement.setAttribute("frameborder", "0");
      embedElement.setAttribute("allowfullscreen", "true");
      
      pdfEmbed.appendChild(embedElement);
      
      // Add toggle functionality
      const toggleButton = pdfHeader.querySelector('.toggle-pdf-view');
      toggleButton.addEventListener('click', () => {
        if (pdfEmbed.style.display === "none") {
          pdfEmbed.style.display = "block";
          toggleButton.innerHTML = '<i class="fas fa-eye-slash"></i> Hide';
        } else {
          pdfEmbed.style.display = "none";
          toggleButton.innerHTML = '<i class="fas fa-eye"></i> View';
        }
      });
      
      // Assemble PDF components
      pdfContainer.appendChild(pdfHeader);
      pdfContainer.appendChild(pdfEmbed);
      attachmentContainer.appendChild(pdfContainer);
    }
    
    contentDiv.appendChild(attachmentContainer);
  }
  
  // Create date/time section
  const dtDiv = document.createElement("div");
  dtDiv.classList.add("comment");
  
  const dtP = document.createElement("p");
  dtP.innerHTML = `<i class="far fa-calendar-alt"></i> ${announcement.date} &nbsp; <i class="far fa-clock"></i> ${announcement.time}`;
  dtDiv.appendChild(dtP);
  
  // Assemble card
  container.appendChild(titleDiv);
  container.appendChild(contentDiv);
  container.appendChild(dtDiv);
  listItem.appendChild(container);
  
  // Add to DOM
  myList.appendChild(listItem);
}

// Event Listeners
if (postBtn) {
  postBtn.addEventListener('click', insertAnnouncement);
}

// Add logout functionality
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    const confirmLogout = confirm('Are you sure you want to logout?');
    if (confirmLogout) {
      auth.signOut().then(() => {
        window.location.href = '../login.html';
      }).catch(error => {
        console.error('Error during logout:', error);
        alert('Failed to logout. Please try again.');
      });
    }
  });
}

// Reset validation state on input
if (annTitle) {
  annTitle.addEventListener('input', () => {
    annTitle.classList.remove('is-invalid');
  });
}

if (annBody) {
  annBody.addEventListener('input', () => {
    annBody.classList.remove('is-invalid');
  });
}

// File input event listeners
if (attachmentFile) {
  attachmentFile.addEventListener('change', handleFileSelect);
}

if (clearFileBtn) {
  clearFileBtn.addEventListener('click', clearFileInput);
}

// Main initialization function
async function init() {
  try {
    // Check authentication state
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isAdmin = await checkIfAdmin(user);
        if (isAdmin) {
          // Load admin profile picture
          await loadAdminProfilePicture(user.uid);
          
          // Load announcements
          loadAnnouncements();
        } else {
          // Redirect non-admin users
          console.log('Non-admin user, redirecting...');
          window.location.href = '../index.html';
        }
      } else {
        // User is not logged in
        console.log('No user logged in, redirecting...');
        window.location.href = '../login.html';
      }
    });
  } catch (error) {
    console.error('Error initializing page:', error);
    showToast('Error loading page: ' + error.message, 'error');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', init);




