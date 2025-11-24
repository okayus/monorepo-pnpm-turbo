# TypeScript Project References ガイド

モノレポでのフロントエンド型チェックエラーの原因と解決方法

## 問題の概要

フロントエンドで `pnpm typecheck` を実行すると、バックエンドのファイルに関するTypeScriptエラーが発生します。

### エラー内容

```bash
$ cd packages/frontend && pnpm typecheck

../backend/src/db/index.ts:10:30 - error TS2552: Cannot find name 'D1Database'.
../backend/src/handlers/taskList.ts:6:66 - error TS2304: Cannot find name 'Env'.
../backend/src/index.ts:6:34 - error TS2304: Cannot find name 'Env'.
../backend/src/index.ts:24:52 - error TS2304: Cannot find name 'Env'.

Found 4 errors in 3 files.
```

### 不可解な点

**バックエンドの型チェックは成功する**:

```bash
$ cd packages/backend && pnpm typecheck
✅ エラーなし
```

**なぜフロントエンドの型チェックでバックエンドのエラーが出るのか？**

---

## 原因の詳細分析

### 1. フロントエンドがバックエンドのソースコードを直接インポートしている

**問題のコード** (`packages/frontend/src/App.tsx`):

```typescript
import type { AppType } from '../../backend/src/index';
```

このインポートにより、TypeScriptはバックエンドの全ソースファイルを型チェックする必要があります：

```
App.tsx
  ↓ import
backend/src/index.ts
  ↓ import
backend/src/db/index.ts
backend/src/handlers/taskList.ts
  ↓ uses
D1Database (from @cloudflare/workers-types)
Env (from worker-configuration.d.ts)
```

### 2. フロントエンドのTypeScript環境にバックエンドの型定義がない

**バックエンドの tsconfig.json** (型定義がある):

```json
{
  "compilerOptions": {
    "types": ["@types/node", "@cloudflare/workers-types"]  // ← D1Database を提供
  },
  "include": ["src/**/*", "worker-configuration.d.ts"]  // ← Env を提供
}
```

**フロントエンドの tsconfig.json** (型定義がない):

```json
{
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    // "types" 指定なし → @cloudflare/workers-types がない
  },
  "include": ["src"]  // ← worker-configuration.d.ts が含まれない
}
```

### 3. 型の出所

#### `D1Database` 型

**定義場所**: `@cloudflare/workers-types` パッケージ

```typescript
// node_modules/@cloudflare/workers-types/index.d.ts
declare abstract class D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}
```

**問題**:
- `@cloudflare/workers-types` はバックエンドの `devDependencies` にのみ存在
- フロントエンドはこのパッケージをインストールしていない
- フロントエンドのTypeScriptコンパイラは `D1Database` を解決できない

#### `Env` 型

**定義場所**: `packages/backend/worker-configuration.d.ts`

```typescript
// wrangler types コマンドで生成される
interface Env {
  DB: D1Database;
}
```

**生成方法**:

```bash
cd packages/backend
pnpm types:generate  # wrangler types を実行
```

**問題**:
- このファイルはバックエンドのルートディレクトリに存在
- フロントエンドの `tsconfig.json` の `include` に含まれない
- フロントエンドのTypeScriptコンパイラは `Env` を解決できない

### 4. なぜバックエンドの型チェックは成功するのか？

バックエンドで型チェックを実行すると：

```bash
cd packages/backend
pnpm typecheck  # tsc --noEmit
```

**バックエンドの TypeScript 環境**:
- ✅ `@cloudflare/workers-types` がインストールされている
- ✅ `tsconfig.json` の `types` に指定されている
- ✅ `worker-configuration.d.ts` が `include` に含まれている
- ✅ すべての型定義にアクセス可能

**フロントエンドの TypeScript 環境**:
- ❌ `@cloudflare/workers-types` がインストールされていない
- ❌ `tsconfig.json` に型の指定がない
- ❌ `worker-configuration.d.ts` にアクセスできない
- ❌ バックエンドのソースをチェックする際、型定義が見つからない

### 5. 問題の本質

**モノレポでの直接的なソースコード参照の問題**:

```
フロントエンド TypeScript コンパイラ
  ↓
import '../../backend/src/index'
  ↓
バックエンドのソースファイルを解析
  ↓
D1Database や Env が必要
  ↓
フロントエンドの環境に型定義がない
  ↓
❌ 型エラー
```

