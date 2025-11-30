import { z } from 'zod';

// Frequency enum
export const FrequencySchema = z.enum(['weekly', 'biweekly', 'monthly', 'yearly']);
export type Frequency = z.infer<typeof FrequencySchema>;

// Category types
export const CategoryTypeSchema = z.enum(['expense', 'debt', 'subscription']);
export type CategoryType = z.infer<typeof CategoryTypeSchema>;

// Salary configuration
export const SalaryConfigSchema = z.object({
  amount: z.number().positive('Salary must be positive'),
  frequency: FrequencySchema.default('biweekly'),
  currency: z.string().length(3).default('USD'),
});
export type SalaryConfig = z.infer<typeof SalaryConfigSchema>;

// Budget category
export const CategorySchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(50),
  type: CategoryTypeSchema,
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});
export type Category = z.infer<typeof CategorySchema>;

// Budget item
export const BudgetItemSchema = z.object({
  id: z.number().int().positive().optional(),
  category_id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  amount: z.number().positive('Amount must be positive').max(1_000_000_000),
  frequency: FrequencySchema.default('monthly'),
  is_active: z.boolean().default(true),
  due_day: z.number().int().min(1).max(31).optional(),
  notes: z.string().max(1000).optional(),
});
export type BudgetItem = z.infer<typeof BudgetItemSchema>;

// Debt details extension
export const DebtDetailsSchema = z.object({
  budget_item_id: z.number().int().positive(),
  principal: z.number().positive(),
  interest_rate: z.number().min(0).max(1).optional(), // 0.0599 = 5.99%
  minimum_payment: z.number().positive().optional(),
  current_balance: z.number().positive(),
  target_payoff_date: z.string().datetime().optional(),
});
export type DebtDetails = z.infer<typeof DebtDetailsSchema>;

// What-if scenario
export const ScenarioSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  item_states: z.record(z.string(), z.boolean()), // { "item_id": true/false }
});
export type Scenario = z.infer<typeof ScenarioSchema>;
