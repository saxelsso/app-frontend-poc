<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import type { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';
import BarcodeScanner from '@/components/BarcodeScanner.vue';

type Product = Schema['Product']['type'];
type Inventory = Schema['Inventory']['type'];
type Order = Schema['Order']['type'];

const client = generateClient<Schema>();

// Data stores
const products = ref<Product[]>([]);
const inventoryItems = ref<Inventory[]>([]);

// For a multi-line order form
type OrderLine = {
  productId: string;
  quantity: number | null;
};
const lines = reactive<OrderLine[]>([
  { productId: '', quantity: null },
]);


// UI state
const submitting = ref(false);
const formError = ref<string>('');
const formSuccess = ref<string>('');

// Scanner state
const showScanner = ref<boolean>(false);
const currentScanningLineIndex = ref<number>(0);

// Handle product selection from dropdown
const onProductSelected = (event: Event, lineIndex: number) => {
  const target = event.target as HTMLSelectElement;
  const productId = target.value;

  if (productId && lines[lineIndex].quantity === null) {
    // Set quantity to 1 when a product is selected and quantity is null
    lines[lineIndex].quantity = 1;
  }
};

// Scanner event handlers
const openBarcodeScanner = (lineIndex: number) => {
  currentScanningLineIndex.value = lineIndex;
  showScanner.value = true;
};

const handleBarcodeScanned = (scannedBarcode: string) => {
  // Find product by barcode
  const product = products.value.find(p => p.barcode === scannedBarcode && p.isSellable === true);

  if (product && product.productId) {
    // Set the productId for the current line being scanned
    lines[currentScanningLineIndex.value].productId = product.productId;
    // Set quantity to 1 when a product is selected via barcode
    lines[currentScanningLineIndex.value].quantity = 1;
    showScanner.value = false;
  } else {
    // Show error if barcode not found
    formError.value = `No product found with barcode: ${scannedBarcode}`;
    showScanner.value = false;
  }
};

const handleScannerClosed = () => {
  showScanner.value = false;
};

// Add these helper functions for the stepper
function incrementQuantity(index: number) {
  const current = lines[index].quantity || 0;
  if (current < 100) {
    lines[index].quantity = current + 1;
  }
}

function decrementQuantity(index: number) {
  const current = lines[index].quantity || 1;
  if (current > 1) {
    lines[index].quantity = current - 1;
  }
}

// Load products for select options
function listProducts() {
  client.models.Product.observeQuery().subscribe({
    next: ({ items }) => {
      // Filter to only include sellable products
      products.value = items.filter(product => product.isSellable === true);
    },
  });
}

// Load inventory and collapse by productId to get the latest record per product
// Load inventory and collapse by productId to get the latest record per product
function listInventory() {
  client.models.Inventory.observeQuery().subscribe({
    next: ({ items }) => {
      console.log('📋 Raw inventory items loaded:', items);

      const latestByProduct = new Map<string, Inventory>();
      for (const it of items) {
        console.log(`Processing inventory item:`, it);
        const existing = latestByProduct.get(it.productId);
        if (!existing || (it.lastUpdated ?? 0) > (existing.lastUpdated ?? 0)) {
          console.log(`Setting latest for ${it.productId}:`, it);
          latestByProduct.set(it.productId, it);
        }
      }

      inventoryItems.value = Array.from(latestByProduct.values());
      console.log('📊 Final inventory items after collapsing:', inventoryItems.value);
    },
  });
}

onMounted(() => {
  listProducts();
  listInventory();
});

// Helpers and computed maps
const productById = computed(() => {
  const map = new Map<string, Product>();
  for (const p of products.value) {
    if (p.productId) map.set(p.productId, p);
  }
  return map;
});

const stockByProductId = computed(() => {
  const map = new Map<string, number>();
  for (const inv of inventoryItems.value) {
    map.set(inv.productId, inv.stockLevel ?? 0);
  }
  return map;
});

const priceByProductId = computed(() => {
  const map = new Map<string, number>();
  for (const p of products.value) {
    if (p.productId) map.set(p.productId, p.listPrice ?? 0);
  }
  return map;
});

const lineSubtotals = computed(() => {
  return lines.map(l => {
    const price = priceByProductId.value.get(l.productId) ?? 0;
    const qty = Number.isFinite(l.quantity as number) ? (l.quantity as number) : 0;
    return +(price * qty).toFixed(2);
  });
});

const orderTotal = computed(() => {
  return +lineSubtotals.value.reduce((sum, s) => sum + s, 0).toFixed(2);
});

// UI actions
function addLine() {
  lines.push({ productId: '', quantity: null });
}

function removeLine(index: number) {
  lines.splice(index, 1);
  if (lines.length === 0) addLine();
}

function resetForm() {
  lines.splice(0, lines.length, { productId: '', quantity: null });
  formError.value = '';
  formSuccess.value = '';
}

// Validation
function validate(): boolean {
  formError.value = '';

  // At least one valid line
  const nonEmpty = lines.filter(l => l.productId && l.quantity !== null);
  if (nonEmpty.length === 0) {
    formError.value = 'Please add at least one product and quantity.';
    return false;
  }

  // Unique product per line to avoid double-counting
  const seen = new Set<string>();
  for (const [idx, l] of lines.entries()) {
    if (!l.productId) {
      formError.value = `Line ${idx + 1}: Please select a product.`;
      return false;
    }
    // Validate that the selected product is sellable
    const product = productById.value.get(l.productId);
    if (!product) {
      formError.value = `Line ${idx + 1}: Product not found.`;
      return false;
    }
    if (!product.isSellable) {
      formError.value = `Line ${idx + 1}: Product ${product.productName} is not sellable.`;
      return false;
    }

    if (seen.has(l.productId)) {
      formError.value = `Product ${productById.value.get(l.productId)?.productName ?? l.productId} is duplicated. Use quantity on a single line.`;
      return false;
    }
    seen.add(l.productId);

    if (l.quantity === null || !Number.isInteger(l.quantity) || (l.quantity as number) <= 0) {
      formError.value = `Line ${idx + 1}: Quantity must be a positive integer.`;
      return false;
    }

    const available = stockByProductId.value.get(l.productId) ?? 0;
    if ((l.quantity as number) > available) {
      formError.value = `Line ${idx + 1}: Only ${available} in stock for ${productById.value.get(l.productId)?.productName ?? l.productId}.`;
      return false;
    }
  }

  if (orderTotal.value <= 0) {
    formError.value = 'Order total must be greater than 0.';
    return false;
  }

  return true;
}

// Data helpers
function findInventoryByProductId(productId: string) {
  console.log(`🔍 Looking for inventory for productId: "${productId}"`);
  console.log('📋 Available inventory items in memory:', inventoryItems.value.map(inv => ({
    id: inv.id,
    productId: inv.productId,
    stockLevel: inv.stockLevel
  })));

  // Use the same inventory data that's already loaded and displayed in the UI
  const found = inventoryItems.value.find(inv => inv.productId === productId);

  console.log(`${found ? '✅' : '❌'} Found inventory record for "${productId}":`, found);
  return found || null;
}

// Submit order
async function submitOrder() {
  if (!validate()) return;

  submitting.value = true;
  formError.value = '';
  formSuccess.value = '';

  try {
    console.log('🚀 Starting order submission...');

    // Compute totals and unit prices at submission time
    const prepared = lines
        .filter(l => l.productId && l.quantity && l.quantity > 0)
        .map(l => {
          const unitPrice = priceByProductId.value.get(l.productId) ?? 0;
          const qty = l.quantity as number;
          const subtotal = +(unitPrice * qty).toFixed(2);
          return {
            productId: l.productId,
            quantity: qty,
            unitPrice,
            subtotal,
          };
        });

    console.log('📋 Prepared order items:', prepared);

    // Create the Order
    const orderRes = await client.models.Order.create({
      orderDate: Date.now(),
      status: 'completed',
      totalAmount: +prepared.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2),
    });

    const orderId = orderRes.data?.id as Order['id'];
    if (!orderId) {
      formError.value = 'Failed to create order';
      return;
    }

    console.log(`📝 Created order with ID: ${orderId}`);

    // Create OrderItems and update inventory for each line
    console.log('🔄 Processing inventory updates...');
    for (const [index, item] of prepared.entries()) {
      console.log(`\n--- Processing item ${index + 1}/${prepared.length} ---`);
      console.log(`Product ID: "${item.productId}", Quantity: ${item.quantity}`);

      // Create OrderItem
      console.log('📦 Creating OrderItem...');
      await client.models.OrderItem.create({
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      });
      console.log('✅ OrderItem created');

      // Update Inventory using in-memory data (no async database query)
      console.log('🔍 Finding inventory record in memory...');
      const inv = findInventoryByProductId(item.productId);

      if (!inv) {
        console.warn(`⚠️ No inventory row found for productId="${item.productId}". Skipping inventory update.`);
        continue;
      }

      const currentStock = inv.stockLevel ?? 0;
      const newStock = currentStock - item.quantity;

      console.log(`📊 Inventory update for "${item.productId}":`);
      console.log(`  - Current stock: ${currentStock}`);
      console.log(`  - Quantity sold: ${item.quantity}`);
      console.log(`  - New stock: ${newStock}`);
      console.log(`  - Inventory record ID: ${inv.id}`);

      console.log('💾 Updating inventory...');
      const updateResult = await client.models.Inventory.update({
        id: inv.id,
        stockLevel: newStock < 0 ? 0 : newStock,
        lastUpdated: Date.now(),
      });

      if (!updateResult.data) {
        console.warn(`⚠️ Failed to update inventory for product ${item.productId}`);
      } else {
        console.log('✅ Inventory update completed');
      }
    }

    console.log('🎉 All inventory updates completed!');
    formSuccess.value = `Order ${orderId} placed successfully.`;
    resetForm();

    // Refresh inventory to reflect new stock levels
    console.log('🔄 Refreshing inventory display...');
    listInventory();
  } catch (err: any) {
    console.error('❌ Order submission failed:', err);
    formError.value = err?.message || 'Failed to submit order. Please try again.';
  } finally {
    submitting.value = false;
  }
}

