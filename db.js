const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool de conexões: reaproveita conexões em vez de abrir uma nova
// a cada requisição (muito mais rápido e evita esgotar o banco).
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
