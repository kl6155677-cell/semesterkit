require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const db = require('../backend/config/db');

async function test() {
  try {
    const pageSize = 12;
    const offset = 0;
    const sql = `
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
      WHERE r.status = 'approved' AND (r.is_archived = 0 OR r.is_archived IS NULL)
      ORDER BY r.created_at DESC
      LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}
    `;
    const [rows] = await db.query(sql);
    console.log('Query success! Rows count:', rows.length);
    console.log('Sample row:', rows[0]);
  } catch (err) {
    console.error('Test query error:', err);
  } finally {
    process.exit(0);
  }
}

test();
