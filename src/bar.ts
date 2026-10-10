// Prompt bar: labelled "Try" actions, the input, ⌘K / Ctrl+K focus, submit.
// Intent routing (SPEC §5) happens in main.ts through `onSubmit`.

/** [label, text, primary?] — the label says what kind of input it is, the text is what gets submitted. */
export const HINTS: ReadonlyArray<readonly [label: string, text: string, primary?: boolean]> = [
  ['You shipped something', 'shipped AI DJ v2', true],
  ['The world moved', 'world update'],
  ['Let it read the code', 'look at the repo'],
  ['Ask a question', 'why is the API fragile?'],
  ['Say anything', 'listeners will pay extra for human-only playlists'],
];

export type Intent = 'ask' | 'inspect' | 'world' | 'milestone' | 'unmatched';

/** Intent routing (SPEC §5), same order and patterns as the reference. */
export function classify(text: string): Intent {
  const t = text.trim();
  if (/\?\s*$/.test(t) || /^(why|what|which|how)\b/i.test(t)) return 'ask';
  if (/repo|inspect|look at the code/i.test(t)) return 'inspect';
  if (/world|label|licen|signpost|regulat/i.test(t)) return 'world';
  if (/ship|dj|milestone|launch|released/i.test(t)) return 'milestone';
  return 'unmatched';
}

export type Submit = (text: string) => void;

let onSubmit: Submit = () => {};

export function setSubmit(fn: Submit): void {
  onSubmit = fn;
}

/** Submit text as if typed. Used by the intro's button and the hints. */
export function submitText(text: string): void {
  const t = text.trim();
  const input = document.querySelector<HTMLInputElement>('#prompt');
  if (input) input.value = '';
  if (!t) return;
  onSubmit(t);
}

export function initBar(root: HTMLElement): void {
  root.insertAdjacentHTML(
    'beforeend',
    `
  <div class="barwrap">
    <div class="try" id="hints"><span class="lbl">Try:</span></div>
    <form class="prompt" id="form">
      <span class="pen" aria-hidden="true">✎</span>
      <label class="sr" for="prompt">Tell it what you shipped, what the world did, or ask a question</label>
      <input id="prompt" placeholder="Tell it what you shipped, what the world did, or ask a question" autocomplete="off">
      <span class="kbd" aria-hidden="true">⌘K</span>
    </form>
  </div>`,
  );

  const wrap = root.querySelector<HTMLDivElement>('.barwrap')!;
  const hints = root.querySelector<HTMLDivElement>('#hints')!;
  const input = root.querySelector<HTMLInputElement>('#prompt')!;
  const form = root.querySelector<HTMLFormElement>('#form')!;

  for (const [label, text, primary] of HINTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hint' + (primary ? ' primary' : '');
    b.innerHTML = `<small>${label}</small><span>${text}</span>`;
    b.addEventListener('click', () => submitText(text));
    hints.appendChild(b);
  }

  // The bar is fixed and its height changes with viewport width (hints wrap at 400px).
  // Publish it as --bar-h so the page can pad its bottom and nothing hides behind the bar.
  const publish = () => document.documentElement.style.setProperty('--bar-h', `${wrap.offsetHeight}px`);
  publish();
  new ResizeObserver(publish).observe(wrap);

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    submitText(input.value);
  });

  document.addEventListener('keydown', (ev) => {
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      input.focus();
    }
  });
}
