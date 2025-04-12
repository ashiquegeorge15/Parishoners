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
const auth = firebase.auth();
const functions = firebase.functions();

// DOM Elements
const membersTableBody = document.getElementById('membersTableBody');
const memberSelect = document.getElementById('memberSelect');
const saveDuesBtn = document.getElementById('saveDuesBtn');
const saveTemplateBtn = document.getElementById('saveTemplateBtn');
const sendReminderBtn = document.getElementById('sendReminderBtn');
const templatesContainer = document.getElementById('templatesContainer');
const reminderHistory = document.getElementById('reminderHistory');

// Filter buttons
const showAllMembersBtn = document.getElementById('showAllMembers');
const showWithDuesBtn = document.getElementById('showWithDues');

// State management
let currentMembers = [];
let templates = [];
let showOnlyWithDues = false;

// Date formatter
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});

// Currency formatter
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

// Authentication state listener
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      console.log('User authenticated, checking admin status...');
      
      // First check the Admin collection
      const adminDoc = await db.collection('Admin').doc(user.uid).get();
      
      // Then check if the user has an admin role in the members collection
      const memberDoc = await db.collection('members').doc(user.uid).get();
      const isAdminRole = memberDoc.exists && memberDoc.data().role === 'admin';
      
      // If user is in Admin collection or has admin role
      if (adminDoc.exists || isAdminRole) {
        // User is admin, initialize the dashboard
        console.log('Admin authenticated, initializing dues management dashboard...');
        
        // Load profile picture
        await loadProfilePicture(user.uid);
        
        // Initialize the dashboard
        initializeDashboard();
      } else {
        // Not an admin, redirect to regular dashboard
        console.log('User is not an admin, redirecting...');
        window.location.href = '../auth/index.html';
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      showAlert('Error checking admin permissions: ' + error.message, 'danger');
    }
  } else {
    // Not logged in, redirect to login page
    console.log('No user logged in, redirecting to login page...');
    window.location.href = '../login.html';
  }
});

// Load user profile picture
async function loadProfilePicture(userId) {
  try {
    // Get user profile data from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    // If user has a profile picture, update the image
    if (userDoc.exists && userDoc.data().profilePic && userDoc.data().profilePic.url) {
      const profileImg = document.querySelector('.profile-img');
      if (profileImg) {
        profileImg.src = userDoc.data().profilePic.url;
        console.log("Profile picture updated");
      }
    } else {
      console.log("No profile picture found or user document doesn't exist");
    }
  } catch (error) {
    console.error("Error loading profile picture:", error);
  }
}

