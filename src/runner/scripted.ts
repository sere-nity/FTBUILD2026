// Scripted runner (SPEC §5). Zero network dependency; same content and ordering as
// reference/waypoint.html. Each touched card walks the state machine in SPEC §6:
//   idle → scanning → preparing → proposed → settled   (or snaps back unchanged)
import { store, byId, clone, GHOSTED, type Card, type Direction, type Level } from '../state';
import { render } from '../render';
import { logEntry, logLine, cite } from '../log';
import { TIMING } from './timing';

type Plan = { kind: string; dir: Direction; levels: Level[]; touches: string };

/** Thrown out of `tick()` when the user stops a run that has already started changing things. */
const STOPPED = Symbol('stopped');

let wake: (() => void) | null = null;

/** Ask the current run to stop. Before anything has changed (sizing, intervene) this ends the wait at once. */
export function stop(): void {
  if (!store.job) return;
  store.abort = true;
  wake?.();
}

/** Sleep that ends early when `stop()` is called. Resolves true if stopped. */
function wait(ms: number): Promise<boolean> {
  if (store.abort) return Promise.resolve(true);
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      wake = null;
      resolve(store.abort);
    }, ms);
    wake = () => {
      clearTimeout(t);
      wake = null;
      resolve(true);
    };
  });
}

/** A pause inside the running phase. Throws STOPPED so the flow unwinds to its catch. */
async function tick(ms: number): Promise<void> {
  if (await wait(ms)) throw STOPPED;
}

/**
 * classify: dim every level while the plan is sized, then show the plan and hold for the
 * intervene window. Returns false if the user stopped, in which case nothing has changed.
 */
async function sizing(plan: Plan): Promise<boolean> {
  store.abort = false;
  store.job = { ...plan, phase: 'sizing', done: 0, total: 0 };
  render();
  if (await wait(TIMING.scanning)) return false;
  store.job.phase = 'intervene';
  render();
  return !(await wait(TIMING.intervene));
}

/** preparing: spinner + one-line note of what the agent is doing for this cell. */
async function prepare(id: string, status: string, note: string, ms: number = TIMING.prepare): Promise<void> {
  const c = byId(id)!;
  c._phase = 'preparing';
  c._status = status;
  c._note = note;
  render();
  await tick(ms);
}

/**
 * proposed → settled. The mutation is applied at once; every ghosted field that moved keeps
 * its old value in `_prev` so the card shows it struck through beside the new one. After the
 * hold the ghost fades in place, then the card is redrawn settled: ↑/↓ on the field that
 * moved, accent rule kept via `changed`. The caller's log line follows the settle directly.
 */
async function settle(id: string, mutate: (c: Card) => void, why: string): Promise<void> {
  const c = byId(id)!;
  const before = clone(c);
  delete c._status;
  delete c._note;
  mutate(c);
  const prev: Partial<Card> = {};
  for (const k of GHOSTED) {
    if (JSON.stringify(before[k]) !== JSON.stringify(c[k])) (prev as Record<string, unknown>)[k] = before[k];
  }
  c._prev = prev;
  c._phase = 'proposed';
  store.state.changed[id] = why;
  if (store.job) store.job.done++; // applied immediately, so it counts now (a stop mid-ghost keeps it)
  render();
  await tick(TIMING.proposed);
  fadeGhosts(id);
  await tick(TIMING.ghostFade);
  delete c._prev;
  delete c._phase;
  render();
}

/** Start the ghost's fade on the card as drawn; the next render removes it. */
function fadeGhosts(id: string): void {
  for (const g of document.querySelectorAll(`.card[data-id="${id}"] .ghost`)) g.classList.add('out');
}

function touchLevel(id: Level): void {
  store.state.expanded[id] = true;
  render();
}

/** Arrows from the previous run go when a new one starts to change things. */
function clearTrends(): void {
  for (const c of store.state.cards) {
    delete c.trend;
    delete c.trendOn;
  }
}

/** End the run. Leaves no transient keys on any card, so a stopped run is a no-op on state. */
function finish(): void {
  store.job = null;
  store.abort = false;
  for (const c of store.state.cards) {
    delete c._phase;
    delete c._status;
    delete c._note;
    delete c._prev;
  }
  render();
}

/**
 * Run the body of a flow after sizing. Esc or Stop mid-run throws STOPPED out of the next
 * `tick`: cells already settled keep their new values, the cell in flight loses its spinner
 * or ghost, quiet levels collapse, and the log says how far it got.
 */
