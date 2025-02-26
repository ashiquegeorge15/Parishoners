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

    // Check if user is logged in
    auth.onAuthStateChanged(function(user) {
        if (user) {
            console.log('User is logged in:', user.email);
            displayMembers(); // Only display members if user is logged in
            setupSearchListener();
        } else {
            console.log('No user logged in');
            window.location.href = '../index.html'; // Redirect to login page
        }
    });

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
            querySnapshot.forEach((doc) => {
                const user = doc.data();
                const row = `
                    <tr>
                        <td>${user.name || 'N/A'}</td>
                        <td>${user.phno || 'N/A'}</td>
                        <td>${user.address || 'N/A'}</td>
                        <td>${user.gender === 'Choose...' ? 'Not Specified' : (user.gender || 'N/A')}</td>
                        <td>${user.dob || 'N/A'}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="viewMember('${doc.id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                        </td>
                    </tr>
                `;
                membersTableBody.innerHTML += row;
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

    // Function to view member details
    window.viewMember = async function(userId) {
        try {
            // Ensure user is authenticated
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error('User not authenticated');
            }

            const doc = await db.collection('users').doc(userId).get();
            if (doc.exists) {
                const user = doc.data();
                alert(`
                    Member Details:
                    Name: ${user.name || 'N/A'}
                    Phone: ${user.phno || 'N/A'}
                    Address: ${user.address || 'N/A'}
                    Gender: ${user.gender === 'Choose...' ? 'Not Specified' : (user.gender || 'N/A')}
                    Date of Birth: ${user.dob || 'N/A'}
                `);
            } else {
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

    // Add logout functionality
    const logoutButton = document.createElement('button');
    logoutButton.className = 'btn btn-danger ms-2';
    logoutButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
    logoutButton.onclick = () => {
        auth.signOut().then(() => {
            window.location.href = '../index.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
        });
    };
    document.querySelector('.navbar-nav').appendChild(logoutButton);
});