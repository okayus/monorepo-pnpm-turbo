import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // スキーマファイルの場所
  schema: './src/db/schema.ts',

  // マイグレーションファイルの出力先
  out: './drizzle',

  // 使用するデータベースドライバ
  dialect: 'sqlite',

  // D1専用の設定
  driver: 'd1-http',

  // データベース認証情報（ローカル開発用）
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
});
