import './style.css';
import { store, visible, running } from './state';
import { render } from './render';
import { initBar, setSubmit, classify } from './bar';
import { initLog } from './log';
import { runMilestone, stop } from './runner/scripted';
import { runLLM, llmEnabled } from './runner/llm';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="top">
    <div class="brand">Waypoint<small>Stewardship · giving platform</small></div>
    <div class="snaps" id="snaps"></div>
    <span class="spacer"></span>
    <div class="tools">
      <button class="tbtn" id="cmp" type="button">Compare to last</button>
      <button class="tbtn" id="save" type="button">Save snapshot</button>
    </div>
  </header>
  <div class="job" id="job" hidden>
    <div class="line1"><span class="spin"></span><span id="jobtitle">Sizing change…</span></div>
    <button class="stop" id="stop" type="button">Stop · Esc</button>
    <div class="line2" id="jobmeta"></div>
    <div class="bar"><i id="jobbar"></i></div>
  </div>
  <div class="readonly" id="ro" hidden></div>
  <main>
    <section class="stack" id="stack"></section>
    <aside class="log"><h3>Log</h3><div id="log"></div></aside>
  </main>
`;
initBar(app);
initLog();

// Bar → runner. Only the milestone path exists so far; the other intents land in the
// Flow checks. Nothing runs while a run is in progress or a past snapshot is shown.
setSubmit((text) => {
  if (running() || store.viewing !== null) return;
  const intent = classify(text);
  // WAYPOINT_LLM=1: the model plans the run and falls back to the scripted runner on any failure.
  if (llmEnabled() && intent !== 'ask') return void runLLM(text, intent);
  if (intent === 'milestone') void runMilestone(text);
});

// Stop · Esc. During the intervene window this leaves the state unchanged.
document.querySelector('#stop')!.addEventListener('click', stop);
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') stop();
});

// Stack clicks: expand a collapsed level, or toggle a card's detail in place.
document.querySelector('#stack')!.addEventListener('click', (ev) => {
  const t = ev.target as HTMLElement;
  const ex = t.closest<HTMLElement>('[data-expand]');
  if (ex) {
    visible().expanded[ex.dataset.expand as keyof typeof store.state.expanded] = true;
    render();
    return;
  }
  if (t.closest('a')) return;
  const card = t.closest<HTMLElement>('.card');
  if (!card) return;
  const id = card.dataset.id!;
  store.open[id] = !store.open[id];
  render();
});

render();

// Test hook: verify/ scripts mutate the store and re-render to reach states the seed
// does not start in (e.g. an evidence/belief gap). Not used by the app itself.
declare global {
  interface Window { __waypoint: { store: typeof store; render: typeof render; runMilestone: typeof runMilestone; runLLM: typeof runLLM } }
}
window.__waypoint = { store, render, runMilestone, runLLM };