// Load all members
async function loadMembers() {
  try {
    // Clear current members list
    currentMembers = [];
    
    // Show loading state
    membersTableBody.innerHTML = `<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin me-2"></i>Loading members...</td></tr>`;
    
    console.log('Attempting to load members from Firestore...');
    
    // Get all members from Firestore
    // First try from the users collection
    let snapshot = await db.collection('users').get();
    console.log(`Found ${snapshot.size} users in 'users' collection`);
    
    let membersCount = 0;
    
    // Process each user
    snapshot.forEach(doc => {
      const userData = doc.data();
      console.log(`Processing user: ${userData.name || userData.email || doc.id}`);
      
      // Add all users to the members list
      const member = {
        id: doc.id,
        name: userData.name || userData.displayName || 'No Name',
        email: userData.email || 'No Email',
        phone: userData.phone || userData.phoneNumber || 'No Phone',
        fcmToken: userData.fcmToken,
        status: userData.status || 'active',
        duesHistory: userData.duesHistory || [],
        createdAt: userData.createdAt,
        ...userData
      };
      
      // Calculate total outstanding dues
      member.outstandingDues = calculateOutstandingDues(member);
      
      // Add to current members list
      currentMembers.push(member);
      membersCount++;
    });
    
    // Now also try the members collection if it exists
    const membersSnapshot = await db.collection('members').get();
    console.log(`Found ${membersSnapshot.size} members in 'members' collection`);
    
    // Process each member document
    membersSnapshot.forEach(doc => {
      // Check if we already have this member by ID
      const existingMemberIndex = currentMembers.findIndex(m => m.id === doc.id);
      
      const memberData = doc.data();
      console.log(`Processing member: ${memberData.name || memberData.email || doc.id}`);
      
      if (existingMemberIndex >= 0) {
        // If member already exists, update with data from members collection
        currentMembers[existingMemberIndex] = {
          ...currentMembers[existingMemberIndex],
          ...memberData,
          duesHistory: memberData.duesHistory || currentMembers[existingMemberIndex].duesHistory || []
        };
        
        // Recalculate dues
        currentMembers[existingMemberIndex].outstandingDues = 
          calculateOutstandingDues(currentMembers[existingMemberIndex]);
        
        console.log(`Updated existing member: ${currentMembers[existingMemberIndex].name}`);
      } else {
        // If member doesn't exist yet, add new
        const member = {
          id: doc.id,
          name: memberData.name || 'No Name',
          email: memberData.email || 'No Email',
          phone: memberData.phone || 'No Phone',
          fcmToken: memberData.fcmToken,
          status: memberData.status || 'active',
          duesHistory: memberData.duesHistory || [],
          createdAt: memberData.createdAt,
          ...memberData
        };
        
        // Calculate total outstanding dues
        member.outstandingDues = calculateOutstandingDues(member);
        
        // Add to current members list
        currentMembers.push(member);
        membersCount++;
        
        console.log(`Added new member: ${member.name}`);
      }
    });
    
    console.log(`Total members loaded: ${membersCount}`);
    console.log('Member IDs:', currentMembers.map(m => m.id));
    
    // If no members found at all
    if (currentMembers.length === 0) {
      console.log('No members found in any collection');
      membersTableBody.innerHTML = `<tr><td colspan="7" class="text-center">No members found. Check your database structure.</td></tr>`;
      return;
    }
    
    // Sort members by name
    currentMembers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    // Refresh the members table
    refreshMembersTable();
    
    // Populate the member select dropdown
    populateMemberSelect();
    
  } catch (error) {
    console.error('Error loading members:', error);
    membersTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error loading members: ${error.message}</td></tr>`;
  }
}

// Calculate total outstanding dues for a member
function calculateOutstandingDues(member) {
  if (!member.duesHistory || !Array.isArray(member.duesHistory)) {
    return 0;
  }
  
  // Filter for unpaid dues
  const unpaidDues = member.duesHistory.filter(dues => 
    dues.status === 'unpaid' || dues.status === 'pending'
  );
  
  // Sum up the amounts
  return unpaidDues.reduce((total, dues) => total + (parseFloat(dues.amount) || 0), 0);
}

// Refresh the members table with current data
function refreshMembersTable() {
  // Clear the table
  membersTableBody.innerHTML = '';
  
  // Filter members if needed
  const membersToShow = showOnlyWithDues 
    ? currentMembers.filter(member => member.outstandingDues > 0)
    : currentMembers;
  
  // Show message if no members match the filter
  if (membersToShow.length === 0) {
    membersTableBody.innerHTML = `<tr><td colspan="7" class="text-center">No members ${showOnlyWithDues ? 'with outstanding dues' : ''} found.</td></tr>`;
    return;
  }
  
  // Add each member to the table
  membersToShow.forEach(member => {
    const row = document.createElement('tr');
    row.id = `member-${member.id}`;
    
    // Format the last payment date if available
    let lastPaymentDate = 'Never';
    if (member.duesHistory && Array.isArray(member.duesHistory)) {
      const paidDues = member.duesHistory.filter(dues => dues.status === 'paid');
      if (paidDues.length > 0) {
        // Sort by payment date, most recent first
        paidDues.sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0));
        if (paidDues[0].paymentDate) {
          lastPaymentDate = dateFormatter.format(new Date(paidDues[0].paymentDate));
        }
      }
    }
    
    // Determine status badge class
    let statusBadgeClass = 'bg-success';
    if (member.outstandingDues > 0) {
      statusBadgeClass = 'bg-warning text-dark';
    }
    if (!member.fcmToken) {
      statusBadgeClass = 'bg-secondary';
    }
    if (member.status === 'inactive') {
      statusBadgeClass = 'bg-danger';
    }
    
    // Determine status text
    let statusText = 'Active';
    if (member.outstandingDues > 0) {
      statusText = 'Has Dues';
    }
    if (!member.fcmToken) {
      statusText = 'No Notifications';
    }
    if (member.status === 'inactive') {
      statusText = 'Inactive';
    }
    
    // Create the row HTML
    row.innerHTML = `
      <td>${member.name || 'No Name'}</td>
      <td>${member.email || 'No Email'}</td>
      <td>${member.phone || 'No Phone'}</td>
      <td>${lastPaymentDate}</td>
      <td>${member.outstandingDues > 0 ? currencyFormatter.format(member.outstandingDues) : '-'}</td>
      <td><span class="badge ${statusBadgeClass} status-badge">${statusText}</span></td>
      <td>
        <div class="dues-actions">
          <button class="btn btn-outline-primary btn-sm view-history-btn" data-id="${member.id}" title="View Dues History">
            <i class="fas fa-history"></i>
          </button>
          ${member.outstandingDues > 0 && member.fcmToken ? `
            <button class="btn btn-warning btn-sm send-reminder-btn" data-id="${member.id}" title="Send Reminder">
              <i class="fas fa-bell"></i>
            </button>
          ` : ''}
          <button class="btn btn-outline-secondary btn-sm add-dues-btn" data-id="${member.id}" title="Add Dues">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </td>
    `;
    
    // Add to table
    membersTableBody.appendChild(row);
  });
}

// Populate the member select dropdown
function populateMemberSelect() {
  if (!memberSelect) return;
  
  // Clear the dropdown except for the default option
  memberSelect.innerHTML = '<option value="" selected disabled>Select a member</option>';
  
  // Add each member as an option
  currentMembers.forEach(member => {
    const option = document.createElement('option');
    option.value = member.id;
    option.textContent = member.name || member.email || 'Unknown Member';
    memberSelect.appendChild(option);
  });
}

// Setup event listeners
function setupEventListeners() {
  // Filter buttons
  if (showAllMembersBtn) {
    showAllMembersBtn.addEventListener('click', () => {
      showOnlyWithDues = false;
      refreshMembersTable();
      showAllMembersBtn.classList.add('active');
      showWithDuesBtn.classList.remove('active');
    });
  }
  
  if (showWithDuesBtn) {
    showWithDuesBtn.addEventListener('click', () => {
      showOnlyWithDues = true;
      refreshMembersTable();
      showWithDuesBtn.classList.add('active');
      showAllMembersBtn.classList.remove('active');
    });
  }
  
  // Save dues button
  if (saveDuesBtn) {
    saveDuesBtn.addEventListener('click', saveDues);
  }
  
  // Save template button
  if (saveTemplateBtn) {
    saveTemplateBtn.addEventListener('click', saveTemplate);
  }
  
  // Global click event for dynamically created buttons
  document.addEventListener('click', (e) => {
    // View history button
    if (e.target.closest('.view-history-btn')) {
      const memberId = e.target.closest('.view-history-btn').dataset.id;
      viewDuesHistory(memberId);
    }
    
    // Add dues button
    if (e.target.closest('.add-dues-btn')) {
      const memberId = e.target.closest('.add-dues-btn').dataset.id;
      prepareAddDuesModal(memberId);
    }
    
    // Send reminder button
    if (e.target.closest('.send-reminder-btn')) {
      const memberId = e.target.closest('.send-reminder-btn').dataset.id;
      prepareSendReminderModal(memberId);
    }
    
    // Use template button
    if (e.target.closest('.use-template-btn')) {
      const templateId = e.target.closest('.use-template-btn').dataset.id;
      useTemplate(templateId);
    }
    
    // Delete template button
    if (e.target.closest('.delete-template-btn')) {
      const templateId = e.target.closest('.delete-template-btn').dataset.id;
      deleteTemplate(templateId);
    }
  });
  
  // Template tag insertion buttons
  document.querySelectorAll('.template-tag').forEach(button => {
    button.addEventListener('click', insertTemplateTag);
  });
  
  // Send reminder button in modal
  if (sendReminderBtn) {
    sendReminderBtn.addEventListener('click', sendReminder);
  }
}

// Save dues for a member
async function saveDues() {
  try {
    console.log('Starting saveDues function...');
    const memberId = document.getElementById('memberSelect').value;
    const duesAmount = parseFloat(document.getElementById('duesAmount').value);
    const duesDescription = document.getElementById('duesDescription').value.trim();
    const dueDate = document.getElementById('dueDate').value;
    
    console.log('Form values:', { memberId, duesAmount, duesDescription, dueDate });
    
    // Validate input
    if (!memberId) {
      showAlert('Please select a member.', 'danger', 'addDuesAlertPlaceholder');
      return;
    }
    
    if (isNaN(duesAmount) || duesAmount <= 0) {
      showAlert('Please enter a valid amount.', 'danger', 'addDuesAlertPlaceholder');
      return;
    }
    
    if (!duesDescription) {
      showAlert('Please enter a description.', 'danger', 'addDuesAlertPlaceholder');
      return;
    }
    
    if (!dueDate) {
      showAlert('Please select a due date.', 'danger', 'addDuesAlertPlaceholder');
      return;
    }
    
    // Show loading state on the save button
    saveDuesBtn.disabled = true;
    saveDuesBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
    
    // First check if the member exists in our currentMembers array
    const memberInMemory = currentMembers.find(m => m.id === memberId);
    if (!memberInMemory) {
      console.error(`Member with ID ${memberId} not found in currentMembers array`);
      showAlert(`Member with ID ${memberId} not found in memory. Please reload the page.`, 'danger', 'addDuesAlertPlaceholder');
      return;
    }
    
    console.log('Member found in memory:', memberInMemory);
    
    // Create new dues object - IMPORTANT: use standard Date instead of serverTimestamp
    const duesEntry = {
      amount: duesAmount,
      description: duesDescription,
      dueDate: dueDate,
      status: 'unpaid',
      createdAt: new Date().toISOString() // Use standard date instead of server timestamp
    };
    
    console.log('Created dues entry:', duesEntry);
    
    // Try to determine which collection the member document is in
    let collectionName = 'members'; // Default to members collection
    
    // First try to get the document from the members collection
    console.log(`Checking for member ${memberId} in 'members' collection...`);
    let memberDoc = await db.collection('members').doc(memberId).get();
    
    // If not found in members collection, try users collection
    if (!memberDoc.exists) {
      console.log(`Member not found in 'members' collection, checking 'users' collection...`);
      memberDoc = await db.collection('users').doc(memberId).get();
      
      if (memberDoc.exists) {
        collectionName = 'users';
        console.log(`Member found in 'users' collection`);
      } else {
        console.error('Member document not found in any collection');
        showAlert('Member not found in database. The member ID may be invalid.', 'danger', 'addDuesAlertPlaceholder');
        return;
      }
    } else {
      console.log(`Member found in 'members' collection`);
    }
    
    console.log(`Using collection: ${collectionName}`);
    console.log('Member document data:', memberDoc.data());
    
    // Get member document reference
    const memberRef = db.collection(collectionName).doc(memberId);
    
    // First check if duesHistory array exists
    const memberData = memberDoc.data();
    if (!memberData.duesHistory) {
      console.log('duesHistory array does not exist, creating it');
      // If duesHistory doesn't exist, create it with the new entry
      await memberRef.update({
        duesHistory: [duesEntry]
      });
    } else {
      console.log('duesHistory array exists, adding new entry');
      // If it exists, use arrayUnion to add the new entry
      await memberRef.update({
        duesHistory: firebase.firestore.FieldValue.arrayUnion(duesEntry)
      });
    }
    
    console.log('Successfully updated member document');
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addDuesModal'));
    modal.hide();
    
    // Refresh data
    showAlert('Dues added successfully!', 'success');
    loadMembers();
    
  } catch (error) {
    console.error('Error saving dues:', error);
    
    // Check for specific Firebase errors
    if (error.code === 'permission-denied') {
      showAlert('Permission denied. You do not have access to update this member.', 'danger', 'addDuesAlertPlaceholder');
    } else if (error.code === 'not-found') {
      showAlert('Member document not found. Try reloading the page.', 'danger', 'addDuesAlertPlaceholder');
    } else {
      showAlert('Error saving dues: ' + error.message, 'danger', 'addDuesAlertPlaceholder');
    }
  } finally {
    // Reset button state
    if (saveDuesBtn) {
      saveDuesBtn.disabled = false;
      saveDuesBtn.innerHTML = 'Save Dues';
    }
  }
}

// Prepare the add dues modal for a specific member
function prepareAddDuesModal(memberId) {
  console.log('Preparing add dues modal for member:', memberId);
  
  const member = currentMembers.find(m => m.id === memberId);
  if (!member) {
    console.error('Member not found in currentMembers array');
    showAlert('Error: Member not found', 'danger');
    return;
  }
  
  console.log('Found member:', member);
  
  // Set defaults in the modal
  document.getElementById('memberSelect').value = memberId;
  document.getElementById('duesAmount').value = '';
  document.getElementById('duesDescription').value = '';
  
  // Set default due date to 30 days from now
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  const formattedDate = thirtyDaysFromNow.toISOString().split('T')[0];
  document.getElementById('dueDate').value = formattedDate;
  
  // Update modal title with member name
  document.getElementById('addDuesModalLabel').textContent = `Add Dues for ${member.name || 'Member'}`;
  
  // Reset any previous alerts
  const alertPlaceholder = document.getElementById('alertPlaceholder');
  if (alertPlaceholder) {
    alertPlaceholder.innerHTML = '';
  }
  
  // Reset save button state
  if (saveDuesBtn) {
    saveDuesBtn.disabled = false;
    saveDuesBtn.innerHTML = 'Save Dues';
  }
  
  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById('addDuesModal'));
  modal.show();
  
  console.log('Modal prepared and shown');
}

// View dues history for a member
async function viewDuesHistory(memberId) {
  const member = currentMembers.find(m => m.id === memberId);
  if (!member) return;
  
  const historyModal = document.getElementById('duesHistoryModal');
  const historyBody = document.getElementById('duesHistoryBody');
  
  // Update modal title
  document.getElementById('duesHistoryModalLabel').textContent = `Dues History: ${member.name || 'Member'}`;
  
  // Show loading state
  historyBody.innerHTML = `<div class="text-center my-4"><i class="fas fa-spinner fa-spin me-2"></i>Loading dues history...</div>`;
  
  try {
    // Get latest member data to ensure we have the most up-to-date dues history
    const memberDoc = await db.collection('members').doc(memberId).get();
    
    if (!memberDoc.exists) {
      historyBody.innerHTML = `<div class="alert alert-danger">Member not found.</div>`;
      return;
    }
    
    const memberData = memberDoc.data();
    const duesHistory = memberData.duesHistory || [];
    
    if (duesHistory.length === 0) {
      historyBody.innerHTML = `<div class="alert alert-info">No dues history found for this member.</div>`;
    } else {
      // Sort dues by created date (newest first)
      duesHistory.sort((a, b) => {
        const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
        return dateB - dateA;
      });
      
      // Create table
      let tableHtml = `
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Date Added</th>
              <th>Description</th>
              <th>Due Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      // Add each dues entry
      duesHistory.forEach((dues, index) => {
        const createdDate = dues.createdAt ? dateFormatter.format(dues.createdAt.toDate()) : 'Unknown';
        const dueDate = dues.dueDate ? dateFormatter.format(new Date(dues.dueDate)) : 'Not set';
        
        // Status badge class
        let statusBadgeClass = 'bg-danger';
        if (dues.status === 'paid') {
          statusBadgeClass = 'bg-success';
        } else if (dues.status === 'pending') {
          statusBadgeClass = 'bg-warning text-dark';
        }
        
        tableHtml += `
          <tr>
            <td>${createdDate}</td>
            <td>${dues.description || 'No description'}</td>
            <td>${dueDate}</td>
            <td>${currencyFormatter.format(dues.amount || 0)}</td>
            <td><span class="badge ${statusBadgeClass}">${dues.status || 'unpaid'}</span></td>
            <td>
              ${dues.status !== 'paid' ? `
                <button class="btn btn-sm btn-success mark-paid-btn" data-member-id="${memberId}" data-dues-index="${index}">
                  Mark Paid
                </button>
              ` : ''}
            </td>
          </tr>
        `;
      });
      
      tableHtml += `
          </tbody>
        </table>
      `;
      
      historyBody.innerHTML = tableHtml;
      
      // Add event listeners for mark paid buttons
      historyBody.querySelectorAll('.mark-paid-btn').forEach(button => {
        button.addEventListener('click', async () => {
          const duesIndex = parseInt(button.dataset.duesIndex);
          const memberId = button.dataset.memberId;
          
          await markDuesPaid(memberId, duesIndex);
          // Update the table
          viewDuesHistory(memberId);
        });
      });
    }
  } catch (error) {
    console.error('Error loading dues history:', error);
    historyBody.innerHTML = `<div class="alert alert-danger">Error loading dues history: ${error.message}</div>`;
  }
  
  // Show the modal
  const modal = new bootstrap.Modal(historyModal);
  modal.show();
}

