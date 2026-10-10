import { defineConfig } from 'vite';

// WAYPOINT_LLM=1 reaches the browser as import.meta.env.WAYPOINT_LLM (SPEC §5).
// /api is proxied to the Express proxy in server/, which holds the Anthropic key.
export default defineConfig({
  envPrefix: ['VITE_', 'WAYPOINT_'],
  server: {
    proxy: { '/api': 'http://localhost:8787' },
  },
});
