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

// Function to fetch user/admin details
async function getUserDetails(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const adminDoc = await db.collection('Admin').doc(userId).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            return {
                ...userData,
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
    return `
        <tr class="list-item ${isAdmin ? 'table-info' : ''} align-middle" data-id="${docId}">
            <td class="text-center">
                <div class="d-flex align-items-center justify-content-center">
                    <div class="position-relative">
                        <img src="${user.photoURL || '../img/icon/defaultPic.png'}" 
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
            <td class="text-center">
                <span class="badge ${user.gender === 'Male' ? 'bg-info' : 
                                   user.gender === 'Female' ? 'bg-pink' : 'bg-secondary'}">
                    ${user.gender || 'Not Specified'}
                </span>
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
                                    <img src="${userData.photoURL || '../img/icon/defaultPic.png'}" 
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

        // Initialize modal
        const modal = new bootstrap.Modal(document.getElementById('viewUserModal'));
        modal.show();

        // Add edit button listener
        document.querySelector('.edit-user-btn').addEventListener('click', () => {
            modal.hide();
            const editBtn = document.querySelector(`.edit-user[data-id="${userId}"]`);
            if (editBtn) editBtn.click();
        });

    } catch (error) {
        console.error("Error showing user details:", error);
        alert(`Error showing user details: ${error.message}`);
    }
}

// Function to fetch unique users
async function fetchUniqueUsers() {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('No authenticated user');
        }

        const isAdmin = await checkIfAdmin(currentUser);
        if (!isAdmin) {
            throw new Error('Admin privileges required');
        }

        const usersSnapshot = await db.collection('users').get();
        const adminsSnapshot = await db.collection('Admin').get();
        
        const adminIds = new Set();
        adminsSnapshot.forEach(doc => adminIds.add(doc.id));
        
        const uniqueUsers = new Map();
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            const userId = doc.id;
            if (!uniqueUsers.has(userId)) {
                uniqueUsers.set(userId, {
                    ...userData,
                    id: userId,
                    isAdmin: adminIds.has(userId)
                });
            }
        });
        
        return Array.from(uniqueUsers.values());
    } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
    }
}

// Function to display users
async function displayUsers() {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('No authenticated user');
        }

        const isAdmin = await checkIfAdmin(currentUser);
        if (!isAdmin) {
            throw new Error('Admin privileges required');
        }

        const container = document.querySelector('.members-container');
        if (!container) return;

        // Show loading state
        container.innerHTML = `
            <div class="p-4">
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
                        <button class="btn btn-success me-2" onclick="window.location.href='add-member.html'">
                            <i class="fas fa-plus"></i> Add New Member
                        </button>
                        <button class="btn btn-danger" id="logoutBtn">
                            <i class="fas fa-sign-out-alt"></i> Logout
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

        contentDiv.innerHTML = `
            <!-- Stats Cards -->
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="card bg-primary text-white">
                        <div class="card-body">
                            <h5 class="card-title">Administrators</h5>
                            <h3 id="adminCount">${admins.length}</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-success text-white">
                        <div class="card-body">
                            <h5 class="card-title">Members</h5>
                            <h3 id="memberCount">${regularUsers.length}</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-info text-white">
                        <div class="card-body">
                            <h5 class="card-title">Total Users</h5>
                            <h3 id="totalCount">${users.length}</h3>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Users Tables -->
            <div class="card mb-4">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">Administrators</h5>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Profile</th>
                                    <th>Name</th>
                                    <th>Contact</th>
                                    <th>Address</th>
                                    <th>Gender</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="adminsList">
                                ${admins.map(admin => createUserCard(admin, admin.id)).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header bg-success text-white">
                    <h5 class="mb-0">Members</h5>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Profile</th>
                                    <th>Name</th>
                                    <th>Contact</th>
                                    <th>Address</th>
                                    <th>Gender</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="membersList">
                                ${regularUsers.map(user => createUserCard(user, user.id)).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Setup search functionality
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                filterUsers(users, searchTerm);
            });
        }

        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    filterUsers(users, '');
                }
            });
        }

        // Add event listeners for actions
        addUserActionListeners();

        // Add logout functionality
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await auth.signOut();
                    window.location.href = '../index.html';
                } catch (error) {
                    console.error('Logout error:', error);
                    alert('Error signing out. Please try again.');
                }
            });
        }

    } catch (error) {
        console.error("Error displaying users:", error);
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger m-4">
                    <p><i class="fas fa-exclamation-triangle"></i> Error: ${error.message}</p>
                    <button class="btn btn-primary mt-2" onclick="window.location.href='../index.html'">
                        Return to Login
                    </button>
                </div>
            `;
        }
    }
}

