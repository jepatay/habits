import { Link } from 'react-router-dom';
import GridCell from './GridCell';
import { parseDateKey, todayKey } from '../../utils/dates';

export default function HabitGrid({ habits, entriesByHabit, dateKeys, editable, onCellChange }) {
  const today = todayKey();

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'inline-block', minWidth: '100%' }}>
        <div style={{ display: 'flex', paddingLeft: 132 }}>
          {dateKeys.map((key) => {
            const d = parseDateKey(key);
            return (
              <div
                key={key}
                style={{
                  width: 40,
                  flexShrink: 0,
                  textAlign: 'center',
                  fontSize: '0.7rem',
                  color: key === today ? 'var(--accent)' : 'var(--text-faint)',
                  fontWeight: key === today ? 700 : 400,
                }}
              >
                <div>{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                <div>{d.getDate()}</div>
              </div>
            );
          })}
        </div>

        {habits.map((habit) => (
          <div key={habit.id} style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
            <Link
              to={`/habits/${habit.id}`}
              style={{
                width: 132,
                flexShrink: 0,
                paddingRight: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                textDecoration: 'none',
                color: 'var(--text)',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: habit.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.85rem',
                }}
                title={habit.name}
              >
                {habit.name}
              </span>
            </Link>
            <div style={{ display: 'flex', gap: 4 }}>
              {dateKeys.map((key) => (
                <GridCell
                  key={key}
                  habit={habit}
                  entry={entriesByHabit.get(habit.id)?.get(key)}
                  editable={editable}
                  onChange={(value) => onCellChange(habit, key, value)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
