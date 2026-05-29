export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2026-05-29',

  modules: ['@nuxt/ui'],

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
  },

  nitro: {
    preset: 'cloudflare_module',
  },

  runtimeConfig: {
    accessPassword: '',   // NUXT_ACCESS_PASSWORD
    anthropicApiKey: '',  // NUXT_ANTHROPIC_API_KEY
    openaiApiKey: '',     // NUXT_OPENAI_API_KEY
    geminiApiKey: '',     // NUXT_GEMINI_API_KEY
    encryptionKey: '',    // NUXT_ENCRYPTION_KEY
    public: {},
  },

  typescript: {
    strict: true,
  },

  devtools: {
    enabled: true,
  },
})
