# Monorepo CI Setup Complete Guide

本ガイドは、pnpm workspace + TypeScript Project References を使用したモノレポで、完全に動作する CI/CD を構築するための包括的なガイドです。

実際に遭遇したすべての問題とその解決策を含んでいます。

## 目次

1. [最終的な正しい構成](#最終的な正しい構成)
2. [遭遇した問題と解決策](#遭遇した問題と解決策)
3. [ベストプラクティス](#ベストプラクティス)
4. [設定ファイル一覧](#設定ファイル一覧)

---

## 最終的な正しい構成

### プロジェクト構造

```
monorepo-pnpm-turbo/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── worker-configuration.d.ts (生成)
│   │   │   │   └── .gitkeep
│   │   │   ├── handlers/
│   │   │   │   ├── taskList.ts
│   │   │   │   └── taskList.test.ts
│   │   │   └── index.ts
│   │   ├── dist/ (生成、.gitignore)
│   │   ├── tsconfig.json (ビルド用)
│   │   ├── tsconfig.eslint.json (Lint用)
│   │   ├── tsconfig.tsbuildinfo (生成、.gitignore)
│   │   ├── .gitignore
│   │   └── package.json
│   └── frontend/
│       ├── src/
│       ├── dist/ (生成、.gitignore)
│       ├── tsconfig.json
│       ├── tsconfig.tsbuildinfo (生成、.gitignore)
│       ├── .gitignore
│       └── package.json
├── .github/
│   └── workflows/
│       └── ci.yml
└── tsconfig.json (ルート、Project References用)
```

### GitHub Actions CI Workflow

**`.github/workflows/ci.yml`**

```yaml
name: 🔍 Continuous Integration

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality-check:
    name: 🧹 Quality Check (${{ matrix.package }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        package: [backend, frontend]

    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 📦 Setup pnpm
        uses: pnpm/action-setup@v4

      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: 📥 Install dependencies
        run: pnpm install --frozen-lockfile

      - name: 💅 Run Prettier Check
        run: pnpm --filter=${{ matrix.package }} format:check

      - name: 🧹 Run ESLint
        run: pnpm --filter=${{ matrix.package }} lint

      # ⚠️ CRITICAL: Wrangler types must be generated before build
      - name: 🔨 Generate Wrangler Types
        run: pnpm --filter=backend types:generate

      # ⚠️ CRITICAL: Backend must be built before ANY typecheck
      # --force flag ensures clean build, ignoring stale cache
      - name: 🏗️ Build Backend (for typecheck)
        run: pnpm --filter=backend exec tsc --build --force

      - name: 🔍 Run TypeScript Check
        run: pnpm --filter=${{ matrix.package }} typecheck

      - name: 🧪 Run Tests
        run: pnpm --filter=${{ matrix.package }} test
```

**重要なポイント:**

1. **types:generate は常に実行** - if 条件をつけない
2. **build は常に実行** - backend と frontend 両方のジョブで実行
3. **--force フラグ** - tsconfig.tsbuildinfo のキャッシュを無視
4. **実行順序が重要** - types:generate → build → typecheck

---

## 遭遇した問題と解決策

### 問題 1: テストファイルがビルドに含まれる

#### 症状

```
error TS6305: Output file 'dist/index.d.ts' has not been built from source file 'src/index.ts'
Property 'tasks' does not exist on type
```

- `dist/handlers/taskList.test.d.ts` が生成される
- TypeScript Project References の検証が失敗
- フロントエンドの型推論が破損

#### 原因

`tsconfig.json` の `include: ["src/**/*"]` がテストファイルも含んでしまう。

#### 解決策

**`packages/backend/tsconfig.json`** でテストファイルを除外:

```json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": [
    "node_modules",
    "dist",
    ".wrangler",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

**重要:** Vitest は独自に TypeScript を処理するため、テストファイルの除外はテスト実行に影響しません。

---

### 問題 2: ESLint がテストファイルを見つけられない

#### 症状

```
error  Parsing error: "parserOptions.project" has been provided for @typescript-eslint/parser.
The file was not found in any of the provided project(s): src/handlers/taskList.test.ts
```

#### 原因

ESLint の TypeScript パーサーは `parserOptions.project` で指定された tsconfig を使用します。テストファイルが exclude されているため、パーサーがファイルを認識できません。

#### 解決策

**ESLint 専用の tsconfig を作成:**

`packages/backend/tsconfig.eslint.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": false,
    "declaration": false,
    "declarationMap": false
  },
  "exclude": ["node_modules", "dist", ".wrangler"]
}
```

**ESLint 設定を更新:**

`packages/backend/eslint.config.js`:

```javascript
export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json', // 変更
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
```

**利点:**
- テストファイルに対して型対応の Lint が可能
- ビルドからはテストファイルが除外
- 関心の分離（build vs lint）

---

### 問題 3: tsconfig.tsbuildinfo を Git に含めてはいけない

#### 症状

CI で TS6305 エラーが継続。ローカルでは動作するが CI で失敗。

#### 原因

`tsconfig.tsbuildinfo` はビルドキャッシュ/メタデータファイルです:
- どのファイルがコンパイルされたか
- ファイルのタイムスタンプ
- ビルドの状態

このファイルを Git にコミットすると:
1. ローカルで生成された古いメタデータが CI に持ち込まれる
2. CI の実際のソースコードと不一致が発生
3. TypeScript が「declaration files が正しくビルドされていない」と判断
4. TS6305 エラーが発生

#### 解決策

**`.gitignore` に追加:**

`packages/backend/.gitignore`:
```
.env
.wrangler/
dist/
src/types/worker-configuration.d.ts
tsconfig.tsbuildinfo
```

`packages/frontend/.gitignore`:
```
.env.local
tsconfig.tsbuildinfo
```

**Git から削除:**

```bash
git rm packages/backend/tsconfig.tsbuildinfo
git rm packages/frontend/tsconfig.tsbuildinfo
git commit -m "fix: remove tsconfig.tsbuildinfo from git"
```

**CI で --force フラグを使用:**

```yaml
- name: 🏗️ Build Backend (for typecheck)
  run: pnpm --filter=backend exec tsc --build --force
```

`--force` フラグは tsbuildinfo のキャッシュを無視して完全リビルドを強制します。

---

### 問題 4: Wrangler Types の生成タイミング

#### 症状

```
error TS2304: Cannot find name 'Env'.
error TS2552: Cannot find name 'D1Database'.
```

#### 原因

`worker-configuration.d.ts` が存在しないか、生成されていない。このファイルは：
- Wrangler が `wrangler.jsonc` から自動生成
- `Env` インターフェースを定義（D1Database などの bindings を含む）
- `.gitignore` に含まれている（生成ファイルのため）

#### 解決策

**1. types:generate スクリプトを追加:**

`packages/backend/package.json`:

```json
{
  "scripts": {
    "types:generate": "wrangler types src/types/worker-configuration.d.ts",
    "build": "pnpm types:generate && tsc --build"
  }
}
```

**2. .gitkeep でディレクトリを追跡:**

```bash
mkdir -p packages/backend/src/types
touch packages/backend/src/types/.gitkeep
git add packages/backend/src/types/.gitkeep
```

**理由:** Git は空のディレクトリを追跡しません。`.gitkeep` を追加することで、CI 環境でもディレクトリが存在します。

**3. CI で types:generate を実行:**

```yaml
- name: 🔨 Generate Wrangler Types
  run: pnpm --filter=backend types:generate
```

---

### 問題 5: TypeScript Project References の TS6305 エラー

#### 症状

フロントエンドの typecheck で:

```
error TS6305: Output file 'backend/dist/index.d.ts' has not been built from source file 'backend/src/index.ts'
```

#### 原因

TypeScript Project References を使用する場合:
- Frontend が Backend を参照
- Frontend の typecheck 時に Backend の declaration files が必要
- Backend が build されていないと TS6305 エラー

#### 解決策

**CI workflow で Backend を常にビルド:**

```yaml
# ❌ 間違い: frontend のみで build
- name: 🏗️ Build Backend (for Frontend typecheck)
  if: matrix.package == 'frontend'
  run: pnpm --filter=backend build

# ✅ 正しい: 常に build
- name: 🏗️ Build Backend (for typecheck)
  run: pnpm --filter=backend build
```

**理由:**
- Backend job でも backend の typecheck を実行
- Backend の tsconfig.json が `composite: true` を持つ
- TypeScript は declaration files の存在を検証
- Backend build が typecheck より前に実行される必要がある

---

### 問題 6: Prettier フォーマットチェックの失敗

#### 症状

```
[warn] tsconfig.json
[warn] Code style issues found in the above file.
```

#### 原因

Prettier の設定（`"trailingComma": "es5"`）により、JSON ファイルで特定のフォーマットが期待されます。

#### 解決策

**自動フォーマット:**

```bash
pnpm --filter=backend format
```

Prettier が自動的に正しいフォーマットに修正します。

---

## ベストプラクティス

### 1. .gitignore に含めるべきファイル

**Backend (`packages/backend/.gitignore`):**

```
# 環境変数
.env

# Cloudflare Workers
.wrangler/

# ビルド出力
dist/

# 生成された型定義
src/types/worker-configuration.d.ts

# TypeScript ビルドキャッシュ
tsconfig.tsbuildinfo
```

**Frontend (`packages/frontend/.gitignore`):**

```
# 環境変数
.env.local

# ビルド出力
dist/

# TypeScript ビルドキャッシュ
tsconfig.tsbuildinfo
```

**重要原則:**
- ✅ ソースコードのみを Git に含める
- ❌ 生成ファイル、ビルドアーティファクト、キャッシュは除外

---

### 2. TypeScript 設定の分離

**目的別に tsconfig を分ける:**

| ファイル | 目的 | composite | declaration | exclude tests |
|---------|------|-----------|-------------|---------------|
| `tsconfig.json` | 本番ビルド | ✅ | ✅ | ✅ |
| `tsconfig.eslint.json` | Lint | ❌ | ❌ | ❌ |

**理由:**
- ビルドはテストファイルを除外したい
- Lint はテストファイルも対象にしたい
- 関心の分離で設定が明確になる

---

### 3. CI での強制リビルド

**常に --force フラグを使用:**

```yaml
- name: 🏗️ Build Backend (for typecheck)
  run: pnpm --filter=backend exec tsc --build --force
```

**理由:**
- キャッシュの問題を回避
- CI 環境で確実に最新のビルドを生成
- ローカルとの不一致を防ぐ

---

### 4. CI の実行順序

**正しい順序:**

```
1. Install dependencies
2. Format check
3. Lint
4. Generate types (Wrangler)
5. Build (with --force)
6. Type check
7. Tests
```

**重要なポイント:**
- Types generation は build より前
- Build は typecheck より前
- 順序を間違えると TS6305 などのエラーが発生

---

## 設定ファイル一覧

### Backend: `packages/backend/tsconfig.json`

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
    "composite": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": [
    "node_modules",
    "dist",
    ".wrangler",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

---

### Backend: `packages/backend/tsconfig.eslint.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": false,
    "declaration": false,
    "declarationMap": false
  },
  "exclude": ["node_modules", "dist", ".wrangler"]
}
```

---

### Backend: `packages/backend/eslint.config.js`

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.wrangler/**',
      'eslint.config.js',
      'drizzle.config.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
```

