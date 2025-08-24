<script setup lang="ts">
import OrderHistory from '@/components/OrderHistory.vue';
</script>

<template>
  <div class="orderhistory-view">
    <OrderHistory />
  </div>
</template>

<style scoped>
.orderhistory-view {
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