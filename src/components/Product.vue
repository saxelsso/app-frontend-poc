<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';
import { isValidBarcode } from '@/utils/barcodeValidation';
import BarcodeScanner from '@/components/BarcodeScanner.vue';

const client = generateClient<Schema>();

// Create reactive references for form inputs
const productId = ref<string>('');
const productName = ref<string>('');
const listPrice = ref<number | null>(null);
const barcode = ref<string>('');
const isSellable = ref<boolean>(false);
const showForm = ref<boolean>(false);
const formError = ref<string>('');
const showScanner = ref<boolean>(false);

// Edit mode state
const editingProduct = ref<Schema['Product']["type"] | null>(null);
const isEditMode = ref<boolean>(false);

// Create a reactive reference to the array of products
const products = ref<Array<Schema['Product']["type"]>>([]);

// Scanner event handlers
const openBarcodeScanner = () => {
  showScanner.value = true;
};

const handleBarcodeScanned = (scannedBarcode: string) => {
  barcode.value = scannedBarcode;
  showScanner.value = false;
};

const handleScannerClosed = () => {
  showScanner.value = false;
};

function listProducts() {
  client.models.Product.observeQuery().subscribe({
    next: ({ items, isSynced }) => {
      products.value = items;
    },
  });
}

function generateProductId(): string {
  // Generate a simple ID using timestamp and random number
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PRD-${timestamp}-${random}`;
}

function validateForm(): boolean {
  if (!isEditMode.value && !productId.value.trim()) {
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
  const barcodeValidation = isValidBarcode(barcode.value);
  if (!barcodeValidation.valid) {
    formError.value = barcodeValidation.error;
    return false;
  }
  formError.value = '';
  return true;
}

function createProduct() {
  if (!validateForm()) return;

  // Generate ID if not provided (for new products)
  const finalProductId = productId.value || generateProductId();

  client.models.Product.create({
    productId: finalProductId,
    productName: productName.value,
    listPrice: listPrice.value as number,
    barcode: barcode.value || undefined, // Send undefined if empty to let it be optional
    isSellable: isSellable.value,
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

function updateProduct() {
  if (!validateForm() || !editingProduct.value) return;

  client.models.Product.update({
    productId: editingProduct.value.productId,
    productName: productName.value,
    listPrice: listPrice.value as number,
    barcode: barcode.value || undefined, // Send undefined if empty to let it be optional
    isSellable: isSellable.value,
  }).then(() => {
    // After updating, refresh the list
    listProducts();
    // Reset form and exit edit mode
    resetForm();
    showForm.value = false;
  }).catch((error) => {
    formError.value = 'Failed to update product. Please try again.';
  });
}

function startEdit(product: Schema['Product']["type"]) {
  editingProduct.value = product;
  isEditMode.value = true;

  // Pre-fill form with product data (don't populate productId as it shouldn't be editable)
  productId.value = ''; // Keep empty since we don't want users to edit this
  productName.value = product.productName || '';
  listPrice.value = product.listPrice || null;
  barcode.value = product.barcode || '';
  isSellable.value = product.isSellable || false;

  showForm.value = true;

  // Scroll to top to show the edit form
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

}

function handleSave() {
  if (isEditMode.value) {
    updateProduct();
  } else {
    createProduct();
  }
}

function resetForm() {
  productId.value = '';
  productName.value = '';
  listPrice.value = null;
  barcode.value = '';
  isSellable.value = false;
  formError.value = '';
  editingProduct.value = null;
  isEditMode.value = false;
}

function toggleForm() {
  showForm.value = !showForm.value;
  if (showForm.value === false) {
    resetForm();
  } else if (!isEditMode.value) {
    // Auto-generate ID for new products
    productId.value = generateProductId();
  }
}

function cancelEdit() {
  resetForm();
  showForm.value = false;
}

// Fetch products when the component is mounted
onMounted(() => {
  listProducts();
});
</script>

<template>
  <div class="products-container">
    <button @click="toggleForm" v-if="!showForm">+ Add Product</button>

    <div v-if="showForm" class="form-container">
      <h3>{{ isEditMode ? 'Edit Product' : 'New Product' }}</h3>

      <!-- Show Product ID field only for new products, and make it read-only with generated value -->
      <div v-if="!isEditMode" class="form-group">
        <label for="productId">Product ID</label>
        <input
            id="productId"
            v-model="productId"
            type="text"
            placeholder="Auto-generated ID"
            readonly
            class="readonly-input"
        />
        <small class="help-text">ID is automatically generated</small>
      </div>

      <!-- Show current product ID for edit mode (read-only) -->
      <div v-if="isEditMode" class="form-group">
        <label>Product ID</label>
        <div class="readonly-field">{{ editingProduct?.productId }}</div>
        <small class="help-text">Product ID cannot be changed</small>
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

      <div class="form-group">
        <label for="barcode">Barcode</label>
        <div class="barcode-input-group">
          <input
              id="barcode"
              v-model="barcode"
              type="text"
              placeholder="Enter barcode (optional)"
          />
          <button
              type="button"
              @click="openBarcodeScanner"
              class="scan-btn"
              title="Scan Barcode"
          >
            <v-icon>mdi-barcode-scan</v-icon>
          </button>
        </div>
      </div>

      <div class="form-group">
        <v-checkbox
            v-model="isSellable"
            label="Product is sellable"
            color="primary"
        ></v-checkbox>
      </div>

      <div v-if="formError" class="error-message">{{ formError }}</div>

      <div class="form-actions">
        <button @click="handleSave" class="submit-btn">
          {{ isEditMode ? 'Update Product' : 'Save Product' }}
        </button>
        <button @click="cancelEdit" class="cancel-btn">Cancel</button>
      </div>
    </div>
    <!-- Scanner Component -->
    <BarcodeScanner
        v-model:show="showScanner"
        @barcode-scanned="handleBarcodeScanned"
        @close="handleScannerClosed"
    />

    <h3 v-if="!showForm">Products</h3>
    <ul v-if="products.length > 0">
      <li
          v-for="product in products"
          :key="product.productId">
        <div class="product-details">
          <div class="product-info">
            <div class="product-id">ID: {{ product.productId }}</div>
            <div class="product-name">{{ product.productName }}</div>
            <div class="product-price">€{{ product.listPrice?.toFixed(2) ?? '0.00' }}</div>
            <div class="product-barcode" v-if="product.barcode">Barcode: {{ product.barcode }}</div>

          </div>
          <div class="product-actions">
            <v-checkbox
                :model-value="product.isSellable"
                :label="product.isSellable ? 'Sellable' : 'Sellable'"
                color="success"
                readonly
                density="compact"
                hide-details
            ></v-checkbox>

            <button @click="startEdit(product)" class="edit-btn">Edit</button>
          </div>
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

.readonly-input {
  background-color: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}

.readonly-field {
  padding: 8px 12px;
  background-color: #f3f4f6;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #6b7280;
  font-size: 1em;
}

.help-text {
  display: block;
  margin-top: 4px;
  font-size: 0.85em;
  color: #6b7280;
  font-style: italic;
}

.barcode-input-group {
  display: flex;
  gap: 8px;
  align-items: stretch;
  flex-wrap: nowrap;
}

.barcode-input-group input {
  flex: 1;
  min-width: 0;
}

.scan-btn {
  background-color: #1976D2; /* Vuetify primary blue color */
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  white-space: nowrap;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  flex-shrink: 0;
}

.scan-btn:hover {
  background-color: #1565C0; /* Darker blue on hover */
}

/* Ensure the layout works well on very small screens */
@media (max-width: 320px) {
  .barcode-input-group {
    gap: 4px; /* Reduce gap on very small screens */
  }

  .scan-btn {
    padding: 8px 8px; /* Slightly reduce padding on very small screens */
    min-width: 40px;
  }
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

.product-details {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: nowrap;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
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

.product-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.edit-btn {
  background-color: #3b82f6;
  color: white;
  padding: 6px 12px;
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

.product-barcode {
  font-size: 0.9em;
  color: #666;
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .product-details {
    flex-direction: row; /* Keep row direction instead of column */
    gap: 8px; /* Reduce gap for tighter spacing */
    /* align-items: center; /* Center align items vertically */
  }

  .product-actions {
    /* Remove align-self as it's not needed anymore */
  }

  .edit-btn {
    padding: 8px 12px; /* Slightly smaller padding for narrow screens */
    font-size: 0.85em; /* Slightly smaller font */
  }

  .scan-btn {
    align-self: flex-start;
    width: fit-content;
  }

}

</style>