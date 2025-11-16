import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
  return c.json({ message: 'Hello, World!' });
});

console.log('Server is running');

export default app;
