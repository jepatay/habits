import { NavLink } from 'react-router-dom';
import { usePendingRewardsCount } from '../../hooks/usePendingRewardsCount';

const items = [
  { to: '/', label: 'Habits', icon: '✓', end: true },
  { to: '/rewards', label: 'Rewards', icon: '🏆' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export default function BottomNav() {
  const pendingRewardsCount = usePendingRewardsCount();

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="nav-icon" style={{ position: 'relative' }}>
            {item.icon}
            {item.to === '/rewards' && pendingRewardsCount > 0 && (
              <span className="nav-badge">{pendingRewardsCount}</span>
            )}
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