// Mark dues as paid
async function markDuesPaid(memberId, duesIndex) {
  try {
    // Get member document
    const memberDoc = await db.collection('members').doc(memberId).get();
    
    if (!memberDoc.exists) {
      showAlert('Member not found.', 'danger');
      return;
    }
    
    const memberData = memberDoc.data();
    const duesHistory = memberData.duesHistory || [];
    
    if (duesIndex < 0 || duesIndex >= duesHistory.length) {
      showAlert('Dues entry not found.', 'danger');
      return;
    }
    
    // Update the dues entry
    duesHistory[duesIndex].status = 'paid';
    duesHistory[duesIndex].paymentDate = new Date().toISOString();
    
    // Update the member document
    await db.collection('members').doc(memberId).update({
      duesHistory: duesHistory
    });
    
    showAlert('Dues marked as paid.', 'success');
    loadMembers(); // Refresh the main table
    
  } catch (error) {
    console.error('Error marking dues as paid:', error);
    showAlert('Error marking dues as paid: ' + error.message, 'danger');
  }
}

// Load notification templates
async function loadTemplates() {
  try {
    // Clear current templates
    templates = [];
    
    // Show loading state
    if (templatesContainer) {
      templatesContainer.innerHTML = `<div class="text-center my-4"><i class="fas fa-spinner fa-spin me-2"></i>Loading templates...</div>`;
    }
    
    // Get templates from Firestore
    const snapshot = await db.collection('notificationTemplates').get();
    
    // If no templates found
    if (snapshot.empty) {
      if (templatesContainer) {
        templatesContainer.innerHTML = `<div class="alert alert-info">No templates found. Create your first template!</div>`;
      }
      return;
    }
    
    // Process each template
    snapshot.forEach(doc => {
      templates.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort templates by name
    templates.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    // Refresh the templates container
    refreshTemplatesContainer();
    
  } catch (error) {
    console.error('Error loading templates:', error);
    if (templatesContainer) {
      templatesContainer.innerHTML = `<div class="alert alert-danger">Error loading templates: ${error.message}</div>`;
    }
  }
}

// Refresh the templates container
function refreshTemplatesContainer() {
  if (!templatesContainer) return;
  
  // Clear the container
  templatesContainer.innerHTML = '';
  
  if (templates.length === 0) {
    templatesContainer.innerHTML = `<div class="alert alert-info">No templates found. Create your first template!</div>`;
    return;
  }
  
  // Create a card for each template
  templates.forEach(template => {
    const templateCard = document.createElement('div');
    templateCard.className = 'card mb-3 template-card';
    templateCard.innerHTML = `
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="card-title m-0">${template.name || 'Unnamed Template'}</h5>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-primary use-template-btn" data-id="${template.id}">
            <i class="fas fa-file-import me-1"></i> Use
          </button>
          <button class="btn btn-sm btn-outline-danger delete-template-btn" data-id="${template.id}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
      <div class="card-body">
        <p class="card-text">${template.content || 'No content'}</p>
      </div>
    `;
    
    templatesContainer.appendChild(templateCard);
  });
}

// Save a new notification template
async function saveTemplate() {
  const templateName = document.getElementById('templateName').value.trim();
  const templateContent = document.getElementById('templateContent').value.trim();
  
  // Validate input
  if (!templateName) {
    showAlert('Please enter a template name.', 'danger');
    return;
  }
  
  if (!templateContent) {
    showAlert('Please enter template content.', 'danger');
    return;
  }
  
  try {
    // Create new template
    await db.collection('notificationTemplates').add({
      name: templateName,
      content: templateContent,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addTemplateModal'));
    modal.hide();
    
    // Clear form
    document.getElementById('templateName').value = '';
    document.getElementById('templateContent').value = '';
    
    // Refresh templates
    showAlert('Template saved successfully!', 'success');
    loadTemplates();
    
  } catch (error) {
    console.error('Error saving template:', error);
    showAlert('Error saving template: ' + error.message, 'danger');
  }
}

// Use a template
function useTemplate(templateId) {
  const template = templates.find(t => t.id === templateId);
  if (!template) return;
  
  // Set template content in the reminder modal
  const messageInput = document.getElementById('reminderMessage');
  if (messageInput) {
    messageInput.value = template.content;
  }
  
  // Open the send reminder modal if it's not already open
  const reminderModal = document.getElementById('sendReminderModal');
  if (reminderModal && !reminderModal.classList.contains('show')) {
    const modal = new bootstrap.Modal(reminderModal);
    modal.show();
  }
}

// Delete a template
async function deleteTemplate(templateId) {
  if (!confirm('Are you sure you want to delete this template?')) {
    return;
  }
  
  try {
    await db.collection('notificationTemplates').doc(templateId).delete();
    showAlert('Template deleted successfully!', 'success');
    loadTemplates();
  } catch (error) {
    console.error('Error deleting template:', error);
    showAlert('Error deleting template: ' + error.message, 'danger');
  }
}

// Insert template tag into the message
function insertTemplateTag(e) {
  const tag = e.target.dataset.tag;
  const messageInput = document.getElementById('reminderMessage');
  
  if (!messageInput || !tag) return;
  
  // Get current cursor position
  const start = messageInput.selectionStart;
  const end = messageInput.selectionEnd;
  
  // Insert the tag
  const currentValue = messageInput.value;
  messageInput.value = currentValue.substring(0, start) + tag + currentValue.substring(end);
  
  // Reset cursor position
  messageInput.focus();
  messageInput.selectionStart = start + tag.length;
  messageInput.selectionEnd = start + tag.length;
}

// Prepare the send reminder modal
function prepareSendReminderModal(memberId) {
  const member = currentMembers.find(m => m.id === memberId);
  if (!member) return;
  
  // Set member ID in hidden field
  document.getElementById('reminderMemberId').value = memberId;
  
  // Update modal title
  document.getElementById('sendReminderModalLabel').textContent = `Send Reminder to ${member.name || 'Member'}`;
  
  // Prepare default message (use first template if available)
  const messageInput = document.getElementById('reminderMessage');
  if (messageInput) {
    if (templates.length > 0) {
      messageInput.value = templates[0].content || '';
    } else {
      messageInput.value = `Dear ${member.name || 'Parishioner'},\n\nThis is a reminder that you have outstanding dues of ${currencyFormatter.format(member.outstandingDues || 0)}. Please make your payment at your earliest convenience.\n\nThank you,\nChurch Administration`;
    }
  }
  
  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById('sendReminderModal'));
  modal.show();
}

// Send a reminder to a member
async function sendReminder() {
  const memberId = document.getElementById('reminderMemberId').value;
  const message = document.getElementById('reminderMessage').value.trim();
  
  // Validate input
  if (!memberId) {
    showAlert('No member selected.', 'danger');
    return;
  }
  
  if (!message) {
    showAlert('Please enter a message.', 'danger');
    return;
  }
  
  try {
    // Get member
    const member = currentMembers.find(m => m.id === memberId);
    if (!member) {
      showAlert('Member not found.', 'danger');
      return;
    }
    
    // Check if member has FCM token
    if (!member.fcmToken) {
      showAlert('This member has not enabled notifications.', 'danger');
      return;
    }
    
    // Show loading state
    sendReminderBtn.disabled = true;
    sendReminderBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
    
    // Process template tags
    let processedMessage = message;
    processedMessage = processedMessage.replace(/\{name\}/g, member.name || 'Parishioner');
    processedMessage = processedMessage.replace(/\{email\}/g, member.email || '');
    processedMessage = processedMessage.replace(/\{amount\}/g, currencyFormatter.format(member.outstandingDues || 0));
    processedMessage = processedMessage.replace(/\{phone\}/g, member.phone || '');
    
    // Call the sendDuesReminder cloud function
    const sendDuesReminder = firebase.functions().httpsCallable('sendDuesReminder');
    const result = await sendDuesReminder({
      memberId: memberId,
      message: processedMessage,
      amount: member.outstandingDues || 0
    });
    
    // Add to reminder history
    await db.collection('reminderHistory').add({
      memberId: memberId,
      memberName: member.name || 'Unknown',
      message: processedMessage,
      amount: member.outstandingDues || 0,
      sentAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'sent'
    });
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('sendReminderModal'));
    modal.hide();
    
    // Reset form
    document.getElementById('reminderMessage').value = '';
    
    // Show success message
    showAlert('Reminder sent successfully!', 'success');
    
    // Refresh history
    loadReminderHistory();
    
  } catch (error) {
    console.error('Error sending reminder:', error);
    showAlert('Error sending reminder: ' + error.message, 'danger');
  } finally {
    // Reset button
    sendReminderBtn.disabled = false;
    sendReminderBtn.innerHTML = 'Send Reminder';
  }
}

// Load reminder history
async function loadReminderHistory() {
  if (!reminderHistory) return;
  
  try {
    // Show loading state
    reminderHistory.innerHTML = `<div class="text-center my-4"><i class="fas fa-spinner fa-spin me-2"></i>Loading history...</div>`;
    
    // Get history from Firestore (latest 20 entries)
    const snapshot = await db.collection('reminderHistory')
      .orderBy('sentAt', 'desc')
      .limit(20)
      .get();
    
    // If no history found
    if (snapshot.empty) {
      reminderHistory.innerHTML = `<div class="text-center">No reminder history found.</div>`;
      return;
    }
    
    // Clear and create list
    reminderHistory.innerHTML = '';
    const historyList = document.createElement('ul');
    historyList.className = 'list-group';
    
    // Add each history item
    snapshot.forEach(doc => {
      const data = doc.data();
      const sentDate = data.sentAt ? dateFormatter.format(data.sentAt.toDate()) : 'Unknown date';
      
      const listItem = document.createElement('li');
      listItem.className = 'list-group-item d-flex justify-content-between align-items-start';
      listItem.innerHTML = `
        <div class="ms-2 me-auto">
          <div class="fw-bold">${data.memberName || 'Unknown member'}</div>
          <small>${sentDate} - ${currencyFormatter.format(data.amount || 0)}</small>
        </div>
        <span class="badge bg-primary rounded-pill">
          <i class="fas fa-bell"></i>
        </span>
      `;
      
      historyList.appendChild(listItem);
    });
    
    reminderHistory.appendChild(historyList);
    
  } catch (error) {
    console.error('Error loading reminder history:', error);
    reminderHistory.innerHTML = `<div class="alert alert-danger">Error loading history: ${error.message}</div>`;
  }
}

// Show an alert message
function showAlert(message, type = 'info', container = 'alertPlaceholder') {
  const alertPlaceholder = document.getElementById(container);
  if (!alertPlaceholder) {
    console.error(`Alert container with ID '${container}' not found`);
    return;
  }
  
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  
  alertPlaceholder.appendChild(wrapper);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    const alert = wrapper.querySelector('.alert');
    if (alert) {
      bootstrap.Alert.getOrCreateInstance(alert).close();
    }
  }, 5000);
}

