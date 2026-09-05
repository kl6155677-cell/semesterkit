const db = require('../config/db');

exports.getResources = async (req, res) => {
    try {
        const { query, college_id, branch_id, semester_id, subject_id, resource_type_id, sort, page } = req.query;
        let sql = `
            SELECT r.*, 
                   u.name as contributor_name,
                   c.name as college_name,
                   b.name as branch_name,
                   s.name as semester_name,
                   sub.name as subject_name,
                   rt.name as resource_type_name
            FROM resources r
            LEFT JOIN users u ON r.contributor_id = u.id
            LEFT JOIN colleges c ON r.college_id = c.id
            LEFT JOIN branches b ON r.branch_id = b.id
            LEFT JOIN semesters s ON r.semester_id = s.id
            LEFT JOIN subjects sub ON r.subject_id = sub.id
            LEFT JOIN resource_types rt ON r.resource_type_id = rt.id
            WHERE r.status = 'approved'
        `;
        let params = [];

        if (query) {
            sql += ` AND (r.title LIKE ? OR r.description LIKE ?)`;
            params.push(`%${query}%`, `%${query}%`);
        }
        if (college_id) { sql += ` AND r.college_id = ?`; params.push(college_id); }
        if (branch_id) { sql += ` AND r.branch_id = ?`; params.push(branch_id); }
        if (semester_id) { sql += ` AND r.semester_id = ?`; params.push(semester_id); }
        if (subject_id) { sql += ` AND r.subject_id = ?`; params.push(subject_id); }
        if (resource_type_id) { sql += ` AND r.resource_type_id = ?`; params.push(resource_type_id); }

        if (sort === 'popular') {
            sql += ` ORDER BY r.downloads DESC, r.views DESC`;
        } else if (sort === 'trending') {
            sql += ` ORDER BY r.views DESC, r.downloads DESC`;
        } else {
            sql += ` ORDER BY r.created_at DESC`;
        }

        const limit = 10;
        const offset = ((page || 1) - 1) * limit;
        sql += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getResourceById = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT r.*, 
                   u.name as contributor_name,
                   c.name as college_name,
                   b.name as branch_name,
                   s.name as semester_name,
                   sub.name as subject_name,
                   rt.name as resource_type_name
            FROM resources r
            LEFT JOIN users u ON r.contributor_id = u.id
            LEFT JOIN colleges c ON r.college_id = c.id
            LEFT JOIN branches b ON r.branch_id = b.id
            LEFT JOIN semesters s ON r.semester_id = s.id
            LEFT JOIN subjects sub ON r.subject_id = sub.id
            LEFT JOIN resource_types rt ON r.resource_type_id = rt.id
            WHERE r.id = ? AND r.status = 'approved'
        `, [req.params.id]);

        if (rows.length === 0) return res.status(404).json({ error: 'Resource not found' });
        
        // Increment views
        await db.query('UPDATE resources SET views = views + 1 WHERE id = ?', [req.params.id]);
        
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.downloadResource = async (req, res) => {
    try {
        const resourceId = req.params.id;
        const userId = req.user ? req.user.id : null; // Optional login for download depending on business rule

        // Verify resource
        const [resources] = await db.query('SELECT * FROM resources WHERE id = ? AND status = "approved"', [resourceId]);
        if (resources.length === 0) return res.status(404).json({ error: 'Resource not found' });
        
        // Update downloads count
        await db.query('UPDATE resources SET downloads = downloads + 1 WHERE id = ?', [resourceId]);

        // Record in history if logged in
        if (userId) {
            await db.query('INSERT INTO downloads (user_id, resource_id) VALUES (?, ?)', [userId, resourceId]);
        }

        const resource = resources[0];
        // Send actual file path or stream if local
        res.json({ message: 'Download ready', filePath: resource.file_path });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.bookmarkResource = async (req, res) => {
    try {
        const resourceId = req.params.id;
        const userId = req.user.id;

        // Check if already bookmarked
        const [existing] = await db.query('SELECT * FROM bookmarks WHERE user_id = ? AND resource_id = ?', [userId, resourceId]);
        
        if (existing.length > 0) {
            // Remove bookmark
            await db.query('DELETE FROM bookmarks WHERE id = ?', [existing[0].id]);
            return res.json({ message: 'Bookmark removed', bookmarked: false });
        } else {
            // Add bookmark
            await db.query('INSERT INTO bookmarks (user_id, resource_id) VALUES (?, ?)', [userId, resourceId]);
            return res.json({ message: 'Resource bookmarked', bookmarked: true });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.feedbackResource = async (req, res) => {
    try {
        const resourceId = req.params.id;
        const { helpful } = req.body; // true/false
        if (helpful) {
            await db.query('UPDATE resources SET helpful_yes = helpful_yes + 1 WHERE id = ?', [resourceId]);
        } else {
            await db.query('UPDATE resources SET helpful_no = helpful_no + 1 WHERE id = ?', [resourceId]);
        }
        res.json({ message: 'Feedback submitted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
