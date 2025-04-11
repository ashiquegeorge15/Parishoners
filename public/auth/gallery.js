import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, updateDoc, getDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-storage.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";

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
        this.setupGlobalEventListeners();
    }

    // New method to setup global event listeners like logout
    setupGlobalEventListeners() {
        // Setup logout button
        document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                // Redirect will happen automatically due to onAuthStateChanged
            } catch (error) {
                console.error("Error signing out:", error);
                alert("Error signing out. Please try again.");
            }
        });
    }

    checkAuthState() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // Always load events for all users first
                    await this.loadEvents();
                    
                    try {
                        // Check if user is admin - simplified approach
                        const adminRef = doc(db, 'Admin', user.uid);
                        
                        try {
                            const adminDoc = await getDoc(adminRef);
                            
                            if (adminDoc.exists()) {
                                // User is admin, enable admin features
                                this.currentUser = user;
                                
                                // Add upload button if not already present
                                const addButton = document.getElementById('addEventBtn');
                                if (addButton) {
                                    addButton.classList.remove('d-none');
                                } else {
                                    // Create button if it doesn't exist
                                    this.createAddButton();
                                }
                                
                                // Setup upload event listeners
                                this.setupEventListeners();
                            } else {
                                // User is not admin, hide admin controls
                                const addButton = document.getElementById('addEventBtn');
                                if (addButton) {
                                    addButton.classList.add('d-none');
                                }
                            }
                        } catch (permissionError) {
                            console.log("User is not an admin:", permissionError.message);
                            // Silently fail - user doesn't have admin privileges
                            const addButton = document.getElementById('addEventBtn');
                            if (addButton) {
                                addButton.classList.add('d-none');
                            }
                        }
                    } catch (adminError) {
                        console.error("Error in admin check:", adminError);
                        // Don't show error to user, just hide admin controls
                        const addButton = document.getElementById('addEventBtn');
                        if (addButton) {
                            addButton.classList.add('d-none');
                        }
                    }
                } catch (galleryError) {
                    console.error("Error loading gallery:", galleryError);
                    const eventsContainer = document.getElementById('eventsContainer');
                    if (eventsContainer) {
                        eventsContainer.innerHTML = `
                            <div class="alert alert-danger">
                                <p>There was a problem loading the gallery. Please try refreshing the page.</p>
                                <button class="btn btn-outline-danger mt-2" onclick="window.location.reload()">
                                    Reload Page
                                </button>
                            </div>
                        `;
                    }
                }
            } else {
                // Not logged in, redirect to login
                window.location.href = '../login.html';
            }
        });
    }

    // Helper method to create add button if needed
    createAddButton() {
        const existingButton = document.getElementById('addEventBtn');
        if (!existingButton) {
            const button = document.createElement('button');
            button.id = 'addEventBtn';
            button.innerHTML = '<i class="fas fa-plus me-2"></i> Add Images';
            button.className = ''; // No d-none class
            button.setAttribute('data-bs-toggle', 'modal');
            button.setAttribute('data-bs-target', '#uploadModal');
            document.body.appendChild(button);
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

            console.log(`Attempting to upload to: gallery/${eventId}/${fileName}`);

            // Implement retry logic for upload
            let attempts = 0;
            const maxAttempts = 3;
            let lastError = null;
            
            while (attempts < maxAttempts) {
                try {
                    attempts++;
                    console.log(`Upload attempt ${attempts} for ${fileName}`);
                    
                    const snapshot = await uploadBytes(storageRef, resizedImage, metadata);
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    
                    console.log(`Successfully uploaded image after ${attempts} attempt(s)`);
                    
                    return {
                        url: downloadURL,
                        path: `gallery/${eventId}/${fileName}`,
                        name: fileName,
                        type: file.type,
                        size: resizedImage.size
                    };
                } catch (uploadError) {
                    lastError = uploadError;
                    console.warn(`Upload attempt ${attempts} failed:`, uploadError.message);
                    
                    // Wait before retrying
                    if (attempts < maxAttempts) {
                        console.log(`Waiting before retry...`);
                        await new Promise(resolve => setTimeout(resolve, 1500 * attempts)); // Increase wait time with each attempt
                    }
                }
            }
            
            // If we get here, all attempts failed
            console.error(`All ${maxAttempts} upload attempts failed for ${fileName}`);
            throw lastError || new Error('Upload failed after multiple attempts');
            
        } catch (error) {
            console.error("Error uploading image:", error);
            throw error; // Propagate the error up
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

            // Disable save button to prevent double submissions
            const saveButton = document.getElementById('saveEvent');
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Uploading...';
            }

            try {
                // Create event document first to get the ID
                const eventRef = await addDoc(collection(db, 'events'), {
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    imageCount: images.length,
                    status: 'uploading',
                    date: new Date().toISOString() // Current date for ordering
                });

                const eventId = eventRef.id;
                console.log(`Created event with ID: ${eventId}`);

                // Upload images with proper paths
                const uploadPromises = [];
                const failedImages = [];
                
                for (let i = 0; i < images.length; i++) {
                    const img = images[i];
                    try {
                        console.log(`Processing image ${i + 1}/${images.length}`);
                        const response = await fetch(img.src);
                        const blob = await response.blob();
                        const file = new File([blob], `image_${Date.now()}.jpg`, { type: 'image/jpeg' });
                        const imageDetails = await this.uploadImage(file, eventId);
                        uploadPromises.push(imageDetails);
                    } catch (err) {
                        console.error(`Error processing image ${i + 1}:`, err);
                        failedImages.push(i + 1);
                    }
                }

                if (uploadPromises.length === 0) {
                    throw new Error("All image uploads failed");
                }

                // Update event document with image details
                await updateDoc(eventRef, {
                    images: uploadPromises,
                    status: uploadPromises.length === images.length ? 'complete' : 'partial',
                    imageCount: uploadPromises.length,
                    updatedAt: serverTimestamp()
                });

                // Close modal and refresh
                const modal = bootstrap.Modal.getInstance(document.getElementById('uploadModal'));
                modal.hide();
                document.getElementById('uploadPreview').innerHTML = '';
                
                // Refresh the gallery
                await this.loadEvents();

                if (failedImages.length > 0) {
                    alert(`${uploadPromises.length} images uploaded successfully. ${failedImages.length} images failed to upload.`);
                } else {
                    alert('All images uploaded successfully!');
                }
            } catch (uploadError) {
                console.error('Error during upload process:', uploadError);
                alert('Failed to upload images. Please ensure you have permission and try again with smaller images.');
            }

            // Re-enable save button
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = 'Upload';
            }
        } catch (error) {
            console.error('Error in save event process:', error);
            alert('An unexpected error occurred. Please try again later.');
            
            // Re-enable save button
            const saveButton = document.getElementById('saveEvent');
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = 'Upload';
            }
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
                // Initialize lightGallery with development settings to suppress license warning
                const galleryOptions = {
                    selector: '.gallery-link',
                    plugins: [lgZoom, lgThumbnail],
                    speed: 500,
                    thumbnail: true,
                    download: this.currentUser ? true : false,
                    mode: 'lg-fade',
                    backdropDuration: 300,
                    loop: false,
                    counter: false,
                    hideScrollbar: true,
                    mobileSettings: {
                        controls: true,
                        showCloseIcon: true,
                        download: false
                    }
                };
                
                // For development mode, suppress license warning
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    // Monkey patch to suppress the warning in development
                    const originalConsoleWarn = console.warn;
                    console.warn = function(msg) {
                        if (msg && typeof msg === 'string' && msg.includes('lightGallery:')) {
                            return; // Suppress lightGallery license warnings
                        }
                        originalConsoleWarn.apply(console, arguments);
                    };
                }
                
                lightGallery(galleryGrid, galleryOptions);
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