---

## 解決方法の選択肢

### オプション1: フロントエンドにバックエンドの依存関係を追加（非推奨）

```bash
cd packages/frontend
pnpm add -D @cloudflare/workers-types
```

```json
// packages/frontend/tsconfig.json
{
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src", "../backend/worker-configuration.d.ts"]
}
```

**問題点**:
- ❌ フロントエンドがバックエンドのインフラに依存
- ❌ 関心の分離が破られる
- ❌ 依存関係の重複
- ❌ Cloudflare Workers の型がブラウザ環境に混入

### オプション2: ビルド済みファイルからインポート（部分的に有効）

```json
// packages/backend/package.json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

```typescript
// packages/frontend/src/App.tsx
import type { AppType } from 'backend';  // dist からインポート
```

**問題点**:
- ❌ 常にビルドが必要
- ❌ 開発体験が悪い（バックエンド変更のたびにビルド）
- ⚠️ wrangler との互換性に注意が必要

### オプション3: TypeScript Project References（推奨）✅

TypeScript公式のモノレポソリューション。

**動作原理**:
1. バックエンドをビルドして型定義ファイル (`.d.ts`) を生成
2. フロントエンドはコンパイル済み型定義を使用
3. バックエンドのソースファイルを直接チェックしない

---

## 推奨される解決方法: TypeScript Project References

### ステップ1: ルート tsconfig.json を作成

**ファイル**: `tsconfig.json` (プロジェクトルート)

```json
{
  "files": [],
  "references": [
    { "path": "./packages/backend" },
    { "path": "./packages/frontend" }
  ]
}
```

**役割**:
- プロジェクト間の依存関係を定義
- ビルド順序を制御
- TypeScriptにモノレポ構造を伝える

### ステップ2: バックエンド tsconfig.json を更新

**ファイル**: `packages/backend/tsconfig.json`

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

    // ← 以下3つを追加
    "composite": true,        // Project References を有効化
    "declaration": true,      // .d.ts ファイルを生成
    "declarationMap": true    // ソースマップを生成
  },
  "include": ["src/**/*", "worker-configuration.d.ts"],
  "exclude": ["node_modules", "dist", ".wrangler"]
}
```

**重要な設定**:

| 設定 | 説明 | 効果 |
|-----|------|------|
| `composite: true` | プロジェクト参照を有効化 | 他のプロジェクトから参照可能に |
| `declaration: true` | 型定義ファイルを生成 | `dist/**/*.d.ts` を作成 |
| `declarationMap: true` | 宣言ファイルのソースマップ | IDEで定義ジャンプが機能 |

**削除する設定**:
- ~~`"noEmit": true`~~ - ファイル生成を許可する必要がある

### ステップ3: フロントエンド tsconfig.json を更新

**ファイル**: `packages/frontend/tsconfig.json`

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
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"],

  // ← 以下を追加
  "references": [{ "path": "../backend" }]
}
```

**`references` の役割**:
- バックエンドへの依存を宣言
- TypeScriptにバックエンドの型定義ファイルを使用するよう指示
- ソースファイルではなく、コンパイル済み `.d.ts` を参照

### ステップ4: バックエンド package.json にビルドスクリプトを追加

**ファイル**: `packages/backend/package.json`

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "build": "tsc --build",      // ← 追加
    "test": "vitest",
    "typecheck": "tsc --noEmit",
    // ...
  }
}
```

**`tsc --build` の役割**:
- プロジェクト参照を考慮したビルド
- 依存関係を自動的に解決
- 増分ビルドをサポート

### ステップ5: バックエンド .gitignore を更新

**ファイル**: `packages/backend/.gitignore`

```
.env
.wrangler/
dist/          # ← 追加
```

**理由**:
- `dist/` には生成されたファイルが含まれる
- ソースコードから再生成可能
- バージョン管理不要

### ステップ6: CI/CD ワークフローを更新

**ファイル**: `.github/workflows/ci.yml`

```yaml
- name: 🧹 Run ESLint
  run: pnpm --filter=${{ matrix.package }} lint
  continue-on-error: false

# ← 以下を追加
- name: 🏗️ Build Backend (for Frontend typecheck)
  if: matrix.package == 'frontend'
  run: pnpm --filter=backend build
  continue-on-error: false

- name: 🔍 Run TypeScript Check
  run: pnpm --filter=${{ matrix.package }} typecheck
  continue-on-error: false
```