// Sidebar toggle functionality
const sidebarToggle = document.getElementById('sidebar-toggle');
if (sidebarToggle) {
  sidebarToggle.addEventListener('click', function() {
    document.querySelector('.sidebar').classList.toggle('collapsed');
    document.querySelector('.content').classList.toggle('expanded');
  });
}

// Initialize tooltips
document.addEventListener('DOMContentLoaded', function() {
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});

// Function to initialize the dashboard
async function initializeDashboard() {
  try {
    // Initialize components
    await Promise.all([
      loadMembers(),
      loadTemplates(),
      loadReminderHistory()
    ]);
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup debug tools
    setupDebugTools();
    
    // Setup sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('collapsed');
        document.querySelector('.main-content').classList.toggle('expanded');
      });
    }
    
    // If no members were found, create test data
    if (currentMembers.length === 0) {
      console.log('No members found, attempting to create test data...');
      await createTestDataIfEmpty();
    }
    
    console.log('Dashboard initialized successfully');
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    showAlert('Error initializing dashboard: ' + error.message, 'danger');
  }
}

// Create test data if collections are empty
async function createTestDataIfEmpty() {
  try {
    // Check if templates exist
    const templateSnapshot = await db.collection('notificationTemplates').get();
    if (templateSnapshot.empty) {
      console.log('Creating sample notification template...');
      await db.collection('notificationTemplates').add({
        name: 'Dues Reminder Template',
        content: 'Dear {name},\n\nThis is a reminder that you have an outstanding due amount of {amount}. Please make your payment at your earliest convenience.\n\nThank you,\nChurch Administration',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Check if we have test member
    const testMemberSnapshot = await db.collection('members').where('email', '==', 'test@example.com').get();
    if (testMemberSnapshot.empty) {
      console.log('Creating sample member...');
      const user = auth.currentUser;
      
      // Create a test member with dues
      const testMember = {
        name: 'Test Member',
        email: 'test@example.com',
        phone: '123-456-7890',
        status: 'active',
        role: 'member',
        createdBy: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        duesHistory: [
          {
            amount: 50,
            description: 'Annual membership dues',
            dueDate: new Date().toISOString(),
            status: 'unpaid',
            createdAt: new Date().toISOString() // Use ISO string instead of serverTimestamp
          }
        ]
      };
      
      await db.collection('members').add(testMember);
    }
    
    // Reload data after creating test data
    await loadMembers();
    await loadTemplates();
    
  } catch (error) {
    console.error('Error creating test data:', error);
    showAlert('Could not create test data: ' + error.message, 'warning');
  }
}

// For local development, uncomment this line if needed
// functions.useEmulator("localhost", 5001);

// Handle logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
      window.location.href = '../login.html';
    }).catch(error => {
      console.error('Error signing out:', error);
      showAlert('Error signing out: ' + error.message, 'danger');
    });
  });
}

