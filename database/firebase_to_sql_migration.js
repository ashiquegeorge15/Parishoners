/**
 * Parishoners - Firebase to SQL Migration Script for Dues
 * 
 * This script helps migrate dues data from Firebase Firestore to a relational SQL database.
 * It assumes:
 * 1. Firebase Admin SDK is already initialized
 * 2. MySQL/MariaDB database connection is established
 * 3. The target SQL database schema has been created using dues_schema.sql
 */

// Firebase Admin SDK setup (placeholder - implement with actual SDK)
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// MySQL database connection setup (placeholder - implement with actual DB client)
const mysql = require('mysql2/promise');

// Migration configuration
const config = {
  batchSize: 100,          // Process records in batches to avoid memory issues
  timeoutBetweenBatches: 1000,  // Milliseconds to wait between batches
  logLevel: 'info',        // 'debug', 'info', 'warn', 'error'
};

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Initialize Firestore
const db = admin.firestore();

// Database connection pool
let pool;

// Logger function
function log(level, message, data = null) {
  if (config.logLevel === 'debug' || 
      (config.logLevel === 'info' && level !== 'debug') ||
      (config.logLevel === 'warn' && (level === 'warn' || level === 'error')) ||
      (config.logLevel === 'error' && level === 'error')) {
    
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    
    if (data && (level === 'debug' || level === 'error')) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

// Initialize MySQL connection pool
async function initializeDatabase() {
  try {
    pool = await mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'parishoners',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    log('info', 'Database connection pool initialized');
    return true;
  } catch (error) {
    log('error', 'Failed to initialize database connection', error);
    return false;
  }
}

// Migration entry point
async function migrateDuesData() {
  log('info', 'Starting dues data migration from Firebase to SQL');
  
  // Initialize database connection
  const dbInitialized = await initializeDatabase();
  if (!dbInitialized) {
    log('error', 'Aborting migration due to database initialization failure');
    return;
  }
  
  try {
    // Define migration steps
    await migrateUsers();
    await migrateDuesCategories();
    await migrateDues();
    await migrateReminders();
    await migrateTemplates();
    
    log('info', 'Migration completed successfully');
  } catch (error) {
    log('error', 'Migration failed', error);
  } finally {
    // Close database connection
    if (pool) {
      await pool.end();
      log('info', 'Database connection closed');
    }
  }
}

// Migrate users
async function migrateUsers() {
  log('info', 'Migrating users...');
  
  // Get user count for progress tracking
  const userSnapshot = await db.collection('users').count().get();
  const userCount = userSnapshot.data().count;
  log('info', `Found ${userCount} users to migrate`);
  
  let usersProcessed = 0;
  let lastDoc = null;
  
  while (true) {
    // Build query with pagination
    let query = db.collection('users').orderBy('email').limit(config.batchSize);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    // Get batch of users
    const snapshot = await query.get();
    if (snapshot.empty) break;
    
    const batch = [];
    
    // Process users in this batch
    snapshot.forEach(doc => {
      const userData = doc.data();
      
      batch.push([
        doc.id,                              // user_id
        userData.name || 'Unknown',          // name
        userData.email || `${doc.id}@unknown.com`,  // email
        userData.phone || null,              // phone
        userData.role || 'member',           // role
        userData.status || 'active',         // status
        userData.createdAt ? new Date(userData.createdAt) : new Date()  // created_at
      ]);
      
      lastDoc = doc;
      usersProcessed++;
    });
    
    // Insert batch into SQL
    if (batch.length > 0) {
      const sql = `
        INSERT IGNORE INTO users (user_id, name, email, phone, role, status, created_at)
        VALUES ?
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        phone = VALUES(phone),
        role = VALUES(role),
        status = VALUES(status)
      `;
      
      await pool.query(sql, [batch]);
      log('info', `Migrated ${usersProcessed}/${userCount} users`);
    }
    
    // If less than batch size, we're done
    if (snapshot.size < config.batchSize) break;
    
    // Wait between batches to avoid overloading
    await new Promise(resolve => setTimeout(resolve, config.timeoutBetweenBatches));
  }
  
  log('info', `Users migration completed. ${usersProcessed} users processed.`);
}

// Migrate dues categories
async function migrateDuesCategories() {
  log('info', 'Migrating dues categories...');
  
  // Check if Firebase has categories collection
  const categoriesCollection = await db.collection('duesCategories').get();
  
  if (categoriesCollection.empty) {
    log('warn', 'No dues categories found in Firebase. Using default categories from SQL schema.');
    return;
  }
  
  const batch = [];
  
  categoriesCollection.forEach(doc => {
    const categoryData = doc.data();
    
    batch.push([
      categoryData.name,                    // name
      categoryData.description || null,     // description
      categoryData.isRecurring || false,    // is_recurring
      categoryData.recurringPeriod || null  // recurring_period
    ]);
  });
  
  if (batch.length > 0) {
    const sql = `
      INSERT IGNORE INTO dues_categories (name, description, is_recurring, recurring_period)
      VALUES ?
      ON DUPLICATE KEY UPDATE
      description = VALUES(description),
      is_recurring = VALUES(is_recurring),
      recurring_period = VALUES(recurring_period)
    `;
    
    await pool.query(sql, [batch]);
    log('info', `Migrated ${batch.length} dues categories`);
  }
  
  log('info', 'Dues categories migration completed.');
}

// Migrate dues data
async function migrateDues() {
  log('info', 'Migrating dues...');
  
  let totalDuesCount = 0;
  let processedUsersCount = 0;
  
  // Get all users
  const usersSnapshot = await db.collection('users').get();
  const totalUsers = usersSnapshot.size;
  
  // Process each user
  for (const userDoc of usersSnapshot.docs) {
    try {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // Check if user has dues history in the user document
      if (userData.duesHistory && Array.isArray(userData.duesHistory) && userData.duesHistory.length > 0) {
        await migrateDuesForUser(userId, userData.duesHistory);
        totalDuesCount += userData.duesHistory.length;
      }
      
      // Also check the dedicated dues collection
      const duesSnapshot = await db.collection('dues').where('userId', '==', userId).get();
      if (!duesSnapshot.empty) {
        const duesData = duesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        await migrateDuesFromCollection(userId, duesData);
        totalDuesCount += duesData.length;
      }
      
      processedUsersCount++;
      
      if (processedUsersCount % 10 === 0 || processedUsersCount === totalUsers) {
        log('info', `Processed ${processedUsersCount}/${totalUsers} users' dues`);
      }
      
    } catch (error) {
      log('error', `Error migrating dues for user ${userDoc.id}`, error);
    }
  }
  
  log('info', `Dues migration completed. ${totalDuesCount} dues entries processed for ${processedUsersCount} users.`);
}

// Helper function to migrate dues from a user's duesHistory array
async function migrateDuesForUser(userId, duesHistory) {
  if (!duesHistory || duesHistory.length === 0) return;
  
  const batch = [];
  
  // Get category mappings
  const categories = await getCategoryMappings();
  
  for (const due of duesHistory) {
    // Find appropriate category ID or use default
    let categoryId = null;
    if (due.description) {
      const matchingCategory = Object.values(categories).find(cat => 
        due.description.toLowerCase().includes(cat.name.toLowerCase())
      );
      if (matchingCategory) {
        categoryId = matchingCategory.id;
      }
    }
    
    batch.push([
      userId,                                // user_id
      categoryId,                            // category_id
      due.description || 'Miscellaneous Due',  // description
      parseFloat(due.amount) || 0,           // amount
      due.dueDate ? new Date(due.dueDate) : new Date(),  // due_date
      due.status || 'unpaid',                // status
      due.status === 'paid' && due.paymentDate ? new Date(due.paymentDate) : null,  // payment_date
      due.paymentMethod || null,             // payment_method
      due.paymentReference || null,          // payment_reference
      due.notes || null,                     // notes
      due.createdAt ? new Date(due.createdAt) : new Date()  // created_at
    ]);
  }
  
  if (batch.length > 0) {
    const sql = `
      INSERT INTO dues (user_id, category_id, description, amount, due_date, status, 
                       payment_date, payment_method, payment_reference, notes, created_at)
      VALUES ?
    `;
    
    await pool.query(sql, [batch]);
    log('debug', `Migrated ${batch.length} dues entries for user ${userId}`);
  }
}

// Helper function to migrate dues from the dedicated dues collection
async function migrateDuesFromCollection(userId, duesData) {
  if (!duesData || duesData.length === 0) return;
  
  const batch = [];
  
  // Get category mappings
  const categories = await getCategoryMappings();
  
  for (const due of duesData) {
    // Find appropriate category ID or use default
    let categoryId = null;
    if (due.description) {
      const matchingCategory = Object.values(categories).find(cat => 
        due.description.toLowerCase().includes(cat.name.toLowerCase())
      );
      if (matchingCategory) {
        categoryId = matchingCategory.id;
      }
    }
    
    batch.push([
      userId,                                // user_id
      categoryId,                            // category_id
      due.description || 'Miscellaneous Due',  // description
      parseFloat(due.amount) || 0,           // amount
      due.dueDate ? new Date(due.dueDate) : new Date(),  // due_date
      due.status || 'unpaid',                // status
      due.status === 'paid' && due.paymentDate ? new Date(due.paymentDate) : null,  // payment_date
      due.paymentMethod || null,             // payment_method
      due.paymentReference || null,          // payment_reference
      due.notes || null,                     // notes
      due.createdAt ? new Date(due.createdAt) : new Date()  // created_at
    ]);
  }
  
  if (batch.length > 0) {
    const sql = `
      INSERT INTO dues (user_id, category_id, description, amount, due_date, status, 
                       payment_date, payment_method, payment_reference, notes, created_at)
      VALUES ?
    `;
    
    await pool.query(sql, [batch]);
    log('debug', `Migrated ${batch.length} dues entries from dues collection for user ${userId}`);
  }
}

// Helper function to get category mappings from SQL
async function getCategoryMappings() {
  const [rows] = await pool.query('SELECT * FROM dues_categories');
  
  const categoryMap = {};
  for (const row of rows) {
    categoryMap[row.name] = {
      id: row.category_id,
      name: row.name
    };
  }
  
  return categoryMap;
}

// Migrate reminders
async function migrateReminders() {
  log('info', 'Migrating reminders...');
  
  // Check if Firebase has reminders collection
  const remindersCollection = await db.collection('reminders').get();
  
  if (remindersCollection.empty) {
    log('warn', 'No reminders found in Firebase.');
    return;
  }
  
  // Get dues mapping (Firebase ID to SQL ID)
  const duesMapping = await getDuesMapping();
  
  let remindersProcessed = 0;
  let batch = [];
  
  for (const reminderDoc of remindersCollection.docs) {
    const reminderData = reminderDoc.data();
    
    // Find the corresponding due in SQL
    let dueId = null;
    if (reminderData.dueId && duesMapping[reminderData.dueId]) {
      dueId = duesMapping[reminderData.dueId];
    } else if (reminderData.userId && reminderData.dueDate) {
      // Try to find by user and date
      const [rows] = await pool.query(
        'SELECT due_id FROM dues WHERE user_id = ? AND due_date = ?',
        [reminderData.userId, new Date(reminderData.dueDate)]
      );
      
      if (rows.length > 0) {
        dueId = rows[0].due_id;
      }
    }
    
    if (!dueId) {
      log('warn', `Could not find corresponding due for reminder ${reminderDoc.id}`);
      continue;
    }
    
    batch.push([
      dueId,                                 // due_id
      reminderData.userId,                   // user_id
      reminderData.message || 'Payment reminder',  // message
      reminderData.sentAt ? new Date(reminderData.sentAt) : new Date(),  // sent_at
      reminderData.sentBy || 'system',       // sent_by
      reminderData.readStatus || false,      // read_status
      reminderData.readAt ? new Date(reminderData.readAt) : null  // read_at
    ]);
    
    remindersProcessed++;
    
    // Process in batches
    if (batch.length >= config.batchSize) {
      await saveRemindersBatch(batch);
      batch = [];
      
      // Wait between batches
      await new Promise(resolve => setTimeout(resolve, config.timeoutBetweenBatches));
    }
  }
  
  // Process remaining reminders
  if (batch.length > 0) {
    await saveRemindersBatch(batch);
  }
  
  log('info', `Reminders migration completed. ${remindersProcessed} reminders processed.`);
}

// Helper function to save a batch of reminders
async function saveRemindersBatch(batch) {
  if (batch.length === 0) return;
  
  const sql = `
    INSERT INTO payment_reminders (due_id, user_id, message, sent_at, sent_by, read_status, read_at)
    VALUES ?
  `;
  
  await pool.query(sql, [batch]);
  log('debug', `Saved ${batch.length} reminders`);
}

// Helper function to get dues mapping from Firebase IDs to SQL IDs
async function getDuesMapping() {
  // This is a placeholder - in a real migration you would need to maintain
  // a mapping between Firebase IDs and SQL IDs
  // For now, we'll return an empty mapping
  return {};
}

// Migrate templates
async function migrateTemplates() {
  log('info', 'Migrating reminder templates...');
  
  // Check if Firebase has templates collection
  const templatesCollection = await db.collection('notificationTemplates').get();
  
  if (templatesCollection.empty) {
    log('warn', 'No reminder templates found in Firebase.');
    return;
  }
  
  const batch = [];
  
  for (const templateDoc of templatesCollection.docs) {
    const templateData = templateDoc.data();
    
    batch.push([
      templateData.name || `Template ${templateDoc.id}`,  // name
      templateData.content || '',            // content
      templateData.createdBy || 'system',    // created_by
      templateData.createdAt ? new Date(templateData.createdAt) : new Date()  // created_at
    ]);
  }
  
  if (batch.length > 0) {
    const sql = `
      INSERT INTO reminder_templates (name, content, created_by, created_at)
      VALUES ?
    `;
    
    await pool.query(sql, [batch]);
    log('info', `Migrated ${batch.length} reminder templates`);
  }
  
  log('info', 'Reminder templates migration completed.');
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateDuesData()
    .then(() => {
      log('info', 'Migration script completed');
      process.exit(0);
    })
    .catch(error => {
      log('error', 'Migration script failed', error);
      process.exit(1);
    });
}

module.exports = {
  migrateDuesData
}; 