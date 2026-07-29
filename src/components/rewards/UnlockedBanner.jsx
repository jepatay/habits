import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUnlockedRewards } from '../../hooks/useUnlockedRewards';

export default function UnlockedBanner() {
  const { user } = useAuth();
  const { newlyUnlocked } = useUnlockedRewards(user?.uid);
  const [dismissed, setDismissed] = useState(false);

  if (!newlyUnlocked.length || dismissed) return null;

  const first = newlyUnlocked[0];
  const extra = newlyUnlocked.length - 1;

  return (
    <div className="banner success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <Link to="/rewards" style={{ color: 'inherit', textDecoration: 'none', flex: 1 }}>
        🎉 Unlocked: <strong>{first.reward.name}</strong> ({first.reward.reward_text})
        {extra > 0 ? ` +${extra} more` : ''}
      </Link>
      <button
        className="btn ghost"
        style={{ padding: '2px 8px' }}
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
