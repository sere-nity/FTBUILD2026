// Log panel. Entries are prepended (newest on top); lines are appended to an entry as
// the run progresses. Prose lives only here (SPEC §7), two lines max per entry.
import { SRC } from './state';
import { TIMING } from './runner/timing';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Start a new entry: `HH:MM  KIND  title`. Title is user text, so it is escaped. */
export function logEntry(kind: string, title: string): HTMLElement {
  const e = document.createElement('div');
  e.className = 'entry';
  const t = new Date().toTimeString().slice(0, 5);
  e.innerHTML = `<div class="eh"><span>${t}</span><span class="kind">${esc(kind)}</span><b>${esc(title)}</b></div>`;
  document.querySelector('#log')!.prepend(e);
  return e;
}

export type LineClass = '' | 'sig' | 'warn';

/** Append one line to an entry, then pause so the log reads at a human pace. */
export async function logLine(e: HTMLElement, html: string, cls: LineClass = '', ms = TIMING.logLine): Promise<void> {
  const l = document.createElement('div');
  l.className = ('l ' + cls).trim();
  l.innerHTML = html;
  e.appendChild(l);
  if (ms) await sleep(ms);
}

/** Inline source link for a shelf id, or nothing if the source has no URL. */
export const cite = (k: string): string => {
  const s = SRC[k];
  return s?.u ? `<span class="src">· <a href="${s.u}" target="_blank" rel="noopener">source</a></span>` : '';
};

/** The baseline entry every session opens with. */
export function initLog(): void {
  const e = logEntry('snapshot', 'Jul');
  void logLine(e, 'baseline · 2 scenarios, 4 assumptions, 3 initiatives · 12 sources on the shelf', 'sig', 0);
  void logLine(e, 'signposts set in July, before any of them moved', '', 0);
}
