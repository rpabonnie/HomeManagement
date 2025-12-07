import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

const port = Number(process.env.PORT) || 3000;

console.log(`Server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
