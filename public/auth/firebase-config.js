// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Replace with your actual Firebase config from Firebase Console
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
const db = getFirestore(app);

// Function to add a new member
export async function addMember(memberData) {
  try {
    const docRef = await addDoc(collection(db, "members"), {
      ...memberData,
      createdAt: new Date(),
      isActive: true
    });
    console.log("Member added with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error adding member: ", error);
    throw error;
  }
}

// Function to get all members
export async function getAllMembers() {
    try {
        console.log("Fetching members...");
        const querySnapshot = await getDocs(collection(db, "members"));
        const members = [];
        querySnapshot.forEach((doc) => {
            console.log("Found member:", doc.id);
            members.push({ id: doc.id, ...doc.data() });
        });
        console.log("Total members found:", members.length);
        return members;
    } catch (error) {
        console.error("Error getting members:", error);
        throw error;
    }
}

async function displayMembers() {
    const container = document.querySelector('.members-container');
    
    try {
        // Show loading state
        container.innerHTML = '<p class="text-center">Loading members...</p>';
        
        const members = await getAllMembers();
        
        if (!members || members.length === 0) {
            container.innerHTML = '<p class="text-center">No members found</p>';
            return;
        }

        container.innerHTML = ''; // Clear loading message
        
        members.forEach(member => {
            const memberCard = `
                <div class="member-card">
                    <div class="member-image">
                        <img src="${member.photoURL || '../img/icon/defaultPic.png'}" alt="${member.name}">
                    </div>
                    <div class="member-info">
                        <h3>${member.name || 'No Name'}</h3>
                        <p class="member-role">Parish Member</p>
                        <div class="member-details">
                            <p><i class="fas fa-home"></i> ${member.address || 'N/A'}</p>
                            <p><i class="fas fa-calendar-alt"></i> DOB: ${member.dob || 'N/A'}</p>
                            <p><i class="fas fa-phone"></i> ${member.phone || 'N/A'}</p>
                            <p><i class="fas fa-envelope"></i> ${member.email || 'N/A'}</p>
                        </div>
                        <div class="social-links">
                            ${member.socialMedia?.facebook ? `<a href="${member.socialMedia.facebook}"><i class="fab fa-facebook"></i></a>` : ''}
                            ${member.socialMedia?.twitter ? `<a href="${member.socialMedia.twitter}"><i class="fab fa-twitter"></i></a>` : ''}
                            ${member.socialMedia?.instagram ? `<a href="${member.socialMedia.instagram}"><i class="fab fa-instagram"></i></a>` : ''}
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += memberCard;
        });
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="alert alert-danger text-center" role="alert">
                Error loading members. Please try again later.
                <br>
                ${error.message}
            </div>
        `;
    }
}

// Call the function when page loads
document.addEventListener('DOMContentLoaded', displayMembers); 