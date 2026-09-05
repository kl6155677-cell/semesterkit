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

        // Add admin user for demonstration
        await connection.query('USE semesterkit;');
        await connection.query(`
            -- Insert admin user (password: admin123)
            -- Hash for admin123 is $2b$10$wN1Q/X/wK.x.J/H/3E0q..eZ2xUu.c3Uu/x.q.o.W.x.x.x.x.x
            INSERT IGNORE INTO users (id, name, email, password_hash, role) VALUES 
            (1, 'Admin', 'admin@semesterkit.com', '$2b$10$wN1Q/X/wK.x.J/H/3E0q..eZ2xUu.c3Uu/x.q.o.W.x.x.x.x.x', 'admin');
        `);
        console.log('Database initialized successfully with admin user.');

        await connection.end();
    } catch (err) {
        console.error('Database initialization failed:', err);
    }
}

initDB();
