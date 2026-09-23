const db = require('../config/db');

// 1. Get Public Resources (Strictly ONLY approved, non-archived materials)
exports.getResources = async (req, res) => {
    try {
        const { query, program, college_id, branch_id, semester_id, subject_id, resource_type_id, tags, sort, page, limit } = req.query;
        
        let sql = `
            SELECT r.id, r.title, r.description, r.file_path, r.file_name, r.file_type, r.file_size,
                   r.program, r.is_featured, r.views, r.downloads, r.helpful_yes, r.helpful_no, r.tags, r.created_at,
                   u.name as contributor_name,
                   u.avatar_url as contributor_avatar,
                   c.name as college_name,
                   c.type as college_type,
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
            WHERE r.status = 'approved' AND r.is_archived = 0
        `;
        const params = [];

        if (query && query.trim()) {
            const q = `%${query.trim()}%`;
            sql += ` AND (r.title LIKE ? OR r.description LIKE ? OR r.tags LIKE ? OR sub.name LIKE ? OR c.name LIKE ? OR b.name LIKE ?)`;
            params.push(q, q, q, q, q, q);
        }

        if (program) {
            sql += ` AND r.program = ?`;
            params.push(program);
        }
        if (college_id) {
            sql += ` AND r.college_id = ?`;
            params.push(college_id);
        }
        if (branch_id) {
            sql += ` AND r.branch_id = ?`;
            params.push(branch_id);
        }
        if (semester_id) {
            sql += ` AND r.semester_id = ?`;
            params.push(semester_id);
        }
        if (subject_id) {
            sql += ` AND r.subject_id = ?`;
            params.push(subject_id);
        }
        if (resource_type_id) {
            sql += ` AND r.resource_type_id = ?`;
            params.push(resource_type_id);
        }
        if (tags) {
            sql += ` AND r.tags LIKE ?`;
            params.push(`%${tags}%`);
        }

        // Sorting
        if (sort === 'popular' || sort === 'downloads') {
            sql += ` ORDER BY r.downloads DESC, r.views DESC, r.created_at DESC`;
        } else if (sort === 'trending' || sort === 'views') {
            sql += ` ORDER BY r.views DESC, r.downloads DESC, r.created_at DESC`;
        } else if (sort === 'rating') {
            sql += ` ORDER BY r.helpful_yes DESC, r.created_at DESC`;
        } else {
            // Default latest
            sql += ` ORDER BY r.created_at DESC`;
        }

        const pageSize = parseInt(limit, 10) || 12;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const offset = (pageNum - 1) * pageSize;

        sql += ` LIMIT ? OFFSET ?`;
        params.push(pageSize, offset);

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Get Single Resource by ID (Strictly ONLY approved, non-archived materials for public)
exports.getResourceById = async (req, res) => {
    try {
        const resourceId = req.params.id;
        const [rows] = await db.query(`
            SELECT r.id, r.title, r.description, r.file_path, r.file_name, r.file_type, r.file_size,
                   r.program, r.is_featured, r.views, r.downloads, r.helpful_yes, r.helpful_no, r.tags, r.created_at,
                   u.name as contributor_name,
                   u.avatar_url as contributor_avatar,
                   c.name as college_name,
                   c.type as college_type,
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
            WHERE r.id = ? AND r.status = 'approved' AND r.is_archived = 0
        `, [resourceId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Resource not found or pending approval' });
        }
        
        // Increment views counter safely
        await db.query('UPDATE resources SET views = views + 1 WHERE id = ?', [resourceId]);
        
        const resource = rows[0];
        resource.views += 1;

        res.json(resource);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Download Resource (Strictly ONLY approved, non-archived materials)
exports.downloadResource = async (req, res) => {
    try {
        const resourceId = req.params.id;
        const userId = req.user ? req.user.id : null;
        const ipAddress = (req.ip || (req.socket && req.socket.remoteAddress) || '127.0.0.1').substring(0, 45);

        // Verify resource is approved
        const [resources] = await db.query(
            'SELECT * FROM resources WHERE id = ? AND status = "approved" AND is_archived = 0',
            [resourceId]
        );

        if (resources.length === 0) {
            return res.status(404).json({ error: 'Resource not found or not approved for public download' });
        }
        
        // Update downloads count
        await db.query('UPDATE resources SET downloads = downloads + 1 WHERE id = ?', [resourceId]);

        // Record in download history
        await db.query('INSERT INTO downloads (user_id, resource_id, ip_address) VALUES (?, ?, ?)', [userId, resourceId, ipAddress]);

        const resource = resources[0];
        res.json({
            message: 'Download ready',
            filePath: resource.file_path,
            fileName: resource.file_name || resource.title
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. Bookmark Resource (Toggle)
exports.bookmarkResource = async (req, res) => {
    try {
        const resourceId = req.params.id;
        const userId = req.user.id;

        // Verify resource exists and is approved
        const [resources] = await db.query('SELECT id FROM resources WHERE id = ? AND status = "approved"', [resourceId]);
        if (resources.length === 0) {
            return res.status(404).json({ error: 'Resource not found or unavailable' });
        }

        const [existing] = await db.query('SELECT id FROM bookmarks WHERE user_id = ? AND resource_id = ?', [userId, resourceId]);
        
        if (existing.length > 0) {
            await db.query('DELETE FROM bookmarks WHERE id = ?', [existing[0].id]);
            return res.json({ message: 'Bookmark removed', bookmarked: false });
        } else {
            await db.query('INSERT INTO bookmarks (user_id, resource_id) VALUES (?, ?)', [userId, resourceId]);
            return res.json({ message: 'Resource bookmarked', bookmarked: true });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 5. Submit Helpfulness Feedback (Yes/No)
exports.feedbackResource = async (req, res) => {
    try {
        const resourceId = req.params.id;
        const { helpful } = req.body; // true or false

        // Verify resource exists and is approved
        const [resources] = await db.query('SELECT id FROM resources WHERE id = ? AND status = "approved"', [resourceId]);
        if (resources.length === 0) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        if (helpful) {
            await db.query('UPDATE resources SET helpful_yes = helpful_yes + 1 WHERE id = ?', [resourceId]);
        } else {
            await db.query('UPDATE resources SET helpful_no = helpful_no + 1 WHERE id = ?', [resourceId]);
        }

        res.json({ message: 'Feedback submitted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
