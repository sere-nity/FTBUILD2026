// One render(state) function. The DOM is a function of the store, same as the reference.
import {
  LEVELS, SRC, ANALOGUES, CHIP_HELP, store, visible, byId, dots, plural, chipFor, entryLevel,
  type Card, type State, type Job,
} from './state';
import { esc } from './log';

const $ = <T extends Element = HTMLElement>(s: string): T => document.querySelector<T>(s)!;

export function render(): void {
  const s = visible();
  const base = store.snapshots[store.snapshots.length - 1].state;
  const stack = $('#stack');
  stack.innerHTML = '';
  for (const L of LEVELS) {
    const cards = s.cards.filter((c) => c.level === L.id);
    const nChanged = cards.filter((c) => s.changed[c.id]).length;
    const el = document.createElement('section');
    el.className = 'level';
    el.dataset.level = L.id;
    if (store.activeLevel === L.id) el.classList.add('active');
    if (store.touched.has(L.id)) el.classList.add('touched');
    const exp = s.expanded[L.id];
    el.innerHTML =
      `<div class="rail"><span class="dot"></span><span class="arrow">${store.runDir === 'up' ? '▲' : '▼'}</span></div>` +
      `<div class="body"><div class="level-head"><h3>${L.name}</h3><span class="sub">${esc(L.sub)}</span>` +
      `<span class="count ${nChanged ? 'changed' : ''}">${nChanged ? nChanged + ' changed' : ''}</span>` +
      `<span class="entry" data-entry></span></div></div>`;
    const body = el.querySelector('.body')!;
    if (exp) {
      const grid = document.createElement('div');
      grid.className = 'cards';
      for (const c of cards) grid.appendChild(renderCard(c, s, base));
      body.appendChild(grid);
    } else {
      const line = document.createElement('div');
      line.className = 'compact';
      line.innerHTML =
        cards.map((c) => `<span><b>${esc(c.title)}</b>${c.note ? ` <span class="n">· ${esc(c.note)}</span>` : ''}</span>`).join('') +
        `<button type="button" data-expand="${L.id}">show</button>`;
      body.appendChild(line);
    }
    stack.appendChild(el);
  }
  renderSnaps();
  renderJob(store.job);
  $('#cmp').classList.toggle('on', store.compare);
  const intro = document.querySelector<HTMLElement>('#intro');
  if (intro) intro.hidden = store.introHidden;
  const ro = $('#ro');
  ro.hidden = store.viewing === null;
  if (store.viewing !== null) {
    ro.textContent = `Viewing the “${store.snapshots[store.viewing].name}” snapshot, read-only. Click “now” to come back.`;
  }
  const form = document.querySelector<HTMLFormElement>('#form');
  if (form) form.classList.toggle('off', store.job !== null || store.viewing !== null);
}

/** The direction of a run, in words. */
export const dirText = (dir: Job['dir']): string => (dir === 'up' ? 'moving up from Code' : 'moving down from World');

/** What the job header says in each phase (SPEC §6). */
export function jobText(j: Job): { title: string; meta: string; pct: number } {
  const reach = `Reaches ${plural(j.levels.length, 'level')}`;
  if (j.phase === 'sizing') return { title: 'Sizing the change…', meta: 'How far does this reach? Looking at every level.', pct: 5 };
  if (j.phase === 'intervene') {
    // Two flex children: at phone width the warning wraps to its own line with no stray separator.
    return {
      title: `${reach} · ${dirText(j.dir)}`,
      meta: `<span>Will touch: ${esc(j.touches)}.</span><em>Type “stop” or press Esc in the next 2 seconds to cancel.</em>`,
      pct: 12,
    };
  }
  const frac = j.total ? j.done / j.total : 0;
  return { title: `${reach} · ${j.done}/${j.total} cells done`, meta: dirText(j.dir), pct: 12 + frac * 88 };
}

/**
 * Job header, level dimming and the entry marker, all from `store.job`.
 * `.scanning` is added after a forced style pass so the dim fades in (300ms) and snaps out.
 */
