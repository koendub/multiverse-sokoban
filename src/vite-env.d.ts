/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to "true" to show the dev-only level-solver button - see components/SolverPanel.tsx and .env.example. Off by default; not meant for players. */
  readonly VITE_ENABLE_SOLVER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
