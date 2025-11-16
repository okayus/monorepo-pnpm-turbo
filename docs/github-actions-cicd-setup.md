# GitHub Actions CI/CD セットアップガイド

このガイドでは、Cloudflare Workers (Backend) への CI/CD パイプラインのセットアップ方法を説明します。

## 目次

1. [概要](#概要)
2. [ワークフロー構成](#ワークフロー構成)
3. [前提条件](#前提条件)
4. [GitHub Secrets の設定](#github-secrets-の設定)
5. [ブランチ戦略](#ブランチ戦略)
6. [CI/CD の動作](#cicd-の動作)
7. [トラブルシューティング](#トラブルシューティング)

---

## 概要

このプロジェクトでは、GitHub Actions を使用した自動 CI/CD パイプラインが構築されています。

### 対象パッケージ

- **packages/backend** - Cloudflare Workers (Hono フレームワーク)

### ワークフロー

1. **CI (Continuous Integration)** - コード品質チェック
2. **Deploy** - Cloudflare Workers へのデプロイ

---

## ワークフロー構成

### 1. CI ワークフロー (`.github/workflows/ci.yml`)

**トリガー**:
- `main` または `develop` ブランチへの push
- `main` ブランチへの Pull Request

**処理内容**:

```
quality-check
├─ 💅 Prettier フォーマットチェック
├─ 🧹 ESLint 実行
├─ 🔍 TypeScript 型チェック
└─ 🧪 Vitest テスト実行

integration-check
└─ 🧪 Wrangler dev 起動テスト

ci-success
└─ 🎉 成功通知
```

**特徴**:
- 同時実行制御（同じ PR で複数の CI を防ぐ）
- pnpm キャッシュで高速化
- ジョブの並列実行

### 2. Deploy ワークフロー (`.github/workflows/deploy.yml`)

**トリガー**:
- `main` ブランチへの push
- 手動実行 (workflow_dispatch)

**処理内容**:

```
pre-deploy
└─ 🔍 変更チェック (packages/backend, .github/)

deploy-backend
├─ 🧹 コード品質チェック (Lint, TypeCheck, Test)
├─ 🔍 環境変数検証
└─ 🚀 Cloudflare Workers デプロイ

post-deploy
└─ 🔍 ヘルスチェック
```

**特徴**:
- 同時デプロイ防止
- 変更がない場合はスキップ
- デプロイ前の品質チェック

---

## 前提条件

### 1. ローカル環境

以下がインストールされていることを確認してください：

- **Node.js**: 20.x (LTS)
- **pnpm**: 10.x
- **Wrangler CLI**: 4.x

### 2. Cloudflare アカウント

Cloudflare Workers を使用するため、以下が必要です：

- Cloudflare アカウント
- API トークン
- アカウント ID

---

## GitHub Secrets の設定

### 必要な Secrets

GitHub リポジトリに以下の Secrets を設定する必要があります。

| Secret 名 | 説明 | 取得方法 |
|-----------|------|----------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API トークン | Cloudflare ダッシュボード > My Profile > API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウント ID | Cloudflare ダッシュボード > Workers & Pages > 右サイドバー |

### Secrets の設定手順

1. **Cloudflare API Token の作成**

   a. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン

   b. **My Profile** > **API Tokens** に移動

   c. **Create Token** をクリック

   d. **Edit Cloudflare Workers** テンプレートを使用、または以下の権限を設定：

   ```
   Account > Cloudflare Workers Scripts > Edit
   ```

   e. トークンを作成してコピー

2. **Cloudflare Account ID の確認**

   a. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン

   b. **Workers & Pages** に移動

   c. 右サイドバーに表示されている **Account ID** をコピー

3. **GitHub に Secrets を追加**

   a. GitHub リポジトリの **Settings** > **Secrets and variables** > **Actions** に移動

   b. **New repository secret** をクリック

   c. 以下の Secrets を追加：

   ```
   Name: CLOUDFLARE_API_TOKEN
   Secret: (コピーした API Token)
   ```

   ```
   Name: CLOUDFLARE_ACCOUNT_ID
   Secret: (コピーした Account ID)
   ```

---

## ブランチ戦略

### 推奨ブランチ構成

```
main (本番環境)
  ├─ develop (開発環境)
  │   └─ feature/* (機能開発)
  └─ hotfix/* (緊急修正)
```

### ブランチごとの動作

| ブランチ | CI 実行 | デプロイ実行 |
|---------|---------|-------------|
| `main` | ✅ | ✅ (本番) |
| `develop` | ✅ | ❌ |
| `feature/*` | ✅ (PR 作成時) | ❌ |
| `hotfix/*` | ✅ (PR 作成時) | ❌ |

### master から main への移行

現在のプロジェクトは `master` ブランチを使用していますが、`main` に移行することを推奨します。

**移行手順**:

1. **ローカルで main ブランチを作成**
   ```bash
   git checkout -b main
   git push -u origin main
   ```

2. **GitHub でデフォルトブランチを変更**
   - GitHub リポジトリの **Settings** > **Branches** に移動
   - **Default branch** を `main` に変更

3. **古い master ブランチを削除（オプション）**
   ```bash
   git push origin --delete master
   git branch -d master
   ```

---

## CI/CD の動作

### Pull Request 作成時

1. **CI ワークフロー**が自動実行される
2. コード品質チェック（Lint, TypeCheck, Test）
3. Wrangler dev 起動テスト
4. すべて成功すると ✅ マークが表示される

**マージ可能な条件**:
- すべての CI チェックが成功
- レビュー承認（設定している場合）

### main ブランチへのマージ時

1. **CI ワークフロー**が実行される
2. すべて成功すると、**Deploy ワークフロー**が自動実行される
3. 変更チェック（`packages/backend/` に変更がある場合のみデプロイ）
4. Cloudflare Workers へデプロイ
5. デプロイ後のヘルスチェック

### 手動デプロイ

GitHub Actions の **Actions** タブから手動でデプロイを実行できます。

1. **Actions** タブに移動
2. **🚀 Deploy to Cloudflare** ワークフローを選択
3. **Run workflow** をクリック
4. 環境を選択（production / staging）
5. **Run workflow** を実行

---

## トラブルシューティング

### CI が失敗する

#### 1. ESLint エラー

**エラー例**:
```
Error: ESLint found problems in your code
```

**解決策**:
```bash
# ローカルで修正
pnpm --filter=backend lint:fix

# 確認
pnpm --filter=backend lint
```

#### 2. TypeScript 型エラー

**エラー例**:
```
Error: TypeScript check failed
```

**解決策**:
```bash
# ローカルで確認
pnpm --filter=backend typecheck

# エラーを修正してコミット
```

#### 3. テスト失敗

**エラー例**:
```
Error: Tests failed
```

**解決策**:
```bash
# ローカルでテスト実行
pnpm --filter=backend test

# 失敗したテストを修正
```

### デプロイが失敗する

#### 1. Secrets が設定されていない

**エラー例**:
```
Error: CLOUDFLARE_API_TOKEN is not set
```

**解決策**:
- [GitHub Secrets の設定](#github-secrets-の設定) を参照
- Secrets が正しく設定されているか確認

#### 2. Wrangler デプロイエラー

**エラー例**:
```
Error: Error: You need to provide an account id
```

**解決策**:
- `CLOUDFLARE_ACCOUNT_ID` が正しく設定されているか確認
- `wrangler.jsonc` に `account_id` が設定されているか確認（オプション）

#### 3. 権限エラー

**エラー例**:
```
Error: Authentication error
```

**解決策**:
- API Token の権限を確認
- 必要な権限: `Account > Cloudflare Workers Scripts > Edit`

### Wrangler Dev が起動しない

**エラー例**:
```
Error: Wrangler dev failed to start
```

**解決策**:
```bash
# ローカルで確認
cd packages/backend
pnpm dev

# エラーメッセージを確認して修正
```

### 変更してもデプロイされない

**原因**:
- `packages/backend/` または `.github/workflows/` に変更がない場合、デプロイはスキップされます

**解決策**:
- 手動デプロイを実行
- または、対象ディレクトリに変更をコミット

---

## ワークフローのカスタマイズ

### デプロイ対象の変更

**ファイル**: `.github/workflows/deploy.yml`

**変更箇所**:
```yaml
- name: 🔍 Check for changes
  id: changes
  run: |
    # 変更チェックのパターンを変更
    if git diff --name-only HEAD^ HEAD | grep -E "(packages/backend/|\.github/)" > /dev/null; then
      echo "should-deploy=true" >> $GITHUB_OUTPUT
    else
      echo "should-deploy=false" >> $GITHUB_OUTPUT
    fi
```

### ヘルスチェックの実装

Backend にヘルスチェックエンドポイントを追加した後、以下を有効化：

**ファイル**: `.github/workflows/deploy.yml`

```yaml
- name: 🔍 Backend Health Check
  run: |
    WORKER_URL="https://monorepo-pnpm-turbo-backend.YOUR_SUBDOMAIN.workers.dev"
    curl -f $WORKER_URL/health || exit 1
```

**Backend の実装例**:

```typescript
// packages/backend/src/index.ts
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

### テストカバレッジレポート

将来的に実装する場合：

1. **package.json にスクリプト追加**:
   ```json
   {
     "scripts": {
       "test:coverage": "vitest run --coverage"
     }
   }
   ```

2. **CI ワークフローに追加**:
   ```yaml
   - name: 📊 Generate Coverage Report
     run: pnpm --filter=backend test:coverage

   - name: 📤 Upload Coverage
     uses: codecov/codecov-action@v4
     with:
       directory: packages/backend/coverage
   ```

---

## まとめ

### ✅ セットアップ完了チェックリスト

- [ ] GitHub Secrets を設定（CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID）
- [ ] master から main ブランチへ移行
- [ ] ローカルで CI が成功することを確認（`pnpm --filter=backend lint && pnpm --filter=backend typecheck && pnpm --filter=backend test`）
- [ ] PR を作成して CI が自動実行されることを確認
- [ ] main へマージしてデプロイが成功することを確認

### 📚 関連ドキュメント

- [ESLint と Prettier セットアップガイド](./eslint-prettier-setup-guide.md)
- [ESLint TypeScript Parser エラー](./eslint-typescript-parser-error.md)
- [ESLint v9 設定](./eslint_v9_config.md)

### 🎯 次のステップ

1. **ヘルスチェックエンドポイントの実装**
2. **テストカバレッジレポートの導入**
3. **ステージング環境の構築**
4. **通知機能の追加**（Slack, Discord など）

---

**作成日**: 2025-11-16
**最終更新**: 2025-11-16
