
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();

// Create reactive references for form inputs
const productId = ref<string>('');
const productName = ref<string>('');
const listPrice = ref<number | null>(null);
const showForm = ref<boolean>(false);
const formError = ref<string>('');

// Create a reactive reference to the array of products
const products = ref<Array<Schema['Product']["type"]>>([]);

function listProducts() {
  client.models.Product.observeQuery().subscribe({
    next: ({ items, isSynced }) => {
      products.value = items;
    },
  });
}

function validateForm(): boolean {
  if (!productId.value.trim()) {
    formError.value = 'Product ID is required';
    return false;
  }
  if (!productName.value.trim()) {
    formError.value = 'Product name is required';
    return false;
  }
  if (listPrice.value === null || isNaN(listPrice.value) || listPrice.value <= 0) {
    formError.value = 'List price must be a positive number';
    return false;
  }
  formError.value = '';
  return true;
}

function createProduct() {
  if (!validateForm()) return;

  client.models.Product.create({
    productId: productId.value,
    productName: productName.value,
    listPrice: listPrice.value as number,
  }).then(() => {
    // After creating a new product, update the list
    listProducts();
    // Reset form
    resetForm();
    // Hide form
    showForm.value = false;
  }).catch((error) => {
    // Handle potential duplicate productId error
    if (error.errors && error.errors.some((e: any) => e.errorType === 'DynamoDB:ConditionalCheckFailedException')) {
      formError.value = 'Product ID already exists. Please use a different ID.';
    } else {
      formError.value = 'Failed to create product. Please try again.';
    }
  });
}

function resetForm() {
  productId.value = '';
  productName.value = '';
  listPrice.value = null;
  formError.value = '';
}

function toggleForm() {
  showForm.value = !showForm.value;
  if (showForm.value === false) {
    resetForm();
  }
}

// Fetch products when the component is mounted
onMounted(() => {
  listProducts();
});
</script>

<template>
  <div class="products-container">
    <button @click="toggleForm">{{ showForm ? 'Cancel' : '+ Add Product' }}</button>

    <div v-if="showForm" class="form-container">
      <h3>New Product</h3>

      <div class="form-group">
        <label for="productId">Product ID</label>
        <input
            id="productId"
            v-model="productId"
            type="text"
            placeholder="Enter unique product ID"
            required
        />
      </div>

      <div class="form-group">
        <label for="productName">Product Name</label>
        <input
            id="productName"
            v-model="productName"
            type="text"
            placeholder="Enter product name"
            required
        />
      </div>

      <div class="form-group">
        <label for="listPrice">List Price (EUR)</label>
        <input
            id="listPrice"
            v-model="listPrice"
            type="number"
            min="0"
            step="0.01"
            placeholder="Enter list price"
            required
        />
      </div>

      <div v-if="formError" class="error-message">{{ formError }}</div>

      <div class="form-actions">
        <button @click="createProduct" class="submit-btn">Save Product</button>
      </div>
    </div>

    <h3 v-if="!showForm">Products</h3>
    <ul v-if="products.length > 0">
      <li
          v-for="product in products"
          :key="product.productId">
        <div class="product-details">
          <div class="product-id">ID: {{ product.productId }}</div>
          <div class="product-name">{{ product.productName }}</div>
          <div class="product-price">€{{ product.listPrice?.toFixed(2) ?? '0.00' }}</div>
        </div>
      </li>
    </ul>
    <p v-else-if="!showForm">No products yet. Add one!</p>
  </div>
</template>

<style scoped>
.products-container {
  width: 100%;
  margin: 0 auto;
}

button {
  margin-bottom: 16px;
}

.form-container {
  background-color: #f8fafc;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  padding: 20px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

.submit-btn {
  background-color: #4a5568;
}

.error-message {
  color: #e53e3e;
  margin-bottom: 10px;
}

.product-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-name {
  font-weight: bold;
  font-size: 1.1em;
}

.product-id {
  font-size: 0.9em;
  color: #666;
}

.product-price {
  font-weight: 500;
  color: #4a5568;
}
</style>