-- Dues Schema for Parishoners System
-- This schema defines the structure for storing dues information in a relational database.

-- Users table (already exists in main schema, shown here for reference)
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'member',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Dues Categories table
CREATE TABLE IF NOT EXISTS dues_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_period VARCHAR(20), -- 'monthly', 'quarterly', 'annually', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Dues table
CREATE TABLE IF NOT EXISTS dues (
    due_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    category_id INT,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'paid', 'overdue', 'pending'
    payment_date TIMESTAMP NULL,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES dues_categories(category_id) ON DELETE SET NULL
);

-- Payment Reminders table
CREATE TABLE IF NOT EXISTS payment_reminders (
    reminder_id INT AUTO_INCREMENT PRIMARY KEY,
    due_id INT NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_by VARCHAR(36) NOT NULL, -- admin who sent the reminder
    read_status BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (due_id) REFERENCES dues(due_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (sent_by) REFERENCES users(user_id) ON DELETE NO ACTION
);

-- Reminder Templates table
CREATE TABLE IF NOT EXISTS reminder_templates (
    template_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE NO ACTION
);

-- Payment Methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    method_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sample data for dues categories
INSERT INTO dues_categories (name, description, is_recurring, recurring_period) VALUES 
('Annual Membership', 'Annual church membership fee', TRUE, 'annually'),
('Special Project', 'Contribution for church building project', FALSE, NULL),
('Youth Program', 'Support for youth activities', FALSE, NULL),
('Monthly Tithe', 'Regular monthly tithe', TRUE, 'monthly');

-- Sample data for payment methods
INSERT INTO payment_methods (name, description) VALUES 
('Cash', 'In-person cash payment'),
('Bank Transfer', 'Direct bank transfer to church account'),
('Online Payment', 'Payment through church website'),
('Mobile Money', 'Payment via mobile payment service');

-- Indexes for performance
CREATE INDEX idx_dues_user_id ON dues(user_id);
CREATE INDEX idx_dues_status ON dues(status);
CREATE INDEX idx_dues_due_date ON dues(due_date);
CREATE INDEX idx_reminders_user_id ON payment_reminders(user_id);
CREATE INDEX idx_dues_category ON dues(category_id); 