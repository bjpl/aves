/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_API_VERSION: string
  readonly VITE_ENABLE_UNSPLASH: boolean
  readonly VITE_ENABLE_ANALYTICS: boolean
  readonly VITE_DEBUG_MODE: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}