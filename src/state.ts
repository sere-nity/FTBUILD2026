// Types and state management — see SPEC §4
import seedJson from '../data/seed.json';
import sourcesJson from '../data/sources.json';
import analoguesJson from '../data/analogues.json';

export type Level = 'world' | 'assumptions' | 'initiatives' | 'product' | 'code';

export type WorldChip = 'live' | 'rising' | 'watch' | 'fading';
export type InitiativeChip = 'robust' | 'hedge' | 'fragile';
export type ProductChip = 'changed' | 'unchanged';
export type AssumptionKind = 'fact' | 'interpretation' | 'prediction' | 'unplaced';

/** The only words a chip may show, per level (SPEC §3). Anything else renders no chip. */
export const CHIPS: Record<Level, readonly string[]> = {
  world: ['live', 'rising', 'watch', 'fading'],
  assumptions: ['fact', 'interpretation', 'prediction', 'unplaced'],
  initiatives: ['robust', 'hedge', 'fragile'],
  product: ['changed', 'unchanged'],
  code: [],
};

export type Card = {
  id: string;
  level: Level;
  title: string;
  hist: string[];
  sub?: string;
  chip?: WorldChip | InitiativeChip;
  f?: { signposts: string; lastMoved: string };
  signposts?: string[];
  kind?: AssumptionKind;
  ev?: number;
  us?: number;
  exposure?: number;
  analogue?: string;
  pct?: number;
  rests?: string[];
  trigger?: string;
  triggerHit?: boolean;
  note?: string;
  sources?: string[];
  trend?: '↑' | '↓' | null;
  trendOn?: string | null;
  _status?: string | null;
  _note?: string | null;
};

export type Source = {
  t: string;
  u?: string;
  kind?: 'paper' | 'report' | 'book' | 'article' | 'data';
};

export type Analogue = {
  t: string;
  what: string;
  where: string;
  tracked: string;
  believed: string;
};

export type State = {
  cards: Card[];
  expanded: Record<Level, boolean>;
  changed: Record<string, string>;
};

export type Snapshot = {
  name: string;
  at: string;
  state: State;
};

export type LevelDef = { id: Level; name: string; entry?: 'top' | 'bottom' };

export const LEVELS: LevelDef[] = [
  { id: 'world', name: 'World', entry: 'top' },
  { id: 'assumptions', name: 'Assumptions' },
  { id: 'initiatives', name: 'Initiatives' },
  { id: 'product', name: 'Product' },
  { id: 'code', name: 'Code', entry: 'bottom' },
];

export const SRC: Record<string, Source> = sourcesJson as Record<string, Source>;
export const ANALOGUES: Record<string, Analogue> = analoguesJson as Record<string, Analogue>;

export const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));

export function seed(): State {
  return clone(seedJson as unknown as State);
}

/** The single mutable store. The DOM is a function of this. */
export const store = {
  state: seed(),
  snapshots: [{ name: 'Jul', state: seed(), at: '2026-07-14' }] as Snapshot[],
  viewing: null as number | null, // index into snapshots when read-only
  compare: false,
  running: false,
  abort: false,
  open: {} as Record<string, boolean>, // expanded cards
};

/** The state currently on screen: live state, or the snapshot being viewed. */
export function visible(): State {
  return store.viewing === null ? store.state : store.snapshots[store.viewing].state;
}

export function byId(id: string): Card | undefined {
  return store.state.cards.find((c) => c.id === id);
}

export const dots = (n: number): string => '●'.repeat(n) + '○'.repeat(5 - n);

/**
 * The chip a card shows, or null for none. Assumptions use `kind`; product cards
 * derive theirs from whether the last run changed them. A value outside the
 * level's enum is dropped rather than shown, so no freeform word reaches a card.
 */
export function chipFor(c: Card, s: State): string | null {
  const raw =
    c.level === 'assumptions' ? c.kind
    : c.level === 'product' ? (s.changed[c.id] ? 'changed' : 'unchanged')
    : c.chip;
  return raw && CHIPS[c.level].includes(raw) ? raw : null;
}
