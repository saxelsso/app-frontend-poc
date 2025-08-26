<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import type { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();

// Form state
const selectedProductId = ref<string>('');
const stockLevel = ref<number | null>(null);
const purchasePrice = ref<number | null>(null);
const showForm = ref<boolean>(false);
const formError = ref<string>('');

// Edit mode state
const editingInventory = ref<Schema['Inventory']["type"] | null>(null);
const isEditMode = ref<boolean>(false);

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
  if (purchasePrice.value !== null && (isNaN(purchasePrice.value) || purchasePrice.value < 0)) {
    formError.value = 'Purchase price must be a non-negative number';
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
    if (isEditMode.value && editingInventory.value) {
      // Update existing inventory
      await client.models.Inventory.update({
        id: editingInventory.value.id,
        stockLevel: stockLevel.value as number,
        purchasePrice: purchasePrice.value,
        lastUpdated: Date.now(),
      });
    } else {
      const existing = await findExistingInventoryByProduct(selectedProductId.value);

      if (existing) {
        await client.models.Inventory.update({
          id: existing.id,
          stockLevel: stockLevel.value as number,
          purchasePrice: purchasePrice.value,
          lastUpdated: Date.now(),
        });
      } else {
        await client.models.Inventory.create({
          productId: selectedProductId.value,
          stockLevel: stockLevel.value as number,
          purchasePrice: purchasePrice.value,
          lastUpdated: Date.now(),
        });
      }
    }

    // Refresh list and reset
    listInventory();
    resetForm();
    showForm.value = false;
  } catch (e) {
    formError.value = 'Failed to save inventory. Please try again.';
  }
}

function startEdit(inventory: Schema['Inventory']["type"]) {
  editingInventory.value = inventory;
  isEditMode.value = true;

  // Pre-fill form with inventory data
  selectedProductId.value = inventory.productId;
  stockLevel.value = inventory.stockLevel;
  purchasePrice.value = inventory.purchasePrice ?? null;

  showForm.value = true;

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function resetForm() {
  selectedProductId.value = '';
  stockLevel.value = null;
  purchasePrice.value = null;
  formError.value = '';
  editingInventory.value = null;
  isEditMode.value = false;
}

function toggleForm() {
  showForm.value = !showForm.value;
  if (!showForm.value) resetForm();
}

function cancelEdit() {
  resetForm();
  showForm.value = false;
}


onMounted(() => {
  listProducts();
  listInventory();
});
</script>

<template>
  <div class="inventory-container">
    <button @click="toggleForm" v-if="!showForm">+ Add Inventory</button>

    <div v-if="showForm" class="form-container">
      <h3>{{ isEditMode ? 'Edit Inventory' : 'Add Inventory' }}</h3>

      <div class="form-group">
        <label for="productSelect">Product</label>
        <select
            id="productSelect"
            v-model="selectedProductId"
            :disabled="isEditMode"
            required
        >
          <option value="" disabled>Select a product</option>
          <option
              v-for="p in products"
              :key="p.productId"
              :value="p.productId"
          >
            {{ p.productName }} (ID: {{ p.productId }})
          </option>
        </select>
        <small v-if="isEditMode" class="help-text">Product cannot be changed when editing</small>
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
      <div class="form-group">
        <label for="purchasePrice">Purchase Price (per unit)</label>
        <input
            id="purchasePrice"
            v-model.number="purchasePrice"
            type="number"
            min="0"
            step="0.01"
            placeholder="Enter purchase price"
        />
        <small class="help-text">Optional: Cost per unit when acquired</small>
      </div>

      <div v-if="formError" class="error-message">{{ formError }}</div>

      <div class="form-actions">
        <button @click="saveInventory" class="submit-btn">
          {{ isEditMode ? 'Update Inventory' : 'Save Inventory' }}
        </button>
        <button @click="cancelEdit" class="cancel-btn">Cancel</button>
      </div>
    </div>

    <h3 v-if="!showForm">Inventory</h3>
    <div v-if="inventoryItems.length > 0" class="inventory-grid">
      <div
          v-for="inv in inventoryItems"
          :key="inv.id ?? `${inv.productId}-${inv.lastUpdated}`"
          class="inventory-card"
      >
        <div class="card-header">
          <div class="product-name">
            {{ productNameById.get(inv.productId) ?? inv.productId }}
          </div>
          <button @click="startEdit(inv)" class="edit-btn">Edit</button>
        </div>

        <div class="card-meta">
          <span class="product-id">ID: {{ inv.productId }}</span>
          <span class="update-date">{{ inv.lastUpdated ? new Date(inv.lastUpdated).toLocaleString() : '—' }}</span>
        </div>

        <div class="card-info">
          <div class="info-row">
            <div class="info-item stock-item">
              <span class="label">Stock:</span>
              <span class="value stock">{{ inv.stockLevel }}</span>
            </div>

            <template v-if="inv.purchasePrice !== null && inv.purchasePrice !== undefined">
              <div class="info-item">
                <span class="label">Unit cost:</span>
                <span class="value price">{{ inv.purchasePrice.toFixed(2) }} kr</span>
              </div>

              <div class="info-item">
                <span class="label">Total value:</span>
                <span class="value total">{{ (inv.purchasePrice * inv.stockLevel).toFixed(2) }} kr</span>
              </div>
            </template>
          </div>
        </div>

      </div>
    </div>
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

select:disabled {
  background-color: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}

.help-text {
  display: block;
  margin-top: 4px;
  font-size: 0.85em;
  color: #6b7280;
  font-style: italic;
}

.submit-btn {
  background-color: #4a5568;
  color: white;
  margin-right: 8px;
}

.cancel-btn {
  background-color: #e5e7eb;
  color: #374151;
}

.error-message {
  color: #e53e3e;
  margin-bottom: 10px;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

/* Improved inventory listing */
.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 0;
  background: transparent;
}

.inventory-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  padding: 16px;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

/* Vuetify theme color hover effect */
.inventory-card:hover {
  box-shadow: 0 4px 8px rgba(25, 118, 210, 0.15);
  border-color: rgb(25, 118, 210, 0.3);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.product-name {
  font-weight: 600;
  font-size: 1.1rem;
  color: #1f2937;
  line-height: 1.3;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #6b7280;
  margin-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 8px;
}

.update-date {
  color: #9ca3af;
  font-size: 0.75rem;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.stock-item {
  min-width: 70px;
}

.label {
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 2px;
}

.value {
  font-weight: 500;
  font-size: 0.95rem;
}

.value.stock {
  color: #4a5568;
  font-weight: 600;
}

.value.price {
  color: #059669;
}

.value.total {
  color: #7c2d12;
  font-weight: 600;
}


.edit-btn {
  background-color: #3b82f6;
  color: white;
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  margin: 0;
  height: 32px;
}

.edit-btn:hover {
  background-color: #2563eb;
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .inventory-grid {
    grid-template-columns: 1fr;
  }

  .card-info {
    gap: 10px;
  }
  .info-row {
    justify-content: space-around;
  }

  .info-item {
    text-align: center;
    align-items: center;
    flex: 1;
  }

  .stock-item {
    min-width: unset;
  }

}
</style>