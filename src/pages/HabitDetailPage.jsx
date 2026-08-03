import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getHabit, subscribeEntriesForHabit, setEntry, deleteEntry } from '../firebase/firestore';
import { useViewedUser } from '../contexts/ViewedUserContext';
import { computeStreaks, bestStreaksList } from '../utils/streaks';
import {
  overviewStats,
  monthlyScoreSeries,
  quarterlyScoreSeries,
  weekdayScores,
  frequencyMetrics,
  contributionWeeks,
} from '../utils/habitStats';
import StatChips from '../components/habits/detail/StatChips';
import TrendsCard from '../components/habits/detail/TrendsCard';
import ContributionHeatmap from '../components/habits/detail/ContributionHeatmap';
import EditEntryModal from '../components/habits/detail/EditEntryModal';
import StreaksList from '../components/habits/detail/StreaksList';
import Spinner from '../components/common/Spinner';

function fmtDays(value) {
  return value == null ? '—' : `${value.toFixed(1)}d`;
}

export default function HabitDetailPage() {
  const { habitId } = useParams();
  const navigate = useNavigate();
  const { viewedUid, isViewingSelf } = useViewedUser();
  const [habit, setHabit] = useState(null);
  const [entries, setEntries] = useState([]);
  const [fullHistory, setFullHistory] = useState(false);
  const [editingCell, setEditingCell] = useState(null);

  useEffect(() => {
    getHabit(habitId).then(setHabit);
  }, [habitId]);

  useEffect(() => {
    if (!viewedUid) return undefined;
    return subscribeEntriesForHabit(habitId, viewedUid, setEntries);
  }, [habitId, viewedUid]);

  const streaks = useMemo(() => (habit ? computeStreaks(habit, entries) : null), [habit, entries]);
  const overview = useMemo(() => (habit ? overviewStats(habit, entries) : null), [habit, entries]);
  const frequency = useMemo(() => (habit ? frequencyMetrics(habit, entries) : null), [habit, entries]);
  const monthly = useMemo(() => (habit ? monthlyScoreSeries(habit, entries) : []), [habit, entries]);
  const quarterly = useMemo(() => (habit ? quarterlyScoreSeries(habit, entries) : []), [habit, entries]);
  const weekday = useMemo(() => (habit ? weekdayScores(habit, entries) : []), [habit, entries]);
  const heatmap = useMemo(
    () => (habit ? contributionWeeks(habit, entries, { monthsBack: fullHistory ? null : 12 }) : null),
    [habit, entries, fullHistory],
  );
  const bestStreaks = useMemo(() => (habit ? bestStreaksList(habit, entries, 10) : []), [habit, entries]);
  const entriesByDate = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries]);

  async function handleSaveEntry(value) {
    await setEntry(habit.id, viewedUid, editingCell.date, value);
    setEditingCell(null);
  }

  async function handleClearEntry() {
    await deleteEntry(habit.id, viewedUid, editingCell.date);
    setEditingCell(null);
  }

  if (!habit) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <button className="btn ghost" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: habit.color }} />
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>{habit.name}</h1>
      </div>
      {habit.question && <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '4px 0 12px' }}>{habit.question}</p>}

      <StatChips
        color={habit.color}
        score={overview.scorePercent}
        currentStreak={streaks.current}
        bestStreak={streaks.best}
        frequency={frequency}
      />
      <p style={{ margin: '0 0 20px', fontSize: '0.72rem', color: 'var(--text-faint)' }}>
        Avg days between completions - 30d: {fmtDays(frequency.d30)} · 90d: {fmtDays(frequency.d90)} · 365d:{' '}
        {fmtDays(frequency.d365)}
      </p>

      <TrendsCard color={habit.color} weekdayData={weekday} monthlyData={monthly} quarterlyData={quarterly} overview={overview} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Activity</p>
          <button className="btn ghost" style={{ fontSize: '0.72rem', padding: '4px 8px' }} onClick={() => setFullHistory((v) => !v)}>
            {fullHistory ? 'Last 12 months' : 'View full history'}
          </button>
        </div>
        <ContributionHeatmap
          weeks={heatmap.weeks}
          monthLabels={heatmap.monthLabels}
          color={habit.color}
          editable={isViewingSelf}
          onCellClick={setEditingCell}
        />
      </div>

      <Section title="Best streaks">
        <StreaksList streaks={bestStreaks} />
      </Section>

      {editingCell && (
        <EditEntryModal
          habit={habit}
          date={editingCell.date}
          currentValue={entriesByDate.get(editingCell.date)?.value ?? null}
          onSave={handleSaveEntry}
          onClear={handleClearEntry}
          onClose={() => setEditingCell(null)}
        />
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.9rem' }}>{title}</p>
      {children}
    </div>
  );
}