// Filter users based on search term
function filterUsers(users, searchTerm) {
    const admins = users.filter(user => user.isAdmin);
    const regularUsers = users.filter(user => !user.isAdmin && matchesSearch(user, searchTerm));

    const adminsList = document.getElementById('adminsList');
    const membersList = document.getElementById('membersList');
    const memberCount = document.getElementById('memberCount');

    if (membersList) {
        membersList.innerHTML = regularUsers.length ? 
            regularUsers.map(user => createUserCard(user, user.id)).join('') :
            '<tr><td colspan="6" class="text-center">No members found</td></tr>';
    }

    if (memberCount) {
        memberCount.textContent = regularUsers.length;
    }

    addUserActionListeners();
}

// Check if user matches search term
function matchesSearch(user, searchTerm) {
    if (!searchTerm) return true;
    
    const searchFields = [
        user.name,
        user.phno,
        user.address,
        user.gender
    ];

    return searchFields.some(field => 
        field && field.toString().toLowerCase().includes(searchTerm)
    );
}

// Function to add user action listeners
function addUserActionListeners() {
    // Promote to Admin
    document.querySelectorAll('.promote-admin').forEach(button => {
        button.addEventListener('click', async (e) => {
            try {
                const docId = e.currentTarget.dataset.id;
                const userName = e.currentTarget.dataset.name;
                
                if (confirm(`Are you sure you want to promote ${userName} to admin?`)) {
                    // Add to Admin collection
                    await db.collection('Admin').doc(docId).set({
                        name: userName,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Update user's role in users collection
                    await db.collection('users').doc(docId).update({
                        role: 'admin',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    alert(`${userName} has been promoted to admin successfully!`);
                    await displayUsers(); // Refresh the display
                }
            } catch (error) {
                console.error("Error promoting to admin:", error);
                alert(`Error promoting user to admin: ${error.message}`);
            }
        });
    });

    // Demote from Admin
    document.querySelectorAll('.demote-admin').forEach(button => {
        button.addEventListener('click', async (e) => {
            try {
                const docId = e.currentTarget.dataset.id;
                const userName = e.currentTarget.dataset.name;
                
                if (confirm(`Are you sure you want to demote ${userName} from admin?`)) {
                    // Remove from Admin collection
                    await db.collection('Admin').doc(docId).delete();

                    // Update user's role in users collection
                    await db.collection('users').doc(docId).update({
                        role: 'member',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    alert(`${userName} has been demoted from admin successfully!`);
                    await displayUsers(); // Refresh the display
                }
            } catch (error) {
                console.error("Error demoting admin:", error);
                alert(`Error demoting admin: ${error.message}`);
            }
        });
    });

    // View User
    document.querySelectorAll('.view-user').forEach(button => {
        button.addEventListener('click', (e) => {
            const docId = e.currentTarget.dataset.id;
            showUserDetails(docId);
        });
    });

    // Delete User
    document.querySelectorAll('.delete-user').forEach(button => {
        button.addEventListener('click', async (e) => {
            try {
                const docId = e.currentTarget.dataset.id;
                const userName = e.currentTarget.dataset.name;
                
                if (confirm(`Are you sure you want to delete ${userName}?`)) {
                    // Delete from both collections
                    await db.collection('users').doc(docId).delete();
                    await db.collection('Admin').doc(docId).delete();

                    alert(`${userName} has been deleted successfully!`);
                    await displayUsers(); // Refresh the display
                }
            } catch (error) {
                console.error("Error deleting user:", error);
                alert(`Error deleting user: ${error.message}`);
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
                
                // Create modal for editing
                const modalHtml = `
                    <div class="modal fade" id="editUserModal" tabindex="-1">
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Edit User</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <form id="editUserForm">
                                        <div class="mb-3">
                                            <label class="form-label">Name</label>
                                            <input type="text" class="form-control" id="editName" value="${userData.name || ''}" required>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Phone</label>
                                            <input type="tel" class="form-control" id="editPhone" value="${userData.phno || ''}">
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Address</label>
                                            <textarea class="form-control" id="editAddress" rows="3">${userData.address || ''}</textarea>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Gender</label>
                                            <select class="form-select" id="editGender">
                                                <option value="">Choose...</option>
                                                <option value="Male" ${userData.gender === 'Male' ? 'selected' : ''}>Male</option>
                                                <option value="Female" ${userData.gender === 'Female' ? 'selected' : ''}>Female</option>
                                                <option value="Other" ${userData.gender === 'Other' ? 'selected' : ''}>Other</option>
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Date of Birth</label>
                                            <input type="date" class="form-control" id="editDOB" value="${userData.dob || ''}">
                                        </div>
                                    </form>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="button" class="btn btn-primary" id="saveEditBtn">Save Changes</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                // Remove existing modal if any
                const existingModal = document.getElementById('editUserModal');
                if (existingModal) {
                    existingModal.remove();
                }

                // Add modal to document
                document.body.insertAdjacentHTML('beforeend', modalHtml);

                // Initialize modal
                const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
                modal.show();

                // Handle save changes
                document.getElementById('saveEditBtn').addEventListener('click', async () => {
                    try {
                        const updatedData = {
                            name: document.getElementById('editName').value,
                            phno: document.getElementById('editPhone').value,
                            address: document.getElementById('editAddress').value,
                            gender: document.getElementById('editGender').value,
                            dob: document.getElementById('editDOB').value,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        };

                        // Validate required fields
                        if (!updatedData.name) {
                            alert('Name is required!');
                            return;
                        }

                        // Update user data
                        await db.collection('users').doc(docId).update(updatedData);

                        // If user is admin, update admin collection name
                        const adminDoc = await db.collection('Admin').doc(docId).get();
                        if (adminDoc.exists) {
                            await db.collection('Admin').doc(docId).update({
                                name: updatedData.name
                            });
                        }

                        alert('User updated successfully!');
                        modal.hide();
                        await displayUsers(); // Refresh the display

                    } catch (error) {
                        console.error("Error updating user:", error);
                        alert(`Error updating user: ${error.message}`);
                    }
                });

            } catch (error) {
                console.error("Error opening edit form:", error);
                alert(`Error opening edit form: ${error.message}`);
            }
        });
    });
}

// Authentication state observer
auth.onAuthStateChanged(async (user) => {
    try {
        if (user) {
            const isAdmin = await checkIfAdmin(user);
            if (isAdmin) {
                console.log('Admin authenticated:', user.email);
                await displayUsers();
            } else {
                console.log('Non-admin user, redirecting...');
                alert('Access denied. Admin privileges required.');
                await auth.signOut();
                window.location.href = '../index.html';
            }
        } else {
            console.log('No user logged in, redirecting...');
            window.location.href = '../index.html';
        }
    } catch (error) {
        console.error("Auth error:", error);
        alert('Authentication error. Please try again.');
        window.location.href = '../index.html';
    }
});

// Add error handling for page load
window.addEventListener('load', async () => {
    try {
        const user = auth.currentUser;
        if (user) {
            const isAdmin = await checkIfAdmin(user);
            if (!isAdmin) {
                alert('Access denied. Admin privileges required.');
                await auth.signOut();
                window.location.href = '../index.html';
            }
        }
    } catch (error) {
        console.error("Page load error:", error);
    }
});

// Add edit modal HTML
const editModalHTML = `
    <div class="modal fade" id="editUserModal" tabindex="-1" aria-labelledby="editUserModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="editUserModalLabel">Edit User</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="editUserForm">
                        <input type="hidden" id="editUserId">
                        <div class="mb-3">
                            <label for="editName" class="form-label">Name *</label>
                            <input type="text" class="form-control" id="editName" required>
                        </div>
                        <div class="mb-3">
                            <label for="editAddress" class="form-label">Address</label>
                            <input type="text" class="form-control" id="editAddress">
                        </div>
                        <div class="mb-3">
                            <label for="editDob" class="form-label">Date of Birth</label>
                            <input type="date" class="form-control" id="editDob">
                        </div>
                        <div class="mb-3">
                            <label for="editPhone" class="form-label">Phone</label>
                            <input type="tel" class="form-control" id="editPhone">
                        </div>
                        <div class="mb-3">
                            <label for="editGender" class="form-label">Gender</label>
                            <select class="form-select" id="editGender">
                                <option value="Choose...">Choose...</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="saveEditUser">Save Changes</button>
                </div>
            </div>
        </div>
    </div>
`;

// Add the edit modal to the document
document.body.insertAdjacentHTML('beforeend', editModalHTML);

// Add save edit handler
document.getElementById('saveEditUser')?.addEventListener('click', async () => {
    try {
        const docId = document.getElementById('editUserId').value;
        const updatedUser = {
            name: document.getElementById('editName').value,
            address: document.getElementById('editAddress').value || '',
            dob: document.getElementById('editDob').value || '',
            phno: document.getElementById('editPhone').value || '',
            gender: document.getElementById('editGender').value || 'Choose...',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!updatedUser.name) {
            throw new Error('Name is required');
        }

        await db.collection('users').doc(docId).update(updatedUser);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
        modal.hide();
        
        await displayUsers();
        alert('User updated successfully!');

    } catch (error) {
        console.error("Error updating user:", error);
        alert('Error updating user: ' + error.message);
    }
});

// Add some CSS to the page
const style = document.createElement('style');
style.textContent = `
    .bg-pink {
        background-color: #ff69b4 !important;
    }
    .table td {
        vertical-align: middle;
    }
    .btn-group .btn {
        padding: 0.25rem 0.5rem;
    }
    .user-photo {
        transition: transform 0.2s;
    }
    .user-photo:hover {
        transform: scale(1.1);
    }
    .badge {
        font-size: 0.85em;
        padding: 0.5em 0.8em;
    }
    .modal-content {
        border-radius: 1rem;
    }
    .card {
        border-radius: 0.75rem;
        border: none;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
`;
document.head.appendChild(style);