function renderJob(j: Job | null): void {
  const job = $('#job');
  job.hidden = j === null;
  const levels = Array.from(document.querySelectorAll<HTMLElement>('.level'));
  for (const el of levels) el.querySelector('[data-entry]')!.textContent = '';
  if (!j) {
    for (const el of levels) el.classList.remove('scanning');
    return;
  }
  const t = jobText(j);
  $('#jobtitle').textContent = t.title;
  $('#jobmeta').innerHTML = t.meta;
  $('#jobbar').style.width = `${t.pct}%`;
  if (j.phase === 'sizing') {
    // The stack was just rebuilt, so these elements have no computed style yet and a class
    // added now would land without a transition. Force one style pass first, then dim.
    for (const el of levels) void el.offsetHeight;
    for (const el of levels) el.classList.add('scanning');
  } else {
    for (const el of levels) el.classList.remove('scanning');
    const entry = document.querySelector(`.level[data-level="${entryLevel(j.dir)}"] [data-entry]`);
    if (entry) entry.textContent = 'starts here';
  }
}

export function renderCard(c: Card, s: State, base: State): HTMLElement {
  const el = document.createElement('article');
  el.className = 'card';
  el.dataset.id = c.id;
  if (s.changed[c.id]) el.classList.add('changed');
  if (c.kind === 'unplaced') el.classList.add('unplaced');
  if (c._phase) el.classList.add(c._phase); // preparing | proposed (SPEC §6)
  const b = base.cards.find((x) => x.id === c.id);

  // The old value shown struck through beside the current one: the baseline when comparing,
  // the pre-run value while the card is `proposed`. Nothing otherwise.
  const ghostFrom: Partial<Card> | null =
    store.compare && b ? b
    : c._phase === 'proposed' && c._prev ? c._prev
    : null;
  const diff = <K extends keyof Card>(key: K, fmt: (v: NonNullable<Card[K]>) => string): string => {
    const cur = fmt(c[key] as NonNullable<Card[K]>);
    if (!ghostFrom || ghostFrom[key] === undefined) return cur;
    if (JSON.stringify(ghostFrom[key]) === JSON.stringify(c[key])) return cur;
    return `<span class="ghost">${fmt(ghostFrom[key] as NonNullable<Card[K]>)}</span>${cur}`;
  };
  const arrow = c.trend ? `<span class="arrow ${c.trend === '↓' ? 'down' : ''}">${c.trend}</span>` : '';
  const tr = (on: string): string => (c.trend && c.trendOn === on ? arrow : '');

  // One chip path for every level; chipFor() drops anything outside SPEC §3's enums.
  const word = chipFor(c, s);
  const chip = word ? `<span class="chip ${word}" title="${esc(CHIP_HELP[word] ?? '')}">${word}</span>` : '';
  let fields = '';
  let extra = '';
  if (c.level === 'world') {
    fields =
      `<span class="k">if true</span><span class="v t">${esc(c.sub ?? '')}</span>` +
      `<span class="k">signposts</span><span class="v">${diff('f', (v) => v.signposts)}${arrow}</span>` +
      `<span class="k">last moved</span><span class="v">${esc(c.f?.lastMoved ?? '')}</span>`;
  } else if (c.level === 'assumptions') {
    const ev = c.ev ?? 0;
    const us = c.us ?? 0;
    const gap = Math.abs(ev - us) >= 2 ? ` <span class="flag" title="We believe this more than the evidence supports">⚠</span>` : '';
    fields =
      `<span class="k">evidence</span><span class="v dots">${diff('ev', dots)}${tr('ev')}</span>` +
      `<span class="k">our belief</span><span class="v dots">${diff('us', dots)}${gap}</span>` +
      `<span class="k">riding on it</span><span class="v">${diff('exposure', (v) => plural(v, 'bet'))}${tr('exposure')}</span>`;
  } else if (c.level === 'initiatives') {
    const rests = esc((c.rests ?? []).map((id) => (byId(id) || { title: id }).title).join(' · '));
    fields =
      `<span class="k">shipped</span><span class="v">${diff('pct', (v) => v + '%')}${tr('pct')}</span>` +
      `<span class="k">depends on</span><span class="v t" title="${rests}">${rests}</span>` +
      (c.trigger
        ? `<span class="k">trigger</span><span class="v t" title="${esc(c.trigger)}">${c.triggerHit ? '<span class="flag">⚑ fired · </span>' : ''}${esc(c.trigger)}</span>`
        : '');
    extra = `<div class="pct"><i style="width:${c.pct ?? 0}%"></i></div>`;
  } else {
    fields = `<span class="k">${c.level === 'code' ? 'files' : 'what'}</span><span class="v t" title="${esc(c.note ?? '')}">${esc(c.note ?? '')}</span>`;
  }

  const statusHtml = c._status
    ? `<span class="spin"></span><span>${esc(c._status)}</span><span class="note">${esc(c._note || '')}</span>`
    : s.changed[c.id]
      ? `<span>changed</span><span class="note">${esc(s.changed[c.id])}</span>`
      : '';

  el.innerHTML =
    `<div class="card-head"><h4>${esc(c.title)}</h4>${chip}</div>` +
    extra +
    `<div class="fields">${fields}</div>` +
    `<div class="status">${statusHtml}</div>`;
  if (store.open[c.id]) el.appendChild(renderDetail(c));
  return el;
}