</script>

<template>
  <div class="sell-container">


    <div class="lines">
      <div
          class="line"
          v-for="(l, idx) in lines"
          :key="idx"
      >
        <div class="field product-field">
          <label>Product</label>
          <div class="product-input-group">
            <select v-model="l.productId" @change="onProductSelected($event, idx)">
            <option value="">Select a product</option>
              <option
                  v-for="p in products"
                  :key="p.productId"
                  :value="String(p.productId)"
                  :disabled="(stockByProductId.get(p.productId) ?? 0) <= 0"
              >
                {{ p.productName }} (ID: {{ p.productId }}) —
                {{ (p.listPrice ?? 0).toFixed(2) }} kr —
                Stock: {{ stockByProductId.get(p.productId) ?? 0 }}
              </option>
            </select>
            <button
                type="button"
                @click="openBarcodeScanner(idx)"
                class="scan-btn"
                title="Scan Barcode"
            >
              <v-icon>mdi-barcode-scan</v-icon>
            </button>
          </div>
        </div>

        <div class="qty-subtotal-row">
          <div class="field qty">
            <label>Quantity</label>
            <div class="qty-stepper">
              <v-btn
                  icon
                  size="small"
                  variant="outlined"
                  @click="decrementQuantity(idx)"
                  :disabled="(l.quantity || 1) <= 1"
              >
                <v-icon>mdi-minus</v-icon>
              </v-btn>

              <v-text-field
                  v-model="l.quantity"
                  readonly
                  variant="outlined"
                  density="compact"
                  style="width: 60px"
                  class="text-center"
                  hide-details
              ></v-text-field>

              <v-btn
                  icon
                  size="small"
                  variant="outlined"
                  @click="incrementQuantity(idx)"
                  :disabled="(l.quantity || 0) >= 100"
              >
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </div>
          </div>


          <div class="field subtotal">
            <label>Subtotal</label>
            <div class="subtotal-value">
              {{ lineSubtotals[idx].toFixed(2) }} kr
            </div>
          </div>

          <button
              class="remove-btn"
              v-if="lines.length > 1"
              @click="removeLine(idx)"
              title="Remove item"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- Scanner Component -->
    <BarcodeScanner
        v-model:show="showScanner"
        @barcode-scanned="handleBarcodeScanned"
        @close="handleScannerClosed"
    />

    <div class="actions">
      <button @click="addLine">+ Add Item</button>
    </div>

    <div class="summary">
      <div class="total">
        <strong>Total:</strong> {{ orderTotal.toFixed(2) }} kr
      </div>
    </div>

    <div v-if="formError" class="error">{{ formError }}</div>
    <div v-if="formSuccess" class="success">{{ formSuccess }}</div>

    <div class="submit">
      <button
          class="submit-btn"
          :disabled="submitting"
          @click="submitOrder"
      >
        {{ submitting ? 'Submitting...' : 'Place Order' }}
      </button>
      <button class="reset-btn" :disabled="submitting" @click="resetForm">Reset</button>
    </div>
  </div>
