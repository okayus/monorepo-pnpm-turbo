import { describe, it } from 'vitest';
import { getTaskList } from './taskList';
import { Context } from 'hono';

describe('getTaskList', () => {
  it('should return a list of tasks', () => {
    const mockContext = {
      json: (data: any) => {
        return {
          status: 200,
          body: data,
        };
      },
    } as unknown as Context;

    const response = getTaskList(mockContext);
    const responseBody = (response as any).body;

    if (!responseBody || !responseBody.tasks) {
      throw new Error('Response body or tasks is undefined');
    }

    if (responseBody.tasks.length !== 2) {
      throw new Error('Expected 2 tasks in the response');
    }

    if (responseBody.tasks[0].title !== 'Task 1') {
      throw new Error('First task title does not match');
    }

    if (responseBody.tasks[1].completed !== true) {
      throw new Error('Second task completion status does not match');
    }
  });
});
