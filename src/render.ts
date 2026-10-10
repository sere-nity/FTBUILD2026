// One render(state) function. The DOM is a function of the store, same as the reference.
import {
  LEVELS, SRC, ANALOGUES, store, visible, byId, dots, chipFor, entryLevel,
  type Card, type State, type Job,
} from './state';

const $ = <T extends Element = HTMLElement>(s: string): T => document.querySelector<T>(s)!;

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function countLabel(levelId: string, n: number): string {
  if (levelId === 'world') return `${n} scenarios`;
  if (levelId === 'code') return `${n} milestone`;
  return `${n} cards`;
}

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
    const exp = s.expanded[L.id];
    el.innerHTML =
      `<div class="level-head"><h3>${L.name}</h3>` +
      `<span class="count ${nChanged ? 'changed' : ''}">${nChanged ? nChanged + ' changed' : countLabel(L.id, cards.length)}</span>` +
      `<span class="entry" data-entry></span></div>`;
    if (exp) {
      const grid = document.createElement('div');
      grid.className = 'cards';
      for (const c of cards) grid.appendChild(renderCard(c, s, base));
      el.appendChild(grid);
    } else {
      const line = document.createElement('div');
      line.className = 'compact';
      line.innerHTML =
        cards.map((c) => `<b>${esc(c.title)}</b>${c.note ? ' · ' + esc(c.note) : ''}`).join(' &nbsp;·&nbsp; ') +
        `<button data-expand="${L.id}">expand</button>`;
      el.appendChild(line);
    }
    stack.appendChild(el);
  }
  renderSnaps();
  renderJob(store.job);
  $('#cmp').classList.toggle('on', store.compare);
  const ro = $('#ro');
  ro.hidden = store.viewing === null;
  if (store.viewing !== null) {
    ro.textContent = `Viewing snapshot “${store.snapshots[store.viewing].name}” · read-only · click “now” to return`;
  }
}

const plural = (n: number, w: string): string => `${n} ${w}${n === 1 ? '' : 's'}`;

/** What the job header says in each phase (SPEC §6). */
export function jobText(j: Job): { title: string; meta: string; pct: number } {
  const dir = j.dir === 'up' ? 'bottom-up' : 'top-down';
  const reach = `Reaches ${plural(j.levels.length, 'level')}`;
  if (j.phase === 'sizing') return { title: 'Sizing change…', meta: 'scanning all levels', pct: 5 };
  if (j.phase === 'intervene') {
    // Two flex children: at phone width the warning wraps to its own line with no stray separator.
    return { title: `${reach} · ${dir}`, meta: `<span>touches: ${esc(j.touches)}</span><span class="warn">2s to intervene</span>`, pct: 12 };
  }
  const frac = j.total ? j.done / j.total : 0;
  return { title: `${reach} · ${j.done}/${j.total} cells done`, meta: `${dir} · ${esc(j.kind)}`, pct: 12 + frac * 88 };
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
    if (entry) entry.textContent = '◀ entered here';
  }
}