export function renderDetail(c: Card): HTMLElement {
  const d = document.createElement('div');
  d.className = 'detail';
  const sources = c.sources ?? [];
  const src = sources
    .map((k) => {
      const x = SRC[k];
      if (!x) return `<li>${esc(k)}</li>`;
      return `<li>${x.u ? `<a href="${x.u}" target="_blank" rel="noopener">${esc(x.t)}</a>` : esc(x.t)}</li>`;
    })
    .join('');
  let html = `<div><h5>Evidence (${sources.length})</h5>${src ? `<ul>${src}</ul>` : "<div class=\"none\">none attached. The bar can't move until there is some.</div>"}</div>`;
  if (c.signposts) {
    html += `<div><h5>Signposts we set in July</h5><ul>${c.signposts.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>`;
  }
  if (c.level === 'assumptions') {
    const deps = store.state.cards.filter((i) => i.rests && i.rests.includes(c.id));
    html += `<div><h5>Bets riding on this</h5>${
      deps.length
        ? `<ul>${deps.map((i) => `<li>${esc(i.title)} · ${i.pct}% shipped</li>`).join('')}</ul>`
        : "<div class=\"none\">none. You believe this but nothing you're building depends on it.</div>"
    }</div>`;
  }
  if (c.rests) {
    html += `<div><h5>Depends on</h5><ul>${c.rests
      .map((id) => {
        const a = byId(id);
        return `<li>${a ? esc(a.title) + ' · evidence <span class="dots">' + dots(a.ev ?? 0) + '</span>' : esc(id)}</li>`;
      })
      .join('')}</ul></div>`;
  }
  if (c.analogue && ANALOGUES[c.analogue]) {
    const a = ANALOGUES[c.analogue];
    html +=
      `<div><h5>What happened last time</h5><div class="analogue"><span class="t">${esc(a.t)}</span>` +
      `<span class="k">got cheap</span><span>${esc(a.what)}</span>` +
      `<span class="k">value moved to</span><span>${esc(a.where)}</span>` +
      `<span class="k">survivor watched</span><span>${esc(a.tracked)}</span>` +
      `<span class="k">loser believed</span><span>${esc(a.believed)}</span></div></div>`;
  }
  html += `<div><h5>History</h5>${
    c.hist.length ? `<ul class="hist">${c.hist.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : '<div class="none">no changes yet</div>'
  }</div>`;
  d.innerHTML = html;
  return d;
}

export function renderSnaps(): void {
  const w = $('#snaps');
  w.innerHTML = '<span class="lbl">snapshots</span>';
  store.snapshots.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'snap' + (store.viewing === i ? ' active' : '');
    b.textContent = s.name;
    b.dataset.i = String(i);
    w.appendChild(b);
  });
  const now = document.createElement('button');
  now.type = 'button';
  now.className = 'snap now' + (store.viewing === null ? ' active' : '');
  now.textContent = 'now';
  now.dataset.i = 'now';
  w.appendChild(now);
}
