#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

(async () => {
  try {
    const envPath = path.resolve(__dirname, '..', '.env');
    loadEnv(envPath);

    const host = process.env.DB_HOST || 'localhost';
    const port = Number(process.env.DB_PORT || 3306);
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || 'root';
    const database = process.env.DB_NAME || 'detetive_db';

    console.log('Conectando ao banco', { host, port, user, database });
    const conn = await mysql.createConnection({ host, port, user, password, database });

    const [rows] = await conn.execute(
      "SELECT COUNT(*) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'perfis' AND COLUMN_NAME = 'abandonos'",
      [database],
    );

    const count = rows && rows[0] && (rows[0].c || rows[0].C || rows[0]['COUNT(*)']) ? (rows[0].c || rows[0].C || rows[0]['COUNT(*)']) : 0;

    if (Number(count) > 0) {
      console.log('A coluna `abandonos` já existe — nada a fazer.');
      await conn.end();
      process.exit(0);
    }

    console.log('Adicionando coluna `abandonos` em `perfis`...');
    await conn.execute("ALTER TABLE perfis ADD COLUMN `abandonos` INT NOT NULL DEFAULT 0;");
    console.log('Coluna adicionada com sucesso.');
    await conn.end();
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Falha ao aplicar migracao de abandonos:', err);
    process.exit(1);
  }
})();
