const db = require('../config/db');

// 1. Settings
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

exports.updateSettings = async (req, res) => {
    try {
        const updates = req.body;
        for (const [key, value] of Object.entries(updates)) {
            const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
            await db.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, valStr, valStr]
            );
        }
        res.json({ message: 'Settings updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Public Statistics
exports.getPublicStats = async (req, res) => {
    try {
        const [settingsRows] = await db.query('SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE "stat%"');
        const settings = {};
        settingsRows.forEach(r => settings[r.setting_key] = r.setting_value);

        const autoMode = settings.stats_auto_mode !== 'false';

        if (!autoMode && settings.stat_resources_override) {
            return res.json({
                resources: settings.stat_resources_override,
                users: settings.stat_users_override,
                colleges: settings.stat_colleges_override,
                downloads: settings.stat_downloads_override
            });
        }

        const [[users]] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "student"');
        const [[resources]] = await db.query('SELECT COUNT(*) as count FROM resources WHERE status = "approved" AND is_archived = 0');
        const [[colleges]] = await db.query('SELECT COUNT(*) as count FROM colleges WHERE is_active = 1');
        const [[downloads]] = await db.query('SELECT COALESCE(SUM(downloads), 0) as count FROM resources WHERE status = "approved"');
        
        // Helper formatter for real stats (e.g. 0, 15, 1.2K+, 2.5M+)
        const formatCount = (num) => {
            const n = Number(num) || 0;
            if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M+';
            if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K+';
            return String(n);
        };

        res.json({
            resources: formatCount(resources.count),
            users: formatCount(users.count),
            colleges: String(colleges.count),
            downloads: formatCount(downloads.count)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Top Contributors (Dynamic based directly on approved uploads count)
exports.getTopContributors = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT u.id, u.name, u.avatar_url, c.name as college_name,
                   COUNT(r.id) as approved_uploads
            FROM users u
            JOIN resources r ON u.id = r.contributor_id AND r.status = 'approved' AND r.is_archived = 0
            LEFT JOIN colleges c ON u.college_id = c.id
            WHERE u.role = 'student' AND u.status = 'active'
            GROUP BY u.id, u.name, u.avatar_url, c.name
            ORDER BY approved_uploads DESC
            LIMIT 5
        `);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. Public Testimonials
exports.getPublicTestimonials = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM testimonials WHERE is_active = 1 ORDER BY display_order ASC, created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 5. Public Footer Navigation
exports.getPublicFooter = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM footer_links WHERE is_active = 1 ORDER BY column_title ASC, display_order ASC');
        const columns = {};
        rows.forEach(link => {
            if (!columns[link.column_title]) columns[link.column_title] = [];
            columns[link.column_title].push(link);
        });
        res.json({ columns, links: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 6. Public Header Navigation
exports.getPublicNavigation = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM navigation_items WHERE is_active = 1 ORDER BY display_order ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 7. Static Page by Slug
exports.getStaticPageBySlug = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM static_pages WHERE slug = ? AND is_published = 1', [req.params.slug]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Page not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 8. Programs
exports.getPrograms = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM programs WHERE is_active = 1 ORDER BY display_order ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 9. Colleges
exports.getColleges = async (req, res) => {
    try {
        const { featured, type } = req.query;
        let sql = 'SELECT * FROM colleges WHERE is_active = 1';
        const params = [];
        if (featured) {
            sql += ' AND is_featured = 1';
        }
        if (type) {
            sql += ' AND type = ?';
            params.push(type);
        }
        sql += ' ORDER BY display_order ASC, name ASC';

        const [rows] = await db.query(sql, params);
        
        // Also fetch materials count for each college
        const [counts] = await db.query(`
            SELECT college_id, COUNT(*) as count 
            FROM resources 
            WHERE status = 'approved' AND is_archived = 0
            GROUP BY college_id
        `);
        const countMap = {};
        counts.forEach(c => countMap[c.college_id] = c.count);

        const enriched = rows.map(c => ({
            ...c,
            materials_count: countMap[c.id] || 0
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addCollege = async (req, res) => {
    try {
        const { name, type, logo_url, banner_url, description, is_featured, is_active, display_order } = req.body;
        const [result] = await db.query(
            'INSERT INTO colleges (name, type, logo_url, banner_url, description, is_featured, is_active, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, type || 'Other', logo_url || null, banner_url || null, description || null, is_featured || 0, is_active !== undefined ? is_active : 1, display_order || 0]
        );
        res.status(201).json({ id: result.insertId, message: 'College added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateCollege = async (req, res) => {
    try {
        const { name, type, logo_url, banner_url, description, is_featured, is_active, display_order } = req.body;
        await db.query(`
            UPDATE colleges 
            SET name = COALESCE(?, name),
                type = COALESCE(?, type),
                logo_url = COALESCE(?, logo_url),
                banner_url = COALESCE(?, banner_url),
                description = COALESCE(?, description),
                is_featured = COALESCE(?, is_featured),
                is_active = COALESCE(?, is_active),
                display_order = COALESCE(?, display_order)
            WHERE id = ?
        `, [name, type, logo_url, banner_url, description, is_featured, is_active, display_order, req.params.id]);
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

// 10. Branches
exports.getBranches = async (req, res) => {
    try {
        const { program } = req.query;
        let sql = 'SELECT * FROM branches WHERE is_active = 1';
        const params = [];
        if (program) {
            sql += ' AND (program = ? OR program = "All")';
            params.push(program);
        }
        sql += ' ORDER BY display_order ASC, name ASC';

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addBranch = async (req, res) => {
    try {
        const { name, code, program, department, is_active, display_order } = req.body;
        const [result] = await db.query(
            'INSERT INTO branches (name, code, program, department, is_active, display_order) VALUES (?, ?, ?, ?, ?, ?)',
            [name, code || null, program || 'B.Tech', department || null, is_active !== undefined ? is_active : 1, display_order || 0]
        );
        res.status(201).json({ id: result.insertId, message: 'Branch added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateBranch = async (req, res) => {
    try {
        const { name, code, program, department, is_active, display_order } = req.body;
        await db.query(`
            UPDATE branches 
            SET name = COALESCE(?, name),
                code = COALESCE(?, code),
                program = COALESCE(?, program),
                department = COALESCE(?, department),
                is_active = COALESCE(?, is_active),
                display_order = COALESCE(?, display_order)
            WHERE id = ?
        `, [name, code, program, department, is_active, display_order, req.params.id]);
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

// 11. Semesters
exports.getSemesters = async (req, res) => {
    try {
        const { level } = req.query;
        let sql = 'SELECT * FROM semesters WHERE 1=1';
        const params = [];
        if (level) {
            sql += ' AND level = ?';
            params.push(level);
        }
        sql += ' ORDER BY display_order ASC, id ASC';

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addSemester = async (req, res) => {
    try {
        const { name, level, display_order } = req.body;
        const [result] = await db.query(
            'INSERT INTO semesters (name, level, display_order) VALUES (?, ?, ?)',
            [name, level || 'B.Tech', display_order || 0]
        );
        res.status(201).json({ id: result.insertId, message: 'Semester added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSemester = async (req, res) => {
    try {
        const { name, level, display_order } = req.body;
        await db.query(`
            UPDATE semesters 
            SET name = COALESCE(?, name),
                level = COALESCE(?, level),
                display_order = COALESCE(?, display_order)
            WHERE id = ?
        `, [name, level, display_order, req.params.id]);
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

// 12. Subjects & Research Areas
exports.getSubjects = async (req, res) => {
    try {
        const { branch_id, semester_id, program, is_research_area } = req.query;
        let sql = 'SELECT s.*, b.name as branch_name, sem.name as semester_name FROM subjects s LEFT JOIN branches b ON s.branch_id = b.id LEFT JOIN semesters sem ON s.semester_id = sem.id WHERE s.is_active = 1';
        const params = [];

        if (branch_id) {
            sql += ' AND s.branch_id = ?';
            params.push(branch_id);
        }
        if (semester_id) {
            sql += ' AND s.semester_id = ?';
            params.push(semester_id);
        }
        if (program) {
            sql += ' AND s.program = ?';
            params.push(program);
        }
        if (is_research_area !== undefined) {
            sql += ' AND s.is_research_area = ?';
            params.push(is_research_area === '1' || is_research_area === 'true' ? 1 : 0);
        }
        sql += ' ORDER BY s.name ASC';
        
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addSubject = async (req, res) => {
    try {
        const { name, code, branch_id, semester_id, program, is_research_area, is_active } = req.body;
        const [result] = await db.query(
            'INSERT INTO subjects (name, code, branch_id, semester_id, program, is_research_area, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, code || null, branch_id || null, semester_id || null, program || 'B.Tech', is_research_area ? 1 : 0, is_active !== undefined ? is_active : 1]
        );
        res.status(201).json({ id: result.insertId, message: 'Subject added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSubject = async (req, res) => {
    try {
        const { name, code, branch_id, semester_id, program, is_research_area, is_active } = req.body;
        await db.query(`
            UPDATE subjects 
            SET name = COALESCE(?, name),
                code = COALESCE(?, code),
                branch_id = ?,
                semester_id = ?,
                program = COALESCE(?, program),
                is_research_area = COALESCE(?, is_research_area),
                is_active = COALESCE(?, is_active)
            WHERE id = ?
        `, [name, code, branch_id || null, semester_id || null, program, is_research_area !== undefined ? is_research_area : null, is_active !== undefined ? is_active : null, req.params.id]);
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

// 13. Resource Types
exports.getResourceTypes = async (req, res) => {
    try {
        const { program } = req.query;
        let sql = 'SELECT * FROM resource_types WHERE 1=1';
        const params = [];
        if (program) {
            sql += ' AND (program = ? OR program = "All")';
            params.push(program);
        }
        sql += ' ORDER BY display_order ASC, name ASC';

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addResourceType = async (req, res) => {
    try {
        const { name, program, icon, display_order } = req.body;
        const [result] = await db.query(
            'INSERT INTO resource_types (name, program, icon, display_order) VALUES (?, ?, ?, ?)',
            [name, program || 'All', icon || null, display_order || 0]
        );
        res.status(201).json({ id: result.insertId, message: 'Resource type added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateResourceType = async (req, res) => {
    try {
        const { name, program, icon, display_order } = req.body;
        await db.query(`
            UPDATE resource_types 
            SET name = COALESCE(?, name),
                program = COALESCE(?, program),
                icon = COALESCE(?, icon),
                display_order = COALESCE(?, display_order)
            WHERE id = ?
        `, [name, program, icon, display_order, req.params.id]);
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
