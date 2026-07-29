import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { user, login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      // error surfaced via context
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: '100%', maxWidth: 360 }}>
        <h1 style={{ fontSize: '1.4rem', margin: '0 0 4px' }}>✓ Habits</h1>
        <p style={{ color: 'var(--text-dim)', margin: 0, fontSize: '0.9rem' }}>Sign in to continue</p>

        {error && <div className="banner error" style={{ marginTop: 16 }}>{error}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" className="btn block" style={{ marginTop: 20 }} disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p style={{ color: 'var(--text-faint)', fontSize: '0.75rem', marginTop: 16, textAlign: 'center' }}>
          Accounts are created by the admin. No public sign-up.
        </p>
      </form>
    </div>
  );
}
