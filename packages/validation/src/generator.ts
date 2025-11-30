import { z } from 'zod';

// Maintenance types
export const MaintenanceTypeSchema = z.enum(['oil_change', 'filter', 'spark_plug', 'other']);
export type MaintenanceType = z.infer<typeof MaintenanceTypeSchema>;

// Generator configuration
export const GeneratorSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(100).default('Primary Generator'),
  model: z.string().max(100).optional(),
  oil_change_interval_hours: z.number().positive().default(100),
  last_oil_change_at: z.number().min(0).default(0),
});
export type Generator = z.infer<typeof GeneratorSchema>;

// Usage session
export const UsageSessionSchema = z.object({
  id: z.number().int().positive().optional(),
  generator_id: z.number().int().positive().default(1),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional(),
  duration_hours: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});
export type UsageSession = z.infer<typeof UsageSessionSchema>;

// Maintenance log entry
export const MaintenanceLogSchema = z.object({
  id: z.number().int().positive().optional(),
  generator_id: z.number().int().positive(),
  type: MaintenanceTypeSchema,
  performed_at: z.string().datetime().optional(),
  hours_at_maintenance: z.number().min(0),
  cost: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});
export type MaintenanceLog = z.infer<typeof MaintenanceLogSchema>;

// Alert configuration
export const AlertConfigSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  hours_before_due: z.number().positive().default(10),
});
export type AlertConfig = z.infer<typeof AlertConfigSchema>;

// API response for generator operations
export const GeneratorStartResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  session_id: z.number().int().positive(),
  started_at: z.string().datetime(),
});
export type GeneratorStartResponse = z.infer<typeof GeneratorStartResponseSchema>;

export const GeneratorStopResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  duration_hours: z.number().min(0),
  total_hours: z.number().min(0),
  maintenance_due: z.boolean(),
});
export type GeneratorStopResponse = z.infer<typeof GeneratorStopResponseSchema>;
