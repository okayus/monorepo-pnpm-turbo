# Hono RPC トラブルシューティングガイド

このガイドでは、Hono RPCを使用する際によくある問題とその解決方法を説明します。

## 問題: Frontend で `apiClient` が `unknown` 型になる

### 症状

```typescript
const apiClient = hc<AppType>(API_BASE_URL + '/api');
const response = await apiClient;  // apiClient が unknown 型
```

フロントエンドでHono RPCクライアントを使用しようとすると、`apiClient`が`unknown`型として推論され、型安全性が失われます。

## 根本原因の分析

### 1. 主な問題: クライアントの使用方法が間違っている ⚠️

**問題のコード**:
```typescript
const apiClient = hc<AppType>(API_BASE_URL + '/api');
// ...
const response = await apiClient;  // ❌ 間違い！
```

**何が問題か**:
- `hc()`関数は、ルートに対応するメソッドを持つ型付きクライアントオブジェクトを返します
- このオブジェクトはPromiseではないため、直接awaitすることはできません
- 実際には`.$get()`、`.$post()`などの特定のRPCメソッドを呼び出す必要があります

### 2. ルートパスの構造の問題

```typescript
// バックエンドのルート: /api/tasks
// クライアントのベースURL: API_BASE_URL + '/api'
// 不足: 実際のルートパスとメソッド呼び出し
```

### 3. バックエンドのルート構造の問題

**現在の構造** (型推論が弱い):
```typescript
app.get('/api/tasks', validator, handler);  // 単独のルート定義
```

**推奨される構造** (型推論が強い):
```typescript
const app = new Hono()
  .get('/', handler)
  .post('/', handler)
  .get('/:id', handler);
```

Hono RPCガイドによると、型推論を最適化するには、メソッドチェーンを使用してルートを定義する必要があります。

### 4. 型エクスポートの問題

サブルーターを使用する場合、正しい型をエクスポートする必要があります。

**現在**:
```typescript
export type AppType = typeof app;  // ベースアプリをエクスポート
```

**サブルーター使用時の推奨**:
```typescript
const routes = app.route('/api', apiRoutes);
export type AppType = typeof routes;  // ルートをエクスポート
```

## 解決方法

### バックエンドの正しい構造

#### パターン1: サブルーターを使用（推奨）

```typescript
// packages/backend/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createDB } from './db';
import { getTaskList } from './handlers/taskList';

const app = new Hono();

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

// ルートルート
app.get('/', (c) => {
  return c.json({ message: 'Hello, World!' });
});

// APIルート - メソッドチェーンで型推論を改善
const apiRoutes = new Hono()
  .get('/tasks', async (c) => {
    const db = createDB(c.env.DB);
    return getTaskList(db, c);
  });
  // ここにメソッドチェーンでさらにルートを追加
  // .post('/tasks', handler)
  // .get('/tasks/:id', handler)
  // .put('/tasks/:id', handler)
  // .delete('/tasks/:id', handler)

// /apiプレフィックスでAPIルートをマウント
const routes = app.route('/api', apiRoutes);

// ベースアプリではなく、ルートの型をエクスポート
export type AppType = typeof routes;
export default app;
```

#### パターン2: シンプルな構造（小規模アプリ向け）

```typescript
// packages/backend/src/index.ts
const app = new Hono()
  .use('/*', cors({ /* ... */ }))
  .get('/', (c) => c.json({ message: 'Hello, World!' }))
  .get('/api/tasks', async (c) => {
    const db = createDB(c.env.DB);
    return getTaskList(db, c);
  })
  .post('/api/tasks', async (c) => {
    // タスク作成ハンドラー
  });

export type AppType = typeof app;
export default app;
```

### フロントエンドの正しい使用方法

