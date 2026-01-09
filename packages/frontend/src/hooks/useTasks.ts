import { useSuspenseQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

export function useTasks() {
  return useSuspenseQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await apiClient.api.tasks.$get();
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return response.json();
    },
  });
}
