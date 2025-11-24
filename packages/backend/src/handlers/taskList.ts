import { Context } from 'hono';
import { DB } from '../db';
import { tasks } from '../db/schema';
import { desc } from 'drizzle-orm';

export const getTaskList = async (db: DB, c: Context<{ Bindings: Env }>) => {
  const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  return c.json({ tasks: allTasks }, 200);
};
