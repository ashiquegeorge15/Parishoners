// Import the required Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore, doc, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-messaging.js";

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const messaging = getMessaging(app);

// VAPID key for web push notifications
// You'll need to generate this from Firebase Console
const vapidKey = "REPLACE_WITH_YOUR_VAPID_KEY_FROM_FIREBASE_CONSOLE";

/**
 * Request notification permission and register FCM token
 */
export async function requestNotificationPermission() {
  try {
    console.log('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      // Get the user's current token
      const currentToken = await getToken(messaging, { vapidKey });
      
      if (currentToken) {
        console.log('Current FCM token:', currentToken);
        // Save the token to Firestore for the current user
        await saveTokenToFirestore(currentToken);
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } else {
      console.log('Unable to get permission to notify.');
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }
}

/**
 * Save the FCM token to the user's document in Firestore
 */
async function saveTokenToFirestore(fcmToken) {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      console.log('No user logged in. Cannot save token.');
      return;
    }
    
    // Get the user's device information
    const deviceInfo = {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      lastUpdated: new Date().toISOString()
    };
    
    // Check if user document exists in members collection
    const memberDoc = await getDoc(doc(db, 'members', user.uid));
    
    if (memberDoc.exists()) {
      // Update the existing document with the FCM token
      await updateDoc(doc(db, 'members', user.uid), {
        fcmToken: fcmToken,
        deviceInfo: deviceInfo,
        tokenUpdatedAt: new Date().toISOString()
      });
      console.log('Token saved to existing member document.');
    } else {
      // Check if the user exists in the users collection
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        // Create a new member document with user information
        const userData = userDoc.data();
        
        await setDoc(doc(db, 'members', user.uid), {
          uid: user.uid,
          email: userData.email || user.email,
          name: userData.name || user.displayName || '',
          phone: userData.phno || '',
          address: userData.address || '',
          fcmToken: fcmToken,
          deviceInfo: deviceInfo,
          memberSince: userData.createdAt || new Date().toISOString(),
          tokenUpdatedAt: new Date().toISOString(),
          hasOutstandingDues: false,
          duesHistory: [],
          status: 'active'
        });
        console.log('New member document created with token.');
      } else {
        console.log('User document not found. Cannot create member record.');
      }
    }
  } catch (error) {
    console.error('Error saving token to Firestore:', error);
  }
}

/**
 * Handle foreground messages
 */
export function setupForegroundNotificationListener() {
  onMessage(messaging, (payload) => {
    console.log('Message received in the foreground:', payload);
    
    // Create a notification if the browser supports it
    if ('Notification' in window && Notification.permission === 'granted') {
      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/img/logo/marthoma-seeklogo.svg',
        data: payload.data
      };
      
      // Create and show the notification
      const notification = new Notification(notificationTitle, notificationOptions);
      
      // Handle notification click
      notification.onclick = function() {
        window.focus();
        notification.close();
        
        // Navigate to a specific page based on notification data
        const url = payload.data?.url || '/auth/dues.html';
        window.location.href = url;
      };
    }
  });
}

/**
 * Setup notification handling when the user logs in
 */
export function initializeNotifications() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is signed in
      console.log('User is signed in, setting up notifications...');
      await requestNotificationPermission();
      setupForegroundNotificationListener();
    } else {
      // User is signed out
      console.log('User is signed out, notifications not initialized.');
    }
  });
}

// Initialize notifications when this module is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeNotifications();
}); 