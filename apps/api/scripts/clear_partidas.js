const mysql = require('mysql2/promise');
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'detetive_db',
    });

    console.log('Connected to DB, deleting partidas...');
    const [result] = await conn.execute('DELETE FROM partidas');
    const affected = result && (result.affectedRows || result.affectedRows === 0 ? result.affectedRows : result.affectedRows);
    console.log('Deleted partidas rows:', affected ?? result);

    await conn.end();
  } catch (e) {
    console.error('error', e.message || e);
    process.exit(1);
  }
})();
