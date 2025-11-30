import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

// Database path from environment or default
const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './data/hms.db';

// Create database connection
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Export for direct access if needed
export { sqlite };