```typescript
// packages/frontend/src/App.tsx
import { useState, useEffect } from 'react';
import { hc } from 'hono/client';
import { AppType } from '../../backend/src/index';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://monorepo-pnpm-turbo-backend.toshiaki-mukai-9981.workers.dev';

function App() {
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);

      // RPCクライアントを作成（ベースURLのみ、/apiサフィックスは不要）
      const client = hc<AppType>(API_BASE_URL);

      // .$get()メソッドで特定のルートを呼び出す
      // パスはバックエンドのルートと一致: /api/tasks → client.api.tasks
      const response = await client.api.tasks.$get();

      // レスポンスステータスを確認
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // JSONレスポンスをパース - 型は自動推論される！
      const data = await response.json();

      setMessage(`Fetched ${data.tasks.length} tasks from backend.`);
    } catch (err) {
      setError(`Failed to fetch tasks from backend.\n${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>🚀 Monorepo PNPM Turbo - Frontend</h1>
      <div style={{ marginTop: '2rem' }}>
        <h2>Backend API Response:</h2>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {message && (
          <p style={{ fontSize: '1.5rem', color: 'green' }}>{message}</p>
        )}
      </div>
    </div>
  );
}

export default App;
```

## Hono RPC メソッド呼び出しパターン

### GET リクエスト

```typescript
// ルート: /api/tasks
const response = await client.api.tasks.$get();
const data = await response.json();
```

### パスパラメータ付きGET

```typescript
// ルート: /api/tasks/:id
const response = await client.api.tasks[':id'].$get({
  param: { id: '123' }
});
const data = await response.json();
```

### クエリパラメータ付きGET

```typescript
// ルート: /api/tasks?status=active&page=1
const response = await client.api.tasks.$get({
  query: {
    status: 'active',
    page: '1'
  }
});
const data = await response.json();
```

### POST リクエスト（JSON）

```typescript
// ルート: /api/tasks
const response = await client.api.tasks.$post({
  json: {
    title: 'New Task',
    description: 'Task description'
  }
});
const data = await response.json();
```

### POST リクエスト（フォームデータ）

```typescript
// ルート: /api/tasks
const response = await client.api.tasks.$post({
  form: {
    title: 'New Task',
    description: 'Task description'
  }
});
const data = await response.json();
```

### PUT リクエスト

```typescript
// ルート: /api/tasks/:id
const response = await client.api.tasks[':id'].$put({
  param: { id: '123' },
  json: {
    title: 'Updated Task',
    completed: true
  }
});
const data = await response.json();
```

### DELETE リクエスト

```typescript
// ルート: /api/tasks/:id
const response = await client.api.tasks[':id'].$delete({
  param: { id: '123' }
});
```

## パスマッピングの理解

バックエンドのルートがフロントエンドのRPC呼び出しにどのようにマッピングされるかを理解することが重要です。

| バックエンドルート | フロントエンド RPC 呼び出し |
|-------------------|---------------------------|
| `/api/tasks` | `client.api.tasks.$get()` |
| `/api/tasks/:id` | `client.api.tasks[':id'].$get({ param: { id } })` |
| `/api/users` | `client.api.users.$get()` |
| `/api/users/:userId/tasks` | `client.api.users[':userId'].tasks.$get({ param: { userId } })` |
| `/tasks` | `client.tasks.$get()` |

**ルール**:
- 各パスセグメント（`/`で区切られた部分）がプロパティアクセスになる
- HTTPメソッドが`.$get()`、`.$post()`、`.$put()`、`.$delete()`になる
- パスパラメータ（`:id`など）は`[':id']`として配列アクセスで指定

## TypeScript プロジェクト参照の設定（オプション、推奨）

モノレポで複数のパッケージ間でTypeScriptの型を共有する場合、プロジェクト参照を設定すると型推論が改善されます。

### ルート tsconfig.json

```json
{
  "files": [],
  "references": [
    { "path": "./packages/frontend" },
    { "path": "./packages/backend" }
  ]
}
```

### Frontend tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "composite": true  // 追加
  },
  "include": ["src"],
  "references": [  // 追加
    { "path": "../backend" }
  ]
}
```

### Backend tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "types": ["@types/node", "@cloudflare/workers-types"],
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "noEmit": true,
    "composite": true,  // 追加
    "declaration": true,  // 追加
    "declarationMap": true  // 追加
  },
  "include": ["src/**/*", "worker-configuration.d.ts"],
  "exclude": ["node_modules", "dist", ".wrangler"]
}
```

## パフォーマンス最適化（大規模アプリ向け）

大規模なアプリケーションでは、型のインスタンス化が多くなりIDEが遅くなる可能性があります。以下の方法で最適化できます。

### プリコンパイル済みクライアントラッパーの作成

```typescript
// packages/frontend/src/lib/api-client.ts
import { hc } from 'hono/client';
import type { AppType } from '../../../backend/src/index';

