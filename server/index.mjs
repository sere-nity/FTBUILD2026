// Waypoint LLM proxy (SPEC §5, §9). Holds ANTHROPIC_API_KEY so it never reaches the browser.
// One model call per event returns a strict-JSON plan the browser runs through the same cell
// state machine as the scripted runner. The browser falls back to the scripted runner on any
// non-200 here, so this server must never be required for the demo to work.
//
//   ANTHROPIC_API_KEY=sk-ant-… npm run server      # http://localhost:8787
//   WAYPOINT_LLM=1 npm run dev                     # Vite proxies /api → :8787

import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.WAYPOINT_MODEL || 'claude-opus-5-5';

const LEVELS = ['world', 'assumptions', 'initiatives', 'product', 'code'];

// Fields the model may change, per level. `us` (belief) is never here (SPEC §5).
const MUTABLE = {
  world: ['chip', 'f', 'hist'],
  assumptions: ['ev', 'exposure', 'kind', 'hist'],
  initiatives: ['pct', 'chip', 'triggerHit', 'hist'],
  product: ['note', 'hist'],
  code: ['title', 'note', 'hist'],
};

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['entry', 'dir', 'levels', 'touches', 'opening', 'cells', 'closing'],
  properties: {
    entry: { type: 'string', enum: LEVELS },
    dir: { type: 'string', enum: ['up', 'down'] },
    levels: { type: 'array', items: { type: 'string', enum: LEVELS } },
    touches: { type: 'string', description: 'e.g. "1 milestone, 2 product flows, 1 initiative"' },
    opening: { type: 'string', description: 'One short line shown when the run starts, e.g. "reaches 4 levels, bottom-up · world not touched"' },
    cells: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'status', 'note', 'mutation', 'why', 'line', 'cls', 'source'],
        properties: {
          id: { type: 'string' },
          status: { type: 'string', description: '"Reading…" or "Preparing…"' },
          note: { type: 'string', description: 'What the agent is doing for this cell, under 60 chars' },
          mutation: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: { type: ['string', 'null'] },
              note: { type: ['string', 'null'] },
              pct: { type: ['integer', 'null'] },
              ev: { type: ['integer', 'null'] },
              exposure: { type: ['integer', 'null'] },
              chip: { type: ['string', 'null'] },
              kind: { type: ['string', 'null'] },
              triggerHit: { type: ['boolean', 'null'] },
              signposts: { type: ['string', 'null'], description: 'world cards only, e.g. "2 / 4 hit"' },
              hist: { type: 'string', description: 'One history line, e.g. "Oct 10: 20% → 70%"' },
            },
            required: ['title', 'note', 'pct', 'ev', 'exposure', 'chip', 'kind', 'triggerHit', 'signposts', 'hist'],
          },
          why: { type: 'string', description: 'Two or three words shown on the CHANGED chip, e.g. "20% → 70%"' },
          line: { type: 'string', description: 'One plain log sentence for this cell' },
          cls: { type: 'string', enum: ['', 'sig', 'warn'] },
          source: { type: ['string', 'null'], description: 'A source id from the shelf, or null' },
        },
      },
    },
    closing: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['line', 'cls', 'source'],
        properties: {
          line: { type: 'string' },
          cls: { type: 'string', enum: ['', 'sig', 'warn'] },
          source: { type: ['string', 'null'] },
        },
      },
    },
  },
};

const SYSTEM = `You are the runner inside Waypoint, a living strategy stack with five levels, top to bottom: world (scenarios), beliefs (level id "assumptions"), bets (level id "initiatives"), product, code. Given one event and the full current state, you decide how the change ripples through the stack and write the plainest possible log sentences for it.

Rules, in order of importance:
- Belief ("us") is the user's. Never change it.
- Evidence ("ev") may only change when you attach a source id from the shelf.
- Work events (shipped, launched, milestone) enter at code and run bottom-up: code → product → initiatives → assumptions. World is never touched by a work event.
- World events (a signpost moved, a label changed terms, a regulator acted) enter at world and run top-down: world → assumptions → initiatives. Product and code are not touched unless a trigger fires.
- Touch few cards. Three to six cells is normal. Only touch a card whose value actually moves; list cells in run order, grouped by level.
- Numbers: ev, exposure are 0–5; pct is 0–100. Bet chip is robust|hedge|fragile. World chip is live|rising|watch|fading. Belief kind is fact|interpretation|prediction.
- Mutation fields you are not changing must be null. "hist" is always one short dated line, e.g. "Oct 10: 60% → 100%".
- Log sentences: sentence case, full stops, no exclamation marks, one idea each, under 30 words. Call beliefs "Belief “…”", bets "Bet “…”", scenarios "Scenario “…”". Cite a source id only when the sentence rests on it. Use cls "sig" for the one line that matters most, "warn" when a bet got riskier or a belief is out of step with its evidence.
- "touches" reads like "1 milestone, 2 product flows, 1 bet, 2 beliefs". "opening" reads like "Reaches 4 levels, moving up from Code. The World level is not touched: shipping code changes your position, not the world."
- "closing" is one or two next-move lines, each tied to a card that just changed. No essays.`;

