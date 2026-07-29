import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getHabit, subscribeEntriesForHabit } from '../firebase/firestore';
import { useViewedUser } from '../contexts/ViewedUserContext';
import { computeStreaks, bestStreaksList } from '../utils/streaks';
import { overviewStats, monthlyScoreSeries, quarterlyScoreSeries, weekdayScores, calendarMonths } from '../utils/habitStats';
import ScoreOverTimeChart from '../components/habits/detail/ScoreOverTimeChart';
import PercentBarChart from '../components/habits/detail/PercentBarChart';
import CalendarHeatmap from '../components/habits/detail/CalendarHeatmap';
import StreaksList from '../components/habits/detail/StreaksList';
import Spinner from '../components/common/Spinner';

export default function HabitDetailPage() {
  const { habitId } = useParams();
  const navigate = useNavigate();
  const { viewedUid } = useViewedUser();
  const [habit, setHabit] = useState(null);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    getHabit(habitId).then(setHabit);
  }, [habitId]);

  useEffect(() => {
    if (!viewedUid) return undefined;
    return subscribeEntriesForHabit(habitId, viewedUid, setEntries);
  }, [habitId, viewedUid]);

  const streaks = useMemo(() => (habit ? computeStreaks(habit, entries) : null), [habit, entries]);
  const overview = useMemo(() => (habit ? overviewStats(habit, entries) : null), [habit, entries]);
  const monthly = useMemo(() => (habit ? monthlyScoreSeries(habit, entries) : []), [habit, entries]);
  const quarterly = useMemo(() => (habit ? quarterlyScoreSeries(habit, entries) : []), [habit, entries]);
  const weekday = useMemo(() => (habit ? weekdayScores(habit, entries) : []), [habit, entries]);
  const months = useMemo(() => (habit ? calendarMonths(habit, entries) : []), [habit, entries]);
  const bestStreaks = useMemo(() => (habit ? bestStreaksList(habit, entries) : []), [habit, entries]);

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
      {habit.question && <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '4px 0 16px' }}>{habit.question}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
        <StatTile label="Score" value={`${overview.scorePercent}%`} />
        <StatTile label="Current streak" value={streaks.current} />
        <StatTile label="Best streak" value={streaks.best} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        <StatTile label="This month" value={`${overview.monthPercent}%`} change={overview.monthChange} />
        <StatTile label="This year" value={`${overview.yearPercent}%`} change={overview.yearChange} />
      </div>

      <Section title="Score over time">
        <ScoreOverTimeChart data={monthly} color={habit.color} />
      </Section>

      <Section title="Quarterly history">
        <PercentBarChart data={quarterly} color={habit.color} />
      </Section>

      <Section title="By weekday">
        <PercentBarChart data={weekday} color={habit.color} />
      </Section>

      <Section title="Best streaks">
        <StreaksList streaks={bestStreaks} />
      </Section>

      <Section title="Calendar">
        <CalendarHeatmap months={months} color={habit.color} />
      </Section>

      {habit.notes && (
        <Section title="Notes">
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{habit.notes}</p>
        </Section>
      )}
    </div>
  );
}

function StatTile({ label, value, change }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
      <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>{value}</p>
      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-dim)' }}>{label}</p>
      {change != null && (
        <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: change >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
          {change >= 0 ? '+' : ''}
          {change}pp
        </p>
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
