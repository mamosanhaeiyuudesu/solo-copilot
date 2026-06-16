export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2026-05-29',

  modules: ['@nuxt/ui', '@vite-pwa/nuxt'],

  css: ['~/assets/css/main.css'],

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'MY AGENT',
      short_name: 'MY AGENT',
      description: '個人用AIエージェントアプリ',
      theme_color: '#0f172a',
      background_color: '#0f172a',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'maskable-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//],
      runtimeCaching: [
        {
          urlPattern: /^\/api\/.*/,
          handler: 'NetworkOnly',
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
  },

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
