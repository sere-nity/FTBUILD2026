// Prompt bar: hint chips, the input, ⌘K / Ctrl+K focus, submit.
// Intent routing (SPEC §5) plugs in through `onSubmit`; until the runner exists the
// bar only clears itself.

export const HINTS: ReadonlyArray<readonly [text: string, title: string]> = [
  ['shipped the agent-facing giving API', 'milestone · bottom-up'],
  ['world update', 'signpost crossed · top-down'],
  ['look at the repo', 'agent reads code, writes the prompt'],
  ['why is SEO fragile?', 'ask · nothing changes'],
  ['donors will want AI to pick causes for them', 'unmatched · one unplaced card'],
];

export type Submit = (text: string) => void;

let onSubmit: Submit = () => {};

export function setSubmit(fn: Submit): void {
  onSubmit = fn;
}

export function initBar(root: HTMLElement): void {
  root.insertAdjacentHTML(
    'beforeend',
    `
  <div class="barwrap">
    <div class="hints" id="hints"></div>
    <form class="prompt" id="form">
      <span class="pen" aria-hidden="true">✎</span>
      <label class="sr" for="prompt">Tell it what changed, or ask</label>
      <input id="prompt" placeholder="tell it what changed, or ask…" autocomplete="off">
      <span class="kbd" aria-hidden="true">⌘K</span>
    </form>
  </div>`,
  );

  const hints = root.querySelector<HTMLDivElement>('#hints')!;
  const input = root.querySelector<HTMLInputElement>('#prompt')!;
  const form = root.querySelector<HTMLFormElement>('#form')!;

  for (const [text, title] of HINTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hint';
    b.textContent = text;
    b.title = title;
    b.addEventListener('click', () => submit(text));
    hints.appendChild(b);
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    submit(input.value);
  });

  document.addEventListener('keydown', (ev) => {
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      input.focus();
    }
  });

  function submit(text: string): void {
    const t = text.trim();
    input.value = '';
    if (!t) return;
    onSubmit(t);
  }
}
