import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useViewedUser } from '../contexts/ViewedUserContext';
import {
  exportUserData,
  downloadJson,
  detectImportShape,
  distinctFieldKeys,
  importGenericRecords,
  importNativeFormat,
} from '../utils/exportImport';
import { isLoopExportFile, parseLoopExport, importLoopExport } from '../utils/loopImport';
import { subscribeHabits } from '../firebase/firestore';

export default function ImportExportPage() {
  const { user, isAdmin } = useAuth();
  const { viewedUid } = useViewedUser();
  const [exporting, setExporting] = useState(false);

  const [rawData, setRawData] = useState(null);
  const [shape, setShape] = useState(null);
  const [mapping, setMapping] = useState({ dateField: '', habitField: '', valueField: '', valueType: 'boolean' });
  const [habitAssignments, setHabitAssignments] = useState({});
  const [existingHabits, setExistingHabits] = useState([]);
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => subscribeHabits(user.uid, setExistingHabits, { includeArchived: true }), [user.uid]);

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportUserData(viewedUid);
      downloadJson(`habits-export-${viewedUid}-${Date.now()}.json`, data);
    } finally {
      setExporting(false);
    }
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    setResult(null);

    if (isLoopExportFile(file)) {
      try {
        const parsed = await parseLoopExport(file);
        setRawData(parsed);
        setShape('loop');
      } catch (err) {
        setError(err.message || 'Could not read that zip as a Loop Habit Tracker export.');
      }
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const detected = detectImportShape(data);
      setRawData(data);
      setShape(detected);
      if (detected === 'records') {
        const keys = distinctFieldKeys(data);
        setMapping({
          dateField: keys.find((k) => /date/i.test(k)) || keys[0] || '',
          habitField: keys.find((k) => /habit|name|question/i.test(k)) || keys[1] || '',
          valueField: keys.find((k) => /value|done|check|complete/i.test(k)) || keys[2] || '',
          valueType: 'boolean',
        });
      }
    } catch {
      setError('Could not parse that file as JSON.');
    }
  }

  const fieldKeys = useMemo(() => (shape === 'records' ? distinctFieldKeys(rawData) : []), [shape, rawData]);

  const distinctHabitLabels = useMemo(() => {
    if (shape !== 'records' || !mapping.habitField) return [];
    const set = new Set(rawData.map((r) => String(r[mapping.habitField] ?? '')));
    return Array.from(set).filter(Boolean);
  }, [shape, rawData, mapping.habitField]);

  useEffect(() => {
    if (!distinctHabitLabels.length) return;
    setHabitAssignments((prev) => {
      const next = { ...prev };
      for (const label of distinctHabitLabels) {
        if (!next[label]) next[label] = { mode: 'new', name: label, type: 'yes_no' };
      }
      return next;
    });
  }, [distinctHabitLabels]);

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      if (shape === 'loop') {
        const res = await importLoopExport(viewedUid, rawData);
        setResult({ created: res.habitsCreated, imported: res.entriesImported, skipped: 0 });
      } else if (shape === 'native') {
        const res = await importNativeFormat(viewedUid, rawData);
        setResult(res);
      } else if (shape === 'records') {
        const res = await importGenericRecords(viewedUid, rawData, mapping, habitAssignments);
        setResult(res);
      }
    } catch {
      setError('Import failed partway through. Already-imported entries were kept - check the grid before retrying.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Import / Export</h1>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 8px', fontWeight: 700 }}>Export</p>
        <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
          Download all your habits, entries and rewards as a JSON backup.
        </p>
        <button className="btn" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Preparing…' : 'Download JSON'}
        </button>
      </div>

      {!isAdmin ? (
        <div className="card">
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            Importing historical data creates habit records, which only the admin can do. Ask them to import it
            for you.
          </p>
        </div>
      ) : (
      <div className="card">
        <p style={{ margin: '0 0 8px', fontWeight: 700 }}>Import historical data</p>
        <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
          Upload a Loop Habit Tracker export (.zip) or a JSON backup. Anything else gets a field-mapping step
          below.
        </p>
        <input type="file" accept="application/json,.zip,application/zip" onChange={handleFile} />

        {error && <div className="banner error" style={{ marginTop: 12 }}>{error}</div>}

        {shape === 'loop' && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: '0.85rem' }}>
              Recognized as a Loop Habit Tracker export: {rawData.habits.length} habits, {rawData.totalEntries}{' '}
              check-ins.
            </p>
            <ul style={{ fontSize: '0.8rem', color: 'var(--text-dim)', paddingLeft: 18, margin: '8px 0' }}>
              {rawData.habits.map((h) => (
                <li key={h.position}>
                  {h.name || `(habit ${h.position})`} - {h.entries.length} check-ins
                  {h.archived ? ' (archived)' : ''}
                </li>
              ))}
            </ul>
            <button className="btn" onClick={handleImport} disabled={importing}>
              {importing ? 'Importing…' : 'Import'}
            </button>
          </div>
        )}

        {shape === 'native' && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: '0.85rem' }}>
              Recognized as a native export: {rawData.habits.length} habits, {rawData.entries.length} entries.
            </p>
            <button className="btn" onClick={handleImport} disabled={importing}>
              {importing ? 'Importing…' : 'Import'}
            </button>
          </div>
        )}

        {shape === 'records' && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{rawData.length} rows detected. Map the fields:</p>

            <label htmlFor="map-date">Date field</label>
            <select id="map-date" value={mapping.dateField} onChange={(e) => setMapping((m) => ({ ...m, dateField: e.target.value }))}>
              {fieldKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>

            <label htmlFor="map-habit">Habit name/id field</label>
            <select id="map-habit" value={mapping.habitField} onChange={(e) => setMapping((m) => ({ ...m, habitField: e.target.value }))}>
              {fieldKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>

            <label htmlFor="map-value">Value field</label>
            <select id="map-value" value={mapping.valueField} onChange={(e) => setMapping((m) => ({ ...m, valueField: e.target.value }))}>
              {fieldKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>

            <label htmlFor="map-value-type">Value type</label>
            <select id="map-value-type" value={mapping.valueType} onChange={(e) => setMapping((m) => ({ ...m, valueType: e.target.value }))}>
              <option value="boolean">Yes / No</option>
              <option value="number">Number</option>
            </select>

            {distinctHabitLabels.length > 0 && (
              <>
                <p style={{ margin: '16px 0 8px', fontWeight: 600, fontSize: '0.85rem' }}>Map each habit found</p>
                {distinctHabitLabels.map((label) => (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <label>{label}</label>
                    <select
                      value={habitAssignments[label]?.mode === 'existing' ? habitAssignments[label].habitId : 'new'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHabitAssignments((prev) => ({
                          ...prev,
                          [label]:
                            val === 'new'
                              ? { mode: 'new', name: label, type: 'yes_no' }
                              : { mode: 'existing', habitId: val },
                        }));
                      }}
                    >
                      <option value="new">Create new habit "{label}"</option>
                      {existingHabits.map((h) => (
                        <option key={h.id} value={h.id}>
                          Match to existing: {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </>
            )}

            <p style={{ margin: '16px 0 8px', fontWeight: 600, fontSize: '0.85rem' }}>Preview (first 5 rows)</p>
            <div style={{ overflowX: 'auto' }}>
              <pre style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                {JSON.stringify(rawData.slice(0, 5), null, 2)}
              </pre>
            </div>

            <button className="btn block" onClick={handleImport} disabled={importing}>
              {importing ? 'Importing…' : `Import ${rawData.length} rows`}
            </button>
          </div>
        )}

        {result && (
          <div className="banner success" style={{ marginTop: 16 }}>
            Done - {result.created} habit(s) created, {result.imported} entries imported, {result.skipped} skipped.
          </div>
        )}
      </div>
      )}
    </div>
  );
}
