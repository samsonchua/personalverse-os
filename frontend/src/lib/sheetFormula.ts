// Minimal, safe (no eval()) spreadsheet formula engine: arithmetic, cell refs (A1),
// ranges (A1:B3), and SUM(range). Enough for a lightweight personal finance calc sheet.

export type Grid = string[][];

const colLetterToIndex = (letters: string): number => {
  let idx = 0;
  for (const ch of letters.toUpperCase()) {
    idx = idx * 26 + (ch.charCodeAt(0) - 64);
  }
  return idx - 1;
};

const CELL_RE = /^([A-Za-z]+)(\d+)$/;

const parseCellRef = (ref: string): { row: number; col: number } | null => {
  const m = CELL_RE.exec(ref);
  if (!m) return null;
  return { row: parseInt(m[2], 10) - 1, col: colLetterToIndex(m[1]) };
};

class FormulaError extends Error {}

type Token = { type: 'num' | 'ref' | 'range' | 'op' | 'lparen' | 'rparen' | 'comma' | 'func'; value: string };

const tokenize = (src: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[+\-*/]/.test(ch)) { tokens.push({ type: 'op', value: ch }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'lparen', value: ch }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen', value: ch }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'comma', value: ch }); i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ type: 'num', value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9]/.test(src[j])) j++;
      let word = src.slice(i, j);
      i = j;
      if (src[i] === ':' && CELL_RE.test(word)) {
        i++;
        let k = i;
        while (k < src.length && /[A-Za-z0-9]/.test(src[k])) k++;
        const second = src.slice(i, k);
        i = k;
        tokens.push({ type: 'range', value: `${word}:${second}` });
        continue;
      }
      if (src[i] === '(') {
        tokens.push({ type: 'func', value: word.toUpperCase() });
        continue;
      }
      tokens.push({ type: 'ref', value: word });
      continue;
    }
    throw new FormulaError(`Unexpected character '${ch}'`);
  }
  return tokens;
};

interface EvalCtx {
  grid: Grid;
  resolving: Set<string>;
  cache: Map<string, number>;
}

const resolveCell = (row: number, col: number, ctx: EvalCtx): number => {
  const key = `${row},${col}`;
  if (ctx.cache.has(key)) return ctx.cache.get(key)!;
  if (ctx.resolving.has(key)) throw new FormulaError('Circular reference');
  const raw = ctx.grid[row]?.[col] ?? '';
  if (raw === '') return 0;
  ctx.resolving.add(key);
  const value = evaluateCellRaw(raw, ctx);
  ctx.resolving.delete(key);
  ctx.cache.set(key, value);
  return value;
};

const rangeValues = (rangeStr: string, ctx: EvalCtx): number[] => {
  const [a, b] = rangeStr.split(':');
  const start = parseCellRef(a);
  const end = parseCellRef(b);
  if (!start || !end) throw new FormulaError(`Bad range ${rangeStr}`);
  const values: number[] = [];
  for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
    for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
      values.push(resolveCell(r, c, ctx));
    }
  }
  return values;
};

class Parser {
  tokens: Token[];
  pos = 0;
  ctx: EvalCtx;

  constructor(tokens: Token[], ctx: EvalCtx) {
    this.tokens = tokens;
    this.ctx = ctx;
  }

  peek(): Token | undefined { return this.tokens[this.pos]; }
  next(): Token { return this.tokens[this.pos++]; }

  parseExpression(): number { return this.parseAddSub(); }

  parseAddSub(): number {
    let left = this.parseMulDiv();
    while (this.peek()?.type === 'op' && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
      const op = this.next().value;
      const right = this.parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  parseMulDiv(): number {
    let left = this.parseUnary();
    while (this.peek()?.type === 'op' && (this.peek()!.value === '*' || this.peek()!.value === '/')) {
      const op = this.next().value;
      const right = this.parseUnary();
      if (op === '/' && right === 0) throw new FormulaError('Division by zero');
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  parseUnary(): number {
    if (this.peek()?.type === 'op' && this.peek()!.value === '-') {
      this.next();
      return -this.parseUnary();
    }
    return this.parsePrimary();
  }

  parsePrimary(): number {
    const tok = this.next();
    if (!tok) throw new FormulaError('Unexpected end of formula');
    if (tok.type === 'num') return parseFloat(tok.value);
    if (tok.type === 'lparen') {
      const val = this.parseExpression();
      if (this.peek()?.type !== 'rparen') throw new FormulaError('Missing closing parenthesis');
      this.next();
      return val;
    }
    if (tok.type === 'ref') {
      const cell = parseCellRef(tok.value);
      if (!cell) throw new FormulaError(`Bad cell reference ${tok.value}`);
      return resolveCell(cell.row, cell.col, this.ctx);
    }
    if (tok.type === 'func') {
      if (this.peek()?.type !== 'lparen') throw new FormulaError(`Expected '(' after ${tok.value}`);
      this.next();
      const args: number[] = [];
      if (this.peek()?.type === 'range') {
        args.push(...rangeValues(this.next().value, this.ctx));
      } else if (this.peek()?.type !== 'rparen') {
        args.push(this.parseExpression());
        while (this.peek()?.type === 'comma') {
          this.next();
          args.push(this.parseExpression());
        }
      }
      if (this.peek()?.type !== 'rparen') throw new FormulaError('Missing closing parenthesis');
      this.next();
      return applyFunc(tok.value, args);
    }
    throw new FormulaError(`Unexpected token ${tok.value}`);
  }
}

const applyFunc = (name: string, args: number[]): number => {
  switch (name) {
    case 'SUM': return args.reduce((a, b) => a + b, 0);
    case 'AVG':
    case 'AVERAGE': return args.length ? args.reduce((a, b) => a + b, 0) / args.length : 0;
    case 'MAX': return Math.max(...args);
    case 'MIN': return Math.min(...args);
    default: throw new FormulaError(`Unknown function ${name}`);
  }
};

const evaluateCellRaw = (raw: string, ctx: EvalCtx): number => {
  if (!raw.startsWith('=')) {
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }
  const tokens = tokenize(raw.slice(1));
  const parser = new Parser(tokens, ctx);
  return parser.parseExpression();
};

export const computeCell = (grid: Grid, row: number, col: number): { value: number | string; error: boolean } => {
  const raw = grid[row]?.[col] ?? '';
  if (raw === '') return { value: '', error: false };
  if (!raw.startsWith('=')) {
    const n = parseFloat(raw);
    return Number.isFinite(n) && raw.trim() !== '' && /^-?[\d.]+$/.test(raw.trim()) ? { value: n, error: false } : { value: raw, error: false };
  }
  const ctx: EvalCtx = { grid, resolving: new Set([`${row},${col}`]), cache: new Map() };
  try {
    const tokens = tokenize(raw.slice(1));
    const parser = new Parser(tokens, ctx);
    const value = parser.parseExpression();
    return { value: Math.round(value * 10000) / 10000, error: false };
  } catch {
    return { value: '#ERR', error: true };
  }
};

export const colLabel = (col: number): string => {
  let n = col + 1;
  let label = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
};
