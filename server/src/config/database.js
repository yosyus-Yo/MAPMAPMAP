// Database configuration using sql.js
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/mapmap.db');
const SCHEMA_PATH = path.join(__dirname, '../../database/schema.sql');

let db = null;

// Initialize database
async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('Database loaded from file');
  } else {
    db = new SQL.Database();
    console.log('New database created');
  }

  // Apply schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.run(schema);
  console.log('Schema applied');

  return db;
}

// Save database to file
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Get database instance
function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Execute query and return results
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Execute query and return first result
function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results[0] || null;
}

// Execute statement (INSERT, UPDATE, DELETE)
function run(sql, params = []) {
  db.run(sql, params);
  saveDatabase(); // Auto-save after modifications
  return {
    changes: db.getRowsModified(),
    lastInsertRowid: null // sql.js doesn't provide this easily
  };
}

// Cleanup on process exit
process.on('exit', saveDatabase);
process.on('SIGINT', () => {
  saveDatabase();
  process.exit();
});
process.on('SIGTERM', () => {
  saveDatabase();
  process.exit();
});

module.exports = {
  initDatabase,
  getDb,
  query,
  queryOne,
  run,
  saveDatabase
};
