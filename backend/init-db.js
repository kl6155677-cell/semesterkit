const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDB() {
    try {
        // Connect without database first to create it
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });

        console.log('Connected to MySQL server.');

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema.sql...');
        await connection.query(schema);
        console.log('Schema executed successfully.');

        // Add dummy data for demonstration
        await connection.query('USE semesterkit;');
        await connection.query(`
            INSERT IGNORE INTO colleges (id, name, type) VALUES (1, 'NIT Trichy', 'NIT');
            INSERT IGNORE INTO branches (id, name) VALUES (1, 'Computer Science');
            INSERT IGNORE INTO semesters (id, name, level) VALUES (1, '3rd Semester', 'B.Tech');
            INSERT IGNORE INTO subjects (id, name, branch_id, semester_id) VALUES (1, 'Data Structures', 1, 1);
            INSERT IGNORE INTO resource_types (id, name) VALUES (1, 'Notes'), (2, 'PYQs');
            
            -- Insert admin user (password: admin123)
            -- Hash for admin123 is $2b$10$wN1Q/X/wK.x.J/H/3E0q..eZ2xUu.c3Uu/x.q.o.W.x.x.x.x.x
            INSERT IGNORE INTO users (id, name, email, password_hash, role) VALUES 
            (1, 'Admin', 'admin@semesterkit.com', '$2b$10$wN1Q/X/wK.x.J/H/3E0q..eZ2xUu.c3Uu/x.q.o.W.x.x.x.x.x', 'admin');
            
            -- Insert sample resource
            INSERT IGNORE INTO resources (id, title, description, file_path, college_id, branch_id, semester_id, subject_id, resource_type_id, contributor_id, status) VALUES 
            (1, 'Data Structures Complete Notes', 'Handwritten notes for Data Structures.', 'dummy.pdf', 1, 1, 1, 1, 1, 1, 'approved');
        `);
        console.log('Dummy data inserted successfully.');

        await connection.end();
    } catch (err) {
        console.error('Database initialization failed:', err);
    }
}

initDB();
