import { Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { createDB } from './db';
import { getTaskList } from './handlers/taskList';

const app = new Hono();

// CORS configuration for frontend
app.use(
  '/*',
  cors({
    origin: [
      'http://localhost:5173', // Local development
      'https://monorepo-pnpm-turbo-frontend.pages.dev', // Production
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
);

app.get('/', (c) => {
  return c.json({ message: 'Hello, World!' });
});

app.get('/api/tasks', async (c: Context<{ Bindings: Env }>) => {
  const db = createDB(c.env.DB);
  return getTaskList(db, c);
});

export default app;
