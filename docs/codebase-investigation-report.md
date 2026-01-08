# リポジトリ調査レポート

## 調査概要

**調査日時**: 2026-01-08
**調査対象**: monorepo-pnpm-turbo リポジトリ
**調査者**: Claude Code (claude-opus-4-5-20251101)

---

## 調査プロセス

### 何を調査したか

1. **ディレクトリ構成** - プロジェクトの全体的な構造を把握
2. **設定ファイル** - package.json、tsconfig.json、各種設定ファイルの内容
3. **技術スタック** - 使用しているフレームワーク、ライブラリ、ツール
4. **ソースコード** - 主要なソースファイルの役割と実装内容
5. **CI/CD設定** - GitHub Actionsのワークフロー設定
6. **ドキュメント** - 既存のドキュメントファイル

### どのように調査したか

1. **Glob検索** - ファイルパターンによる全体構造の把握
2. **ファイル読み込み** - 設定ファイルやソースコードの詳細確認
3. **Grep検索** - 特定のキーワード（依存関係、設定値など）の探索

### なぜその調査をしたか

| 調査対象 | 調査理由 |
|----------|----------|
| ディレクトリ構成 | モノレポの構造とパッケージの分離方法を理解するため |
| package.json | 依存関係、スクリプト、パッケージ名を把握するため |
| tsconfig.json | TypeScriptの設定とプロジェクト参照を確認するため |
| wrangler.jsonc | Cloudflare Workers のデプロイ設定を理解するため |
| ソースコード | 実際のアプリケーション構造と実装パターンを把握するため |
| CI/CD設定 | 開発ワークフローと品質管理プロセスを理解するため |

---

## 調査結果

### 1. リポジトリ概要

このリポジトリは **pnpm + Turbo（予定）を使用したモノレポ構成** のフルスタックWebアプリケーションです。

- **バックエンド**: Hono + Cloudflare Workers + D1 (SQLite)
- **フロントエンド**: React + Vite + Cloudflare Pages
- **共通基盤**: TypeScript, ESLint, Prettier, Vitest

### 2. ディレクトリ構成

```
monorepo-pnpm-turbo/
├── .github/workflows/          # GitHub Actions CI/CD設定
│   ├── ci.yml                  # 継続的インテグレーション
│   └── deploy.yml              # デプロイメント
├── .vscode/                    # VSCode設定
├── docs/                       # ドキュメント
│   ├── d1-drizzle-setup-guide.md
│   ├── cloudflare-pages-setup.md
│   ├── eslint-prettier-setup-guide.md
│   ├── frontend-setup.md
│   ├── github-actions-basics.md
│   ├── monorepo-ci-setup-complete-guide.md
│   └── typescript-project-references-guide.md
├── packages/
│   ├── backend/                # バックエンドパッケージ
│   │   ├── src/
│   │   │   ├── index.ts        # Honoサーバーエントリーポイント
│   │   │   ├── handlers/       # APIハンドラー
│   │   │   ├── db/             # データベース設定・スキーマ
│   │   │   └── types/          # 型定義
│   │   ├── drizzle/            # DBマイグレーション
│   │   ├── wrangler.jsonc      # Cloudflare Workers設定
│   │   └── drizzle.config.ts   # Drizzle ORM設定
│   └── frontend/               # フロントエンドパッケージ
│       ├── src/
│       │   ├── main.tsx        # Reactエントリーポイント
│       │   ├── App.tsx         # メインアプリケーション
│       │   └── App.test.tsx    # テスト
│       ├── index.html          # HTMLテンプレート
│       ├── vite.config.ts      # Vite設定
│       └── vitest.config.ts    # Vitest設定
├── package.json                # ルートパッケージ定義
├── pnpm-workspace.yaml         # pnpmワークスペース設定
├── tsconfig.json               # ルートTypeScript設定
└── pnpm-lock.yaml              # 依存関係ロックファイル
```

### 3. 技術スタック

#### バックエンド (packages/backend)

| カテゴリ | 技術 | バージョン |
|----------|------|------------|
| フレームワーク | Hono | 4.10.6 |
| ランタイム | Cloudflare Workers | - |
| 言語 | TypeScript | 5.9.3 |
| データベース | Cloudflare D1 (SQLite) | - |
| ORM | Drizzle ORM | 0.44.7 |
| バリデーション | Zod | 4.1.12 |
| 開発ツール | Wrangler | 4.47.0 |

#### フロントエンド (packages/frontend)

| カテゴリ | 技術 | バージョン |
|----------|------|------------|
| UIフレームワーク | React | 18.3.1 |
| ビルドツール | Vite | 6.1.7 |
| 言語 | TypeScript | 5.9.3 |
| APIクライアント | Hono Client | - |
| テスト | Vitest + Testing Library | 4.0.9 |

#### 共通ツール

