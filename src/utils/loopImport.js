import JSZip from 'jszip';
import { createHabit, setEntriesBatch } from '../firebase/firestore';

// Loop Habit Tracker (github.com/iSoron/uhabits) CSV export format: a
// Habits.csv listing every habit, plus one "<position> <name>/Checkmarks.csv"
// folder per habit with its full daily history. Numeric values are stored
// x1000 (Loop's own convention, avoids floating point in the Android app).

function parseCsvLine(line) {
  const cells = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function parseCsv(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map(parseCsvLine);
}

export function isLoopExportFile(file) {
  return file.name.toLowerCase().endsWith('.zip');
}

export async function parseLoopExport(file) {
  const zip = await JSZip.loadAsync(file);
  const habitsFile = zip.file('Habits.csv');
  if (!habitsFile) throw new Error('Not a Loop Habit Tracker export - Habits.csv not found in the zip.');

  const [header, ...rows] = parseCsv(await habitsFile.async('string'));
  const col = (name) => header.indexOf(name);

  const positionCol = col('Position');
  const nameCol = col('Name');
  const typeCol = col('Type');
  const freqNumCol = col('FrequencyNumerator');
  const freqDenCol = col('FrequencyDenominator');
  const colorCol = col('Color');
  const unitCol = col('Unit');
  const targetValueCol = col('Target Value');
  const archivedCol = col('Archived?');

  // Folder names are "<position> <sanitized name>" (or just "<position>" if
  // the name sanitizes to nothing, e.g. an emoji-only habit name) - match by
  // the leading digits rather than the full name.
  const folderByPosition = new Map();
  Object.keys(zip.files).forEach((path) => {
    const match = path.match(/^(\d+)[^/]*\/Checkmarks\.csv$/);
    if (match) folderByPosition.set(match[1], path);
  });

  const habits = [];
  for (const row of rows) {
    const position = row[positionCol];
    const type = row[typeCol] === 'NUMERICAL' ? 'measurable' : 'yes_no';
    const checkmarksPath = folderByPosition.get(position);
    const rawEntries = checkmarksPath ? parseCsv(await zip.file(checkmarksPath).async('string')).slice(1) : [];

    const entries = [];
    for (const [date, rawValue] of rawEntries) {
      if (type === 'measurable') {
        const num = Number(rawValue);
        if (!Number.isNaN(num)) entries.push({ date, value: num / 1000 });
      } else if (rawValue === 'YES_MANUAL') {
        entries.push({ date, value: true });
      } else if (rawValue === 'NO') {
        entries.push({ date, value: false });
      }
      // YES_AUTO is Loop's own auto-fill for non-daily frequencies, not a
      // real check-in - deliberately not imported as history.
    }

    habits.push({
      position,
      name: row[nameCol],
      type,
      frequencyNumerator: Number(row[freqNumCol]) || 1,
      frequencyDenominator: Number(row[freqDenCol]) || 1,
      color: row[colorCol] || '#22c55e',
      unit: row[unitCol] || '',
      targetValue: Number(row[targetValueCol]) || 0,
      archived: row[archivedCol] === 'true',
      entries,
    });
  }

  return { habits, totalEntries: habits.reduce((sum, h) => sum + h.entries.length, 0) };
}

export async function importLoopExport(uid, parsed) {
  let habitsCreated = 0;
  const allEntries = [];

  // Habits are created sequentially (only ~a dozen calls) since each entry
  // batch below needs the resulting habitId; the entries themselves - which
  // can run into the thousands - are then written in large parallel batches
  // rather than one Firestore round trip per entry.
  for (const habit of parsed.habits) {
    if (!habit.entries.length) continue;

    const earliestDate = habit.entries.map((e) => e.date).sort()[0];
    const habitId = await createHabit({
      name: habit.name,
      question: '',
      type: habit.type,
      negative: false,
      // Loop's frequency is a numerator/denominator ratio (e.g. "3 per week")
      // with no fixed weekdays, which this app doesn't model - every imported
      // habit is scheduled daily so streaks are computed against the actual
      // logged history rather than a guessed schedule.
      frequency: { type: 'daily' },
      target_value: habit.type === 'measurable' ? habit.targetValue : null,
      unit: habit.type === 'measurable' ? habit.unit : null,
      color: habit.color,
      reminder: { enabled: false, time: '08:00' },
      notes: 'Imported from Loop Habit Tracker.',
      owner_uid: uid,
      archived: habit.archived,
      createdAt: new Date(earliestDate),
    });
    habitsCreated += 1;

    for (const entry of habit.entries) allEntries.push({ habitId, date: entry.date, value: entry.value });
  }

  await setEntriesBatch(uid, allEntries);
  const entriesImported = allEntries.length;

  return { habitsCreated, entriesImported };
}
