/**
 * HMS API Entry Point
 * Household Management System - Backend API
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  });
});

// Placeholder routes
app.get('/', (c) => {
  return c.json({ 
    message: 'Household Management System API',
    modules: ['budget', 'generator']
  });
});

const port = Number(process.env.PORT) || 3000;

console.log(`🚀 HMS API starting on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
