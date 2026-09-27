const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: (process.env.DB_HOST || '').trim(),
  port: parseInt(process.env.DB_PORT || '4000', 10),
  user: (process.env.DB_USER || '').trim(),
  password: (process.env.DB_PASSWORD || '').trim(),
  database: (process.env.DB_NAME || '').trim(),
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

const promisePool = pool.promise();

module.exports = promisePool;
