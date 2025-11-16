import { Context } from 'hono';

export const getTaskList = (c: Context): Response => {
  const tasks = [
    { id: 1, title: 'Task 1', completed: false },
    { id: 2, title: 'Task 2', completed: true },
  ];
  return c.json({ tasks });
};
