import { useState, useEffect } from 'react';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://monorepo-pnpm-turbo-backend.toshiaki-mukai-9981.workers.dev';

function App() {
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/`)
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>🚀 Monorepo PNPM Turbo - Frontend</h1>
      <div style={{ marginTop: '2rem' }}>
        <h2>Backend API Response:</h2>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {message && (
          <p style={{ fontSize: '1.5rem', color: 'green' }}>{message}</p>
        )}
      </div>
      <div style={{ marginTop: '2rem' }}>
        <h3>Technologies:</h3>
        <ul>
          <li>⚛️ React 18</li>
          <li>⚡ Vite</li>
          <li>📘 TypeScript</li>
          <li>✅ Vitest</li>
          <li>🎨 ESLint + Prettier</li>
          <li>☁️ Cloudflare Pages</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