async function running(e: HTMLElement, body: () => Promise<void>): Promise<void> {
  try {
    await body();
  } catch (err) {
    if (err !== STOPPED) throw err;
    const { done, total } = store.job!;
    store.state.expanded.product = false;
    store.state.expanded.code = false;
    finish();
    await logLine(e, `stopped after ${done}/${total} cells`, 'warn', 0);
    return;
  }
  store.state.expanded.product = false;
  store.state.expanded.code = false;
  finish();
}

/** Event 1: milestone, bottom-up (Flow A). */
export async function runMilestone(text: string): Promise<void> {
  if (store.job) return;
  const e = logEntry('milestone', text);
  await logLine(e, 'sizing…');
  const ok = await sizing({
    kind: 'milestone',
    dir: 'up',
    levels: ['code', 'product', 'initiatives', 'assumptions'],
    touches: '1 milestone, 2 product flows, 1 initiative, 2 assumptions',
  });
  if (!ok) {
    // Header first, then the log line: Esc should read as instant.
    finish();
    return logLine(e, 'stopped before running', 'warn', 0);
  }
  clearTrends();
  store.job!.phase = 'running';
  store.job!.total = 6; // c1, p1, p2, i1, a1, a2 — the reference says 7 but settles six
  render();
  await logLine(e, 'reaches 4 levels, bottom-up · world not touched', 'sig');

  await running(e, async () => {
    touchLevel('code');
    await prepare('c1', 'Reading…', 'api/giving/* · 14 files');
    await settle('c1', (c) => {
      c.title = 'Milestone: agent giving API v1';
      c.note = '14 files · api/giving/* · Oct 2026';
      c.hist.push('Oct 10: agent giving API v1 shipped');
    }, '14 files');
    await logLine(e, 'code: api/giving/* · 14 files · 3 commits since last milestone');

    touchLevel('product');
    await prepare('p1', 'Preparing…', 'which flows does this change?');
    await prepare('p2', 'Preparing…', 'which flows does this change?', TIMING.prepareFast);
    await settle('p1', (c) => {
      c.note = 'cause search now exposed to agents';
      c.hist.push('Oct 10: agent endpoint added');
    }, 'agent endpoint');
    await settle('p2', (c) => {
      c.note = 'verified-partner data readable by agents';
      c.hist.push('Oct 10: partner data exposed to agents');
    }, 'partner data');
    await logLine(e, 'product: donor discovery flow and partner search now expose data to agents · giving app unchanged');

    touchLevel('initiatives');
    await prepare('i1', 'Preparing…', 'recomputing shipped % from milestone');
    await settle('i1', (c) => {
      c.pct = 70;
      c.trend = '↑';
      c.trendOn = 'pct';
      c.hist.push('Oct 10: 20% → 70%');
    }, '20% → 70%');
    await logLine(e, 'initiative: agent-facing giving API 20% → 70% · health stays <b>hedge</b> (one scenario, two assumptions)', 'sig');

    touchLevel('assumptions');
    await prepare('a1', 'Preparing…', 'recomputing exposure from initiatives that rest on this');
    await prepare('a2', 'Preparing…', 'recomputing exposure from initiatives that rest on this', TIMING.prepareOverlap);
    await settle('a1', (c) => {
      c.exposure = 2;
      c.trend = '↑';
      c.trendOn = 'exposure';
      c.hist.push('Oct 10: exposure 1 → 2 (agent API 70%)');
    }, 'exposure ↑');
    await logLine(e, `assumption “AI assistants mediate discovery”: exposure ↑. 70% of an initiative now rests on it. Evidence unchanged: no new sources found ${cite('bluestate')}`);
    await settle('a2', (c) => {
      c.exposure = 1;
      c.trend = '↑';
      c.trendOn = 'exposure';
      c.hist.push('Oct 10: exposure 0 → 1 (agent API now depends on this vendor)');
    }, 'now load-bearing');
    await logLine(e, `assumption “vendor stays available”: exposure 0 → 1 <b>⚠</b> · a low-evidence prediction (●●●○○) now carries a live bet. The trigger on the API initiative covers this; no action until a signpost moves ${cite('bis')}`, 'warn');
    await logLine(e, 'world: no scenario moved. The code changed your position, not the world.');
  });
}