// Handle mobile menu toggle
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
if (mobileMenuToggle) {
  mobileMenuToggle.addEventListener('click', () => {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('mobile-visible');
  });
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    
    if (sidebar && sidebar.classList.contains('mobile-visible') && 
        !sidebar.contains(e.target) && 
        e.target !== mobileMenuToggle) {
      sidebar.classList.remove('mobile-visible');
    }
  });
}

// Handle window resize events
window.addEventListener('resize', function() {
  if (window.innerWidth >= 768) {
    // Reset sidebar visibility for desktop view
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.remove('mobile-visible');
    }
  }
});

// Create PDF export functionality
if (document.getElementById('exportPdfBtn')) {
  document.getElementById('exportPdfBtn').addEventListener('click', generatePdfReport);
}

// Generate PDF report
async function generatePdfReport() {
  try {
    // Show loading state
    const exportBtn = document.getElementById('exportPdfBtn');
    exportBtn.disabled = true;
    exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating PDF...';
    
    // Filter members with dues
    const membersWithDues = currentMembers.filter(member => {
      return calculateOutstandingDues(member) > 0;
    });
    
    // Check if there are members with dues
    if (membersWithDues.length === 0) {
      showAlert('There are no members with outstanding dues to include in the report.', 'warning');
      exportBtn.disabled = false;
      exportBtn.innerHTML = '<i class="fas fa-file-pdf me-2"></i>Export PDF';
      return;
    }
    
    // Create new jsPDF instance
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Outstanding Dues Report', 14, 20);
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add summary
    const totalDues = membersWithDues.reduce((sum, member) => sum + calculateOutstandingDues(member), 0);
    doc.text(`Total Outstanding Dues: ${currencyFormatter.format(totalDues)}`, 14, 40);
    doc.text(`Number of Members with Dues: ${membersWithDues.length}`, 14, 48);
    
    // Add table headers
    let y = 60;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Name', 14, y);
    doc.text('Email', 70, y);
    doc.text('Phone', 140, y);
    doc.text('Outstanding Dues', 180, y);
    
    // Add horizontal line
    y += 2;
    doc.line(14, y, 195, y);
    y += 6;
    
    // Reset font
    doc.setFont(undefined, 'normal');
    
    // Add data rows
    membersWithDues.forEach(member => {
      // Check if we need a new page
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      
      // Add member data
      doc.text(member.name || 'Not provided', 14, y);
      doc.text(member.email || 'Not provided', 70, y);
      doc.text(member.phone || 'Not provided', 140, y);
      doc.text(currencyFormatter.format(calculateOutstandingDues(member)), 180, y);
      
      y += 10;
    });
    
    // Save the PDF
    doc.save('OutstandingDuesReport.pdf');
    
    // Show success message
    showAlert('PDF report generated successfully!', 'success');
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    showAlert('Error generating PDF: ' + error.message, 'danger');
  } finally {
    // Reset button
    const exportBtn = document.getElementById('exportPdfBtn');
    exportBtn.disabled = false;
    exportBtn.innerHTML = '<i class="fas fa-file-pdf me-2"></i>Export PDF';
  }
}

