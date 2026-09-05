const db = require('../config/db');

exports.getColleges = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM colleges ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getBranches = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM branches ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getSemesters = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM semesters ORDER BY id ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

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

exports.getResourceTypes = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM resource_types ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
