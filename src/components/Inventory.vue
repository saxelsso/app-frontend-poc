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
    <ul v-if="inventoryItems.length > 0">
      <li
          v-for="inv in inventoryItems"
          :key="inv.id ?? `${inv.productId}-${inv.lastUpdated}`"
      >
        <div class="inventory-item">
          <div class="item-header">
            <div class="product-info">
              <div class="product-name">
                {{ productNameById.get(inv.productId) ?? inv.productId }}
              </div>
              <div class="product-id">ID: {{ inv.productId }}</div>
            </div>
            <div class="last-updated">
              {{ inv.lastUpdated ? new Date(inv.lastUpdated).toLocaleString() : '—' }}
            </div>
          </div>

          <div class="item-details">
            <div class="stock-info">
              <span class="stock-label">Stock:</span>
              <span class="stock-value">{{ inv.stockLevel }}</span>
            </div>

            <div class="price-info" v-if="inv.purchasePrice !== null && inv.purchasePrice !== undefined">
              <div class="price-item">
                <span class="price-label">Unit:</span>
                <span class="price-value">{{ inv.purchasePrice.toFixed(2) }} kr</span>
              </div>
              <div class="price-item">
                <span class="price-label">Total:</span>
                <span class="total-value">{{ (inv.purchasePrice * inv.stockLevel).toFixed(2) }} kr</span>
              </div>
            </div>

            <div class="item-actions">
              <button @click="startEdit(inv)" class="edit-btn">Edit</button>
            </div>
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

/* Compact inventory item layout */
.inventory-item {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 16px;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-name {
  font-weight: bold;
  font-size: 1.1em;
  color: #1f2937;
  margin-bottom: 4px;
}

.product-id {
  font-size: 0.9em;
  color: #6b7280;
}

.last-updated {
  font-size: 0.8em;
  color: #9ca3af;
  text-align: right;
  flex-shrink: 0;
  line-height: 1.2;
}

.item-details {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.stock-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stock-label {
  font-size: 0.9em;
  color: #6b7280;
}

.stock-value {
  font-weight: 600;
  color: #4a5568;
  font-size: 1.1em;
}

.price-info {
  display: flex;
  gap: 16px;
  align-items: center;
}

.price-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.price-label {
  font-size: 0.8em;
  color: #6b7280;
  margin-bottom: 2px;
}

.price-value {
  font-weight: 500;
  color: #059669;
  font-size: 0.95em;
}

.total-value {
  font-weight: 600;
  color: #7c2d12;
  font-size: 0.95em;
}

.item-actions {
  flex-shrink: 0;
}

.edit-btn {
  background-color: #3b82f6;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  margin: 0;
}

.edit-btn:hover {
  background-color: #2563eb;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .inventory-item {
    padding: 12px;
  }

  .item-header {
    gap: 8px;
  }

  .last-updated {
    font-size: 0.75em;
    max-width: 80px;
    word-break: break-word;
  }

  .item-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .price-info {
    align-self: stretch;
    justify-content: space-around;
  }

  .stock-info {
    align-self: flex-start;
  }

  .item-actions {
    align-self: stretch;
  }

  .edit-btn {
    width: 100%;
    padding: 10px;
  }
}

@media (max-width: 480px) {
  .price-info {
    gap: 12px;
  }

  .price-item {
    flex: 1;
  }

  .last-updated {
    font-size: 0.7em;
    max-width: 70px;
  }
}
</style>