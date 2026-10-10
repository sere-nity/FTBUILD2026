import './style.css';
import { store, visible } from './state';
import { render } from './render';
import { initBar } from './bar';

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
  interface Window { __waypoint: { store: typeof store; render: typeof render } }
}
window.__waypoint = { store, render };
