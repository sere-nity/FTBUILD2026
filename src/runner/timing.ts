// All timing constants in one place — see SPEC §5. Milliseconds.
export const TIMING = {
  scanning: 1100, // every level dimmed while classify runs
  intervene: 2000, // "Reaches N levels" shown; Esc stops with nothing changed
  prepare: 700, // a cell's spinner + note before it settles
  prepareFast: 300, // second cell in the same level, started while the first prepares
  prepareOverlap: 200, // third-and-later cells in the same level
  settle: 350, // pause after a cell settles, before the next one starts
  logLine: 260, // pause after each log line
  highlight: 3000, // soft highlight on cards an answer refers to
} as const;
