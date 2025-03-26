// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";
import { getDatabase, ref, set, get, update, remove, child, push, onValue, orderByChild } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-database.js";

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

// DOM Elements
const postBtn = document.querySelector("#postBtn");
const annTitle = document.querySelector('#annTitle');
const annBody = document.querySelector('#annBody');
const myList = document.getElementById("myList");
const announcementForm = document.getElementById("announcementForm");
const modal = new bootstrap.Modal(document.getElementById('addannouncements'));

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

// Insert Announcement
function insertAnnouncement(event) {
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
  
  // Set loading state
  postBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Posting...';
  postBtn.disabled = true;
  
  // Save to Firebase
  set(newPostRef, {
    Title: annTitle.value.trim(),
    Body: annBody.value.trim(),
    Date: date,
    Time: time
  }).then(() => {
    // Reset form and close modal
    annTitle.value = "";
    annBody.value = "";
    annTitle.classList.remove('is-invalid');
    annBody.classList.remove('is-invalid');
    modal.hide();
    
    // Show success toast
    showToast('Announcement posted successfully!', 'success');
    
    // Reset button state
    postBtn.innerHTML = 'Post Announcement';
    postBtn.disabled = false;
  }).catch((error) => {
    console.error("Error posting announcement:", error);
    showToast('Error posting announcement. Please try again.', 'error');
    
    // Reset button state
    postBtn.innerHTML = 'Post Announcement';
    postBtn.disabled = false;
  });
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
function deleteAnnouncement(id, title) {
  if (confirm(`Are you sure you want to delete "${title}"?`)) {
    remove(ref(db, 'Announcements/' + id))
      .then(() => {
        showToast('Announcement deleted successfully!', 'success');
      })
      .catch((error) => {
        console.error("Error deleting announcement:", error);
        showToast('Error deleting announcement. Please try again.', 'error');
      });
  }
}

// Display Announcements
function loadAnnouncements() {
  const dbRef = ref(db, 'Announcements');
  
  // Clear existing list
  myList.innerHTML = '';
  
  // Variables for sorting
  let announcements = [];
  
  onValue(dbRef, (snapshot) => {
    // Collect all announcements for sorting
    snapshot.forEach((childSnapshot) => {
      const childKey = childSnapshot.key;
      const announcement = {
        id: childKey,
        title: childSnapshot.val().Title,
        body: childSnapshot.val().Body,
        date: childSnapshot.val().Date,
        time: childSnapshot.val().Time,
        // Convert date to sortable format (yyyy-mm-dd)
        sortDate: childSnapshot.val().Date.split('/').reverse().join('-') + ' ' + childSnapshot.val().Time
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
  delBtn.addEventListener('click', () => deleteAnnouncement(announcement.id, announcement.title));
  
  titleDiv.appendChild(titleP);
  titleDiv.appendChild(delBtn);
  
  // Create content section
  const contentDiv = document.createElement("div");
  contentDiv.classList.add("content");
  
  const contentP = document.createElement("p");
  contentP.textContent = announcement.body;
  contentDiv.appendChild(contentP);
  
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

// Reset validation state on input
annTitle.addEventListener('input', () => {
  annTitle.classList.remove('is-invalid');
});

annBody.addEventListener('input', () => {
  annBody.classList.remove('is-invalid');
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadAnnouncements();
});




