import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, updateDoc, getDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-storage.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";

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
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

class EventGallery {
    constructor() {
        this.events = [];
        this.currentUser = null;
        this.checkAuthState();
    }

    checkAuthState() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // Check if user is admin
                    const adminDoc = await getDocs(collection(db, 'Admin'));
                    const isAdmin = adminDoc.docs.some(doc => doc.id === user.uid);
                    
                    if (isAdmin) {
                        this.currentUser = user;
                        this.setupEventListeners();
                        this.loadEvents();
                        document.getElementById('addEventBtn')?.classList.remove('d-none');
                    } else {
                        // User is not admin, only show events
                        this.loadEvents();
                        document.getElementById('addEventBtn')?.classList.add('d-none');
                    }
                } catch (error) {
                    console.error("Error checking admin status:", error);
                    alert("Error checking permissions. Please try again later.");
                }
            } else {
                // Not logged in, redirect to login
                window.location.href = '../login.html';
            }
        });
    }

    setupEventListeners() {
        // Upload zone functionality
        const uploadZone = document.getElementById('uploadZone');
        const photoInput = document.getElementById('photoInput');

        if (uploadZone && photoInput) {
            uploadZone.addEventListener('click', () => photoInput.click());
            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.classList.add('bg-light');
            });
            uploadZone.addEventListener('dragleave', () => {
                uploadZone.classList.remove('bg-light');
            });
            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('bg-light');
                const files = e.dataTransfer.files;
                this.handleFiles(files);
            });

            photoInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }

        // Save event
        document.getElementById('saveEvent')?.addEventListener('click', async () => {
            try {
                await this.saveEvent();
            } catch (error) {
                console.error("Error in save event:", error);
                alert("Failed to save event. Please try again.");
            }
        });
    }

    handleFiles(files) {
        const preview = document.getElementById('uploadPreview');
        preview.innerHTML = '';

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            const previewItem = document.createElement('div');
            previewItem.className = 'col-4';
            previewItem.innerHTML = `
                <div class="position-relative">
                    <img src="" class="img-fluid rounded" style="height: 100px; object-fit: cover;">
                    <button type="button" class="btn-close position-absolute top-0 end-0 m-1" 
                            style="background-color: white;"></button>
                </div>
            `;

            reader.onload = (e) => {
                const img = previewItem.querySelector('img');
                img.src = e.target.result;
            };

            previewItem.querySelector('.btn-close').addEventListener('click', () => {
                previewItem.remove();
            });

            preview.appendChild(previewItem);
            reader.readAsDataURL(file);
        });
    }

    async uploadImage(file, eventId) {
        try {
            // Create a storage reference with proper path
            const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const storageRef = ref(storage, `gallery/${eventId}/${fileName}`);

            // Upload file and metadata
            const metadata = {
                contentType: file.type,
                customMetadata: {
                    'originalName': file.name,
                    'uploadDate': new Date().toISOString()
                }
            };

            // Upload the file
            const snapshot = await uploadBytes(storageRef, file, metadata);
            
            // Get download URL
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            return {
                url: downloadURL,
                path: `gallery/${eventId}/${fileName}`,
                name: fileName,
                type: file.type,
                size: file.size
            };

        } catch (error) {
            console.error("Error uploading image:", error);
            throw new Error(`Failed to upload image: ${error.message}`);
        }
    }

    async saveEvent() {
        try {
            const title = document.getElementById('eventTitle').value;
            const date = document.getElementById('eventDate').value;
            const description = document.getElementById('eventDescription').value;
            const preview = document.getElementById('uploadPreview');
            const images = preview.querySelectorAll('img');

            if (!title || !date || !description || images.length === 0) {
                alert('Please fill all fields and add at least one photo');
                return;
            }

            // Create event document first to get the ID
            const eventRef = await addDoc(collection(db, 'events'), {
                title,
                date,
                description,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                imageCount: images.length,
                status: 'uploading'
            });

            const eventId = eventRef.id;

            // Upload images with proper paths
            const uploadPromises = Array.from(images).map(async (img) => {
                const response = await fetch(img.src);
                const blob = await response.blob();
                const file = new File([blob], `image_${Date.now()}.jpg`, { type: 'image/jpeg' });
                return this.uploadImage(file, eventId);
            });

            const imageDetails = await Promise.all(uploadPromises);

            // Update event document with image details
            await updateDoc(eventRef, {
                images: imageDetails,
                status: 'complete',
                updatedAt: serverTimestamp()
            });

            // Close modal and refresh
            const modal = bootstrap.Modal.getInstance(document.getElementById('addEventModal'));
            modal.hide();
            document.getElementById('eventForm').reset();
            document.getElementById('uploadPreview').innerHTML = '';
            
            // Refresh the gallery
            await this.loadEvents();

            alert('Event saved successfully!');

        } catch (error) {
            console.error('Error saving event:', error);
            alert('Error saving event. Please try again.');
        }
    }

    async loadEvents() {
        try {
            const eventsContainer = document.getElementById('eventsContainer');
            const spinner = document.querySelector('.loading-spinner');
            
            if (!eventsContainer || !spinner) return;
            
            spinner.style.display = 'flex';
            eventsContainer.innerHTML = '';

            // Get events from public events collection
            const eventsRef = collection(db, 'events');
            const q = query(eventsRef, orderBy('date', 'desc'));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                eventsContainer.innerHTML = `
                    <div class="alert alert-info">
                        No events found. ${this.currentUser ? 'Create your first event!' : ''}
                    </div>
                `;
                spinner.style.display = 'none';
                return;
            }

            querySnapshot.forEach(doc => {
                const event = { id: doc.id, ...doc.data() };
                const eventCard = this.createEventCard(event);
                eventsContainer.appendChild(eventCard);
                
                // Initialize lightGallery
                if (event.images && event.images.length > 0) {
                    lightGallery(eventCard.querySelector('.gallery-grid'), {
                        plugins: [lgZoom, lgThumbnail],
                        speed: 500,
                        thumbnail: true,
                        download: this.currentUser ? true : false
                    });
                }
            });

            spinner.style.display = 'none';

        } catch (error) {
            console.error('Error loading events:', error);
            if (document.getElementById('eventsContainer')) {
                document.getElementById('eventsContainer').innerHTML = `
                    <div class="alert alert-danger">
                        <p>Error loading events. Please try again later.</p>
                        <button class="btn btn-outline-danger mt-2" onclick="window.location.reload()">
                            Retry
                        </button>
                    </div>
                `;
            }
        }
    }

    async deleteEvent(eventId) {
        try {
            // Get event data to delete images
            const eventDoc = await getDoc(doc(db, 'events', eventId));
            if (!eventDoc.exists()) {
                throw new Error('Event not found');
            }

            const eventData = eventDoc.data();

            // Delete images from storage
            if (eventData.images && eventData.images.length > 0) {
                const deletePromises = eventData.images.map(async (image) => {
                    try {
                        // Create reference to image in storage
                        const imageRef = ref(storage, image.path);
                        // Delete the image
                        await deleteObject(imageRef);
                    } catch (error) {
                        console.error(`Error deleting image ${image.path}:`, error);
                    }
                });

                // Wait for all images to be deleted
                await Promise.all(deletePromises);
            }

            // Delete the event document from Firestore
            await deleteDoc(doc(db, 'events', eventId));

            // Show success message
            alert('Event deleted successfully');

        } catch (error) {
            console.error('Error in deleteEvent:', error);
            throw new Error('Failed to delete event: ' + error.message);
        }
    }

    createEventCard(event) {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <div class="event-header">
                <div class="d-flex justify-content-between align-items-start">
                    <h3>${event.title}</h3>
                    ${this.currentUser ? `
                        <span class="badge bg-${event.status === 'complete' ? 'success' : 'warning'}">
                            ${event.status}
                        </span>
                    ` : ''}
                </div>
                <div class="event-date">
                    <i class="fas fa-calendar-alt"></i>
                    ${new Date(event.date).toLocaleDateString()}
                </div>
                <p class="mt-2">${event.description}</p>
            </div>
            <div class="gallery-grid">
                ${event.images ? event.images.map(img => `
                    <a href="${img.url}" class="gallery-item" 
                       data-src="${img.url}"
                       data-sub-html="<h4>${event.title}</h4><p>${img.name}</p>">
                        <img src="${img.url}" alt="Event photo">
                        <div class="overlay">
                            <i class="fas fa-search-plus"></i>
                        </div>
                    </a>
                `).join('') : ''}
            </div>
            ${this.currentUser ? `
                <div class="event-footer mt-3 d-flex justify-content-end gap-2">
                    <button class="btn btn-outline-danger btn-sm delete-event" data-id="${event.id}">
                        <i class="fas fa-trash"></i> Delete Event
                    </button>
                </div>
            ` : ''}
        `;

        // Add delete event listener if user is admin
        if (this.currentUser) {
            const deleteBtn = card.querySelector('.delete-event');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (confirm('Are you sure you want to delete this event and all its images? This action cannot be undone.')) {
                        try {
                            await this.deleteEvent(event.id);
                            card.remove();
                        } catch (error) {
                            console.error('Error deleting event:', error);
                            alert('Error deleting event. Please try again.');
                        }
                    }
                });
            }
        }

        return card;
    }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EventGallery();
}); 