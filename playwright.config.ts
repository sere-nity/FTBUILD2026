import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './verify',
  outputDir: './verify/.out',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'off',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'desktop-light',
      use: {
        viewport: { width: 1280, height: 800 },
        colorScheme: 'light',
      },
    },
    {
      name: 'phone-light',
      use: {
        viewport: { width: 400, height: 800 },
        colorScheme: 'light',
      },
    },
    {
      name: 'desktop-dark',
      use: {
        viewport: { width: 1280, height: 800 },
        colorScheme: 'dark',
      },
    },
    {
      name: 'phone-dark',
      use: {
        viewport: { width: 400, height: 800 },
        colorScheme: 'dark',
      },
    },
  ],
});
