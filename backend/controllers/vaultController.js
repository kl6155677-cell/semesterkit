const db = require('../config/db');

exports.getBookmarks = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await db.query(`
            SELECT r.*, b.created_at as bookmarked_at,
                   c.name as college_name, sub.name as subject_name, rt.name as resource_type_name
            FROM bookmarks b
            JOIN resources r ON b.resource_id = r.id
            LEFT JOIN colleges c ON r.college_id = c.id
            LEFT JOIN subjects sub ON r.subject_id = sub.id
            LEFT JOIN resource_types rt ON r.resource_type_id = rt.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        `, [userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getDownloads = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await db.query(`
            SELECT r.*, d.downloaded_at,
                   c.name as college_name, sub.name as subject_name, rt.name as resource_type_name
            FROM downloads d
            JOIN resources r ON d.resource_id = r.id
            LEFT JOIN colleges c ON r.college_id = c.id
            LEFT JOIN subjects sub ON r.subject_id = sub.id
            LEFT JOIN resource_types rt ON r.resource_type_id = rt.id
            WHERE d.user_id = ?
            ORDER BY d.downloaded_at DESC
        `, [userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getMyUploads = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await db.query(`
            SELECT r.*, 
                   c.name as college_name, sub.name as subject_name, rt.name as resource_type_name
            FROM resources r
            LEFT JOIN colleges c ON r.college_id = c.id
            LEFT JOIN subjects sub ON r.subject_id = sub.id
            LEFT JOIN resource_types rt ON r.resource_type_id = rt.id
            WHERE r.contributor_id = ?
            ORDER BY r.created_at DESC
        `, [userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
