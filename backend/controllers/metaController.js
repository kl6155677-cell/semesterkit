const db = require('../config/db');

// Settings
exports.getSettings = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Public Stats
exports.getPublicStats = async (req, res) => {
    try {
        const [[users]] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "student"');
        const [[resources]] = await db.query('SELECT COUNT(*) as count FROM resources WHERE status = "approved"');
        const [[colleges]] = await db.query('SELECT COUNT(*) as count FROM colleges');
        const [[downloads]] = await db.query('SELECT COALESCE(SUM(downloads), 0) as count FROM resources');
        
        res.json({
            users: users.count,
            resources: resources.count,
            colleges: colleges.count,
            downloads: downloads.count
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Top Contributors
exports.getTopContributors = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, college_id, acs_credits FROM users WHERE role = "student" ORDER BY acs_credits DESC LIMIT 5');
        // Fetch college names for these users
        if (rows.length > 0) {
            const collegeIds = rows.map(u => u.college_id).filter(id => id !== null);
            if (collegeIds.length > 0) {
                const [colleges] = await db.query('SELECT id, name FROM colleges WHERE id IN (?)', [collegeIds]);
                const collegeMap = {};
                colleges.forEach(c => collegeMap[c.id] = c.name);
                rows.forEach(u => u.college_name = collegeMap[u.college_id] || 'Unknown');
            }
        }
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const updates = req.body;
        for (const [key, value] of Object.entries(updates)) {
            await db.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, value, value]
            );
        }
        res.json({ message: 'Settings updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Colleges
exports.getColleges = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM colleges ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addCollege = async (req, res) => {
    try {
        const { name, type } = req.body;
        const [result] = await db.query('INSERT INTO colleges (name, type) VALUES (?, ?)', [name, type || 'Other']);
        res.status(201).json({ id: result.insertId, name, type });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateCollege = async (req, res) => {
    try {
        const { name, type } = req.body;
        await db.query('UPDATE colleges SET name = ?, type = ? WHERE id = ?', [name, type, req.params.id]);
        res.json({ message: 'College updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteCollege = async (req, res) => {
    try {
        await db.query('DELETE FROM colleges WHERE id = ?', [req.params.id]);
        res.json({ message: 'College deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Branches
exports.getBranches = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM branches ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addBranch = async (req, res) => {
    try {
        const { name } = req.body;
        const [result] = await db.query('INSERT INTO branches (name) VALUES (?)', [name]);
        res.status(201).json({ id: result.insertId, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateBranch = async (req, res) => {
    try {
        const { name } = req.body;
        await db.query('UPDATE branches SET name = ? WHERE id = ?', [name, req.params.id]);
        res.json({ message: 'Branch updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteBranch = async (req, res) => {
    try {
        await db.query('DELETE FROM branches WHERE id = ?', [req.params.id]);
        res.json({ message: 'Branch deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Semesters
exports.getSemesters = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM semesters ORDER BY id ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addSemester = async (req, res) => {
    try {
        const { name, level } = req.body;
        const [result] = await db.query('INSERT INTO semesters (name, level) VALUES (?, ?)', [name, level || 'B.Tech']);
        res.status(201).json({ id: result.insertId, name, level });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSemester = async (req, res) => {
    try {
        const { name, level } = req.body;
        await db.query('UPDATE semesters SET name = ?, level = ? WHERE id = ?', [name, level, req.params.id]);
        res.json({ message: 'Semester updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteSemester = async (req, res) => {
    try {
        await db.query('DELETE FROM semesters WHERE id = ?', [req.params.id]);
        res.json({ message: 'Semester deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Subjects
exports.getSubjects = async (req, res) => {
    const { branch_id, semester_id } = req.query;
    try {
        let query = 'SELECT * FROM subjects WHERE 1=1';
        let params = [];
        if (branch_id) {
            query += ' AND branch_id = ?';
            params.push(branch_id);
        }
        if (semester_id) {
            query += ' AND semester_id = ?';
            params.push(semester_id);
        }
        query += ' ORDER BY name ASC';
        
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addSubject = async (req, res) => {
    try {
        const { name, branch_id, semester_id } = req.body;
        const [result] = await db.query('INSERT INTO subjects (name, branch_id, semester_id) VALUES (?, ?, ?)', [name, branch_id || null, semester_id || null]);
        res.status(201).json({ id: result.insertId, name, branch_id, semester_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSubject = async (req, res) => {
    try {
        const { name, branch_id, semester_id } = req.body;
        await db.query('UPDATE subjects SET name = ?, branch_id = ?, semester_id = ? WHERE id = ?', [name, branch_id || null, semester_id || null, req.params.id]);
        res.json({ message: 'Subject updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteSubject = async (req, res) => {
    try {
        await db.query('DELETE FROM subjects WHERE id = ?', [req.params.id]);
        res.json({ message: 'Subject deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Resource Types
exports.getResourceTypes = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM resource_types ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addResourceType = async (req, res) => {
    try {
        const { name } = req.body;
        const [result] = await db.query('INSERT INTO resource_types (name) VALUES (?)', [name]);
        res.status(201).json({ id: result.insertId, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateResourceType = async (req, res) => {
    try {
        const { name } = req.body;
        await db.query('UPDATE resource_types SET name = ? WHERE id = ?', [name, req.params.id]);
        res.json({ message: 'Resource type updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteResourceType = async (req, res) => {
    try {
        await db.query('DELETE FROM resource_types WHERE id = ?', [req.params.id]);
        res.json({ message: 'Resource type deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
