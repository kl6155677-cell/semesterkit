const db = require('../config/db');

exports.getPendingResources = async (req, res) => {
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
            WHERE r.status = 'pending'
            ORDER BY r.created_at ASC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.moderateResource = async (req, res) => {
    try {
        const resourceId = req.params.id;
        const { action } = req.body; // 'approve' or 'reject'
        
        if (action !== 'approve' && action !== 'reject') {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const status = action === 'approve' ? 'approved' : 'rejected';
        
        await db.query('UPDATE resources SET status = ? WHERE id = ?', [status, resourceId]);
        
        // If approved, give user ACS credits
        if (status === 'approved') {
            const [resources] = await db.query('SELECT contributor_id FROM resources WHERE id = ?', [resourceId]);
            if (resources.length > 0) {
                const userId = resources[0].contributor_id;
                await db.query('UPDATE users SET acs_credits = acs_credits + 10 WHERE id = ?', [userId]);
            }
        }

        res.json({ message: `Resource ${status} successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
