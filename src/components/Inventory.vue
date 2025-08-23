<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import type { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();

// Form state
const selectedProductId = ref<string>('');
const stockLevel = ref<number | null>(null);
const showForm = ref<boolean>(false);
const formError = ref<string>('');

// Data collections
const products = ref<Array<Schema['Product']["type"]>>([]);
const inventoryItems = ref<Array<Schema['Inventory']["type"]>>([]);

// Helper to show product names in the list
const productNameById = computed(() => {
  const map = new Map<string, string>();
  for (const p of products.value) {
    if (p.productId) map.set(p.productId, p.productName ?? p.productId);
  }
  return map;
});

function listProducts() {
  // Keep products up to date for the select dropdown and name lookups
  client.models.Product.observeQuery().subscribe({
    next: ({ items }) => {
      products.value = items;
    },
  });
}

function listInventory() {
  // Live query of inventory entries
  client.models.Inventory.observeQuery().subscribe({
    next: ({ items }) => {
      // Collapse duplicates so only one row per productId remains (latest by lastUpdated)
      const latestByProduct = new Map<string, Schema['Inventory']["type"]>();
      for (const it of items) {
        const existing = latestByProduct.get(it.productId);
        if (!existing || (it.lastUpdated ?? 0) > (existing.lastUpdated ?? 0)) {
          latestByProduct.set(it.productId, it);
        }
      }
      const collapsed = Array.from(latestByProduct.values());
      // Sort most recently updated first (optional)
      inventoryItems.value = collapsed.sort((a, b) => (b.lastUpdated ?? 0) - (a.lastUpdated ?? 0));
    },
  });
}

function validateForm(): boolean {
  if (!selectedProductId.value.trim()) {
    formError.value = 'Please select a product';
    return false;
  }
  if (stockLevel.value === null || isNaN(stockLevel.value) || stockLevel.value < 0 || !Number.isInteger(stockLevel.value)) {
    formError.value = 'Stock level must be a non-negative integer';
    return false;
  }
  formError.value = '';
  return true;
}

// Find an existing inventory row by productId (returns first match if any)
async function findExistingInventoryByProduct(productId: string) {
  const res = await client.models.Inventory.list({
    filter: { productId: { eq: productId } },
    limit: 1,
  });
  return res.data?.[0];
}

// Save inventory: update if exists, otherwise create
async function saveInventory() {
  if (!validateForm()) return;

  try {
    const existing = await findExistingInventoryByProduct(selectedProductId.value);

    if (existing) {
      await client.models.Inventory.update({
        id: existing.id,
        stockLevel: stockLevel.value as number,
        lastUpdated: Date.now(),
      });
    } else {
      await client.models.Inventory.create({
        productId: selectedProductId.value,
        stockLevel: stockLevel.value as number,
        lastUpdated: Date.now(),
      });
    }

    // Refresh list and reset
    listInventory();
    resetForm();
    showForm.value = false;
  } catch (e) {
    formError.value = 'Failed to save inventory. Please try again.';
  }
}

function resetForm() {
  selectedProductId.value = '';
  stockLevel.value = null;
  formError.value = '';
}

function toggleForm() {
  showForm.value = !showForm.value;
  if (!showForm.value) resetForm();
}

onMounted(() => {
  listProducts();
  listInventory();
});
</script>

<template>
  <div class="inventory-container">
    <button @click="toggleForm">{{ showForm ? 'Cancel' : '+ Add Inventory' }}</button>

    <div v-if="showForm" class="form-container">
      <h3>Add Inventory</h3>

      <div class="form-group">
        <label for="productSelect">Product</label>
        <select id="productSelect" v-model="selectedProductId" required>
          <option value="" disabled>Select a product</option>
          <option
              v-for="p in products"
              :key="p.productId"
              :value="p.productId"
          >
            {{ p.productName }} (ID: {{ p.productId }})
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="stockLevel">Stock Level</label>
        <input
            id="stockLevel"
            v-model.number="stockLevel"
            type="number"
            min="0"
            step="1"
            placeholder="Enter stock level"
            required
        />
      </div>

      <div v-if="formError" class="error-message">{{ formError }}</div>

      <div class="form-actions">
        <button @click="saveInventory" class="submit-btn">Save Inventory</button>
      </div>
    </div>

    <h3 v-if="!showForm">Inventory</h3>
    <ul v-if="inventoryItems.length > 0">
      <li
          v-for="inv in inventoryItems"
          :key="inv.id ?? `${inv.productId}-${inv.lastUpdated}`"
      >
        <div class="inventory-details">
          <div class="product-name">
            {{ productNameById.get(inv.productId) ?? inv.productId }}
          </div>
          <div class="product-id">ID: {{ inv.productId }}</div>
          <div class="stock-level">Stock: {{ inv.stockLevel }}</div>
          <div class="last-updated">
            Updated: {{ inv.lastUpdated ? new Date(inv.lastUpdated).toLocaleString() : '—' }}
          </div>
        </div>
      </li>
    </ul>
    <p v-else-if="!showForm">No inventory yet. Add one!</p>
  </div>
</template>

<style scoped>
.inventory-container {
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

input, select {
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

.inventory-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-name {
  font-weight: bold;
  font-size: 1.1em;
}

.product-id, .last-updated {
  font-size: 0.9em;
  color: #666;
}

.stock-level {
  font-weight: 500;
  color: #4a5568;
}
</style>