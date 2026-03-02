<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-primary/10">
    <div class="w-full max-w-md">
      <div class="text-center mb-10">
        <div class="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 mx-auto mb-5">
          <span class="text-2xl font-bold text-primary-foreground">K</span>
        </div>
        <h1 class="text-3xl font-extrabold text-foreground tracking-tight">Kiekskoloj</h1>
        <p class="text-muted-foreground mt-1.5">Split expenses with friends</p>
      </div>
      <slot />
    </div>
  </div>
</template>