// Handle sending bulk reminders
if (document.getElementById('bulkReminderBtn')) {
  document.getElementById('bulkReminderBtn').addEventListener('click', showBulkReminderModal);
}

// Show bulk reminder modal
function showBulkReminderModal() {
  // Filter members with dues
  const membersWithDues = currentMembers.filter(member => {
    return calculateOutstandingDues(member) > 0;
  });
  
  // Check if there are members with dues
  if (membersWithDues.length === 0) {
    showAlert('There are no members with outstanding dues to send reminders to.', 'warning');
    return;
  }
  
  // Update member count
  document.getElementById('bulkReminderCount').textContent = membersWithDues.length;
  
  // Calculate total dues
  const totalDues = membersWithDues.reduce((sum, member) => sum + calculateOutstandingDues(member), 0);
  document.getElementById('bulkReminderAmount').textContent = currencyFormatter.format(totalDues);
  
  // Update templates dropdown
  const templateSelect = document.getElementById('bulkTemplateSelect');
  templateSelect.innerHTML = '<option value="">Select a template...</option>';
  
  templates.forEach(template => {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = template.name || 'Unnamed Template';
    templateSelect.appendChild(option);
  });
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('bulkReminderModal'));
  modal.show();
}

// Send bulk reminders
async function sendBulkReminders() {
  const templateId = document.getElementById('bulkTemplateSelect').value;
  
  // Validate template selection
  if (!templateId) {
    showAlert('Please select a template.', 'danger');
    return;
  }
  
  // Find template
  const template = templates.find(t => t.id === templateId);
  if (!template) {
    showAlert('Selected template not found.', 'danger');
    return;
  }
  
  try {
    // Show loading state
    const sendBtn = document.getElementById('sendBulkReminderBtn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
    
    // Filter members with dues
    const membersWithDues = currentMembers.filter(member => {
      return calculateOutstandingDues(member) > 0;
    });
    
    // Check if there are members with dues
    if (membersWithDues.length === 0) {
      showAlert('There are no members with outstanding dues to send reminders to.', 'warning');
      sendBtn.disabled = false;
      sendBtn.innerHTML = 'Send Reminders';
      return;
    }
    
    // Batch cloud function calls
    const batch = [];
    const sendDuesReminder = firebase.functions().httpsCallable('sendDuesReminder');
    
    for (const member of membersWithDues) {
      // Skip members without FCM token
      if (!member.fcmToken) continue;
      
      // Process template tags
      let processedMessage = template.content;
      processedMessage = processedMessage.replace(/\{name\}/g, member.name || 'Parishioner');
      processedMessage = processedMessage.replace(/\{email\}/g, member.email || '');
      processedMessage = processedMessage.replace(/\{amount\}/g, currencyFormatter.format(calculateOutstandingDues(member)));
      processedMessage = processedMessage.replace(/\{phone\}/g, member.phone || '');
      
      // Add to batch
      batch.push({
        memberId: member.id,
        message: processedMessage,
        amount: calculateOutstandingDues(member)
      });
      
      // Add to reminder history
      await db.collection('reminderHistory').add({
        memberId: member.id,
        memberName: member.name || 'Unknown',
        message: processedMessage,
        amount: calculateOutstandingDues(member),
        sentAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'sent'
      });
    }
    
    // Send reminders in batches of 10
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < batch.length; i += 10) {
      const batchSlice = batch.slice(i, i + 10);
      
      try {
        const result = await sendDuesReminder({ batch: batchSlice });
        successCount += batchSlice.length;
      } catch (error) {
        console.error('Error sending batch reminders:', error);
        errorCount += batchSlice.length;
      }
    }
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('bulkReminderModal'));
    modal.hide();
    
    // Show results
    if (errorCount === 0) {
      showAlert(`Successfully sent ${successCount} reminders!`, 'success');
    } else {
      showAlert(`Sent ${successCount} reminders, but failed to send ${errorCount} reminders.`, 'warning');
    }
    
    // Refresh history
    loadReminderHistory();
    
  } catch (error) {
    console.error('Error sending bulk reminders:', error);
    showAlert('Error sending bulk reminders: ' + error.message, 'danger');
  } finally {
    // Reset button
    const sendBtn = document.getElementById('sendBulkReminderBtn');
    sendBtn.disabled = false;
    sendBtn.innerHTML = 'Send Reminders';
  }
}

// Add event listener for bulk reminder send button
if (document.getElementById('sendBulkReminderBtn')) {
  document.getElementById('sendBulkReminderBtn').addEventListener('click', sendBulkReminders);
}

// Debug functions for database troubleshooting
function setupDebugTools() {
  // Toggle debug panel visibility
  const debugCard = document.getElementById('debugCard');
  const toggleDebugBtn = document.getElementById('toggleDebugBtn');
  
  // Add debug button to the page header
  const pageHeader = document.querySelector('.page-header');
  if (pageHeader) {
    const debugButton = document.createElement('button');
    debugButton.className = 'btn btn-sm btn-outline-secondary ms-2';
    debugButton.innerHTML = '<i class="fas fa-bug"></i> Debug';
    debugButton.id = 'showDebugBtn';
    debugButton.addEventListener('click', () => {
      debugCard.style.display = 'block';
      updateDebugInfo();
    });
    pageHeader.appendChild(debugButton);
  }
  
  // Toggle debug visibility
  if (toggleDebugBtn) {
    toggleDebugBtn.addEventListener('click', () => {
      debugCard.style.display = 'none';
    });
  }
  
  // Refresh debug info
  const refreshDebugBtn = document.getElementById('refreshDebugBtn');
  if (refreshDebugBtn) {
    refreshDebugBtn.addEventListener('click', updateDebugInfo);
  }
  
  // Create test template
  const createTestTemplateBtn = document.getElementById('createTestTemplateBtn');
  if (createTestTemplateBtn) {
    createTestTemplateBtn.addEventListener('click', createTestTemplate);
  }
  
  // Create test member
  const createTestMemberBtn = document.getElementById('createTestMemberBtn');
  if (createTestMemberBtn) {
    createTestMemberBtn.addEventListener('click', createTestMember);
  }
  
  // Add test button for checking security rules
  const securityTestBtn = document.createElement('button');
  securityTestBtn.className = 'btn btn-outline-warning btn-sm me-2';
  securityTestBtn.innerHTML = 'Test Security Rules';
  securityTestBtn.id = 'testSecurityBtn';
  securityTestBtn.addEventListener('click', testSecurityRules);
  
  // Add fix members button
  const fixMembersBtn = document.createElement('button');
  fixMembersBtn.className = 'btn btn-outline-danger btn-sm me-2';
  fixMembersBtn.innerHTML = 'Fix Member Issues';
  fixMembersBtn.id = 'fixMembersBtn';
  fixMembersBtn.addEventListener('click', fixMemberIssues);
  
  const actionsCard = document.querySelector('#debugCard .card:last-child .card-body');
  if (actionsCard) {
    actionsCard.appendChild(securityTestBtn);
    actionsCard.appendChild(fixMembersBtn);
  }
}

