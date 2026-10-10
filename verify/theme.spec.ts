import { test, expect, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// CHECKS.md: "Light and dark themes both legible; every colour from a token; body has explicit background".

const shot = (page: Page, name: string, frame: string) =>
  page.screenshot({ path: `verify/shots/theme/${frame}.${name}.png`, fullPage: true });

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** WCAG relative luminance of an rgb() string. */
const lum = (rgb: string): number => {
  const [r, g, b] = rgb.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Put the page into a state that exercises every coloured style: changed card with its note,
 *  ⚠ gap, a ↓ arrow, a fired trigger, every chip tint, compare ghosts, two open details, the
 *  product level open, the rail lit with "starts here", the intervene job header, the compare
 *  button on, the read-only banner, and a warn log line with a source link. The intro strip is
 *  still on screen because no run has started. */
const richState = (page: Page) =>
  page.evaluate(() => {
    const { store, render } = window.__waypoint;
    const card = (id: string) => store.state.cards.find((c) => c.id === id)!;
    store.state.expanded.product = true;
    store.state.changed['p1'] = 'DJ promoted';
    Object.assign(card('a2'), { ev: 1, trend: '↓', trendOn: 'ev' }); // gap ⚠ and a down arrow
    card('w2').chip = 'rising';
    Object.assign(card('i3'), { chip: 'fragile', triggerHit: true }); // ⚑ fired
    store.open['a1'] = true;
    store.open['a3'] = true; // no bets ride on a3, so its detail shows the "none." line
    store.compare = true; // a2's evidence shows the Jul value ghosted
    store.job = {
      phase: 'intervene', kind: 'milestone', dir: 'up',
      levels: ['code', 'product', 'initiatives', 'assumptions'],
      touches: '1 milestone, 2 product flows, 1 bet, 2 beliefs', done: 0, total: 6,
    };
    store.runDir = 'up';
    store.activeLevel = 'initiatives';
    store.touched = new Set(['code', 'product', 'initiatives']);
    render();
    const ro = document.querySelector<HTMLElement>('#ro')!;
    ro.hidden = false;
    ro.textContent = 'Viewing the “Jul” snapshot, read-only. Click “now” to come back.';
    // A warn line with a source link, as the runner writes them, so those styles are sampled too.
    const line = document.createElement('div');
    line.className = 'l warn';
    line.innerHTML = 'Belief “Labels keep licensing on current terms” now carries <b>3 bets</b>. <span class="src">· <a href="#">source</a></span>';
    document.querySelector('#log .entry')!.appendChild(line);
  });

// Every piece of text whose colour comes from a different token than plain ink.
const TEXT_SELECTORS = [
  '.brand',
  '.brand small',
  '.snaps .lbl',
  '.snap',
  '.snap.active',
  '.tbtn',
  '.tbtn.on',
  '.intro p',
  '.intro p b',
  '.intro .go',
  '.intro .go small',
  '.intro .x',
  '.level-head h3',
  '.level-head .sub',
  '.level-head .count',
  '.level-head .count.changed',
  '.level-head .entry',
  '.rail .arrow',
  '.compact',
  '.compact b',
  '.compact span.n',
  '.compact button',
  '.card h4',
  '.fields .k',
  '.fields .v',
  '.fields .arrow',
  '.fields .arrow.down',
  '.ghost',
  '.chip',
  '.chip.live',
  '.chip.rising',
  '.chip.hedge',
  '.chip.fragile',
  '.chip.robust',
  '.chip.changed',
  '.status',
  '.status .note',
  '.flag',
  '.detail h5',
  '.detail li',
  '.detail a',
  '.detail .none',
  '.analogue .k',
  '.analogue .t',
  '.hist li',
  '.log h3',
  '.log .sub',
  '.entry .eh',
  '.entry .eh b',
  '.entry .eh .kind',
  '.entry .eh .t',
  '.entry .l',
  '.entry .l.sig',
  '.entry .l.warn',
  '.entry .l b',
  '.entry .l .src',
  '.entry .l .src a',
  '#jobtitle',
  '.job .line2',
  '.job .line2 em',
  '.job .stop',
  '.readonly',
  '.try .lbl',
  '.hint small',
  '.hint span',
  '.prompt .pen',
  '.prompt .kbd',
];

type Sample = { sel: string; text: string; fg: string; bg: string; size: number };

/** For each selector, the computed text colour and the first opaque background behind it. */
const sample = (page: Page, selectors: string[]) =>
  page.evaluate((sels): Sample[] => {
    const out: Sample[] = [];
    const opaque = (c: string) => !/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\)/.test(c) && c !== 'transparent';
    for (const sel of sels) {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
        const text = (el.textContent || '').trim();
        if (!text || el.offsetParent === null) continue;
        let node: HTMLElement | null = el;
        let bg = '';
        while (node) {
          const c = getComputedStyle(node).backgroundColor;
          if (opaque(c)) { bg = c; break; }
          node = node.parentElement;
        }
        const cs = getComputedStyle(el);
        out.push({ sel, text: text.slice(0, 30), fg: cs.color, bg, size: parseFloat(cs.fontSize) });
      }
    }
    return out;
  }, selectors);

