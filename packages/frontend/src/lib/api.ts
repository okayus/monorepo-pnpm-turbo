import { hc } from 'hono/client';
import type { AppType } from '../../../backend/src/index';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://monorepo-pnpm-turbo-backend.toshiaki-mukai-9981.workers.dev';

export const apiClient = hc<AppType>(API_BASE_URL);
