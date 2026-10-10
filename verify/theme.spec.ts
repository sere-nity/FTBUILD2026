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

/** Put the page into a state that exercises every coloured style: changed card, ⚠ gap,
 *  open detail, product level open, job header and read-only banner visible. */
const richState = (page: Page) =>
  page.evaluate(() => {
    const { store, render } = window.__waypoint;
    store.state.expanded.product = true;
    store.state.changed['p1'] = 'exposed to agents';
    store.state.cards.find((c) => c.id === 'a2')!.ev = 1;
    store.open['a1'] = true;
    render();
    const job = document.querySelector<HTMLElement>('#job')!;
    job.hidden = false;
    document.querySelector('#jobmeta')!.textContent = 'reaches 3 levels · 2 / 7 cells';
    document.querySelector<HTMLElement>('#jobbar')!.style.width = '30%';
    const ro = document.querySelector<HTMLElement>('#ro')!;
    ro.hidden = false;
    ro.textContent = 'Viewing Jul · read only';
  });

// Every piece of text whose colour comes from a different token than plain ink.
const TEXT_SELECTORS = [
  '.brand',
  '.brand small',
  '.tbtn',
  '.level-head h3',
  '.level-head .count',
  '.level-head .count.changed',
  '.compact',
  '.compact b',
  '.compact button',
  '.card h4',
  '.fields .k',
  '.fields .v',
  '.chip',
  '.status',
  '.status .note',
  '.flag',
  '.detail h5',
  '.detail li',
  '.detail a',
  '.detail .none',
  '.analogue .k',
  '.analogue .t',
  '.hist',
  '.log h3',
  '#jobtitle',
  '.job .line2',
  '.job .stop',
  '.readonly',
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
    for (const must of ['.chip', '.flag', '.detail a', '.analogue .k', '.job .stop', '.readonly', '.level-head .count.changed', '.status .note'])
      expect(seen, `no visible sample for ${must}`).toContain(must);
    const failures = samples
      .map((s) => ({ ...s, ratio: contrast(s.fg, s.bg) }))
      .filter((s) => s.ratio < 4.5)
      .map((s) => `${s.sel} "${s.text}" ${s.fg} on ${s.bg} = ${s.ratio.toFixed(2)}`);
    expect(failures, failures.join('\n')).toEqual([]);
    await shot(page, testInfo.project.name, '02-states');
  });

  test('interactive borders and focus rings are visible against the paper', async ({ page }) => {
    const rings = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const resolve = (v: string) => {
        const p = document.createElement('div');
        p.style.color = v;
        document.body.appendChild(p);
        const c = getComputedStyle(p).color;
        p.remove();
        return c;
      };
      return {
        paper: resolve(root.getPropertyValue('--paper')),
        card: resolve(root.getPropertyValue('--card')),
        signal: resolve(root.getPropertyValue('--signal')),
        warn: resolve(root.getPropertyValue('--warn')),
        rule: resolve(root.getPropertyValue('--rule')),
      };
    });
    // Focus ring (signal) and the ⚠/stop colour (warn) must stand out as UI components: WCAG 3:1.
    expect(contrast(rings.signal, rings.paper)).toBeGreaterThanOrEqual(3);
    expect(contrast(rings.signal, rings.card)).toBeGreaterThanOrEqual(3);
    expect(contrast(rings.warn, rings.paper)).toBeGreaterThanOrEqual(3);
    // Rules are meant to be quiet, but must still be visible.
    expect(contrast(rings.rule, rings.card)).toBeGreaterThanOrEqual(1.2);
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
