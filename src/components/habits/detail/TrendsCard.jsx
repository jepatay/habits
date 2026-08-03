import { useState } from 'react';
import ScoreOverTimeChart from './ScoreOverTimeChart';
import PercentBarChart from './PercentBarChart';

const PERIODS = ['Week', 'Month', 'Quarter', 'Year'];

function ChangeNote({ percent, change }) {
  return (
    <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{percent}%</span>
      {change != null && (
        <span style={{ color: change >= 0 ? 'var(--accent)' : 'var(--danger)', marginLeft: 6 }}>
          {change >= 0 ? '+' : ''}
          {change}pp vs previous
        </span>
      )}
    </p>
  );
}

export default function TrendsCard({ color, weekdayData, monthlyData, quarterlyData, overview }) {
  const [period, setPeriod] = useState('Month');

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={period === p ? 'btn' : 'btn secondary'}
            style={{ flex: 1, padding: '6px 4px', fontSize: '0.75rem' }}
          >
            {p}
          </button>
        ))}
      </div>

      {period === 'Week' && <PercentBarChart data={weekdayData} color={color} />}

      {period === 'Month' && (
        <>
          <ChangeNote percent={overview.monthPercent} change={overview.monthChange} />
          <ScoreOverTimeChart data={monthlyData} color={color} />
        </>
      )}

      {period === 'Quarter' && <PercentBarChart data={quarterlyData} color={color} />}

      {period === 'Year' && <ChangeNote percent={overview.yearPercent} change={overview.yearChange} />}
    </div>
  );
}