/** Resolve a CSS colour expression (a token value or var()) to the rgb() the browser uses. */
const resolveAll = (page: Page, names: string[]) =>
  page.evaluate((ns) => {
    const root = getComputedStyle(document.documentElement);
    const out: Record<string, string> = {};
    for (const n of ns) {
      const p = document.createElement('div');
      p.style.color = root.getPropertyValue(`--${n}`);
      document.body.appendChild(p);
      out[n] = getComputedStyle(p).color;
      p.remove();
    }
    return out;
  }, names);

test.describe('themes: legible, tokenised, explicit body background', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.level[data-level="world"] .card').first().waitFor();
  });

  test('body has an explicit background equal to --paper, matching the colour scheme', async ({ page }, testInfo) => {
    const dark = testInfo.project.use.colorScheme === 'dark';
    const got = await page.evaluate(() => {
      const root = document.documentElement;
      const paper = getComputedStyle(root).getPropertyValue('--paper').trim();
      // Resolve the token to rgb() the same way the browser does for body.
      const probe = document.createElement('div');
      probe.style.backgroundColor = paper;
      document.body.appendChild(probe);
      const paperRgb = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return {
        body: getComputedStyle(document.body).backgroundColor,
        html: getComputedStyle(root).backgroundColor,
        paperRgb,
        scheme: getComputedStyle(root).colorScheme,
      };
    });
    expect(got.body).not.toBe('rgba(0, 0, 0, 0)');
    expect(got.body).toBe(got.paperRgb);
    // The page is actually dark in the dark project and light in the light one.
    const l = lum(got.body);
    if (dark) expect(l).toBeLessThan(0.05);
    else expect(l).toBeGreaterThan(0.85);
    if (dark) expect(got.scheme).toBe('dark');
    await shot(page, testInfo.project.name, '01-first-load');
  });

  test('every piece of text reaches 4.5:1 against what it sits on', async ({ page }, testInfo) => {
    await richState(page);
    const samples = await sample(page, TEXT_SELECTORS);
    // Sanity: the rich state really exposed the rarer styles.
    const seen = new Set(samples.map((s) => s.sel));
    const must = [
      '.chip.live', '.chip.rising', '.chip.hedge', '.chip.fragile', '.chip.robust', '.chip.changed',
      '.flag', '.fields .arrow.down', '.ghost', '.detail a', '.detail .none', '.analogue .k', '.hist li',
      '.job .stop', '.job .line2 em', '.readonly', '.tbtn.on', '.snap.active',
      '.level-head .count.changed', '.level-head .entry', '.rail .arrow', '.status', '.status .note',
      '.intro .go', '.intro .go small', '.intro .x', '.try .lbl', '.hint small', '.hint span', '.prompt .kbd',
      '.entry .eh .kind', '.entry .eh .t', '.entry .l.sig', '.entry .l.warn', '.entry .l .src a',
    ];
    for (const m of must) expect(seen, `no visible sample for ${m}`).toContain(m);
    const failures = samples
      .map((s) => ({ ...s, ratio: contrast(s.fg, s.bg) }))
      .filter((s) => s.ratio < 4.5)
      .map((s) => `${s.sel} "${s.text}" ${s.fg} on ${s.bg} = ${s.ratio.toFixed(2)}`);
    expect(failures, failures.join('\n')).toEqual([]);
    await shot(page, testInfo.project.name, '02-states');
  });

  test('interactive borders, focus rings and tinted pairs are visible against what they sit on', async ({ page }) => {
    const t = await resolveAll(page, [
      'paper', 'card', 'card-2', 'rule', 'ink', 'ink-2', 'ink-3',
      'signal', 'signal-soft', 'warn', 'warn-soft', 'good', 'good-soft',
    ]);
    // Focus ring (signal) and the ⚠/stop colour (warn) must stand out as UI components: WCAG 3:1.
    expect(contrast(t.signal, t.paper)).toBeGreaterThanOrEqual(3);
    expect(contrast(t.signal, t.card)).toBeGreaterThanOrEqual(3);
    expect(contrast(t.signal, t['card-2'])).toBeGreaterThanOrEqual(3); // the job bar and the "starts here" tag sit on card-2
    expect(contrast(t.warn, t.paper)).toBeGreaterThanOrEqual(3);
    expect(contrast(t.warn, t['card-2'])).toBeGreaterThanOrEqual(3); // the Stop button sits on card-2
    // Rules are meant to be quiet, but must still be visible.
    expect(contrast(t.rule, t.card)).toBeGreaterThanOrEqual(1.2);
    expect(contrast(t.rule, t.paper)).toBeGreaterThanOrEqual(1.2);
    // Each accent and its soft tint are a text/background pair (chips, the entry tag, the read-only banner).
    for (const k of ['signal', 'warn', 'good']) {
      expect(contrast(t[k], t[`${k}-soft`]), `${k} on ${k}-soft`).toBeGreaterThanOrEqual(4.5);
      // The tint must also read as a tint: distinguishable from the card it sits on.
      expect(contrast(t[`${k}-soft`], t.card), `${k}-soft vs card`).toBeGreaterThanOrEqual(1.05);
    }
    // The quietest ink is used for 10–12px labels on both card surfaces.
    expect(contrast(t['ink-3'], t.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t['ink-3'], t['card-2'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t['ink-3'], t.paper)).toBeGreaterThanOrEqual(4.5);
    // Inverted surfaces: paper on ink (active snapshot pill, the intro's primary button).
    expect(contrast(t.paper, t.ink)).toBeGreaterThanOrEqual(4.5);
  });

  test('every colour in the stylesheet is a token; no literals outside :root', async () => {
    const css = readFileSync(join(ROOT, 'src/style.css'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    // Drop the token definition blocks (any rule whose selector starts with :root).
    const body = css.replace(/:root[^{]*\{[^}]*\}/g, '');
    const colourProps = /(?:^|[\s;{])(color|background(?:-color)?|border(?:-[a-z]+)*|box-shadow|outline|fill|stroke)\s*:\s*([^;}]+)/g;
    const literal = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|color|oklch|lab)\(|\b(?:white|black|red|blue|green|gr[ae]y|yellow|orange|purple|silver|navy)\b/;
    const offenders: string[] = [];
    for (const m of body.matchAll(colourProps)) {
      const value = m[2].trim();
      if (literal.test(value)) offenders.push(`${m[1]}: ${value}`);
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
    // And nothing else in the file sneaks a hex in (e.g. inside a gradient).
    expect(body.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });

  test('every token the stylesheet uses is defined for light and for both dark paths', async () => {
    const css = readFileSync(join(ROOT, 'src/style.css'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const blocks = [...css.matchAll(/(:root[^{]*)\{([^}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
    const defs = (b: string) => new Set([...b.matchAll(/--([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const light = blocks.find((b) => b.sel === ':root');
    const darkAuto = blocks.find((b) => b.sel.startsWith(':root:not([data-theme="light"])'));
    const darkForced = blocks.find((b) => b.sel === ':root[data-theme="dark"]');
    expect(light, 'light :root block').toBeTruthy();
    expect(darkAuto, 'prefers-color-scheme dark block').toBeTruthy();
    expect(darkForced, '[data-theme="dark"] block').toBeTruthy();
    const L = defs(light!.body);
    const DA = defs(darkAuto!.body);
    const DF = defs(darkForced!.body);
    // Every colour token (a hex or rgba value in light) is redefined on both dark paths, and
    // the two dark paths define the same set. Font tokens live in light only.
    const colourTokens = [...light!.body.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\()/g)].map((m) => m[1]);
    expect(colourTokens.length).toBeGreaterThan(10);
    for (const t of colourTokens) {
      expect(DA.has(t), `--${t} missing from the prefers-color-scheme dark block`).toBe(true);
      expect(DF.has(t), `--${t} missing from the [data-theme="dark"] block`).toBe(true);
    }
    expect([...DA].sort()).toEqual([...DF].sort());
    for (const t of DA) expect(L.has(t), `--${t} defined for dark but not light`).toBe(true);
    // Every var(--x) used outside :root is a defined token. `--bar-h` is set from bar.ts at runtime.
    const body = css.replace(/:root[^{]*\{[^}]*\}/g, '');
    const used = new Set([...body.matchAll(/var\(--([a-z0-9-]+)/g)].map((m) => m[1]));
    const undefinedTokens = [...used].filter((t) => !L.has(t) && t !== 'bar-h');
    expect(undefinedTokens, undefinedTokens.join(', ')).toEqual([]);
    // Every soft tint has its strong partner, and vice versa, so a tinted surface always has a legible text colour.
    for (const t of L) {
      if (t.endsWith('-soft')) expect(L.has(t.replace(/-soft$/, '')), `--${t} has no strong partner`).toBe(true);
    }
    for (const t of ['signal', 'warn', 'good']) expect(L.has(`${t}-soft`), `--${t}-soft`).toBe(true);
  });

  test('no inline colours in markup or scripts', async () => {
    const files = [
      join(ROOT, 'index.html'),
      ...readdirSync(join(ROOT, 'src')).filter((f) => f.endsWith('.ts')).map((f) => join(ROOT, 'src', f)),
      ...readdirSync(join(ROOT, 'src/runner')).filter((f) => f.endsWith('.ts')).map((f) => join(ROOT, 'src/runner', f)),
    ];
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/style\s*=\s*["'`][^"'`]*(?:color|background)[^"'`]*["'`]|#[0-9a-fA-F]{6}\b/g))
        offenders.push(`${f.replace(ROOT + '/', '')}: ${m[0]}`);
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