export function renderCard(c: Card, s: State, base: State): HTMLElement {
  const el = document.createElement('article');
  el.className = 'card';
  el.dataset.id = c.id;
  if (s.changed[c.id]) el.classList.add('changed');
  if (c.kind === 'unplaced') el.classList.add('unplaced');
  const b = base.cards.find((x) => x.id === c.id);

  // When comparing, show the baseline value ghosted (struck through) beside the current one.
  const diff = <K extends keyof Card>(key: K, fmt: (v: NonNullable<Card[K]>) => string): string => {
    const cur = fmt(c[key] as NonNullable<Card[K]>);
    if (!store.compare || !b || b[key] === undefined) return cur;
    if (JSON.stringify(b[key]) === JSON.stringify(c[key])) return cur;
    return `<span class="ghost">${fmt(b[key] as NonNullable<Card[K]>)}</span>${cur}`;
  };
  const trend = c.trend ? `<span class="arrow ${c.trend === '↓' ? 'down' : ''}">${c.trend}</span>` : '';

  // One chip path for every level; chipFor() drops anything outside SPEC §3's enums.
  const word = chipFor(c, s);
  const chip = word ? `<span class="chip ${word}">${word}</span>` : '';
  let fields = '';
  if (c.level === 'world') {
    fields =
      `<span class="k">axes</span><span class="v wrap">${esc(c.sub ?? '')}</span>` +
      `<span class="k">signposts</span><span class="v">${diff('f', (v) => v.signposts)}${trend}</span>` +
      `<span class="k">last moved</span><span class="v">${c.f?.lastMoved ?? ''}</span>`;
  } else if (c.level === 'assumptions') {
    const ev = c.ev ?? 0;
    const us = c.us ?? 0;
    const gap = Math.abs(ev - us) >= 2 ? ` <span class="flag" title="evidence and belief disagree">⚠</span>` : '';
    fields =
      `<span class="k">evidence</span><span class="v dots">${diff('ev', dots)}${c.trend && c.trendOn === 'ev' ? trend : ''}</span>` +
      `<span class="k">belief</span><span class="v dots">${diff('us', dots)}${gap}</span>` +
      `<span class="k">exposure</span><span class="v">${diff('exposure', (v) => v + ' initiative' + (v === 1 ? '' : 's'))}${c.trendOn === 'exposure' ? trend : ''}</span>`;
  } else if (c.level === 'initiatives') {
    const restIds = c.rests ?? [];
    const rests = restIds
      .map((id) => {
        const a = byId(id) || { title: id };
        return esc(a.title.split(' ').slice(0, 3).join(' ')) + '…';
      })
      .join(', ');
    const restsFull = esc(restIds.map((id) => (byId(id) || { title: id }).title).join(' · '));
    fields =
      `<span class="k">shipped</span><span class="v">${diff('pct', (v) => v + '%')}${c.trendOn === 'pct' ? trend : ''}</span>` +
      `<span class="k">rests on</span><span class="v" title="${restsFull}">${rests}</span>` +
      (c.trigger
        ? `<span class="k">trigger</span><span class="v" title="${esc(c.trigger)}">${c.triggerHit ? '<span class="flag">⚑ hit · </span>' : ''}${esc(c.trigger)}</span>`
        : '');
  } else {
    fields = `<span class="k">${c.level === 'code' ? 'files' : 'note'}</span><span class="v" title="${esc(c.note ?? '')}">${esc(c.note ?? '')}</span>`;
  }

  const statusHtml = c._status
    ? `<span class="spin"></span><span>${esc(c._status)}</span><span class="note">${esc(c._note || '')}</span>`
    : s.changed[c.id]
      ? `<span>changed</span><span class="note">${esc(s.changed[c.id])}</span>`
      : '';

  el.innerHTML =
    `<div class="card-head"><h4>${esc(c.title)}</h4>${chip}</div>` +
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
  let html = `<div><h5>Evidence (${sources.length})</h5>${src ? `<ul>${src}</ul>` : '<div class="none">⊘ no evidence attached</div>'}</div>`;
  if (c.signposts) {
    html += `<div><h5>Signposts</h5><ul>${c.signposts.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>`;
  }
  if (c.level === 'assumptions') {
    const deps = store.state.cards.filter((i) => i.rests && i.rests.includes(c.id));
    html += `<div><h5>Initiatives resting on this</h5>${
      deps.length
        ? `<ul>${deps.map((i) => `<li>${esc(i.title)} · ${i.pct}%</li>`).join('')}</ul>`
        : '<div class="none">none · this bet is floating free of any action</div>'
    }</div>`;
  }
  if (c.rests) {
    html += `<div><h5>Rests on</h5><ul>${c.rests
      .map((id) => {
        const a = byId(id);
        return `<li>${a ? esc(a.title) + ' · ev <span class="dots">' + dots(a.ev ?? 0) + '</span>' : esc(id)}</li>`;
      })
      .join('')}</ul></div>`;
  }
  if (c.analogue && ANALOGUES[c.analogue]) {
    const a = ANALOGUES[c.analogue];
    html +=
      `<div><h5>Prior strategy</h5><div class="analogue"><span class="t">${esc(a.t)}</span>` +
      `<span class="k">commoditised</span><span>${esc(a.what)}</span>` +
      `<span class="k">value moved to</span><span>${esc(a.where)}</span>` +
      `<span class="k">survivor tracked</span><span>${esc(a.tracked)}</span>` +
      `<span class="k">loser believed</span><span>${esc(a.believed)}</span></div></div>`;
  }
  html += `<div><h5>History</h5>${
    c.hist.length ? `<ul class="hist">${c.hist.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : '<div class="none">no changes recorded</div>'
  }</div>`;
  d.innerHTML = html;
  return d;
}

export function renderSnaps(): void {
  const w = $('#snaps');
  w.innerHTML = '<span class="lbl">snapshots</span>';
  store.snapshots.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'snap' + (store.viewing === i ? ' active' : '');
    b.textContent = s.name;
    b.dataset.i = String(i);
    w.appendChild(b);
  });
  const now = document.createElement('button');
  now.className = 'snap now' + (store.viewing === null ? ' active' : '');
  now.textContent = 'now';
  now.dataset.i = 'now';
  w.appendChild(now);
}