const client = new Anthropic({ timeout: 25_000, maxRetries: 1 });

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: MODEL, key: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) });
});

app.post('/api/plan', async (req, res) => {
  const { text, intent, state, sources } = req.body ?? {};
  if (typeof text !== 'string' || !state?.cards || !sources) {
    return res.status(400).json({ error: 'expected { text, intent, state, sources }' });
  }
  try {
    const user = [
      `Event (${intent}): ${text}`,
      '',
      'Current state (JSON):',
      JSON.stringify(stripTransient(state)),
      '',
      'Source shelf (id → text):',
      JSON.stringify(Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, v.t]))),
      '',
      'Return the plan.',
    ].join('\n');

    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 6000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
    });

    if (response.stop_reason === 'refusal') {
      return res.status(502).json({ error: 'model declined', category: response.stop_details?.category ?? null });
    }
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock) return res.status(502).json({ error: 'no text in response', stop_reason: response.stop_reason });

    let plan;
    try {
      plan = JSON.parse(textBlock.text);
    } catch {
      return res.status(502).json({ error: 'invalid JSON from model' });
    }
    const checked = enforce(plan, state, sources);
    if (checked.error) return res.status(502).json(checked);
    res.json({ plan: checked.plan, model: response.model, usage: response.usage });
  } catch (err) {
    const status = err instanceof Anthropic.AuthenticationError ? 401
      : err instanceof Anthropic.RateLimitError ? 429
      : err instanceof Anthropic.APIError ? 502
      : 500;
    console.error(`[plan] ${err?.constructor?.name ?? 'Error'}: ${err?.message ?? err}`);
    res.status(status).json({ error: err?.message ?? String(err) });
  }
});

/** Drop the transient run keys so the model sees settled values only. */
function stripTransient(state) {
  const cards = state.cards.map((c) => {
    const o = { ...c };
    for (const k of Object.keys(o)) if (k.startsWith('_')) delete o[k];
    return o;
  });
  return { ...state, cards };
}

/**
 * The guardrails (SPEC §5), applied after the model answers so a bad plan is rejected rather
 * than run: ids must exist, levels must match the direction, `us` is never touched, `ev` moves
 * only with a source id from the shelf, unknown source ids become null.
 */
function enforce(plan, state, sources) {
  const byId = new Map(state.cards.map((c) => [c.id, c]));
  const srcOk = (s) => (typeof s === 'string' && s in sources ? s : null);

  const order = plan.dir === 'up' ? [...LEVELS].reverse() : LEVELS;
  const levels = order.filter((l) => plan.levels.includes(l));
  if (levels.length === 0) return { error: 'plan reaches no level' };
  if (plan.dir === 'up' && levels.includes('world')) return { error: 'a work event touched world' };

  const cells = [];
  for (const cell of plan.cells) {
    const card = byId.get(cell.id);
    if (!card) return { error: `unknown card id ${cell.id}` };
    if (!levels.includes(card.level)) return { error: `cell ${cell.id} is outside the plan's levels` };
    const allowed = MUTABLE[card.level];
    const m = {};
    for (const [k, v] of Object.entries(cell.mutation)) {
      if (v === null || v === undefined) continue;
      if (k === 'us') return { error: 'the model tried to change belief' };
      if (k === 'signposts') {
        if (card.level === 'world') m.f = { ...(card.f ?? {}), signposts: v, lastMoved: 'Oct 2026' };
        continue;
      }
      if (!allowed.includes(k)) continue;
      m[k] = v;
    }
    const source = srcOk(cell.source);
    if ('ev' in m && !source) return { error: `cell ${cell.id} moved evidence without a source` };
    if (Object.keys(m).filter((k) => k !== 'hist').length === 0) continue; // nothing moves: not a cell
    cells.push({ ...cell, mutation: m, source });
  }
  if (cells.length === 0) return { error: 'plan has no cell that changes anything' };
  cells.sort((a, b) => levels.indexOf(byId.get(a.id).level) - levels.indexOf(byId.get(b.id).level));

  const closing = (plan.closing ?? []).slice(0, 2).map((l) => ({ ...l, source: srcOk(l.source) }));
  return { plan: { ...plan, levels, cells, closing, entry: plan.dir === 'up' ? 'code' : 'world' } };
}

app.listen(PORT, () => {
  const key = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  console.log(`waypoint llm proxy on http://localhost:${PORT} · model ${MODEL} · key ${key ? 'set' : 'NOT set'}`);
});
