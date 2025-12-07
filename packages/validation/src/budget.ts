import { z } from 'zod';

// Example validation schema - replace with your own
export const exampleBudgetSchema = z.object({
  amount: z.number().positive(),
});

export type ExampleBudget = z.infer<typeof exampleBudgetSchema>;
