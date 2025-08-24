<script setup lang="ts">
import Stats from '@/components/Stats.vue';
</script>

<template>
  <div class="stats-view">
    <Stats />
  </div>
</template>

<style scoped>
.stats-view {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  margin-bottom: 2rem;
  color: #4a5568;
}
</style>