import { Suspense } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TaskList } from './components/TaskList';

function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Monorepo PNPM Turbo - Frontend</h1>
      <div style={{ marginTop: '2rem' }}>
        <h2>Backend API Response:</h2>
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
      <div style={{ marginTop: '2rem' }}>
        <h3>Technologies:</h3>
        <ul>
          <li>React 18</li>
          <li>Vite</li>
          <li>TypeScript</li>
          <li>Vitest</li>
          <li>ESLint + Prettier</li>
          <li>Cloudflare Pages</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
