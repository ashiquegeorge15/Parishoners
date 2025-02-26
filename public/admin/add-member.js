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

// Function to create user list item
function createUserCard(user, docId) {
    console.log('Creating list item for user:', user);
    return `
        <tr class="list-item" data-id="${docId}">
            <td><img src="${user.photoURL || '../img/icon/defaultPic.png'}" alt="User Photo" class="user-photo"></td>
            <td>${user.name || 'No Name'}</td>
            <td>${user.phno || 'No Phone'}</td>
            <td>${user.address || 'No Address'}</td>
            <td>${user.gender === 'Choose...' ? 'Not Specified' : user.gender}</td>
            <td class="actions">
                <button class="btn btn-sm btn-primary view-user" data-id="${docId}">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `;
}

// Function to display users
async function displayUsers() {
    try {
        console.log("Fetching users...");
        const usersContainer = document.querySelector('.members-container');
        usersContainer.innerHTML = '<p class="text-center">Loading users...</p>';

        // Get all users
        const querySnapshot = await db.collection('users').get();
        
        if (querySnapshot.empty) {
            usersContainer.innerHTML = '<p class="text-center">No users found</p>';
            return;
        }

        // Create table structure
        usersContainer.innerHTML = `
            <div class="table-container">
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>Photo</th>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Address</th>
                            <th>Gender</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody class="list-items">
                    </tbody>
                </table>
            </div>
        `;

        const listContainer = usersContainer.querySelector('.list-items');
        
        // Add each user to the table
        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            const userListItem = createUserCard(userData, doc.id);
            listContainer.innerHTML += userListItem;
        });

        // Add view button listeners
        addViewButtonListeners();

    } catch (error) {
        console.error("Error fetching users:", error);
        const usersContainer = document.querySelector('.members-container');
        usersContainer.innerHTML = `
            <p class="text-center text-danger">
                Error loading users. Please try again later.<br>
                Error: ${error.message}
            </p>
        `;
    }
}

// Add view button listeners
function addViewButtonListeners() {
    document.querySelectorAll('.view-user').forEach(button => {
        button.addEventListener('click', async (e) => {
            const userId = e.target.closest('button').dataset.id;
            try {
                const doc = await db.collection('users').doc(userId).get();
                if (doc.exists) {
                    const userData = doc.data();
                    alert(`
                        User Details:
                        Name: ${userData.name || 'Not provided'}
                        Phone: ${userData.phno || 'Not provided'}
                        Address: ${userData.address || 'Not provided'}
                        Gender: ${userData.gender || 'Not provided'}
                        DOB: ${userData.dob || 'Not provided'}
                    `);
                }
            } catch (error) {
                console.error("Error fetching user details:", error);
                alert('Error fetching user details. Please try again.');
            }
        });
    });
}

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await auth.signOut();
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Error signing out:', error);
        alert('Error signing out. Please try again.');
    }
});

// Check authentication state
auth.onAuthStateChanged(user => {
    if (user) {
        displayUsers();
    } else {
        window.location.href = '/index.html';
    }
});

// Load users when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, calling displayUsers()"); // Debug log
    displayUsers();
});

// Optional: Add search functionality
function addSearchFunctionality() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search users...';
    searchInput.classList.add('form-control', 'mb-3');
    
    const headerDiv = document.querySelector('.members-header');
    headerDiv.appendChild(searchInput);

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const searchTerm = e.target.value.toLowerCase();
            
            try {
                const usersContainer = document.querySelector('.members-container');
                usersContainer.innerHTML = ''; // Clear existing content

                const querySnapshot = await db.collection('users').get();
                
                querySnapshot.forEach((doc) => {
                    const userData = doc.data();
                    if (userData.name.toLowerCase().includes(searchTerm) ||
                        userData.email.toLowerCase().includes(searchTerm)) {
                        const userCard = createUserCard(userData);
                        usersContainer.innerHTML += userCard;
                    }
                });

            } catch (error) {
                console.error("Error searching users:", error);
            }
        }, 300);
    });
}

// Uncomment to add search functionality
// addSearchFunctionality();

