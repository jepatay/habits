import { useAuth } from '../../contexts/AuthContext';
import { useViewedUser } from '../../contexts/ViewedUserContext';

export default function TopBar() {
  const { profile, isAdmin } = useAuth();
  const { viewedUid, setViewedUid, users } = useViewedUser();

  return (
    <header className="top-bar">
      <div className="brand">
        <span>✓</span>
        <span>Habits</span>
      </div>
      {isAdmin && users.length > 0 ? (
        <div className="user-switcher">
          <select value={viewedUid || ''} onChange={(e) => setViewedUid(e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{profile?.name}</span>
      )}
    </header>
  );
}
