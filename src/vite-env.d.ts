/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Seed demo data on first launch (`'true'` | `'false'`). Defaults to true. */
  readonly VITE_SEED_DEMO_DATA?: string;
  /** Artificial latency in milliseconds for every local API call. Defaults to 0. */
  readonly VITE_SIMULATED_LATENCY_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