// コンパイル時に型を事前計算
export type Client = ReturnType<typeof hc<AppType>>;

export const createApiClient = (...args: Parameters<typeof hc>): Client =>
  hc<AppType>(...args);
```

**使用方法**:

```typescript
// packages/frontend/src/App.tsx
import { createApiClient } from './lib/api-client';

const client = createApiClient(API_BASE_URL);
const response = await client.api.tasks.$get();
```

この方法の利点:
- TypeScriptコンパイラが一度だけ型をインスタンス化
- IDEのパフォーマンスが向上
- 複数のファイルでクライアントを使用する場合に特に効果的

## よくある問題とトラブルシューティング

### 1. `Type instantiation is excessively deep and possibly infinite`

**原因**: フロントエンドとバックエンドでHonoのバージョンが異なる

**解決方法**: 両方のpackage.jsonで同じバージョンを使用していることを確認
```bash
# バージョンを確認
pnpm list hono

# 同じバージョンに更新
pnpm --filter=frontend add hono@4.10.6
pnpm --filter=backend add hono@4.10.6
```

### 2. `Property 'api' does not exist on type`

この問題は、バックエンドで間違った型をエクスポートしていることが原因です。

**症状**:
```typescript
const client = hc<AppType>(API_BASE_URL);
const response = await client.api.tasks.$get();
// ❌ Error: Property 'api' does not exist on type
```

**問題のコード**（バックエンド）:
```typescript
const apiRoutes = new Hono().get('/tasks', handler);
app.route('/api', apiRoutes);

// ❌ 間違い - apiRoutes は /api プレフィックスを知らない
export type AppType = typeof apiRoutes;
```

**原因**:
- `apiRoutes`には`/tasks`ルートのみが含まれる
- `app.route('/api', apiRoutes)`で`/api`プレフィックスを付けているが、これは`app`に追加されるだけ
- `typeof apiRoutes`には`/api`プレフィックスが含まれない
- 結果として、型は`/tasks`しか知らず、`/api/tasks`を知らない

**正しい解決方法**（推奨）:
```typescript
// ✅ 正しい - routes はフルパス構造を含む
const apiRoutes = new Hono().get('/tasks', handler);
const routes = app.route('/api', apiRoutes);

// ✅ routes の型をエクスポート
export type AppType = typeof routes;
```

**フロントエンド**:
```typescript
// ✅ 正しい - ベースURLのみ（/api サフィックスなし）
const client = hc<AppType>(API_BASE_URL);

// ✅ 正しい - client.api.tasks が使用可能
const response = await client.api.tasks.$get();
```

**代替解決方法**（非推奨）:
`typeof apiRoutes`のままにする場合は、フロントエンドを調整:
```typescript
// ベースURLに /api を追加
const client = hc<AppType>(API_BASE_URL + '/api');

// client.tasks を使用（api プレフィックスなし）
const response = await client.tasks.$get();
```

この方法は動作しますが、型システムに`/api`が含まれないため、セマンティックな明確さが失われます。

**重要なポイント**:
- ✅ `app.route()`の**戻り値**を変数に保存し、その型をエクスポートする
- ✅ エクスポートする型は、クライアントが使用する完全なルート構造を含む必要がある
- ✅ Hono RPC公式ガイドでも`const routes = app.route(); export type AppType = typeof routes;`パターンを推奨

### 3. `'data' is of type 'unknown'`

**症状**:
```typescript
const response = await client.api.tasks.$get();
const data = await response.json();
// ❌ Error: 'data' is of type 'unknown'.ts(18046)
setMessage(`Fetched ${data.tasks.length} tasks`);
```

**原因**:
この問題は通常、上記の「Property 'api' does not exist on type」問題と関連しています。

1. **バックエンドの型エクスポートが間違っている**
   - `typeof apiRoutes`をエクスポートしているが、`typeof routes`をエクスポートすべき
   - 型推論の連鎖が壊れている

2. **TypeScriptのデフォルト動作**
   - `Response.json()`は`Promise<any>`を返す
   - strictモードでは`any`が`unknown`として扱われる
   - Hono RPCの型推論が機能していない

**解決方法**:

#### 方法1: バックエンドの型エクスポートを修正（推奨）

バックエンドを修正すれば、型推論が自動的に機能します:

**バックエンド**:
```typescript
const routes = app.route('/api', apiRoutes);
export type AppType = typeof routes;  // ✅ 正しい
```

**フロントエンド**:
```typescript
const client = hc<AppType>(API_BASE_URL);
const response = await client.api.tasks.$get();
const data = await response.json();  // ✅ 自動的に型推論される！

