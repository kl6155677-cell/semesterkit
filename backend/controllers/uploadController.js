const db = require('../config/db');
const path = require('path');

// 1. Upload Material (Strictly saved as PENDING for admin review)
exports.uploadResource = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded. Please select a valid academic document or archive.' });
        }

        // Check dynamic file size limit against database settings
        let maxMb = 50;
        try {
            const [settingsRows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = "max_upload_size_mb"');
            if (settingsRows.length > 0 && Number(settingsRows[0].setting_value) > 0) {
                maxMb = Number(settingsRows[0].setting_value);
            }
        } catch (settingsErr) {
            console.warn('Failed to read max_upload_size_mb setting:', settingsErr);
        }

        if (req.file.size > maxMb * 1024 * 1024) {
            return res.status(400).json({ error: `File size exceeds the maximum limit of ${maxMb}MB configured by the administrator.` });
        }

        let { title, description, college_id, manual_college_name, branch_id, semester_id, subject_id, subject, subject_name, resource_type_id, program, tags } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title is required for study materials.' });
        }

        // Auto-detect program if not supplied
        let selectedProgram = program || 'B.Tech';
        if (!program && semester_id) {
            const [semRows] = await db.query('SELECT level FROM semesters WHERE id = ?', [semester_id]);
            if (semRows.length > 0 && semRows[0].level) selectedProgram = semRows[0].level;
        }

        // Handle college: if 'other' or missing and manual_college_name provided
        let finalCollegeId = (college_id && college_id !== 'other') ? parseInt(college_id, 10) : null;
        const manualCollege = (manual_college_name || '').trim();
        if ((!finalCollegeId || college_id === 'other') && manualCollege) {
            const [existingColleges] = await db.query('SELECT id FROM colleges WHERE LOWER(TRIM(name)) = LOWER(?) LIMIT 1', [manualCollege]);
            if (existingColleges.length > 0) {
                finalCollegeId = existingColleges[0].id;
            } else {
                const [insertCollege] = await db.query('INSERT INTO colleges (name, type, is_active) VALUES (?, "Other", 1)', [manualCollege]);
                finalCollegeId = insertCollege.insertId;
            }
        }

        // Handle manual subject entry
        let finalSubjectId = (subject_id && subject_id !== 'other') ? parseInt(subject_id, 10) : null;
        const manualSubject = (subject_name || subject || '').trim();
        if (manualSubject) {
            const [existingSubjects] = await db.query('SELECT id FROM subjects WHERE LOWER(TRIM(name)) = LOWER(?) LIMIT 1', [manualSubject]);
            if (existingSubjects.length > 0) {
                finalSubjectId = existingSubjects[0].id;
            } else {
                const [insertSubject] = await db.query(
                    'INSERT INTO subjects (name, branch_id, semester_id, program, is_active) VALUES (?, ?, ?, ?, 1)',
                    [manualSubject, branch_id ? parseInt(branch_id, 10) : null, semester_id ? parseInt(semester_id, 10) : null, selectedProgram]
                );
                finalSubjectId = insertSubject.insertId;
            }
        }

        let filePath = 'uploads/' + path.basename(req.file.path || req.file.filename || req.file.originalname);
        if (req.file.path && (req.file.path.startsWith('http://') || req.file.path.startsWith('https://'))) {
            filePath = req.file.path;
        } else if (req.file.secure_url) {
            filePath = req.file.secure_url;
        }
        const fileName = req.file.originalname;
        const fileType = path.extname(req.file.originalname).replace('.', '').toLowerCase();
        const fileSize = req.file.size;
        const contributorId = req.user.id;

        // Save record strictly with status = 'pending'
        const [result] = await db.query(`
            INSERT INTO resources (
                title, description, file_path, file_name, file_type, file_size, program,
                college_id, branch_id, semester_id, subject_id, resource_type_id,
                contributor_id, status, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `, [
            title.trim(),
            description ? description.trim() : null,
            filePath,
            fileName,
            fileType,
            fileSize,
            selectedProgram,
            finalCollegeId,
            branch_id ? parseInt(branch_id, 10) : null,
            semester_id ? parseInt(semester_id, 10) : null,
            finalSubjectId,
            resource_type_id ? parseInt(resource_type_id, 10) : null,
            contributorId,
            tags ? tags.trim() : null
        ]);

        res.status(201).json({
            message: 'Your study material has been uploaded successfully! It is currently PENDING moderation and will be published once reviewed by our academic admin team.',
            resourceId: result.insertId,
            status: 'pending'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Upload Image / Media (Used by Admin Media Library or Student Avatars)
exports.uploadImageOnly = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }
        const filePath = 'uploads/' + path.basename(req.file.path || req.file.filename);
        const fileName = req.file.originalname;
        const fileType = req.file.mimetype;
        const fileSize = req.file.size;
        const category = req.body.category || 'general';
        const altText = req.body.alt_text || fileName;

        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS media (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    file_name VARCHAR(255) NOT NULL,
                    file_path TEXT NOT NULL,
                    file_type VARCHAR(50) NULL,
                    file_size INT DEFAULT 0,
                    category VARCHAR(50) DEFAULT 'general',
                    alt_text VARCHAR(255) NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        } catch (e) {}

        // Also record into media table for Admin Media Library
        const [result] = await db.query(`
            INSERT INTO media (file_name, file_path, file_type, file_size, category, alt_text)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [fileName, filePath, fileType, fileSize, category, altText]);

        res.status(201).json({
            id: result.insertId,
            url: filePath,
            fileName,
            message: 'Image uploaded successfully'
        });
    } catch (err) {
        console.error('Error in uploadImageOnly:', err);
        res.status(500).json({ error: err.message || 'Server error uploading image' });
    }
};
