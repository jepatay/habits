import { useNavigate } from 'react-router-dom';
import GridCell from './GridCell';
import { parseDateKey, todayKey } from '../../utils/dates';

const CELL_SIZE = 28; // 40 * 0.7, per request to shrink the grid boxes
const CELL_GAP = 3;
const NAME_COL_WIDTH = 200;

export default function HabitGrid({
  habits,
  entriesByHabit,
  dateKeys,
  editable,
  canManageHabits,
  onCellChange,
  onEditHabit,
}) {
  const today = todayKey();
  const navigate = useNavigate();

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'inline-block', minWidth: '100%' }}>
        <div style={{ display: 'flex', gap: CELL_GAP, paddingLeft: NAME_COL_WIDTH }}>
          {dateKeys.map((key) => {
            const d = parseDateKey(key);
            return (
              <div
                key={key}
                style={{
                  width: CELL_SIZE,
                  flexShrink: 0,
                  textAlign: 'center',
                  fontSize: '0.65rem',
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
          <div key={habit.id} style={{ display: 'flex', alignItems: 'center', marginTop: 6 }}>
            <div
              style={{
                width: NAME_COL_WIDTH,
                flexShrink: 0,
                paddingRight: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: habit.color,
                  flexShrink: 0,
                }}
              />
              <span
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/habits/${habit.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/habits/${habit.id}`)}
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  flex: 1,
                  minWidth: 0,
                }}
                title={habit.name}
              >
                {habit.name}
              </span>
              {canManageHabits && (
                <button
                  type="button"
                  onClick={() => onEditHabit(habit)}
                  aria-label={`Edit ${habit.name}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-faint)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    flexShrink: 0,
                    padding: 2,
                  }}
                >
                  ✎
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: CELL_GAP }}>
              {dateKeys.map((key) => (
                <GridCell
                  key={key}
                  habit={habit}
                  entry={entriesByHabit.get(habit.id)?.get(key)}
                  editable={editable}
                  size={CELL_SIZE}
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
