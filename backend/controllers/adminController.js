const db = require('../config/db');

// 1. Dashboard Overview Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const [[users]] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "student"');
        const [[colleges]] = await db.query('SELECT COUNT(*) as count FROM colleges');
        const [[resources]] = await db.query('SELECT COUNT(*) as count FROM resources WHERE status = "approved" AND is_archived = 0');
        const [[pending]] = await db.query('SELECT COUNT(*) as count FROM resources WHERE status = "pending"');
        const [[rejected]] = await db.query('SELECT COUNT(*) as count FROM resources WHERE status = "rejected"');
        const [[downloads]] = await db.query('SELECT COALESCE(SUM(downloads), 0) as count FROM resources');
        const [[views]] = await db.query('SELECT COALESCE(SUM(views), 0) as count FROM resources');
        
        // Contributors: users who have at least one approved upload
        const [[contributors]] = await db.query(`
            SELECT COUNT(DISTINCT contributor_id) as count 
            FROM resources 
            WHERE status = 'approved'
        `);

        // Recent 5 uploads
        const [recentUploads] = await db.query(`
            SELECT r.id, r.title, r.status, r.created_at, u.name as contributor_name, c.name as college_name
            FROM resources r
            LEFT JOIN users u ON r.contributor_id = u.id
            LEFT JOIN colleges c ON r.college_id = c.id
            ORDER BY r.created_at DESC
            LIMIT 5
        `);

        res.json({
            users: users.count,
            colleges: colleges.count,
            resources: resources.count,
            pending: pending.count,
            rejected: rejected.count,
            downloads: downloads.count,
            views: views.count,
            contributors: contributors.count,
            recentUploads
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Pending Moderation Queue
exports.getPendingResources = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT r.*, 
                   u.name as contributor_name,
                   u.email as contributor_email,
                   u.avatar_url as contributor_avatar,
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

// 3. Moderate Resource (Approve or Reject with custom reason)
exports.moderateResource = async (req, res) => {
    try {
        const resourceId = req.params.id;
        const { action, rejection_reason } = req.body; // 'approve' or 'reject'
        
        if (action !== 'approve' && action !== 'reject') {
            return res.status(400).json({ error: 'Invalid action. Must be approve or reject.' });
        }

        if (action === 'approve') {
            await db.query(
                'UPDATE resources SET status = "approved", rejection_reason = NULL, updated_at = NOW() WHERE id = ?',
                [resourceId]
            );
            res.json({ message: 'Resource approved successfully and is now publicly visible.' });
        } else {
            const reason = rejection_reason && rejection_reason.trim() ? rejection_reason.trim() : 'Does not meet academic submission standards';
            await db.query(
                'UPDATE resources SET status = "rejected", rejection_reason = ?, updated_at = NOW() WHERE id = ?',
                [reason, resourceId]
            );
            res.json({ message: 'Resource rejected and will remain hidden from public view.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. All Resources Inventory (Admin Management)
exports.getAllResources = async (req, res) => {
    try {
        const { status, program, search, is_featured } = req.query;
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
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            sql += ' AND r.status = ?';
            params.push(status);
        }
        if (program) {
            sql += ' AND r.program = ?';
            params.push(program);
        }
        if (is_featured !== undefined && is_featured !== '') {
            sql += ' AND r.is_featured = ?';
            params.push(is_featured === '1' || is_featured === 'true' ? 1 : 0);
        }
        if (search) {
            sql += ' AND (r.title LIKE ? OR r.description LIKE ? OR r.tags LIKE ? OR sub.name LIKE ? OR c.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        sql += ' ORDER BY r.created_at DESC LIMIT 100';

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 5. Update Resource (Admin)
exports.updateResource = async (req, res) => {
    try {
        const resourceId = req.params.id;
        const { title, description, college_id, branch_id, semester_id, subject_id, resource_type_id, program, is_featured, is_archived, status, rejection_reason, tags } = req.body;

        await db.query(`
            UPDATE resources 
            SET title = COALESCE(?, title),
                description = COALESCE(?, description),
                college_id = ?,
                branch_id = ?,
                semester_id = ?,
                subject_id = ?,
                resource_type_id = ?,
                program = COALESCE(?, program),
                is_featured = COALESCE(?, is_featured),
                is_archived = COALESCE(?, is_archived),
                status = COALESCE(?, status),
                rejection_reason = ?,
                tags = COALESCE(?, tags),
                updated_at = NOW()
            WHERE id = ?
        `, [
            title, description, 
            college_id || null, branch_id || null, semester_id || null, subject_id || null, resource_type_id || null,
            program, is_featured !== undefined ? is_featured : null, is_archived !== undefined ? is_archived : null,
            status, rejection_reason || null, tags, resourceId
        ]);

        res.json({ message: 'Resource updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 6. Delete Resource (Admin)
exports.deleteResource = async (req, res) => {
    try {
        await db.query('DELETE FROM resources WHERE id = ?', [req.params.id]);
        res.json({ message: 'Resource deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 7. User Management (Admin)
exports.getUsers = async (req, res) => {
    try {
        const { search, role, status } = req.query;
        let sql = `
            SELECT u.id, u.name, u.email, u.role, u.status, u.avatar_url, u.created_at,
                   c.name as college_name, b.name as branch_name,
                   (SELECT COUNT(*) FROM resources WHERE contributor_id = u.id AND status = 'approved') as approved_uploads,
                   (SELECT COUNT(*) FROM resources WHERE contributor_id = u.id AND status = 'pending') as pending_uploads
            FROM users u
            LEFT JOIN colleges c ON u.college_id = c.id
            LEFT JOIN branches b ON u.branch_id = b.id
            WHERE 1=1
        `;
        const params = [];

        if (role) {
            sql += ' AND u.role = ?';
            params.push(role);
        }
        if (status) {
            sql += ' AND u.status = ?';
            params.push(status);
        }
        if (search) {
            sql += ' AND (u.name LIKE ? OR u.email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        sql += ' ORDER BY u.created_at DESC';

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { role, status } = req.body;
        
        await db.query('UPDATE users SET role = COALESCE(?, role), status = COALESCE(?, status) WHERE id = ?', [role, status, userId]);
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 8. Testimonials Management (Admin)
exports.getTestimonials = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM testimonials ORDER BY display_order ASC, created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addTestimonial = async (req, res) => {
    try {
        const { name, college, branch, avatar_url, review, rating, is_active, display_order } = req.body;
        const [result] = await db.query(`
            INSERT INTO testimonials (name, college, branch, avatar_url, review, rating, is_active, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, college, branch || null, avatar_url || null, review, rating || 5, is_active !== undefined ? is_active : 1, display_order || 0]);
        
        res.status(201).json({ id: result.insertId, message: 'Testimonial created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateTestimonial = async (req, res) => {
    try {
        const { name, college, branch, avatar_url, review, rating, is_active, display_order } = req.body;
        await db.query(`
            UPDATE testimonials 
            SET name = COALESCE(?, name),
                college = COALESCE(?, college),
                branch = COALESCE(?, branch),
                avatar_url = COALESCE(?, avatar_url),
                review = COALESCE(?, review),
                rating = COALESCE(?, rating),
                is_active = COALESCE(?, is_active),
                display_order = COALESCE(?, display_order)
            WHERE id = ?
        `, [name, college, branch, avatar_url, review, rating, is_active, display_order, req.params.id]);
        
        res.json({ message: 'Testimonial updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteTestimonial = async (req, res) => {
    try {
        await db.query('DELETE FROM testimonials WHERE id = ?', [req.params.id]);
        res.json({ message: 'Testimonial deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 9. Static Pages Management (Admin)
exports.getStaticPages = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM static_pages ORDER BY title ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addStaticPage = async (req, res) => {
    try {
        const { slug, title, content, is_published } = req.body;
        const [result] = await db.query(`
            INSERT INTO static_pages (slug, title, content, is_published)
            VALUES (?, ?, ?, ?)
        `, [slug, title, content, is_published !== undefined ? is_published : 1]);
        
        res.status(201).json({ id: result.insertId, message: 'Static page created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateStaticPage = async (req, res) => {
    try {
        const { slug, title, content, is_published } = req.body;
        await db.query(`
            UPDATE static_pages 
            SET slug = COALESCE(?, slug),
                title = COALESCE(?, title),
                content = COALESCE(?, content),
                is_published = COALESCE(?, is_published),
                updated_at = NOW()
            WHERE id = ?
        `, [slug, title, content, is_published, req.params.id]);
        
        res.json({ message: 'Static page updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteStaticPage = async (req, res) => {
    try {
        await db.query('DELETE FROM static_pages WHERE id = ?', [req.params.id]);
        res.json({ message: 'Static page deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 10. Footer Links Management (Admin)
exports.getFooterLinks = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM footer_links ORDER BY column_title ASC, display_order ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addFooterLink = async (req, res) => {
    try {
        const { column_title, title, url, display_order, is_active } = req.body;
        const [result] = await db.query(`
            INSERT INTO footer_links (column_title, title, url, display_order, is_active)
            VALUES (?, ?, ?, ?, ?)
        `, [column_title, title, url, display_order || 0, is_active !== undefined ? is_active : 1]);
        
        res.status(201).json({ id: result.insertId, message: 'Footer link created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateFooterLink = async (req, res) => {
    try {
        const { column_title, title, url, display_order, is_active } = req.body;
        await db.query(`
            UPDATE footer_links 
            SET column_title = COALESCE(?, column_title),
                title = COALESCE(?, title),
                url = COALESCE(?, url),
                display_order = COALESCE(?, display_order),
                is_active = COALESCE(?, is_active)
            WHERE id = ?
        `, [column_title, title, url, display_order, is_active, req.params.id]);
        
        res.json({ message: 'Footer link updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteFooterLink = async (req, res) => {
    try {
        await db.query('DELETE FROM footer_links WHERE id = ?', [req.params.id]);
        res.json({ message: 'Footer link deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 11. Media Library Management (Admin)
exports.getMedia = async (req, res) => {
    try {
        const { category, search } = req.query;
        let sql = 'SELECT * FROM media WHERE 1=1';
        const params = [];
        if (category && category !== 'all') {
            sql += ' AND category = ?';
            params.push(category);
        }
        if (search) {
            sql += ' AND (file_name LIKE ? OR alt_text LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        sql += ' ORDER BY created_at DESC';

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const filePath = req.file.path.replace(/\\/g, '/');
        const fileName = req.file.originalname;
        const fileType = req.file.mimetype;
        const fileSize = req.file.size;
        const { category, alt_text } = req.body;

        const [result] = await db.query(`
            INSERT INTO media (file_name, file_path, file_type, file_size, category, alt_text)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [fileName, filePath, fileType, fileSize, category || 'general', alt_text || fileName]);

        res.status(201).json({
            id: result.insertId,
            url: filePath,
            fileName,
            category: category || 'general',
            message: 'Media uploaded successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteMedia = async (req, res) => {
    try {
        await db.query('DELETE FROM media WHERE id = ?', [req.params.id]);
        res.json({ message: 'Media item deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 12. Analytics Reports (Admin)
exports.getAnalytics = async (req, res) => {
    try {
        const [topViewed] = await db.query(`
            SELECT r.id, r.title, r.views, r.downloads, c.name as college_name, sub.name as subject_name
            FROM resources r
            LEFT JOIN colleges c ON r.college_id = c.id
            LEFT JOIN subjects sub ON r.subject_id = sub.id
            WHERE r.status = 'approved'
            ORDER BY r.views DESC
            LIMIT 10
        `);

        const [topDownloaded] = await db.query(`
            SELECT r.id, r.title, r.downloads, r.views, c.name as college_name, sub.name as subject_name
            FROM resources r
            LEFT JOIN colleges c ON r.college_id = c.id
            LEFT JOIN subjects sub ON r.subject_id = sub.id
            WHERE r.status = 'approved'
            ORDER BY r.downloads DESC
            LIMIT 10
        `);

        const [popularColleges] = await db.query(`
            SELECT c.id, c.name, COUNT(r.id) as resource_count, COALESCE(SUM(r.downloads), 0) as total_downloads
            FROM colleges c
            LEFT JOIN resources r ON c.id = r.college_id AND r.status = 'approved'
            GROUP BY c.id
            ORDER BY total_downloads DESC, resource_count DESC
            LIMIT 10
        `);

        const [topContributors] = await db.query(`
            SELECT u.id, u.name, u.avatar_url, c.name as college_name, COUNT(r.id) as approved_uploads
            FROM users u
            JOIN resources r ON u.id = r.contributor_id
            LEFT JOIN colleges c ON u.college_id = c.id
            WHERE r.status = 'approved' AND u.role = 'student'
            GROUP BY u.id
            ORDER BY approved_uploads DESC
            LIMIT 10
        `);

        res.json({
            topViewed,
            topDownloaded,
            popularColleges,
            topContributors
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
