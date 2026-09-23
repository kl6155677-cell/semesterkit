const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDB() {
    let connection;
    try {
        console.log('Connecting to MySQL/TiDB server...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false },
            multipleStatements: true
        });

        console.log('Connected! Executing schema...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await connection.query(schema);

        // Helper to safely add column if missing
        const addColumnIfNotExists = async (table, column, def) => {
            try {
                const [cols] = await connection.query(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
                if (cols.length === 0) {
                    console.log(`Adding missing column ${column} to ${table}...`);
                    await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
                }
            } catch (err) {
                console.warn(`Column check warning for ${table}.${column}:`, err.message);
            }
        };

        // Ensure users columns
        await addColumnIfNotExists('users', 'status', "ENUM('active', 'suspended') DEFAULT 'active'");
        await addColumnIfNotExists('users', 'avatar_url', "TEXT NULL");
        await addColumnIfNotExists('users', 'updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        try { await connection.query("ALTER TABLE users MODIFY COLUMN avatar_url TEXT NULL"); } catch(e){}

        // Ensure colleges columns
        await addColumnIfNotExists('colleges', 'logo_url', "TEXT NULL");
        await addColumnIfNotExists('colleges', 'banner_url', "TEXT NULL");
        await addColumnIfNotExists('colleges', 'description', "TEXT NULL");
        await addColumnIfNotExists('colleges', 'is_featured', "BOOLEAN DEFAULT FALSE");
        await addColumnIfNotExists('colleges', 'is_active', "BOOLEAN DEFAULT TRUE");
        await addColumnIfNotExists('colleges', 'display_order', "INT DEFAULT 0");
        try { 
            await connection.query("ALTER TABLE colleges MODIFY COLUMN logo_url TEXT NULL"); 
            await connection.query("ALTER TABLE colleges MODIFY COLUMN banner_url TEXT NULL"); 
        } catch(e){}

        // Ensure branches columns
        await addColumnIfNotExists('branches', 'code', "VARCHAR(20) NULL");
        await addColumnIfNotExists('branches', 'program', "ENUM('B.Tech', 'M.Tech', 'PhD', 'All') DEFAULT 'B.Tech'");
        await addColumnIfNotExists('branches', 'department', "VARCHAR(100) NULL");
        await addColumnIfNotExists('branches', 'is_active', "BOOLEAN DEFAULT TRUE");
        await addColumnIfNotExists('branches', 'display_order', "INT DEFAULT 0");

        // Ensure semesters columns
        await addColumnIfNotExists('semesters', 'level', "ENUM('B.Tech', 'M.Tech', 'PhD') DEFAULT 'B.Tech'");
        await addColumnIfNotExists('semesters', 'display_order', "INT DEFAULT 0");
        try { await connection.query("ALTER TABLE semesters MODIFY COLUMN name VARCHAR(100) NOT NULL"); } catch(e){}

        // Ensure subjects columns
        await addColumnIfNotExists('subjects', 'code', "VARCHAR(50) NULL");
        await addColumnIfNotExists('subjects', 'program', "ENUM('B.Tech', 'M.Tech', 'PhD') DEFAULT 'B.Tech'");
        await addColumnIfNotExists('subjects', 'is_research_area', "BOOLEAN DEFAULT FALSE");
        await addColumnIfNotExists('subjects', 'is_active', "BOOLEAN DEFAULT TRUE");

        // Ensure resource_types columns
        await addColumnIfNotExists('resource_types', 'program', "ENUM('All', 'B.Tech', 'M.Tech', 'PhD') DEFAULT 'All'");
        await addColumnIfNotExists('resource_types', 'icon', "VARCHAR(50) NULL");
        await addColumnIfNotExists('resource_types', 'display_order', "INT DEFAULT 0");

        // Ensure resources columns
        await addColumnIfNotExists('resources', 'file_name', "VARCHAR(255) NULL");
        await addColumnIfNotExists('resources', 'file_type', "VARCHAR(50) NULL");
        await addColumnIfNotExists('resources', 'file_size', "INT DEFAULT 0");
        await addColumnIfNotExists('resources', 'program', "ENUM('B.Tech', 'M.Tech', 'PhD') DEFAULT 'B.Tech'");
        await addColumnIfNotExists('resources', 'rejection_reason', "TEXT NULL");
        await addColumnIfNotExists('resources', 'is_featured', "BOOLEAN DEFAULT FALSE");
        await addColumnIfNotExists('resources', 'is_archived', "BOOLEAN DEFAULT FALSE");
        await addColumnIfNotExists('resources', 'tags', "VARCHAR(255) NULL");
        await addColumnIfNotExists('resources', 'updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

        // Ensure downloads columns
        await addColumnIfNotExists('downloads', 'ip_address', "VARCHAR(45) NULL");

        try { await connection.query("ALTER TABLE testimonials MODIFY COLUMN avatar_url TEXT NULL"); } catch(e){}
        try { await connection.query("ALTER TABLE media MODIFY COLUMN file_path TEXT NOT NULL"); } catch(e){}

        console.log('Schema tables & columns verified.');

        // 1. Password hashing for Admin and sample users
        // Clean up any test records
        await connection.query("SET FOREIGN_KEY_CHECKS = 0");
        await connection.query("DELETE FROM bookmarks WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE '%Automated Test%') OR user_id IN (SELECT id FROM users WHERE email LIKE 'student_%' OR name = 'Test Student' OR email = 'testadmin@semesterkit.com')");
        await connection.query("DELETE FROM downloads WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE '%Automated Test%') OR user_id IN (SELECT id FROM users WHERE email LIKE 'student_%' OR name = 'Test Student' OR email = 'testadmin@semesterkit.com')");
        await connection.query("DELETE FROM resources WHERE title LIKE '%Automated Test%' OR contributor_id IN (SELECT id FROM users WHERE email LIKE 'student_%' OR name = 'Test Student' OR email = 'testadmin@semesterkit.com')");
        await connection.query("DELETE FROM users WHERE email LIKE 'student_%' OR name = 'Test Student' OR email = 'testadmin@semesterkit.com'");
        await connection.query("SET FOREIGN_KEY_CHECKS = 1");

        // 1. Password hashing for Admin and sample users
        const salt = await bcrypt.genSalt(10);
        const adminHash = await bcrypt.hash('admin123', salt);
        const studentHash = await bcrypt.hash('student123', salt);

        // 2. Insert or update Admin User
        await connection.query(`
            INSERT INTO users (id, name, email, password_hash, role, status)
            VALUES (1, 'SemesterKit Admin', 'admin@semesterkit.com', ?, 'admin', 'active')
            ON DUPLICATE KEY UPDATE name = 'SemesterKit Admin', role = 'admin', password_hash = ?;
        `, [adminHash, adminHash]);

        // 3. Keep schema and admin account ready
        console.log('Ready for live admin data uploads.');

        // 12. Footer Links
        const footerLinksData = [
            // Quick Links
            [1, 'Quick Links', 'Home', 'index.html', 1, 1],
            [2, 'Quick Links', 'B.Tech', 'btech.html', 2, 1],
            [3, 'Quick Links', 'M.Tech', 'mtech.html', 3, 1],
            [4, 'Quick Links', 'PhD', 'phd.html', 4, 1],
            [5, 'Quick Links', 'Upload', 'upload.html', 5, 1],
            [6, 'Quick Links', 'Community', 'page.html?slug=contribute', 6, 1],
            // Resources
            [7, 'Resources', 'Notes', 'btech.html', 1, 1],
            [8, 'Resources', 'PYQs', 'btech.html', 2, 1],
            [9, 'Resources', 'Books', 'btech.html', 3, 1],
            [10, 'Resources', 'Lab Manuals', 'btech.html', 4, 1],
            [11, 'Resources', 'Previous Papers', 'btech.html', 5, 1],
            [12, 'Resources', 'Syllabus', 'btech.html', 6, 1],
            // Help
            [13, 'Help', 'Contact Us', 'page.html?slug=contact-us', 1, 1],
            [14, 'Help', 'FAQs', 'page.html?slug=faqs', 2, 1],
            [15, 'Help', 'Contribute', 'page.html?slug=contribute', 3, 1],
            [16, 'Help', 'Report Issue', 'page.html?slug=report-issue', 4, 1],
            [17, 'Help', 'Privacy Policy', 'page.html?slug=privacy-policy', 5, 1],
            [18, 'Help', 'Terms of Service', 'page.html?slug=terms-of-service', 6, 1]
        ];
        for (const fl of footerLinksData) {
            await connection.query(`
                INSERT INTO footer_links (id, column_title, title, url, display_order, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE title=VALUES(title), url=VALUES(url);
            `, fl);
        }

        // 13. Navigation Items
        const navItemsData = [
            [1, 'Home', 'index.html', 1, 1],
            [2, 'B.Tech', 'btech.html', 2, 1],
            [3, 'M.Tech', 'mtech.html', 3, 1],
            [4, 'PhD', 'phd.html', 4, 1],
            [5, 'Upload', 'upload.html', 5, 1],
            [6, 'Community', 'page.html?slug=contribute', 6, 1]
        ];
        for (const ni of navItemsData) {
            await connection.query(`
                INSERT INTO navigation_items (id, label, url, display_order, is_active)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE label=VALUES(label), url=VALUES(url);
            `, ni);
        }

        // 14. Static Informational Pages
        const staticPagesData = [
            [
                1, 'about-us', 'About SemesterKit',
                '# About SemesterKit.com\n\n**For Students. By Students.**\n\nSemesterKit.com is a premier student-driven academic platform designed to make engineering study materials, previous year question papers (PYQs), books, research papers, and lab manuals effortlessly accessible to students across NITs, IITs, IIITs, and top engineering institutions.\n\n### Our Mission\nDemocratize high-quality academic notes and resources so every engineering student has the best tools to excel in their academic journey.\n\n### Key Pillars\n- **Quality Verification**: Peer-reviewed and admin-moderated study materials.\n- **Open Collaboration**: Encouraging students to share knowledge and empower fellow classmates.\n- **Multi-Discipline Coverage**: Supporting B.Tech, M.Tech, and PhD stages across Computer Science, Electronics, Mechanical, Electrical, Civil, and more.'
            ],
            [
                2, 'contact-us', 'Contact Support',
                '# Contact SemesterKit Team\n\nHave questions, feedback, or suggestions? We would love to hear from you!\n\n**Email**: support@semesterkit.com  \n**Academic Inquiries**: team@semesterkit.com  \n**Address**: Tech Hub Campus, Bangalore, India  \n\n### Office Hours\nMonday – Saturday: 9:00 AM – 7:00 PM IST'
            ],
            [
                3, 'faqs', 'Frequently Asked Questions',
                '# Frequently Asked Questions\n\n### 1. How do I upload study materials?\nClick on the **Upload** button in the top navigation bar, select your university, branch, semester, subject, and file (PDF, DOC, ZIP), and click Publish. Your upload will be reviewed by our team and published once approved.\n\n### 2. Is SemesterKit completely free to use?\nYes! Accessing, viewing, and downloading study materials is 100% free for all engineering students.\n\n### 3. How long does moderation take?\nOur academic moderators review submissions usually within 12–24 hours.\n\n### 4. Can I bookmark resources for later?\nYes, logged-in students can click the bookmark icon on any material to save it directly to **My Vault**.'
            ],
            [
                4, 'privacy-policy', 'Privacy Policy',
                '# Privacy Policy\n\nLast updated: September 2026\n\nSemesterKit.com respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you visit our website.\n\n### Data We Collect\n- Account credentials (name, email, institutional affiliation)\n- Uploaded academic files and descriptions\n- Interaction metrics (views, downloads, bookmarks)\n\nWe do NOT sell or share personal student information with third-party advertisers.'
            ],
            [
                5, 'terms-of-service', 'Terms of Service',
                '# Terms of Service\n\nWelcome to SemesterKit.com. By accessing or using our platform, you agree to comply with our Terms of Service.\n\n### Acceptable Use\n- Users must only upload academic materials they have the right or authorization to share.\n- Prohibited content includes commercial pirated media, offensive material, and malicious files.\n- SemesterKit administrators reserve the right to remove any uploaded content that violates community standards.'
            ],
            [
                6, 'report-issue', 'Report an Issue',
                '# Report an Issue / Content Moderation\n\nIf you find any inaccurate material, copyright concerns, or broken downloads, please let our team know immediately.\n\nSend an email to **moderation@semesterkit.com** with the Resource ID and details of the issue.'
            ],
            [
                7, 'contribute', 'Contribute & Join the Community',
                '# Join the SemesterKit Contributor Network\n\nHelp thousands of engineering students across India by sharing your handwritten notes, PYQ solutions, and lab assignments.\n\n### Why Contribute?\n- Get recognized on the **Top Contributors** leaderboard\n- Build an impressive academic portfolio\n- Empower students in your college and across the nation'
            ]
        ];

        for (const sp of staticPagesData) {
            await connection.query(`
                INSERT INTO static_pages (id, slug, title, content, is_published)
                VALUES (?, ?, ?, ?, 1)
                ON DUPLICATE KEY UPDATE title=VALUES(title), content=VALUES(content);
            `, sp);
        }

        // 15. Settings (Hero, Stats, Header, Footer, SEO, Upload Limits)
        const defaultSettings = [
            ['site_name', 'SemesterKit.com'],
            ['tagline', 'Everything You Need For Your Engineering Journey'],
            ['site_logo_text', 'SemesterKit.com'],
            ['hero_badge', 'Learn • Share • Grow Together'],
            ['hero_title', 'Everything You Need<br/><span class="text-[#1d7bf5]">For Your Engineering Journey</span>'],
            ['hero_subtitle', 'Get semester-wise notes, PYQs, books, lab manuals and more for NITs, IIITs, and other engineering colleges. Upload and help fellow students too!'],
            ['hero_doodle_text', 'Students<br/>Help<br/>Students <span class="text-rose-500">❤️</span>'],
            ['search_placeholder', 'Search for college, branch, subject, or material...'],
            ['popular_searches', 'Data Structures, Operating System, DBMS, Digital Electronics, Thermodynamics, Machine Learning'],
            ['hero_image_url', ''],
            // Degree cards
            ['btech_card_title', 'B.Tech'],
            ['btech_card_desc', 'Notes, PYQs, Books & More'],
            ['mtech_card_title', 'M.Tech'],
            ['mtech_card_desc', 'Research Papers & Notes'],
            ['phd_card_title', 'PhD'],
            ['phd_card_desc', 'Thesis, Papers & Resources'],
            // Statistics (auto mode or manual override)
            ['stats_auto_mode', 'true'],
            ['stat_resources_override', ''],
            ['stat_users_override', ''],
            ['stat_colleges_override', ''],
            ['stat_downloads_override', ''],
            ['stats_doodle_text', 'Knowledge<br/>Builds<br/>Better Engineers'],
            // CTA section
            ['cta_title', 'Have Notes or PYQs to Share?'],
            ['cta_description', 'Help thousands of students. Upload your material and get recognized!'],
            ['cta_button_text', 'Upload Now'],
            ['cta_button_url', 'upload.html'],
            ['cta_doodle_text', 'Share<br/>Learn<br/>Make an Impact <span class="text-rose-500">❤️</span>'],
            // Footer & Social
            ['footer_about_heading', 'SemesterKit.com'],
            ['footer_about_tagline', 'For Students. By Students.'],
            ['footer_about_description', 'A student-driven platform to access and share engineering study materials from NITs, IIITs and other colleges across India.'],
            ['footer_copyright', '© 2026 SemesterKit.com. All rights reserved.'],
            ['footer_doodle_text', 'Learn • Share • Grow • Together ❤️'],
            ['social_twitter', 'https://twitter.com/semesterkit'],
            ['social_instagram', 'https://instagram.com/semesterkit'],
            ['social_youtube', 'https://youtube.com/semesterkit'],
            ['social_linkedin', 'https://linkedin.com/company/semesterkit'],
            // Platform configuration
            ['max_upload_size_mb', '50'],
            ['allowed_file_types', 'pdf,doc,docx,zip,rar,ppt,pptx,jpg,jpeg,png'],
            ['seo_meta_title', 'SemesterKit.com - Everything You Need For Your Engineering Journey'],
            ['seo_meta_description', 'Semester-wise notes, PYQs, books, lab manuals, research papers, and thesis materials for engineering students across NITs, IITs, IIITs.'],
            ['seo_meta_keywords', 'engineering notes, NIT Trichy notes, PYQ solutions, semester notes, BTech, MTech, PhD research']
        ];

        for (const [key, val] of defaultSettings) {
            await connection.query(`
                INSERT INTO settings (setting_key, setting_value)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);
            `, [key, val]);
        }

        console.log('Database initialization & seeding completed successfully!');
        await connection.end();
    } catch (err) {
        console.error('Database initialization error:', err);
        if (connection) await connection.end();
        process.exit(1);
    }
}

initDB();
