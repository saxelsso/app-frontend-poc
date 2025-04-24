<script setup lang="ts">
import Sales from '@/components/Sales.vue';
</script>

<template>
  <div class="sales-view">
    <h1>Sales Opportunities</h1>
    <Sales />
  </div>
</template>

<style scoped>
.sales-view {
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