**条件付き実行**:
- `if: matrix.package == 'frontend'` - フロントエンドの場合のみ実行
- バックエンドの型チェックではビルド不要（ソースを直接チェック）
- フロントエンドの型チェックでは事前ビルドが必要

---

## なぜこの解決方法で解決するのか？

### 従来の問題のあるフロー

```
フロントエンド typecheck 実行
  ↓
import type { AppType } from '../../backend/src/index'
  ↓
TypeScript が backend/src/index.ts を解析
  ↓
backend/src/index.ts が backend/src/db/index.ts をインポート
  ↓
backend/src/db/index.ts が D1Database を使用
  ↓
フロントエンドの環境に @cloudflare/workers-types がない
  ↓
❌ error TS2552: Cannot find name 'D1Database'
```

### Project References 適用後の正しいフロー

```
1. バックエンドをビルド
   $ cd packages/backend
   $ pnpm build  # tsc --build

   生成されるファイル:
   dist/
   ├── index.js
   ├── index.d.ts          ← 型定義ファイル
   ├── index.d.ts.map
   ├── db/
   │   ├── index.js
   │   ├── index.d.ts      ← D1Database への参照が解決済み
   │   └── index.d.ts.map
   └── handlers/
       ├── taskList.js
       ├── taskList.d.ts   ← Env への参照が解決済み
       └── taskList.d.ts.map

2. フロントエンド typecheck 実行
   $ cd packages/frontend
   $ pnpm typecheck

   TypeScript の動作:
   ↓
   import type { AppType } from '../../backend/src/index'
   ↓
   tsconfig.json の "references": [{ "path": "../backend" }] を確認
   ↓
   backend/dist/index.d.ts を読み込む（ソースではない）
   ↓
   index.d.ts 内のすべての型が解決済み
   ↓
   D1Database や Env の定義は既に .d.ts 内に含まれている
   ↓
   ✅ 型チェック成功
```

### 型定義ファイル (.d.ts) の内容

**生成される index.d.ts** (簡略版):

```typescript
import { Hono } from 'hono';

// D1Database や Env への参照は解決済み
declare const app: Hono<{
  Bindings: {
    DB: D1Database;  // ← この時点で完全に解決済み
  };
}>;

export type AppType = typeof app;
export default app;
```

**重要なポイント**:
- `.d.ts` ファイルには「型情報のみ」が含まれる
- 元のソースファイルの依存関係は解決済み
- `D1Database` の定義は `.d.ts` に埋め込まれている
- フロントエンドは `.d.ts` を読むだけで完全な型情報を取得

### TypeScript のビルドプロセス

**バックエンドビルド時** (`tsc --build`):

```
1. tsconfig.json を読み込み
   ↓
2. "types": ["@cloudflare/workers-types"] を認識
   ↓
3. worker-configuration.d.ts を include
   ↓
4. すべての型を解決
   ↓
5. src/**/*.ts をコンパイル
   ↓
6. dist/**/*.d.ts を生成（完全な型情報を含む）
```

**フロントエンド typecheck 時**:

```
1. tsconfig.json を読み込み
   ↓
2. "references": [{ "path": "../backend" }] を認識
   ↓
3. backend/tsconfig.json を確認
   ↓
4. backend/dist/*.d.ts が存在するか確認
   ↓
5. ソースではなく、.d.ts から型情報を取得
   ↓
6. フロントエンドのソースを型チェック
```

---

## 開発ワークフロー

### ローカル開発

**初回セットアップ**:

```bash
# プロジェクトルートで
pnpm install

# バックエンドをビルド（型定義生成）
cd packages/backend
pnpm build
```

**日常の開発**:

```bash
# バックエンドの開発
cd packages/backend
pnpm dev  # wrangler dev で開発サーバー起動

# フロントエンドの開発
cd packages/frontend
pnpm dev  # vite dev で開発サーバー起動
```

**バックエンドの型を変更した場合**:

```bash
# 1. バックエンドをリビルド
cd packages/backend
pnpm build

# 2. フロントエンドで新しい型が利用可能
cd ../frontend
pnpm typecheck  # 最新の型定義を使用
```

### CI/CD

**GitHub Actions でのフロー**:

