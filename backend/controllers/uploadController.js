const db = require('../config/db');
const path = require('path');

// 1. Upload Material (Strictly saved as PENDING for admin review)
exports.uploadResource = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded. Please select a valid academic document or archive.' });
        }

        const { title, description, college_id, branch_id, semester_id, subject_id, resource_type_id, program, tags } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title is required for study materials.' });
        }

        const filePath = 'uploads/' + path.basename(req.file.path || req.file.filename);
        const fileName = req.file.originalname;
        const fileType = path.extname(req.file.originalname).replace('.', '').toLowerCase();
        const fileSize = req.file.size;
        const contributorId = req.user.id;

        // Auto-detect program if not supplied
        let selectedProgram = program || 'B.Tech';
        if (!program && semester_id) {
            const [semRows] = await db.query('SELECT level FROM semesters WHERE id = ?', [semester_id]);
            if (semRows.length > 0) selectedProgram = semRows[0].level;
        }

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
            college_id ? parseInt(college_id, 10) : null,
            branch_id ? parseInt(branch_id, 10) : null,
            semester_id ? parseInt(semester_id, 10) : null,
            subject_id ? parseInt(subject_id, 10) : null,
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
        res.status(500).json({ error: err.message });
    }
};
