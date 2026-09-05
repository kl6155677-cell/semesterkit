CREATE DATABASE IF NOT EXISTS semesterkit;
USE semesterkit;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    college_id INT,
    branch_id INT,
    role ENUM('student', 'admin') DEFAULT 'student',
    acs_credits INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Colleges Table
CREATE TABLE IF NOT EXISTS colleges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type ENUM('NIT', 'IIT', 'IIIT', 'Other') DEFAULT 'Other'
);

-- 3. Branches Table
CREATE TABLE IF NOT EXISTS branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- 4. Semesters Table
CREATE TABLE IF NOT EXISTS semesters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL,
    level ENUM('B.Tech', 'M.Tech', 'PhD') DEFAULT 'B.Tech'
);

-- 5. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    branch_id INT,
    semester_id INT,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (semester_id) REFERENCES semesters(id)
);

-- 6. Resource Types Table
CREATE TABLE IF NOT EXISTS resource_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

-- 7. Resources Table
CREATE TABLE IF NOT EXISTS resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_path VARCHAR(255) NOT NULL,
    college_id INT,
    branch_id INT,
    semester_id INT,
    subject_id INT,
    resource_type_id INT,
    contributor_id INT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    views INT DEFAULT 0,
    downloads INT DEFAULT 0,
    helpful_yes INT DEFAULT 0,
    helpful_no INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (college_id) REFERENCES colleges(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (semester_id) REFERENCES semesters(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (resource_type_id) REFERENCES resource_types(id),
    FOREIGN KEY (contributor_id) REFERENCES users(id)
);

-- 8. Bookmarks (Saved Resources)
CREATE TABLE IF NOT EXISTS bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    resource_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (resource_id) REFERENCES resources(id),
    UNIQUE KEY user_resource_unique (user_id, resource_id)
);

-- 9. Download History
CREATE TABLE IF NOT EXISTS downloads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    resource_id INT,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (resource_id) REFERENCES resources(id)
);

-- 10. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT
);

-- Insert default settings
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('hero_image', '');
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('site_name', 'SemesterKit.com');
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('tagline', 'Everything You Need For Your Engineering Journey');

