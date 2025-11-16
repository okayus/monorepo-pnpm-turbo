# ESLint と Prettier のセットアップガイド

このガイドでは、TypeScript プロジェクトに ESLint と Prettier を導入する手順を詳しく説明します。

## 目次

1. [必要なパッケージのインストール](#1-必要なパッケージのインストール)
2. [ESLint 設定ファイルの作成](#2-eslint-設定ファイルの作成)
3. [Prettier 設定ファイルの作成](#3-prettier-設定ファイルの作成)
4. [package.json の更新](#4-packagejson-の更新)
5. [TypeScript 設定の確認](#5-typescript-設定の確認)
6. [VS Code 設定](#6-vs-code-設定)
7. [動作確認](#7-動作確認)
8. [注意点とトラブルシューティング](#8-注意点とトラブルシューティング)

---

## 1. 必要なパッケージのインストール

プロジェクトのルートディレクトリで以下のコマンドを実行します：

```bash
pnpm add -D eslint @eslint/js typescript-eslint prettier eslint-config-prettier
```

### インストールされるパッケージの説明

| パッケージ | 説明 |
|-----------|------|
| `eslint` | ESLint のコア機能（v9.x系） |
| `@eslint/js` | ESLint の推奨ルールセット |
| `typescript-eslint` | TypeScript 用の ESLint プラグインとパーサー |
| `prettier` | コードフォーマッター |
| `eslint-config-prettier` | ESLint と Prettier のルール競合を解決 |

---

## 2. ESLint 設定ファイルの作成

### eslint.config.js を作成

**ファイル名**: `eslint.config.js` (プロジェクトルート)

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  // 無視するファイル・ディレクトリ
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.wrangler/**',
      'eslint.config.js',
    ],
  },

  // 推奨ルールセットの適用
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,

  // TypeScript ファイル用の設定
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript 固有のルール
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',

      // 一般的なルール
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
```

### ⚠️ 重要: ESLint v9 フラットコンフィグについて

ESLint v9 から新しい「フラットコンフィグ」システムが標準になりました：

- **ファイル名**: `eslint.config.js` (旧: `.eslintrc.js`)
- **形式**: 配列をエクスポートする ESモジュール形式
- **利点**:
  - より柔軟な設定
  - プログラマティックな設定が可能
  - 設定の優先順位が明確

詳細は [eslint_v9_config.md](./eslint_v9_config.md) を参照してください。

---

## 3. Prettier 設定ファイルの作成

### .prettierrc を作成

**ファイル名**: `.prettierrc` (プロジェクトルート)

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### 設定項目の説明

| 設定項目 | 値 | 説明 |
|---------|-----|------|
| `semi` | `true` | ステートメントの末尾にセミコロンを追加 |
| `trailingComma` | `"es5"` | ES5で有効な箇所に末尾カンマを追加 |
| `singleQuote` | `true` | 文字列にシングルクォートを使用 |
| `printWidth` | `80` | 1行の最大文字数 |
| `tabWidth` | `2` | インデントのスペース数 |
| `useTabs` | `false` | タブの代わりにスペースを使用 |
| `arrowParens` | `"always"` | アロー関数の引数を常に括弧で囲む |
| `endOfLine` | `"lf"` | 改行コードを LF に統一 |

### .prettierignore を作成

**ファイル名**: `.prettierignore` (プロジェクトルート)

```
node_modules
dist
.wrangler
coverage
*.log
pnpm-lock.yaml
```

---

## 4. package.json の更新

### 4.1. "type": "module" の追加

package.json に `"type": "module"` を追加します：

```json
{
  "name": "your-project",
  "version": "1.0.0",
  "type": "module",  // ← これを追加
  "description": "",
  // ...
}
```

### 📝 "type": "module" が必要な理由

ESLint v9 のフラットコンフィグ（`eslint.config.js`）は **ES モジュール形式** で記述されています：

```javascript
// ES モジュール形式（import/export を使用）
import eslint from '@eslint/js';
export default [ /* 設定 */ ];
```

Node.js では、デフォルトで `.js` ファイルを **CommonJS** として扱います。ES モジュールを使用するには、以下のいずれかが必要です：

#### オプション1: package.json に "type": "module" を追加（推奨）

```json
{
  "type": "module"
}
```

- ✅ すべての `.js` ファイルが ES モジュールとして扱われる
- ✅ `import`/`export` が自然に使える
- ✅ 追加の拡張子変更が不要

#### オプション2: ファイル名を .mjs にする

```
eslint.config.mjs  // .js の代わりに .mjs
```

- ✅ package.json の変更不要
- ❌ ファイル拡張子を変更する必要がある
- ❌ 複数のファイルがある場合は全て変更が必要

**推奨**: モダンな Node.js プロジェクトでは `"type": "module"` を使用するのが一般的です。

### ⚠️ "type": "module" 使用時の注意点

1. **require() が使えなくなる**
   ```javascript
   // ❌ 使えない
   const fs = require('fs');

   // ✅ import を使用
   import fs from 'fs';
   ```

2. **__dirname と __filename が使えなくなる**
   ```javascript
   // ❌ 使えない
   console.log(__dirname);

   // ✅ 代替方法
   import { fileURLToPath } from 'url';
   import { dirname } from 'path';
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = dirname(__filename);
   ```

3. **CommonJS モジュールを使いたい場合**
   - ファイル拡張子を `.cjs` にする
   - または、dynamic import を使用: `await import('module')`

### 4.2. スクリプトの追加

package.json の `scripts` セクションに以下を追加します：

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "test": "vitest",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

#### スクリプトの説明

| スクリプト | 説明 |
|-----------|------|
| `lint` | コードの問題をチェック（修正なし） |
| `lint:fix` | 自動修正可能な問題を修正 |
| `format` | Prettier でコードをフォーマット |
| `format:check` | フォーマットが必要なファイルをチェック（CI用） |

---

## 5. TypeScript 設定の確認

ESLint が TypeScript のプロジェクト情報を参照するため、`tsconfig.json` が必要です。

### tsconfig.json の例

**ファイル名**: `tsconfig.json` (プロジェクトルート)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "types": ["@types/node"],
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
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", ".wrangler"]
}
```

### ✅ 確認ポイント

- `include` に lint 対象のディレクトリが含まれているか
- `exclude` に不要なディレクトリが指定されているか

---

## 6. VS Code 設定

### .vscode/settings.json を作成

**ファイル名**: `.vscode/settings.json` (プロジェクトルート)

```json
{
  // エディタ設定
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },

  // ESLint 設定
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "eslint.workingDirectories": [
    {
      "mode": "auto"
    }
  ],

  // Prettier 設定
  "prettier.requireConfig": true,

  // ファイルタイプ別のフォーマッター
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[jsonc]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### 設定の動作

- **保存時に自動フォーマット**: Prettier がコードを整形
- **保存時に自動修正**: ESLint が修正可能な問題を自動で修正
- **リアルタイムチェック**: 入力中に問題を検出

### 📦 必要な VS Code 拡張機能

以下の拡張機能をインストールしてください：

1. **ESLint** (`dbaeumer.vscode-eslint`)
2. **Prettier - Code formatter** (`esbenp.prettier-vscode`)

インストールコマンド:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
```

---

## 7. 動作確認

### 7.1. フォーマットの実行

```bash
pnpm run format
```

すべてのファイルが Prettier でフォーマットされます。

### 7.2. Lint チェック

```bash
pnpm run lint
```

コードの問題がチェックされます。

### 7.3. 自動修正

```bash
pnpm run lint:fix
```

自動修正可能な問題が修正されます。

### ✅ 正常な動作の確認

```bash
$ pnpm run lint

> backend@1.0.0 lint
> eslint .

/path/to/file.ts
  9:1  warning  Unexpected console statement  no-console

✖ 1 problem (0 errors, 1 warning)
```

- **エラーが 0 件**: 設定が正しく動作しています
- **警告のみ**: コード品質に関する警告（正常）

---

## 8. 注意点とトラブルシューティング

### 8.1. 設定の反映が遅い場合

**問題**: ESLint の設定変更が VS Code に反映されない

**解決策**:
1. VS Code でコマンドパレットを開く（`Cmd+Shift+P` / `Ctrl+Shift+P`）
2. "ESLint: Restart ESLint Server" を実行
3. または、VS Code を再起動

### 8.2. "was not found by the project service" エラー

**問題**: TypeScript ファイルで以下のエラーが表示される
```
Parsing error: /path/to/file.ts was not found by the project service
```

**解決策**: [eslint-typescript-parser-error.md](./eslint-typescript-parser-error.md) を参照

### 8.3. ESLint と Prettier のルールが競合

**問題**: ESLint でフォーマットを修正しても、Prettier が元に戻す

**解決策**: `eslint-config-prettier` が正しくインポートされているか確認
```javascript
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  // ...
  eslintConfigPrettier,  // ✅ 最後に配置
];
```

### 8.4. モノレポでの設定

**問題**: モノレポで各パッケージに異なる設定を適用したい

**解決策**:
- 各パッケージに `eslint.config.js` を配置
- または、ルートの設定で `files` パターンを使用

```javascript
export default [
  {
    files: ['packages/backend/**/*.ts'],
    rules: {
      // backend 固有のルール
    },
  },
  {
    files: ['packages/frontend/**/*.ts'],
    rules: {
      // frontend 固有のルール
    },
  },
];
```

### 8.5. パフォーマンスの最適化

大規模プロジェクトで ESLint が遅い場合：

1. **ignores を適切に設定**
   ```javascript
   {
     ignores: [
       'node_modules/**',
       'dist/**',
       '**/*.min.js',
       'coverage/**',
     ],
   }
   ```

2. **型チェックを必要としないルールのみ使用**
   ```javascript
   // parserOptions.project を削除すると高速化
   ...tseslint.configs.recommended  // 型情報不要
   ```

---

## まとめ

### ✅ セットアップ完了チェックリスト

- [ ] パッケージをインストール（eslint, prettier など）
- [ ] `eslint.config.js` を作成
- [ ] `.prettierrc` と `.prettierignore` を作成
- [ ] `package.json` に `"type": "module"` を追加
- [ ] `package.json` に lint/format スクリプトを追加
- [ ] `tsconfig.json` を確認
- [ ] `.vscode/settings.json` を作成
- [ ] VS Code 拡張機能をインストール
- [ ] `pnpm run lint` と `pnpm run format` で動作確認

### 📚 参考リンク

- [ESLint v9 Configuration Files](./eslint_v9_config.md)
- [ESLint 公式ドキュメント](https://eslint.org/)
- [Prettier 公式ドキュメント](https://prettier.io/)
- [typescript-eslint](https://typescript-eslint.io/)

### 🎯 次のステップ

1. **CI/CD への組み込み**: GitHub Actions などで自動チェック
2. **pre-commit フック**: Husky と lint-staged で commit 前にチェック
3. **カスタムルール**: プロジェクト固有のルールを追加

---

**作成日**: 2025-11-16
**最終更新**: 2025-11-16
