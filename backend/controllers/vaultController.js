const db = require('../config/db');

// 1. Get User's Bookmarks
exports.getBookmarks = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await db.query(`
            SELECT r.*, b.created_at as bookmarked_at,
                   c.name as college_name,
                   b_tbl.name as branch_name,
                   sem.name as semester_name,
                   sub.name as subject_name,
                   rt.name as resource_type_name
            FROM bookmarks b
            JOIN resources r ON b.resource_id = r.id
            LEFT JOIN colleges c ON r.college_id = c.id
            LEFT JOIN branches b_tbl ON r.branch_id = b_tbl.id
            LEFT JOIN semesters sem ON r.semester_id = sem.id
            LEFT JOIN subjects sub ON r.subject_id = sub.id
            LEFT JOIN resource_types rt ON r.resource_type_id = rt.id
            WHERE b.user_id = ? AND r.status = 'approved' AND r.is_archived = 0
            ORDER BY b.created_at DESC
        `, [userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Get User's Download History
exports.getDownloads = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await db.query(`
            SELECT r.*, d.downloaded_at,
                   c.name as college_name,
                   b_tbl.name as branch_name,
                   sem.name as semester_name,
                   sub.name as subject_name,
                   rt.name as resource_type_name
            FROM downloads d
            JOIN resources r ON d.resource_id = r.id
            LEFT JOIN colleges c ON r.college_id = c.id
            LEFT JOIN branches b_tbl ON r.branch_id = b_tbl.id
            LEFT JOIN semesters sem ON r.semester_id = sem.id
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

// 3. Get User's Uploads (Shows Pending, Approved, and Rejected with rejection reason)
exports.getMyUploads = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await db.query(`
            SELECT r.*, 
                   c.name as college_name,
                   b_tbl.name as branch_name,
                   sem.name as semester_name,
                   sub.name as subject_name,
                   rt.name as resource_type_name
            FROM resources r
            LEFT JOIN colleges c ON r.college_id = c.id
            LEFT JOIN branches b_tbl ON r.branch_id = b_tbl.id
            LEFT JOIN semesters sem ON r.semester_id = sem.id
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

// 4. Get User Vault Summary
exports.getVaultSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const [[bookmarks]] = await db.query('SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?', [userId]);
        const [[downloads]] = await db.query('SELECT COUNT(*) as count FROM downloads WHERE user_id = ?', [userId]);
        const [[approvedUploads]] = await db.query('SELECT COUNT(*) as count FROM resources WHERE contributor_id = ? AND status = "approved"', [userId]);
        const [[pendingUploads]] = await db.query('SELECT COUNT(*) as count FROM resources WHERE contributor_id = ? AND status = "pending"', [userId]);
        const [[rejectedUploads]] = await db.query('SELECT COUNT(*) as count FROM resources WHERE contributor_id = ? AND status = "rejected"', [userId]);

        res.json({
            bookmarksCount: bookmarks.count,
            downloadsCount: downloads.count,
            approvedUploadsCount: approvedUploads.count,
            pendingUploadsCount: pendingUploads.count,
            rejectedUploadsCount: rejectedUploads.count
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
