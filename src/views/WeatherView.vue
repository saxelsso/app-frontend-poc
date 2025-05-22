<script setup lang="ts">
import Weather from '@/components/Weather.vue';
</script>

<template>
  <div class="weather-view">
    <h1>Current Weather</h1>
    <Weather />
  </div>
</template>

<style scoped>
.weather-view {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
</style>