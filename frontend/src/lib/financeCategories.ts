// Fixed categorical order — validated for CVD-safety against the app's dark
// surface (#0B0F19) via the dataviz skill's validator. Never cycle/reassign
// by rank; each category keeps the same color everywhere it appears.
export const CHART_PALETTE = [
  '#3987e5', // blue
  '#d95926', // orange
  '#199e70', // aqua
  '#c98500', // yellow
  '#d55181', // magenta
  '#008300', // green
  '#9085e9', // violet
  '#e66767', // red
];

export const colorForCategory = (category: string, knownOrder: string[]): string => {
  const idx = knownOrder.indexOf(category);
  if (idx === -1 || idx >= CHART_PALETTE.length) return '#6b7280'; // "Other" — muted gray
  return CHART_PALETTE[idx];
};

export const EXPENSE_CATEGORIES = [
  'Food & Dining', 'Housing', 'Transportation', 'Shopping',
  'Entertainment', 'Health & Fitness', 'Utilities', 'Education',
  'Travel', 'Insurance', 'Other',
];

export const INCOME_CATEGORIES = [
  'Salary', 'Investment Return', 'Business', 'Gift', 'Refund', 'Other',
];

interface CategoryLike {
  id: string;
  name: string;
  parent_category_id?: string | null;
}

/** Alphabetical roots, each immediately followed by its own alphabetical children (depth 1 —
 * matches the category tree's actual nesting, which never goes deeper than one level). */
export const orderCategoriesByParent = <T extends CategoryLike>(categories: T[]): (T & { depth: number })[] => {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const childrenOf = new Map<string, T[]>();
  const roots: T[] = [];
  for (const c of categories) {
    if (c.parent_category_id && byId.has(c.parent_category_id)) {
      const siblings = childrenOf.get(c.parent_category_id) || [];
      siblings.push(c);
      childrenOf.set(c.parent_category_id, siblings);
    } else {
      roots.push(c);
    }
  }
  roots.sort((a, b) => a.name.localeCompare(b.name));
  for (const siblings of childrenOf.values()) siblings.sort((a, b) => a.name.localeCompare(b.name));

  const ordered: (T & { depth: number })[] = [];
  for (const root of roots) {
    ordered.push({ ...root, depth: 0 });
    for (const child of childrenOf.get(root.id) || []) ordered.push({ ...child, depth: 1 });
  }
  return ordered;
};
