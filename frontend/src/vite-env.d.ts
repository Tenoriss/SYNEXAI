/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Optional API origin override for builds that do not use the Vite proxy
   * (e.g. a container that serves the frontend and the backend under one host).
   * Never put a key or a secret in a `VITE_*` variable: it ships to the browser.
   */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
