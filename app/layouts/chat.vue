<template>
  <div class="h-screen bg-[#080E1C] flex flex-col overflow-hidden">
    <AppHeader />
    <main class="flex-1 overflow-hidden container mx-auto px-6 py-6 max-w-4xl flex flex-col">
      <slot />
    </main>
  </div>
</template>
