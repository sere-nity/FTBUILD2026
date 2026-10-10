// Types and state management — see SPEC §4

export type Level = 'world' | 'assumptions' | 'initiatives' | 'product' | 'code';

export type Card = {
  id: string;
  level: Level;
  title: string;
  hist: string[];
  sub?: string;
  chip?: string;
  f?: { signposts: string; lastMoved: string };
  signposts?: string[];
  kind?: 'fact' | 'interpretation' | 'prediction' | 'unplaced';
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
  id: string;
  t: string;
  u?: string;
  kind: 'paper' | 'report' | 'book' | 'article' | 'data';
};

export type Analogue = {
  id: string;
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
