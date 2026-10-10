// Scripted runner (SPEC §5). Zero network dependency; same content and ordering as
// reference/waypoint.html. Each touched card walks the state machine in SPEC §6:
//   idle → scanning → preparing → proposed → settled   (or snaps back unchanged)
import { store, byId, type Card, type Direction, type Level } from '../state';
import { render } from '../render';
import { logEntry, logLine, cite, sleep } from '../log';
import { TIMING } from './timing';

type Plan = { kind: string; dir: Direction; levels: Level[]; touches: string };

/** Ask the current run to stop. Honoured at the next await. */
export function stop(): void {
  if (store.job) store.abort = true;
}

/**
 * classify: dim every level while the plan is sized, then show the plan and hold for the
 * intervene window. Returns false if the user stopped, in which case nothing has changed.
 */
async function sizing(plan: Plan): Promise<boolean> {
  store.abort = false;
  store.job = { ...plan, phase: 'sizing', done: 0, total: 0 };
  render();
  await sleep(TIMING.scanning);
  if (store.abort) return false;
  store.job.phase = 'intervene';
  render();
  await sleep(TIMING.intervene);
  return !store.abort;
}

/** preparing: spinner + one-line note of what the agent is doing for this cell. */
async function prepare(id: string, status: string, note: string, ms: number = TIMING.prepare): Promise<void> {
  const c = byId(id)!;
  c._status = status;
  c._note = note;
  render();
  await sleep(ms);
}

/** proposed → settled: apply the mutation, mark the card changed, pause. */
async function settle(id: string, mutate: (c: Card) => void, why: string): Promise<void> {
  const c = byId(id)!;
  c._status = null;
  c._note = null;
  mutate(c);
  store.state.changed[id] = why;
  if (store.job) store.job.done++;
  render();
  await sleep(TIMING.settle);
}

function touchLevel(id: Level): void {
  store.state.expanded[id] = true;
  render();
}

function clearTrends(): void {
  for (const c of store.state.cards) {
    c.trend = null;
    c.trendOn = null;
  }
}

function finish(): void {
  store.job = null;
  store.abort = false;
  for (const c of store.state.cards) {
    c._status = null;
    c._note = null;
  }
  render();
}

/** Event 1: milestone, bottom-up (Flow A). */
export async function runMilestone(text: string): Promise<void> {
  if (store.job) return;
  clearTrends();
  const e = logEntry('milestone', text);
  await logLine(e, 'sizing…');
  const ok = await sizing({
    kind: 'milestone',
    dir: 'up',
    levels: ['code', 'product', 'initiatives', 'assumptions'],
    touches: '1 milestone, 2 product flows, 1 initiative, 2 assumptions',
  });
  if (!ok) {
    await logLine(e, 'stopped before running', 'warn');
    return finish();
  }
  store.job!.phase = 'running';
  store.job!.total = 7;
  render();
  await logLine(e, 'reaches 4 levels, bottom-up · world not touched', 'sig');

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
  store.state.expanded.product = false;
  store.state.expanded.code = false;
  finish();
}
