import { useTasks } from '../hooks/useTasks';

export function TaskList() {
  const { data } = useTasks();

  return (
    <p style={{ fontSize: '1.5rem', color: 'green' }}>
      Fetched {data.tasks.length} tasks from backend.
    </p>
  );
}
