# useEffect での fetch がアンチパターンである理由と解決策

## 概要

React 18 以降、`useEffect` 内でのデータ取得（fetch）はアンチパターンとされています。本ドキュメントでは、その理由と Suspense + TanStack Query を使った解決策を解説します。

---

## 1. なぜ useEffect での fetch がアンチパターンなのか

### 1.1 従来のパターン（問題のあるコード）

```typescript
function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/data');
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  return <div>{/* data を表示 */}</div>;
}
```

### 1.2 問題点

#### (1) 競合状態（Race Condition）

```typescript
useEffect(() => {
  fetchData(); // リクエスト A
}, []);

// ユーザーが素早くページ遷移すると...
// リクエスト A の結果がアンマウント後に返ってくる可能性
```

コンポーネントがアンマウントされた後に `setData()` が呼ばれると：
- メモリリーク
- React の警告: "Can't perform a React state update on an unmounted component"

#### (2) ウォーターフォール問題

```
コンポーネント A マウント
    ↓
useEffect 実行 → fetch A 開始
    ↓ (待機)
fetch A 完了 → 子コンポーネント B レンダリング
    ↓
コンポーネント B の useEffect → fetch B 開始
    ↓ (待機)
fetch B 完了
```

親子関係のコンポーネントで順番にfetchが実行され、**直列的な遅延**が発生します。

#### (3) ボイラープレートコードの増加

毎回3つの状態を管理する必要があります：

```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
```

#### (4) キャッシュがない

- 同じデータを何度もfetch
- ページ遷移のたびにローディング表示
- ユーザー体験の悪化

#### (5) StrictMode での二重実行

React 18 の StrictMode では、開発環境で useEffect が2回実行されます：

```typescript
useEffect(() => {
  fetchData(); // 1回目
  fetchData(); // 2回目（StrictMode）
}, []);
```

これにより、同じAPIが2回呼ばれる問題が発生します。

#### (6) Suspense と非互換

useEffect パターンでは、React 18 の Suspense によるローディング UI の宣言的な記述ができません。

---

## 2. どのように修正したか

### 2.1 Before: useEffect パターン

```typescript
// App.tsx (修正前)
import { useState, useEffect } from 'react';
import { hc } from 'hono/client';

function App() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const client = hc<AppType>(API_BASE_URL);
      const response = await client.api.tasks.$get();
      const data = await response.json();
      setMessage(`Fetched ${data.tasks.length} tasks`);
    } catch (err) {
      setError(`Failed to fetch: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p>{message}</p>}
    </div>
  );
}
```

### 2.2 After: Suspense + TanStack Query

#### ファイル構成

```
src/
├── lib/
│   └── api.ts              # APIクライアント設定
├── providers/
│   └── QueryProvider.tsx   # QueryClient設定
├── hooks/
│   └── useTasks.ts         # データ取得フック
├── components/
│   ├── TaskList.tsx        # データ表示コンポーネント
│   └── ErrorBoundary.tsx   # エラーハンドリング
├── main.tsx                # エントリーポイント
└── App.tsx                 # メインコンポーネント
```

#### lib/api.ts

```typescript
import { hc } from 'hono/client';
import type { AppType } from '../../../backend/src/index';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://example.workers.dev';

export const apiClient = hc<AppType>(API_BASE_URL);
```

#### hooks/useTasks.ts

```typescript
import { useSuspenseQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

export function useTasks() {
  return useSuspenseQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await apiClient.api.tasks.$get();
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return response.json();
    },
  });
}
```

#### components/TaskList.tsx

```typescript
import { useTasks } from '../hooks/useTasks';

export function TaskList() {
  const { data } = useTasks();

  return (
    <p style={{ fontSize: '1.5rem', color: 'green' }}>
      Fetched {data.tasks.length} tasks from backend.
    </p>
  );
}
```

#### components/ErrorBoundary.tsx

```typescript
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') {
        return fallback(this.state.error, this.reset);
      }
      return fallback;
    }
    return this.props.children;
  }
}
```

**ErrorBoundary の役割:**

ErrorBoundary は React のクラスコンポーネントで、**子コンポーネントで発生したエラーをキャッチ**します。

| メソッド/プロパティ | 役割 |
|---------------------|------|
| `getDerivedStateFromError` | エラー発生時に state を更新（静的メソッド） |
| `componentDidCatch` | エラーログの記録（副作用を実行可能） |
| `reset` | エラー状態をリセットしてリトライ可能にする |
| `fallback` | エラー時に表示する UI（関数または ReactNode） |

**なぜ必要か:**

Suspense でデータ取得中にエラーが発生した場合、そのエラーは親コンポーネントに伝播します。ErrorBoundary がないと、アプリ全体がクラッシュしてしまいます。

```
正常時:
  Suspense → TaskList → useSuspenseQuery → データ表示