// data.tasks は正しく型付けされる
setMessage(`Fetched ${data.tasks.length} tasks from backend.`);
```

型エクスポートが正しければ、Hono RPCは自動的にレスポンス型を推論します。手動で型を指定する必要はありません。

#### 方法2: InferResponseType を使用（明示的な型付けが必要な場合）

```typescript
import type { InferResponseType } from 'hono/client';

const client = hc<AppType>(API_BASE_URL);

// レスポンス型を明示的に推論
type TasksResponse = InferResponseType<typeof client.api.tasks.$get>;

const response = await client.api.tasks.$get();
if (response.ok) {
  const data: TasksResponse = await response.json();
  setMessage(`Fetched ${data.tasks.length} tasks from backend.`);
}
```

#### 方法3: 手動で型アサーション（最終手段）

```typescript
interface TasksResponse {
  tasks: Array<{
    id: number;
    userId: number;
    title: string;
    description: string | null;
    completed: boolean;
    createdAt: string;
  }>;
}

const data = await response.json() as TasksResponse;
setMessage(`Fetched ${data.tasks.length} tasks from backend.`);
```

**重要**: 方法3は型安全性が低いため、できるだけ方法1（バックエンド修正）を使用してください。

**検証方法**:

正しく設定されていれば、IDEで以下が確認できます:
1. `client.api.`と入力すると`tasks`が表示される
2. `client.api.tasks.`と入力すると`$get`、`$post`などが表示される
3. `data.`と入力すると`tasks`プロパティが表示される
4. `data.tasks[0].`と入力するとタスクのプロパティ（`title`、`completed`など）が表示される

### 4. `await apiClient` で型エラー

**原因**: クライアントオブジェクトを直接awaitしようとしている

**解決方法**: 特定のRPCメソッドを呼び出す
```typescript
// ❌ 間違い
const response = await apiClient;

// ✅ 正しい
const response = await apiClient.api.tasks.$get();
```

### 5. CORS エラー

**原因**: バックエンドのCORS設定にフロントエンドのオリジンが含まれていない

**解決方法**: バックエンドのCORS設定を確認
```typescript
cors({
  origin: [
    'http://localhost:5173',  // 開発環境
    'https://your-frontend.pages.dev',  // 本番環境
  ],
})
```

### 6. 404 エラー

404エラーにはいくつかの原因があります。

#### 原因1: ベースURLとルートパスの組み合わせが間違っている

**解決方法**:
- ベースURL: `http://localhost:8787`（パスサフィックスなし）
- バックエンドルート: `/api/tasks`
- フロントエンド呼び出し: `client.api.tasks.$get()`
- 最終的なURL: `http://localhost:8787/api/tasks` ✅

**間違った例**:
- ベースURL: `http://localhost:8787/api`
- バックエンドルート: `/api/tasks`
- 最終的なURL: `http://localhost:8787/api/api/tasks` ❌

#### 原因2: ルートが登録されていない（最もよくある原因）⚠️

**症状**:
```
GET http://localhost:8787/api/tasks 404 (Not Found)
```

**問題のコード**:
```typescript
// ルートは作成されているが...
const apiRoutes = new Hono().get('/tasks', handler);

// メインアプリに登録されていない！
export type AppType = typeof apiRoutes;
export default app;  // app には apiRoutes が含まれていない
```

**原因**:
- `apiRoutes`という別のHonoインスタンスを作成したが、メインの`app`に登録（マウント）していない
- `export default app`でエクスポートしているが、`app`には`apiRoutes`が含まれていない
- 結果として、`/api/tasks`ルートがサーバーに存在しない

**解決方法**:
```typescript
// ✅ 正しい実装
const app = new Hono();

app.get('/', (c) => {
  return c.json({ message: 'Hello, World!' });
});

// APIルートを作成
const apiRoutes = new Hono().get('/tasks', handler);

// ⚠️ 重要: メインアプリに登録する
app.route('/api', apiRoutes);

export type AppType = typeof apiRoutes;
export default app;
```