// Update debug info
async function updateDebugInfo() {
  const collectionsDebug = document.getElementById('collectionsDebug');
  const authDebug = document.getElementById('authDebug');
  
  if (!collectionsDebug || !authDebug) return;
  
  try {
    // Check collections
    collectionsDebug.innerHTML = '<p><i class="fas fa-spinner fa-spin me-2"></i>Loading collections...</p>';
    
    // Get collections data
    let debugInfo = '<h5>Collections</h5><ul>';
    
    // Check members collection
    const membersSnapshot = await db.collection('members').get();
    debugInfo += `<li>members: ${membersSnapshot.size} documents</li>`;
    
    // Check users collection
    const usersSnapshot = await db.collection('users').get();
    debugInfo += `<li>users: ${usersSnapshot.size} documents</li>`;
    
    // Check templates collection
    const templatesSnapshot = await db.collection('notificationTemplates').get();
    debugInfo += `<li>notificationTemplates: ${templatesSnapshot.size} documents</li>`;
    
    // Check reminder history collection
    const historySnapshot = await db.collection('reminderHistory').get();
    debugInfo += `<li>reminderHistory: ${historySnapshot.size} documents</li>`;
    
    debugInfo += '</ul>';
    
    // Sample documents
    if (membersSnapshot.size > 0) {
      const sampleDoc = membersSnapshot.docs[0].data();
      debugInfo += '<h5>Sample Member</h5>';
      debugInfo += `<pre>${JSON.stringify(sampleDoc, null, 2)}</pre>`;
    }
    
    collectionsDebug.innerHTML = debugInfo;
    
    // Check auth status
    const user = auth.currentUser;
    
    if (user) {
      // Check if admin
      const adminDoc = await db.collection('Admin').doc(user.uid).get();
      const memberDoc = await db.collection('members').doc(user.uid).get();
      
      authDebug.innerHTML = `
        <p><strong>User ID:</strong> ${user.uid}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>In Admin collection:</strong> ${adminDoc.exists ? 'Yes' : 'No'}</p>
        <p><strong>In Members collection:</strong> ${memberDoc.exists ? 'Yes' : 'No'}</p>
        <p><strong>Is admin role:</strong> ${memberDoc.exists && memberDoc.data().role === 'admin' ? 'Yes' : 'No'}</p>
      `;
    } else {
      authDebug.innerHTML = '<p>Not authenticated</p>';
    }
    
  } catch (error) {
    console.error('Error updating debug info:', error);
    collectionsDebug.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
  }
}

