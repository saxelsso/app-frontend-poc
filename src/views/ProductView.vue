<script setup lang="ts">
import Product from '@/components/Product.vue';
</script>

<template>
  <div class="product-view">
    <Product />
  </div>
</template>

<style scoped>
.product-view {
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