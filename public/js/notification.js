// Notification utility for approval status
class ApprovalNotification {
  constructor() {
    this.checkApprovalStatus();
  }
  
  // Check local storage for pending approvals
  checkApprovalStatus() {
    const pendingApprovals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
    
    if (pendingApprovals.length > 0) {
      // Set up periodic checking for these accounts
      this.startApprovalCheck(pendingApprovals);
    }
  }
  
  // Add a user to pending approvals
  addPendingApproval(email, uid) {
    const pendingApprovals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
    
    // Check if user is already in pending list
    if (!pendingApprovals.some(item => item.uid === uid)) {
      pendingApprovals.push({
        email,
        uid,
        addedAt: new Date().toISOString()
      });
      
      localStorage.setItem('pendingApprovals', JSON.stringify(pendingApprovals));
      
      // Start checking if this is the first item
      if (pendingApprovals.length === 1) {
        this.startApprovalCheck(pendingApprovals);
      }
    }
  }
  
  // Start periodic checking for approval status
  startApprovalCheck(pendingApprovals) {
    // Check every 5 minutes
    const checkInterval = 5 * 60 * 1000;
    
    // Initial check after 10 seconds
    setTimeout(() => this.checkUserApprovals(pendingApprovals), 10000);
    
    // Set up interval for repeated checks
    setInterval(() => this.checkUserApprovals(), checkInterval);
  }
  
  // Check approval status in Firestore
  async checkUserApprovals() {
    const pendingApprovals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
    if (pendingApprovals.length === 0) return;
    
    try {
      const db = firebase.firestore();
      
      const approvedUsers = [];
      const stillPending = [];
      
      // Check each user's status
      for (const user of pendingApprovals) {
        try {
          const userDoc = await db.collection('users').doc(user.uid).get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            
            if (userData.isApproved) {
              // User has been approved
              approvedUsers.push(user);
              this.showApprovalNotification(user.email);
            } else {
              // Still pending
              stillPending.push(user);
            }
          }
        } catch (err) {
          console.error(`Error checking approval for ${user.email}:`, err);
          stillPending.push(user);
        }
      }
      
      // Update localStorage
      localStorage.setItem('pendingApprovals', JSON.stringify(stillPending));
      
    } catch (error) {
      console.error('Error checking approvals:', error);
    }
  }
  
  // Show browser notification for approved user
  showApprovalNotification(email) {
    // Check if browser notifications are supported and permitted
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Account Approved', {
          body: `Your account (${email}) has been approved! You can now log in.`,
          icon: '/img/logo/marthoma-seeklogo.svg'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Account Approved', {
              body: `Your account (${email}) has been approved! You can now log in.`,
              icon: '/img/logo/marthoma-seeklogo.svg'
            });
          }
        });
      }
    }
    
    // Also display an on-page notification
    const notification = document.createElement('div');
    notification.className = 'approval-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-check-circle-fill" viewBox="0 0 16 16">
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
          </svg>
        </div>
        <div class="notification-message">
          <h4>Account Approved</h4>
          <p>Your account has been approved! You can now log in.</p>
        </div>
        <button class="notification-close">&times;</button>
      </div>
      <style>
        .approval-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          max-width: 400px;
          background-color: #fff;
          border-left: 4px solid #28a745;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1060;
          overflow: hidden;
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .notification-content {
          display: flex;
          padding: 15px;
          align-items: center;
        }
        
        .notification-icon {
          margin-right: 15px;
          color: #28a745;
        }
        
        .notification-message {
          flex: 1;
        }
        
        .notification-message h4 {
          margin: 0 0 5px 0;
          color: #333;
          font-size: 16px;
        }
        
        .notification-message p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }
        
        .notification-close {
          background: none;
          border: none;
          color: #999;
          font-size: 20px;
          cursor: pointer;
          padding: 0 5px;
        }
      </style>
    `;
    
    document.body.appendChild(notification);
    
    // Add close button event
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    });
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 10000);
  }
}

// Initialize the notification system
const approvalNotification = new ApprovalNotification();

// Export for direct use
window.approvalNotification = approvalNotification; 