**確認方法**:
```bash
# バックエンドサーバーを再起動
cd packages/backend
pnpm dev

# curlでテスト
curl http://localhost:8787/api/tasks

# 正常に動作すれば {"tasks": [...]} が返る
```

#### 原因3: 不適切なバリデーター設定

**症状**:
GETリクエストで404エラー、またはバリデーションエラー

**問題のコード**:
```typescript
app.get(
  '/api/tasks',
  zValidator('form', z.object({ /* ... */ })),  // ❌ GETで'form'は不適切
  handler
);
```

**原因**:
- GETリクエストにはリクエストボディがないため、`'form'`や`'json'`バリデーターは使用できない
- GETリクエストのパラメータは`'query'`または`'param'`で検証する
- 不適切なバリデーター設定により、リクエストが拒否される

**解決方法**:
```typescript
// パラメータが不要な場合 - バリデーター削除
app.get('/api/tasks', handler);

// クエリパラメータがある場合
app.get(
  '/api/tasks',
  zValidator('query', z.object({
    status: z.enum(['pending', 'completed']).optional(),
  })),
  handler
);
```

### 7. zValidator の正しい使い方

`@hono/zod-validator`を使う際は、リクエストの種類に応じて正しいバリデータータイプを選択する必要があります。

#### GETリクエスト - クエリパラメータ

```typescript
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

// URL: GET /api/tasks?status=pending&limit=10
app.get(
  '/tasks',
  zValidator('query', z.object({
    status: z.enum(['pending', 'completed']).optional(),
    limit: z.string().transform(Number).optional(),
    page: z.string().transform(Number).optional(),
  })),
  async (c) => {
    const { status, limit, page } = c.req.valid('query');
    // status, limit, page を使用してクエリ実行
  }
);
```

**フロントエンドでの呼び出し**:
```typescript
const response = await client.api.tasks.$get({
  query: {
    status: 'pending',
    limit: '10',
    page: '1'
  }
});
```

#### POSTリクエスト - JSONボディ

```typescript
// Content-Type: application/json
app.post(
  '/tasks',
  zValidator('json', z.object({
    title: z.string().min(1).max(100),
    description: z.string().optional(),
    dueDate: z.string().datetime().optional(),
  })),
  async (c) => {
    const { title, description, dueDate } = c.req.valid('json');
    // データベースに保存
  }
);
```

**フロントエンドでの呼び出し**:
```typescript
const response = await client.api.tasks.$post({
  json: {
    title: 'New Task',
    description: 'Task description',
    dueDate: '2025-12-31T23:59:59Z'
  }
});
```

#### POSTリクエスト - フォームデータ

```typescript
// Content-Type: application/x-www-form-urlencoded
app.post(
  '/tasks',
  zValidator('form', z.object({
    title: z.string().min(1),
    description: z.string().optional(),
  })),
  async (c) => {
    const { title, description } = c.req.valid('form');
    // データベースに保存
  }
);
```

**フロントエンドでの呼び出し**:
```typescript
const response = await client.api.tasks.$post({
  form: {
    title: 'New Task',
    description: 'Task description'
  }
});
```

#### パスパラメータ

```typescript
// URL: GET /api/tasks/123
app.get(
  '/tasks/:id',
  zValidator('param', z.object({
    id: z.string().uuid(),
    // または
    // id: z.string().transform(Number),
  })),
  async (c) => {
    const { id } = c.req.valid('param');
    // idを使用してデータ取得
  }
);
```

**フロントエンドでの呼び出し**:
```typescript
const response = await client.api.tasks[':id'].$get({
  param: { id: '123' }
});
```

#### 複数のバリデーターを組み合わせ

```typescript
// URL: PUT /api/tasks/123?notify=true
app.put(
  '/tasks/:id',
  zValidator('param', z.object({
    id: z.string().uuid(),
  })),
  zValidator('query', z.object({
    notify: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  })),
  zValidator('json', z.object({
    title: z.string().min(1).optional(),
    completed: z.boolean().optional(),
  })),
  async (c) => {
    const { id } = c.req.valid('param');
    const { notify } = c.req.valid('query');
    const { title, completed } = c.req.valid('json');
    // データ更新
  }
);
```

**フロントエンドでの呼び出し**:
```typescript
const response = await client.api.tasks[':id'].$put({
  param: { id: '123' },
  query: { notify: 'true' },
  json: {
    title: 'Updated Task',
    completed: true
  }
});
```

