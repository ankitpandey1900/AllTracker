/**
 * Vite environment type augmentation
 *
 * Tells TypeScript about our custom environment variables so
 * `import.meta.env.VITE_*` has proper types.
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  // No VITE_ prefixed environment variables allowed on the frontend for security
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
