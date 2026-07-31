import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import SortableHabitRow from './SortableHabitRow';
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
  onReorder,
}) {
  const today = todayKey();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = habits.findIndex((h) => h.id === active.id);
    const newIndex = habits.findIndex((h) => h.id === over.id);
    onReorder(arrayMove(habits, oldIndex, newIndex).map((h) => h.id));
  }

  return (
    <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
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

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={habits.map((h) => h.id)} strategy={verticalListSortingStrategy}>
            {habits.map((habit) => (
              <SortableHabitRow
                key={habit.id}
                habit={habit}
                dateKeys={dateKeys}
                entriesByDate={entriesByHabit.get(habit.id) || new Map()}
                editable={editable}
                canManageHabits={canManageHabits}
                cellSize={CELL_SIZE}
                cellGap={CELL_GAP}
                nameColWidth={NAME_COL_WIDTH}
                onCellChange={onCellChange}
                onEditHabit={onEditHabit}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