```yaml
Quality Check (Matrix: backend, frontend)
│
├─ Backend
│  ├─ Install dependencies
│  ├─ ESLint
│  ├─ TypeScript check (ソースを直接チェック)
│  └─ Tests
│
└─ Frontend
   ├─ Install dependencies
   ├─ ESLint
   ├─ 🏗️ Build Backend (dist/*.d.ts を生成)
   ├─ TypeScript check (dist/*.d.ts を使用)
   └─ Tests
```

**条件付きビルド**:

```yaml
- name: 🏗️ Build Backend (for Frontend typecheck)
  if: matrix.package == 'frontend'  # frontendの場合のみ
  run: pnpm --filter=backend build
```

---

## トラブルシューティング

### エラー: Cannot find module or its corresponding type declarations

**症状**:

```
error TS2307: Cannot find module '../../backend/src/index' or its corresponding type declarations.
```

**原因**: バックエンドがビルドされていない

**解決方法**:

```bash
cd packages/backend
pnpm build
```

### エラー: Backend の型定義が古い

**症状**: フロントエンドで最新の型が認識されない

**原因**: バックエンドのビルドが古い

**解決方法**:

```bash
# バックエンドを再ビルド
cd packages/backend
pnpm build

# または、クリーンビルド
rm -rf dist/
pnpm build
```

### CI でフロントエンドの型チェックが失敗

**症状**:

```
GitHub Actions で frontend typecheck が失敗
error TS2552: Cannot find name 'D1Database'
```

**原因**: CI ワークフローでバックエンドのビルドステップがない

**解決方法**: `.github/workflows/ci.yml` を確認

```yaml
- name: 🏗️ Build Backend (for Frontend typecheck)
  if: matrix.package == 'frontend'
  run: pnpm --filter=backend build
```

### dist/ がコミットされてしまう

**症状**: `git status` で `dist/` 以下のファイルが表示される

**原因**: `.gitignore` に `dist/` が追加されていない

**解決方法**:

```bash
# .gitignore を確認
cat packages/backend/.gitignore

# dist/ を追加
echo "dist/" >> packages/backend/.gitignore

# 既にコミットされている場合は削除
git rm -r --cached packages/backend/dist/
git commit -m "chore: remove dist/ from git"
```

---

## Project References の利点

### 1. 正しい分離

```
フロントエンド環境
  ↓
backend/dist/*.d.ts のみを参照
  ↓
バックエンドの実装詳細は不要
  ↓
@cloudflare/workers-types などのインフラ依存を持たない
```

### 2. 高速な型チェック

- ソースファイルを解析しない
- コンパイル済み型定義のみを読み込む
- 大規模プロジェクトで特に効果的

### 3. 明確な依存関係

```json
{
  "references": [{ "path": "../backend" }]
}
```

- プロジェクト間の依存が明示的
- TypeScript がビルド順序を理解
- 循環依存を防止

### 4. 段階的ビルド

```bash
# ルートから全体をビルド
tsc --build

# 変更されたプロジェクトのみ再ビルド
tsc --build --incremental
```

### 5. IDE サポート

- VS Code で定義ジャンプが正常動作
- `declarationMap` により `.d.ts` からソースにジャンプ
- 型情報のツールチップが適切に表示

---

## まとめ

### 問題の本質

フロントエンドがバックエンドのソースコードを直接インポートすることで、バックエンド専用の型定義（`D1Database`, `Env`）がフロントエンドのTypeScript環境で解決できない。

### 解決方法

TypeScript Project References を使用して：
1. バックエンドをビルドし、型定義ファイル (`.d.ts`) を生成
2. フロントエンドは型定義ファイルのみを参照
3. バックエンドのソースファイルを型チェックしない

### なぜ解決するのか

- `.d.ts` ファイルにはすべての型が解決済みで含まれる
- フロントエンドはバックエンドのインフラ依存を持たなくて良い
- 型情報のみが分離され、実装の詳細は隠蔽される

### 設定のチェックリスト

- [ ] ルート `tsconfig.json` にプロジェクト参照を追加
- [ ] バックエンド `tsconfig.json` に `composite: true`, `declaration: true`, `declarationMap: true` を追加
- [ ] フロントエンド `tsconfig.json` に `references: [{ "path": "../backend" }]` を追加
- [ ] バックエンド `package.json` に `"build": "tsc --build"` を追加
- [ ] バックエンド `.gitignore` に `dist/` を追加
- [ ] CI ワークフローにフロントエンド型チェック前のバックエンドビルドステップを追加

これで、モノレポでのTypeScript型チェックが正しく機能します！