// Create test template
async function createTestTemplate() {
  try {
    // Create a test template
    const template = {
      name: 'Test Template ' + new Date().toISOString().slice(0, 19),
      content: 'Dear {name},\n\nThis is a test template. You have {amount} in outstanding dues.\n\nBest regards,\nAdmin',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('notificationTemplates').add(template);
    
    showAlert('Test template created successfully!', 'success');
    loadTemplates();
    updateDebugInfo();
    
  } catch (error) {
    console.error('Error creating test template:', error);
    showAlert('Error creating test template: ' + error.message, 'danger');
  }
}

// Create test member
async function createTestMember() {
  try {
    const user = auth.currentUser;
    
    // Create a test member
    const member = {
      name: 'Test Member ' + Math.floor(Math.random() * 1000),
      email: `test${Math.floor(Math.random() * 10000)}@example.com`,
      phone: '123-456-7890',
      status: 'active',
      role: 'member',
      createdBy: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      duesHistory: [
        {
          amount: Math.floor(Math.random() * 100) + 10,
          description: 'Test dues',
          dueDate: new Date().toISOString(),
          status: 'unpaid',
          createdAt: new Date().toISOString() // Use ISO string instead of serverTimestamp
        }
      ]
    };
    
    await db.collection('members').add(member);
    
    showAlert('Test member created successfully!', 'success');
    loadMembers();
    updateDebugInfo();
    
  } catch (error) {
    console.error('Error creating test member:', error);
    showAlert('Error creating test member: ' + error.message, 'danger');
  }
}

// Test Firestore security rules for the dues functionality
async function testSecurityRules() {
  const resultsDiv = document.createElement('div');
  resultsDiv.className = 'mt-3 p-3 border rounded bg-light';
  resultsDiv.innerHTML = '<h6>Testing Security Rules...</h6>';
  
  const actionsCard = document.querySelector('#debugCard .card:last-child .card-body');
  if (actionsCard) {
    // Remove any previous results
    const previousResults = actionsCard.querySelector('.border.rounded.bg-light');
    if (previousResults) {
      previousResults.remove();
    }
    
    actionsCard.appendChild(resultsDiv);
  }
  
  try {
    const tests = [];
    const user = auth.currentUser;
    
    // Check if the user is authenticated
    if (!user) {
      resultsDiv.innerHTML = '<div class="alert alert-danger">No authenticated user!</div>';
      return;
    }
    
    // Test 1: Read members collection
    try {
      const membersSnapshot = await db.collection('members').limit(1).get();
      tests.push({
        name: 'Read members collection',
        result: true,
        details: `Success - found ${membersSnapshot.size} documents`
      });
    } catch (error) {
      tests.push({
        name: 'Read members collection',
        result: false,
        details: error.message
      });
    }
    
    // Test 2: Read a specific member document
    if (currentMembers.length > 0) {
      const testMemberId = currentMembers[0].id;
      try {
        const memberDoc = await db.collection('members').doc(testMemberId).get();
        tests.push({
          name: `Read member document (${testMemberId})`,
          result: true,
          details: `Success - document exists: ${memberDoc.exists}`
        });
      } catch (error) {
        tests.push({
          name: `Read member document (${testMemberId})`,
          result: false,
          details: error.message
        });
      }
    }
    
    // Test 3: Write to members collection (update)
    if (currentMembers.length > 0) {
      const testMemberId = currentMembers[0].id;
      try {
        // Try to update a test field
        await db.collection('members').doc(testMemberId).update({
          _testField: firebase.firestore.FieldValue.serverTimestamp()
        });
        tests.push({
          name: `Update member document (${testMemberId})`,
          result: true,
          details: 'Success - able to update member document'
        });
        
        // Now try to update with duesHistory
        try {
          const duesEntry = {
            amount: 1,
            description: 'Test dues entry',
            dueDate: new Date().toISOString(),
            status: 'unpaid',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          
          await db.collection('members').doc(testMemberId).update({
            duesHistory: firebase.firestore.FieldValue.arrayUnion(duesEntry)
          });
          
          tests.push({
            name: 'Update member duesHistory',
            result: true,
            details: 'Success - able to add to duesHistory array'
          });
        } catch (error) {
          tests.push({
            name: 'Update member duesHistory',
            result: false,
            details: error.message
          });
        }
      } catch (error) {
        tests.push({
          name: `Update member document (${testMemberId})`,
          result: false,
          details: error.message
        });
      }
    }
    
    // Test 4: Check template permissions
    try {
      const templatesSnapshot = await db.collection('notificationTemplates').limit(1).get();
      tests.push({
        name: 'Read notificationTemplates collection',
        result: true,
        details: `Success - found ${templatesSnapshot.size} templates`
      });
    } catch (error) {
      tests.push({
        name: 'Read notificationTemplates collection',
        result: false,
        details: error.message
      });
    }
    
    // Test 5: Create template
    try {
      const templateRef = await db.collection('notificationTemplates').add({
        name: 'Test Template (Delete Me)',
        content: 'This is a test template',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      tests.push({
        name: 'Create template',
        result: true,
        details: `Success - created template with ID ${templateRef.id}`
      });
      
      // Clean up by deleting the test template
      await templateRef.delete();
    } catch (error) {
      tests.push({
        name: 'Create template',
        result: false,
        details: error.message
      });
    }
    
    // Display test results
    let resultsHTML = '<h6>Security Rule Tests:</h6><ul class="list-group">';
    
    tests.forEach(test => {
      const resultClass = test.result ? 'success' : 'danger';
      const resultIcon = test.result ? 'check-circle' : 'times-circle';
      
      resultsHTML += `
        <li class="list-group-item list-group-item-${resultClass}">
          <i class="fas fa-${resultIcon} me-2"></i>
          <strong>${test.name}:</strong> ${test.details}
        </li>
      `;
    });
    
    resultsHTML += '</ul>';
    
    // Additional information
    if (tests.some(test => !test.result)) {
      resultsHTML += `
        <div class="mt-3 alert alert-warning">
          <p><strong>Permissions issues detected!</strong></p>
          <p>Update your Firestore security rules to fix the issues above.</p>
        </div>
      `;
    }
    
    resultsDiv.innerHTML = resultsHTML;
    
  } catch (error) {
    resultsDiv.innerHTML = `<div class="alert alert-danger">Error running tests: ${error.message}</div>`;
  }
}

// Fix member document issues
async function fixMemberIssues() {
  const resultsDiv = document.createElement('div');
  resultsDiv.className = 'mt-3 p-3 border rounded bg-light';
  resultsDiv.innerHTML = '<h6><i class="fas fa-spin fa-spinner me-2"></i>Fixing Member Issues...</h6>';
  
  const actionsCard = document.querySelector('#debugCard .card:last-child .card-body');
  if (actionsCard) {
    // Remove any previous results
    const previousResults = actionsCard.querySelector('.border.rounded.bg-light');
    if (previousResults) {
      previousResults.remove();
    }
    
    actionsCard.appendChild(resultsDiv);
  }
  
  try {
    const results = [];
    
    // Step 1: Check users collection
    const usersSnapshot = await db.collection('users').get();
    results.push(`Found ${usersSnapshot.size} users in 'users' collection`);
    
    // Step 2: Check members collection
    const membersSnapshot = await db.collection('members').get();
    results.push(`Found ${membersSnapshot.size} members in 'members' collection`);
    
    // Step 3: Create a map of all members with their dues
    const memberMap = new Map();
    
    // First process users
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      
      // Fix any server timestamps in the duesHistory array
      let fixedDuesHistory = [];
      if (userData.duesHistory && Array.isArray(userData.duesHistory)) {
        fixedDuesHistory = userData.duesHistory.map(dues => {
          // Create a clean copy without server timestamps
          return {
            ...dues,
            createdAt: dues.createdAt instanceof Date ? dues.createdAt.toISOString() : 
                      (typeof dues.createdAt === 'string' ? dues.createdAt : new Date().toISOString())
          };
        });
      }
      
      memberMap.set(doc.id, {
        collection: 'users',
        id: doc.id,
        name: userData.name || userData.displayName || 'Unknown',
        email: userData.email || 'No Email',
        duesHistory: fixedDuesHistory
      });
    });
    
    // Then process members (overwriting user data if duplicate IDs)
    membersSnapshot.forEach(doc => {
      const memberData = doc.data();
      const existingMember = memberMap.get(doc.id);
      
      // Fix any server timestamps in the duesHistory array
      let fixedDuesHistory = [];
      if (memberData.duesHistory && Array.isArray(memberData.duesHistory)) {
        fixedDuesHistory = memberData.duesHistory.map(dues => {
          // Create a clean copy without server timestamps
          return {
            ...dues,
            createdAt: dues.createdAt instanceof Date ? dues.createdAt.toISOString() : 
                      (typeof dues.createdAt === 'string' ? dues.createdAt : new Date().toISOString())
          };
        });
      }
      
      if (existingMember) {
        // Merge duesHistory arrays if both exist
        let mergedDuesHistory = [];
        
        if (existingMember.duesHistory && existingMember.duesHistory.length > 0) {
          mergedDuesHistory = [...existingMember.duesHistory];
        }
        
        if (fixedDuesHistory.length > 0) {
          // Add each dues entry from members collection if not already present
          fixedDuesHistory.forEach(duesEntry => {
            if (!mergedDuesHistory.some(existingEntry => 
              existingEntry.amount === duesEntry.amount && 
              existingEntry.description === duesEntry.description &&
              existingEntry.dueDate === duesEntry.dueDate
            )) {
              mergedDuesHistory.push(duesEntry);
            }
          });
        }
        
        memberMap.set(doc.id, {
          collection: 'members', // Prefer members collection
          id: doc.id,
          name: memberData.name || existingMember.name,
          email: memberData.email || existingMember.email,
          duesHistory: mergedDuesHistory
        });
        
        results.push(`Merged member data for: ${memberData.name || existingMember.name}`);
      } else {
        memberMap.set(doc.id, {
          collection: 'members',
          id: doc.id,
          name: memberData.name || 'Unknown',
          email: memberData.email || 'No Email',
          duesHistory: fixedDuesHistory
        });
      }
    });
    
    // Step 4: Fix any issues with members
    let fixedCount = 0;
    
    for (const [id, memberData] of memberMap.entries()) {
      // Fix 1: Ensure duesHistory exists and doesn't have server timestamps
      if (!memberData.duesHistory) {
        results.push(`Adding empty duesHistory array for ${memberData.name}`);
        await db.collection(memberData.collection).doc(id).update({
          duesHistory: []
        });
        fixedCount++;
      } else if (memberData.duesHistory.length > 0) {
        // Check if we need to fix server timestamps
        const needsFix = memberData.duesHistory.some(dues => 
          typeof dues.createdAt === 'object' && !(dues.createdAt instanceof Date) && dues.createdAt !== null);
        
        if (needsFix) {
          results.push(`Fixing server timestamps in duesHistory for ${memberData.name}`);
          await db.collection(memberData.collection).doc(id).update({
            duesHistory: memberData.duesHistory
          });
          fixedCount++;
        }
      }
      
      // Fix 2: Copy dues data from users to members if needed
      if (memberData.collection === 'users' && memberData.duesHistory && memberData.duesHistory.length > 0) {
        // Check if a corresponding members document exists
        const memberDoc = await db.collection('members').doc(id).get();
        
        if (!memberDoc.exists) {
          // Create new member document
          results.push(`Creating new member document for user: ${memberData.name}`);
          
          const newMemberData = {
            name: memberData.name,
            email: memberData.email,
            duesHistory: memberData.duesHistory,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          
          await db.collection('members').doc(id).set(newMemberData);
          fixedCount++;
        } else {
          // Update existing member document with dues
          const existingData = memberDoc.data();
          
          if (!existingData.duesHistory) {
            results.push(`Copying dues history from users to members for: ${memberData.name}`);
            await db.collection('members').doc(id).update({
              duesHistory: memberData.duesHistory
            });
            fixedCount++;
          }
        }
      }
    }
    
    // Step 5: Create a test member with dues if none exist
    if (membersSnapshot.size === 0 && usersSnapshot.size === 0) {
      results.push('No members found, creating a test member');
      await createTestMember();
      fixedCount++;
    }
    
    // Display results
    resultsDiv.innerHTML = `
      <h6>Member Issues Fixed:</h6>
      <p>Fixed ${fixedCount} issues</p>
      <ul class="list-group">
        ${results.map(result => `<li class="list-group-item">${result}</li>`).join('')}
      </ul>
      <div class="mt-3">
        <button class="btn btn-primary btn-sm" id="reloadAfterFix">Reload Members</button>
      </div>
    `;
    
    // Add reload button handler
    const reloadBtn = document.getElementById('reloadAfterFix');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', loadMembers);
    }
    
  } catch (error) {
    resultsDiv.innerHTML = `<div class="alert alert-danger">Error fixing member issues: ${error.message}</div>`;
    console.error('Error fixing member issues:', error);
  }
}
