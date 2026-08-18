// Malaysian Ringgit is the app-wide display currency.
export const formatCurrency = (amount: number, opts: Intl.NumberFormatOptions = {}): string => {
  // Intl.NumberFormat renders negative zero as "-0" (e.g. from sign-flipping a zero deduction) —
  // normalize it so it displays as a plain zero instead.
  const normalized = Object.is(amount, -0) ? 0 : amount;
  const formatted = normalized.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2, ...opts });
  return `RM ${formatted}`;
};

export const formatCurrencySigned = (amount: number, opts: Intl.NumberFormatOptions = {}): string => {
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${sign}${formatCurrency(Math.abs(amount), opts)}`;
};

/** Lets an amount field accept a small arithmetic expression — "10+20+5", "100-15.5",
 * "12.5*3", "90/3", parentheses, mixed precedence — and evaluates it, for splitting a receipt
 * into its line items or doing quick math without leaving the field. Commas are treated the same
 * as "+" (a plain list of amounts). No `eval`: hand-rolled recursive-descent parser over a
 * restricted character set. Returns null for anything unparseable, so callers can distinguish
 * "empty/invalid" from "a real zero". */
export const evaluateAmountExpression = (input: string): number | null => {
  const expr = input.replace(/,/g, '+');
  if (!expr.trim() || !/^[\d+\-*/().\s]+$/.test(expr)) return null;

  const tokens = expr.match(/\d+\.?\d*|\.\d+|[+\-*/()]/g);
  if (!tokens || !tokens.length) return null;

  let pos = 0;
  const peek = () => tokens[pos];
  const isNumber = (t: string | undefined): t is string => t !== undefined && /^(\d+\.?\d*|\.\d+)$/.test(t);

  const parseExpr = (): number | null => {
    let left = parseTerm();
    if (left === null) return null;
    while (peek() === '+' || peek() === '-') {
      const op = tokens[pos++];
      const right = parseTerm();
      if (right === null) return null;
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };

  const parseTerm = (): number | null => {
    let left = parseFactor();
    if (left === null) return null;
    while (peek() === '*' || peek() === '/') {
      const op = tokens[pos++];
      const right = parseFactor();
      if (right === null) return null;
      if (op === '/' && right === 0) return null; // divide by zero — reject rather than Infinity/NaN
      left = op === '*' ? left * right : left / right;
    }
    return left;
  };

  const parseFactor = (): number | null => {
    const t = peek();
    if (t === '-') { pos++; const v = parseFactor(); return v === null ? null : -v; }
    if (t === '+') { pos++; return parseFactor(); }
    if (t === '(') {
      pos++;
      const v = parseExpr();
      if (v === null || peek() !== ')') return null;
      pos++;
      return v;
    }
    if (isNumber(t)) { pos++; return parseFloat(t); }
    return null;
  };

  const result = parseExpr();
  if (result === null || pos !== tokens.length) return null; // leftover tokens = malformed expression
  return Math.round(result * 100) / 100;
};
