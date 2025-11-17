# Cloudflare Pages セットアップガイド

このガイドでは、フロントエンドアプリケーションを Cloudflare Pages にデプロイする設定方法を説明します。

## 目次

1. [Cloudflare Pages とは](#cloudflare-pages-とは)
2. [前提条件](#前提条件)
3. [GitHub Actions経由のデプロイ](#github-actions経由のデプロイ)
4. [手動デプロイ](#手動デプロイ)
5. [環境変数の設定](#環境変数の設定)
6. [カスタムドメインの設定](#カスタムドメインの設定)
7. [トラブルシューティング](#トラブルシューティング)

---

## Cloudflare Pages とは

**Cloudflare Pages** は、Jamstack サイトやシングルページアプリケーション (SPA) のための高速なホスティングプラットフォームです。

### 主な特徴

- ✅ **高速なグローバルCDN** - 世界中にコンテンツを配信
- ✅ **無料プラン** - 月500ビルド、無制限のリクエスト
- ✅ **自動デプロイ** - GitHubからの自動デプロイ
- ✅ **プレビュー環境** - Pull Requestごとのプレビュー
- ✅ **Cloudflare Workers統合** - バックエンドとシームレスに連携
- ✅ **HTTPS自動設定** - 無料のSSL証明書

---

## 前提条件

### 必要なもの

1. **Cloudflareアカウント**
   - https://dash.cloudflare.com/ でアカウント作成

2. **Cloudflare API Token**
   - Workers & Pages の編集権限が必要

3. **Cloudflare Account ID**
   - ダッシュボードで確認可能

4. **GitHub リポジトリ**
   - ソースコードがホストされているリポジトリ

---

## GitHub Actions経由のデプロイ

### 1. GitHub Secrets の設定

GitHub リポジトリの **Settings** > **Secrets and variables** > **Actions** で以下を追加：

```
CLOUDFLARE_API_TOKEN=<your-api-token>
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
```

### 2. API Tokenの作成

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. **My Profile** > **API Tokens** に移動
3. **Create Token** をクリック
4. **Edit Cloudflare Workers** テンプレートを選択
5. 権限を設定：
   ```
   Account > Cloudflare Pages > Edit
   ```
6. トークンを作成してコピー

### 3. Account IDの確認

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. **Workers & Pages** に移動
3. 右サイドバーに表示されている **Account ID** をコピー

### 4. デプロイワークフローの確認

`.github/workflows/deploy.yml` が既に設定されています：

```yaml
- name: 🚀 Deploy to Cloudflare Pages
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: pages deploy dist --project-name=monorepo-pnpm-turbo-frontend
    workingDirectory: packages/frontend
```

### 5. デプロイの実行

mainブランチにマージすると自動的にデプロイされます：

```bash
git checkout main
git merge your-feature-branch
git push origin main
```

---

## 手動デプロイ

### Wrangler CLI を使用

```bash
# フロントエンドをビルド
cd packages/frontend
pnpm build

# 初回のみ：プロジェクトを作成
wrangler pages project create monorepo-pnpm-turbo-frontend

# Cloudflare Pages にデプロイ
wrangler pages deploy dist --project-name=monorepo-pnpm-turbo-frontend --commit-dirty=true
```

### 初回デプロイ

初回デプロイ時は、まずプロジェクトを手動で作成する必要があります：

```bash
# 1. プロジェクトを作成
wrangler pages project create monorepo-pnpm-turbo-frontend

# 出力例：
✨ Successfully created the 'monorepo-pnpm-turbo-frontend' project.
   Production branch: main

# 2. デプロイを実行
wrangler pages deploy dist --project-name=monorepo-pnpm-turbo-frontend --commit-dirty=true

# 出力例：
🌎 Deploying...
✨ Deployment complete!
   https://fa0571f0.monorepo-pnpm-turbo-frontend.pages.dev
```

**注意**:
- プロジェクトが存在しない場合、`wrangler pages project create` で事前に作成が必要です
- git管理下で未コミットの変更がある場合は `--commit-dirty=true` フラグを追加してください
- デプロイURLは一意のハッシュ（例：fa0571f0）付きで生成されます

---

## 環境変数の設定

### ローカル開発用

`.env.local` ファイルを作成：

```bash
cd packages/frontend
cp .env.example .env.local
```

`.env.local` を編集：

```env
VITE_API_BASE_URL=https://monorepo-pnpm-turbo-backend.toshiaki-mukai-9981.workers.dev
```

### Cloudflare Pages 本番環境用

環境変数は **ビルド時に埋め込まれる** ため、GitHub Actions の workflow で設定します：

```yaml
- name: 🏗️ Build Frontend
  run: pnpm --filter=frontend build
  env:
    VITE_API_BASE_URL: https://monorepo-pnpm-turbo-backend.toshiaki-mukai-9981.workers.dev
```

または、Cloudflare Dashboard で設定：

1. **Workers & Pages** > **monorepo-pnpm-turbo-frontend** に移動
2. **Settings** > **Environment variables** をクリック
3. 環境変数を追加：
   ```
   VITE_API_BASE_URL=https://monorepo-pnpm-turbo-backend.toshiaki-mukai-9981.workers.dev
   ```

**注意**: Viteの環境変数は `VITE_` プレフィックスが必要です。

---

## カスタムドメインの設定

### 1. ドメインの追加

1. **Workers & Pages** > **monorepo-pnpm-turbo-frontend** に移動
2. **Custom domains** タブをクリック
3. **Set up a custom domain** をクリック
4. ドメイン名を入力（例: `app.example.com`）
5. DNSレコードを追加（自動または手動）

### 2. DNS設定

Cloudflareが管理しているドメインの場合：
- 自動的にCNAMEレコードが追加されます

外部DNSの場合：
```
CNAME  app.example.com  monorepo-pnpm-turbo-frontend.pages.dev
```

### 3. HTTPSの有効化

Cloudflare Pagesは自動的にHTTPSを有効化します：
- 無料のSSL証明書が自動発行
- HTTP → HTTPS リダイレクトが自動設定

---

## プレビュー環境

### Pull Request ごとのプレビュー

Cloudflare Pagesは、PRごとに一時的なプレビュー環境を作成できます。

**設定方法**:

1. **Workers & Pages** > **monorepo-pnpm-turbo-frontend** > **Settings**
2. **Builds & deployments** > **Preview deployments** を有効化
3. PR作成時に自動的にプレビューURLが生成されます

**プレビューURL例**:
```
https://abc123.monorepo-pnpm-turbo-frontend.pages.dev
```

### GitHub Actionsでプレビュー環境を作成

`.github/workflows/deploy.yml` に追加：

```yaml
on:
  pull_request:
    branches: [main]

jobs:
  deploy-preview:
    if: github.event_name == 'pull_request'
    # ... プレビューデプロイの設定
```

---

## トラブルシューティング

### 1. デプロイが失敗する

**症状**: `wrangler pages deploy` が失敗する

**解決策**:

```bash
# API Tokenを確認
echo $CLOUDFLARE_API_TOKEN

# Account IDを確認
echo $CLOUDFLARE_ACCOUNT_ID

# Wranglerを最新版に更新
pnpm add -g wrangler@latest

# ログイン状態を確認
wrangler whoami
```

### 2. 環境変数が反映されない

**症状**: `import.meta.env.VITE_API_BASE_URL` が `undefined`

**解決策**:

1. **環境変数名を確認**
   - `VITE_` プレフィックスが付いているか
   - スペルミスがないか

2. **ビルド時に設定されているか確認**
   ```bash
   # ローカルでビルド
   VITE_API_BASE_URL=http://localhost:8787 pnpm build

   # distディレクトリのファイルを確認
   grep -r "VITE_API_BASE_URL" dist/
   ```

3. **GitHub Actionsのログを確認**
   - 環境変数が正しく設定されているか
   - ビルドログに値が表示されているか（セキュアな値は ***）

### 3. CORSエラー

**症状**: `Access-Control-Allow-Origin` エラー

**解決策**:

1. **Backend の CORS設定を確認**
   ```typescript
   // packages/backend/src/index.ts
   app.use('/*', cors({
     origin: [
       'http://localhost:5173',
       'https://monorepo-pnpm-turbo-frontend.pages.dev',  // ← これを追加
     ],
   }))
   ```

2. **カスタムドメインを使用している場合**
   ```typescript
   origin: [
     'https://app.example.com',  // カスタムドメインも追加
   ],
   ```

### 4. ビルドエラー

**症状**: ビルド中に `Module not found` エラー

**解決策**:

```bash
# 依存関係を再インストール
rm -rf node_modules pnpm-lock.yaml
pnpm install

# ビルド
pnpm build
```

### 5. デプロイ後にページが表示されない

**症状**: デプロイは成功するが、404エラーが表示される

**解決策**:

1. **_routesファイルを確認**（SPAの場合）

   `public/_routes.json` を作成：
   ```json
   {
     "version": 1,
     "include": ["/*"],
     "exclude": []
   }
   ```

2. **index.htmlが正しく出力されているか確認**
   ```bash
   ls -la packages/frontend/dist/
   # index.html が存在するか確認
   ```

---

## パフォーマンス最適化

### 1. キャッシュ設定

Cloudflare Pagesは自動的に静的アセットをキャッシュします。

推奨設定：
- **HTML**: キャッシュなし（常に最新）
- **JS/CSS**: バージョン付きファイル名でキャッシュ
- **画像**: 長期キャッシュ

### 2. Build Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
```

### 3. 画像最適化

- WebP形式を使用
- 適切なサイズにリサイズ
- Cloudflare Imagesの活用（オプション）

---

## Cloudflare Analytics

### アクセス解析の有効化

1. **Workers & Pages** > **monorepo-pnpm-turbo-frontend**
2. **Analytics** タブをクリック
3. **Web Analytics** を有効化
4. スクリプトタグをHTMLに追加（自動）

### 利用可能なメトリクス

- ページビュー
- ユニークビジター
- 国別アクセス
- デバイス情報
- パフォーマンスメトリクス

---

## まとめ

### ✅ セットアップ完了チェックリスト

- [ ] Cloudflare APIトークンを取得
- [ ] GitHub Secretsを設定
- [ ] デプロイワークフローを確認
- [ ] mainブランチにマージしてデプロイ
- [ ] デプロイURLにアクセス可能
- [ ] バックエンドAPIとの通信が成功
- [ ] （オプション）カスタムドメインを設定

### 📚 関連リンク

- [Cloudflare Pages 公式ドキュメント](https://developers.cloudflare.com/pages/)
- [Wrangler CLI ドキュメント](https://developers.cloudflare.com/workers/wrangler/)
- [フロントエンドセットアップガイド](./frontend-setup.md)

---

**作成日**: 2025-11-17
**最終更新**: 2025-11-17