エラー時（ErrorBoundary あり）:
  Suspense → TaskList → useSuspenseQuery → throw Error
      ↓
  ErrorBoundary がキャッチ → fallback UI を表示

エラー時（ErrorBoundary なし）:
  Suspense → TaskList → useSuspenseQuery → throw Error
      ↓
  アプリ全体がクラッシュ（白い画面）
```

**なぜクラスコンポーネントか:**

React では `getDerivedStateFromError` と `componentDidCatch` はクラスコンポーネントでのみ使用可能です。関数コンポーネントで同等の機能を持つフックは現時点で提供されていません。

**React はどうやって自動的にこれらのメソッドを呼び出すのか:**

React の内部では、コンポーネントツリーのレンダリング時にエラーハンドリングの仕組みが組み込まれています。

```
┌─────────────────────────────────────────────────────────────────┐
│ React の内部動作（簡略化）                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. React がコンポーネントをレンダリング                           │
│     │                                                           │
│     ▼                                                           │
│  ┌─────────────────────────────────────────┐                    │
│  │ try {                                   │                    │
│  │   // 子コンポーネントをレンダリング        │                    │
│  │   render(childComponent);               │                    │
│  │ } catch (error) {                       │                    │
│  │   // エラー発生！                        │                    │
│  │   // 親を遡って ErrorBoundary を探す     │                    │
│  │   findNearestErrorBoundary(error);      │                    │
│  │ }                                       │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                 │
│  2. ErrorBoundary が見つかったら                                 │
│     │                                                           │
│     ▼                                                           │
│  ┌─────────────────────────────────────────┐                    │
│  │ // 静的メソッドを呼び出して新しい state を取得                  │
│  │ newState = ErrorBoundary                │                    │
│  │   .getDerivedStateFromError(error);     │                    │
│  │                                         │                    │
│  │ // state を更新                         │                    │
│  │ errorBoundary.setState(newState);       │                    │
│  │                                         │                    │
│  │ // 副作用用のメソッドを呼び出す            │                    │
│  │ errorBoundary                           │                    │
│  │   .componentDidCatch(error, errorInfo); │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                 │
│  3. ErrorBoundary が再レンダリング                               │
│     │                                                           │
│     ▼                                                           │
│  ┌─────────────────────────────────────────┐                    │
│  │ // hasError: true なので fallback を表示                      │
│  │ render() {                              │                    │
│  │   if (this.state.hasError) {            │                    │
│  │     return this.props.fallback(...);    │                    │
│  │   }                                     │                    │
│  │   return this.props.children;           │                    │
│  │ }                                       │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**具体的な流れ:**

```typescript
// 1. App.tsx でこのように書くと...
<ErrorBoundary fallback={...}>
  <TaskList />
</ErrorBoundary>

// 2. React はコンポーネントツリーを構築
//    この時、ErrorBoundary クラスに特別なメソッドがあるかチェック
//    - getDerivedStateFromError があるか？ → YES
//    - componentDidCatch があるか？ → YES
//    → このコンポーネントは「Error Boundary」としてマーク

// 3. TaskList 内でエラーが throw される
function TaskList() {
  const { data } = useTasks(); // ← ここで throw new Error('Failed')
  return <p>{data.tasks.length}</p>;
}

// 4. React がエラーをキャッチ
//    親コンポーネントを遡って「Error Boundary」を探す
//    → ErrorBoundary コンポーネントが見つかる

// 5. React が自動的にメソッドを呼び出す
ErrorBoundary.getDerivedStateFromError(error);  // state 更新
errorBoundaryInstance.componentDidCatch(error, info);  // ログ等

// 6. state が変わったので ErrorBoundary が再レンダリング
//    → fallback UI が表示される
```

**重要なポイント:**

