import { describe, it, expect, vi } from 'vitest';
import { getTaskList } from './taskList';
import { Context } from 'hono';
import { DB } from '../db';
import { Task } from '../db/schema';

describe('getTaskList', () => {
  it('should return a list of tasks', async () => {
    // モックデータ
    const mockTasks: Task[] = [
      {
        id: 1,
        userId: 1,
        title: 'Task 1',
        description: 'Description 1',
        completed: false,
        createdAt: '2025-11-19 10:00:00',
      },
      {
        id: 2,
        userId: 1,
        title: 'Task 2',
        description: 'Description 2',
        completed: true,
        createdAt: '2025-11-19 09:00:00',
      },
      {
        id: 3,
        userId: 1,
        title: 'Task 3',
        description: null,
        completed: false,
        createdAt: '2025-11-19 08:00:00',
      },
    ];

    // DBのモック（メソッドチェーンをサポート）
    const mockOrderBy = vi.fn().mockResolvedValue(mockTasks);
    const mockFrom = vi.fn().mockReturnValue({
      orderBy: mockOrderBy,
    });
    const mockSelect = vi.fn().mockReturnValue({
      from: mockFrom,
    });

    const mockDB = {
      select: mockSelect,
    } as unknown as DB;

    // Contextのモック
    interface JsonResponse {
      tasks: Task[];
    }

    let capturedData: JsonResponse | null = null;

    const mockContext = {
      json: (data: JsonResponse) => {
        capturedData = data;
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    } as unknown as Context<{ Bindings: Env }>;

    // テスト実行
    const response = await getTaskList(mockDB, mockContext);

    // アサーション
    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockOrderBy).toHaveBeenCalledTimes(1);

    expect(capturedData).not.toBeNull();
    expect(capturedData!.tasks).toHaveLength(3);
    expect(capturedData!.tasks[0].title).toBe('Task 1');
    expect(capturedData!.tasks[0].completed).toBe(false);
    expect(capturedData!.tasks[1].title).toBe('Task 2');
    expect(capturedData!.tasks[1].completed).toBe(true);

    // Responseオブジェクトの検証
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);

    interface ResponseBody {
      tasks: Task[];
    }

    const responseBody = (await response.json()) as ResponseBody;
    expect(responseBody.tasks).toHaveLength(3);
  });

  it('should return empty array when no tasks exist', async () => {
    // 空のモックデータ
    const mockTasks: Task[] = [];

    const mockOrderBy = vi.fn().mockResolvedValue(mockTasks);
    const mockFrom = vi.fn().mockReturnValue({
      orderBy: mockOrderBy,
    });
    const mockSelect = vi.fn().mockReturnValue({
      from: mockFrom,
    });

    const mockDB = {
      select: mockSelect,
    } as unknown as DB;

    interface JsonResponse {
      tasks: Task[];
    }

    let capturedData: JsonResponse | null = null;

    const mockContext = {
      json: (data: JsonResponse) => {
        capturedData = data;
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    } as unknown as Context<{ Bindings: Env }>;

    await getTaskList(mockDB, mockContext);

    expect(capturedData!.tasks).toHaveLength(0);
  });
});
