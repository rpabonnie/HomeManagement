import { z } from 'zod';

// Example validation schema - replace with your own
export const exampleSchema = z.object({
  name: z.string().min(1),
});

export type Example = z.infer<typeof exampleSchema>;
