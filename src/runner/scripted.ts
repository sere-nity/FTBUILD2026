// Scripted runner (SPEC §5). Zero network dependency; same content and ordering as
// reference/waypoint.html. Each touched card walks the state machine in SPEC §6:
//   idle → scanning → preparing → proposed → settled   (or snaps back unchanged)
import { store, byId, clone, dots, plural, CHIP_HELP, GHOSTED, type Card, type Direction, type Level } from '../state';
import { render } from '../render';
import { logEntry, logLine, cite, esc } from '../log';
import { TIMING } from './timing';

export type Plan = { kind: string; dir: Direction; levels: Level[]; touches: string };

/** Thrown out of `tick()` when the user stops a run that has already started changing things. */
export const STOPPED = Symbol('stopped');

/** Every pause in flight. Cells in one level settle concurrently, so there can be more than one. */
const wakers = new Set<() => void>();

/** Ask the current run to stop. Before anything has changed (sizing, intervene) this ends the wait at once. */
export function stop(): void {
  if (!store.job) return;
  store.abort = true;
  for (const wake of [...wakers]) wake();
}

/** Sleep that ends early when `stop()` is called. Resolves true if stopped. */
export function wait(ms: number): Promise<boolean> {
  if (store.abort) return Promise.resolve(true);
  return new Promise((resolve) => {
    const done = (stopped: boolean) => {
      clearTimeout(t);
      wakers.delete(wake);
      resolve(stopped);
    };
    const wake = () => done(true);
    const t = setTimeout(() => done(store.abort), ms);
    wakers.add(wake);
  });
}

/** A pause inside the running phase. Throws STOPPED so the flow unwinds to its catch. */
export async function tick(ms: number): Promise<void> {
  if (await wait(ms)) throw STOPPED;
}

/** The intro strip goes on the first run (or on "hide"). */
export function hideIntro(): void {
  if (store.introHidden) return;
  store.introHidden = true;
  render();
}

/**
 * classify: dim every level while the plan is sized, then show the plan and hold for the
 * intervene window. Returns false if the user stopped, in which case nothing has changed.
 */
export async function sizing(plan: Plan): Promise<boolean> {
  startSizing(plan);
  if (await wait(TIMING.scanning)) return false;
  return holdPlan(plan);
}

/** First half of classify: dim every level and show "Sizing the change…". The plan may still be a placeholder. */
export function startSizing(plan: Plan): void {
  store.abort = false;
  store.job = { ...plan, phase: 'sizing', done: 0, total: 0 };
  store.runDir = plan.dir;
  store.touched = new Set();
  store.activeLevel = null;
  render();
}

/** Second half of classify: show the (final) plan and hold the intervene window. False if stopped. */
export async function holdPlan(plan: Plan): Promise<boolean> {
  if (!store.job || store.abort) return false;
  store.job = { ...store.job, ...plan, phase: 'intervene' };
  store.runDir = plan.dir;
  render();
  return !(await wait(TIMING.intervene));
}

/** The rail: the level the run is working in now. Each one it visits stays marked until the next snapshot. */
export function setActive(level: Level | null): void {
  store.activeLevel = level;
  if (level) {
    store.touched.add(level);
    store.state.expanded[level] = true;
  }
  render();
}

