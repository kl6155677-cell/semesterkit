const db = require('../config/db');

exports.uploadResource = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { title, description, college_id, branch_id, semester_id, subject_id, resource_type_id } = req.body;
        const filePath = req.file.path.replace(/\\/g, '/'); // Normalize path
        const contributorId = req.user.id;

        const [result] = await db.query(
            `INSERT INTO resources (title, description, file_path, college_id, branch_id, semester_id, subject_id, resource_type_id, contributor_id, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [title, description, filePath, college_id || null, branch_id || null, semester_id || null, subject_id || null, resource_type_id || null, contributorId]
        );

        res.status(201).json({ message: 'Resource uploaded and is pending moderation.', resourceId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.uploadImageOnly = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }
        const filePath = req.file.path.replace(/\\/g, '/'); // Normalize path
        res.status(201).json({ url: filePath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