// Create and add the button and modal when page loads
function createAddMemberUI() {
    // Create the Add Member button
    const headerDiv = document.querySelector('.members-header');
    const addButton = document.createElement('button');
    addButton.className = 'btn btn-primary mb-3';
    addButton.innerHTML = '<i class="fas fa-plus"></i> Add Member';
    headerDiv.appendChild(addButton);

    // Create the modal HTML
    const modalHTML = `
        <div class="modal fade" id="addMemberModal" tabindex="-1" aria-labelledby="addMemberModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="addMemberModalLabel">Add New Member</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addMemberForm">
                            <div class="mb-3">
                                <label for="name" class="form-label">Name *</label>
                                <input type="text" class="form-control" id="name" required>
                            </div>
                            <div class="mb-3">
                                <label for="address" class="form-label">Address</label>
                                <input type="text" class="form-control" id="address">
                            </div>
                            <div class="mb-3">
                                <label for="dob" class="form-label">Date of Birth</label>
                                <input type="date" class="form-control" id="dob">
                            </div>
                            <div class="mb-3">
                                <label for="phone" class="form-label">Phone</label>
                                <input type="tel" class="form-control" id="phone">
                            </div>
                            <div class="mb-3">
                                <label for="gender" class="form-label">Gender</label>
                                <select class="form-select" id="gender">
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" id="submitMember">Save Member</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add button click handler to open modal
    addButton.addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('addMemberModal'));
        modal.show();
    });

    // Add form submission handler
    document.getElementById('submitMember').addEventListener('click', async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error('Please sign in to add members');
            }

            const form = document.getElementById('addMemberForm');
            const name = document.getElementById('name').value;

            if (!name) {
                throw new Error('Name is required');
            }

            const newMember = {
                name: name,
                address: document.getElementById('address').value || '',
                dob: document.getElementById('dob').value || '',
                phone: document.getElementById('phone').value || '',
                gender: document.getElementById('gender').value || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser.uid,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active'
            };

            console.log('Adding new member:', newMember);

            const docRef = await db.collection('members').add(newMember);
            console.log('Member added with ID:', docRef.id);

            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('addMemberModal'));
            modal.hide();
            form.reset();

            // Refresh members list
            await displayUsers();

            // Show success message
            alert('Member added successfully!');

        } catch (error) {
            console.error('Error adding member:', error);
            alert(error.message);
        }
    });
}

// Initialize UI when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('User is signed in:', user.email);
            createAddMemberUI();
            displayUsers();
        } else {
            console.log('No user is signed in');
            window.location.href = '/admin/login.html';
        }
    });
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

// Add event listeners for edit and delete buttons
function addUserActionListeners() {
    // Edit button listeners
    document.querySelectorAll('.edit-user').forEach(button => {
        button.addEventListener('click', async (e) => {
            const docId = e.target.closest('[data-id]').dataset.id;
            try {
                const doc = await db.collection('users').doc(docId).get();
                if (doc.exists) {
                    const userData = doc.data();
                    document.getElementById('editUserId').value = docId;
                    document.getElementById('editName').value = userData.name || '';
                    document.getElementById('editAddress').value = userData.address || '';
                    document.getElementById('editDob').value = userData.dob || '';
                    document.getElementById('editPhone').value = userData.phno || '';
                    document.getElementById('editGender').value = userData.gender || 'Choose...';

                    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
                    modal.show();
                }
            } catch (error) {
                console.error("Error loading user data:", error);
                alert('Error loading user data. Please try again.');
            }
        });
    });

    // Delete button listeners
    document.querySelectorAll('.delete-user').forEach(button => {
        button.addEventListener('click', async (e) => {
            const docId = e.target.closest('[data-id]').dataset.id;
            if (confirm('Are you sure you want to delete this user?')) {
                try {
                    await db.collection('users').doc(docId).delete();
                    alert('User deleted successfully!');
                    displayUsers(); // Refresh the display
                } catch (error) {
                    console.error("Error deleting user:", error);
                    alert('Error deleting user. Please try again.');
                }
            }
        });
    });

    // Add admin toggle listeners
    document.querySelectorAll('.toggle-admin').forEach(button => {
        button.addEventListener('click', async (e) => {
            const docId = e.target.dataset.id;
            const currentRole = e.target.dataset.role;
            const userName = e.target.dataset.name;
            await toggleAdminStatus(docId, currentRole, userName);
        });
    });
}

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

// Function to toggle admin status
async function toggleAdminStatus(userId, currentRole, userName) {
    try {
        // Validate inputs
        if (!userId) throw new Error('User ID is required');
        if (!userName) throw new Error('User name is required');
        
        if (currentRole === 'admin') {
            // Remove admin
            if (confirm(`Remove admin privileges from ${userName}?`)) {
                await db.collection("Admin").doc(userId).delete();
                await db.collection('users').doc(userId).update({
                    role: 'user',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert('Admin privileges removed successfully');
            }
        } else {
            // Make admin
            if (confirm(`Make ${userName} an admin?`)) {
                // Create admin document with validated data
                const adminData = {
                    name: userName || 'Unknown User',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                await db.collection("Admin").doc(userId).set(adminData);
                await db.collection('users').doc(userId).update({
                    role: 'admin',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert('Admin privileges granted successfully');
            }
        }
        await displayUsers(); // Refresh the display
    } catch (error) {
        console.error("Error updating admin status:", error);
        alert('Error updating admin status: ' + error.message);
    }
}

// Add this CSS to your existing styles
const styles = `
    <style>
        .section-title {
            color: #333;
            margin: 20px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #007bff;
        }

        .admin-table {
            margin-bottom: 40px;
        }

        .admin-table thead th {
            background-color: #cce5ff;
        }

        .users-table thead th {
            background-color: #f8f9fa;
        }

        .mt-5 {
            margin-top: 2rem;
        }

        .text-center {
            text-align: center;
        }
    </style>
`;

// Add styles to document head
document.head.insertAdjacentHTML('beforeend', styles);