#### バリデータータイプの選択ガイド

| リクエスト種類 | 使用するバリデーター | 例 |
|--------------|-------------------|---|
| GET クエリパラメータ | `'query'` | `?status=pending&page=1` |
| POST JSONボディ | `'json'` | `Content-Type: application/json` |
| POST フォームデータ | `'form'` | `Content-Type: application/x-www-form-urlencoded` |
| パスパラメータ | `'param'` | `/tasks/:id` の `:id` 部分 |
| リクエストヘッダー | `'header'` | `Authorization`, `Content-Type` など |
| Cookie | `'cookie'` | Cookie検証 |

**重要な注意点**:
- ❌ GETリクエストで`'form'`や`'json'`を使用しない（リクエストボディがないため）
- ❌ POSTリクエストで`'query'`を使用しない（通常はボディでデータを送る）
- ✅ リクエストの性質に合った適切なバリデータータイプを選択する

### 8. Hono RPC の型推論が機能しない（`response.json()` が `Promise<unknown>` になる）

最も一般的で、理解が難しい問題の一つです。バックエンドのハンドラーで正しく型付けしているのに、フロントエンドで型が失われる理由を詳しく説明します。

#### 症状

**バックエンド**のハンドラーは正しく型付けされている:
```typescript
export const getTaskList = async (
  db: DB,
  c: Context<{ Bindings: Env }>
): Promise<Response> => {
  const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  return c.json({ tasks: allTasks }, 200);
  // ↑ TypeScriptは正しい型を認識している:
  // JSONRespondReturn<{ tasks: Task[] }, 200>
};
```

**フロントエンド**では型が失われる:
```typescript
const client = hc<AppType>(API_BASE_URL);
const response = await client.api.tasks.$get();
const data = await response.json();  // ❌ Promise<unknown>
setMessage(`Fetched ${data.tasks.length} tasks`);  // ❌ Error: 'data' is of type 'unknown'
```

#### なぜ型が失われるのか？

##### 1. **Hono RPC の型推論の仕組み**

Hono RPCは「ファントム型（Phantom Types）」という技術を使用しています:

```typescript
// Honoの内部型定義（簡略版）
interface TypedResponse<T = unknown, U extends StatusCode = StatusCode, F extends ResponseFormat = ResponseFormat> extends Response {
  _data: T;      // 実際には存在しないが、型情報を持つ
  _status: U;    // ステータスコードの型
  _format: F;    // レスポンス形式（'json', 'text' など）
}
```

これらの`_data`、`_status`、`_format`プロパティは：
- **実行時には存在しない**（ランタイムでは通常のResponseオブジェクト）
- **コンパイル時のみ存在**し、型情報を運ぶ
- **c.json()**が返す型は`Response & TypedResponse<T, U, 'json'>`

メソッドチェーンで型が累積:
```typescript
const app = new Hono<{ Bindings: Env }>()
  .get('/tasks', (c) => c.json({ tasks: [...] }, 200));
//    ↑ この時点でSchemaに { '/tasks': { $get: { output: { tasks: Task[] }, status: 200 } } } が追加される
```

クライアント側での型抽出:
```typescript
const client = hc<AppType>(API_BASE_URL);
// ↑ AppTypeのSchemaから型情報を抽出
const response = await client.api.tasks.$get();
// ↑ Schemaから { output: { tasks: Task[] }, status: 200 } を取得
const data = await response.json();
// ↑ Schemaの output 型が data に反映される
```

##### 2. **問題のあるコードパターン**

**パターン1: Honoインスタンスに環境型がない**

```typescript
// ❌ 間違い
const app = new Hono()  // BlankEnv として型付けされる
  .get('/api/tasks', async (c: Context<{ Bindings: Env }>) => {
    //                        ↑ インライン型アノテーションがapp型と不一致
    const db = createDB(c.env.DB);
    return getTaskList(db, c);
  });
```

問題点:
- `new Hono()`は`Hono<BlankEnv, BlankSchema, '/'>`として型付けされる
- ハンドラーの`c: Context<{ Bindings: Env }>`がapp型と一致しない
- 型不一致により、型推論の連鎖が壊れる

**パターン2: ハンドラーの戻り値型を明示的に指定**

