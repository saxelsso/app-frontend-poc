<script setup lang="ts">
import Portfolio from '@/components/Portfolio.vue';
</script>

<template>
  <div class="portfolio-view">
    <h1>Investment Portfolio</h1>
    <Portfolio />
  </div>
</template>

<style scoped>
.portfolio-view {
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