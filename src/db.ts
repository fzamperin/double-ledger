import Database from 'better-sqlite3';

// Create an in-memory database
export const db = new Database(':memory:');

// Initialize the database schema
export function initializeDatabase() {
  // Create accounts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT,
      balance REAL NOT NULL DEFAULT 0,
      direction TEXT NOT NULL CHECK(direction IN ('debit', 'credit'))
    )
  `);

  // Create transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      name TEXT,
      date TEXT NOT NULL
    )
  `);

  // Create transaction_entries table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transaction_entries (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      amount REAL NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('debit', 'credit')),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    )
  `);

  console.log('Database initialized');
}

// Initialize the database on module load
export default { initializeDatabase };
