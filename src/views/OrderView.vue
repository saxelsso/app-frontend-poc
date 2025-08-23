<script setup lang="ts">
import Order from '@/components/Order.vue';
</script>

<template>
  <div class="order-view">
    <h1>Order</h1>
    <Order />
  </div>
</template>

<style scoped>
.order-view {
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