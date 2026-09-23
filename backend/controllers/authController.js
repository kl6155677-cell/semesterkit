const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.register = async (req, res) => {
    const { name, email, password, college_id, branch_id } = req.body;
    try {
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Check if user exists
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ error: 'Email already registered. Please log in.' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        const [result] = await db.query(
            'INSERT INTO users (name, email, password_hash, college_id, branch_id, role, status) VALUES (?, ?, ?, ?, ?, "student", "active")',
            [name.trim(), email.trim().toLowerCase(), hashedPassword, college_id || null, branch_id || null]
        );

        // Generate token
        const token = jwt.sign(
            { id: result.insertId, email: email.trim().toLowerCase(), role: 'student', name: name.trim() },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: result.insertId, name: name.trim(), email: email.trim().toLowerCase(), role: 'student', status: 'active' }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        if (users.length === 0) return res.status(400).json({ error: 'Invalid email or password' });

        const user = users[0];

        if (user.status === 'suspended') {
            return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid email or password' });

        // Create token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Count user's approved uploads
        const [[uploadsCount]] = await db.query(
            'SELECT COUNT(*) as count FROM resources WHERE contributor_id = ? AND status = "approved"',
            [user.id]
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                avatar_url: user.avatar_url,
                approved_uploads: uploadsCount.count
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT u.id, u.name, u.email, u.role, u.status, u.avatar_url, u.college_id, u.branch_id,
                   c.name as college_name, b.name as branch_name,
                   (SELECT COUNT(*) FROM resources WHERE contributor_id = u.id AND status = 'approved') as approved_uploads,
                   (SELECT COUNT(*) FROM resources WHERE contributor_id = u.id AND status = 'pending') as pending_uploads
            FROM users u
            LEFT JOIN colleges c ON u.college_id = c.id
            LEFT JOIN branches b ON u.branch_id = b.id
            WHERE u.id = ?
        `, [req.user.id]);

        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
