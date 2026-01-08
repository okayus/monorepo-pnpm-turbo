import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

vi.mock('./lib/api', () => ({
  apiClient: {
    api: {
      tasks: {
        $get: vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ tasks: [] }),
        }),
      },
    },
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('App', () => {
  it('renders the title', () => {
    renderWithProviders(<App />);
    expect(
      screen.getByText(/Monorepo PNPM Turbo - Frontend/i)
    ).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    renderWithProviders(<App />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });
});
