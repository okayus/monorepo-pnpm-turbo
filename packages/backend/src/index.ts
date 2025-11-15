import { serve } from '@hono/node-server'
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
  return c.json({ message: 'Hello, World!' });
});

serve({fetch: app.fetch, port: 3000});

console.log('Server is running on http://localhost:3000');