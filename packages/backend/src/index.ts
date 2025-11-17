import { Hono } from 'hono';
import { cors } from 'hono/cors';

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

console.log('Server is running');

export default app;
