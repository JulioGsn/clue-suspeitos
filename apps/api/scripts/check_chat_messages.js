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

    const [tables] = await conn.execute(
      "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND table_name = 'chat_messages'",
      [process.env.DB_NAME || 'detetive_db'],
    );

    if (!tables || (Array.isArray(tables) && tables.length === 0)) {
      console.log('table_not_found');
      await conn.end();
      return;
    }

    const [rows] = await conn.execute(
      'SELECT id, author_username, text, criado_em FROM chat_messages ORDER BY criado_em DESC LIMIT 200',
    );

    console.log('rows_count=' + (rows.length || 0));
    if (rows.length > 0) console.table(rows);

    await conn.end();
  } catch (e) {
    console.error('error', e.message || e);
    process.exit(1);
  }
})();
