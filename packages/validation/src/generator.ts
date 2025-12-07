import { z } from 'zod';

// Example validation schema - replace with your own
export const exampleGeneratorSchema = z.object({
  hours: z.number().min(0),
});

export type ExampleGenerator = z.infer<typeof exampleGeneratorSchema>;
