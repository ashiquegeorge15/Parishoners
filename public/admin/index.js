// Wait for Firebase scripts to load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
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

    // Initialize Firebase if not already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.firestore();
    const rtdb = firebase.database();
    const auth = firebase.auth();

    console.log("Firebase initialized");

    // Function to update stats cards with real counts
    async function updateStatsCards() {
        try {
            // Show loading state
            document.querySelectorAll('.stat-number').forEach(el => {
                el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            });

            // Get counts from Firestore collections
            const [usersSnapshot, eventsSnapshot] = await Promise.all([
                db.collection('users').get(),
                db.collection('events').get()
            ]);

            // Get announcements count from Realtime Database
            const announcementsSnapshot = await rtdb.ref().child('Announcements').get();
            const announcementsCount = announcementsSnapshot.exists() ? Object.keys(announcementsSnapshot.val() || {}).length : 0;

            // Calculate total gallery images
            let totalImages = 0;
            eventsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.images && Array.isArray(data.images)) {
                    totalImages += data.images.length;
                }
            });

            // Debug logs
            console.log({
                usersCount: usersSnapshot.size,
                announcementsCount,
                eventsCount: eventsSnapshot.size,
                totalImages
            });

            // Update stats with animation
            function updateWithAnimation(selector, value) {
                const element = document.querySelector(selector);
                if (element) {
                    element.style.transition = 'opacity 0.3s ease';
                    element.style.opacity = '0';
                    setTimeout(() => {
                        element.textContent = value;
                        element.style.opacity = '1';
                    }, 300);
                }
            }

            // Update all stats
            updateWithAnimation('.stat-card:nth-child(1) .stat-number', usersSnapshot.size);
            updateWithAnimation('.stat-card:nth-child(2) .stat-number', announcementsCount);
            updateWithAnimation('.stat-card:nth-child(3) .stat-number', eventsSnapshot.size);
            updateWithAnimation('.stat-card:nth-child(4) .stat-number', totalImages);

            // Hide percentage changes
            document.querySelectorAll('.stat-change').forEach(el => el.style.display = 'none');

        } catch (error) {
            console.error("Error updating stats:", error);
            
            // Show error state in cards
            document.querySelectorAll('.stat-number').forEach(el => {
                el.textContent = 'Error';
                el.style.color = 'red';
            });
        }
    }

    // Auth state listener
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                // Check if user is admin
                const adminDoc = await db.collection('Admin').doc(user.uid).get();
                if (adminDoc.exists) {
                    console.log('Admin authenticated, updating stats...');
                    await updateStatsCards();
                    // Update stats every 5 minutes
                    setInterval(updateStatsCards, 300000);
                } else {
                    console.log('Non-admin user, redirecting...');
                    window.location.href = '../index.html';
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
                window.location.href = '../index.html';
            }
        } else {
            console.log('No user logged in, redirecting...');
            window.location.href = '../index.html';
        }
    });
});