/** preparing: spinner + one-line note of what the agent is doing for this cell. */
export async function prepare(id: string, status: string, note: string, ms: number = TIMING.prepare): Promise<void> {
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
 * moved, accent rule kept via `changed`. The caller's log line follows the settle directly:
 * the last `render()` here and the line's append happen in the same task, so they share a frame.
 */
export async function settle(id: string, mutate: (c: Card) => void, why: string): Promise<void> {
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

/** Open a level for the run (kept for callers that open without moving the rail). */
export function touchLevel(id: Level): void {
  store.state.expanded[id] = true;
  render();
}

/** Arrows from the previous run go when a new one starts to change things. */
export function clearTrends(): void {
  for (const c of store.state.cards) {
    delete c.trend;
    delete c.trendOn;
  }
}

/** End the run. Leaves no transient keys on any card, so a stopped run is a no-op on state. */
export function finish(): void {
  store.job = null;
  store.abort = false;
  store.activeLevel = null;
  store.runDir = null;
  for (const c of store.state.cards) {
    delete c._phase;
    delete c._status;
    delete c._note;
    delete c._prev;
  }
  render();
}

/** The two sentences every stop produces. */
const STOPPED_EARLY = 'Stopped before anything changed.';

/**
 * Run the body of a flow after sizing. Esc or Stop mid-run throws STOPPED out of the next
 * `tick`: cells already settled keep their new values, the cell in flight loses its spinner
 * or ghost, quiet levels collapse, and the log says how far it got.
 */
export async function running(e: HTMLElement, body: () => Promise<void>): Promise<void> {
  try {
    await body();
  } catch (err) {
    if (err !== STOPPED) throw err;
    const { done, total } = store.job!;
    store.state.expanded.product = false;
    store.state.expanded.code = false;
    finish();
    await logLine(e, `Stopped after ${done} of ${total} cells.`, 'warn', 0);
    return;
  }
  store.state.expanded.product = false;
  store.state.expanded.code = false;
  finish();
}

/** Begin the running phase: header shows k/n, arrows from the last run go. */
function begin(total: number): void {
  clearTrends();
  store.job!.phase = 'running';
  store.job!.total = total;
  render();
}

/** Flow A — event 1: milestone, bottom-up. `entry` lets a caller (inspect, the LLM fallback) continue its own log entry. */
export async function runMilestone(text: string, entry?: HTMLElement): Promise<void> {
  if (store.job) return;
  hideIntro();
  const e = entry ?? logEntry('you shipped', text);
  await logLine(e, 'Sizing the change…');
  const ok = await sizing({
    kind: 'milestone',
    dir: 'up',
    levels: ['code', 'product', 'initiatives', 'assumptions'],
    touches: '1 milestone, 2 product flows, 1 bet, 2 beliefs',
  });
  if (!ok) {
    // Header first, then the log line: Esc should read as instant.
    finish();
    return logLine(e, STOPPED_EARLY, 'warn', 0);
  }
  begin(6); // c1, p2, p1, i1, a1, a4 — the reference says 7 but settles six
  await logLine(e, 'Reaches 4 levels, moving up from Code. The World level is not touched: shipping code changes your position, not the world.', 'sig');

  await running(e, async () => {
    setActive('code');
    await prepare('c1', 'Reading the milestone', 'dj/* · 31 files · 5 commits');
    await settle('c1', (c) => {
      c.title = 'Milestone: AI DJ v2';
      c.note = '31 files · dj/* · Oct 2026';
      c.hist.push('Oct 10: AI DJ v2 shipped');
    }, '31 files');
    await logLine(e, 'Code: dj/*, 31 files, 5 commits since the last milestone.');

    setActive('product');
    await prepare('p2', 'Checking which flows changed', 'screenshots of AI DJ');
    await prepare('p1', 'Checking which flows changed', 'screenshots of Home', TIMING.prepareFast);
    // One log line covers both flows, so they settle together (SPEC §5: cells in a level run
    // concurrently) and the line lands the frame they do.
    await Promise.all([
      settle('p2', (c) => {
        c.note = 'v2: takes requests in natural language, remembers context';
        c.hist.push('Oct 10: v2 shipped');
      }, 'v2 shipped'),
      settle('p1', (c) => {
        c.note = 'AI DJ now the first shelf on Home';
        c.hist.push('Oct 10: DJ promoted to top shelf');
      }, 'DJ promoted'),
    ]);
    await logLine(e, 'Product: AI DJ and Home changed. Artist profile unchanged.');

    setActive('initiatives');
    await prepare('i1', 'Recomputing % shipped', 'from the milestone');
    await settle('i1', (c) => {
      c.pct = 100;
      c.trend = '↑';
      c.trendOn = 'pct';
      c.hist.push('Oct 10: 60% → 100%');
    }, '60% → 100%');
    await logLine(e, 'Bet “AI DJ v2” is now fully shipped (60% → 100%). Health stays <b>hedge</b>: it pays off if listeners hand over choice, and it depends on label terms.', 'sig');

    setActive('assumptions');
    await prepare('a1', 'Recomputing what rides on this', 'a bet that depends on it just fully shipped');
    await prepare('a4', 'Recomputing what rides on this', 'a bet that depends on it just fully shipped', TIMING.prepareOverlap);
    await settle('a1', (c) => {
      c.exposure = 2;
      c.trend = '↑';
      c.trendOn = 'exposure';
      c.hist.push('Oct 10: riding on it 1 → 2 (AI DJ v2 shipped)');
    }, 'more riding on it');
    await logLine(e, `Belief “Listeners will let an AI assistant choose for them”: more is riding on it now. Evidence unchanged: nothing new found on the shelf.${cite('similarweb')}`);
    await settle('a4', (c) => {
      c.exposure = 3;
      c.trend = '↑';
      c.trendOn = 'exposure';
      c.hist.push('Oct 10: riding on it 2 → 3 (AI DJ v2 shipped)');
    }, 'more riding on it');
    await logLine(e, `Belief “Labels keep licensing on current terms” now carries <b>3 bets</b>, and it is a prediction with middling evidence (●●●○○). <b>⚠</b> That is a lot of weight on one guess. The triggers on AI DJ and the API cover it; no action until a signpost moves.${cite('suno')}`, 'warn');
    await logLine(e, 'World: no scenario moved.');
  });
}

/** Flow B — event 2: world, top-down. The signal is simulated for the demo. */
export async function runWorld(entry?: HTMLElement): Promise<void> {
  if (store.job) return;
  hideIntro();
  const e = entry ?? logEntry('the world moved', 'a label changes its AI licensing terms');
  await logLine(e, '<b>Simulated signal for the demo.</b> Signpost “a major label makes provenance a licensing condition” has moved. In a live setup this would come from a feed you chose in July.');
  await logLine(e, 'Sizing the change…');
  const ok = await sizing({
    kind: 'world',
    dir: 'down',
    levels: ['world', 'assumptions', 'initiatives'],
    touches: '1 scenario, 1 belief, 2 bets',
  });
  if (!ok) {
    finish();
    return logLine(e, STOPPED_EARLY, 'warn', 0);
  }
  begin(4);
  await logLine(e, 'Reaches 3 levels, moving down from World. Product and Code are not touched.', 'sig');

  await running(e, async () => {
    setActive('world');
    await prepare('w2', 'Re-reading signposts', 'for this scenario');
    await settle('w2', (c) => {
      c.f = { signposts: '2 / 4 moved', lastMoved: 'Oct 2026' };
      c.chip = 'rising';
      c.trend = '↑';
      c.trendOn = 'f';
      c.hist.push('Oct 10: signpost “label makes provenance a condition” moved');
    }, 'watch → rising');
    await logLine(e, 'Scenario “Artists must prove they\'re human”: 1 of 4 → 2 of 4 signposts. <b>watch → rising.</b>', 'sig');

    setActive('assumptions');
    await prepare('a4', 'Re-weighing the evidence', 'for this prediction');
    await settle('a4', (c) => {
      c.ev = 1;
      c.trend = '↓';
      c.trendOn = 'ev';
      c.hist.push('Oct 10: evidence ●●●○○ → ●○○○○ (licensing terms changed)');
    }, 'evidence ↓');
    await logLine(e, `Belief “Labels keep licensing on current terms”: evidence ●●●○○ → ●○○○○. Your belief is still ●●●●○. <b>⚠ The gap is now 3.</b> Either lower the belief and say why, or say why this evidence doesn't apply to you. The tool won't choose for you.${cite('umgudio')}`, 'warn');

    setActive('initiatives');
    await prepare('i3', 'Checking triggers', 'against the new signpost');
    await prepare('i1', 'Checking triggers', 'against the new signpost', TIMING.prepareOverlap);
    await settle('i3', (c) => {
      c.chip = 'fragile';
      c.triggerHit = true;
      c.trend = '↓';
      c.trendOn = null;
      c.hist.push('Oct 10: trigger fired · hedge → fragile');
    }, '⚑ trigger fired');
    await logLine(e, 'Bet “Open listening-history API”: <b>⚑ trigger fired</b>. Its own rule says: pause external access. Health hedge → fragile.', 'warn');
    await settle('i1', (c) => {
      c.chip = 'fragile';
      c.trend = '↓';
      c.trendOn = null;
      c.hist.push('Oct 10: hedge → fragile (3 bets on a belief with ●○○○○ evidence)');
    }, 'now fragile');
    await logLine(e, 'Bet “AI DJ v2”: hedge → fragile. It just shipped, and it rests on the same belief.', 'warn');
    await logLine(e, `What happened last time: app stores, 2008–. The platform sets the terms; the tenant finds out later. Open the belief card for the case.${cite('rand')}`);
    await logLine(e, 'Product and Code: unchanged. The world moved; your position did not.');
  });
}

/** Flow C — event 3: inspect the repo, then run the milestone it found. Scripted in this build. */
export async function runInspect(): Promise<void> {
  if (store.job) return;
  hideIntro();
  const e = logEntry('inspect', 'look at the repo');
  await logLine(e, 'Reading the repo: 5 commits since the last milestone, dj/* and home/*, 31 files.', '', TIMING.inspectLine);
  await logLine(e, 'Running the app and taking screenshots: AI DJ, Home.', '', TIMING.inspectLine);
  await logLine(e, 'Wrote the prompt for you: “shipped AI DJ v2: natural-language requests, remembers context, promoted to the top shelf on Home”.', 'sig', TIMING.inspectLine);
  await runMilestone('shipped AI DJ v2 (from the repo)');
}

/** Flow E — event 6: unmatched text creates exactly one unplaced belief and stops. */
export async function runUnplaced(text: string): Promise<void> {
  if (store.job) return;
  hideIntro();
  const e = logEntry('you said', text);
  await logLine(e, 'Sizing the change…');
  const ok = await sizing({ kind: 'unmatched', dir: 'down', levels: ['assumptions'], touches: 'nothing in the stack matches this' });
  if (!ok) {
    finish();
    return logLine(e, STOPPED_EARLY, 'warn', 0);
  }
  begin(1);
  await running(e, async () => {
    setActive('assumptions');
    const id = 'u' + Date.now();
    const at = store.state.cards.findIndex((c) => c.level === 'initiatives');
    store.state.cards.splice(at, 0, {
      id, level: 'assumptions', title: text, kind: 'unplaced', ev: 0, us: 0, exposure: 0, sources: [],
      hist: ['Oct 10: created from a prompt, not yet placed'],
    });
    store.state.changed[id] = 'where does this belong?';
    store.job!.done = 1;
    render();
    await logLine(e, 'Nothing in the stack matches. Added <b>one</b> unplaced belief with no evidence and no belief score. Nothing else was touched.', 'warn');
    await logLine(e, 'Next: attach a source, link a bet to it, or delete it. The tool never invents cards to make text fit.');
  });
}

const STOP_WORDS = new Set(['why', 'what', 'which', 'how', 'the', 'does', 'and', 'for', 'our']);

/** Flow D — event 4: ask. Answer in the log, referenced cards highlighted for a moment, nothing changes. */
export async function runAsk(q: string): Promise<void> {
  const e = logEntry('you asked', q);
  const words = q.toLowerCase().replace(/[?.,']/g, '').split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  const hits = store.state.cards.filter((c) => words.some((w) => c.title.toLowerCase().includes(w)));
  for (const c of hits) document.querySelector(`.card[data-id="${c.id}"]`)?.classList.add('hl');
  if (hits.length) {
    const c = hits[0];
    if (c.level === 'initiatives') {
      const deps = (c.rests ?? []).map((id) => `“${esc(byId(id)?.title ?? id)}” (evidence ${dots(byId(id)?.ev ?? 0)})`).join(' and ');
      const help = c.chip ? CHIP_HELP[c.chip].toLowerCase() : '';
      await logLine(e, `“${esc(c.title)}” is <b>${c.chip}</b> (${help}). It depends on ${deps}. ${c.triggerHit ? 'Its trigger has fired.' : 'Its trigger has not fired.'} Nothing changed.`);
    } else if (c.level === 'assumptions') {
      await logLine(e, `“${esc(c.title)}”: evidence ${dots(c.ev ?? 0)}, belief ${dots(c.us ?? 0)}, ${plural(c.exposure ?? 0, 'bet')} riding on it, ${plural((c.sources ?? []).length, 'source')} attached. Nothing changed.`);
    } else {
      await logLine(e, `“${esc(c.title)}”: ${esc(c.note || c.sub || '')}. Nothing changed.`);
    }
  } else {
    await logLine(e, 'No card matches that question. Nothing changed.', 'warn');
  }
  setTimeout(() => document.querySelectorAll('.card.hl').forEach((x) => x.classList.remove('hl')), TIMING.highlight);
}
