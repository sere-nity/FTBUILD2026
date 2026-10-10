import './style.css';
import { store, visible, running, clone, plural } from './state';
import { render } from './render';
import { initBar, setSubmit, submitText, classify } from './bar';
import { initLog, logEntry, logLine } from './log';
import { runMilestone, runWorld, runInspect, runUnplaced, runAsk, hideIntro, stop } from './runner/scripted';
import { runLLM, llmEnabled } from './runner/llm';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="top">
    <div class="brand">Waypoint<small>Spotify · demo seed</small></div>
    <div class="snaps" id="snaps"></div>
    <span class="spacer"></span>
    <div class="tools">
      <button class="tbtn" id="cmp" type="button" title="Show the old value struck through next to the new one">Show what changed since last snapshot</button>
      <button class="tbtn" id="save" type="button">Save snapshot</button>
    </div>
  </header>
  <div class="intro" id="intro">
    <p><b>Waypoint shows which AI future is arriving and how much of what you're building depends on it.</b> The world enters at the top and ripples down. Your work enters at the bottom and ripples up. Your beliefs sit in the middle and feel both. Nothing here predicts; it tracks.</p>
    <button class="go" id="go" type="button">Try it: "shipped AI DJ v2"<small>→</small></button>
    <button class="x" id="introx" type="button">hide</button>
  </div>
  <div class="job" id="job" hidden>
    <div class="line1"><span class="spin"></span><span id="jobtitle">Sizing the change…</span></div>
    <button class="stop" id="stop" type="button">Stop · Esc</button>
    <div class="line2" id="jobmeta"></div>
    <div class="bar"><i id="jobbar"></i></div>
  </div>
  <div class="readonly" id="ro" hidden></div>
  <main>
    <section class="stack" id="stack"></section>
    <aside class="log"><h3>What changed, and why</h3><div class="sub">Every move is logged with its reason and source. Newest first.</div><div id="log"></div></aside>
  </main>
`;
initBar(app);
initLog();

// Bar → runner (SPEC §5 intent routing). During a run only "stop" is read; a past snapshot is read-only.
setSubmit((text) => {
  if (running()) {
    if (/^stop$/i.test(text)) stop();
    return;
  }
  if (store.viewing !== null) return;
  const intent = classify(text);
  // WAYPOINT_LLM=1: the model plans milestone and world runs; it falls back to the scripted runner on any failure.
  if (llmEnabled() && (intent === 'milestone' || intent === 'world')) return void runLLM(text, intent);
  if (intent === 'ask') return void runAsk(text);
  if (intent === 'inspect') return void runInspect();
  if (intent === 'world') return void runWorld();
  if (intent === 'milestone') return void runMilestone(text);
  void runUnplaced(text);
});

// Intro strip: the primary action and "hide".
document.querySelector('#go')!.addEventListener('click', () => submitText('shipped AI DJ v2'));
document.querySelector('#introx')!.addEventListener('click', hideIntro);

// Stop · Esc. During the intervene window this leaves the state unchanged.
document.querySelector('#stop')!.addEventListener('click', stop);
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') stop();
});

// Stack clicks: show a collapsed level, or toggle a card's detail in place.
document.querySelector('#stack')!.addEventListener('click', (ev) => {
  const t = ev.target as HTMLElement;
  const ex = t.closest<HTMLElement>('[data-expand]');
  if (ex) {
    visible().expanded[ex.dataset.expand as keyof typeof store.state.expanded] = true;
    render();
    return;
  }
  if (t.closest('a') || t.closest('.detail')) return;
  const card = t.closest<HTMLElement>('.card');
  if (!card) return;
  const id = card.dataset.id!;
  store.open[id] = !store.open[id];
  render();
});

// Snapshots: view a past one read-only, or come back to now. Not while a run is in progress.
document.querySelector('#snaps')!.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest<HTMLElement>('.snap');
  if (!b || running()) return;
  store.viewing = b.dataset.i === 'now' ? null : Number(b.dataset.i);
  render();
});

// Compare: ghost the last snapshot's value beside the current one on every card that moved.
document.querySelector('#cmp')!.addEventListener('click', () => {
  store.compare = !store.compare;
  render();
});

// Save snapshot: a new chip, a log entry with the counts, then the slate is clean (SPEC §8 Flow F).
document.querySelector('#save')!.addEventListener('click', () => {
  if (running() || store.viewing !== null) return;
  const name = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const prev = store.snapshots[store.snapshots.length - 1].name;
  store.snapshots.push({ name, state: clone(store.state), at: new Date().toISOString() });
  const e = logEntry('snapshot', name);
  const n = Object.keys(store.state.changed).length;
  const gaps = store.state.cards.filter((c) => c.level === 'assumptions' && Math.abs((c.ev ?? 0) - (c.us ?? 0)) >= 2).length;
  void logLine(
    e,
    `Saved. ${plural(n, 'card')} changed since “${prev}”. ${gaps ? `<b>${plural(gaps, 'belief')}</b> out of step with the evidence.` : 'Every belief is in step with its evidence.'}`,
    gaps ? 'warn' : 'sig',
    0,
  );
  for (const c of store.state.cards) {
    delete c.trend;
    delete c.trendOn;
  }
  store.state.changed = {};
  store.touched = new Set();
  render();
});

render();

// Test hook: verify/ scripts mutate the store and re-render to reach states the seed
// does not start in (e.g. an evidence/belief gap). Not used by the app itself.
declare global {
  interface Window {
    __waypoint: {
      store: typeof store;
      render: typeof render;
      runMilestone: typeof runMilestone;
      runWorld: typeof runWorld;
      runInspect: typeof runInspect;
      runUnplaced: typeof runUnplaced;
      runAsk: typeof runAsk;
      runLLM: typeof runLLM;
    };
  }
}
window.__waypoint = { store, render, runMilestone, runWorld, runInspect, runUnplaced, runAsk, runLLM };
