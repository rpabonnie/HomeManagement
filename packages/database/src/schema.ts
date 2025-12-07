import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Example table - replace with your own schema
export const example = sqliteTable('example', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});
