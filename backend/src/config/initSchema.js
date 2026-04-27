const fs = require('fs');
const path = require('path');
const pool = require('./db');

function splitSqlStatements(sqlText) {
  return sqlText
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function initSchema() {
  const schemaPath = path.resolve(__dirname, '../../../db_schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.warn('[db] db_schema.sql not found, schema init skipped');
    return;
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  const statements = splitSqlStatements(sql);

  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (error) {
      console.error(`[db] Failed statement: ${statement.slice(0, 120)}...`);
      throw error;
    }
  }

  const [durationRows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'services'
       AND COLUMN_NAME = 'durationMin'`
  );

  if (!durationRows[0]?.cnt) {
    await pool.query('ALTER TABLE services ADD COLUMN durationMin INT DEFAULT 60');
  }

  const [avatarRows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'avatarUrl'`
  );

  if (!avatarRows[0]?.cnt) {
    await pool.query('ALTER TABLE users ADD COLUMN avatarUrl MEDIUMTEXT');
  }

  const reviewColumns = [
    { name: 'recordId', sql: 'ALTER TABLE reviews ADD COLUMN recordId INT NULL' },
    { name: 'userId', sql: 'ALTER TABLE reviews ADD COLUMN userId INT NULL' },
    { name: 'serviceId', sql: 'ALTER TABLE reviews ADD COLUMN serviceId INT NULL' }
  ];

  for (const column of reviewColumns) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS cnt
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'reviews'
         AND COLUMN_NAME = ?`,
      [column.name]
    );

    if (!rows[0]?.cnt) {
      await pool.query(column.sql);
    }
  }

  const [uniqueRows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'reviews'
       AND INDEX_NAME = 'uniq_review_record'`
  );
  if (!uniqueRows[0]?.cnt) {
    await pool.query('ALTER TABLE reviews ADD UNIQUE KEY uniq_review_record (recordId)');
  }

  // Make review rating/text optional so users can leave feedback without mandatory fields
  await pool.query('ALTER TABLE reviews MODIFY COLUMN rating INT NULL');
  await pool.query('ALTER TABLE reviews MODIFY COLUMN text TEXT NULL');
  await pool.query('ALTER TABLE services MODIFY COLUMN imageUrl MEDIUMTEXT NULL');
  await pool.query('ALTER TABLE barbers MODIFY COLUMN imageUrl MEDIUMTEXT NULL');
}

module.exports = initSchema;
