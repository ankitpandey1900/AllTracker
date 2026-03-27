/**
 * Vite environment type augmentation
 *
 * Tells TypeScript about our custom environment variables so
 * `import.meta.env.VITE_*` has proper types.
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
