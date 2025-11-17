# フロントエンド (React + Vite) セットアップガイド

このガイドでは、フロントエンドアプリケーション (React + Vite) のセットアップと開発方法を説明します。

## 目次

1. [技術スタック](#技術スタック)
2. [プロジェクト構成](#プロジェクト構成)
3. [セットアップ手順](#セットアップ手順)
4. [開発ワークフロー](#開発ワークフロー)
5. [ビルドとデプロイ](#ビルドとデプロイ)
6. [テスト](#テスト)
7. [トラブルシューティング](#トラブルシューティング)

---

## 技術スタック

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| **フレームワーク** | React | 18.3.x |
| **ビルドツール** | Vite | 6.x |
| **言語** | TypeScript | 5.9.x |
| **テスト** | Vitest | 4.x |
| **Linting** | ESLint | 9.x |
| **フォーマット** | Prettier | 3.x |
| **デプロイ** | Cloudflare Pages | - |

---

## プロジェクト構成

```
packages/frontend/
├── src/
│   ├── main.tsx           # エントリーポイント
│   ├── App.tsx            # メインコンポーネント
│   ├── App.test.tsx       # テストファイル
│   ├── setupTests.ts      # テスト設定
│   └── vite-env.d.ts      # Vite型定義
├── public/                # 静的ファイル
├── dist/                  # ビルド出力（gitignore）
├── index.html             # HTMLエントリー
├── vite.config.ts         # Vite設定
├── tsconfig.json          # TypeScript設定
├── vitest.config.ts       # Vitest設定
├── eslint.config.js       # ESLint設定
├── .prettierrc            # Prettier設定
├── .env.example           # 環境変数テンプレート
└── package.json           # パッケージ定義
```

---

## セットアップ手順

### 1. 依存関係のインストール

```bash
# プロジェクトルートで実行
pnpm install

# または、frontendのみインストール
pnpm --filter=frontend install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env.local` を作成：

```bash
cd packages/frontend
cp .env.example .env.local
```

`.env.local` を編集：

```env
VITE_API_BASE_URL=https://monorepo-pnpm-turbo-backend.toshiaki-mukai-9981.workers.dev
```

**重要**: `.env.local` はgitにコミットしないでください（.gitignoreに含まれています）。

### 3. 開発サーバーの起動

```bash
# frontendのみ起動
pnpm --filter=frontend dev

# または、packages/frontend ディレクトリ内で
pnpm dev
```

ブラウザで http://localhost:5173 を開いてください。

---

## 開発ワークフロー

### コード品質チェック

```bash
# ESLint
pnpm --filter=frontend lint
pnpm --filter=frontend lint:fix  # 自動修正

# Prettier
pnpm --filter=frontend format:check
pnpm --filter=frontend format      # 自動フォーマット

# TypeScript型チェック
pnpm --filter=frontend typecheck
```

### テスト

```bash
# テスト実行
pnpm --filter=frontend test

# UI付きテスト実行
pnpm --filter=frontend test:ui

# ウォッチモード
pnpm --filter=frontend test -- --watch
```

### ビルド

```bash
# プロダクションビルド
pnpm --filter=frontend build

# ビルドのプレビュー
pnpm --filter=frontend preview
```

---

## ビルドとデプロイ

### ローカルビルド

```bash
cd packages/frontend
pnpm build
```

ビルド出力: `dist/` ディレクトリ

### Cloudflare Pages へのデプロイ

#### GitHub Actions 経由（推奨）

1. **main ブランチにマージ**

```bash
git checkout main
git merge your-feature-branch
git push origin main
```

2. **自動デプロイ**

GitHub Actions が自動的に以下を実行：
- コード品質チェック (Lint, TypeCheck, Test)
- ビルド
- Cloudflare Pages へデプロイ

#### 手動デプロイ

```bash
cd packages/frontend
pnpm build

# 初回のみ：プロジェクトを作成
wrangler pages project create monorepo-pnpm-turbo-frontend

# wrangler経由でデプロイ
wrangler pages deploy dist --project-name=monorepo-pnpm-turbo-frontend --commit-dirty=true
```

**注意**:
- 初回デプロイ時は `wrangler pages project create` でプロジェクトを作成する必要があります
- git管理下で未コミットの変更がある場合は `--commit-dirty=true` フラグを追加してください

**デプロイURL**: https://monorepo-pnpm-turbo-frontend.pages.dev

---

## テスト

### テストの書き方

```tsx
// Example: src/components/Button.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### テストの実行

```bash
# 全テスト実行
pnpm test

# 特定のファイルのみ
pnpm test src/App.test.tsx

# カバレッジ付き
pnpm test -- --coverage
```

---

## トラブルシューティング

### 1. 依存関係のエラー

**症状**: `Cannot find module 'react'` などのエラー

**解決策**:
```bash
# node_modulesを削除して再インストール
rm -rf node_modules
pnpm install
```

### 2. Vite開発サーバーが起動しない

**症状**: `Port 5173 is already in use`

**解決策**:
```bash
# ポート5173を使用しているプロセスを終了
lsof -ti:5173 | xargs kill -9

# または、別のポートで起動
pnpm dev -- --port 5174
```

### 3. ESLintエラー

**症状**: `Parsing error` など

**解決策**:
```bash
# ESLint設定を確認
pnpm lint

# キャッシュをクリア
rm -rf node_modules/.cache
```

### 4. ビルドエラー

**症状**: `Build failed` エラー

**解決策**:
```bash
# 型チェック
pnpm typecheck

# distディレクトリを削除して再ビルド
rm -rf dist
pnpm build
```

### 5. API接続エラー

**症状**: フロントエンドからバックエンドAPIに接続できない

**解決策**:

1. **環境変数を確認**
   ```bash
   cat .env.local
   # VITE_API_BASE_URL が正しく設定されているか確認
   ```

2. **CORSエラーの場合**
   - Backend側のCORS設定を確認（packages/backend/src/index.ts）
   - フロントエンドのオリジンが許可リストに含まれているか確認

3. **ローカル開発時**
   ```bash
   # バックエンド開発サーバーが起動しているか確認
   cd packages/backend
   pnpm dev
   ```

### 6. TypeScript エラー

**症状**: `Type 'X' is not assignable to type 'Y'`

**解決策**:
```bash
# 型定義を確認
pnpm typecheck

# 型定義ファイルを再生成
rm -rf node_modules/@types
pnpm install
```

---

## VS Code 設定

推奨される拡張機能：

- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)
- **Vite** (`antfu.vite`)
- **TypeScript Vue Plugin (Volar)** - Reactでも有用

`.vscode/settings.json` が既に設定されているため、保存時に自動フォーマットが有効です。

---

## 環境変数

### 利用可能な環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `VITE_API_BASE_URL` | バックエンドAPIのベースURL | `https://monorepo-pnpm-turbo-backend.toshiaki-mukai-9981.workers.dev` |

### 環境変数の使用方法

```tsx
// TypeScriptで型安全に使用
const apiUrl = import.meta.env.VITE_API_BASE_URL;

// vite-env.d.ts で型定義
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}
```

**注意**:
- Viteの環境変数は `VITE_` プレフィックスが必要
- ビルド時に埋め込まれるため、機密情報は含めない

---

## API統合

### バックエンドAPIへのリクエスト

```tsx
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// GET リクエスト
const response = await fetch(`${API_BASE_URL}/api/tasks`);
const data = await response.json();

// POST リクエスト
const response = await fetch(`${API_BASE_URL}/api/tasks`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ title: 'New Task' }),
});
```

### CORS設定

バックエンド側で以下のオリジンが許可されています：
- `http://localhost:5173` (開発環境)
- `https://monorepo-pnpm-turbo-frontend.pages.dev` (本番環境)

---

## パフォーマンス最適化

### 推奨事項

1. **Code Splitting**
   ```tsx
   // 動的インポート
   const LazyComponent = lazy(() => import('./components/Heavy'));
   ```

2. **画像最適化**
   - WebP形式を使用
   - 適切なサイズにリサイズ
   - Lazy Loading を活用

3. **バンドルサイズの確認**
   ```bash
   pnpm build
   # dist/assets のサイズを確認
   ```

---

## まとめ

### ✅ セットアップ完了チェックリスト

- [ ] 依存関係をインストール (`pnpm install`)
- [ ] `.env.local` を設定
- [ ] 開発サーバーが起動 (`pnpm dev`)
- [ ] ブラウザで http://localhost:5173 にアクセス可能
- [ ] バックエンドAPIとの通信が成功
- [ ] テストが実行可能 (`pnpm test`)
- [ ] ビルドが成功 (`pnpm build`)

### 📚 関連ドキュメント

- [GitHub Actions CI/CD セットアップ](./github-actions-cicd-setup.md)
- [Cloudflare Pages セットアップ](./cloudflare-pages-setup.md)
- [ESLint と Prettier セットアップ](./eslint-prettier-setup-guide.md)

---

**作成日**: 2025-11-17
**最終更新**: 2025-11-17
