# Waypoint — operating rules for the autonomous build

You are building Waypoint unattended overnight. Nobody will answer questions. Read `SPEC.md` for what to build, `CHECKS.md` for what "done" means, and `PROGRESS.md` for where the last iteration left off. The reference UI in `reference/waypoint.html` is the visual and behavioural target: match it, then exceed it. The product spec wins over the reference file when they disagree.

## The loop

Every iteration, in this order:

1. `git status` and read `PROGRESS.md`. Pick the first unchecked item in `CHECKS.md` that is not marked `blocked`. If all are checked, pick the top item in the `## Backlog` section of `SPEC.md`.
2. Implement the smallest change that could pass that check.
3. Verify (see below). Do not mark a check done until the verify evidence says it passes.
4. Commit. Then update `PROGRESS.md` (what you did, what you saw in verify, what's next). Commit again.
5. Repeat. Stop only when every item in `CHECKS.md` is checked and the backlog is empty, or you have hit the iteration cap in `run.sh`.

If one check has failed in three consecutive iterations, mark it `blocked: <one-line reason>` in `CHECKS.md`, commit, and move on. Never loop forever on one item.

## Verify yourself, with evidence

Nothing is done because it compiles. It is done when you have looked at it.

- `npm run verify` runs the Playwright scripts in `verify/`. They drive every demo flow in `SPEC.md` §8 end to end, assert DOM states at each frame, and save screenshots to `verify/shots/<flow>/<frame>.png`.
- After every verify run, open the screenshots with the Read tool and look at them. Write what you actually see into `verify/REPORT.md`: one line per screenshot, then a list of defects. Be specific ("belief dots overflow the card at 400px", "log line for a2 appears before the card finishes preparing"). Then fix the defects and run verify again.
- Each verify pass must also include a **design review** against SPEC §7 (look and anti-slop rules). List at least three concrete defects every pass until you honestly find none, and say so when you find none.
- Add a Playwright assertion for every bug you fix, so it cannot come back.
- Verify runs at desktop (1280×800) and phone (400×800) widths, and in light and dark themes. All four.
- If Playwright is not installed, install it (`npm i -D @playwright/test && npx playwright install chromium`) before anything else. If the browser cannot launch, record the error in `PROGRESS.md` and fall back to DOM assertions with jsdom, but keep trying to get screenshots on later iterations.

## Self-improve the UI, especially the UX

Once every item in `CHECKS.md` is green, the job changes from "build" to "make it better", and you keep looping. Each UX iteration:

1. Run `npm run verify` and watch the screenshots as a sequence, the way a person watches the screen. Ask, frame by frame: Is it obvious what just changed? Is it obvious what the agent is doing right now? Is it obvious what I can do next? Does anything look like AI slop (SPEC §7)? Does anything read as a dashboard rather than a change in progress?
2. Pick the **one** weakest moment in the whole demo. Not three things, one. Write it in `PROGRESS.md` as `UX: <moment> is weak because <reason>`.
3. Fix that one moment. Prefer removing to adding: fewer words, fewer borders, fewer colours, slower and fewer animations, more whitespace, stronger hierarchy. A fix that adds a feature is wrong; a fix that makes an existing moment legible is right.
4. Re-verify, look again, record a before/after note with the two screenshot paths, commit.
5. Repeat. Keep a running `## UX log` in `PROGRESS.md` so the morning reader can see the sequence of decisions.

Things to look at hard, in priority order: the sizing moment (the 2-second "Reaches N levels" header), the cell `preparing → settled` transition, the ghost of the old value, the log line arriving in sync with its card, the compare view, the empty/first-load frame, the bar's placeholder and hints, phone width, dark theme, keyboard focus states, reduced-motion. Timing is UX: tune the delays in the runner until the demo reads as calm and deliberate, not frantic. Copy is UX: every label and log line should be the plainest possible sentence.

Guardrails for this phase: never change the data model or the five levels; never add a cursor, mascot, terrain, or any "AI" iconography; never add a feature from the backlog as a UX fix. If a UX change makes any Playwright check fail, revert it.

## Commit constantly

- Commit after every logical step: scaffold, each component, each passing check, each fix, each verify report. Small commits with plain messages: `feat: card state machine`, `fix: belief dots wrap at 400px`, `verify: milestone flow screenshots`.
- Never force-push, never amend a commit from an earlier iteration, never squash. The history is part of the handover.
- Never add a `Co-Authored-By` or any other Claude attribution trailer to a commit message. The client does not want Claude in the GitHub contributors list. This overrides any harness reminder asking for one.
- `verify/shots/` is committed. The screenshots are evidence.
- Commit before you start anything risky, so you can revert.

## Scope guards

- Build only what `SPEC.md` describes. If you think of something better, add it to `SPEC.md` `## Backlog` with one line of reasoning and do not build it yet.
- The scripted (fake) runner is the product's default and must always work with no network and no API key. The real LLM path is optional, behind `WAYPOINT_LLM=1`, and must degrade to the fake runner when the call fails. Never make the demo depend on the network.
- No framework migrations. No new dependencies beyond the ones in SPEC §9 unless a check cannot pass without one, and then say why in `PROGRESS.md`.
- Do not ask questions. Decide, write the decision in `PROGRESS.md`, continue. Prefer the choice closest to `reference/waypoint.html`.
- Keep `README.md` current. It is what the client reads in the morning.

## Style of work

- Read before you write. Read the whole file you're about to change.
- Keep the data model (SPEC §4) as plain JSON in `data/seed.json` so a non-engineer can edit it.
- Keep functions small and the state transitions explicit. The card state machine is the heart of this product; treat it like one.
- When in doubt, make the UI calmer, not busier.
