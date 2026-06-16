<script setup lang="ts">
useColorMode().preference = 'dark'

useHead({
  link: [{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
  meta: [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'apple-mobile-web-app-title', content: 'MY AGENT' },
  ],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
