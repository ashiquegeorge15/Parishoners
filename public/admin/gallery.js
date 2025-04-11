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
auth.useDeviceLanguage(); // Optional: Set language to device language

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
                        this.loadProfilePicture(user.uid);
                    } else {
                        // User is not admin, only show events
                        this.loadEvents();
                    }
                    
                    // Make upload button visible in header
                    const uploadBtn = document.getElementById('addEventBtn');
                    if (uploadBtn) {
                        if (isAdmin) {
                            uploadBtn.classList.remove('d-none');
                        } else {
                            uploadBtn.classList.add('d-none');
                        }
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
    
    async loadProfilePicture(userId) {
        try {
            // Get user profile data from Firestore
            const userDoc = await getDoc(doc(db, "users", userId));
            
            // If user has a profile picture, update the image
            if (userDoc.exists() && userDoc.data().profilePic && userDoc.data().profilePic.url) {
                const profileImg = document.querySelector('.profile-img');
                if (profileImg) {
                    profileImg.src = userDoc.data().profilePic.url;
                    console.log("Profile picture updated");
                }
            } else {
                console.log("No profile picture found or user doesn't exist");
            }
        } catch (error) {
            console.error("Error loading profile picture:", error);
        }
    }

    setupEventListeners() {
        // Upload zone functionality
        const uploadZone = document.getElementById('uploadZone');
        const photoInput = document.getElementById('photoInput');

        if (uploadZone && photoInput) {
            uploadZone.addEventListener('click', () => photoInput.click());
            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.classList.add('drag-over');
            });
            uploadZone.addEventListener('dragleave', () => {
                uploadZone.classList.remove('drag-over');
            });
            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                this.handleFiles(files);
            });

            photoInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }

        // Save images
        document.getElementById('saveEvent')?.addEventListener('click', async () => {
            try {
                await this.saveEvent();
            } catch (error) {
                console.error("Error in save event:", error);
                alert("Failed to upload images. Please try again.");
            }
        });
    }

    handleFiles(files) {
        const preview = document.getElementById('uploadPreview');
        preview.innerHTML = '';

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) {
                alert('Please upload only image files');
                return;
            }

            const reader = new FileReader();
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <div class="position-relative">
                    <img src="" class="preview-image">
                    <button type="button" class="delete-image">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;

            reader.onload = (e) => {
                const img = previewItem.querySelector('img');
                img.src = e.target.result;
            };

            previewItem.querySelector('.delete-image').addEventListener('click', () => {
                previewItem.remove();
            });

            preview.appendChild(previewItem);
            reader.readAsDataURL(file);
        });
    }

    async uploadImage(file, eventId) {
        try {
            // Resize image before upload
            const resizedImage = await this.resizeImage(file, 1920); // Max width 1920px
            const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const storageRef = ref(storage, `gallery/${eventId}/${fileName}`);

            const metadata = {
                contentType: file.type,
                customMetadata: {
                    'originalName': file.name,
                    'uploadDate': new Date().toISOString()
                }
            };

            // Upload the resized file
            const snapshot = await uploadBytes(storageRef, resizedImage, metadata);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            return {
                url: downloadURL,
                path: `gallery/${eventId}/${fileName}`,
                name: fileName,
                type: file.type,
                size: resizedImage.size
            };
        } catch (error) {
            console.error("Error uploading image:", error);
            throw new Error(`Failed to upload image: ${error.message}`);
        }
    }

    // Add new method for image resizing
    async resizeImage(file, maxWidth) {
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
                    }, file.type, 0.9); // 0.9 quality
                };
            };
        });
    }

    async saveEvent() {
        try {
            const preview = document.getElementById('uploadPreview');
            const images = preview.querySelectorAll('img');

            if (images.length === 0) {
                alert('Please select at least one image to upload');
                return;
            }

            // Create event document first to get the ID
            const eventRef = await addDoc(collection(db, 'events'), {
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                imageCount: images.length,
                status: 'uploading',
                date: new Date().toISOString() // Current date for ordering
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
            const modal = bootstrap.Modal.getInstance(document.getElementById('uploadModal'));
            modal.hide();
            document.getElementById('uploadPreview').innerHTML = '';
            
            // Refresh the gallery
            await this.loadEvents();

            alert('Images uploaded successfully!');

        } catch (error) {
            console.error('Error saving event:', error);
            alert('Error uploading images. Please try again.');
        }
    }

    async loadEvents() {
        try {
            const eventsContainer = document.getElementById('eventsContainer');
            const spinner = document.querySelector('.loading-spinner');
            
            if (!eventsContainer) return;
            
            if (spinner) spinner.style.display = 'flex';
            eventsContainer.innerHTML = '';

            const galleryGrid = document.createElement('div');
            galleryGrid.className = 'gallery-grid';
            eventsContainer.appendChild(galleryGrid);

            const eventsRef = collection(db, 'events');
            const q = query(eventsRef, orderBy('date', 'desc'));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                eventsContainer.innerHTML = `
                    <div class="alert alert-info">
                        No images found. ${this.currentUser ? 'Upload your first image!' : ''}
                    </div>
                `;
                if (spinner) spinner.style.display = 'none';
                return;
            }

            let validImagesCount = 0;

            for (const docSnapshot of querySnapshot.docs) {
                const event = { id: docSnapshot.id, ...docSnapshot.data() };
                if (event.images && event.images.length > 0) {
                    event.images.forEach((img, index) => {
                        if (img.url && img.url.trim() !== '') {
                            validImagesCount++;
                            const imageItem = document.createElement('div');
                            imageItem.className = 'gallery-item';
                            imageItem.innerHTML = `
                                <a href="${img.url}" 
                                   data-src="${img.url}"
                                   class="gallery-link"
                                >
                                    <img src="${img.url}" 
                                         alt="Gallery image" 
                                         loading="lazy"
                                         onerror="this.parentElement.parentElement.remove()"
                                    >
                                    <div class="overlay">
                                        <i class="fas fa-expand"></i>
                                    </div>
                                </a>
                                ${this.currentUser ? `
                                    <button class="delete-image" 
                                            data-event-id="${event.id}" 
                                            data-image-index="${index}"
                                            data-image-path="${img.path}"
                                            title="Delete image">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : ''}
                            `;

                            // Add delete event listener
                            const deleteBtn = imageItem.querySelector('.delete-image');
                            if (deleteBtn) {
                                deleteBtn.addEventListener('click', async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    if (confirm('Are you sure you want to delete this image?')) {
                                        try {
                                            const eventId = deleteBtn.dataset.eventId;
                                            const imageIndex = parseInt(deleteBtn.dataset.imageIndex);
                                            const imagePath = deleteBtn.dataset.imagePath;

                                            // Show loading state
                                            deleteBtn.disabled = true;
                                            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                                            await this.deleteImage(eventId, imageIndex, imagePath);
                                            imageItem.remove();

                                            // Update valid images count
                                            validImagesCount--;
                                            if (validImagesCount === 0) {
                                                eventsContainer.innerHTML = `
                                                    <div class="alert alert-info">
                                                        No images found. ${this.currentUser ? 'Upload your first image!' : ''}
                                                    </div>
                                                `;
                                            }
                                        } catch (error) {
                                            console.error('Error deleting image:', error);
                                            alert('Error deleting image. Please try again.');
                                            // Reset button state
                                            deleteBtn.disabled = false;
                                            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                                        }
                                    }
                                });
                            }

                            galleryGrid.appendChild(imageItem);
                        }
                    });
                }
            }

            if (validImagesCount === 0) {
                eventsContainer.innerHTML = `
                    <div class="alert alert-info">
                        No valid images found. ${this.currentUser ? 'Upload your first image!' : ''}
                    </div>
                `;
            } else {
                lightGallery(galleryGrid, {
                    plugins: [lgZoom, lgThumbnail],
                    speed: 500,
                    thumbnail: true,
                    download: this.currentUser ? true : false,
                    selector: '.gallery-link'
                });
            }

            if (spinner) spinner.style.display = 'none';

        } catch (error) {
            console.error('Error loading events:', error);
            if (document.getElementById('eventsContainer')) {
                document.getElementById('eventsContainer').innerHTML = `
                    <div class="alert alert-danger">
                        <p>Error loading images. Please try again later.</p>
                        <button class="btn btn-outline-danger mt-2" onclick="window.location.reload()">
                            Retry
                        </button>
                    </div>
                `;
            }
        }
    }

    async deleteImage(eventId, imageIndex, imagePath) {
        try {
            // Get the current event document
            const eventRef = doc(db, 'events', eventId);
            const eventDoc = await getDoc(eventRef);
            
            if (!eventDoc.exists()) {
                throw new Error('Event not found');
            }

            const eventData = eventDoc.data();
            const images = [...eventData.images];

            // Delete image from storage
            const imageRef = ref(storage, imagePath);
            await deleteObject(imageRef);

            // Remove the image from the array
            images.splice(imageIndex, 1);

            // Update or delete the event document
            if (images.length === 0) {
                // If no images left, delete the entire event
                await deleteDoc(eventRef);
            } else {
                // Update event with remaining images
                await updateDoc(eventRef, {
                    images: images,
                    imageCount: images.length,
                    updatedAt: serverTimestamp()
                });
            }

        } catch (error) {
            console.error('Error in deleteImage:', error);
            throw error;
        }
    }

    createEventCard(event) {
        const card = document.createElement('div');
        card.className = 'gallery-section';
        card.innerHTML = `
            <div class="gallery-grid">
                ${event.images ? event.images.map(img => `
                    <div class="gallery-item">
                        <a href="${img.url}" 
                           data-src="${img.url}"
                           class="gallery-link"
                           data-sub-html="<p>${new Date(event.date).toLocaleDateString()}</p>"
                        >
                            <img src="${img.url}" alt="Gallery image" loading="lazy">
                            <div class="overlay">
                                <i class="fas fa-expand"></i>
                            </div>
                        </a>
                        ${this.currentUser ? `
                            <button class="delete-image" data-id="${event.id}" title="Delete image">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                `).join('') : ''}
            </div>
        `;

        // Add delete event listener if user is admin
        if (this.currentUser) {
            const deleteButtons = card.querySelectorAll('.delete-image');
            deleteButtons.forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
                        try {
                            await this.deleteEvent(btn.dataset.id);
                            btn.closest('.gallery-item').remove();
                        } catch (error) {
                            console.error('Error deleting image:', error);
                            alert('Error deleting image. Please try again.');
                        }
                    }
                });
            });
        }

        return card;
    }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EventGallery();
}); 