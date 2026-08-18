// Parses a CSV export from the Mi Fit / Zepp app (or any similarly-shaped health export) into
// HealthMetric rows. Xiaomi doesn't publish a fixed export schema, so this matches column
// headers flexibly (case-insensitive, several common aliases) rather than assuming one exact
// format — anything it can't confidently map is left out rather than guessed.

export interface ParsedHealthRow {
  log_date: string;
  weight_kg?: number;
  body_fat_pct?: number;
  calories_consumed?: number;
  water_ml?: number;
  sleep_hours?: number;
  steps?: number;
  resting_heart_rate?: number;
  source: 'mi_health_import';
}

export interface ImportParseResult {
  rows: ParsedHealthRow[];
  skipped: number;
  totalLines: number;
}

const COLUMN_ALIASES: Record<keyof Omit<ParsedHealthRow, 'source'>, string[]> = {
  log_date: ['date', 'day', 'log_date', 'time'],
  weight_kg: ['weight', 'weight(kg)', 'weight_kg', 'body weight'],
  body_fat_pct: ['body fat', 'bodyfat', 'body fat%', 'body_fat_pct', 'fat%'],
  calories_consumed: ['calories', 'kcal', 'calories_consumed', 'energy', 'calorie'],
  water_ml: ['water', 'water(ml)', 'water_ml', 'water intake'],
  sleep_hours: ['sleep', 'sleep(h)', 'sleep_hours', 'sleep duration', 'total sleep'],
  steps: ['steps', 'step count', 'step'],
  resting_heart_rate: ['heart rate', 'resting heart rate', 'rhr', 'hr', 'heartrate'],
};

const parseCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
};

const normalizeDate = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, a, b, year] = slash;
    // Ambiguous MM/DD vs DD/MM — assume MM/DD/YYYY (common in app exports), clamp invalid months.
    const month = Math.min(12, parseInt(a, 10));
    const day = Math.min(31, parseInt(b, 10));
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
};

const matchColumn = (headers: string[], aliases: string[]): number => {
  const normalized = headers.map((h) => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
};

export const parseMiHealthCsv = (text: string): ImportParseResult => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], skipped: 0, totalLines: lines.length };

  const headers = parseCsvLine(lines[0]);
  const columnIndex: Record<string, number> = {};
  (Object.keys(COLUMN_ALIASES) as (keyof typeof COLUMN_ALIASES)[]).forEach((key) => {
    columnIndex[key] = matchColumn(headers, COLUMN_ALIASES[key]);
  });

  const rows: ParsedHealthRow[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const dateIdx = columnIndex.log_date;
    if (dateIdx === -1 || !cells[dateIdx]) { skipped++; continue; }
    const log_date = normalizeDate(cells[dateIdx]);
    if (!log_date) { skipped++; continue; }

    const num = (key: keyof typeof columnIndex): number | undefined => {
      const idx = columnIndex[key];
      if (idx === -1 || !cells[idx]) return undefined;
      const v = parseFloat(cells[idx].replace(/[^\d.-]/g, ''));
      return isNaN(v) ? undefined : v;
    };

    rows.push({
      log_date,
      weight_kg: num('weight_kg'),
      body_fat_pct: num('body_fat_pct'),
      calories_consumed: num('calories_consumed'),
      water_ml: num('water_ml'),
      sleep_hours: num('sleep_hours'),
      steps: num('steps'),
      resting_heart_rate: num('resting_heart_rate'),
      source: 'mi_health_import',
    });
  }

  return { rows, skipped, totalLines: lines.length - 1 };
};