</template>

<style scoped>
.sell-container {
  width: 100%;
  margin: 0 auto;
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 16px;
}

.lines {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.line {
  background: #fff;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-field {
  width: 100%;
}

.qty-subtotal-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field select,
.field input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
}

.qty input {
  min-width: 0; /* Allow input to shrink */
}

.subtotal {
  display: flex;
  flex-direction: column;
}

.subtotal-value {
  padding: 8px 12px;
  background: #f3f4f6;
  border-radius: 4px;
  font-weight: 500;
  text-align: right;
}

.remove-btn {
  height: 36px;
  width: 36px;
  border-radius: 4px;
  background-color: #ef4444;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.remove-btn:hover {
  background-color: #dc2626;
}

.actions {
  margin-top: 8px;
}

.summary {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.total {
  font-size: 1.1em;
}

.error {
  color: #dc2626;
  margin-top: 8px;
}

.success {
  color: #16a34a;
  margin-top: 8px;
}

.submit {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.submit-btn {
  background-color: #4a5568;
  color: #fff;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.reset-btn {
  background-color: #e5e7eb;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.product-input-group {
  display: flex;
  gap: 8px;
  align-items: stretch;
  flex-wrap: nowrap;
}

.product-input-group select {
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


/* Mobile-specific adjustments */
@media (max-width: 640px) {
  .sell-container {
    padding: 12px;
  }

  .line {
    padding: 8px;
  }
  .product-input-group {
    gap: 4px; /* Reduce gap on very small screens */
  }

  .scan-btn {
    padding: 8px 8px; /* Slightly reduce padding on very small screens */
    min-width: 40px;
  }

  .qty-subtotal-row {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 8px;
    align-items: end;
  }

  .field select,
  .field input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
  }

  .qty input {
    min-width: 0; /* Allow input to shrink */
  }

  .subtotal {
    display: flex;
    flex-direction: column;
  }

  .subtotal-value {
    padding: 8px 12px;
    background: #f3f4f6;
    border-radius: 4px;
    font-weight: 500;
    text-align: right;
    min-width: 0; /* Allow subtotal to shrink */
    word-break: break-all; /* Break long numbers if needed */
  }

  .remove-btn {
    height: 32px;
    width: 32px;
    font-size: 16px;
  }

  .submit {
    flex-direction: column;
  }

  .submit-btn,
  .reset-btn {
    width: 100%;
    padding: 12px;
    font-size: 16px;
  }
}

/* Mobile-specific adjustments */
@media (max-width: 640px) {
  .qty-subtotal-row {
    grid-template-columns: 1fr 80px auto; /* Give quantity more space, limit subtotal */
    gap: 6px;
  }

  .subtotal-value {
    padding: 6px 4px; /* Reduce padding significantly */
    font-size: 12px; /* Smaller font */
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .field select,
  .field input {
    font-size: 16px; /* Prevents zoom on iOS */
    padding: 6px 8px;
  }

  .remove-btn {
    height: 32px;
    width: 32px;
    font-size: 16px;
  }
}

/* For very small screens */
@media (max-width: 480px) {
  .qty-subtotal-row {
    grid-template-columns: 1fr 70px auto; /* Even more space for quantity */
    gap: 4px;
  }

  .subtotal-value {
    padding: 4px 2px; /* Minimal padding */
    font-size: 11px;
  }
}


@media (max-width: 320px) {
  .product-input-group {
    gap: 4px; /* Reduce gap on very small screens */
  }

  .scan-btn {
    padding: 8px 8px; /* Slightly reduce padding on very small screens */
    min-width: 40px;
  }
}

.qty-stepper {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 640px) {

  .qty-stepper {
    gap: 4px;
  }
}


</style>
