// Wait for Firebase and DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Firebase configuration
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
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();
    
    // Initialize the member details modal
    const memberDetailsModal = new bootstrap.Modal(document.getElementById('memberDetailsModal'));

    // Check if user is logged in
    auth.onAuthStateChanged(function(user) {
        if (user) {
            console.log('User is logged in:', user.email);
            displayMembers(); // Only display members if user is logged in
            setupSearchListener();
            setupLogoutListener();
        } else {
            console.log('No user logged in');
            window.location.href = '../index.html'; // Redirect to login page
        }
    });

    // Function to get profile pic URL
    async function getProfilePicUrl(userId, userData) {
        try {
            // First check if the user has a photoURL in their profile
            if (userData && userData.photoURL) {
                try {
                    // Test if the URL is valid and accessible
                    const response = await fetch(userData.photoURL, { method: 'HEAD' });
                    if (response.ok) {
                        return userData.photoURL;
                    }
                } catch (e) {
                    console.log('Error checking photoURL, falling back to storage:', e);
                }
            }
            
            // Try multiple possible locations in Storage
            const possiblePaths = [
                `profile_pics/${userId}`,
                `profile_pics/${userId}.jpg`,
                `profile_pics/${userId}.png`,
                `profileImages/${userId}`,
                `profileImages/${userId}.jpg`,
                `profileImages/${userId}.png`,
                `users/${userId}/profile`,
                `users/${userId}/profile.jpg`,
                `users/${userId}/profile.png`
            ];
            
            // Try each path in order
            for (const path of possiblePaths) {
                try {
                    const url = await storage.ref(path).getDownloadURL();
                    if (url) return url;
                } catch (e) {
                    // Continue to next path
                }
            }
            
            // If gender is specified, use gender-specific default avatar
            if (userData && userData.gender) {
                const gender = userData.gender.toLowerCase();
                if (gender === 'male') {
                    return '../img/male-avatar.jpg';
                } else if (gender === 'female') {
                    return '../img/female-avatar.jpg';
                }
            }
            
            // Default fallback
            return '../img/default-avatar.jpg';
        } catch (error) {
            console.error("Error getting profile pic:", error);
            return '../img/default-avatar.jpg';
        }
    }

    // Generate initials avatar as fallback
    function generateInitialsAvatar(name) {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const context = canvas.getContext('2d');
        
        // Background gradient (blue to purple to match site theme)
        const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#4e55e1');
        gradient.addColorStop(1, '#2b1c8a');
        
        // Fill background
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Text settings
        context.fillStyle = 'white';
        context.font = 'bold 80px Poppins, Arial, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Extract initials from name
        let initials = 'U';
        if (name && typeof name === 'string') {
            const nameParts = name.trim().split(/\s+/);
            if (nameParts.length === 1) {
                initials = nameParts[0].charAt(0).toUpperCase();
            } else if (nameParts.length > 1) {
                initials = (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
            }
        }
        
        // Draw initials
        context.fillText(initials, canvas.width/2, canvas.height/2);
        
        // Convert to data URL
        return canvas.toDataURL('image/png');
    }

    // Function to display members
    async function displayMembers(query = '') {
        try {
            const membersTableBody = document.getElementById('membersTableBody');
            
            if (!membersTableBody) {
                console.error('Table body element not found!');
                return;
            }
            
            // Show loading state
            membersTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </td>
                </tr>
            `;

            // Ensure user is authenticated
            const user = auth.currentUser;
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Get users from Firestore
            const usersRef = db.collection('users');
            let querySnapshot;

            if (query) {
                querySnapshot = await usersRef
                    .where('name', '>=', query)
                    .where('name', '<=', query + '\uf8ff')
                    .get();
            } else {
                querySnapshot = await usersRef.get();
            }

            if (querySnapshot.empty) {
                membersTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center">No members found</td>
                    </tr>
                `;
                return;
            }

            // Clear and populate table
            membersTableBody.innerHTML = '';
            
            // Load and cache member data with profile pics
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'text-center mt-3 mb-3';
            loadingIndicator.innerHTML = '<span class="spinner-border spinner-border-sm text-primary me-2"></span> Loading profile images...';
            membersTableBody.appendChild(document.createElement('tr')).appendChild(document.createElement('td')).appendChild(loadingIndicator);
            
            // Process all members and add them to the table
            const membersPromises = querySnapshot.docs.map(async (doc) => {
                const userData = doc.data();
                const userId = doc.id;
                
                // Generate initials avatar as immediate fallback
                const initialsAvatar = generateInitialsAvatar(userData.name);
                
                // Set up lazy loading of the actual profile pic
                const profilePicPromise = getProfilePicUrl(userId, userData);
                
                return {
                    element: createMemberRow(userId, userData, initialsAvatar, profilePicPromise),
                    name: userData.name || ''
                };
            });
            
            // Wait for all row elements to be created (not necessarily for all profile pics to load)
            const members = await Promise.all(membersPromises);
            
            // Clear the loading indicator
            membersTableBody.innerHTML = '';
            
            // Sort by name and add to table
            members.sort((a, b) => a.name.localeCompare(b.name))
                .forEach(member => {
                    membersTableBody.appendChild(member.element);
                });

        } catch (error) {
            console.error("Error getting members:", error);
            const membersTableBody = document.getElementById('membersTableBody');
            if (membersTableBody) {
                membersTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-danger text-center">
                            Error loading members. Please try again later.<br>
                            ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
    }
    
    // Create a member row
    function createMemberRow(userId, userData, initialAvatar, profilePicPromise) {
        const row = document.createElement('tr');
        
        // Name cell with profile pic
        const nameCell = document.createElement('td');
        nameCell.className = 'member-name-cell';
        
        // Create image element with initial avatar
        const imgElement = document.createElement('img');
        imgElement.src = initialAvatar;
        imgElement.alt = userData.name || 'Member';
        imgElement.className = 'profile-pic';
        
        // Create name span
        const nameSpan = document.createElement('span');
        nameSpan.textContent = userData.name || 'N/A';
        
        // Add image and name to cell
        nameCell.appendChild(imgElement);
        nameCell.appendChild(nameSpan);
        
        // Load the actual profile picture asynchronously
        profilePicPromise.then(url => {
            // Only update if it's not the default avatar or if our URL looks like a real image
            if (url && (url !== '../img/default-avatar.jpg' || url.startsWith('http'))) {
                const newImg = new Image();
                newImg.onload = function() {
                    imgElement.src = url;
                };
                newImg.onerror = function() {
                    console.log('Error loading profile image, keeping initials avatar');
                };
                newImg.src = url;
            }
        }).catch(err => {
            console.error('Error loading profile image', err);
        });
        
        // Create other cells
        const phoneCell = document.createElement('td');
        phoneCell.textContent = userData.phno || 'N/A';
        
        const addressCell = document.createElement('td');
        addressCell.textContent = userData.address || 'N/A';
        
        const genderCell = document.createElement('td');
        genderCell.textContent = userData.gender === 'Choose...' ? 'Not Specified' : (userData.gender || 'N/A');
        
        const dobCell = document.createElement('td');
        dobCell.textContent = userData.dob || 'N/A';
        
        // Actions cell with view button
        const actionsCell = document.createElement('td');
        const viewButton = document.createElement('button');
        viewButton.className = 'btn-view';
        viewButton.innerHTML = '<i class="fas fa-eye"></i> View';
        viewButton.addEventListener('click', () => viewMember(userId));
        actionsCell.appendChild(viewButton);
        
        // Add all cells to the row
        row.appendChild(nameCell);
        row.appendChild(phoneCell);
        row.appendChild(addressCell);
        row.appendChild(genderCell);
        row.appendChild(dobCell);
        row.appendChild(actionsCell);
        
        return row;
    }

    // Function to view member details
    window.viewMember = async function(userId) {
        try {
            // Show loading state in modal
            const memberDetailsModal = document.getElementById('memberDetailsModal');
            const modalBody = memberDetailsModal.querySelector('.modal-body');
            const originalContent = modalBody.innerHTML;
            
            modalBody.innerHTML = `
                <div class="text-center p-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3">Loading member details...</p>
                </div>
            `;
            
            // Show the modal with loading state
            bootstrap.Modal.getInstance(memberDetailsModal).show();
            
            // Ensure user is authenticated
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error('User not authenticated');
            }

            const doc = await db.collection('users').doc(userId).get();
            if (doc.exists) {
                const userData = doc.data();
                
                // Generate initials avatar immediately
                const initialsAvatar = generateInitialsAvatar(userData.name);
                
                // Restore original modal content
                modalBody.innerHTML = originalContent;
                
                // Update with initial data
                document.getElementById('memberDetailsPic').src = initialsAvatar;
                document.getElementById('memberDetailsName').textContent = userData.name || 'N/A';
                document.getElementById('memberDetailsPhone').textContent = userData.phno || 'N/A';
                document.getElementById('memberDetailsAddress').textContent = userData.address || 'N/A';
                document.getElementById('memberDetailsGender').textContent = userData.gender === 'Choose...' ? 'Not Specified' : (userData.gender || 'N/A');
                document.getElementById('memberDetailsDob').textContent = userData.dob || 'N/A';
                document.getElementById('memberDetailsEmail').textContent = userData.email || 'N/A';
                
                // Load the actual profile picture asynchronously
                const profileImgElement = document.getElementById('memberDetailsPic');
                getProfilePicUrl(userId, userData).then(url => {
                    if (url && (url !== '../img/default-avatar.jpg' || url.startsWith('http'))) {
                        const newImg = new Image();
                        newImg.onload = function() {
                            profileImgElement.src = url;
                        };
                        newImg.src = url;
                    }
                }).catch(err => {
                    console.error('Error loading profile image for modal', err);
                });
            } else {
                modalBody.innerHTML = originalContent;
                alert('Member not found');
            }
        } catch (error) {
            console.error("Error viewing member:", error);
            alert('Error viewing member details');
        }
    }

    // Setup search functionality
    function setupSearchListener() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                displayMembers(e.target.value.trim());
            });
        }
    }

    // Setup logout functionality
    function setupLogoutListener() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                auth.signOut().then(() => {
                    window.location.href = '../index.html';
                }).catch((error) => {
                    console.error('Error signing out:', error);
                });
            });
        }
    }
});