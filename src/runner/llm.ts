// LLM runner (SPEC §5, optional, behind WAYPOINT_LLM=1). Same pipeline as the scripted runner:
// classify → propagate → diff → suggest. The plan comes from one model call through the
// Express proxy in server/; the cells then walk the same state machine as scripted.ts.
// Any failure (no server, no key, bad JSON, rejected plan) falls back to the scripted runner
// and says so in the log, so the demo never depends on the network.
import { store, byId, SRC, type Card, type Level, type Direction } from '../state';
import { render } from '../render';
import { logEntry, logLine, cite, esc, type LineClass } from '../log';
import type { Intent } from '../bar';
import { TIMING } from './timing';
import {
  startSizing, holdPlan, prepare, settle, setActive, clearTrends, finish, running, hideIntro,
  runMilestone, runWorld, wait,
  type Plan,
} from './scripted';

/** True when the page was served with WAYPOINT_LLM=1 (see vite.config.ts). */
export const llmEnabled = (): boolean => import.meta.env.WAYPOINT_LLM === '1';

type Mutation = Partial<Pick<Card, 'title' | 'note' | 'pct' | 'ev' | 'exposure' | 'chip' | 'kind' | 'triggerHit' | 'f'>> & { hist?: string };

type Cell = {
  id: string;
  status: string;
  note: string;
  mutation: Mutation;
  why: string;
  line: string;
  cls: LineClass;
  source: string | null;
};

type Closing = { line: string; cls: LineClass; source: string | null };

export type LLMPlan = {
  entry: Level;
  dir: Direction;
  levels: Level[];
  touches: string;
  opening: string;
  cells: Cell[];
  closing: Closing[];
};

const PLAN_TIMEOUT = 30_000;

const KIND: Record<string, string> = { milestone: 'you shipped', world: 'the world moved', unmatched: 'you said', inspect: 'inspect', ask: 'you asked' };

/** Ask the proxy for a plan. Throws with a one-line reason on any failure. */
async function fetchPlan(text: string, intent: Intent): Promise<LLMPlan> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PLAN_TIMEOUT);
  try {
    const r = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, intent, state: store.state, sources: SRC }),
      signal: ctrl.signal,
    });
    const body = (await r.json().catch(() => ({}))) as { plan?: LLMPlan; error?: string };
    if (!r.ok || !body.plan) throw new Error(body.error || `proxy returned ${r.status}`);
    return body.plan;
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new Error('model call timed out');
    if (err instanceof TypeError) throw new Error('proxy not reachable'); // fetch network failure
    throw err;
  } finally {
    clearTimeout(t);
  }
}

/** The fallback: say why, then run the scripted flow for the same intent in the same entry. */
async function fallback(e: HTMLElement, text: string, intent: Intent, reason: string): Promise<void> {
  finish();
  await logLine(e, `The model is unavailable (${reason}). Using the scripted runner instead.`, 'warn');
  if (intent === 'world') return runWorld(e);
  return runMilestone(text, e);
}

/** Apply a checked mutation to a card. `us` never appears here; the proxy already dropped it. */
function apply(c: Card, m: Mutation): void {
  if (m.title != null) c.title = m.title;
  if (m.note != null) c.note = m.note;
  if (m.pct != null) { c.trend = m.pct > (c.pct ?? 0) ? '↑' : m.pct < (c.pct ?? 0) ? '↓' : null; c.trendOn = 'pct'; c.pct = m.pct; }
  if (m.exposure != null) { c.trend = m.exposure > (c.exposure ?? 0) ? '↑' : '↓'; c.trendOn = 'exposure'; c.exposure = m.exposure; }
  if (m.ev != null) { c.trend = m.ev > (c.ev ?? 0) ? '↑' : '↓'; c.trendOn = 'ev'; c.ev = m.ev; }
  if (m.chip != null) c.chip = m.chip as Card['chip'];
  if (m.kind != null) c.kind = m.kind;
  if (m.triggerHit != null) c.triggerHit = m.triggerHit;
  if (m.f != null) { c.f = m.f; c.trend = '↑'; c.trendOn = 'f'; }
  if (m.hist) c.hist.push(m.hist);
}

const withCite = (line: string, source: string | null): string => esc(line) + (source ? cite(source) : '');

/**
 * Run one event through the model. Sizing starts at once (levels dim) while the call is in
 * flight; the plan header then holds for the intervene window exactly as the scripted runner.
 */
export async function runLLM(text: string, intent: Intent): Promise<void> {
  if (store.job) return;
  hideIntro();
  const e = logEntry(KIND[intent] ?? intent, text);
  await logLine(e, 'Sizing the change…');
  const placeholder: Plan = { kind: intent, dir: intent === 'world' ? 'down' : 'up', levels: [], touches: '' };
  startSizing(placeholder);

  let plan: LLMPlan;
  try {
    plan = await fetchPlan(text, intent);
  } catch (err) {
    return fallback(e, text, intent, (err as Error).message);
  }
  const stoppedEarly = async (): Promise<void> => {
    finish();
    await logLine(e, 'Stopped before anything changed.', 'warn', 0);
  };
  if (store.abort) return stoppedEarly();
  // Let the dim read as a scan even when the model answers fast.
  if (await wait(Math.max(0, TIMING.scanning - 400))) return stoppedEarly();

  const ok = await holdPlan({ kind: intent, dir: plan.dir, levels: plan.levels, touches: plan.touches });
  if (!ok) return stoppedEarly();

  clearTrends();
  store.job!.phase = 'running';
  store.job!.total = plan.cells.length;
  render();
  await logLine(e, esc(plan.opening), 'sig');

  await running(e, async () => {
    let level: Level | null = null;
    for (const cell of plan.cells) {
      const card = byId(cell.id);
      if (!card) continue;
      if (card.level !== level) {
        level = card.level;
        setActive(level);
      }
      await prepare(cell.id, cell.status || 'Preparing…', cell.note || '');
      await settle(cell.id, (c) => apply(c, cell.mutation), cell.why || 'changed');
      await logLine(e, withCite(cell.line, cell.source), cell.cls);
    }
    for (const c of plan.closing) await logLine(e, withCite(c.line, c.source), c.cls);
  });
}