```typescript
// ❌ 間違い
export const getTaskList = async (
  db: DB,
  c: Context<{ Bindings: Env }>
): Promise<Response> => {  // ❌ 明示的に Promise<Response> と指定
  return c.json({ tasks: allTasks }, 200);
};
```

問題点:
- `Promise<Response>`と明示すると、`TypedResponse`のファントム型が失われる
- `c.json()`の実際の戻り値は`Response & TypedResponse<{tasks: Task[]}, 200, 'json'>`
- しかし関数の戻り値型が`Promise<Response>`なので、TypeScriptは`Response`部分のみ保持
- `TypedResponse<T, U, F>`の型情報が消失

**パターン3: インライン型アノテーション**

```typescript
// ❌ 間違い
.get('/api/tasks', async (c: Context<{ Bindings: Env }>) => {
  //                        ↑ 明示的な型指定が推論を妨げる
```

問題点:
- Honoは`.get()`の引数の型を推論して、Schemaに追加する
- インライン型アノテーションがあると、TypeScriptの推論が正しく機能しない

#### 正しい解決方法

##### 解決方法1: Honoインスタンスに環境型を指定（推奨）

```typescript
// ✅ 正しい
const app = new Hono<{ Bindings: Env }>()  // 環境型を指定
  .use('/*', cors({...}))
  .get('/', (c) => {
    return c.json({ message: 'Hello, World!' });
  })
  .get('/api/tasks', async (c) => {  // インライン型アノテーションを削除
    const db = createDB(c.env.DB);
    const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    return c.json({ tasks: allTasks }, 200);  // 型推論が機能する
  });

export type AppType = typeof app;
```

**なぜこれが機能するのか**:
- `new Hono<{ Bindings: Env }>()`により、すべてのハンドラーが正しい環境型を継承
- インライン型アノテーションを削除し、TypeScriptに型を推論させる
- `c.json()`の戻り値型`TypedResponse<T, U, F>`が保持される
- メソッドチェーンがSchemaに正しく型を累積

##### 解決方法2: ハンドラーの戻り値型を削除

```typescript
// ✅ 正しい
export const getTaskList = async (
  db: DB,
  c: Context<{ Bindings: Env }>
) => {  // 戻り値型を指定しない（推論させる）
  const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  return c.json({ tasks: allTasks }, 200);
};

// backend/src/index.ts
const app = new Hono<{ Bindings: Env }>()
  .get('/api/tasks', async (c) => {
    const db = createDB(c.env.DB);
    return getTaskList(db, c);  // 推論された型が正しく伝播
  });
```

**なぜこれが機能するのか**:
- `getTaskList`の戻り値型が推論により`Response & TypedResponse<...>`になる
- ファントム型が保持される
- 型情報が呼び出し元に正しく伝播

##### 解決方法3: インラインハンドラー（最も推奨）

```typescript
// ✅ 最も推奨
const app = new Hono<{ Bindings: Env }>()
  .use('/*', cors({...}))
  .get('/', (c) => {
    return c.json({ message: 'Hello, World!' });
  })
  .get('/api/tasks', async (c) => {
    const db = createDB(c.env.DB);
    const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    return c.json({ tasks: allTasks }, 200);
  });

export type AppType = typeof app;
```

**なぜこれが最も推奨なのか**:
- 型推論の連鎖に中間関数がない
- TypeScriptが直接`c.json()`の戻り値型を認識
- 最もシンプルで、型安全性が最も高い
- Hono RPC公式ドキュメントでも推奨されているパターン

#### フロントエンドでの結果

正しく設定すれば、型推論が自動的に機能します:

```typescript
const client = hc<AppType>(API_BASE_URL);
const response = await client.api.tasks.$get();
const data = await response.json();  // ✅ 型が自動推論される！

// TypeScriptが認識する型:
// data: {
//   tasks: {
//     id: number;
//     userId: number;
//     title: string;
//     description: string | null;
//     completed: boolean;
//     createdAt: string;
//   }[]
// }

setMessage(`Fetched ${data.tasks.length} tasks from backend.`);  // ✅ 型エラーなし
```

#### 重要な洞察

1. **Honoはファントム型を使用**
   - `TypedResponse<T, U, F>`には`_data`、`_status`、`_format`という実際には存在しないプロパティがある
   - これらはコンパイル時のみ存在し、型情報を運ぶ
   - 実行時は通常の`Response`オブジェクト