| カテゴリ | 技術 | バージョン |
|----------|------|------------|
| パッケージマネージャー | pnpm | 10.11.1+ |
| リンター | ESLint | 9.39.1 |
| フォーマッター | Prettier | 3.6.2 |
| テストフレームワーク | Vitest | 4.0.9 |

### 4. パッケージ詳細

#### バックエンド (`backend`)

**役割**: RESTful API サーバー

**データベーススキーマ**:
- `users` テーブル: ユーザー情報（ID, 名前, メール, 作成日時）
- `tasks` テーブル: タスク情報（ID, ユーザーID, タイトル, 説明, 完了フラグ, 作成日時）
- リレーション: ユーザー 1:N タスク

**APIエンドポイント**:
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/` | ウェルカムメッセージ |
| GET | `/api/tasks` | タスク一覧取得 |

**主要スクリプト**:
```bash
pnpm dev              # 開発サーバー起動
pnpm build            # ビルド
pnpm typecheck        # 型チェック
pnpm lint             # リント
pnpm test             # テスト実行
pnpm db:generate      # マイグレーション生成
pnpm db:migrate:local # ローカルDB適用
pnpm db:studio        # DB GUI起動
```

#### フロントエンド (`@okayus/frontend`)

**役割**: ユーザーインターフェース

**主要コンポーネント**:
- `App.tsx` - メインアプリケーション（APIクライアント、状態管理）

**主要スクリプト**:
```bash
pnpm dev              # 開発サーバー (localhost:5173)
pnpm build            # 本番ビルド
pnpm preview          # ビルド結果プレビュー
pnpm test             # テスト実行
pnpm typecheck        # 型チェック
pnpm lint             # リント
```

### 5. TypeScript プロジェクト参照

```
tsconfig.json (root)
├── references → packages/backend/tsconfig.json
└── references → packages/frontend/tsconfig.json
                 └── references → packages/backend (型共有)
```

フロントエンドはバックエンドの型定義を参照し、型安全なAPIクライアントを実現しています。

### 6. CI/CD パイプライン

#### ci.yml - 継続的インテグレーション

**トリガー**:
- `main` / `develop` ブランチへのプッシュ
- `main` ブランチへのプルリクエスト

**ジョブ**:
1. **quality-check**: 各パッケージで品質チェック
   - Prettier フォーマット確認
   - ESLint リント
   - TypeScript コンパイル
   - Vitest テスト実行

2. **integration-check**: 統合テスト
   - Wrangler 起動テスト
   - Vite ビルドテスト

3. **ci-success**: 成功通知

### 7. デプロイ構成

| パッケージ | プラットフォーム | 本番URL |
|------------|------------------|---------|
| backend | Cloudflare Workers | `https://monorepo-pnpm-turbo-backend.toshiaki-mukai-9981.workers.dev` |
| frontend | Cloudflare Pages | `https://monorepo-pnpm-turbo-frontend.pages.dev` |

### 8. 環境変数

**バックエンド** (`.env`):
- `DATABASE_URL`: D1データベース接続情報

**フロントエンド** (`.env.local`):
- `VITE_API_URL`: バックエンドAPIのURL

---

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────────────────┐ │
│  │  Cloudflare      │         │  Cloudflare Workers      │ │
│  │  Pages           │ ──API──▶│  (Hono)                  │ │
│  │  (React + Vite)  │         │                          │ │
│  └──────────────────┘         └──────────┬───────────────┘ │
│                                          │                  │
│                                          ▼                  │
│                               ┌──────────────────────────┐ │
│                               │  Cloudflare D1           │ │
│                               │  (SQLite)                │ │
│                               │  - users                 │ │
│                               │  - tasks                 │ │
│                               └──────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 開発者向けクイックスタート

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. ローカル開発サーバーの起動

```bash
# バックエンド（別ターミナル）
cd packages/backend
pnpm db:migrate:local  # 初回のみ
pnpm dev

# フロントエンド（別ターミナル）
cd packages/frontend
pnpm dev
```

### 3. テストの実行

```bash
# 各パッケージで
pnpm test
```

### 4. コード品質チェック

```bash
# 各パッケージで
pnpm lint
pnpm format
pnpm typecheck
```

---

## まとめ

このリポジトリは以下の特徴を持つモダンなフルスタックアプリケーションです：

1. **モノレポ構成**: pnpmワークスペースによる効率的なパッケージ管理
2. **型安全性**: TypeScript + プロジェクト参照による End-to-End の型共有
3. **エッジコンピューティング**: Cloudflare Workers/Pages による高速なグローバル配信
4. **モダンツールチェーン**: Vite, ESLint 9, Vitest による快適な開発体験
5. **自動化**: GitHub Actions による CI/CD パイプライン

現時点ではシンプルなタスク管理アプリケーションの基盤が構築されており、今後の機能拡張に向けた堅牢な基盤となっています。
