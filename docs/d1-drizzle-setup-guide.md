# D1データベース + Drizzle ORM セットアップガイド

このガイドでは、Cloudflare D1データベースとDrizzle ORMを使って、データベース機能を実装する方法を解説します。

## 目次

1. [D1とDrizzleの基礎知識](#d1とdrizzleの基礎知識)
2. [セットアップ手順](#セットアップ手順)
3. [スキーマ定義](#スキーマ定義)
4. [マイグレーション](#マイグレーション)
5. [データ操作](#データ操作)
6. [API実装](#api実装)
7. [型安全性](#型安全性)
8. [トラブルシューティング](#トラブルシューティング)
9. [ベストプラクティス](#ベストプラクティス)

---

## D1とDrizzleの基礎知識

### Cloudflare D1 とは

**D1**: Cloudflare のサーバーレス SQLite データベース

**特徴**:
- ✅ **SQLite互換** - 標準的なSQL構文が使える
- ✅ **エッジで実行** - 低レイテンシー、高速アクセス
- ✅ **無料枠が豊富** - 月100,000回の読み取り、1,000回の書き込み
- ✅ **スケーラブル** - 自動でスケーリング
- ✅ **Workers統合** - Cloudflare Workersとシームレスに連携

**料金（2025年時点）**:
| 項目 | 無料枠 | 有料 |
|------|--------|------|
| 読み取り | 100,000/日 | $0.001/1,000回 |
| 書き込み | 1,000/日 | $1.00/100万回 |
| ストレージ | 5GB | $0.75/GB/月 |

### Drizzle ORM とは

**Drizzle**: TypeScript-first の軽量ORM

**特徴**:
- ✅ **型安全** - エンドツーエンドの型推論
- ✅ **SQL-like** - SQLに近い構文で書ける
- ✅ **軽量** - バンドルサイズが小さい（~7KB）
- ✅ **マイグレーション** - スキーマ変更を自動追跡
- ✅ **D1対応** - Cloudflare D1専用アダプタあり

**他のORMとの比較**:

| ORM | バンドルサイズ | 型安全性 | D1対応 |
|-----|--------------|---------|--------|
| **Drizzle** | ~7KB | ⭐⭐⭐ | ✅ |
| Prisma | 大きい | ⭐⭐⭐ | ⚠️ 限定的 |
| TypeORM | 大きい | ⭐⭐ | ❌ |

### なぜD1 + Drizzle？

1. **Cloudflare Workersとの相性が最高**
   - 両方ともCloudflareエコシステム
   - レイテンシーが極めて低い

2. **開発体験が良い**
   - TypeScriptの型推論が強力
   - SQLに近い構文で学習コストが低い

3. **コストパフォーマンス**
   - 無料枠だけで小規模アプリは十分運用可能
   - Workers + D1 の組み合わせは格安

---

## セットアップ手順

### 1. パッケージのインストール

```bash
cd packages/backend

# Drizzle ORM と D1 アダプタ
pnpm add drizzle-orm

# Drizzle Kit（マイグレーションツール）
pnpm add -D drizzle-kit

# 型定義（Workers用）
pnpm add -D @cloudflare/workers-types
```

**インストール後の package.json**:
```json
{
  "dependencies": {
    "hono": "^4.10.6",
    "drizzle-orm": "^0.36.4"
  },
  "devDependencies": {
    "wrangler": "^4.47.0",
    "drizzle-kit": "^0.30.1",
    "@cloudflare/workers-types": "^4.20250107.0"
  }
}
```

### 2. Drizzle 設定ファイルの作成

`packages/backend/drizzle.config.ts` を作成：

```typescript
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
```

**注意**: この設定は主にマイグレーション生成用です。実際のアプリケーションではWranglerのバインディングを使います。

### 3. TypeScript設定の更新

`packages/backend/tsconfig.json` に型定義を追加：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "types": [
      "@types/node",
      "@cloudflare/workers-types"  // ← 追加
    ],
    // ... その他の設定
  }
}
```

### 4. package.json にスクリプト追加

`packages/backend/package.json`:

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "test": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",

    // ↓ 以下を追加
    "types:generate": "wrangler types",
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply DB --local",
    "db:migrate:prod": "wrangler d1 migrations apply DB --remote",
    "db:studio": "drizzle-kit studio",
    "db:push": "drizzle-kit push"
  }
}
```

**スクリプト説明**:
- `types:generate` - Wranglerの型定義を自動生成（`worker-configuration.d.ts`）
- `db:generate` - スキーマからマイグレーションファイルを生成
- `db:migrate:local` - ローカルD1にマイグレーション適用
- `db:migrate:prod` - 本番D1にマイグレーション適用
- `db:studio` - Drizzle Studio（GUI）起動
- `db:push` - スキーマを直接プッシュ（開発用）

---

## スキーマ定義

### ディレクトリ構造

```
packages/backend/
├── src/
│   ├── db/
│   │   ├── schema.ts      # テーブル定義
│   │   └── index.ts       # DB接続管理
│   ├── handlers/
│   │   └── tasks.ts       # APIハンドラー
│   └── index.ts           # メインエントリポイント
├── drizzle/               # マイグレーションファイル（自動生成）
│   └── 0000_xxx.sql
└── drizzle.config.ts      # Drizzle設定
```

### スキーマファイルの作成

Drizzleのスキーマは、データベースのテーブル構造を定義します。シンプルなスキーマと、リレーションを含むスキーマの2つのパターンを紹介します。

#### パターン1: シンプルなスキーマ（リレーションなし）

`packages/backend/src/db/schema.ts`:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Tasks テーブル
 *
 * タスク管理アプリのメインテーブル
 */
export const tasks = sqliteTable('tasks', {
  // プライマリキー（自動インクリメント）
  id: integer('id').primaryKey({ autoIncrement: true }),

  // タイトル（必須）
  title: text('title').notNull(),

  // 説明（オプション）
  description: text('description'),

  // 完了フラグ（デフォルト: false）
  completed: integer('completed', { mode: 'boolean' })
    .notNull()
    .default(false),

  // 作成日時（自動設定）
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),

  // 更新日時（自動設定）
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

/**
 * 型定義をエクスポート
 */
export type Task = typeof tasks.$inferSelect;      // SELECT時の型
export type NewTask = typeof tasks.$inferInsert;   // INSERT時の型
```

**型の説明**:
```typescript
// SELECT時の型（全てのフィールド）
type Task = {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

// INSERT時の型（自動生成フィールドは省略可能）
type NewTask = {
  id?: number;
  title: string;
  description?: string | null;
  completed?: boolean;
  createdAt?: string;
  updatedAt?: string;
};
```

#### パターン2: リレーションを含むスキーマ

ユーザーとタスクのリレーションを含む例：

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// ユーザーテーブル
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// タスクテーブル（user_idで関連付け）
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),  // 説明フィールド（オプション）
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// リレーション定義
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}));

// 型定義
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
```

**重要な違い**:
- パターン1: 独立したタスクテーブル（シンプル）
- パターン2: ユーザーとタスクのリレーション（複雑だが実用的）
  - タスクには必ず `user_id` が必要
  - ユーザーを削除する際の整合性管理が必要

---

## マイグレーション

### 1. 本番D1データベースの作成

```bash
cd packages/backend

# 本番用D1データベースを作成
wrangler d1 create DB
```

**出力例**:
```
✅ Successfully created DB database

[[d1_databases]]
binding = "DB"
database_name = "DB"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**重要**: この `database_id` を次のステップでコピーします。

### 2. ローカルD1データベースについて

**ローカルD1は自動作成されます**

ローカル開発用のD1データベースは、開発サーバー起動時に自動的に作成されます：

```bash
pnpm dev
```

実行すると `.wrangler/state/v3/d1/` ディレクトリに SQLite データベースが自動生成されます。

**注意**: `wrangler d1 create` コマンドに `--local` フラグは存在しません。

### 3. wrangler.jsonc にバインディング追加

`packages/backend/wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "monorepo-pnpm-turbo-backend",
  "main": "src/index.ts",
  "compatibility_date": "2025-11-16",
  "observability": {
    "enabled": true
  },

  // D1データベースバインディング
  "d1_databases": [
    {
      "binding": "DB",                                       // コード内で使う名前
      "database_name": "DB",                                 // データベース名
      "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // 本番DBのID
      "migrations_dir": "drizzle"                            // マイグレーションディレクトリ
    }
  ]
}
```

**重要ポイント**:
- `database_id`: `wrangler d1 create DB` の出力からコピー
- `migrations_dir`: Drizzle Kitが生成するマイグレーションディレクトリを指定（`drizzle`）
  - この設定がないと、Wranglerはデフォルトで `migrations` ディレクトリを探してエラーになります

### 4. 型定義の自動生成

Wranglerは `wrangler.jsonc` の設定から自動的に型定義を生成できます：

```bash
cd packages/backend

# 型定義を自動生成
npx wrangler types

# または package.json のスクリプトを使用
pnpm types:generate
```

これで `worker-configuration.d.ts` が自動生成されます：

```typescript
// worker-configuration.d.ts (自動生成)
interface Env {
  DB: D1Database;
}
```

**重要**: このファイルは自動生成されるため、手動で編集しないでください。`wrangler.jsonc` を変更したら、再度 `pnpm types:generate` を実行してください。

### 5. マイグレーションファイルの生成

```bash
cd packages/backend

# スキーマからマイグレーションファイルを生成
pnpm db:generate
```

**出力例**:
```
drizzle-kit: v0.30.1
drizzle-orm: v0.36.4

1 tables
tasks 6 columns 0 indexes 0 fks

[✓] Your SQL migration file ➜ drizzle/0000_bitter_marvels.sql 🚀
```

**生成されたマイグレーションファイル** (`drizzle/0000_bitter_marvels.sql`):

```sql
CREATE TABLE `tasks` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `completed` integer DEFAULT false NOT NULL,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL
);
```

### 6. マイグレーションの適用

#### ローカル環境

```bash
# ローカルD1にマイグレーション適用
pnpm db:migrate:local
```

**出力例**:
```
🌀 Executing on local database DB (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) from drizzle:
🌀 To execute on your remote database, add a --remote flag to your wrangler command.
┌─────────────────────────────────────┬────────┐
│ Migrations applied successfully!    │        │
├─────────────────────────────────────┼────────┤
│ 0000_bitter_marvels.sql             │ ✅     │
└─────────────────────────────────────┴────────┘
```

#### 本番環境

```bash
# 本番D1にマイグレーション適用
pnpm db:migrate:prod
```

**警告**: 本番環境へのマイグレーションは慎重に！必ずバックアップを取ってから実行してください。

---

## データ操作

### 1. SQLで直接データを挿入

#### パターン1: シンプルなスキーマの場合

**ローカル環境**:

```bash
# ローカルD1にSQLを実行
wrangler d1 execute DB --local --command "
  INSERT INTO tasks (title, description, completed)
  VALUES
    ('Buy groceries', 'Milk, eggs, bread', false),
    ('Finish project', 'Complete the documentation', false),
    ('Exercise', 'Go for a 30-minute run', true)
"
```

**本番環境**:

```bash
# 本番D1にSQLを実行
wrangler d1 execute DB --remote --command "
  INSERT INTO tasks (title, description, completed)
  VALUES ('Production task', 'This is in production', false)
"
```

#### パターン2: リレーションを含むスキーマの場合

**重要**: リレーションがある場合、まず親テーブル（`users`）にデータを挿入してから、子テーブル（`tasks`）にデータを挿入する必要があります。

**ステップ1: ユーザーを作成**

```bash
# ローカル環境
wrangler d1 execute DB --local --command "
  INSERT INTO users (name, email)
  VALUES ('Test User', 'test@example.com')
"
```

**ステップ2: ユーザーIDを確認**

```bash
# 作成したユーザーのIDを確認
wrangler d1 execute DB --local --command "
  SELECT id, name, email FROM users
"
```

**ステップ3: タスクを作成（user_idを指定）**

```bash
# user_id = 1 のタスクを作成
wrangler d1 execute DB --local --command "
  INSERT INTO tasks (user_id, title, description, completed)
  VALUES
    (1, 'Buy groceries', 'Milk, eggs, bread', false),
    (1, 'Finish project', 'Complete the documentation', false),
    (1, 'Exercise', 'Go for a 30-minute run', true)
"
```

**出力例**:
```
🌀 Executing on local database DB...
🌀 To execute on your remote database, add a --remote flag to your wrangler command.
🚣 Executed 1 command in 0.123s
```

### 2. データの確認

```bash
# ローカルD1のデータを確認
wrangler d1 execute DB --local --command "SELECT * FROM tasks"
```

**出力例**:
```
┌────┬─────────────────┬──────────────────────────┬───────────┬─────────────────────┬─────────────────────┐
│ id │ title           │ description              │ completed │ created_at          │ updated_at          │
├────┼─────────────────┼──────────────────────────┼───────────┼─────────────────────┼─────────────────────┤
│ 1  │ Buy groceries   │ Milk, eggs, bread        │ 0         │ 2025-11-17 10:30:00 │ 2025-11-17 10:30:00 │
│ 2  │ Finish project  │ Complete documentation   │ 0         │ 2025-11-17 10:30:01 │ 2025-11-17 10:30:01 │
│ 3  │ Exercise        │ Go for a 30-minute run   │ 1         │ 2025-11-17 10:30:02 │ 2025-11-17 10:30:02 │
└────┴─────────────────┴──────────────────────────┴───────────┴─────────────────────┴─────────────────────┘
```

### 3. SQLファイルから実行

**複雑なSQLの場合はファイルで管理**:

`packages/backend/scripts/seed.sql`:

```sql
-- タスクデータの投入
INSERT INTO tasks (title, description, completed) VALUES
  ('Learn Drizzle ORM', 'Read the documentation and build a sample app', false),
  ('Set up CI/CD', 'Configure GitHub Actions for automated deployment', true),
  ('Write tests', 'Add unit tests for all API endpoints', false),
  ('Deploy to production', 'Push changes to main branch', false);

-- データ確認
SELECT COUNT(*) as total_tasks FROM tasks;
SELECT COUNT(*) as completed_tasks FROM tasks WHERE completed = true;
```

**実行**:

```bash
wrangler d1 execute DB --local --file=scripts/seed.sql
```

---

## API実装

### 1. DB接続の設定

`packages/backend/src/db/index.ts`:

```typescript
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

// 型定義をエクスポート
export type DB = ReturnType<typeof createDB>;
```

### 2. Hono + D1 の型定義

`packages/backend/src/index.ts`:

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createDB } from './db';
import { getTasks, createTask } from './handlers/tasks';

// Honoアプリケーションの作成（Env型を指定）
// Env型は worker-configuration.d.ts から自動的に読み込まれる
const app = new Hono<{ Bindings: Env }>();

// CORS設定
app.use(
  '/*',
  cors({
    origin: [
      'http://localhost:5173',
      'https://monorepo-pnpm-turbo-frontend.pages.dev',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
);

// ヘルスチェック
app.get('/', (c) => {
  return c.json({ message: 'Hello, World!' });
});

// タスク一覧取得
app.get('/api/tasks', async (c) => {
  const db = createDB(c.env.DB);
  return getTasks(c, db);
});

// タスク作成
app.post('/api/tasks', async (c) => {
  const db = createDB(c.env.DB);
  return createTask(c, db);
});

export default app;
```

### 3. APIハンドラーの実装

`packages/backend/src/handlers/tasks.ts`:

```typescript
import { Context } from 'hono';
import { DB } from '../db';
import { tasks, NewTask } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * タスク一覧を取得
 *
 * GET /api/tasks
 */
export async function getTasks(c: Context, db: DB) {
  try {
    // Drizzle ORMでタスクを取得（作成日時の降順）
    const allTasks = await db
      .select()
      .from(tasks)
      .orderBy(desc(tasks.createdAt));

    return c.json({
      success: true,
      tasks: allTasks,
      count: allTasks.length,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch tasks',
      },
      500
    );
  }
}

/**
 * タスクを作成
 *
 * POST /api/tasks
 * Body: { title: string, description?: string }
 */
export async function createTask(c: Context, db: DB) {
  try {
    // リクエストボディを取得
    const body = await c.req.json<NewTask>();

    // バリデーション
    if (!body.title || body.title.trim() === '') {
      return c.json(
        {
          success: false,
          error: 'Title is required',
        },
        400
      );
    }

    // タスクを挿入
    const newTask = await db
      .insert(tasks)
      .values({
        title: body.title,
        description: body.description || null,
        completed: body.completed || false,
      })
      .returning();

    return c.json(
      {
        success: true,
        task: newTask[0],
      },
      201
    );
  } catch (error) {
    console.error('Error creating task:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create task',
      },
      500
    );
  }
}

/**
 * タスクを更新
 *
 * PUT /api/tasks/:id
 */
export async function updateTask(c: Context, db: DB) {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json<Partial<NewTask>>();

    const updatedTask = await db
      .update(tasks)
      .set({
        ...body,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tasks.id, id))
      .returning();

    if (updatedTask.length === 0) {
      return c.json(
        {
          success: false,
          error: 'Task not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      task: updatedTask[0],
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to update task',
      },
      500
    );
  }
}

/**
 * タスクを削除
 *
 * DELETE /api/tasks/:id
 */
export async function deleteTask(c: Context, db: DB) {
  try {
    const id = parseInt(c.req.param('id'));

    const deletedTask = await db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning();

    if (deletedTask.length === 0) {
      return c.json(
        {
          success: false,
          error: 'Task not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to delete task',
      },
      500
    );
  }
}
```

### 4. 開発サーバーで確認

```bash
cd packages/backend
pnpm dev
```

**APIをテスト**:

```bash
# タスク一覧取得
curl http://localhost:8787/api/tasks

# タスク作成
curl -X POST http://localhost:8787/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "New Task", "description": "Task description"}'
```

---

## 型安全性

### Drizzleの型推論

Drizzleは強力な型推論を持っています：

```typescript
import { tasks } from './db/schema';

// SELECT時の型（全フィールド）
type Task = typeof tasks.$inferSelect;
// {
//   id: number;
//   title: string;
//   description: string | null;
//   completed: boolean;
//   createdAt: string;
//   updatedAt: string;
// }

// INSERT時の型（自動生成フィールドは省略可能）
type NewTask = typeof tasks.$inferInsert;
// {
//   id?: number;
//   title: string;
//   description?: string | null;
//   completed?: boolean;
//   createdAt?: string;
//   updatedAt?: string;
// }
```

### クエリの型安全性

```typescript
// ✅ 型安全なクエリ
const result = await db
  .select({
    id: tasks.id,
    title: tasks.title,
  })
  .from(tasks);

// result の型は自動的に推論される
// result: { id: number; title: string }[]

// ❌ 存在しないフィールドはコンパイルエラー
const invalid = await db
  .select({
    invalidField: tasks.notExists,  // エラー！
  })
  .from(tasks);
```

### Honoとの統合

```typescript
import { Hono } from 'hono';
import type { Env } from './types/env';

const app = new Hono<{ Bindings: Env }>();

app.get('/api/tasks', async (c) => {
  // c.env.DB は型安全に D1Database として認識される
  const db = createDB(c.env.DB);

  // TypeScriptがすべての型を推論
  const tasks = await db.select().from(tasks);

  return c.json({ tasks });  // tasksの型も推論される
});
```

---

## トラブルシューティング

### 1. マイグレーション生成エラー

#### エラー

```
Error: Cannot find module './src/db/schema'
```

#### 原因

- `drizzle.config.ts` の `schema` パスが間違っている
- スキーマファイルが存在しない

#### 解決策

```bash
# ファイルが存在するか確認
ls -la src/db/schema.ts

# パスを確認
cat drizzle.config.ts
```

---

### 2. D1バインディングエラー

#### エラー

```
Error: DB is not defined
```

#### 原因

- `wrangler.jsonc` にD1バインディングが設定されていない
- バインディング名が一致していない

#### 解決策

**wrangler.jsonc を確認**:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",  // ← この名前でコード内でアクセス
      "database_name": "DB",
      "database_id": "xxx"
    }
  ]
}
```

**型定義を再生成**:

```bash
# wrangler.jsonc を変更したら型定義を再生成
pnpm types:generate
```

生成された `worker-configuration.d.ts` を確認：

```typescript
interface Env {
  DB: D1Database;  // ← バインディング名と一致
}
```

---

### 3. マイグレーション適用エラー

#### エラー 1: マイグレーションディレクトリが見つからない

```
▲ [WARNING] No migrations folder found.
✘ [ERROR] No migrations present at /path/to/backend/migrations.
```

#### 原因

Wranglerはデフォルトで `migrations` ディレクトリを探すが、Drizzle Kitは `drizzle` ディレクトリに出力する

#### 解決策

**wrangler.jsonc に `migrations_dir` を追加**:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "DB",
      "database_id": "xxx",
      "migrations_dir": "drizzle"  // ← これを追加
    }
  ]
}
```

#### エラー 2: テーブルが存在しない

```
Error: no such table: tasks
```

#### 原因

マイグレーションファイルが生成されていない、またはマイグレーションが適用されていない

#### 解決策

```bash
# 1. マイグレーションファイルを生成
pnpm db:generate

# 2. ローカルD1にマイグレーション適用
pnpm db:migrate:local

# 3. マイグレーションが適用されたか確認
wrangler d1 execute DB --local --command "SELECT name FROM sqlite_master WHERE type='table'"
```

---

### 4. カラムが存在しないエラー

#### エラー

```
✘ [ERROR] table tasks has no column named description: SQLITE_ERROR
```

#### 原因

スキーマ定義にフィールドを追加したが、マイグレーションを再生成・再適用していない

#### 解決策

**ステップ1: テーブル構造を確認**

```bash
# 現在のテーブル構造を確認
wrangler d1 execute DB --local --command "PRAGMA table_info(tasks)"
```

**ステップ2: スキーマファイルを確認**

```bash
# スキーマファイルに必要なフィールドが定義されているか確認
cat src/db/schema.ts
```

**ステップ3: 新しいマイグレーションを生成**

```bash
# スキーマの変更をマイグレーションファイルに反映
pnpm db:generate
```

**ステップ4: マイグレーションを適用**

```bash
# ローカルD1に適用
pnpm db:migrate:local

# 本番D1に適用（確認してから）
pnpm db:migrate:prod
```

**ステップ5: テーブル構造を再確認**

```bash
# カラムが追加されたことを確認
wrangler d1 execute DB --local --command "PRAGMA table_info(tasks)"
```

---

### 5. NOT NULL制約違反エラー

#### エラー

```
✘ [ERROR] NOT NULL constraint failed: tasks.user_id
```

#### 原因

リレーションを含むスキーマで、必須フィールド（`user_id` など）を指定せずにデータを挿入しようとした

#### 解決策

**必須フィールドを含めてINSERT**:

```bash
# ❌ 誤り（user_idがない）
wrangler d1 execute DB --local --command "
  INSERT INTO tasks (title, description)
  VALUES ('Task', 'Description')
"

# ✅ 正しい（user_idを含める）
wrangler d1 execute DB --local --command "
  INSERT INTO tasks (user_id, title, description)
  VALUES (1, 'Task', 'Description')
"
```

**または、まずユーザーを作成**:

```bash
# 1. ユーザーを作成
wrangler d1 execute DB --local --command "
  INSERT INTO users (name, email)
  VALUES ('User Name', 'user@example.com')
"

# 2. user_id = 1 を使ってタスクを作成
wrangler d1 execute DB --local --command "
  INSERT INTO tasks (user_id, title, description)
  VALUES (1, 'Task', 'Description')
"
```

---

### 6. 型エラー

#### エラー

```typescript
// Property 'DB' does not exist on type 'never'
const db = createDB(c.env.DB);
```

#### 原因

Honoの型定義に `Env` が設定されていない

#### 解決策

1. **型定義を生成**:

```bash
pnpm types:generate
```

2. **Honoで型を使用**:

```typescript
import { Hono } from 'hono';

// ✅ Env型を指定（worker-configuration.d.ts から自動読み込み）
const app = new Hono<{ Bindings: Env }>();

// ❌ 型指定なし
const app = new Hono();  // これだとc.env.DBの型が不明
```

---

### 5. デプロイ後にD1が動作しない

#### エラー

本番環境で `500 Internal Server Error`

#### 原因

- 本番D1にマイグレーションが適用されていない
- `wrangler.jsonc` の `database_id` が間違っている

#### 解決策

```bash
# 本番D1にマイグレーション適用
pnpm db:migrate:prod

# 本番D1のデータ確認
wrangler d1 execute DB --remote --command "SELECT * FROM tasks LIMIT 5"
```

---

## ベストプラクティス

### 1. スキーマ設計

#### ✅ DO: 明示的な型指定

```typescript
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  completed: integer('completed', { mode: 'boolean' })  // booleanとして扱う
    .notNull()
    .default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});
```

#### ❌ DON'T: 曖昧な型

```typescript
export const tasks = sqliteTable('tasks', {
  completed: integer('completed'),  // 0/1なのかbooleanなのか不明確
});
```

---

### 2. マイグレーション管理

#### ✅ DO: スキーマ変更の正しい手順

```bash
# ステップ1: スキーマを変更
# src/db/schema.ts を編集
# 例: descriptionフィールドを追加

# ステップ2: テーブル構造を確認（変更前）
wrangler d1 execute DB --local --command "PRAGMA table_info(tasks)"

# ステップ3: マイグレーションファイルを生成
pnpm db:generate

# ステップ4: 生成されたマイグレーションファイルを確認
cat drizzle/0001_xxx.sql  # ファイル名は異なります

# ステップ5: ローカルD1で確認
pnpm db:migrate:local

# ステップ6: テーブル構造を確認（変更後）
wrangler d1 execute DB --local --command "PRAGMA table_info(tasks)"

# ステップ7: ローカルでテスト
wrangler d1 execute DB --local --command "INSERT INTO tasks (...) VALUES (...)"

# ステップ8: 問題なければ本番適用
pnpm db:migrate:prod
```

#### ❌ DON'T: 直接SQLを実行してスキーマ変更

```bash
# これはNG！マイグレーション履歴が残らない
wrangler d1 execute DB --remote --command "ALTER TABLE tasks ADD COLUMN new_field TEXT"
```

**理由**:
- マイグレーション履歴が残らない
- チーム内で同期が取れなくなる
- 本番環境とローカル環境で差異が発生する
- ロールバックができない

#### スキーマ変更のチェックリスト

- [ ] `src/db/schema.ts` を編集
- [ ] `pnpm db:generate` でマイグレーション生成
- [ ] 生成されたSQLファイルを確認
- [ ] ローカルD1でマイグレーション適用
- [ ] テーブル構造を確認（`PRAGMA table_info`）
- [ ] ローカルでデータ挿入テスト
- [ ] 問題なければ本番適用
- [ ] 本番でもテーブル構造を確認

---

### 3. パフォーマンス最適化

#### インデックスの追加

頻繁に検索するフィールドにはインデックスを追加：

```typescript
import { index } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable(
  'tasks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull(),
    title: text('title').notNull(),
    completed: integer('completed', { mode: 'boolean' }).notNull(),
  },
  (table) => ({
    // userIdにインデックスを追加
    userIdIdx: index('user_id_idx').on(table.userId),

    // 複合インデックス
    completedUserIdx: index('completed_user_idx').on(
      table.completed,
      table.userId
    ),
  })
);
```

#### クエリの最適化

```typescript
// ✅ 必要なフィールドのみ取得
const tasks = await db
  .select({
    id: tasks.id,
    title: tasks.title,
  })
  .from(tasks);

// ❌ 全フィールド取得（不要なデータも含む）
const tasks = await db.select().from(tasks);
```

---

### 4. エラーハンドリング

```typescript
export async function getTasks(c: Context, db: DB) {
  try {
    const allTasks = await db.select().from(tasks);
    return c.json({ success: true, tasks: allTasks });
  } catch (error) {
    // エラーログを出力
    console.error('Error fetching tasks:', error);

    // ユーザーフレンドリーなエラーメッセージ
    return c.json(
      {
        success: false,
        error: 'Failed to fetch tasks',
        // 開発環境でのみ詳細を返す
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : String(error),
        }),
      },
      500
    );
  }
}
```

---

### 5. テスト

#### モックを使ったテスト

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getTasks } from './tasks';

describe('getTasks', () => {
  it('should return tasks', async () => {
    // DBをモック
    const mockDB = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([
            { id: 1, title: 'Test Task', completed: false },
          ]),
        }),
      }),
    };

    const mockContext = {
      json: vi.fn((data) => ({ data })),
    };

    await getTasks(mockContext as any, mockDB as any);

    expect(mockContext.json).toHaveBeenCalledWith({
      success: true,
      tasks: [{ id: 1, title: 'Test Task', completed: false }],
      count: 1,
    });
  });
});
```

---

## まとめ

### セットアップチェックリスト

#### 初期セットアップ

- [ ] パッケージインストール（`drizzle-orm`, `drizzle-kit`, `@cloudflare/workers-types`）
- [ ] `drizzle.config.ts` 作成
- [ ] スキーマ定義（`src/db/schema.ts`）
  - [ ] シンプルなスキーマ or リレーションを含むスキーマを選択
  - [ ] 必要なフィールドを定義（`description` など）
- [ ] 本番D1データベース作成（`wrangler d1 create DB`）
- [ ] `wrangler.jsonc` にバインディング追加
  - [ ] `database_id` を設定
  - [ ] `migrations_dir: "drizzle"` を設定
- [ ] 型定義自動生成（`pnpm types:generate`）
- [ ] マイグレーション生成（`pnpm db:generate`）
- [ ] マイグレーション適用（`pnpm db:migrate:local`）
- [ ] テーブル構造確認（`PRAGMA table_info`）

#### データ投入

- [ ] テストデータ投入
  - [ ] リレーションがある場合：ユーザー作成 → タスク作成
  - [ ] シンプルな場合：タスク直接作成
- [ ] データ確認（`SELECT * FROM tasks`）

#### アプリケーション統合

- [ ] DB接続設定（`src/db/index.ts`）
- [ ] APIハンドラー実装
- [ ] ローカルでテスト（`pnpm dev`）
- [ ] 型安全性確認（TypeScriptエラーがないか）

#### 本番デプロイ

- [ ] 本番D1にマイグレーション適用（`pnpm db:migrate:prod`）
- [ ] 本番環境でテーブル構造確認
- [ ] 本番デプロイ（GitHub Actions or 手動）
- [ ] 本番環境でAPI動作確認

### 次のステップ

1. **認証機能の追加**
   - ユーザー管理
   - JWT認証

2. **リレーションの活用**
   - 1対多、多対多の関係
   - JOIN クエリ

3. **パフォーマンス監視**
   - クエリの最適化
   - インデックスの追加

4. **バックアップ戦略**
   - 定期バックアップ
   - ポイントインタイムリカバリ

---

## 参考リンク

### 公式ドキュメント

- [Cloudflare D1 ドキュメント](https://developers.cloudflare.com/d1/)
- [Drizzle ORM ドキュメント](https://orm.drizzle.team/)
- [Drizzle + D1 ガイド](https://orm.drizzle.team/docs/get-started-d1)

### このプロジェクトの関連ドキュメント

- [GitHub Actions CI/CD セットアップ](./github-actions-cicd-setup.md)
- [GitHub Actions 初学者ガイド](./github-actions-basics.md)

---

**作成日**: 2025-11-17
**最終更新**: 2025-11-17
