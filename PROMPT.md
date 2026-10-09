You are continuing the autonomous overnight build of Waypoint. Nobody is here to answer questions.

Start by reading, in this order: CLAUDE.md, PROGRESS.md (the last two entries), CHECKS.md, then the parts of SPEC.md that the next unchecked item needs. Open reference/waypoint.html if the item concerns anything visual or behavioural; it is the target to match.

Then do exactly one iteration of the loop in CLAUDE.md:

1. Pick the first unchecked, unblocked item in CHECKS.md. If none remain, do one UX self-improvement iteration (CLAUDE.md, "Self-improve the UI"), then the top Backlog item in SPEC.md.
2. Implement the smallest change that could make it pass.
3. Run `npm run verify`. Open the new screenshots with the Read tool and look at them. Write what you saw into verify/REPORT.md. Fix defects, re-run.
4. Tick the box only with evidence. Commit with a plain message. Append an entry to PROGRESS.md. Commit again.

Rules that matter most tonight: commit after every step; never ask; never add features outside SPEC.md; the scripted runner must always work offline; if an item fails three iterations in a row mark it blocked and move on; when the build is green, keep improving the UX one moment at a time and log before/after.

End your turn after the PROGRESS.md commit. The next run will pick up from there.
