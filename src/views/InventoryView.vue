<script setup lang="ts">
import Inventory from '@/components/Inventory.vue';
</script>

<template>
  <div class="inventory-view">
    <Inventory />
  </div>
</template>

<style scoped>
.inventory-view {
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