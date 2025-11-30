import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Users table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
  last_login_at: text('last_login_at'),
});

// API Keys table
export const apiKeys = sqliteTable('api_keys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  key_hash: text('key_hash').notNull(),
  key_prefix: text('key_prefix').notNull(),
  name: text('name').notNull(),
  scopes: text('scopes').notNull().default('["*"]'),
  last_used_at: text('last_used_at'),
  expires_at: text('expires_at'),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
  revoked_at: text('revoked_at'),
});

// Salary configuration
export const salaryConfig = sqliteTable('salary_config', {
  id: integer('id').primaryKey().default(1),
  amount: real('amount').notNull(),
  frequency: text('frequency').notNull().default('biweekly'),
  currency: text('currency').notNull().default('USD'),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
});

// Budget categories
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  type: text('type').notNull(), // 'expense', 'debt', 'subscription'
  icon: text('icon'),
  color: text('color'),
});

// Budget items
export const budgetItems = sqliteTable('budget_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category_id: integer('category_id').notNull().references(() => categories.id),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  frequency: text('frequency').notNull().default('monthly'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  due_day: integer('due_day'),
  notes: text('notes'),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
});

// Debt details
export const debtDetails = sqliteTable('debt_details', {
  budget_item_id: integer('budget_item_id').primaryKey().references(() => budgetItems.id),
  principal: real('principal').notNull(),
  interest_rate: real('interest_rate'),
  minimum_payment: real('minimum_payment'),
  current_balance: real('current_balance').notNull(),
  target_payoff_date: text('target_payoff_date'),
});

// What-if scenarios
export const scenarios = sqliteTable('scenarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  item_states: text('item_states').notNull(), // JSON
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// Generators
export const generators = sqliteTable('generators', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().default('Primary Generator'),
  model: text('model'),
  oil_change_interval_hours: real('oil_change_interval_hours').notNull().default(100),
  last_oil_change_at: real('last_oil_change_at').default(0),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// Usage sessions
export const usageSessions = sqliteTable('usage_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  generator_id: integer('generator_id').notNull().references(() => generators.id).default(1),
  start_time: text('start_time').notNull().default('CURRENT_TIMESTAMP'),
  end_time: text('end_time'),
  duration_hours: real('duration_hours'),
  notes: text('notes'),
});

// Maintenance log
export const maintenanceLog = sqliteTable('maintenance_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  generator_id: integer('generator_id').notNull().references(() => generators.id),
  type: text('type').notNull(), // 'oil_change', 'filter', 'spark_plug', 'other'
  performed_at: text('performed_at').default('CURRENT_TIMESTAMP'),
  hours_at_maintenance: real('hours_at_maintenance').notNull(),
  cost: real('cost'),
  notes: text('notes'),
});

// Alert configuration
export const alertConfig = sqliteTable('alert_config', {
  id: integer('id').primaryKey().default(1),
  email: text('email'),
  phone: text('phone'),
  hours_before_due: real('hours_before_due').default(10),
});

// Audit logs
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  event_type: text('event_type').notNull(),
  user_id: integer('user_id'),
  resource_type: text('resource_type'),
  resource_id: text('resource_id'),
  details: text('details'),
  ip_address: text('ip_address'),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});
