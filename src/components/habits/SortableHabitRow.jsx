import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import GridCell from './GridCell';

export default function SortableHabitRow({
  habit,
  dateKeys,
  entriesByDate,
  editable,
  canManageHabits,
  cellSize,
  cellGap,
  nameColWidth,
  onCellChange,
  onEditHabit,
}) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1 : 'auto',
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={{ ...style, display: 'flex', alignItems: 'center', marginTop: 6 }}>
      <div
        style={{
          width: nameColWidth,
          flexShrink: 0,
          paddingRight: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          background: 'var(--bg)',
        }}
      >
        {canManageHabits && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${habit.name}`}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-faint)',
              fontSize: '0.85rem',
              cursor: 'grab',
              touchAction: 'none',
              flexShrink: 0,
              padding: 2,
            }}
          >
            ☰
          </button>
        )}
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
      <div style={{ display: 'flex', gap: cellGap }}>
        {dateKeys.map((key) => (
          <GridCell
            key={key}
            habit={habit}
            entry={entriesByDate.get(key)}
            editable={editable}
            size={cellSize}
            onChange={(value) => onCellChange(habit, key, value)}
          />
        ))}
      </div>
    </div>
  );
}
