# Waypoint

The framework with a memory: a living strategy stack that tracks which AI future is arriving and how exposed what you're building is to it.

Built for Stewardship at BUILD 26. This README is replaced by the build agent as the project grows; see SPEC.md for the product and CLAUDE.md for how the autonomous build runs.

## Kit contents
- `CLAUDE.md` operating rules for the unattended build (loop, verify, commit, UX self-improvement)
- `SPEC.md` the product spec, data model, flows, look, backlog
- `CHECKS.md` the acceptance list the agent ticks with evidence
- `PROGRESS.md` iteration journal and UX log
- `PROMPT.md` the per-iteration prompt
- `run.sh` the overnight loop
- `reference/waypoint.html` the single-file prototype the build must match, then exceed. Open it in a browser and click the hint chips.

## Run the overnight build
```
./run.sh 60
```
Leave it. In the morning read PROGRESS.md top to bottom, then `npm run dev`.
