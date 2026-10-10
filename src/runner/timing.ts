// All timing constants in one place — see SPEC §5
export const TIMING = {
  scanning: 1100,
  intervene: 2000,
  prepare: 700,
  prepareFast: 300,
  settle: 350,
  logLine: 260,
  highlight: 3000,
} as const;
