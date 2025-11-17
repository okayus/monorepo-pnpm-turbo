# GitHub Actions CI/CD 初学者向けガイド

このガイドでは、GitHub Actionsを使ったCI/CDの基礎から、実際のトラブルシューティングまでを解説します。

## 目次

1. [CI/CDとは](#cicdとは)
2. [YAMLファイルの基礎](#yamlファイルの基礎)
3. [GitHub Actions の構造](#github-actions-の構造)
4. [実際のワークフロー解説](#実際のワークフロー解説)
5. [トラブルシューティング](#トラブルシューティング)
6. [ベストプラクティス](#ベストプラクティス)

---

## CI/CDとは

### CI (Continuous Integration) - 継続的インテグレーション

**概要**: コードの変更を頻繁にメインブランチに統合し、自動でテストを実行する仕組み

**目的**:
- バグの早期発見
- コード品質の維持
- 統合の問題を最小化

**具体例**:
```
開発者がコミット
    ↓
自動でテスト実行
    ↓
Lint/TypeCheckで品質確認
    ↓
✅ 合格 → マージ可能
❌ 失敗 → 修正が必要
```

### CD (Continuous Deployment) - 継続的デプロイ

**概要**: テストに合格したコードを自動的に本番環境にデプロイする仕組み

**目的**:
- デプロイの自動化
- 人為的ミスの削減
- リリースサイクルの短縮

**具体例**:
```
mainブランチにマージ
    ↓
自動でビルド
    ↓
本番環境にデプロイ
    ↓
✅ 本番稼働
```

### なぜCI/CDが必要か？

| 従来の手動デプロイ | CI/CD自動化 |
|------------------|------------|
| 手動テスト → 時間がかかる | 自動テスト → 数分で完了 |
| デプロイミス → 本番障害 | 自動デプロイ → 一貫性が保証 |
| 夜間・休日作業 → 大変 | 自動実行 → いつでもデプロイ可能 |
| ドキュメント依存 | コードで定義 → 再現可能 |

---

## YAMLファイルの基礎

### YAML とは

**YAML**: "YAML Ain't Markup Language" の略
- 人間が読みやすい設定ファイル形式
- **インデント（空白）が重要** - タブは使えません

### 基本文法

#### 1. キーと値

```yaml
name: CI Pipeline          # 文字列
timeout: 30                # 数値
enabled: true              # 真偽値
```

#### 2. リスト（配列）

```yaml
# ハイフンで始まる
fruits:
  - apple
  - banana
  - orange

# インライン形式
colors: [red, green, blue]
```

#### 3. ネストされたオブジェクト

```yaml
person:
  name: John
  age: 30
  address:
    city: Tokyo
    country: Japan
```

#### 4. 複数行の文字列

```yaml
# | を使うと改行が保持される
description: |
  これは複数行の
  説明文です。
  改行が保持されます。

# > を使うと1行にまとまる
summary: >
  これは長い文章ですが
  実際には1行として
  扱われます。
```

### よくある間違い

❌ **タブを使用**
```yaml
jobs:
→ build:  # タブは使えない！
```

✅ **スペースを使用**
```yaml
jobs:
  build:  # スペース2つ（推奨）
```

❌ **インデントが揃っていない**
```yaml
steps:
  - name: Step 1
   run: echo "hello"  # インデントがおかしい
```

✅ **インデントを揃える**
```yaml
steps:
  - name: Step 1
    run: echo "hello"  # きちんと揃える
```

---

## GitHub Actions の構造

### 基本構造

```yaml
name: ワークフロー名        # ワークフローの表示名

on:                        # トリガー（いつ実行するか）
  push:
    branches: [main]

jobs:                      # 実行する処理
  job1:                    # ジョブ名
    runs-on: ubuntu-latest # 実行環境
    steps:                 # 実行するステップ
      - name: Step 1
        run: echo "hello"
```

### 詳細解説

#### 1. `name` - ワークフロー名

```yaml
name: 🚀 Deploy to Cloudflare
```

- GitHub Actions UIに表示される名前
- 絵文字も使える（視認性向上）

#### 2. `on` - トリガー設定

**いつワークフローを実行するか**

```yaml
# mainブランチへのpush時
on:
  push:
    branches: [main]

# Pull Request作成時
on:
  pull_request:
    branches: [main]

# 複数のトリガー
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:  # 手動実行ボタンを追加

# スケジュール実行（cron）
on:
  schedule:
    - cron: '0 0 * * *'  # 毎日深夜0時
```

**workflow_dispatch の詳細設定**

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'production'
        type: choice
        options:
          - production
          - staging
```

#### 3. `jobs` - ジョブ定義

**ジョブは並列実行される**

```yaml
jobs:
  test:        # ジョブID
    name: 🧪 Run Tests
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  build:       # 別のジョブ（testと並列実行）
    name: 🏗️ Build
    runs-on: ubuntu-latest
    steps:
      - run: npm build
```

**ジョブの依存関係**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  deploy:
    needs: [test]  # testが成功したら実行
    runs-on: ubuntu-latest
    steps:
      - run: npm run deploy
```

#### 4. `runs-on` - 実行環境

```yaml
runs-on: ubuntu-latest     # Ubuntu最新版
runs-on: macos-latest      # macOS最新版
runs-on: windows-latest    # Windows最新版
```

#### 5. `steps` - 実行ステップ

**Actionを使用**

```yaml
steps:
  - name: 📥 Checkout code
    uses: actions/checkout@v4  # 公式アクション

  - name: 📦 Setup pnpm
    uses: pnpm/action-setup@v4  # サードパーティアクション
```

**コマンド実行**

```yaml
steps:
  - name: 📥 Install dependencies
    run: pnpm install

  - name: 🧪 Run tests
    run: |
      echo "Starting tests..."
      pnpm test
      echo "Tests completed!"
```

#### 6. 環境変数と Secrets

**環境変数**

```yaml
steps:
  - name: Build
    run: npm build
    env:
      NODE_ENV: production
      API_URL: https://api.example.com
```

**Secrets（機密情報）**

```yaml
steps:
  - name: Deploy
    env:
      API_TOKEN: ${{ secrets.API_TOKEN }}
      ACCOUNT_ID: ${{ secrets.ACCOUNT_ID }}
    run: deploy.sh
```

**Secretsの設定方法**:
1. GitHub リポジトリ → Settings
2. Secrets and variables → Actions
3. New repository secret

#### 7. 条件分岐

```yaml
steps:
  - name: Deploy to production
    if: github.ref == 'refs/heads/main'
    run: deploy.sh

  - name: Deploy to staging
    if: github.ref == 'refs/heads/develop'
    run: deploy-staging.sh
```

**よく使う条件**:
```yaml
if: success()              # 前のステップが成功
if: failure()              # 前のステップが失敗
if: always()               # 常に実行
if: github.event_name == 'push'  # pushイベント時
```

#### 8. マトリックス戦略

**複数の環境でテスト**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: [backend, frontend]
        node-version: [18, 20]
    steps:
      - run: pnpm --filter=${{ matrix.package }} test
```

これは以下のジョブを並列実行します：
- backend + Node 18
- backend + Node 20
- frontend + Node 18
- frontend + Node 20

#### 9. 同時実行制御

```yaml
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false  # 既存の実行をキャンセルしない
```

---

## 実際のワークフロー解説

### CI ワークフロー (ci.yml)

```yaml
name: 🔍 Continuous Integration

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
```

**解説**:
- mainまたはdevelopブランチへのpush時に実行
- mainブランチへのPull Request作成時に実行

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**解説**:
- 同じブランチで複数のCIが走らないようにする
- 新しいpushがあったら古いCIをキャンセル（`cancel-in-progress: true`）
- コスト削減と実行時間短縮

```yaml
jobs:
  quality-check:
    name: 🧹 Quality Check (${{ matrix.package }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        package: [backend, frontend]
```

**解説**:
- `matrix.package` でbackendとfrontendを並列実行
- `fail-fast: false` - 片方が失敗しても他方を続行

```yaml
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4
```

**解説**:
- リポジトリのコードをチェックアウト（ダウンロード）
- これがないと以降のステップでコードにアクセスできない

```yaml
      - name: 📦 Setup pnpm
        uses: pnpm/action-setup@v4
```

**解説**:
- pnpmをインストール
- `package.json` の `packageManager` フィールドから自動でバージョン検出

```yaml
      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
```

**解説**:
- Node.js v20をインストール
- `cache: 'pnpm'` でpnpmのキャッシュを有効化（高速化）

```yaml
      - name: 📥 Install dependencies
        run: pnpm install --frozen-lockfile
```

**解説**:
- `--frozen-lockfile` - pnpm-lock.yamlを更新しない（CI環境では推奨）
- 依存関係の一貫性を保証

```yaml
      - name: 💅 Run Prettier Check
        run: pnpm --filter=${{ matrix.package }} format:check
        continue-on-error: false
```

**解説**:
- `--filter` で特定のパッケージのみ実行
- `continue-on-error: false` - エラー時にワークフローを停止（デフォルト）

### Deploy ワークフロー (deploy.yml)

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'production'
        type: choice
        options:
          - production
          - staging
```

**解説**:
- mainブランチへのpushで自動デプロイ
- GitHub UIから手動デプロイも可能（環境選択付き）

```yaml
concurrency:
  group: deploy-${{ github.ref }}-${{ inputs.environment || 'production' }}
  cancel-in-progress: false
```

**解説**:
- デプロイは同時実行を防ぐ（`cancel-in-progress: false`）
- 複数のデプロイが同時に走ると本番環境が不安定になる

```yaml
jobs:
  pre-deploy:
    name: 🔍 Pre-deployment Check
    runs-on: ubuntu-latest
    outputs:
      should-deploy: ${{ steps.changes.outputs.should-deploy }}
```

**解説**:
- `outputs` - 他のジョブで使える変数を出力
- デプロイが必要かどうかを判定

```yaml
      - name: 🔍 Check for changes
        id: changes
        run: |
          if git diff --name-only HEAD^ HEAD | grep -E "(packages/|\.github/workflows/)" > /dev/null; then
            echo "should-deploy=true" >> $GITHUB_OUTPUT
            echo "📦 Changes detected in packages or workflows"
          else
            echo "should-deploy=false" >> $GITHUB_OUTPUT
            echo "ℹ️ No relevant changes detected"
          fi
```

**解説**:
- `id: changes` - このステップに名前を付ける
- `$GITHUB_OUTPUT` - 出力変数を設定
- `packages/` または `.github/workflows/` に変更があればデプロイ

```yaml
  deploy-backend:
    name: 🔧 Deploy Backend (Workers)
    needs: [pre-deploy]
    if: needs.pre-deploy.outputs.should-deploy == 'true'
    environment: ${{ inputs.environment || 'production' }}
```

**解説**:
- `needs: [pre-deploy]` - pre-deployジョブが完了したら実行
- `if` - 変更がある場合のみ実行（コスト削減）
- `environment` - GitHub環境設定を使用（Secretsの管理）

```yaml
      - name: 🔍 Verify Environment Variables
        run: |
          if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
            echo "✅ CLOUDFLARE_API_TOKEN is set"
          else
            echo "❌ CLOUDFLARE_API_TOKEN is not set"
            exit 1
          fi
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

**解説**:
- 必須の環境変数が設定されているか確認
- 設定されていない場合は `exit 1` でワークフローを停止

```yaml
      - name: 🚀 Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
          workingDirectory: packages/backend
          packageManager: pnpm
```

**解説**:
- `uses` - Cloudflare公式のアクションを使用
- `with` - アクションへのパラメータ
- `packageManager: pnpm` - pnpmを使用（重要！）

```yaml
  deploy-frontend:
    needs: [pre-deploy, deploy-backend]
```

**解説**:
- backendのデプロイが成功したらfrontendをデプロイ
- 順序を保証（backendが先、frontendが後）

```yaml
      - name: 🏗️ Build Frontend
        run: pnpm --filter=frontend build
        env:
          VITE_API_BASE_URL: https://monorepo-pnpm-turbo-backend.toshiaki-mukai-9981.workers.dev
```

**解説**:
- ビルド時に環境変数を埋め込み
- Viteは `VITE_` プレフィックスの環境変数をビルドに含める

```yaml
  post-deploy:
    needs: [deploy-backend, deploy-frontend]
    if: always() && needs.pre-deploy.outputs.should-deploy == 'true'
```

**解説**:
- `always()` - デプロイが成功/失敗に関わらず実行
- デプロイ後のヘルスチェックや通知に便利

---

## トラブルシューティング

このプロジェクトで実際に発生した問題と解決策を紹介します。

### 1. pnpm バージョン競合エラー

#### エラー内容

```
Error: Multiple versions of pnpm specified:
- version: 10 (from pnpm/action-setup)
- packageManager: pnpm@10.11.1 (from package.json)
```

#### 原因

```yaml
- name: 📦 Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 10  # ← ここが問題
```

`package.json` に既に `packageManager: "pnpm@10.11.1"` が設定されているため、競合が発生。

#### 解決策

```yaml
- name: 📦 Setup pnpm
  uses: pnpm/action-setup@v4
  # versionを削除（自動検出される）
```

**教訓**: `pnpm/action-setup@v4` は `package.json` の `packageManager` フィールドから自動でバージョンを検出するため、`version` は不要。

---

### 2. Cloudflare Pages プロジェクト未作成エラー

#### エラー内容

```
Error: Project not found: monorepo-pnpm-turbo-frontend
```

#### 原因

初回デプロイ時、Cloudflare Pagesのプロジェクトが存在していなかった。

#### 解決策

**手動でプロジェクトを作成**

```bash
wrangler pages project create monorepo-pnpm-turbo-frontend
```

**その後、デプロイ**

```bash
wrangler pages deploy dist --project-name=monorepo-pnpm-turbo-frontend
```

**教訓**: Cloudflare Pagesのプロジェクトは事前に作成が必要。初回デプロイ前に必ず実行すること。

**ドキュメント更新**:
- `docs/frontend-setup.md`
- `docs/cloudflare-pages-setup.md`

に初回デプロイ手順を追加しました。

---

### 3. wrangler-action で npm/pnpm 競合

#### エラー内容

```
Run cloudflare/wrangler-action@v3
🔍 Checking for existing Wrangler installation
📥 Installing Wrangler
Error: The process '/opt/hostedtoolcache/node/20.19.5/x64/bin/npm' failed with exit code 1
Error: 🚨 Action failed
```

#### 原因

`wrangler-action@v3` がデフォルトでnpmを使用してWranglerをインストールしようとするが、このプロジェクトはpnpmワークスペースを使用しているため競合が発生。

#### 解決策

```yaml
- name: 🚀 Deploy to Cloudflare Pages
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: pages deploy dist --project-name=monorepo-pnpm-turbo-frontend
    workingDirectory: packages/frontend
    packageManager: pnpm  # ← これを追加
```

**教訓**: pnpmプロジェクトでは、アクションに `packageManager: pnpm` を明示的に指定する必要がある。

---

### 4. ESLint設定ファイル パースエラー

#### エラー内容

```
/packages/frontend/vite.config.ts
  0:0  error  Parsing error: "parserOptions.project" has been provided for @typescript-eslint/parser.
The file was not found in any of the provided project(s): vite.config.ts
```

#### 原因

- `vite.config.ts` と `vitest.config.ts` がTypeScriptファイル（`.ts`）
- これらが `tsconfig.json` の `include: ["src"]` に含まれていない
- ESLintは `parserOptions.project: './tsconfig.json'` を使用しているため、プロジェクトに含まれていないファイルをパースできない

#### 解決策

**eslint.config.js の ignores に追加**

```javascript
export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'eslint.config.js',
      '*.config.ts',  // ← これを追加
    ],
  },
  // ...
];
```

**教訓**: 設定ファイル（`*.config.ts`）は通常ビルド対象ではないため、ESLintの対象から除外するのが一般的。

---

### 5. その他のよくあるエラー

#### GitHub Secrets が設定されていない

**エラー**:
```
❌ CLOUDFLARE_API_TOKEN is not set
```

**解決策**:
1. GitHub リポジトリ → Settings
2. Secrets and variables → Actions
3. `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を追加

#### ビルドエラー

**エラー**:
```
Error: Build failed
```

**デバッグ方法**:
```yaml
- name: 🏗️ Build with verbose output
  run: pnpm build --verbose
```

**または、ローカルで再現**:
```bash
pnpm install --frozen-lockfile
pnpm build
```

#### テストが失敗

**エラー**:
```
FAIL src/App.test.tsx
```

**デバッグ方法**:
1. ローカルでテストを実行
   ```bash
   pnpm test
   ```

2. GitHub Actions のログを確認
   - Actions タブ → 失敗したワークフロー → 詳細ログを展開

---

## ベストプラクティス

### 1. ワークフロー設計

#### ✅ DO: 並列実行でスピードアップ

```yaml
jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm --filter=backend test

  test-frontend:  # 並列実行される
    runs-on: ubuntu-latest
    steps:
      - run: pnpm --filter=frontend test
```

#### ❌ DON'T: 不必要な順序依存

```yaml
jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm --filter=backend test

  test-frontend:
    needs: [test-backend]  # 不要な依存
    runs-on: ubuntu-latest
    steps:
      - run: pnpm --filter=frontend test
```

---

### 2. キャッシュの活用

#### ✅ DO: キャッシュを使って高速化

```yaml
- name: 🔧 Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'pnpm'  # pnpmのキャッシュを有効化
```

**効果**: 依存関係のインストール時間が 2-3分 → 10-20秒 に短縮

---

### 3. セキュリティ

#### ✅ DO: Secretsを使う

```yaml
env:
  API_TOKEN: ${{ secrets.API_TOKEN }}
```

#### ❌ DON'T: トークンをハードコード

```yaml
env:
  API_TOKEN: "sk-1234567890"  # 絶対にNG！
```

#### ✅ DO: 最小権限の原則

Cloudflare API Token は必要最小限の権限のみ付与：
- ✅ `Cloudflare Pages: Edit`
- ❌ `Account: Edit` （不要）

---

### 4. デバッグ

#### ワークフローのテスト

**1. ローカルで act を使用**

```bash
# GitHub Actions をローカルで実行
brew install act  # macOS
act push          # pushイベントをシミュレート
```

**2. workflow_dispatch で手動実行**

```yaml
on:
  workflow_dispatch:  # GitHub UIから手動実行可能
```

**3. デバッグ出力を追加**

```yaml
- name: Debug
  run: |
    echo "Current directory: $(pwd)"
    echo "Files: $(ls -la)"
    echo "Node version: $(node -v)"
    echo "pnpm version: $(pnpm -v)"
```

#### ログの確認方法

1. GitHub リポジトリ → Actions タブ
2. 失敗したワークフローをクリック
3. ジョブをクリック
4. ステップを展開してログを確認

**便利なフィルター**:
- `❌` アイコン - 失敗したステップ
- `⚠️` アイコン - 警告があるステップ

---

### 5. コスト最適化

#### ✅ DO: 不要な実行を避ける

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'packages/**'      # packagesディレクトリのみ
      - '.github/workflows/**'
```

#### ✅ DO: 変更検知

```yaml
- name: Check for changes
  id: changes
  run: |
    if git diff --name-only HEAD^ HEAD | grep "packages/" > /dev/null; then
      echo "should-deploy=true" >> $GITHUB_OUTPUT
    else
      echo "should-deploy=false" >> $GITHUB_OUTPUT
    fi
```

#### ✅ DO: 同時実行の制限

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true  # 古い実行をキャンセル
```

---

### 6. メンテナンス

#### バージョン管理

```yaml
# ✅ メジャーバージョンを指定（自動更新）
uses: actions/checkout@v4

# ❌ 固定バージョン（更新が面倒）
uses: actions/checkout@v4.1.0
```

#### 定期的なアップデート

Dependabot を使用してActionsを自動更新：

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

---

## まとめ

### CI/CDの要点

1. **自動化** - テスト、ビルド、デプロイを自動化
2. **品質保証** - コード品質を自動チェック
3. **高速フィードバック** - 問題を早期発見
4. **信頼性** - 人為的ミスを削減

### YAMLの要点

1. **インデント** - スペース2つ、タブは使わない
2. **構造** - name → on → jobs → steps
3. **変数** - `${{ }}` で参照
4. **条件** - `if` で実行を制御

### トラブルシューティングの要点

1. **ローカルで再現** - まずローカルで動作確認
2. **ログを確認** - GitHub Actionsのログを詳しく読む
3. **段階的にテスト** - 問題を切り分ける
4. **ドキュメント** - エラーと解決策を記録

---

## 参考リンク

### 公式ドキュメント

- [GitHub Actions 公式ドキュメント](https://docs.github.com/en/actions)
- [GitHub Actions Workflow 構文](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Cloudflare Wrangler Action](https://github.com/cloudflare/wrangler-action)

### このプロジェクトの関連ドキュメント

- [GitHub Actions CI/CD セットアップ](./github-actions-cicd-setup.md)
- [フロントエンドセットアップ](./frontend-setup.md)
- [Cloudflare Pages セットアップ](./cloudflare-pages-setup.md)

---

**作成日**: 2025-11-17
**最終更新**: 2025-11-17
