import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

/**
 * Drizzle DB インスタンスを作成
 *
 * @param d1 - Cloudflare D1Database インスタンス
 * @returns Drizzle ORM インスタンス
 */
export function createDB(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type DB = ReturnType<typeof createDB>;
