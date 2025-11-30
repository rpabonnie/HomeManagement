/**
 * Database Client
 * 
 * Note: Database implementation will be configured separately.
 * This module exports a placeholder for the database connection.
 * The actual database setup will be done when configuring the environment.
 */

// Placeholder export - actual implementation depends on runtime environment
export const dbConfig = {
  dialect: 'sqlite' as const,
  defaultPath: './data/hms.db',
};
