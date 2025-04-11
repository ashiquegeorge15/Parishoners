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

// Initialize Firebase services
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Check if user is admin
async function checkIfAdmin(user) {
    if (!user) return false;
    try {
        const adminDoc = await db.collection('Admin').doc(user.uid).get();
        return adminDoc.exists;
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

// Function to load admin profile picture
async function loadAdminProfilePicture(userId) {
    try {
        // Get user profile data from Firestore
        const userDoc = await db.collection('users').doc(userId).get();
        
        // If user has a profile picture, update the image
        if (userDoc.exists && userDoc.data().profilePic && userDoc.data().profilePic.url) {
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

// Function to fetch user/admin details
async function getUserDetails(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const adminDoc = await db.collection('Admin').doc(userId).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            return {
                ...userData,
                profilePicUrl: userData.profilePic?.url || null,
                adminSince: adminDoc.exists ? adminDoc.data().createdAt : null,
                lastLogin: userData.lastLogin || null,
                userId: userId,
                isAdmin: adminDoc.exists
            };
        }
        return null;
    } catch (error) {
        console.error("Error fetching user details:", error);
        return null;
    }
}

// Function to create user card
function createUserCard(user, docId) {
    const isAdmin = user.isAdmin;
    const profilePicUrl = user.profilePic?.url || user.profilePicUrl || '../img/icon/defaultPic.png';
    
    return `
        <tr class="list-item ${isAdmin ? 'table-info' : ''} align-middle" data-id="${docId}">
            <td class="text-center">
                <div class="d-flex align-items-center justify-content-center">
                    <div class="position-relative">
                        <img src="${profilePicUrl}" 
                             alt="User Photo" 
                             class="rounded-circle shadow-sm" 
                             style="width: 45px; height: 45px; object-fit: cover;">
                        ${isAdmin ? 
                            `<span class="position-absolute bottom-0 end-0">
                                <i class="fas fa-shield-alt text-primary"></i>
                             </span>` : ''}
                    </div>
                </div>
            </td>
            <td>
                <div class="d-flex flex-column">
                    <strong class="text-primary">${user.name || 'No Name'}</strong>
                    <small class="text-muted">
                        <i class="fas fa-calendar-alt me-1"></i>
                        ${user.dob || 'No DOB'}
                    </small>
                </div>
            </td>
            <td>
                <div class="d-flex flex-column">
                    <span><i class="fas fa-phone me-1"></i>${user.phno || 'No Phone'}</span>
                    <small class="text-muted">
                        <i class="fas fa-envelope me-1"></i>
                        ${user.email || 'No Email'}
                    </small>
                </div>
            </td>
            <td>
                <div class="d-flex flex-column">
                    <span><i class="fas fa-map-marker-alt me-1"></i>${user.address || 'No Address'}</span>
                </div>
            </td>
            <td>
                <div class="d-flex flex-column">
                    <span><i class="fas fa-venus-mars me-1"></i>${user.gender || 'Not Specified'}</span>
                </div>
            </td>
            <td class="actions text-end">
                <div class="btn-group shadow-sm">
                    <button class="btn btn-sm btn-outline-primary view-user" 
                            data-id="${docId}" 
                            title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning edit-user" 
                            data-id="${docId}" 
                            title="Edit User">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${isAdmin ? 
                        `<button class="btn btn-sm btn-outline-info demote-admin" 
                                data-id="${docId}" 
                                data-name="${user.name}"
                                title="Demote from Admin">
                            <i class="fas fa-user-minus"></i>
                        </button>` : 
                        `<button class="btn btn-sm btn-outline-success promote-admin" 
                                data-id="${docId}" 
                                data-name="${user.name}"
                                title="Promote to Admin">
                            <i class="fas fa-user-plus"></i>
                        </button>`
                    }
                    <button class="btn btn-sm btn-outline-danger delete-user" 
                            data-id="${docId}" 
                            data-name="${user.name}"
                            title="Delete User">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Function to show user details in a modal
async function showUserDetails(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            alert('User not found!');
            return;
        }

        const userData = userDoc.data();
        const isAdmin = (await db.collection('Admin').doc(userId).get()).exists;
        const lastLogin = userData.lastLogin ? new Date(userData.lastLogin.toDate()).toLocaleString() : 'Never';
        const createdAt = userData.createdAt ? new Date(userData.createdAt.toDate()).toLocaleString() : 'Unknown';
        const profilePicUrl = userData.profilePic?.url || '../img/icon/defaultPic.png';

        const modalHtml = `
            <div class="modal fade" id="viewUserModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header ${isAdmin ? 'bg-primary' : 'bg-success'} text-white">
                            <h5 class="modal-title">
                                <i class="fas ${isAdmin ? 'fa-user-shield' : 'fa-user'}"></i>
                                User Details
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-4 text-center mb-3">
                                    <img src="${profilePicUrl}" 
                                         class="rounded-circle shadow img-thumbnail mb-3" 
                                         style="width: 150px; height: 150px; object-fit: cover;">
                                    <h4 class="text-primary mb-1">${userData.name || 'No Name'}</h4>
                                    <span class="badge ${isAdmin ? 'bg-primary' : 'bg-success'} mb-3">
                                        ${isAdmin ? 'Administrator' : 'Member'}
                                    </span>
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-sm btn-outline-primary edit-user-btn" 
                                                data-id="${userId}">
                                            <i class="fas fa-edit me-1"></i>Edit Profile
                                        </button>
                                    </div>
                                </div>
                                <div class="col-md-8">
                                    <div class="card mb-3">
                                        <div class="card-body">
                                            <h5 class="card-title">Personal Information</h5>
                                            <div class="row g-3">
                                                <div class="col-md-6">
                                                    <p><strong><i class="fas fa-venus-mars me-2"></i>Gender:</strong><br>
                                                    ${userData.gender || 'Not Specified'}</p>
                                                </div>
                                                <div class="col-md-6">
                                                    <p><strong><i class="fas fa-birthday-cake me-2"></i>Date of Birth:</strong><br>
                                                    ${userData.dob || 'Not Specified'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="card mb-3">
                                        <div class="card-body">
                                            <h5 class="card-title">Contact Information</h5>
                                            <div class="row g-3">
                                                <div class="col-md-6">
                                                    <p><strong><i class="fas fa-phone me-2"></i>Phone:</strong><br>
                                                    ${userData.phno || 'Not Specified'}</p>
                                                </div>
                                                <div class="col-md-6">
                                                    <p><strong><i class="fas fa-envelope me-2"></i>Email:</strong><br>
                                                    ${userData.email || 'Not Specified'}</p>
                                                </div>
                                                <div class="col-12">
                                                    <p><strong><i class="fas fa-map-marker-alt me-2"></i>Address:</strong><br>
                                                    ${userData.address || 'Not Specified'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="card">
                                        <div class="card-body">
                                            <h5 class="card-title">Account Information</h5>
                                            <div class="row g-3">
                                                <div class="col-md-6">
                                                    <p><strong><i class="fas fa-clock me-2"></i>Last Login:</strong><br>
                                                    ${lastLogin}</p>
                                                </div>
                                                <div class="col-md-6">
                                                    <p><strong><i class="fas fa-calendar-plus me-2"></i>Created:</strong><br>
                                                    ${createdAt}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('viewUserModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to document
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('viewUserModal'));
        modal.show();

        // Add event listener to edit button in modal
        document.querySelector('.edit-user-btn').addEventListener('click', () => {
            modal.hide();
            const editBtn = document.querySelector(`.edit-user[data-id="${userId}"]`);
            if (editBtn) {
                editBtn.click();
            }
        });

    } catch (error) {
        console.error("Error showing user details:", error);
        alert('Error showing user details: ' + error.message);
    }
}

// Function to fetch unique users
async function fetchUniqueUsers() {
    try {
        const snapshot = await db.collection('users').get();
        const users = [];
        const uniqueEmails = new Set();

        for (const doc of snapshot.docs) {
            const user = await getUserDetails(doc.id);
            if (user && !uniqueEmails.has(user.email)) {
                uniqueEmails.add(user.email);
                users.push(user);
            }
        }

        return users;
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
}

// Function to display users
async function displayUsers() {
    try {
        const container = document.querySelector('.members-container');
        if (!container) return;

        // Show loading state
        container.innerHTML = `
            <div class="table-container">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div class="col-md-6">
                        <div class="input-group">
                            <span class="input-group-text">
                                <i class="fas fa-search"></i>
                            </span>
                            <input type="text" 
                                id="searchInput" 
                                class="form-control" 
                                placeholder="Search members...">
                            <button class="btn btn-outline-secondary" type="button" id="clearSearch">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div>
                        <button class="btn btn-success me-2" id="addNewMemberBtn">
                            <i class="fas fa-plus"></i> Add New Member
                        </button>
                    </div>
                </div>
                <div id="usersContent">
                    <div class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const users = await fetchUniqueUsers();
        const admins = users.filter(user => user.isAdmin);
        const regularUsers = users.filter(user => !user.isAdmin);

        const contentDiv = document.getElementById('usersContent');
        if (!contentDiv) return;

        // Create stats cards
        contentDiv.innerHTML = `
            <!-- Stats Cards -->
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="card bg-primary text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 class="card-title mb-0">Total Members</h5>
                                    <h2 class="mt-2 mb-0">${users.length}</h2>
                                </div>
                                <div>
                                    <i class="fas fa-users fa-3x opacity-50"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-success text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 class="card-title mb-0">Regular Users</h5>
                                    <h2 class="mt-2 mb-0">${regularUsers.length}</h2>
                                </div>
                                <div>
                                    <i class="fas fa-user fa-3x opacity-50"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-info text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 class="card-title mb-0">Administrators</h5>
                                    <h2 class="mt-2 mb-0">${admins.length}</h2>
                                </div>
                                <div>
                                    <i class="fas fa-user-shield fa-3x opacity-50"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Admin Users Table -->
            <div class="section-title">
                <i class="fas fa-user-shield me-2"></i>Administrators (${admins.length})
                </div>
            <div class="table-responsive mb-4">
                <table class="table users-table admin-table">
                            <thead>
                                <tr>
                            <th style="width: 60px">Photo</th>
                            <th>Name / DOB</th>
                                    <th>Contact</th>
                                    <th>Address</th>
                            <th>Gender</th>
                            <th style="width: 180px">Actions</th>
                                </tr>
                            </thead>
                    <tbody>
                        ${admins.length > 0 
                            ? admins.map(user => createUserCard(user, user.userId)).join('')
                            : `<tr><td colspan="6" class="empty-message">No administrators found</td></tr>`
                        }
                            </tbody>
                        </table>
                    </div>

            <!-- Regular Users Table -->
            <div class="section-title">
                <i class="fas fa-users me-2"></i>Regular Members (${regularUsers.length})
            </div>
                    <div class="table-responsive">
                <table class="table users-table">
                            <thead>
                                <tr>
                            <th style="width: 60px">Photo</th>
                            <th>Name / DOB</th>
                                    <th>Contact</th>
                                    <th>Address</th>
                            <th>Gender</th>
                            <th style="width: 180px">Actions</th>
                                </tr>
                            </thead>
                    <tbody>
                        ${regularUsers.length > 0 
                            ? regularUsers.map(user => createUserCard(user, user.userId)).join('')
                            : `<tr><td colspan="6" class="empty-message">No regular members found</td></tr>`
                        }
                            </tbody>
                        </table>
            </div>
        `;

        // Add event listeners for search and filter
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.trim().toLowerCase();
                const filteredUsers = filterUsers(users, searchTerm);
                
                const filteredAdmins = filteredUsers.filter(user => user.isAdmin);
                const filteredRegularUsers = filteredUsers.filter(user => !user.isAdmin);
                
                document.querySelector('.admin-table tbody').innerHTML = 
                    filteredAdmins.length > 0 
                        ? filteredAdmins.map(user => createUserCard(user, user.userId)).join('')
                        : `<tr><td colspan="6" class="empty-message">No matching administrators</td></tr>`;
                
                document.querySelector('.users-table:not(.admin-table) tbody').innerHTML = 
                    filteredRegularUsers.length > 0 
                        ? filteredRegularUsers.map(user => createUserCard(user, user.userId)).join('')
                        : `<tr><td colspan="6" class="empty-message">No matching members</td></tr>`;
            });
        }

        const clearSearchBtn = document.getElementById('clearSearch');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.dispatchEvent(new Event('input'));
                }
            });
        }

        // Add event listeners for user actions
        addUserActionListeners();

    } catch (error) {
        console.error("Error displaying users:", error);
        const container = document.querySelector('.members-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error loading members: ${error.message}
                </div>
            `;
        }
    }
}

// Filter users based on search term
function filterUsers(users, searchTerm) {
    if (!searchTerm) return users;
    
    return users.filter(user => matchesSearch(user, searchTerm));
}

// Check if user matches search term
function matchesSearch(user, searchTerm) {
    return (
        (user.name && user.name.toLowerCase().includes(searchTerm)) ||
        (user.email && user.email.toLowerCase().includes(searchTerm)) ||
        (user.phno && user.phno.toLowerCase().includes(searchTerm)) ||
        (user.address && user.address.toLowerCase().includes(searchTerm)) ||
        (user.gender && user.gender.toLowerCase().includes(searchTerm)) ||
        (user.dob && user.dob.toLowerCase().includes(searchTerm))
    );
}

// Add event listeners for user management buttons
function addUserActionListeners() {
    // View User
    document.querySelectorAll('.view-user').forEach(button => {
        button.addEventListener('click', (e) => {
            const docId = e.currentTarget.dataset.id;
            showUserDetails(docId);
        });
    });

    // Promote to Admin
    document.querySelectorAll('.promote-admin').forEach(button => {
        button.addEventListener('click', async (e) => {
            try {
                const docId = e.currentTarget.dataset.id;
                const userName = e.currentTarget.dataset.name;
                
                const confirmPromote = confirm(`Are you sure you want to promote ${userName} to administrator?`);
                if (confirmPromote) {
                    // Add to Admin collection
                    await db.collection('Admin').doc(docId).set({
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Update user document with admin role
                    await db.collection('users').doc(docId).update({
                        role: 'admin',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    alert(`${userName} has been promoted to administrator successfully.`);
                    await displayUsers(); // Refresh the user list
                }
            } catch (error) {
                console.error("Error promoting user to admin:", error);
                alert(`Failed to promote user: ${error.message}`);
            }
        });
    });
    
    // Demote from Admin
    document.querySelectorAll('.demote-admin').forEach(button => {
        button.addEventListener('click', async (e) => {
            try {
                const docId = e.currentTarget.dataset.id;
                const userName = e.currentTarget.dataset.name;
                
                const confirmDemote = confirm(`Are you sure you want to remove admin privileges from ${userName}?`);
                if (confirmDemote) {
                    // Delete from Admin collection
                    await db.collection('Admin').doc(docId).delete();
                    
                    // Update user document with regular role
                    await db.collection('users').doc(docId).update({
                        role: 'member',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    alert(`${userName} has been demoted to regular member successfully.`);
                    await displayUsers(); // Refresh the user list
                }
            } catch (error) {
                console.error("Error demoting admin:", error);
                alert(`Failed to demote user: ${error.message}`);
            }
        });
    });
    
    // Delete User
    document.querySelectorAll('.delete-user').forEach(button => {
        button.addEventListener('click', async (e) => {
            try {
                const docId = e.currentTarget.dataset.id;
                const userName = e.currentTarget.dataset.name;
                
                const confirmDelete = confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`);
                if (confirmDelete) {
                    // Check if user has a profile picture and delete it
                    const userDoc = await db.collection('users').doc(docId).get();
                    if (userDoc.exists && userDoc.data().profilePic && userDoc.data().profilePic.path) {
                        try {
                            // Create reference to Firebase Storage
                            const storage = firebase.storage();
                            const profilePicRef = storage.ref(userDoc.data().profilePic.path);
                            await profilePicRef.delete();
                            console.log("User profile picture deleted successfully");
                        } catch (storageError) {
                            console.error("Error deleting profile picture:", storageError);
                            // Continue with deletion even if picture deletion fails
                        }
                    }
                    
                    // Delete from users collection
                    await db.collection('users').doc(docId).delete();
                    
                    // Delete from Admin collection if they were an admin
                    const adminDoc = await db.collection('Admin').doc(docId).get();
                    if (adminDoc.exists) {
                        await db.collection('Admin').doc(docId).delete();
                    }
                    
                    alert(`${userName} has been deleted successfully.`);
                    await displayUsers(); // Refresh the user list
                }
            } catch (error) {
                console.error("Error deleting user:", error);
                alert(`Failed to delete user: ${error.message}`);
            }
        });
    });
    
    // Edit User
    document.querySelectorAll('.edit-user').forEach(button => {
        button.addEventListener('click', async (e) => {
            try {
                const docId = e.currentTarget.dataset.id;
                const userDoc = await db.collection('users').doc(docId).get();
                
                if (!userDoc.exists) {
                    alert('User not found!');
                    return;
                }
                
                const userData = userDoc.data();
                
                // Create edit modal
                const modalHtml = `
                    <div class="modal fade" id="editUserModal" tabindex="-1">
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header bg-primary text-white">
                                    <h5 class="modal-title">
                                        <i class="fas fa-user-edit"></i> Edit User
                                    </h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <form id="editUserForm">
                                        <input type="hidden" id="editUserId" value="${docId}">
                                        
                                        <div class="mb-3">
                                            <label for="editName" class="form-label">Name</label>
                                            <input type="text" class="form-control" id="editName" value="${userData.name || ''}" required>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="editPhone" class="form-label">Phone</label>
                                            <input type="tel" class="form-control" id="editPhone" value="${userData.phno || ''}">
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="editEmail" class="form-label">Email</label>
                                            <input type="email" class="form-control" id="editEmail" value="${userData.email || ''}" readonly>
                                            <small class="text-muted">Email cannot be changed</small>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="editAddress" class="form-label">Address</label>
                                            <textarea class="form-control" id="editAddress" rows="2">${userData.address || ''}</textarea>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="editGender" class="form-label">Gender</label>
                                            <select class="form-select" id="editGender">
                                                <option value="Choose..." ${userData.gender === 'Choose...' ? 'selected' : ''}>Choose...</option>
                                                <option value="Male" ${userData.gender === 'Male' ? 'selected' : ''}>Male</option>
                                                <option value="Female" ${userData.gender === 'Female' ? 'selected' : ''}>Female</option>
                                                <option value="Prefer not to say" ${userData.gender === 'Prefer not to say' ? 'selected' : ''}>Prefer not to say</option>
                                            </select>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="editDob" class="form-label">Date of Birth</label>
                                            <input type="date" class="form-control" id="editDob" value="${userData.dob || ''}">
                                        </div>
                                    </form>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="button" class="btn btn-primary" id="saveEditUser">Save Changes</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Remove any existing modal
                const existingModal = document.getElementById('editUserModal');
                if (existingModal) {
                    existingModal.remove();
                }
                
                // Add modal to document
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
                modal.show();
                
                // Handle save button
                document.getElementById('saveEditUser').addEventListener('click', async () => {
                    try {
                        // Get updated data
                        const updatedUser = {
                            name: document.getElementById('editName').value,
                            phno: document.getElementById('editPhone').value || '',
                            address: document.getElementById('editAddress').value || '',
                            gender: document.getElementById('editGender').value || 'Choose...',
                            dob: document.getElementById('editDob').value || '',
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        
                        // Validate name (required)
                        if (!updatedUser.name.trim()) {
                            alert('Name is required');
                            return;
                        }
                        
                        // Update in Firestore
                        await db.collection('users').doc(docId).update(updatedUser);
                        
                        // Close modal
                        modal.hide();
                        
                        alert('User updated successfully');
                        await displayUsers(); // Refresh user list
                    } catch (error) {
                        console.error("Error saving user data:", error);
                        alert(`Failed to update user: ${error.message}`);
                    }
                });
            } catch (error) {
                console.error("Error preparing edit form:", error);
                alert(`Failed to load user details: ${error.message}`);
            }
        });
    });

    // Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
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
}

// Main function to initialize the page
async function init() {
    try {
        // Check authentication state
        const user = auth.currentUser;
        if (user) {
            const isAdmin = await checkIfAdmin(user);
            if (isAdmin) {
                // Load admin profile picture
                await loadAdminProfilePicture(user.uid);
                
                // Display user list
                await displayUsers();
            } else {
                // Redirect non-admin users
                window.location.href = '../index.html';
            }
        } else {
            // Set up auth state listener for when auth state is still being determined
            auth.onAuthStateChanged(async (user) => {
        if (user) {
            const isAdmin = await checkIfAdmin(user);
                    if (isAdmin) {
                        // Load admin profile picture
                        await loadAdminProfilePicture(user.uid);
                        
                        // Display user list
                        await displayUsers();
                    } else {
                        // Redirect non-admin users
                window.location.href = '../index.html';
            }
                } else {
                    // Redirect to login
                    window.location.href = '../login.html';
                }
            });
        }
    } catch (error) {
        console.error('Error initializing page:', error);
        alert('Error loading page: ' + error.message);
    }
}

// Initialize the page
init();


