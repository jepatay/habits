import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { updateUserDoc } from '../firebase/firestore';
import ColorPicker from '../components/common/ColorPicker';
import { usePushSubscription } from '../push/usePushSubscription';

export default function SettingsPage() {
  const { user, profile, isAdmin, logout } = useAuth();
  const { supported, permission, enabled, busy, enablePush, disablePush } = usePushSubscription();

  async function handleColorChange(color) {
    await updateUserDoc(user.uid, { colorTheme: color });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="card">
        <p style={{ margin: 0, fontWeight: 600 }}>{profile?.name}</p>
        <p style={{ margin: '2px 0 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          {isAdmin ? 'Admin' : 'Member'}
        </p>
      </div>

      <label>Theme color</label>
      <ColorPicker value={profile?.colorTheme} onChange={handleColorChange} />

      <div className="card" style={{ marginTop: 16 }}>
        <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Push notifications</p>
        {!supported ? (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: 0 }}>
            Not supported on this browser. Daily email reminders will be used instead.
          </p>
        ) : (
          <>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '0 0 10px' }}>
              {enabled
                ? 'Reminders will be sent as push notifications on this device.'
                : 'Turn on push notifications to get per-habit reminders on this device.'}
            </p>
            <button
              className="btn secondary"
              disabled={busy || permission === 'denied'}
              onClick={enabled ? disablePush : enablePush}
            >
              {permission === 'denied'
                ? 'Blocked in browser settings'
                : enabled
                  ? 'Disable push'
                  : 'Enable push'}
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link to="/data" className="btn secondary block" style={{ textDecoration: 'none' }}>
          Import / Export data
        </Link>
        {isAdmin && (
          <Link to="/admin" className="btn secondary block" style={{ textDecoration: 'none' }}>
            Admin: manage users & rewards
          </Link>
        )}
        <button className="btn danger block" onClick={logout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