---

### Backend: `packages/backend/package.json` (scripts)

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "test": "vitest",
    "types:generate": "wrangler types src/types/worker-configuration.d.ts",
    "build": "pnpm types:generate && tsc --build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

---

### Frontend: `packages/frontend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "../backend" }]
}
```

**重要:** `references` で backend を参照することで、Frontend が Backend の型を利用できます。

---

### Root: `tsconfig.json`

```json
{
  "files": [],
  "references": [
    { "path": "./packages/backend" },
    { "path": "./packages/frontend" }
  ]
}
```

**目的:** TypeScript Project References のルート設定。モノレポ全体のプロジェクト構造を定義します。

---

## まとめ

### このガイドで学んだこと

1. **テストファイルの扱い**
   - ビルドから除外、Lint には含める
   - tsconfig.eslint.json で分離

2. **ビルドキャッシュの管理**
   - tsconfig.tsbuildinfo は Git に含めない
   - CI で --force フラグを使用

3. **生成ファイルの管理**
   - worker-configuration.d.ts は Git に含めない
   - .gitkeep でディレクトリを追跡

4. **CI の実行順序**
   - types:generate → build → typecheck
   - Backend build は常に実行

5. **TypeScript Project References**
   - composite: true が必要
   - declaration files の生成が必須
   - 参照先は build されている必要がある

### トラブルシューティングチェックリスト

CI が失敗したら、以下を確認:

- [ ] tsconfig.tsbuildinfo が .gitignore に含まれているか
- [ ] worker-configuration.d.ts が生成されているか
- [ ] Backend が typecheck より前に build されているか
- [ ] テストファイルが tsconfig.json から除外されているか
- [ ] tsconfig.eslint.json が存在し、ESLint が使用しているか
- [ ] .gitkeep ファイルが src/types/ ディレクトリにあるか
- [ ] --force フラグが CI の build ステップで使用されているか

---

## 参考リンク

- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Wrangler Types](https://developers.cloudflare.com/workers/languages/typescript/#generate-types)
- [typescript-eslint Parser Options](https://typescript-eslint.io/packages/parser#project)
- [pnpm Workspaces](https://pnpm.io/workspaces)

---

**最終更新:** 2025-11-24
**バージョン:** 1.0
**ステータス:** ✅ 完全動作確認済み
