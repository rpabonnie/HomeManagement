import { z } from 'zod';

// User registration/login
export const UserCredentialsSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});
export type UserCredentials = z.infer<typeof UserCredentialsSchema>;

// User profile
export const UserProfileSchema = z.object({
  id: z.number().int().positive().optional(),
  email: z.string().email(),
  created_at: z.string().datetime().optional(),
  last_login_at: z.string().datetime().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

// API Key creation
export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
  expires_in_days: z.number().int().positive().optional(),
});
export type CreateApiKey = z.infer<typeof CreateApiKeySchema>;

// API Key response (returned once on creation)
export const ApiKeyResponseSchema = z.object({
  key: z.string(), // Full key, shown only once
  prefix: z.string(),
  name: z.string(),
  scopes: z.array(z.string()),
  expires_at: z.string().datetime().optional(),
});
export type ApiKeyResponse = z.infer<typeof ApiKeyResponseSchema>;

// API Key listing (doesn't include the actual key)
export const ApiKeyListItemSchema = z.object({
  id: z.number().int().positive(),
  prefix: z.string(),
  name: z.string(),
  scopes: z.array(z.string()),
  last_used_at: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
});
export type ApiKeyListItem = z.infer<typeof ApiKeyListItemSchema>;
