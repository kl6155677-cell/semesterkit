CREATE DATABASE IF NOT EXISTS semesterkit;
USE semesterkit;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    college_id INT NULL,
    branch_id INT NULL,
    role ENUM('student', 'admin', 'moderator') DEFAULT 'student',
    status ENUM('active', 'suspended') DEFAULT 'active',
    avatar_url TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Colleges Table
CREATE TABLE IF NOT EXISTS colleges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type ENUM('NIT', 'IIT', 'IIIT', 'Other') DEFAULT 'Other',
    logo_url TEXT NULL,
    banner_url TEXT NULL,
    description TEXT NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Programs Table
CREATE TABLE IF NOT EXISTS programs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. Branches Table
CREATE TABLE IF NOT EXISTS branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NULL,
    program ENUM('B.Tech', 'M.Tech', 'PhD', 'All') DEFAULT 'B.Tech',
    department VARCHAR(100) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0
);

-- 5. Semesters Table
CREATE TABLE IF NOT EXISTS semesters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    level ENUM('B.Tech', 'M.Tech', 'PhD') DEFAULT 'B.Tech',
    display_order INT DEFAULT 0
);

-- 6. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NULL,
    branch_id INT NULL,
    semester_id INT NULL,
    program ENUM('B.Tech', 'M.Tech', 'PhD') DEFAULT 'B.Tech',
    is_research_area BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE SET NULL
);

-- 7. Resource Types Table
CREATE TABLE IF NOT EXISTS resource_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    program ENUM('All', 'B.Tech', 'M.Tech', 'PhD') DEFAULT 'All',
    icon VARCHAR(50) NULL,
    display_order INT DEFAULT 0
);

-- 8. Resources Table
CREATE TABLE IF NOT EXISTS resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_path VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NULL,
    file_type VARCHAR(50) NULL,
    file_size INT DEFAULT 0,
    program ENUM('B.Tech', 'M.Tech', 'PhD') DEFAULT 'B.Tech',
    college_id INT NULL,
    branch_id INT NULL,
    semester_id INT NULL,
    subject_id INT NULL,
    resource_type_id INT NULL,
    contributor_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    rejection_reason TEXT NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    views INT DEFAULT 0,
    downloads INT DEFAULT 0,
    helpful_yes INT DEFAULT 0,
    helpful_no INT DEFAULT 0,
    tags VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE SET NULL,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    FOREIGN KEY (resource_type_id) REFERENCES resource_types(id) ON DELETE SET NULL,
    FOREIGN KEY (contributor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Bookmarks (Saved Resources)
CREATE TABLE IF NOT EXISTS bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    resource_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    UNIQUE KEY user_resource_unique (user_id, resource_id)
);

-- 10. Download History
CREATE TABLE IF NOT EXISTS downloads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    resource_id INT NOT NULL,
    ip_address VARCHAR(45) NULL,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

-- 11. Testimonials Table
CREATE TABLE IF NOT EXISTS testimonials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    college VARCHAR(150) NOT NULL,
    branch VARCHAR(100) NULL,
    avatar_url TEXT NULL,
    review TEXT NOT NULL,
    rating INT DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Media Library Table
CREATE TABLE IF NOT EXISTS media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50) NULL,
    file_size INT DEFAULT 0,
    category VARCHAR(50) DEFAULT 'general',
    alt_text VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Static Pages Table
CREATE TABLE IF NOT EXISTS static_pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    content MEDIUMTEXT NOT NULL,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 14. Footer Links Table
CREATE TABLE IF NOT EXISTS footer_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    column_title VARCHAR(100) NOT NULL,
    title VARCHAR(100) NOT NULL,
    url VARCHAR(255) NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- 15. Navigation Items Table
CREATE TABLE IF NOT EXISTS navigation_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    label VARCHAR(50) NOT NULL,
    url VARCHAR(255) NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- 16. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value LONGTEXT
);