2. **メソッドチェーンがSchemaを累積**
   - `.get()`、`.post()`などは新しい`Hono`インスタンスを返す
   - 各呼び出しで`Schema`型パラメータが更新される
   - 型: `Hono<E, Schema & NewRoute, BasePath>`

3. **環境型は一致する必要がある**
   - Appの環境型とすべてのハンドラーのcontext型が一致する必要がある
   - 不一致があると型推論の連鎖が壊れる

4. **明示的な戻り値型は推論を壊す**
   - `Promise<Response>`と明示すると`TypedResponse`が失われる
   - TypeScriptに型を推論させる（戻り値型を指定しない）

5. **クライアントはSchemaから型を抽出**
   - `hc<AppType>`は`AppType`の`Schema`型パラメータを使用
   - 各ルートの`input`と`output`型を提供
   - `response.json()`の戻り値型は`Schema`の`output`から推論

#### よくある落とし穴

1. ❌ Honoインスタンスに型を指定しない: `new Hono()` → `new Hono<{ Bindings: Env }>()`
2. ❌ インライン型アノテーション: `(c: Context<...>)` → `(c)` （推論させる）
3. ❌ ハンドラーの明示的な戻り値型: `Promise<Response>` → 型指定を削除
4. ❌ App型とハンドラー型の環境不一致
5. ❌ 別関数のハンドラーに明示的な型を指定（代わりにインラインハンドラーを使用）

#### トラブルシューティングチェックリスト

RPC型推論が機能しない場合、以下を確認:

- [ ] Honoインスタンスに環境型を指定しているか？ `new Hono<{ Bindings: Env }>()`
- [ ] ハンドラーパラメータにインライン型アノテーションを使っていないか？
- [ ] ハンドラーの戻り値型を明示的に指定していないか？（推論させる）
- [ ] `c.json()`を直接returnしているか？（ラッパー関数で明示的型を使っていないか）
- [ ] `AppType`を正しくエクスポートしているか？ `typeof app`
- [ ] フロントエンドで正しい`AppType`をインポートしているか？

#### あなたの認識は正しい！

> クライアントでもtasksは配列型になると思っている

**あなたの認識は100%正しいです！** Hono RPCは確実にクライアント側で型情報を提供します。

問題は実装方法にあります：
- ✅ Honoに環境型を指定
- ✅ 明示的な戻り値型を削除
- ✅ TypeScriptに推論させる

これらを修正すれば、期待通りに型推論が機能します。

## 動作確認

正しく実装できたら、以下を確認してください:

### 1. 型推論の確認

```typescript
const client = hc<AppType>(API_BASE_URL);
const response = await client.api.tasks.$get();
const data = await response.json();

// TypeScriptが以下を認識するはず:
// - data.tasks が存在し、配列である
// - 各タスクにスキーマで定義されたプロパティがある
// - response.ok, response.status などが適切に型付けされている
```

### 2. IDEでのオートコンプリート

- `client.`を入力すると、利用可能なルート（`api`など）が表示される
- `client.api.`を入力すると、利用可能なエンドポイント（`tasks`など）が表示される
- `client.api.tasks.`を入力すると、利用可能なメソッド（`$get`、`$post`など）が表示される

### 3. 実際のリクエスト

```bash
# バックエンドを起動
cd packages/backend
pnpm dev

# 別のターミナルでフロントエンドを起動
cd packages/frontend
pnpm dev

# ブラウザでhttp://localhost:5173を開く
# コンソールでエラーがないことを確認
# タスクが正しく取得されることを確認
```

## まとめ

Hono RPCを正しく使用するための重要なポイント:

1. ✅ クライアントオブジェクトを直接awaitしない
2. ✅ `.$get()`、`.$post()`などの特定のRPCメソッドを呼び出す
3. ✅ バックエンドでメソッドチェーンを使用してルートを定義
4. ✅ サブルーター使用時は`typeof routes`をエクスポート
5. ✅ ベースURLにはパスサフィックスを含めない
6. ✅ フロントエンドとバックエンドで同じHonoバージョンを使用
7. ✅ パスマッピングを理解する（`/api/tasks` → `client.api.tasks`）

これらのポイントを守れば、Hono RPCの完全な型安全性とオートコンプリートを活用できます！