| ポイント | 説明 |
|----------|------|
| **メソッドの検出** | React はクラスコンポーネントのインスタンス化時に、`getDerivedStateFromError` や `componentDidCatch` の存在をチェックする |
| **マーキング** | これらのメソッドを持つコンポーネントは内部的に「Error Boundary」としてフラグが立つ |
| **エラー伝播** | 子コンポーネントでエラーが発生すると、React は親を遡って最も近い Error Boundary を探す |
| **自動呼び出し** | Error Boundary が見つかると、React が該当メソッドを呼び出す（開発者は呼び出さない） |

**なぜ開発者が呼び出さなくてよいのか:**

これは React の「宣言的プログラミング」の思想です。

```typescript
// 命令的（開発者がエラーハンドリングを書く）
try {
  renderComponent();
} catch (error) {
  showErrorUI();
}

// 宣言的（React が自動でやってくれる）
<ErrorBoundary fallback={<ErrorUI />}>
  <MyComponent />
</ErrorBoundary>
```

開発者は「エラー時にどんな UI を見せたいか」を宣言するだけで、「いつ・どうやってエラーをキャッチするか」は React が内部で処理します。

#### App.tsx

```typescript
import { Suspense } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TaskList } from './components/TaskList';

function App() {
  return (
    <div>
      <h1>My App</h1>
      <ErrorBoundary
        fallback={(error, reset) => (
          <div style={{ color: 'red' }}>
            <p>Error: {error.message}</p>
            <button onClick={reset}>Retry</button>
          </div>
        )}
      >
        <Suspense fallback={<p>Loading...</p>}>
          <TaskList />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
```

#### main.tsx

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryProvider } from './providers/QueryProvider';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>
);
```

---

## 3. TanStack Query は何を解決するか

### 3.1 主要な機能

| 機能 | 説明 |
|------|------|
| **自動キャッシュ** | 同じqueryKeyのデータはキャッシュされ、再利用される |
| **Suspense対応** | `useSuspenseQuery` でPromiseをthrowし、親のSuspenseに委譲 |
| **バックグラウンド更新** | staleTimeを過ぎたデータは自動的に再取得 |
| **リトライ** | 失敗時の自動リトライ（設定可能） |
| **重複排除** | 同時に同じリクエストが複数発生しても1回だけ実行 |
| **ウィンドウフォーカス時の再取得** | タブがアクティブになった時にデータを更新 |

### 3.2 問題の解決

| 問題 | useEffect | TanStack Query |
|------|-----------|----------------|
| 競合状態 | 手動でクリーンアップ必要 | 自動で処理 |
| ウォーターフォール | 発生する | Suspenseで並列化可能 |
| ボイラープレート | 3つのstate管理 | フック1つで完結 |
| キャッシュ | なし | 自動キャッシュ |
| StrictMode二重実行 | 2回fetch | 重複排除で1回 |
| Suspense対応 | 非対応 | `useSuspenseQuery` |

### 3.3 キャッシュの動作

```
1回目のアクセス:
  useTasks() → fetch → キャッシュに保存 → 画面表示

2回目のアクセス（staleTime内）:
  useTasks() → キャッシュから即座に返却 → 画面表示（fetchなし）

2回目のアクセス（staleTime後）:
  useTasks() → キャッシュから即座に返却 → 画面表示
            → バックグラウンドでfetch → キャッシュ更新 → 画面更新
```

### 3.4 Suspense の利点

```typescript
// 宣言的なローディングUI
<Suspense fallback={<Skeleton />}>
  <TaskList />     {/* データ取得中はSuspenseがfallbackを表示 */}
</Suspense>

// 複数コンポーネントの並列読み込み
<Suspense fallback={<Loading />}>
  <TaskList />     {/* 並列でfetch */}
  <UserProfile />  {/* 並列でfetch */}
</Suspense>
```

---

## 4. まとめ

### useEffect での fetch を避けるべき理由

1. **競合状態**のリスク
2. **ウォーターフォール**による遅延
3. **ボイラープレート**の増加
4. **キャッシュなし**による無駄なリクエスト
5. **StrictMode**での二重実行
6. **Suspense**と非互換

### 推奨される代替手段

| ライブラリ | 特徴 |
|-----------|------|
| **TanStack Query** | 機能豊富、将来の拡張に強い |
| **SWR** | 軽量、シンプル |
| **React Router loader** | ルーティング統合 |
| **Next.js Server Components** | サーバーサイドでのデータ取得 |

### 参考リンク

- [React 公式ドキュメント - You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [TanStack Query 公式ドキュメント](https://tanstack.com/query/latest)
- [React 18 Suspense](https://react.dev/reference/react/Suspense)
