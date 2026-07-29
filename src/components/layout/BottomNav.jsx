import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'Habits', icon: '✓', end: true },
  { to: '/rewards', label: 'Rewards', icon: '🏆' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
