import { useState } from 'react';
import { adminCreateUser } from '../../firebase/adminAuth';
import { HABIT_COLORS } from '../common/ColorPicker';

function randomPassword() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2, 6);
}

export default function AddUserForm({ onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [password, setPassword] = useState(randomPassword());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const color = HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)];
      await adminCreateUser({ name: name.trim(), email: email.trim(), password, role, colorTheme: color });
      setCreated({ email, password });
      setCopied(false);
      setName('');
      setEmail('');
      setPassword(randomPassword());
      onCreated?.();
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use' ? 'That email is already registered.' : 'Could not create user.');
    } finally {
      setSaving(false);
    }
  }

  function inviteText() {
    return `You've been invited to Habits: ${window.location.origin}\nEmail: ${created.email}\nPassword: ${created.password}`;
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <p style={{ margin: '0 0 4px', fontWeight: 700 }}>Add user</p>

      {created && (
        <div className="banner success">
          <p style={{ margin: '0 0 8px' }}>
            Created {created.email} — have them change the password after first login.
          </p>
          <pre
            style={{
              margin: '0 0 8px',
              padding: 10,
              background: 'var(--bg-elevated)',
              borderRadius: 8,
              fontSize: '0.8rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {inviteText()}
          </pre>
          <button type="button" className="btn secondary" onClick={handleCopy}>
            {copied ? '✓ Copied' : '📋 Copy invite'}
          </button>
        </div>
      )}
      {error && <div className="banner error">{error}</div>}

      <label htmlFor="new-user-name">Name</label>
      <input id="new-user-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />

      <label htmlFor="new-user-email">Email</label>
      <input id="new-user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

      <label htmlFor="new-user-role">Role</label>
      <select id="new-user-role" value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>

      <label htmlFor="new-user-password">Temporary password</label>
      <input
        id="new-user-password"
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
      />

      <button type="submit" className="btn block" style={{ marginTop: 16 }} disabled={saving}>
        {saving ? 'Creating…' : 'Create user'}
      </button>
    </form>
  );
}
